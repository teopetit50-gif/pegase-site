-- ═══════════════════════════════════════════════════════════════════════════
-- CASHD — c2_47 : une relance revue ou reprise reçoit un message adossé à sa nouvelle demande (27/10/2026, session C2)
-- ═══════════════════════════════════════════════════════════════════════════
-- Défaut trouvé en relisant le socle le 27/10 : cashd_reprendre_refus (c2_41) et cashd_reviser_relance (c2_42 → c2_46)
-- vérifiaient la présence de private.preparer_envoi avec un uuid en septième argument ; la fonction prend un text (le
-- code du gabarit). to_regprocedure rendait null : la relance reprise ou revue gardait le message adossé à l'ANCIENNE
-- demande (annulée ou refusée). Approuvée, elle ne serait jamais partie. Les deux fonctions sont reprises telles quelles,
-- signature corrigée. À la pose : les relances revues ou reprises en attente reçoivent leur message.
--
-- Règles de pose : rejouable ; jamais de DROP ni de DELETE ; revoke execute de public.

create or replace function private.cashd_reprendre_refus(p_refusee uuid, p_consigne jsonb)
 returns text language plpgsql security definer set search_path to ''
as $function$
declare
  d public.demandes_validation;
  r public.cashd_relances;
  c public.cashd_comptes;
  v_t jsonb;
  v_corr jsonb := '[]'::jsonb;
  v_motif text := p_consigne ->> 'motif';
  v_nouvelle uuid;
  v_envoi uuid;
  v_adresse text;
begin
  select * into d from public.demandes_validation where id = p_refusee;
  if d.id is null or d.module <> 'cashd' or d.objet_type is distinct from 'cashd_relances' then
    return null;
  end if;
  select * into r from public.cashd_relances where id = d.objet_id::uuid;
  if r.id is null then
    perform private.reprise_impossible(p_refusee, 'la relance refusée n''existe plus');
    return 'impossible';
  end if;
  select * into c from public.cashd_comptes where id = r.compte_id;
  if v_motif = 'Doublon' then
    perform private.reprise_impossible(p_refusee, 'refusée comme doublon : CASHD ne repropose pas cette relance');
    return 'impossible';
  end if;
  if c.statut <> 'actif' or not exists (select 1 from public.cashd_relances_pieces p join public.cashd_factures f on f.id = p.facture_id
                                         where p.relance_id = r.id and not p.annulee and f.statut in ('ouverte', 'en_attente')
                                           and (f.nature = 'devis' or private.cashd_reste(f.id) > 0.005)) then
    perform private.reprise_impossible(p_refusee, 'plus rien à relancer : pièces soldées ou compte arrêté (' || replace(c.statut, '_', ' ') || ')');
    return 'impossible';
  end if;
  -- la relance sur les données du jour : les restes dus des pièces, puis le texte
  update public.cashd_relances_pieces p set reste_du = case when f.nature = 'devis' then f.montant_ttc else e.reste_relancable end
    from public.cashd_factures f join public.cashd_factures_etat e on e.id = f.id
   where p.relance_id = r.id and not p.annulee and f.id = p.facture_id;
  v_t := private.cashd_ecrire_texte(r.id);
  v_adresse := c.contact_facturation_email;
  if (v_t ->> 'montant')::numeric is distinct from (d.payload ->> 'montant')::numeric and (v_t ->> 'montant')::numeric is distinct from d.montant then
    v_corr := v_corr || jsonb_build_array(jsonb_build_object('champ', 'montant', 'avant', d.montant, 'apres', (v_t ->> 'montant')::numeric));
  end if;
  if (v_t ->> 'sujet') is distinct from (d.payload ->> 'sujet') then
    v_corr := v_corr || jsonb_build_array(jsonb_build_object('champ', 'sujet', 'avant', d.payload ->> 'sujet', 'apres', v_t ->> 'sujet'));
  end if;
  if (v_t ->> 'corps') is distinct from (d.payload ->> 'corps') then
    v_corr := v_corr || jsonb_build_array(jsonb_build_object('champ', 'corps', 'avant', d.payload ->> 'corps', 'apres', v_t ->> 'corps'));
  end if;
  if v_adresse is distinct from (d.payload #>> '{destinataire,adresse}') then
    v_corr := v_corr || jsonb_build_array(jsonb_build_object('champ', 'destinataire', 'avant', d.payload #>> '{destinataire,adresse}', 'apres', v_adresse));
  end if;
  if jsonb_array_length(v_corr) = 0 then
    perform private.reprise_impossible(p_refusee, 'même résultat qu''avant : relue sur les données du jour, la relance est identique'
      || coalesce(' — consigne : ' || nullif(concat_ws(' · ', v_motif, p_consigne ->> 'commentaire'), ''), '')
      || '. Corrigez la fiche du compte, ses pièces ou vos textes : la relance suivante en tiendra compte.');
    return 'impossible';
  end if;
  v_nouvelle := private.proposer_reprise(p_refusee,
    'Relance ' || c.nom || ', ' || private.cashd_eur((v_t ->> 'montant')::numeric),
    d.payload || jsonb_build_object('sujet', v_t ->> 'sujet', 'corps', v_t ->> 'corps', 'montant', (v_t ->> 'montant')::numeric,
                                    'destinataire', jsonb_build_object('nom', coalesce(c.contact_facturation_nom, c.nom), 'adresse', v_adresse)),
    v_corr, (v_t ->> 'montant')::numeric);
  update public.cashd_relances set demande_id = v_nouvelle, statut = 'a_valider', motif = 'reprise après refus, à valider de nouveau',
         sujet = v_t ->> 'sujet', corps = v_t ->> 'corps', montant = (v_t ->> 'montant')::numeric, destinataire_adresse = v_adresse, maj_le = now()
   where id = r.id;
  -- un envoi adossé à la nouvelle demande, quand la relance en avait un
  if r.envoi_id is not null and to_regprocedure('private.preparer_envoi(uuid,text,text,text,text,jsonb,text,jsonb,text,text,uuid[],text,uuid,boolean,boolean,timestamptz,jsonb)') is not null then
    v_envoi := private.preparer_envoi(r.client_id, 'cashd', 'cashd_relances', r.id::text, r.canal,
      jsonb_build_object('adresse', v_adresse, 'nom', coalesce(c.contact_facturation_nom, c.nom), 'ref', c.reference,
                         'professionnel', not c.particulier, 'langue', c.langue),
      null, '{}'::jsonb, v_t ->> 'sujet', v_t ->> 'corps', null::uuid[], 'cashd:relance:' || r.id::text || ':reprise', r.entite_id, true, false,
      null::timestamptz, jsonb_build_object('demande', v_nouvelle));
    update public.cashd_relances set envoi_id = v_envoi where id = r.id;
  end if;
  perform private.journaliser_module(r.client_id, 'cashd', 'cashd.relance_reprise', 'cashd_relances', r.id::text,
    jsonb_build_object('refusee', p_refusee, 'reprise', v_nouvelle, 'corrections', jsonb_array_length(v_corr)), r.entite_id);
  return 'proposee';
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
     and to_regprocedure('private.preparer_envoi(uuid,text,text,text,text,jsonb,text,jsonb,text,text,uuid[],text,uuid,boolean,boolean,timestamptz,jsonb)') is not null then
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

revoke execute on function private.cashd_reprendre_refus(uuid, jsonb) from public, anon, authenticated;
revoke execute on function private.cashd_reviser_relance(uuid, text, jsonb) from public, anon, authenticated;

-- À la pose, une fois : une relance en attente dont le message est adossé à une autre demande que la sienne reçoit le sien.
do $readosse$
declare x record; v_envoi uuid; c public.cashd_comptes;
begin
  for x in
    select r.* from public.cashd_relances r
    join public.demandes_validation d on d.id = r.demande_id and d.statut = 'en_attente'
    join public.envois e on e.id = r.envoi_id
    where r.statut = 'a_valider' and e.demande_id is distinct from r.demande_id
  loop
    select * into c from public.cashd_comptes where id = x.compte_id;
    v_envoi := private.preparer_envoi(x.client_id, 'cashd', 'cashd_relances', x.id::text, x.canal,
      jsonb_build_object('adresse', c.contact_facturation_email, 'nom', coalesce(c.contact_facturation_nom, c.nom), 'ref', c.reference,
                         'professionnel', not c.particulier, 'langue', c.langue),
      null, '{}'::jsonb, x.sujet, x.corps, null::uuid[], left('cashd:relance:' || x.id::text || ':readosse:' || x.demande_id::text, 200), x.entite_id, true, false,
      null::timestamptz, jsonb_build_object('demande', x.demande_id));
    update public.cashd_relances set envoi_id = v_envoi where id = x.id;
  end loop;
end $readosse$;
