-- 20261026183016 c2_44_revue_controlee
-- Source : dépôt : 28e284a836d43dc8c084243c8b33f90b69f5c53f omega/modules/cashd/migrations/c2_44_revue_controlee.sql.
-- Assemblé par omega/prod/assembler.mjs pour la production (noepmkkplxshjbmqqxft). Transformations : fichiers : c2_44_revue_controlee.sql @ 28e284a836d43dc8c084243c8b33f90b69f5c53f ; fichiers de tests ignorés : omega/tests/cashd/c2_44_revue_controlee.sql.
-- ═══ omega/modules/cashd/migrations/c2_44_revue_controlee.sql @ 28e284a836d43dc8c084243c8b33f90b69f5c53f
-- ═══════════════════════════════════════════════════════════════════════════
-- CASHD — c2_44 : une relance revue au nouveau montant repasse tous les contrôles d'une relance neuve
-- (26/10/2026, session C2 — TMOD-04, testeur indépendant, après c2_42 et c2_43)
-- ═══════════════════════════════════════════════════════════════════════════
-- TMOD-04 : la relance revue après un règlement partiel (c2_42, c2_43) entrait dans la file sans repasser les contrôles
-- d'une relance neuve : un mot interdit par l'organisation (« simple oubli ») restait dans le texte proposé ; une relance
-- refusée dont le compte était sorti du périmètre entre-temps (désinscrit) était reproposée.
-- Désormais, une fois son texte réécrit, la relance revue passe les contrôles de la préparation, dans le même ordre :
--   1. compte et pièces (comme cashd_verifier_relances) : compte hors cycle (pause, litige, recouvrement, hors
--      périmètre, attente de contact), réciproque ; facture en litige, sortie, réglée, solde abandonné, bon de commande
--      attendu, total incohérent, reste sous le seuil → la relance est COUPÉE, « avant l'envoi : … », paliers rendus ;
--   2. adresse de facturation absente → « sans adresse », comme à la préparation ;
--   3. mot interdit dans l'objet ou le corps → « bloquée », avec le mot ;
--   4. puis seulement la nouvelle demande ; un accord permanent ne couvre que les rappels des paliers 1 et 2 (c2_12) :
--      une autre relance approuvée d'office est bloquée, une mise en demeure l'est toujours.
-- Dans les trois premiers cas, la demande en attente est retirée de la file et AUCUNE nouvelle demande n'y entre.
-- Les fenêtres d'envoi, jours fériés et oppositions restent vérifiés par le socle au moment de l'envoi (preparer_envoi).
-- Un règlement encore à lettrer ne bloque pas la revue (la revue naît justement d'un lettrage en cours).
-- À la pose : les relances déjà revues et en attente repassent ces contrôles.
--
-- Règles de pose : rejouable ; jamais de DROP ni de DELETE ; revoke execute de public.

-- Ce qui empêcherait d'écrire cette relance aujourd'hui (compte, pièces) : la raison, ou null.
create or replace function private.cashd_controle_relance(p_relance uuid)
 returns text language sql stable security definer set search_path to ''
as $function$
  select case when c.statut <> 'actif' then 'compte ' || case c.statut when 'hors_perimetre' then 'hors périmètre (relances arrêtées)'
                                                             when 'attente_contact' then 'en attente d''un contact'
                                                             when 'pause' then 'en pause' when 'litige' then 'en litige'
                                                             when 'recouvrement' then 'en recouvrement' else replace(c.statut, '_', ' ') end
              when c.reciproque then 'compte réciproque (aussi fournisseur)'
              else (select 'facture ' || f.numero || case when f.statut = 'litige' then ' en litige'
                                                       when f.nature = 'devis' and f.statut <> 'en_attente' then ' : devis ' || f.statut
                                                       when f.solde_decision = 'abandonne' then ' : solde abandonné'
                                                       when f.attente_commande_le is not null then ' : en attente d''un bon de commande'
                                                       when f.incoherence is not null then ' : total incohérent (' || f.incoherence || ')'
                                                       when f.statut <> 'ouverte' and f.statut_motif like 'absente de l''export%' then ' sortie de l''export'
                                                       when f.statut = 'soldee' or private.cashd_reste(f.id) <= 0.005 then ' réglée'
                                                       when f.statut <> 'ouverte' then ' ' || replace(f.statut, '_', ' ')
                                                       else ' : reste dû ' || private.cashd_eur(private.cashd_reste(f.id), 'fr') || ', sous le seuil de relance' end
                    from public.cashd_relances_pieces p join public.cashd_factures f on f.id = p.facture_id
                    where p.relance_id = r.id and not p.annulee
                      and ((f.nature = 'devis' and f.statut <> 'en_attente')
                           or (f.nature <> 'devis' and (f.statut <> 'ouverte' or f.solde_decision = 'abandonne' or f.attente_commande_le is not null
                                                        or f.incoherence is not null
                                                        or (private.cashd_reste(f.id) <= greatest(private.cashd_seuil_relance(f.entite_id, g.seuil_relance), 0.005)
                                                            and f.solde_decision is distinct from 'reclame'))))
                    order by f.echeance nulls last, f.numero limit 1) end
  from public.cashd_relances r
  join public.cashd_comptes c on c.id = r.compte_id
  left join public.cashd_reglages g on g.client_id = r.client_id
  where r.id = p_relance
$function$;

-- Les contrôles d'une relance revue, appliqués : rend ce qui la retient (et l'a retirée de la file), ou null.
create or replace function private.cashd_controler_revue(p_relance uuid)
 returns text language plpgsql security definer set search_path to ''
as $function$
declare
  r public.cashd_relances;
  c public.cashd_comptes;
  g public.cashd_reglages;
  v_bloc text;
  v_mot text;
  v_statut text;
  v_motif text;
  v_liberer boolean := false;
begin
  select * into r from public.cashd_relances where id = p_relance for update;
  select * into c from public.cashd_comptes where id = r.compte_id;
  select * into g from public.cashd_reglages where client_id = r.client_id;
  v_bloc := private.cashd_controle_relance(r.id);
  if v_bloc is not null then
    v_statut := 'coupee';
    v_motif := 'avant l''envoi : ' || v_bloc;
    v_liberer := true;
  elsif c.contact_facturation_email is null then
    v_statut := 'sans_adresse';
    v_motif := 'le compte n''a pas d''adresse de facturation : relancez-le vous-même ou complétez sa fiche';
  else
    foreach v_mot in array coalesce(g.interdits, '{}'::text[]) loop
      if nullif(btrim(v_mot), '') is not null and position(lower(btrim(v_mot)) in lower(coalesce(r.sujet, '') || ' ' || coalesce(r.corps, ''))) > 0 then
        v_statut := 'bloquee';
        v_motif := format('montant revu à %s, mais le message contient un mot interdit par vos règles : « %s »', private.cashd_eur(r.montant, 'fr'), v_mot);
        exit;
      end if;
    end loop;
  end if;
  if v_statut is null then
    return null;
  end if;
  -- retirée de la file : la demande en attente est annulée (une demande refusée reste refusée)
  if r.demande_id is not null then
    begin
      update public.demandes_validation set statut = 'annulee' where id = r.demande_id and statut = 'en_attente';
    exception when others then
      perform private.lever_alerte_module(r.client_id, 'cashd', 'critique',
        'Une relance revue n''a pas pu être retirée de la file de validation : refusez-la à la main.',
        jsonb_build_object('relance', r.id, 'demande', r.demande_id, 'erreur', left(sqlstate || ' ' || sqlerrm, 300)), 'relance:coupure:' || r.id::text, true, null);
    end;
  end if;
  update public.cashd_relances set statut = v_statut, motif = left(v_motif, 500), maj_le = now() where id = r.id;
  if v_liberer then
    update public.cashd_relances_pieces set annulee = true where relance_id = r.id;
  end if;
  if v_statut = 'sans_adresse' then
    perform private.lever_alerte_module(r.client_id, 'cashd', 'attention',
      format('La relance de %s est écrite mais ne peut pas partir : le compte n''a pas d''adresse de facturation.', c.nom),
      jsonb_build_object('compte', c.id, 'relance', r.id), 'relance:sans_adresse:' || c.id::text, true, null);
  end if;
  perform private.journaliser_module(r.client_id, 'cashd', case when v_statut = 'coupee' then 'cashd.relance_coupee' else 'cashd.relance_revue' end,
    'cashd_relances', r.id::text, jsonb_build_object('motif', left(v_motif, 500), 'statut', v_statut, 'demande', r.demande_id, 'compte', r.compte_id), r.entite_id);
  return v_motif;
end $function$;

create or replace function private.cashd_reviser_relance(p_relance uuid, p_motif text, p_apres_refus jsonb default null)
 returns uuid language plpgsql security definer set search_path to ''
as $function$
declare
  r public.cashd_relances;
  c public.cashd_comptes;
  g public.cashd_reglages;
  d public.demandes_validation;
  v_t jsonb;
  v_nouvelle uuid;
  v_dstatut text;
  v_dpolitique uuid;
  v_envoi uuid;
  v_statut text;
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
  -- c2_44 : la relance revue repasse les contrôles d'une relance neuve ; bloquée, elle n'entre pas dans la file
  if private.cashd_controler_revue(r.id) is not null then
    return null;
  end if;
  if r.demande_id is null then
    -- sans demande : le texte suffit
    perform private.journaliser_module(r.client_id, 'cashd', 'cashd.relance_revue', 'cashd_relances', r.id::text,
      jsonb_build_object('motif', v_motif, 'montant', (v_t ->> 'montant')::numeric), r.entite_id);
    return null;
  end if;
  select * into d from public.demandes_validation where id = r.demande_id;
  if d.statut = 'en_attente' then
    update public.demandes_validation set statut = 'annulee' where id = d.id and statut = 'en_attente';
  end if;
  insert into public.demandes_validation (client_id, entite_id, module, type_action, objet_type, objet_id, resume, montant, payload, echeance, cle_idempotence)
  values (d.client_id, d.entite_id, d.module, d.type_action, d.objet_type, d.objet_id,
          left(case when g.mode = 'essai' then 'Essai — ' else '' end || case when p_apres_refus is not null then 'Après refus — ' else '' end
               || case d.type_action when 'cashd.mise_en_demeure' then 'Mise en demeure' when 'cashd.devis' then 'Relance de devis' when 'cashd.rappel' then 'Rappel' else 'Relance' end
               || ' : ' || c.nom || ', ' || private.cashd_eur((v_t ->> 'montant')::numeric), 500),
          case when r.nature = 'devis' then null else (v_t ->> 'montant')::numeric end,
          d.payload || jsonb_build_object('sujet', v_t ->> 'sujet', 'corps', v_t ->> 'corps',
                                          'penalites', (v_t ->> 'penalites')::numeric, 'indemnites', (v_t ->> 'indemnites')::numeric,
                                          'destinataire', jsonb_build_object('nom', coalesce(c.contact_facturation_nom, c.nom), 'adresse', c.contact_facturation_email),
                                          'revue_de', d.id, 'motif_revue', v_motif)
                    || case when p_apres_refus is not null then jsonb_build_object('apres_refus', p_apres_refus) else '{}'::jsonb end,
          d.echeance, left('cashd:relance:' || r.id::text || ':revue:' || d.id::text, 200))
  returning id, statut, politique_id into v_nouvelle, v_dstatut, v_dpolitique;
  v_statut := case when r.statut = 'non_reglee' then 'non_reglee' else 'a_valider' end;
  -- comme à la préparation : un accord permanent ne couvre que les rappels des paliers 1 et 2 (c2_12)
  if v_dstatut = 'approuvee' and v_dpolitique is not null and d.type_action <> 'cashd.rappel' then
    v_statut := 'bloquee';
    v_motif := left(v_motif || ' — un accord permanent l''a approuvée d''office : seuls les rappels des paliers 1 et 2 partent sans validation, elle n''est pas préparée', 500);
  end if;
  update public.cashd_relances set demande_id = v_nouvelle, statut = v_statut, motif = v_motif, maj_le = now() where id = r.id;
  if v_statut <> 'bloquee' and r.envoi_id is not null
     and to_regprocedure('private.preparer_envoi(uuid,text,text,text,text,jsonb,uuid,jsonb,text,text,uuid[],text,uuid,boolean,boolean,timestamptz,jsonb)') is not null then
    v_envoi := private.preparer_envoi(r.client_id, 'cashd', 'cashd_relances', r.id::text, r.canal,
      jsonb_build_object('adresse', c.contact_facturation_email, 'nom', coalesce(c.contact_facturation_nom, c.nom), 'ref', c.reference,
                         'professionnel', not c.particulier, 'langue', c.langue),
      null, '{}'::jsonb, v_t ->> 'sujet', v_t ->> 'corps', null::uuid[], left('cashd:relance:' || r.id::text || ':revue:' || d.id::text, 200), r.entite_id, true, false,
      null::timestamptz, jsonb_build_object('demande', v_nouvelle));
    update public.cashd_relances set envoi_id = v_envoi where id = r.id;
  end if;
  perform private.journaliser_module(r.client_id, 'cashd', 'cashd.relance_revue', 'cashd_relances', r.id::text,
    jsonb_build_object('motif', v_motif, 'avant', d.id, 'demande', v_nouvelle, 'montant_avant', d.montant, 'montant', (v_t ->> 'montant')::numeric), r.entite_id);
  return v_nouvelle;
end $function$;


revoke execute on function private.cashd_controle_relance(uuid) from public, anon, authenticated;
revoke execute on function private.cashd_controler_revue(uuid) from public, anon, authenticated;
revoke execute on function private.cashd_reviser_relance(uuid, text, jsonb) from public, anon, authenticated;

-- À la pose, une fois : les relances déjà revues, en attente, repassent les contrôles.
do $controle$
declare v_r uuid;
begin
  for v_r in
    select r.id from public.cashd_relances r join public.demandes_validation d on d.id = r.demande_id
    where d.statut = 'en_attente' and d.payload ? 'revue_de'
      and r.statut in ('a_valider', 'non_reglee', 'sans_adresse', 'bloquee', 'preparee')
  loop
    perform private.cashd_controler_revue(v_r);
  end loop;
end $controle$;
