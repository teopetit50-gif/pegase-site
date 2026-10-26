-- 20261026165645 c2_43_refus_puis_reglement
-- Source : dépôt : 9c094c73341e3dafa854896da61ed403c9d52f9d omega/modules/cashd/migrations/c2_43_refus_puis_reglement.sql.
-- Assemblé par omega/prod/assembler.mjs pour la production (noepmkkplxshjbmqqxft). Transformations : fichiers : c2_43_refus_puis_reglement.sql @ 9c094c73341e3dafa854896da61ed403c9d52f9d ; fichiers de tests ignorés : omega/tests/cashd/c2_43_refus_puis_reglement.sql.
-- ═══ omega/modules/cashd/migrations/c2_43_refus_puis_reglement.sql @ 9c094c73341e3dafa854896da61ed403c9d52f9d
-- ═══════════════════════════════════════════════════════════════════════════
-- CASHD — c2_43 : une relance refusée, puis un règlement partiel lettré : une nouvelle demande au reste dû
-- (26/10/2026, session C2 — TCASHD-18, après c2_41 et c2_42, socle 19az)
-- ═══════════════════════════════════════════════════════════════════════════
-- Recette T-CASHD (TCASHD-18) : un rappel de 1 085 € est refusé (« le client annonce un virement partiel, attendre ») ;
-- la reprise (c2_41) passe dans la minute, avant le règlement : rien n'a changé, elle est « impossible ». Puis 500 €
-- sont lettrés : plus rien ne se passe — la préparation du jour n'écrit rien (une relance par compte et par jour), la
-- relance refusée garde 1 085 € et le motif « l'envoi viendra une fois le réglage posé », faux pour une relance refusée.
-- Le socle n'admet qu'une reprise par demande refusée ; CASHD ne la redemande donc pas. Désormais :
--   · quand la reprise d'une relance refusée est impossible, la relance le dit : « refusée dans la file de validation :
--     <commentaire> — reprise impossible : <motif> » ;
--   · quand, ensuite, une imputation (règlement ou avoir) baisse le reste dû d'une de ses factures, la relance refusée
--     (jamais partie, reprise impossible) est revue sur place comme en c2_42 : textes et montants du jour, et une
--     NOUVELLE demande au reste dû, « Après refus — … », qui porte la consigne du refus (« apres_refus ») pour que le
--     valideur la lise ; rien ne part sans cette validation ;
--   · une relance refusée sans changement n'est pas réécrite ; une reprise encore à faire est laissée au cron
--     cashd-reprises (il lira les données du jour).
-- À la pose : les relances refusées dont la reprise est impossible disent leur refus, et celles qui réclament plus que
-- le reste dû sont revues (recette : A-C27 de T-CASHD).
--
-- Règles de pose : rejouable ; jamais de DROP ni de DELETE ; revoke execute de public.

-- Le motif d'une relance refusée dont la reprise est impossible.
create or replace function private.cashd_dire_refus(p_demande uuid)
 returns void language plpgsql security definer set search_path to ''
as $function$
declare z record;
begin
  select x.consigne, x.motif into z from private.reprises x where x.demande_id = p_demande and x.statut = 'impossible';
  if not found then
    return;
  end if;
  update public.cashd_relances set motif = left('refusée dans la file de validation'
           || coalesce(' : ' || nullif(btrim(z.consigne ->> 'commentaire'), ''), '')
           || coalesce(' — reprise impossible : ' || z.motif, ''), 500), maj_le = now()
   where demande_id = p_demande and statut in ('a_valider', 'non_reglee', 'sans_adresse', 'bloquee', 'preparee');
end $function$;

-- Le passage du cron (c2_41), qui fait dire son refus à une relance dont la reprise est impossible.
create or replace function private.cashd_traiter_reprises()
 returns integer language plpgsql security definer set search_path to ''
as $function$
declare x record; n integer := 0; v_res text;
begin
  if to_regprocedure('private.reprises_a_faire(text)') is null then
    return 0;
  end if;
  for x in select * from private.reprises_a_faire('cashd') loop
    begin
      v_res := private.cashd_reprendre_refus(x.demande_id, x.consigne);
      if v_res is not null then
        n := n + 1;
      end if;
      if v_res = 'impossible' then
        perform private.cashd_dire_refus(x.demande_id);
      end if;
    exception when others then
      perform private.lever_alerte_module(x.client_id, 'cashd', 'attention', 'Une relance refusée n''a pas pu être reprise : elle reste refusée.',
        jsonb_build_object('demande', x.demande_id, 'erreur', left(sqlstate || ' ' || sqlerrm, 300)), 'reprise:echec:' || x.demande_id::text, true, null);
    end;
  end loop;
  return n;
end $function$;

-- Revoir les relances d'une facture (c2_42), refusées comprises : rend le nombre de relances revues.
create or replace function private.cashd_revoir_montants(p_facture uuid)
 returns integer language plpgsql security definer set search_path to ''
as $function$
declare
  f record;
  g public.cashd_reglages;
  x record;
  n integer := 0;
begin
  select y.id, y.client_id, y.entite_id, y.numero, y.nature, y.statut, e.reste_relancable into f
  from public.cashd_factures y join public.cashd_factures_etat e on e.id = y.id where y.id = p_facture;
  if f.id is null or f.nature not in ('facture', 'acompte') or f.statut <> 'ouverte' then
    return 0;
  end if;
  select * into g from public.cashd_reglages where client_id = f.client_id;
  -- soldée ou sous le seuil : la coupure « réglée » ou « sous le seuil » (c2_03, c2_22) s'en charge
  if coalesce(f.reste_relancable, 0) <= greatest(private.cashd_seuil_relance(f.entite_id, g.seuil_relance), 0.005) then
    return 0;
  end if;
  -- en attente de validation (c2_42)
  for x in
    select distinct r.id from public.cashd_relances_pieces p join public.cashd_relances r on r.id = p.relance_id
    left join public.demandes_validation d on d.id = r.demande_id
    where p.facture_id = f.id and not p.annulee and p.reste_du > f.reste_relancable + 0.005
      and r.statut in ('a_valider', 'non_reglee', 'sans_adresse', 'bloquee', 'preparee')
      and coalesce(d.statut, 'en_attente') = 'en_attente'
  loop
    perform private.cashd_reviser_relance(x.id,
      'montant revu : ' || f.numero || ' ne doit plus que ' || private.cashd_eur(f.reste_relancable, 'fr')
      || ' (règlement ou avoir lettré) ; la relance est revue au nouveau montant, à valider de nouveau');
    n := n + 1;
  end loop;
  -- refusées, jamais parties, reprise impossible (c2_43) : seulement avec le socle des reprises (19az)
  if to_regclass('private.reprises') is not null then
    for x in
      select distinct r.id, d.id as demande, z.consigne from public.cashd_relances_pieces p join public.cashd_relances r on r.id = p.relance_id
      join public.demandes_validation d on d.id = r.demande_id
      join private.reprises z on z.demande_id = d.id and z.statut = 'impossible'
      where p.facture_id = f.id and not p.annulee and p.reste_du > f.reste_relancable + 0.005
        and r.statut in ('a_valider', 'non_reglee', 'sans_adresse', 'bloquee', 'preparee') and d.statut = 'rejetee'
        and not exists (select 1 from public.cashd_envois_main m where m.relance_id = r.id)
        and not exists (select 1 from public.envois e where e.id = r.envoi_id and (e.statut = 'envoye' or e.envoye_le is not null))
    loop
      perform private.cashd_reviser_relance(x.id,
        'refusée, puis montant revu : ' || f.numero || ' ne doit plus que ' || private.cashd_eur(f.reste_relancable, 'fr')
        || ' (règlement ou avoir lettré) ; une nouvelle demande au nouveau montant, à valider',
        jsonb_build_object('demande', x.demande, 'commentaire', x.consigne ->> 'commentaire', 'motif', x.consigne ->> 'motif'));
      n := n + 1;
    end loop;
  end if;
  return n;
end $function$;

revoke execute on function private.cashd_dire_refus(uuid) from public, anon, authenticated;
revoke execute on function private.cashd_traiter_reprises() from public, anon, authenticated;
revoke execute on function private.cashd_revoir_montants(uuid) from public, anon, authenticated;

-- À la pose, une fois : les relances refusées dont la reprise est impossible disent leur refus ; celles qui réclament
-- plus que le reste dû sont revues.
do $revue$
declare v_d uuid; v_f uuid;
begin
  if to_regclass('private.reprises') is null then
    return;
  end if;
  for v_d in
    select z.demande_id from private.reprises z join public.cashd_relances r on r.demande_id = z.demande_id
    where z.module = 'cashd' and z.statut = 'impossible'
  loop
    perform private.cashd_dire_refus(v_d);
  end loop;
  for v_f in
    select distinct p.facture_id from public.cashd_relances_pieces p join public.cashd_relances r on r.id = p.relance_id
    join public.cashd_factures_etat e on e.id = p.facture_id
    join public.demandes_validation d on d.id = r.demande_id and d.statut = 'rejetee'
    where not p.annulee and p.reste_du > e.reste_relancable + 0.005
      and r.statut in ('a_valider', 'non_reglee', 'sans_adresse', 'bloquee', 'preparee')
  loop
    perform private.cashd_revoir_montants(v_f);
  end loop;
end $revue$;
