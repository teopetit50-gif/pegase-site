-- 20261026192111 c2_46_bloquee_suit
-- Source : dépôt : 8f368793c84ac2ddbc23b97e05e6e8f5036b93b8 omega/modules/cashd/migrations/c2_46_bloquee_suit.sql.
-- Assemblé par omega/prod/assembler.mjs pour la production (noepmkkplxshjbmqqxft). Transformations : fichiers : c2_46_bloquee_suit.sql @ 8f368793c84ac2ddbc23b97e05e6e8f5036b93b8 ; c2_44 cité comme test : ignoré ; c2_01 cité comme test : ignoré ; c2_08 cité comme test : ignoré ; fichiers de tests ignorés : omega/tests/cashd/c2_46_bloquee_suit.sql.
-- ═══ omega/modules/cashd/migrations/c2_46_bloquee_suit.sql @ 8f368793c84ac2ddbc23b97e05e6e8f5036b93b8
-- ═══════════════════════════════════════════════════════════════════════════
-- CASHD — c2_46 : une relance bloquée suit le reste dû ; l'interdit levé, elle repasse les contrôles et entre dans la file
-- (27/10/2026, session C2 — TMOD-13, contre-recette du testeur indépendant ; après c2_44)
-- ═══════════════════════════════════════════════════════════════════════════
-- TMOD-13 : bloquée par un interdit (c2_44), la relance ne suivait plus le reste dû (500 € pour 485 € dus) et restait
-- bloquée, avec le motif d'un interdit levé, même après sa levée.
-- Désormais :
--   · une relance bloquée dont la demande a été retirée de la file (ou qui n'en a jamais eu) suit le reste dû comme une
--     relance en attente : pièces, texte et montant du jour, puis les contrôles de c2_44 ; tant qu'un interdit la retient,
--     elle reste bloquée, avec le mot ;
--   · quand l'organisation change ses interdits (cashd_regler_relances), chaque relance bloquée par un mot interdit, jamais
--     partie et la plus récente de son compte, est revue sur les données du jour : elle repasse TOUS les contrôles ; si
--     elle les passe, elle entre dans la file avec une nouvelle demande (ou sa première demande, si elle a été bloquée dès
--     la préparation), et son envoi est adossé quand l'envoi est réglé ; sinon elle reste coupée, sans adresse ou bloquée ;
--   · une relance revue sans demande (bloquée ou sans adresse dès la préparation) reçoit, une fois les contrôles passés,
--     la demande qu'elle aurait eue à la préparation (même type, même contenu, clé « cashd:relance:<relance> ») ;
--   · le statut suit le réglage d'envoi, comme à la préparation : « à envoyer une fois le réglage posé » sans réglage,
--     « à valider » sinon.
-- Rien ne part sans validation. Une demande qui ne peut pas être déposée met la relance en échec, avec une alerte,
-- sans faire échouer le règlement qui l'a revue.
--
-- Règles de pose : rejouable ; jamais de DROP ni de DELETE ; revoke execute de public.

-- Revoir une relance sur place (c2_42), contrôles compris (c2_44) ; sans demande, elle reçoit la sienne (c2_46).
create or replace function private.cashd_reviser_relance(p_relance uuid, p_motif text, p_apres_refus jsonb default null)
 returns uuid language plpgsql security definer set search_path to ''
as $function$
declare
  r public.cashd_relances;
  c public.cashd_comptes;
  g public.cashd_reglages;
  d public.demandes_validation;
  v_t jsonb;
  v_type text;
  v_cle text;
  v_nouvelle uuid;
  v_dstatut text;
  v_dpolitique uuid;
  v_envoi uuid;
  v_statut text;
  v_mode text;
  v_erreur text;
  v_motif text := left(p_motif, 500);
begin
  select * into r from public.cashd_relances where id = p_relance for update;
  select * into c from public.cashd_comptes where id = r.compte_id;
  select * into g from public.cashd_reglages where client_id = r.client_id;
  update public.cashd_relances_pieces p set reste_du = case when f.nature = 'devis' then f.montant_ttc else e.reste_relancable end
    from public.cashd_factures f join public.cashd_factures_etat e on e.id = f.id
   where p.relance_id = r.id and not p.annulee and f.id = p.facture_id;
  v_t := private.cashd_ecrire_texte(r.id);
  update public.cashd_relances set sujet = v_t ->> 'sujet', corps = v_t ->> 'corps', montant = (v_t ->> 'montant')::numeric,
         gabarit = v_t ->> 'gabarit', variante = (v_t ->> 'variante')::smallint,
         penalites = (v_t ->> 'penalites')::numeric, indemnites = (v_t ->> 'indemnites')::numeric, motif = v_motif, maj_le = now()
   where id = r.id;
  -- c2_44 : la relance revue repasse les contrôles d'une relance neuve ; retenue, elle n'entre pas dans la file
  if private.cashd_controler_revue(r.id) is not null then
    return null;
  end if;
  begin
    v_mode := private.reglages_envois_effectifs(r.client_id, 'cashd') ->> 'mode';
  exception when others then
    v_mode := null;
  end;
  if r.demande_id is not null then
    select * into d from public.demandes_validation where id = r.demande_id;
    if d.statut = 'en_attente' then
      update public.demandes_validation set statut = 'annulee' where id = d.id and statut = 'en_attente';
    end if;
    v_type := d.type_action;
    v_cle := left('cashd:relance:' || r.id::text || ':revue:' || d.id::text, 200);
  else
    -- c2_46 : la demande qu'elle aurait eue à la préparation
    v_type := case when r.nature = 'devis' then 'cashd.devis' when r.palier = 'mise_en_demeure' then 'cashd.mise_en_demeure'
                   when r.palier in ('echeance', 'rappel') then 'cashd.rappel' else 'cashd.relance' end;
    v_cle := 'cashd:relance:' || r.id::text;
  end if;
  begin
    insert into public.demandes_validation (client_id, entite_id, module, type_action, objet_type, objet_id, resume, montant, payload, echeance, cle_idempotence)
    values (r.client_id, r.entite_id, 'cashd', v_type, 'cashd_relances', r.id::text,
            left(case when g.mode = 'essai' then 'Essai — ' else '' end || case when p_apres_refus is not null then 'Après refus — ' else '' end
                 || case v_type when 'cashd.mise_en_demeure' then 'Mise en demeure' when 'cashd.devis' then 'Relance de devis' when 'cashd.rappel' then 'Rappel' else 'Relance' end
                 || ' : ' || c.nom || ', ' || private.cashd_eur((v_t ->> 'montant')::numeric), 500),
            case when r.nature = 'devis' then null else (v_t ->> 'montant')::numeric end,
            coalesce(d.payload, jsonb_build_object('relance', r.id, 'canal', r.canal, 'mode', g.mode, 'palier', r.palier,
                                                   'compte', jsonb_build_object('id', c.id, 'nom', c.nom, 'reference', c.reference),
                                                   'exigences', case when v_type = 'cashd.mise_en_demeure' then jsonb_build_object('commentaire', true) else '{}'::jsonb end))
              || jsonb_build_object('sujet', v_t ->> 'sujet', 'corps', v_t ->> 'corps',
                                    'penalites', (v_t ->> 'penalites')::numeric, 'indemnites', (v_t ->> 'indemnites')::numeric,
                                    'destinataire', jsonb_build_object('nom', coalesce(c.contact_facturation_nom, c.nom), 'adresse', c.contact_facturation_email),
                                    'motif_revue', v_motif)
              || case when d.id is not null then jsonb_build_object('revue_de', d.id) else '{}'::jsonb end
              || case when p_apres_refus is not null then jsonb_build_object('apres_refus', p_apres_refus) else '{}'::jsonb end,
            coalesce(d.echeance, (greatest(r.jour, (now() at time zone 'Europe/Paris')::date) + 7)::timestamptz), v_cle)
    returning id, statut, politique_id into v_nouvelle, v_dstatut, v_dpolitique;
  exception when others then
    v_erreur := left(sqlstate || ' ' || sqlerrm, 400);
    update public.cashd_relances set statut = 'echec', motif = left('revue, la demande de validation n''a pas pu être déposée : ' || v_erreur, 500), maj_le = now()
     where id = r.id;
    perform private.lever_alerte_module(r.client_id, 'cashd', 'critique', format('La relance revue de %s n''a pas pu entrer dans la file de validation.', c.nom),
      jsonb_build_object('relance', r.id, 'erreur', v_erreur), 'relance:echec:' || r.id::text, true, null);
    return null;
  end;
  -- le statut suit le réglage d'envoi, comme à la préparation
  v_statut := case when v_mode is null then 'non_reglee' else 'a_valider' end;
  -- un accord permanent ne couvre que les rappels des paliers 1 et 2 (c2_12), jamais une mise en demeure
  if v_dstatut = 'approuvee' and v_dpolitique is not null and v_type <> 'cashd.rappel' then
    v_statut := 'bloquee';
    v_motif := left(v_motif || ' — un accord permanent l''a approuvée d''office : '
               || case when v_type = 'cashd.mise_en_demeure' then 'une mise en demeure exige une validation explicite'
                       else 'seuls les rappels des paliers 1 et 2 partent sans validation' end || ', elle n''est pas préparée', 500);
  end if;
  update public.cashd_relances set demande_id = v_nouvelle, statut = v_statut, motif = v_motif, maj_le = now() where id = r.id;
  if v_statut = 'a_valider'
     and to_regprocedure('private.preparer_envoi(uuid,text,text,text,text,jsonb,uuid,jsonb,text,text,uuid[],text,uuid,boolean,boolean,timestamptz,jsonb)') is not null then
    begin
      v_envoi := private.preparer_envoi(r.client_id, 'cashd', 'cashd_relances', r.id::text, r.canal,
        jsonb_build_object('adresse', c.contact_facturation_email, 'nom', coalesce(c.contact_facturation_nom, c.nom), 'ref', c.reference,
                           'professionnel', not c.particulier, 'langue', c.langue),
        null, '{}'::jsonb, v_t ->> 'sujet', v_t ->> 'corps', null::uuid[], v_cle, r.entite_id, true, false,
        null::timestamptz, jsonb_build_object('demande', v_nouvelle));
      update public.cashd_relances set envoi_id = v_envoi where id = r.id;
    exception when others then
      v_erreur := left(sqlstate || ' ' || sqlerrm, 400);
      update public.cashd_relances set motif = left('le message n''a pas pu être préparé : ' || v_erreur, 500) where id = r.id;
      perform private.lever_alerte_module(r.client_id, 'cashd', 'critique', format('Le message de relance revu de %s n''a pas pu être préparé ; la demande reste dans la file.', c.nom),
        jsonb_build_object('relance', r.id, 'erreur', v_erreur), 'relance:envoi:' || r.id::text, true, null);
    end;
  end if;
  perform private.journaliser_module(r.client_id, 'cashd', 'cashd.relance_revue', 'cashd_relances', r.id::text,
    jsonb_build_object('motif', v_motif, 'avant', d.id, 'demande', v_nouvelle, 'montant_avant', d.montant, 'montant', (v_t ->> 'montant')::numeric), r.entite_id);
  return v_nouvelle;
end $function$;

-- Revoir les relances d'une facture (c2_42), refusées (c2_43) et bloquées (c2_46) comprises : rend le nombre de relances revues.
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
      -- c2_46 : une relance bloquée dont la demande a été retirée de la file suit aussi le reste dû
      and (coalesce(d.statut, 'en_attente') = 'en_attente' or (r.statut = 'bloquee' and d.statut = 'annulee'))
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


-- Les interdits changent : les relances bloquées par un mot interdit sont revues (c2_46).
create or replace function private.cashd_reglages_revoir_bloquees()
 returns trigger language plpgsql security definer set search_path to ''
as $function$
declare x record;
begin
  for x in
    select r.id from public.cashd_relances r
    left join public.demandes_validation d on d.id = r.demande_id
    where r.client_id = new.client_id and r.statut = 'bloquee' and r.motif like '%mot interdit%'
      and coalesce(d.statut, 'annulee') = 'annulee'
      and exists (select 1 from public.cashd_relances_pieces p where p.relance_id = r.id and not p.annulee)
      and not exists (select 1 from public.cashd_relances y where y.compte_id = r.compte_id and y.nature = r.nature
                      and (y.jour, y.cree_le) > (r.jour, r.cree_le) and y.statut <> 'coupee')
      and not exists (select 1 from public.cashd_envois_main m where m.relance_id = r.id)
    order by r.jour, r.cree_le
  loop
    perform private.cashd_reviser_relance(x.id,
      'vos règles de communication ont changé : la relance est revue sur les données du jour, à valider');
  end loop;
  return null;
end $function$;

do $t$
begin
  if not exists (select 1 from pg_trigger where tgname = 'cashd_reglages_zz_interdits' and tgrelid = 'public.cashd_reglages'::regclass) then
    create trigger cashd_reglages_zz_interdits after update of interdits on public.cashd_reglages
      for each row when (old.interdits is distinct from new.interdits) execute function private.cashd_reglages_revoir_bloquees();
  end if;
end $t$;

revoke execute on function private.cashd_reviser_relance(uuid, text, jsonb) from public, anon, authenticated;
revoke execute on function private.cashd_revoir_montants(uuid) from public, anon, authenticated;
revoke execute on function private.cashd_reglages_revoir_bloquees() from public, anon, authenticated;
