-- 20260929033851 tamila_m10b_porte_etroite
-- Source : statements de la recette.
-- Assemblé par omega/prod/assembler.mjs pour la production (noepmkkplxshjbmqqxft). Transformations : aucune.
-- Tamila, M10b (recette seulement) : la porte des délais se referme après chaque appel à B5.
create function private.tamila_ouvrir_porte() returns text
language plpgsql volatile set search_path = '' as $$
declare
  v_avant text := current_setting('omega.delai_module', true);
begin
  perform set_config('omega.delai_module', 'tamila', true);
  return v_avant;
end $$;

create function private.tamila_fermer_porte(p_avant text) returns void
language plpgsql volatile set search_path = '' as $$
begin
  perform set_config('omega.delai_module', coalesce(p_avant, ''), true);
end $$;
revoke all on function private.tamila_ouvrir_porte(), private.tamila_fermer_porte(text) from public;

create or replace function private.tamila_poser(
  p_dossier public.tamila_dossiers, p_appel public.tamila_appels, p_regle text, p_depart date, p_residence text,
  p_avis uuid, p_raisons text[], p_uid uuid
) returns uuid
language plpgsql volatile security definer set search_path = '' as $$
declare
  v_porte text;
  p public.tamila_regles_procedure;
  v_calcul jsonb;
  v_echeance date;
  v_b5 uuid;
  v_id uuid;
begin
  select * into p from public.tamila_regles_procedure where code = p_regle;
  if not found then
    raise exception 'Règle de procédure inconnue : %.', coalesce(p_regle, 'vide') using errcode = '22023';
  end if;
  if p.regime <> p_appel.regime then
    raise exception 'La règle % est celle des appels introduits %, l''appel du dossier a été introduit le % (décret n° 2023-1391, art. 16).',
      p_regle, case p.regime when 'cpc' then 'depuis le 01/09/2024' else 'avant le 01/09/2024' end,
      to_char(p_appel.introduit_le, 'DD/MM/YYYY') using errcode = '22023';
  end if;
  if not (p_appel.procedure = any (p.procedures)) then
    raise exception 'La règle % vaut pour la procédure %, l''appel est en procédure « % » : déclarez d''abord son orientation.',
      p_regle, array_to_string(p.procedures, ' ou '), p_appel.procedure using errcode = '22023';
  end if;
  if p_depart is null or p_depart < p_appel.introduit_le then
    raise exception 'Un délai de l''appel ne part pas avant la déclaration d''appel (%).', to_char(p_appel.introduit_le, 'DD/MM/YYYY')
      using errcode = '22023';
  end if;
  v_calcul := private.tamila_calculer_delai(p_regle, p_depart, p_appel.territoire, p_residence);
  v_echeance := (v_calcul ->> 'echeance')::date;

  -- Le délai de B5 : la règle, l'augmentation (lot 16), son calcul et ses rappels.
  v_porte := private.tamila_ouvrir_porte();
  v_b5 := private.poser_delai(p_dossier.client_id, 'tamila', 'tamila_dossier', p_dossier.id::text,
    p.libelle_court || ' (CPC, art. ' || p.article || ')', p_regle, p_depart, p_appel.territoire, '{7,2,0}',
    p_dossier.responsable_id, private.tamila_libelle(p.acte),
    'tamila:' || p_dossier.id::text || ':' || p_regle || ':' || p_depart::text,
    (v_calcul ->> 'augmentation_mois')::integer);
  perform private.tamila_fermer_porte(v_porte);
  select t.id into v_id from public.tamila_delais t where t.delai_id = v_b5;
  if v_id is not null then
    return v_id;
  end if;
  if (select d.echeance from public.delais d where d.id = v_b5) <> v_echeance then
    raise exception 'B5 et Tamila divergent pour % au % : le délai n''est pas posé.', p_regle, p_depart using errcode = 'XX000';
  end if;

  insert into public.tamila_delais (client_id, dossier_id, appel_id, avis_id, delai_id, nature, regle_code, regle_version, acte,
    depart, territoire, residence, augmentation_mois, motif_augmentation, echeance_calculee, echeance_retenue, raisons, calcul,
    statut, responsable_id, cree_par)
  values (p_dossier.client_id, p_dossier.id, p_appel.id, p_avis, v_b5, 'regle', p_regle, (v_calcul ->> 'version')::smallint,
    p.acte, p_depart, p_appel.territoire, p_residence, (v_calcul ->> 'augmentation_mois')::smallint,
    v_calcul ->> 'motif_augmentation', v_echeance, v_echeance,
    array(select r from (select distinct r from unnest(array(select jsonb_array_elements_text(v_calcul -> 'raisons'))
                                                        || coalesce(p_raisons, '{}')) r) x
          order by r collate "C"),
    v_calcul, 'a_confirmer', p_dossier.responsable_id, p_uid)
  returning id into v_id;
  perform private.tamila_deposer_confirmation(v_id);
  return v_id;
end $$;

create or replace function private.tamila_poser_date_fixee(
  p_dossier public.tamila_dossiers, p_territoire text, p_echeance date, p_acte text, p_source text, p_avis uuid,
  p_raisons text[], p_uid uuid, p_confirme boolean
) returns uuid
language plpgsql volatile security definer set search_path = '' as $$
declare
  v_porte text;
  v_b5 uuid;
  v_id uuid;
begin
  if p_echeance is null then
    raise exception 'La date fixée est nécessaire.' using errcode = '22023';
  end if;
  if p_acte is null or p_acte not in ('signifier_declaration', 'conclure', 'signifier_conclusions', 'autre') then
    raise exception 'Acte inconnu : %.', coalesce(p_acte, 'vide') using errcode = '22023';
  end if;
  if p_source is null or p_source not in ('calendrier_de_procedure', 'ordonnance', 'avis', 'saisie') then
    raise exception 'Source inconnue : %.', coalesce(p_source, 'vide') using errcode = '22023';
  end if;
  v_porte := private.tamila_ouvrir_porte();
  v_b5 := private.poser_delai_date(p_dossier.client_id, 'tamila', 'tamila_dossier', p_dossier.id::text,
    'Date fixée par le juge : ' || lower(private.tamila_libelle(p_acte)), p_echeance,
    case p_source when 'calendrier_de_procedure' then 'Calendrier de procédure'
                  when 'ordonnance' then 'Ordonnance du conseiller de la mise en état'
                  when 'avis' then 'Avis du greffe' else 'Saisie au dossier' end,
    p_territoire, '{7,2,0}', p_dossier.responsable_id, private.tamila_libelle(p_acte),
    'tamila:' || p_dossier.id::text || ':date:' || p_echeance::text || ':' || p_acte || ':' || coalesce(p_avis::text, 'saisie'));
  perform private.tamila_fermer_porte(v_porte);
  select t.id into v_id from public.tamila_delais t where t.delai_id = v_b5;
  if v_id is not null then
    return v_id;
  end if;
  insert into public.tamila_delais (client_id, dossier_id, appel_id, avis_id, delai_id, nature, acte, territoire, echeance_retenue,
    raisons, source_date, statut, confirme_par, confirme_le, confirmation, responsable_id, cree_par)
  values (p_dossier.client_id, p_dossier.id, (select a.id from public.tamila_appels a where a.dossier_id = p_dossier.id), p_avis,
    v_b5, 'date_fixee', p_acte, p_territoire, p_echeance, coalesce(p_raisons, '{}'), p_source,
    case when p_confirme then 'confirme' else 'a_confirmer' end,
    case when p_confirme then p_uid end, case when p_confirme then now() end, case when p_confirme then 'saisie' end,
    p_dossier.responsable_id, p_uid)
  returning id into v_id;
  if not p_confirme then
    perform private.tamila_deposer_confirmation(v_id);
  end if;
  return v_id;
end $$;

create or replace function private.tamila_interrompre(p_delai uuid, p_motif text, p_depuis date) returns void
language plpgsql volatile security definer set search_path = '' as $$
declare
  v_porte text;
  t public.tamila_delais;
begin
  select * into t from public.tamila_delais where id = p_delai for update;
  if t.statut not in ('a_confirmer', 'confirme', 'rejete') then
    raise exception 'Ce délai ne court pas : il ne s''interrompt pas.' using errcode = '55000';
  end if;
  if t.nature <> 'regle' or not exists (select 1 from public.tamila_regles_procedure p
                                        where p.code = t.regle_code and p.interruptible) then
    raise exception 'Seuls les délais pour conclure s''interrompent (art. 915-3 ; ancien art. 910-2).' using errcode = '22023';
  end if;
  if p_motif is null or p_motif not in ('mediation', 'conciliation', 'procedure_participative', 'mise_en_etat_simplifiee',
                                        'audience_reglement_amiable', 'a_preciser') then
    raise exception 'Cause d''interruption inconnue : %.', coalesce(p_motif, 'vide') using errcode = '22023';
  end if;
  if p_depuis is null or p_depuis > greatest(private.tamila_aujourdhui(t.territoire), private.tamila_aujourdhui('metropole')) then
    raise exception 'L''interruption part d''une date passée ou du jour.' using errcode = '22023';
  end if;
  perform private.tamila_annuler_confirmation(t.id);
  update public.tamila_delais set statut = 'interrompu', interrompu_le = p_depuis, motif_interruption = p_motif where id = t.id;
  if (select d.statut from public.delais d where d.id = t.delai_id) in ('ouvert', 'depasse') then
    v_porte := private.tamila_ouvrir_porte();
    perform private.clore_delai(t.delai_id, 'annule',
      'Interrompu (CPC, art. 915-3) : ' || private.tamila_libelle(p_motif) || ' ; l''avocat saisit la nouvelle échéance.');
    perform private.tamila_fermer_porte(v_porte);
  end if;
  perform private.journaliser_module(t.client_id, 'tamila', 'tamila.delai.interrompu', 'tamila_dossier', t.dossier_id::text,
    jsonb_build_object('delai', t.id, 'motif', p_motif, 'depuis', p_depuis));
end $$;

create or replace function private.tamila_executer_confirmation(p_demande uuid) returns text
language plpgsql volatile security definer set search_path = '' as $$
declare
  v_porte text;
  v_d public.demandes_validation;
  t public.tamila_delais;
  v_decideur uuid;
  v_echeance date;
  v_modifie boolean;
begin
  select * into v_d from public.demandes_validation where id = p_demande for update;
  if not found or v_d.module <> 'tamila' or v_d.type_action <> 'confirmer_delai' then
    return null;
  end if;
  if v_d.statut not in ('approuvee', 'rejetee') then
    return v_d.statut;
  end if;
  select * into t from public.tamila_delais
   where id = private.tamila_uuid(v_d.payload ->> 'delai_id') and client_id = v_d.client_id and dossier_id::text = v_d.objet_id
   for update;

  if v_d.statut = 'rejetee' then
    -- Rejeté : le délai reste dans la liste ; un avocat saisit la bonne date, ou l'annule.
    if found and t.statut = 'a_confirmer' and t.demande_id = v_d.id then
      update public.tamila_delais set statut = 'rejete' where id = t.id;
      perform private.journaliser_module(t.client_id, 'tamila', 'tamila.delai.rejete', 'tamila_dossier', t.dossier_id::text,
        jsonb_build_object('delai', t.id, 'demande', v_d.id));
    end if;
    return 'rejetee';
  end if;

  if not found then
    return private.tamila_echec_demande(v_d.id, 'Délai introuvable.');
  end if;
  if v_d.politique_id is not null then
    return private.tamila_echec_demande(v_d.id, 'Chaque délai est confirmé par un avocat : un accord permanent ne le couvre pas.');
  end if;
  if exists (select 1 from public.approbations a
             where a.demande_id = v_d.id and a.decision = 'approuve'
               and not (private.tamila_est_avocat(coalesce(a.au_nom_de, a.user_id), v_d.client_id)
                        and private.tamila_voit_dossier_pour(coalesce(a.au_nom_de, a.user_id), v_d.client_id, v_d.objet_id)
                        and private.tamila_voit_dossier_pour(a.user_id, v_d.client_id, v_d.objet_id))) then
    return private.tamila_echec_demande(v_d.id, 'Un délai est confirmé par un avocat qui a accès au dossier.');
  end if;
  if t.statut <> 'a_confirmer'
     or not (t.demande_id = v_d.id or t.demande_id::text is not distinct from (v_d.payload ->> 'remplace')) then
    return private.tamila_echec_demande(v_d.id, 'Ce délai n''attend plus cette confirmation.');
  end if;
  begin
    v_echeance := (v_d.payload ->> 'echeance')::date;
  exception when others then
    v_echeance := null;
  end;
  if v_echeance is null then
    return private.tamila_echec_demande(v_d.id, 'La date à confirmer est illisible.');
  end if;
  v_modifie := v_d.payload ? 'remplace';
  select coalesce(a.au_nom_de, a.user_id) into v_decideur
  from public.approbations a where a.demande_id = v_d.id and a.decision = 'approuve'
  order by a.decide_le desc limit 1;

  if v_echeance <> t.echeance_retenue then
    if (select d.statut from public.delais d where d.id = t.delai_id) not in ('ouvert', 'depasse') then
      return private.tamila_echec_demande(v_d.id, 'Le délai de B5 a été clos hors de Tamila : saisir la date (tamila_corriger_delai).');
    end if;
    v_porte := private.tamila_ouvrir_porte();
    perform private.notifier_delai(t.delai_id, v_echeance, 'Date modifiée par un avocat avant sa confirmation.');
    perform private.tamila_fermer_porte(v_porte);
  end if;
  update public.tamila_delais
     set statut = 'confirme', echeance_retenue = v_echeance, confirme_par = v_decideur, confirme_le = now(),
         confirmation = case when v_modifie then 'modification' else 'approbation' end, demande_id = v_d.id
   where id = t.id;
  update public.demandes_validation set statut = 'executee' where id = v_d.id;
  perform private.journaliser_module(t.client_id, 'tamila', 'tamila.delai.confirme', 'tamila_dossier', t.dossier_id::text,
    jsonb_build_object('delai', t.id, 'echeance', v_echeance, 'par', v_decideur,
                       'confirmation', case when v_modifie then 'modification' else 'approbation' end));
  return 'executee';
end $$;

create or replace function private.tamila_corriger_delai(p_delai uuid, p_echeance date, p_motif text) returns void
language plpgsql volatile security definer set search_path = '' as $$
declare
  v_porte text;
  v_uid uuid := (select auth.uid());
  t public.tamila_delais;
  v_b5 public.delais;
  v_nouveau uuid;
  v_source text;
begin
  select * into t from public.tamila_delais where id = p_delai;
  if v_uid is null or not found then
    raise exception 'Une date se corrige par un avocat du dossier.' using errcode = '42501';
  end if;
  perform private.tamila_dossier_ecrit(t.dossier_id, true);
  select * into t from public.tamila_delais where id = p_delai for update;
  if t.statut not in ('a_confirmer', 'rejete', 'confirme', 'interrompu') then
    raise exception 'Ce délai est clos ou annulé.' using errcode = '55000';
  end if;
  if p_motif is null or p_motif not in ('calcul_errone', 'date_notifiee', 'delai_modifie_par_le_juge',
                                        'reprise_apres_interruption', 'autre') then
    raise exception 'Motif de correction inconnu : %.', coalesce(p_motif, 'vide') using errcode = '22023';
  end if;
  if p_echeance is null then
    raise exception 'La date corrigée est nécessaire.' using errcode = '22023';
  end if;
  v_source := 'Date saisie par un avocat : ' || private.tamila_libelle(p_motif) || '.';
  select * into v_b5 from public.delais where id = t.delai_id;
  if v_b5.statut in ('ouvert', 'depasse') then
    v_porte := private.tamila_ouvrir_porte();
    perform private.notifier_delai(t.delai_id, p_echeance, v_source);
    perform private.tamila_fermer_porte(v_porte);
  else
    -- Le délai de B5 a été clos (interruption) : un nouveau porte la date.
    v_porte := private.tamila_ouvrir_porte();
    v_nouveau := private.poser_delai_date(t.client_id, 'tamila', 'tamila_dossier', t.dossier_id::text, v_b5.libelle, p_echeance,
      v_source, t.territoire, '{7,2,0}', t.responsable_id, v_b5.action_attendue,
      'tamila:' || t.id::text || ':' || extract(epoch from clock_timestamp())::bigint::text);
    perform private.tamila_fermer_porte(v_porte);
  end if;
  perform private.tamila_annuler_confirmation(t.id);
  update public.tamila_delais
     set statut = 'confirme', echeance_retenue = p_echeance, confirmation = 'saisie', confirme_par = v_uid, confirme_le = now(),
         motif_correction = p_motif, delai_id = coalesce(v_nouveau, delai_id),
         depasse_le = case when p_echeance >= private.tamila_aujourdhui(t.territoire) then null else depasse_le end
   where id = t.id;
  perform private.journaliser_module(t.client_id, 'tamila', 'tamila.delai.corrige', 'tamila_dossier', t.dossier_id::text,
    jsonb_build_object('delai', t.id, 'echeance', p_echeance, 'avant', t.echeance_retenue, 'motif', p_motif));
end $$;

create or replace function private.tamila_declarer_acte(p_delai uuid, p_depose_le date, p_piece uuid default null) returns void
language plpgsql volatile security definer set search_path = '' as $$
declare
  v_porte text;
  v_uid uuid := (select auth.uid());
  t public.tamila_delais;
  v_d public.tamila_dossiers;
begin
  select * into t from public.tamila_delais where id = p_delai;
  if not found then
    raise exception 'Délai introuvable.' using errcode = '42501';
  end if;
  if v_uid is null and p_piece is null then
    raise exception 'Le serveur clôt un délai sur un accusé de dépôt seulement.' using errcode = '42501';
  end if;
  v_d := private.tamila_dossier_ecrit(t.dossier_id, p_piece is null);
  select * into t from public.tamila_delais where id = p_delai for update;
  if t.statut not in ('a_confirmer', 'confirme', 'rejete', 'interrompu') then
    raise exception 'Ce délai est déjà clos ou annulé.' using errcode = '55000';
  end if;
  if p_depose_le is null or p_depose_le < date '2017-09-01'
     or p_depose_le > greatest(private.tamila_aujourdhui(t.territoire), private.tamila_aujourdhui('metropole')) then
    raise exception 'La date du dépôt est un jour passé, ou aujourd''hui.' using errcode = '22023';
  end if;
  if p_piece is not null and not exists (
       select 1 from public.pieces pc
       where pc.id = p_piece and pc.client_id = t.client_id and pc.objet_type = 'tamila_dossier' and pc.objet_id = t.dossier_id::text) then
    raise exception 'Cette pièce n''est pas dans le dossier du délai.' using errcode = '22023';
  end if;
  perform private.tamila_annuler_confirmation(t.id);
  update public.tamila_delais
     set statut = 'clos', acte_depose_le = p_depose_le, motif_cloture = case when p_piece is null then 'declaration' else 'accuse_rpva' end,
         preuve_piece_id = p_piece, clos_par = v_uid, clos_le = now()
   where id = t.id;
  if (select d.statut from public.delais d where d.id = t.delai_id) in ('ouvert', 'depasse') then
    v_porte := private.tamila_ouvrir_porte();
    perform private.clore_delai(t.delai_id, 'tenu', null);
    perform private.tamila_fermer_porte(v_porte);
  end if;
  if p_piece is not null then
    update public.tamila_avis set statut = 'applique', effet = 'delai_clos' where piece_id = p_piece and statut = 'a_rattacher';
  end if;
  if p_depose_le > t.echeance_retenue then
    perform private.lever_alerte_module(t.client_id, 'tamila', 'critique', 'Acte déposé après l''échéance du délai',
      jsonb_build_object('delai', t.id, 'dossier', t.dossier_id, 'echeance', t.echeance_retenue, 'depose_le', p_depose_le),
      'delai_hors_delai:' || t.id::text, true, t.responsable_id);
  end if;
  perform private.journaliser_module(t.client_id, 'tamila', 'tamila.delai.clos', 'tamila_dossier', t.dossier_id::text,
    jsonb_build_object('delai', t.id, 'motif', case when p_piece is null then 'declaration' else 'accuse_rpva' end,
                       'depose_le', p_depose_le, 'piece', p_piece));
end $$;

create or replace function private.tamila_annuler_delai(p_delai uuid, p_motif text) returns void
language plpgsql volatile security definer set search_path = '' as $$
declare
  v_porte text;
  v_uid uuid := (select auth.uid());
  t public.tamila_delais;
begin
  select * into t from public.tamila_delais where id = p_delai;
  if v_uid is null or not found then
    raise exception 'Un délai s''annule par un avocat du dossier.' using errcode = '42501';
  end if;
  perform private.tamila_dossier_ecrit(t.dossier_id, true);
  select * into t from public.tamila_delais where id = p_delai for update;
  if t.statut in ('clos', 'annule') then
    raise exception 'Ce délai est déjà clos ou annulé.' using errcode = '55000';
  end if;
  if p_motif is null or p_motif not in ('desistement', 'caducite_prononcee', 'irrecevabilite_prononcee', 'radiation',
                                        'procedure_changee', 'erreur', 'doublon', 'autre') then
    raise exception 'Motif d''annulation inconnu : %.', coalesce(p_motif, 'vide') using errcode = '22023';
  end if;
  perform private.tamila_annuler_confirmation(t.id);
  update public.tamila_delais set statut = 'annule', motif_annulation = p_motif, annule_par = v_uid, annule_le = now()
   where id = t.id;
  if (select d.statut from public.delais d where d.id = t.delai_id) in ('ouvert', 'depasse') then
    v_porte := private.tamila_ouvrir_porte();
    perform private.clore_delai(t.delai_id, 'annule', 'Annulé par un avocat : ' || private.tamila_libelle(p_motif) || '.');
    perform private.tamila_fermer_porte(v_porte);
  end if;
  perform private.journaliser_module(t.client_id, 'tamila', 'tamila.delai.annule', 'tamila_dossier', t.dossier_id::text,
    jsonb_build_object('delai', t.id, 'motif', p_motif));
end $$;

drop function private.tamila_porte_delais();
