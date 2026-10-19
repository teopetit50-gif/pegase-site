-- FILED, lot 11b (a4_19) — l'échange avec la plateforme pour un fournisseur ÉTRANGER (sans SIREN).
--
-- Demande d'A2 (chaîne PA, étape 5) : le 204 de BAC-0001 (Lieferant GmbH, TVA DE123456789, sans SIREN) était en
-- échec « CDAR_INVALIDE : SIREN invalide ». L'ouvrier echange-pa (worker-a2 21466c7) choisit désormais le schéma
-- d'identifiant (SIREN 0002, TVA UE 0223, hors UE 0227) ; il lui faut la TVA. Ce lot remplace, textes d'a4_18 plus :
--   · public.pa_commencer_statut : le CDAR porte `facture.emetteur_tva`, `destinataire.tva` (TVA du vendeur, lue sur la
--     facture ou sur la fiche) et `emetteur.tva` (TVA de la société acheteuse si elle en a une) ; jsonb_strip_nulls
--     retire ce qui manque. Aucune clause ne refuse un vendeur sans SIREN ;
--   · public.pa_noter_flux : un CDAR entrant se rapproche de la facture par le SIREN du vendeur OU par sa TVA.
-- Même signatures, mêmes droits (service_role seul). La source d'a4_18 est alignée. Rejouable ; aucune suppression.

create or replace function public.pa_commencer_statut(p_statut uuid)
returns jsonb language plpgsql security definer set search_path to '' as $$
declare v_e public.filed_cycle_vie; v_f public.filed_factures; v_four public.filed_fournisseurs; v_ent public.entites;
        v_motif text; v_cdar jsonb;
begin
  select * into v_e from public.filed_cycle_vie where suivi = p_statut for update;
  if not found then return jsonb_build_object('envoyer', false, 'statut', null, 'motif', 'Statut inconnu.'); end if;
  if v_e.sens <> 'emis' or v_e.code between 200 and 203 or v_e.code = 213 then
    return jsonb_build_object('envoyer', false, 'statut', v_e.code, 'motif', 'Statut de plateforme ou reçu : jamais émis par Omega.');
  end if;
  if v_e.etat = 'emis' then return jsonb_build_object('envoyer', false, 'statut', v_e.code, 'motif', 'Déjà émis.', 'flux', v_e.flux_pa); end if;
  if v_e.etat not in ('a_emettre', 'en_cours') then
    return jsonb_build_object('envoyer', false, 'statut', v_e.code, 'motif', format('État %s : rien à émettre.', v_e.etat));
  end if;
  if not private.filed_recue_par_pa(v_e.document_id) then
    update public.filed_cycle_vie set etat = 'sans_objet', erreur = 'Facture non reçue par la plateforme.' where id = v_e.id;
    return jsonb_build_object('envoyer', false, 'statut', v_e.code, 'motif', 'Facture non reçue par la plateforme : statut sans objet.');
  end if;
  select * into v_f from public.filed_factures where id = v_e.facture_id;
  select * into v_four from public.filed_fournisseurs where id = v_f.fournisseur_id;
  select * into v_ent from public.entites where id = v_f.entite_id;
  v_motif := coalesce(v_e.motif, (select a.texte from public.filed_factures_annexes a
                                   where a.facture_id = v_f.id and a.nature = 'motif_refus' order by a.cree_le desc limit 1));
  update public.filed_cycle_vie set etat = 'en_cours', pris_le = now(), essais = essais + 1 where id = v_e.id;
  v_cdar := jsonb_strip_nulls(jsonb_build_object(
    'message', v_e.suivi, 'emis_le', now(), 'code', v_e.code,
    'facture', jsonb_build_object('numero', v_f.numero, 'date', to_char(v_f.date_emission, 'YYYY-MM-DD'),
                                  'type_code', case when v_f.nature = 'avoir' then '381' else '380' end,
                                  'emetteur_siren', coalesce(v_f.fournisseur_lu ->> 'siren', v_four.siren),
                                  -- Lot 11b (a4_19) : un vendeur étranger n'a pas de SIREN ; sa TVA l'identifie.
                                  'emetteur_tva', coalesce(v_f.fournisseur_lu ->> 'tva', v_four.tva)),
    'emetteur', jsonb_build_object('siren', coalesce(v_f.acheteur_lu ->> 'siren', v_ent.siren), 'nom', v_ent.nom, 'role', 'BY',
                                   'tva', coalesce(v_f.acheteur_lu ->> 'tva', to_jsonb(v_ent) ->> 'tva')),
    'destinataire', jsonb_build_object('siren', coalesce(v_f.fournisseur_lu ->> 'siren', v_four.siren), 'nom', v_four.nom, 'role', 'SE',
                                       'tva', coalesce(v_f.fournisseur_lu ->> 'tva', v_four.tva)),
    'motif', case when v_e.code in (206, 207, 208, 210) then jsonb_build_object('code', coalesce(v_e.motif_code, 'AUTRE'), 'texte', left(v_motif, 500)) end,
    'montant', case when v_e.code in (211, 212) then jsonb_build_object('valeur', v_e.montant, 'devise', coalesce(v_f.devise, 'EUR')) end));
  return jsonb_build_object('envoyer', true, 'statut', v_e.code, 'client_id', v_e.client_id, 'suivi', v_e.suivi, 'cdar', v_cdar);
end $$;
comment on function public.pa_commencer_statut(uuid) is
  'Ouvrier echange-pa : verrouille un statut du cycle de vie à émettre (suivi = trackingId) et rend de quoi fabriquer le CDAR ; refuse les statuts de plateforme et ceux d''une facture non reçue par la plateforme.';

create or replace function public.pa_noter_flux(p_flux text, p_sens text, p_type text, p_syntaxe text, p_suivi text, p_accuse text,
                                                p_maj_le timestamptz, p_chemin text, p_sha256 text, p_detail jsonb, p_cle text)
returns jsonb language plpgsql security definer set search_path to '' as $$
declare
  v_x public.filed_pa_flux; v_e public.filed_cycle_vie; v_c record; v_cdar jsonb; v_f public.filed_factures; v_code smallint;
  v_suivi uuid; v_nom text; v_premier public.filed_pa_flux;
begin
  select * into v_x from public.filed_pa_flux where cle = p_cle;
  if found then
    return jsonb_build_object('id', v_x.id, 'nouveau', false, 'etat', v_x.etat, 'client_id', v_x.client_id,
                              'document', v_x.document_id, 'chemin_cible', v_x.chemin_cible);
  end if;
  insert into public.filed_pa_flux (cle, flux, sens, type, syntaxe, suivi, accuse, maj_le, chemin, sha256, detail)
  values (p_cle, p_flux, p_sens, p_type, p_syntaxe, p_suivi, p_accuse, p_maj_le, p_chemin, lower(p_sha256), coalesce(p_detail, '{}'::jsonb))
  returning * into v_x;

  -- Sortant : l'accusé de la plateforme sur un statut que nous avons déposé (suivi = notre trackingId).
  if p_sens = 'sortant' then
    begin v_suivi := p_suivi::uuid; exception when others then v_suivi := null; end;
    select * into v_e from public.filed_cycle_vie where suivi = v_suivi for update;
    if v_e.id is null then
      update public.filed_pa_flux set etat = 'sans_suite' where id = v_x.id;
    else
      update public.filed_pa_flux set etat = 'note', client_id = v_e.client_id, facture_id = v_e.facture_id, cycle_vie_id = v_e.id where id = v_x.id;
      if p_accuse = 'ok' and v_e.etat <> 'emis' then
        update public.filed_cycle_vie set etat = 'emis', emis_le = coalesce(p_maj_le, now()), flux_pa = left(p_flux, 200), reference_pa = left(p_flux, 200), erreur = null
         where id = v_e.id;
      elsif p_accuse = 'erreur' then
        update public.filed_cycle_vie set etat = 'echec', flux_pa = left(p_flux, 200),
               erreur = left('Rejeté par la plateforme : ' || coalesce(p_detail -> 'details' #>> '{}', 'sans détail'), 500)
         where id = v_e.id;
        perform private.lever_alerte_module(v_e.client_id, 'filed', 'attention',
          left(format('Statut %s rejeté par la plateforme : %s', v_e.code, coalesce(p_detail -> 'details' #>> '{}', 'sans détail')), 200),
          jsonb_build_object('facture', v_e.facture_id, 'cycle_vie', v_e.id, 'flux', p_flux), 'cycle_vie_rejet:' || v_e.id::text, false, null);
      end if;
    end if;
    select * into v_x from public.filed_pa_flux where id = v_x.id;
    return jsonb_build_object('id', v_x.id, 'nouveau', true, 'etat', v_x.etat);
  end if;

  -- Entrant, statut (CDAR) : sur une facture que nous avons reçue ; gardé au journal du cycle de vie (sens recu).
  if upper(coalesce(p_syntaxe, '')) = 'CDAR' or coalesce(p_type, '') ~ 'LC$' then
    v_cdar := coalesce(p_detail -> 'cdar', '{}'::jsonb);
    select f.* into v_f from public.filed_factures f
      left join public.filed_fournisseurs fo on fo.id = f.fournisseur_id
     where f.numero_normalise = upper(regexp_replace(coalesce(v_cdar -> 'facture' ->> 'numero', ''), '[^A-Za-z0-9]', '', 'g'))
       -- Lot 11b (a4_19) : par le SIREN du vendeur, ou par sa TVA (vendeur étranger sans SIREN).
       and (coalesce(f.fournisseur_lu ->> 'siren', fo.siren) = coalesce(v_cdar -> 'facture' ->> 'emetteur_siren', v_cdar -> 'emetteur' ->> 'siren')
            or upper(regexp_replace(coalesce(f.fournisseur_lu ->> 'tva', fo.tva, ''), '[^A-Za-z0-9]', '', 'g'))
               = upper(regexp_replace(coalesce(v_cdar -> 'facture' ->> 'emetteur_tva', v_cdar -> 'emetteur' ->> 'tva', '#'), '[^A-Za-z0-9]', '', 'g')))
     order by f.cree_le desc limit 1;
    v_code := case when (v_cdar ->> 'code') ~ '^[0-9]{3}$' then (v_cdar ->> 'code')::smallint end;
    if v_f.id is null or v_code is null or not exists (select 1 from public.filed_cycle_vie_statuts s where s.code = v_code) then
      update public.filed_pa_flux set etat = 'orphelin' where id = v_x.id;
    else
      insert into public.filed_cycle_vie (client_id, facture_id, document_id, code, motif_code, motif, cle, etat, sens, flux_pa, survenu_le)
      values (v_f.client_id, v_f.id, v_f.document_id, v_code,
              (select m.code from public.filed_cycle_vie_motifs m where m.code = v_cdar -> 'motif' ->> 'code'),
              left(v_cdar -> 'motif' ->> 'texte', 500), 'pa:recu:' || p_flux, 'sans_objet', 'recu', left(p_flux, 200), coalesce(p_maj_le, now()))
      on conflict (client_id, cle) do nothing;
      update public.filed_pa_flux set etat = 'note', client_id = v_f.client_id, facture_id = v_f.id where id = v_x.id;
    end if;
    select * into v_x from public.filed_pa_flux where id = v_x.id;
    return jsonb_build_object('id', v_x.id, 'nouveau', true, 'etat', v_x.etat, 'facture', v_x.facture_id);
  end if;

  -- Entrant, facture : un même flux déjà rattaché (autre clé, autre maj_le) garde son document.
  select * into v_premier from public.filed_pa_flux
   where flux = p_flux and sens = 'entrant' and document_id is not null and id <> v_x.id order by id limit 1;
  if v_premier.id is not null then
    update public.filed_pa_flux set etat = 'sans_suite', client_id = v_premier.client_id, document_id = v_premier.document_id where id = v_x.id;
    return jsonb_build_object('id', v_x.id, 'nouveau', true, 'etat', 'sans_suite', 'client_id', v_premier.client_id,
                              'document', v_premier.document_id, 'chemin_cible', v_premier.chemin_cible, 'flux_id', v_premier.id);
  end if;
  select * into v_c from private.filed_pa_trouver_client(p_detail);
  if v_c.issue <> 'rattache' then
    update public.filed_pa_flux set etat = v_c.issue where id = v_x.id;
    return jsonb_build_object('id', v_x.id, 'nouveau', true, 'etat', v_c.issue);
  end if;
  v_nom := coalesce(nullif(regexp_replace(coalesce(p_chemin, ''), '^.*/', ''), ''), p_flux || '.xml');
  update public.filed_pa_flux
     set etat = 'rattache', client_id = v_c.client_id, entite_id = v_c.entite_id, document_id = gen_random_uuid()
   where id = v_x.id returning * into v_x;
  update public.filed_pa_flux set chemin_cible = v_c.client_id::text || '/filed_document/' || v_x.document_id::text || '/' || v_nom
   where id = v_x.id returning * into v_x;
  return jsonb_build_object('id', v_x.id, 'nouveau', true, 'etat', v_x.etat, 'client_id', v_x.client_id,
                            'document', v_x.document_id, 'chemin_cible', v_x.chemin_cible);
end $$;
comment on function public.pa_noter_flux(text, text, text, text, text, text, timestamptz, text, text, jsonb, text) is
  'Ouvrier echange-pa : note un flux (idempotent sur p_cle). Sortant : accusé d''un statut (ok → émis, erreur → échec et alerte). Entrant statut (CDAR) : au cycle de vie de la facture reçue. Entrant facture : client retrouvé par le SIREN de l''acheteur, document réservé, chemin_cible rendu ; l''ouvrier y copie le fichier puis appelle pa_deposer_facture.';


revoke all on function public.pa_commencer_statut(uuid) from public, anon, authenticated;
grant execute on function public.pa_commencer_statut(uuid) to service_role;
revoke all on function public.pa_noter_flux(text, text, text, text, text, text, timestamptz, text, text, jsonb, text) from public, anon, authenticated;
grant execute on function public.pa_noter_flux(text, text, text, text, text, text, timestamptz, text, text, jsonb, text) to service_role;
