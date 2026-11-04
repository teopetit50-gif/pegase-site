-- 20261021194955 c3_30_export_delai_fuseau+c2_22_raison_exacte
-- Source : dépôt : c3c7c308 omega/modules/reput/migrations/c3_30_export_delai_fuseau.sql ; 8325f149 omega/modules/cashd/migrations/c2_22_raison_exacte.sql.
-- Assemblé par omega/prod/assembler.mjs pour la production (noepmkkplxshjbmqqxft). Transformations : fichiers : c3_30_export_delai_fuseau.sql @ c3c7c308, c2_22_raison_exacte.sql @ 8325f149.
-- ═══ omega/modules/reput/migrations/c3_30_export_delai_fuseau.sql @ c3c7c308
-- c3_30 — REPUT, correctif TREPUT-07 (série 1, relevé par le coordinateur) : l'export à date fixe (session C3, 21/10/2026)
--
--   · « Délai de réponse (min) » valait 1 pour une demande jamais répondue (greatest(1, null) = 1 : greatest ignore le nul) ;
--     sans envoyee_le, la cellule reste vide ;
--   · les heures et la période étaient converties en dur à « Europe/Paris » : pour une entreprise en Guadeloupe ou en
--     Martinique, heures et bornes étaient fausses. Désormais, le fuseau de l'entité (entites.fuseau, sinon l'entité
--     principale, private.reput_fuseau de c3_21) : chaque ligne à l'heure de son site, la période et « le jour dit » au
--     fuseau du programme.
-- Reprises de c3_19 : private.reput_fabriquer_export, private.reput_exports_du_jour. Règles de pose : create or replace.

create or replace function private.reput_fabriquer_export(p_programme uuid, p_du date, p_au date)
 returns uuid
 language plpgsql
 security definer
 set search_path to ''
as $function$
declare
  p public.reput_exports_programmes;
  v_csv text;
  v_n integer;
  v_id uuid;
  v_fz text;
begin
  select * into p from public.reput_exports_programmes x where x.id = p_programme;
  if p.id is null then return null; end if;
  v_fz := private.reput_fuseau(p.client_id, p.entite_id);   -- c3_30 : la période au fuseau du programme
  select count(*)::int,
         string_agg(concat_ws(';',
           private.reput_csv(to_char(d.recu_le at time zone private.reput_fuseau(d.client_id, d.entite_id), 'DD/MM/YYYY HH24:MI')),
           private.reput_csv(d.canal),
           private.reput_csv(coalesce(d.de_nom, d.adresse_reponse, '')),
           private.reput_csv(coalesce(s.libelle, d.sujet, '')),
           private.reput_csv(coalesce(d.langue, '')),
           case when d.urgence then 'oui' else 'non' end,
           case when d.couverte is null then '' when d.couverte then 'oui' else 'non' end,
           private.reput_csv(d.statut),
           private.reput_csv(coalesce(to_char(d.envoyee_le at time zone private.reput_fuseau(d.client_id, d.entite_id), 'DD/MM/YYYY HH24:MI'), '')),
           case when d.envoyee_le is null then '' else greatest(1, round(extract(epoch from (d.envoyee_le - d.recu_le)) / 60))::text end,
           case when d.escaladee_le is not null then 'oui' else 'non' end,
           private.reput_csv(coalesce(e.nom, ''))), E'\r\n' order by d.recu_le, d.id)
    into v_n, v_csv
  from public.reput_demandes d
  left join public.reput_sujets s on s.client_id = d.client_id and s.code = d.sujet
  left join public.entites e on e.client_id = d.client_id and e.id = d.entite_id
  where d.client_id = p.client_id and (p.entite_id is null or d.entite_id = p.entite_id)
    and (d.recu_le at time zone v_fz)::date between p_du and p_au;
  v_csv := chr(65279) || 'Reçue le;Canal;Client;Sujet;Langue;Urgente;Tirée de la base;Statut;Répondue le;Délai de réponse (min);'
           || 'Délai de traitement dépassé;Site' || case when v_n > 0 then E'\r\n' || v_csv else '' end;
  insert into public.reput_exports (client_id, entite_id, programme_id, periode_du, periode_au, lignes, nom_fichier, contenu)
  values (p.client_id, p.entite_id, p.id, p_du, p_au, v_n,
          'reput-demandes-' || to_char(p_du, 'YYYY-MM-DD') || '-au-' || to_char(p_au, 'YYYY-MM-DD') || '.csv', v_csv)
  on conflict (programme_id, periode_du) do nothing
  returning id into v_id;
  return v_id;
end $function$;

create or replace function private.reput_exports_du_jour(p_maintenant timestamptz default now())
 returns integer
 language plpgsql
 security definer
 set search_path to ''
as $function$
declare
  v_jour date;
  p public.reput_exports_programmes;
  v_du date;
  v_au date;
  v_export uuid;
  v_lignes integer;
  m uuid;
  n integer := 0;
begin
  for p in
    select * from public.reput_exports_programmes x
    where x.actif and ((x.frequence = 'hebdomadaire'
                        and extract(isodow from (p_maintenant at time zone private.reput_fuseau(x.client_id, x.entite_id))::date) = x.jour)
                       or (x.frequence = 'mensuel'
                           and extract(day from (p_maintenant at time zone private.reput_fuseau(x.client_id, x.entite_id))::date) = x.jour))
    order by x.client_id, x.id
  loop
    -- c3_30 : « le jour dit » au fuseau du programme (site, sinon organisation), non plus en dur à Paris.
    v_jour := (p_maintenant at time zone private.reput_fuseau(p.client_id, p.entite_id))::date;
    if p.frequence = 'hebdomadaire' then
      v_du := v_jour - 7; v_au := v_jour - 1;
    else
      v_du := (date_trunc('month', v_jour) - interval '1 month')::date; v_au := (date_trunc('month', v_jour) - interval '1 day')::date;
    end if;
    v_export := private.reput_fabriquer_export(p.id, v_du, v_au);
    continue when v_export is null;   -- déjà fabriqué pour cette période
    select x.lignes into v_lignes from public.reput_exports x where x.id = v_export;
    perform private.journaliser_module(p.client_id, 'reput', 'reput.export_fabrique', 'reput_exports', v_export::text,
      jsonb_build_object('programme', p.id, 'du', v_du, 'au', v_au, 'lignes', v_lignes), p.entite_id);
    foreach m in array p.destinataires loop
      continue when not exists (select 1 from public.comptes c where c.client_id = p.client_id and c.user_id = m
                                and c.role in ('gerant', 'admin'))
                    or not private.reput_couvre_strict(m, p.client_id, p.entite_id);
      begin
        perform private.envoyer_interne(p.client_id, 'reput', null, null, 'email', m, 'reput.export_pret',
          jsonb_build_object('jour', to_char(v_au, 'YYYY-MM-DD'), 'nombre', v_lignes),
          'reput.export_pret:' || v_export::text || ':' || m::text, p.entite_id);
      exception when others then
        perform private.journaliser_module(p.client_id, 'reput', 'reput.export_echec', 'reput_exports', v_export::text,
          jsonb_build_object('membre', m, 'erreur', left(sqlerrm, 200)), p.entite_id);
      end;
    end loop;
    n := n + 1;
  end loop;
  return n;
end $function$;


-- ═══ omega/modules/cashd/migrations/c2_22_raison_exacte.sql @ 8325f149
-- ═══════════════════════════════════════════════════════════════════════════
-- CASHD — c2_22 : la raison exacte d'une relance retenue ou coupée (21/10/2026, session C2 — TCASHD-04, TCASHD-05)
-- ═══════════════════════════════════════════════════════════════════════════
-- TCASHD-04 : un règlement reçu sans référence suspend la séquence du compte tant qu'il n'est pas lettré (c2_02),
-- mais la fiche ne le disait pas (compte actif, pièce ouverte, aucun motif). La fiche porte désormais, sur chaque
-- facture ouverte du compte, relance_suspendue : « un règlement reçu reste à imputer sur ce compte (500,00 € du
-- 18/10/2026, VIR-C05-0001) : la relance attend son lettrage ».
-- TCASHD-05 : une relance coupée parce que le reste dû est passé sous le seuil portait « réglée ou sortie de
-- l'export ». Le motif dit désormais la vraie raison : sortie de l'export, réglée, annulée… ou « reste dû 3,00 €,
-- sous le seuil de relance de 10,00 € ; elle reste dans l'encours, à abandonner ou à réclamer ».
--
-- Règles de pose : create or replace ; jamais de DROP ni de DELETE ; revoke execute de public.

-- Vérifier les relances en attente (c2_18) : le motif exact.
create or replace function private.cashd_verifier_relances(p_client uuid)
 returns integer language plpgsql security definer set search_path to ''
as $function$
declare
  r record;
  n integer := 0;
  g public.cashd_reglages;
begin
  select * into g from public.cashd_reglages where client_id = p_client;
  for r in
    select distinct x.id, x.compte_id,
      case when c.statut <> 'actif' or c.reciproque then 'compte ' || replace(c.statut, '_', ' ')
           else 'facture ' || f.numero || case when f.statut = 'litige' then ' en litige'
                                                when f.nature = 'devis' and f.statut <> 'en_attente' then ' : devis ' || f.statut
                                                when f.solde_decision = 'abandonne' then ' : solde abandonné'
                                                when f.attente_commande_le is not null then ' : en attente d''un bon de commande'
                                                when f.incoherence is not null then ' : total incohérent (' || f.incoherence || ')'
                                                -- c2_22 : la raison exacte — sortie de l'export, réglée, ou sous le seuil (elle reste due)
                                                when f.statut <> 'ouverte' and f.statut_motif like 'absente de l''export%' then ' sortie de l''export'
                                                when f.statut = 'soldee' or private.cashd_reste(f.id) <= 0.005 then ' réglée'
                                                when f.statut <> 'ouverte' then ' ' || case f.statut when 'annulee' then 'annulée' when 'abandonnee' then 'abandonnée'
                                                                                                     else replace(f.statut, '_', ' ') end
                                                else ' : reste dû ' || private.cashd_eur(private.cashd_reste(f.id), 'fr') || ', sous le seuil de relance de '
                                                     || private.cashd_eur(private.cashd_seuil_relance(f.entite_id, g.seuil_relance), 'fr')
                                                     || ' ; elle reste dans l''encours, à abandonner ou à réclamer' end end as motif,
      p.facture_id
    from public.cashd_relances x
    join public.cashd_comptes c on c.id = x.compte_id
    join public.cashd_relances_pieces p on p.relance_id = x.id and not p.annulee
    join public.cashd_factures f on f.id = p.facture_id
    where x.client_id = p_client and x.statut in ('a_valider', 'non_reglee', 'sans_adresse', 'bloquee', 'preparee')
      and (c.statut <> 'actif' or c.reciproque
           or (f.nature = 'devis' and f.statut <> 'en_attente')
           or (f.nature <> 'devis' and (f.statut <> 'ouverte' or f.solde_decision = 'abandonne' or f.attente_commande_le is not null
                                        or f.incoherence is not null   -- c2_18
                                        or (private.cashd_reste(f.id) <= greatest(private.cashd_seuil_relance(f.entite_id, g.seuil_relance), 0.005)
                                            and f.solde_decision is distinct from 'reclame'))))
  loop
    n := n + private.cashd_couper(p_client, null, r.facture_id, 'avant l''envoi : ' || r.motif);
  end loop;
  return n;
end $function$;

-- La fiche du compte (c2_21) : la séquence suspendue par un règlement à lettrer, dite sur la pièce.
create or replace function public.cashd_fiche_compte(p_compte uuid)
 returns jsonb language sql stable security invoker set search_path to ''
as $function$
  select case when c.id is null then null else jsonb_build_object(
    'compte', to_jsonb(c),
    'balance', (select to_jsonb(b) from public.cashd_balance_agee b where b.compte_id = c.id),
    'pieces', (select coalesce(jsonb_agg(to_jsonb(f) || (select jsonb_build_object('solde_decision', z.solde_decision, 'solde_decision_motif', z.solde_decision_motif,
                 'accord_oral_le', z.accord_oral_le, 'accord_note', z.accord_note, 'attente_commande_le', z.attente_commande_le,
                 'attente_commande_email', z.attente_commande_email, 'attente_commande_nom', z.attente_commande_nom,
                 'attente_commande_motif', z.attente_commande_motif,
                 -- c2_21 : ce que le moteur retient, dit sur la pièce ; un avoir et une pièce suspendue ne sont pas relançables
                 'incoherence', z.incoherence, 'facture_visee', z.facture_visee,
                 'relance_suspendue', case when z.incoherence is not null and z.statut = 'ouverte'
                                           then 'total incohérent (' || z.incoherence || ') : relance suspendue jusqu''à l''export corrigé ou la marque levée'
                                           -- c2_22 : un règlement du compte reste à lettrer — la séquence attend son imputation
                                           when z.nature in ('facture', 'acompte') and z.statut = 'ouverte' and f.reste_du > 0 and ra.n > 0
                                           then 'un règlement reçu reste à imputer sur ce compte (' || ra.detail || ') : la relance attend son lettrage' end)
                 || case when (z.incoherence is not null and z.statut = 'ouverte') or z.nature = 'avoir' then jsonb_build_object('reste_relancable', 0) else '{}'::jsonb end
                 from public.cashd_factures z where z.id = f.id)
               order by (f.reste_du > 0) desc, f.echeance nulls last, f.date_emission desc), '[]'::jsonb)
               from public.cashd_factures_etat f
               cross join (select count(*) as n,
                                  string_agg(replace(to_char(e.a_imputer, 'FM999999990.00'), '.', ',') || ' € du ' || to_char(e.recu_le, 'DD/MM/YYYY')
                                             || coalesce(', ' || e.reference, ''), ' ; ' order by e.recu_le) as detail
                           from public.cashd_reglements_etat e where e.compte_id = c.id and e.a_imputer > 0) ra
               where f.compte_id = c.id),
    'reponses_lues', (select coalesce(jsonb_agg(to_jsonb(x) order by x.cree_le desc), '[]'::jsonb) from public.cashd_reponses_lues x
                      where x.compte_id = c.id and x.statut = 'proposee'),
    'pieces_jointes', (select coalesce(jsonb_agg(to_jsonb(p) order by p.cree_le), '[]'::jsonb) from public.cashd_pieces_jointes p
                       join public.cashd_factures f on f.id = p.facture_id where f.compte_id = c.id and p.actif),
    'reglements', (select coalesce(jsonb_agg(to_jsonb(r) order by r.recu_le desc, r.cree_le desc), '[]'::jsonb)
                   from public.cashd_reglements_etat r where r.compte_id = c.id),
    'imputations', (select coalesce(jsonb_agg(to_jsonb(x) || jsonb_build_object('facture', (select f.numero from public.cashd_factures f where f.id = x.facture_id))
                                              order by x.cree_le desc), '[]'::jsonb)
                    from public.cashd_imputations x join public.cashd_factures f on f.id = x.facture_id where f.compte_id = c.id)) end
  from (select 1) d left join public.cashd_comptes c on c.id = p_compte
$function$;

revoke execute on function private.cashd_verifier_relances(uuid) from public, anon, authenticated;
revoke execute on function public.cashd_fiche_compte(uuid) from public, anon;
grant execute on function public.cashd_fiche_compte(uuid) to authenticated, service_role;
