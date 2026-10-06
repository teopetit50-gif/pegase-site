-- Extraits du socle Omega (recette ygwbgpowzlbdaajlsqkn, 5 octobre 2026),
-- recopiés tels quels par le coordinateur pour la session A4.
-- Ce fichier est une PHOTOGRAPHIE : on ne l'exécute pas, on s'en sert pour
-- écrire les « create or replace » et les branchements.
--
-- Sommaire
--   1. Validation du socle : preparer_demande, appliquer_decision,
--      garder_demande, exiger_decideur, preparer_approbation, publier_decision
--   2. FILED : filed_deposer_demande, filed_executer_decision
--   3. FILED : filed_traiter
--   4. FILED : filed_rapprocher_ligne
--   5. FILED : filed_controler_facture
--   6. Signatures utiles, colonnes, contraintes, motifs

-- ═══════════════════════════════════════════════════════════════════════
-- 1. VALIDATION DU SOCLE
-- ═══════════════════════════════════════════════════════════════════════

-- Trigger BEFORE INSERT sur public.demandes_validation.
-- Choisit la règle (regles_validation) : type_action exact > type_action nul,
-- entité exacte > nulle, montant_min le plus haut, puis approbations_requises
-- le plus haut. Sans règle : 1 approbation, rôles gerant/admin/valideur.
-- Une politique couvrante (accord permanent) approuve d'office (statut
-- 'approuvee', approbations_requises 0, politique_id posé).
CREATE OR REPLACE FUNCTION private.preparer_demande()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  v_regle public.regles_validation;
  v_uid uuid := (select auth.uid());
  v_politique uuid;
begin
  new.statut := 'en_attente';
  new.cree_le := now();
  new.decide_le := null;
  new.execute_le := null;
  new.motif_echec := null;
  new.politique_id := null;
  if v_uid is not null then
    new.demandeur_type := 'utilisateur';
    new.demandeur_id := v_uid;
  else
    new.demandeur_type := 'systeme';
    new.demandeur_id := null;
  end if;

  select r.* into v_regle
  from public.regles_validation r
  where r.client_id = new.client_id
    and r.module = new.module
    and r.actif
    and ((r.type_action is null and new.type_action <> 'politique.activer') or r.type_action = new.type_action)
    and (r.entite_id is null or r.entite_id = new.entite_id)
    and coalesce(new.montant, 0) >= r.montant_min
    and (r.montant_max is null or coalesce(new.montant, 0) < r.montant_max)
  order by (r.type_action is not null) desc, (r.entite_id is not null) desc,
           r.montant_min desc, r.approbations_requises desc
  limit 1;

  if found then
    new.regle_id := v_regle.id;
    new.approbations_requises := v_regle.approbations_requises;
    new.roles_autorises := v_regle.roles_autorises;
    new.equipe_id := v_regle.equipe_id;
  else
    new.regle_id := null;
    new.approbations_requises := 1;
    new.roles_autorises := case when new.type_action = 'politique.activer'
                                then array['gerant'] else array['gerant', 'admin', 'valideur'] end;
    new.equipe_id := null;
  end if;

  v_politique := private.politique_couvrante(new.client_id, new.module, new.type_action, new.entite_id,
                                             new.montant, now());
  if v_politique is not null then
    new.statut := 'approuvee';
    new.decide_le := now();
    new.politique_id := v_politique;
    new.approbations_requises := 0;
  end if;
  return new;
end $function$;

-- Trigger AFTER INSERT sur public.approbations (approbations_appliquer).
-- Un seul rejet rejette. Les approbations sont comptées par ligne ; la
-- contrainte UNIQUE (demande_id, user_id) garantit un décideur distinct par
-- ligne (au_nom_de compte comme une ligne du délégataire).
CREATE OR REPLACE FUNCTION private.appliquer_decision()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare v_requises smallint; v_oui int; v_non int;
begin
  select d.approbations_requises into v_requises from public.demandes_validation d where d.id = new.demande_id;
  select count(*) filter (where a.decision = 'approuve'), count(*) filter (where a.decision = 'rejete') into v_oui, v_non
  from public.approbations a where a.demande_id = new.demande_id;
  if v_non > 0 then
    update public.demandes_validation set statut = 'rejetee' where id = new.demande_id and statut = 'en_attente';
  elsif v_oui >= v_requises then
    update public.demandes_validation set statut = 'approuvee' where id = new.demande_id and statut = 'en_attente';
  end if;
  return null;
end $function$;

-- Trigger BEFORE UPDATE sur public.demandes_validation (demandes_validation_garder).
-- Une demande ne se modifie pas : seul le statut avance, et seulement selon
-- ces passages. Un utilisateur connecté ne peut qu'annuler sa propre demande
-- en attente. PAS de « remplacement » ni de « niveau » dans le socle : pour
-- faire remonter d'un niveau, on annule (ou laisse expirer) et on dépose une
-- nouvelle demande avec une autre clé d'idempotence.
CREATE OR REPLACE FUNCTION private.garder_demande()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
begin
  if (new.id, new.client_id, new.entite_id, new.module, new.type_action, new.objet_type, new.objet_id,
      new.resume, new.montant, new.devise, new.payload, new.demandeur_type, new.demandeur_id,
      new.approbations_requises, new.roles_autorises, new.equipe_id, new.politique_id, new.echeance,
      new.cle_idempotence, new.cree_le)
     is distinct from
     (old.id, old.client_id, old.entite_id, old.module, old.type_action, old.objet_type, old.objet_id,
      old.resume, old.montant, old.devise, old.payload, old.demandeur_type, old.demandeur_id,
      old.approbations_requises, old.roles_autorises, old.equipe_id, old.politique_id, old.echeance,
      old.cle_idempotence, old.cree_le)
  then
    raise exception 'Une demande de validation ne se modifie pas après sa création : seul son statut avance.'
      using errcode = '42501';
  end if;

  if new.statut is distinct from old.statut then
    if current_user = 'authenticated' then
      if not (old.statut = 'en_attente' and new.statut = 'annulee'
              and old.demandeur_id = (select auth.uid())) then
        raise exception 'Seul le demandeur annule une demande en attente ; le reste passe par les décisions.'
          using errcode = '42501';
      end if;
    elsif not (
         (old.statut = 'en_attente' and new.statut in ('approuvee', 'rejetee', 'expiree', 'annulee'))
      or (old.statut = 'approuvee' and new.statut in ('executee', 'echec_execution'))
      or (old.statut = 'echec_execution' and new.statut in ('executee', 'echec_execution'))
    ) then
      raise exception 'Passage de statut refusé : % vers %.', old.statut, new.statut using errcode = '23514';
    end if;

    if new.statut = 'approuvee' and (
      select count(*) from public.approbations a
      where a.demande_id = new.id and a.decision = 'approuve') < new.approbations_requises
    then
      raise exception 'Approbations insuffisantes : une demande n''est approuvée que par des personnes.'
        using errcode = '23514';
    end if;
    if new.statut = 'rejetee' and not exists (
      select 1 from public.approbations a where a.demande_id = new.id and a.decision = 'rejete')
    then
      raise exception 'Un rejet vient toujours d''une personne.' using errcode = '23514';
    end if;

    if new.statut in ('approuvee', 'rejetee', 'expiree', 'annulee') then
      new.decide_le := coalesce(new.decide_le, now());
    end if;
    if new.statut = 'executee' then
      new.execute_le := coalesce(new.execute_le, now());
    end if;
  end if;
  return new;
end $function$;

-- Qui a le droit de décider : rôle dans roles_autorises, périmètre, équipe, objet visible.
CREATE OR REPLACE FUNCTION private.exiger_decideur(p_d demandes_validation, p_decideur uuid)
 RETURNS void
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  v_role text;
  v_equipe text;
begin
  select c.role into v_role from public.comptes c
  where c.user_id = p_decideur and c.client_id = p_d.client_id;
  if v_role is null or not (v_role = any (p_d.roles_autorises)) then
    raise exception 'Ce rôle ne peut pas décider de cette demande.' using errcode = '42501';
  end if;
  if not private.perimetre_couvre(p_decideur, p_d.client_id, p_d.entite_id) then
    raise exception 'Cette demande est hors de votre périmètre.' using errcode = '42501';
  end if;
  if p_d.equipe_id is not null and not private.dans_equipe(p_decideur, p_d.equipe_id) then
    select e.nom into v_equipe from public.equipes e where e.id = p_d.equipe_id;
    raise exception 'Cette demande revient à l''équipe « % ».', coalesce(v_equipe, '?') using errcode = '42501';
  end if;
  if not private.voit_objet_pour(p_decideur, p_d.client_id, p_d.objet_type, p_d.objet_id) then
    raise exception 'Vous n''avez pas accès à l''objet de cette demande.' using errcode = '42501';
  end if;
end $function$;

-- Trigger BEFORE INSERT sur public.approbations (approbations_preparer).
-- Une décision = INSERT dans approbations par une personne connectée
-- (auth.uid()). Le demandeur est refusé comme décideur. au_nom_de exige une
-- délégation en cours (delegations.delegant = au_nom_de, delegataire = uid,
-- non révoquée, debut <= now < fin, entité et module compatibles).
CREATE OR REPLACE FUNCTION private.preparer_approbation()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  v_d public.demandes_validation;
  v_uid uuid := (select auth.uid());
  v_decideur uuid;
  v_delegation uuid;
begin
  if v_uid is null then
    raise exception 'Une décision est toujours prise par une personne connectée.' using errcode = '42501';
  end if;

  select * into v_d from public.demandes_validation where id = new.demande_id for update;
  if not found then
    raise exception 'Demande introuvable.' using errcode = 'P0002';
  end if;
  if v_d.statut <> 'en_attente' then
    raise exception 'Cette demande n''est plus en attente (%).', v_d.statut using errcode = '23514';
  end if;
  if v_d.echeance is not null and v_d.echeance <= now() then
    raise exception 'L''échéance de cette demande est passée.' using errcode = '23514';
  end if;

  new.user_id := v_uid;
  new.client_id := v_d.client_id;
  new.decide_le := now();
  v_decideur := coalesce(new.au_nom_de, v_uid);

  if new.au_nom_de is not null then
    select dl.id into v_delegation
    from public.delegations dl
    where dl.client_id = v_d.client_id
      and dl.delegant = new.au_nom_de
      and dl.delegataire = v_uid
      and dl.revoquee_le is null
      and now() >= dl.debut and now() < dl.fin
      and (dl.entite_id is null or dl.entite_id is not distinct from v_d.entite_id)
      and (dl.module is null or dl.module = v_d.module)
    order by dl.fin desc
    limit 1;
    if v_delegation is null then
      raise exception 'Aucune délégation en cours ne vous permet de décider au nom de cette personne.'
        using errcode = '42501';
    end if;
    new.delegation_id := v_delegation;
  else
    new.delegation_id := null;
  end if;

  if v_d.demandeur_id is not null and (v_uid = v_d.demandeur_id or v_decideur = v_d.demandeur_id) then
    raise exception 'Le demandeur ne décide pas de sa propre demande.' using errcode = '42501';
  end if;

  perform private.exiger_decideur(v_d, v_decideur);
  if not private.voit_objet_pour(v_uid, v_d.client_id, v_d.objet_type, v_d.objet_id) then
    raise exception 'Vous n''avez pas accès à l''objet de cette demande.' using errcode = '42501';
  end if;
  return new;
end $function$;

-- Trigger AFTER INSERT OR UPDATE OF statut sur demandes_validation
-- (demandes_validation_publier_decision) : publie demande.decidee.<module>
-- → l'abonnement (filed, 'demande.decidee.filed') dépose un travail
-- filed.decision avec cette charge, que filed_traiter remet à
-- filed_executer_decision(charge).
CREATE OR REPLACE FUNCTION private.publier_decision()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
begin
  if new.type_action = 'politique.activer' then
    return null;
  end if;
  if (tg_op = 'INSERT' and new.statut = 'approuvee')
     or (tg_op = 'UPDATE' and old.statut = 'en_attente' and new.statut in ('approuvee', 'rejetee', 'expiree')) then
    perform private.publier_evenement(new.client_id, 'demande.decidee.' || new.module,
      jsonb_build_object(
        'demande', new.id, 'statut', new.statut, 'type_action', new.type_action,
        'objet_type', new.objet_type, 'objet_id', new.objet_id, 'entite', new.entite_id,
        'politique', new.politique_id, 'decide_le', new.decide_le,
        'decideurs', (select coalesce(jsonb_agg(jsonb_build_object('user', a.user_id, 'au_nom_de', a.au_nom_de,
                                                                   'decision', a.decision) order by a.decide_le), '[]'::jsonb)
                      from public.approbations a where a.demande_id = new.id)),
      new.id::text || ':' || new.statut);
  end if;
  return null;
end $function$;

-- ═══════════════════════════════════════════════════════════════════════
-- 2. FILED : dépôt d'une demande, exécution d'une décision
-- ═══════════════════════════════════════════════════════════════════════

-- Appelée aujourd'hui par filed_creer_fournisseur, filed_proposer_iban et
-- filed_executer_decision. PERSONNE ne dépose 'filed.valider_facture' à ce
-- jour : c'est à A4 de le faire (depuis filed_controler_facture quand le
-- statut calculé est 'a_valider', clé 'filed:facture:<id>:v<version>').
CREATE OR REPLACE FUNCTION private.filed_deposer_demande(p_client uuid, p_entite uuid, p_type text, p_objet_type text, p_objet_id text, p_resume text, p_montant numeric, p_payload jsonb, p_cle text)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare v_id uuid;
begin
  insert into public.demandes_validation (client_id, entite_id, module, type_action, objet_type, objet_id, resume,
                                          montant, payload, cle_idempotence)
  values (p_client, p_entite, 'filed', p_type, p_objet_type, p_objet_id, left(p_resume, 500), p_montant,
          coalesce(p_payload, '{}'::jsonb), p_cle)
  on conflict (client_id, cle_idempotence) do nothing
  returning id into v_id;
  if v_id is null then
    select d.id into v_id from public.demandes_validation d where d.client_id = p_client and d.cle_idempotence = p_cle;
  end if;
  return v_id;
end $function$;

-- Branches existantes : filed.valider_fournisseur, filed.valider_iban.
-- Aucun bloc 'filed.valider_facture' aujourd'hui : il rend 'type_inconnu'.
CREATE OR REPLACE FUNCTION private.filed_executer_decision(p_charge jsonb)
 RETURNS text
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  v_d public.demandes_validation;
  v_decideur uuid;
  v_commentaire text;
  v_four public.filed_fournisseurs;
  v_ib public.filed_fournisseurs_ibans;
  r record;
begin
  if coalesce(p_charge ->> 'demande', '') !~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' then
    return 'sans_demande';
  end if;
  select * into v_d from public.demandes_validation where id = (p_charge ->> 'demande')::uuid for update;
  if not found then
    return 'demande_effacee';
  end if;
  if v_d.module <> 'filed' then
    return 'autre_module';
  end if;
  if v_d.statut not in ('approuvee', 'rejetee', 'expiree') then
    return 'deja_traitee';
  end if;
  select a.user_id, a.commentaire into v_decideur, v_commentaire from public.approbations a
  where a.demande_id = v_d.id order by a.decide_le desc limit 1;

  if v_d.type_action = 'filed.valider_fournisseur' then
    select * into v_four from public.filed_fournisseurs
    where client_id = v_d.client_id and id::text = v_d.objet_id for update;
    if not found then
      return 'fournisseur_efface';
    end if;
    if v_d.statut = 'approuvee' and v_d.politique_id is not null then
      -- Ne doit jamais arriver (actions_sans_accord) : la base le refuse encore ici.
      update public.demandes_validation set statut = 'echec_execution',
             motif_echec = 'Un fournisseur nouveau n''est jamais validé d''office par un accord permanent.' where id = v_d.id;
      return 'refuse_accord';
    end if;
    if v_d.statut = 'approuvee' then
      if v_four.statut = 'a_confirmer' then
        update public.filed_fournisseurs set statut = 'actif', confirme_le = now(), confirme_par = v_decideur, maj_le = now()
        where id = v_four.id;
        -- L'IBAN que la personne a vu dans la demande se valide avec le fournisseur.
        update public.filed_fournisseurs_ibans set statut = 'valide', decide_le = now(), decide_par = v_decideur
        where fournisseur_id = v_four.id and statut = 'propose'
          and empreinte = v_d.payload ->> 'iban_empreinte';
        -- Un autre IBAN proposé entre-temps part, lui, à la file.
        for r in select i.id, i.iban_masque from public.filed_fournisseurs_ibans i
                 where i.fournisseur_id = v_four.id and i.statut = 'propose'
        loop
          perform private.filed_deposer_demande(v_four.client_id, null, 'filed.valider_iban', 'filed_iban', r.id::text,
            format('Nouvel IBAN pour %s : %s', private.filed_libelle_fournisseur(v_four), r.iban_masque), null,
            jsonb_build_object('fournisseur', v_four.id, 'iban', r.iban_masque), 'filed:iban:' || r.id::text);
        end loop;
        perform private.filed_historiser(v_four.client_id, null, 'filed_fournisseur', v_four.id::text, 'confirme',
          'Fournisseur confirmé par une personne.', jsonb_build_object('demande', v_d.id, 'par', v_decideur));
      end if;
      update public.demandes_validation set statut = 'executee' where id = v_d.id;
      perform private.filed_recontroler_fournisseur(v_four.id);
      return 'fournisseur_confirme';
    elsif v_d.statut = 'rejetee' then
      update public.filed_fournisseurs set statut = 'refuse', motif = left(coalesce(v_commentaire, 'Refusé par une personne.'), 500),
             confirme_le = now(), confirme_par = v_decideur, maj_le = now()
      where id = v_four.id;
      update public.filed_fournisseurs_ibans set statut = 'refuse', decide_le = now(), decide_par = v_decideur,
             motif = 'Refusé avec le fournisseur.'
      where fournisseur_id = v_four.id and statut = 'propose';
      perform private.lever_alerte_module(v_four.client_id, 'filed', 'critique',
        left(format('Fournisseur refusé : %s. Ses factures restent bloquées.', v_four.nom), 200),
        jsonb_build_object('fournisseur', v_four.id, 'demande', v_d.id), 'fournisseur_refuse:' || v_four.id::text, true, null);
      perform private.filed_historiser(v_four.client_id, null, 'filed_fournisseur', v_four.id::text, 'refuse',
        'Fournisseur refusé par une personne' || coalesce(' : ' || v_commentaire, '.'), jsonb_build_object('demande', v_d.id));
      perform private.filed_recontroler_fournisseur(v_four.id);
      return 'fournisseur_refuse';
    end if;
    return 'expiree';
  end if;

  if v_d.type_action = 'filed.valider_iban' then
    select * into v_ib from public.filed_fournisseurs_ibans
    where client_id = v_d.client_id and id::text = v_d.objet_id for update;
    if not found then
      return 'iban_efface';
    end if;
    if v_d.statut = 'approuvee' and v_d.politique_id is not null then
      update public.demandes_validation set statut = 'echec_execution',
             motif_echec = 'Un IBAN nouveau n''est jamais validé d''office par un accord permanent.' where id = v_d.id;
      return 'refuse_accord';
    end if;
    if v_d.statut = 'approuvee' then
      if v_ib.statut = 'propose' then
        update public.filed_fournisseurs_ibans set statut = 'valide', decide_le = now(), decide_par = v_decideur
        where id = v_ib.id;
        perform private.filed_historiser(v_ib.client_id, null, 'filed_fournisseur', v_ib.fournisseur_id::text, 'iban_valide',
          format('IBAN %s validé par une personne.', v_ib.iban_masque), jsonb_build_object('demande', v_d.id, 'par', v_decideur));
      end if;
      update public.demandes_validation set statut = 'executee' where id = v_d.id;
      perform private.filed_recontroler_fournisseur(v_ib.fournisseur_id);
      return 'iban_valide';
    elsif v_d.statut = 'rejetee' then
      update public.filed_fournisseurs_ibans set statut = 'refuse', decide_le = now(), decide_par = v_decideur,
             motif = left(coalesce(v_commentaire, 'Refusé par une personne.'), 500)
      where id = v_ib.id;
      select * into v_four from public.filed_fournisseurs where id = v_ib.fournisseur_id;
      perform private.lever_alerte_module(v_ib.client_id, 'filed', 'critique',
        left(format('Changement d''IBAN refusé pour %s : tentative de fraude possible.', v_four.nom), 200),
        jsonb_build_object('fournisseur', v_four.id, 'iban', v_ib.iban_masque, 'demande', v_d.id),
        'iban_refuse:' || v_ib.id::text, true, null);
      perform private.filed_historiser(v_ib.client_id, null, 'filed_fournisseur', v_ib.fournisseur_id::text, 'iban_refuse',
        format('IBAN %s refusé par une personne', v_ib.iban_masque) || coalesce(' : ' || v_commentaire, '.'),
        jsonb_build_object('demande', v_d.id));
      perform private.filed_recontroler_fournisseur(v_ib.fournisseur_id);
      return 'iban_refuse';
    end if;
    return 'expiree';
  end if;

  return 'type_inconnu';
end $function$;

-- ═══════════════════════════════════════════════════════════════════════
-- 3. FILED : le passage du moteur (toutes les minutes par pg_cron)
-- ═══════════════════════════════════════════════════════════════════════
CREATE OR REPLACE FUNCTION private.filed_traiter(p_nombre integer DEFAULT 200)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  t public.travaux;
  r record;
  v_issue text;
  v_err text;
  n_faits integer := 0;
  n_decisions integer := 0;
  n_ignores integer := 0;
  n_rendus integer := 0;
  n_balayes integer := 0;
  n_battements integer := 0;
begin
  perform set_config('omega.module', 'filed', true);

  for t in select * from private.prendre_travaux(array['filed.integrer', 'filed.decision'],
                                                  greatest(1, least(coalesce(p_nombre, 200), 500)),
                                                  interval '5 minutes', 'filed')
  loop
    begin
      if t.genre = 'filed.decision' then
        v_issue := private.filed_executer_decision(t.charge);
        perform private.finir_travail(t.id, jsonb_build_object('issue', v_issue));
        n_decisions := n_decisions + 1;
      elsif coalesce(t.charge ->> 'module', 'filed') <> 'filed' then
        perform private.finir_travail(t.id, jsonb_build_object('ignore', 'pièce d''un autre module'));
        n_ignores := n_ignores + 1;
      elsif coalesce(t.charge ->> 'piece', '') !~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' then
        perform private.finir_travail(t.id, jsonb_build_object('ignore', 'travail sans pièce'));
        n_ignores := n_ignores + 1;
      else
        v_issue := private.filed_integrer_piece((t.charge ->> 'piece')::uuid);
        perform private.finir_travail(t.id, jsonb_build_object('issue', v_issue));
        n_faits := n_faits + 1;
      end if;
    exception when others then
      get stacked diagnostics v_err = message_text;
      begin
        perform private.echouer_travail(t.id, 'FILED : ' || v_err);
      exception when others then
        raise warning 'FILED : travail % non rendu (%)', t.id, sqlerrm;
      end;
      n_rendus := n_rendus + 1;
    end;
  end loop;

  -- Les pièces au bout de leur lecture que l'événement n'a pas apportées, et
  -- les factures et avoirs reçus avant le moteur des factures.
  for r in
    select d.piece_id from public.filed_documents d join public.pieces p on p.id = d.piece_id
    where (d.etat = 'en_lecture' and p.statut in ('lue', 'a_verifier', 'a_classer', 'rejetee', 'echec'))
       or (d.etat = 'a_traiter' and d.nature in ('facture', 'avoir')
           and not exists (select 1 from public.filed_factures f where f.document_id = d.id))
       or (d.etat = 'a_traiter' and d.nature = 'bon_commande'
           and not exists (select 1 from public.filed_commandes c where c.document_id = d.id))
       or (d.etat = 'a_traiter' and d.nature = 'bon_livraison'
           and not exists (select 1 from public.filed_receptions rc where rc.document_id = d.id))
    order by d.recu_le
    limit 500
  loop
    begin
      perform private.filed_integrer_piece(r.piece_id);
      n_balayes := n_balayes + 1;
    exception when others then
      raise warning 'FILED : pièce % non intégrée (%)', r.piece_id, sqlerrm;
    end;
  end loop;

  -- La preuve de vie de chaque moteur, par organisation, toutes les cinq minutes au plus.
  for r in
    select g.client_id, m.moteur from public.filed_reglages g
    cross join (values ('filed_reception'), ('filed_factures')) as m(moteur)
    left join public.battements b on b.client_id = g.client_id and b.module = m.moteur
    where g.entite_id is null and g.actif and (b.dernier_le is null or b.dernier_le < now() - interval '5 minutes')
  loop
    perform private.battre(r.client_id, r.moteur, jsonb_build_object('source', 'omega-filed'), null);
    n_battements := n_battements + 1;
  end loop;

  return jsonb_build_object('travaux', n_faits, 'decisions', n_decisions, 'ignores', n_ignores, 'rendus', n_rendus,
                            'balayes', n_balayes, 'battements', n_battements);
end $function$;

-- ═══════════════════════════════════════════════════════════════════════
-- 4. FILED : rapprochement d'une ligne de facture avec une ligne commandée
-- ═══════════════════════════════════════════════════════════════════════
-- Repères pour A4 (contrôle 'info' des écarts absorbés) : le « perform » du
-- prix est celui qui commence par
--   perform private.filed_poser_resultat(p_f, 'rapprochement.prix',
-- sous « if not v_prix_ok then » ; celui de la quantité commence par
--   perform private.filed_poser_resultat(p_f, 'rapprochement.quantite',
-- sous « elsif not v_qte_ok then ». Un écart dans la tolérance n'écrit RIEN
-- aujourd'hui (v_prix_ok / v_qte_ok vrais) : le contrôle 'info' se pose
-- dans un « else » ou juste après le bloc « if p_sens = 1 then … end if; ».
CREATE OR REPLACE FUNCTION private.filed_rapprocher_ligne(p_f filed_factures, p_l filed_factures_lignes, p_c filed_commandes_lignes, p_methode text, p_sens smallint, p_reglage filed_reglages, p_a_reception boolean)
 RETURNS filed_rapprochements_lignes
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  v_qte numeric := coalesce(p_l.quantite, 1);
  v_prix_f numeric;
  v_prix_c numeric := p_c.prix_unitaire;
  v_deja numeric;
  v_recu numeric;
  v_restant numeric;
  v_ecart_pu numeric;
  v_ecart_prix numeric := 0;
  v_ecart_qte numeric := 0;
  v_ecart_qte_montant numeric := 0;
  v_non_recu numeric := 0;
  v_non_recu_montant numeric := 0;
  v_prix_ok boolean := true;
  v_qte_ok boolean := true;
  v_resultat text := 'ok';
  v_libelle text;
  v_autres jsonb;
  v_x public.filed_rapprochements_lignes;
  v_preuve jsonb;
begin
  v_prix_f := coalesce(p_l.prix_unitaire, case when coalesce(p_l.quantite, 0) <> 0 then p_l.montant_ht / p_l.quantite end);
  select coalesce(sum(x.sens * x.quantite), 0), coalesce(jsonb_agg(distinct f2.numero) filter (where f2.numero is not null), '[]'::jsonb)
    into v_deja, v_autres
  from public.filed_rapprochements_lignes x join public.filed_factures f2 on f2.id = x.facture_id
  where x.commande_ligne_id = p_c.id and x.facture_id <> p_f.id and f2.statut <> 'ecartee';
  select coalesce(sum(q.quantite), 0) into v_recu
  from public.filed_receptions_lignes q join public.filed_receptions rc on rc.id = q.reception_id
  where q.commande_ligne_id = p_c.id and rc.statut = 'enregistree';
  v_restant := p_c.quantite - v_deja;
  v_libelle := format('ligne %s (%s)', p_l.rang, coalesce(left(p_l.designation, 60), p_l.reference_vendeur, p_l.numero, '?'));

  if p_sens = 1 then
    if v_prix_f is not null and v_prix_c is not null then
      v_ecart_pu := v_prix_f - v_prix_c;
      v_ecart_prix := round(v_ecart_pu * v_qte, 2);
      v_prix_ok := abs(v_ecart_pu) <= v_prix_c * coalesce(p_reglage.ecart_prix_pct, 0) / 100 + 0.0000005
                   or abs(v_ecart_prix) <= coalesce(p_reglage.ecart_prix_montant, 0.05);
    end if;
    v_ecart_qte := v_qte - v_restant;
    v_qte_ok := v_ecart_qte <= p_c.quantite * coalesce(p_reglage.ecart_quantite_pct, 0) / 100 + 0.0000005;
    v_ecart_qte_montant := round(greatest(v_ecart_qte, 0) * coalesce(v_prix_c, v_prix_f, 0), 2);
    if p_a_reception or coalesce(p_reglage.reception_exigee, false) then
      v_non_recu := greatest(v_deja + v_qte - v_recu, 0);
      v_non_recu_montant := round(v_non_recu * coalesce(v_prix_c, v_prix_f, 0), 2);
    end if;
    v_resultat := case when v_restant <= 0.0000005 then 'deja_facture'
                       when not v_qte_ok then 'ecart_quantite'
                       when not v_prix_ok then 'ecart_prix'
                       when v_non_recu > 0.0000005 then 'non_recu'
                       else 'ok' end;
  else
    -- Un avoir rend de la quantité : pas plus que ce qui a été facturé.
    v_ecart_qte := v_qte - greatest(v_deja, 0);
    v_resultat := case when v_ecart_qte > 0.0000005 then 'avoir_trop' else 'ok' end;
  end if;

  insert into public.filed_rapprochements_lignes (
    client_id, facture_id, document_id, facture_ligne_id, commande_ligne_id, methode, sens, quantite, prix_facture,
    prix_commande, ecart_prix_unitaire, ecart_prix, quantite_commandee, deja_facture, quantite_recue, ecart_quantite,
    ecart_quantite_montant, non_recu, non_recu_montant, resultat)
  values (p_f.client_id, p_f.id, p_f.document_id, p_l.id, p_c.id, p_methode, p_sens, v_qte, v_prix_f, v_prix_c, v_ecart_pu,
          v_ecart_prix, p_c.quantite, v_deja, v_recu, v_ecart_qte, v_ecart_qte_montant, v_non_recu, v_non_recu_montant,
          v_resultat)
  returning * into v_x;

  -- Les contrôles de la ligne, chacun avec sa preuve ; la clé est la ligne commandée.
  v_preuve := jsonb_build_object('facture_ligne', p_l.id, 'commande_ligne', p_c.id, 'rang', p_l.rang, 'quantite', v_qte,
                                 'commande', p_c.quantite, 'deja_facture', v_deja, 'recu', v_recu, 'prix_facture', v_prix_f,
                                 'prix_commande', v_prix_c, 'autres_factures', v_autres, 'methode', p_methode);
  if p_sens = 1 then
    if v_resultat = 'deja_facture' then
      perform private.filed_poser_resultat(p_f, 'rapprochement.deja_facture', 'bloquant', true,
        format('%s : déjà facturée en totalité (%s sur %s commandé(s)%s).', v_libelle, private.filed_quantite_texte(v_deja),
               private.filed_quantite_texte(p_c.quantite),
               case when v_autres <> '[]'::jsonb then ', par ' || (select string_agg(x, ', ') from jsonb_array_elements_text(v_autres) x) else '' end),
        'DOUBLON', v_preuve, p_c.id::text);
    elsif not v_qte_ok then
      perform private.filed_poser_resultat(p_f, 'rapprochement.quantite', 'bloquant', true,
        format('%s : %s facturé(s) pour %s restant à facturer (%s commandé(s), %s déjà facturé(s)) : %s de trop, soit %s.',
               v_libelle, private.filed_quantite_texte(v_qte), private.filed_quantite_texte(v_restant),
               private.filed_quantite_texte(p_c.quantite), private.filed_quantite_texte(v_deja),
               private.filed_quantite_texte(v_ecart_qte), private.filed_montant_texte(v_ecart_qte_montant)),
        'QTE_ERR', v_preuve || jsonb_build_object('ecart', v_ecart_qte, 'ecart_montant', v_ecart_qte_montant), p_c.id::text);
    end if;
    if not v_prix_ok then
      perform private.filed_poser_resultat(p_f, 'rapprochement.prix', case when v_ecart_pu > 0 then 'bloquant' else 'attention' end, true,
        format('%s : prix facturé %s au lieu de %s commandé, soit %s %s sur la ligne.', v_libelle,
               private.filed_montant_texte(v_prix_f), private.filed_montant_texte(v_prix_c),
               private.filed_montant_texte(abs(v_ecart_prix)), case when v_ecart_pu > 0 then 'de trop' else 'de moins' end),
        'PU_ERR', v_preuve || jsonb_build_object('ecart_unitaire', v_ecart_pu, 'ecart', v_ecart_prix), p_c.id::text);
    end if;
    if v_non_recu > 0.0000005 then
      perform private.filed_poser_resultat(p_f, 'rapprochement.reception',
        case when coalesce(p_reglage.reception_exigee, false) then 'bloquant' else 'attention' end, true,
        format('%s : %s facturé(s) au total pour %s reçu(s) : %s non reçu(s), soit %s.', v_libelle,
               private.filed_quantite_texte(v_deja + v_qte), private.filed_quantite_texte(v_recu),
               private.filed_quantite_texte(v_non_recu), private.filed_montant_texte(v_non_recu_montant)),
        'LIVR_INCOMP', v_preuve || jsonb_build_object('non_recu', v_non_recu, 'non_recu_montant', v_non_recu_montant), p_c.id::text);
    end if;
  elsif v_resultat = 'avoir_trop' then
    perform private.filed_poser_resultat(p_f, 'avoir.quantite', 'attention', true,
      format('%s : l''avoir rend %s alors que %s seulement ont été facturé(s) sur cette ligne commandée.', v_libelle,
             private.filed_quantite_texte(v_qte), private.filed_quantite_texte(greatest(v_deja, 0))),
      'MONTANT_ERR', v_preuve, p_c.id::text);
  end if;
  return v_x;
end $function$;

-- ═══════════════════════════════════════════════════════════════════════
-- 5. FILED : le contrôle d'une facture
-- ═══════════════════════════════════════════════════════════════════════
-- Repères pour A4 :
--   (a) le rapprochement :      perform private.filed_rapprocher_facture(v_f.id);
--   (b) le commentaire qui précède le calcul de l'état :   -- ── L'état ──
--   (c) le statut est calculé dans « v_statut := case … end; » puis écrit par
--       le « update public.filed_factures set statut = v_statut … » final.
--       C'est là (après l'update) que se dépose la demande
--       'filed.valider_facture' quand v_statut = 'a_valider'.
CREATE OR REPLACE FUNCTION private.filed_controler_facture(p_facture uuid)
 RETURNS text
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  v_f public.filed_factures;
  v_doc public.filed_documents;
  v_four public.filed_fournisseurs;
  v_ent public.entites;
  v_reglage public.filed_reglages;
  v_regime_ter text;
  v_regime text;
  v_manque text[] := '{}';
  v_tol numeric;
  v_ecart numeric;
  v_somme numeric;
  v_nb_lignes integer;
  v_autre public.filed_factures;
  v_autre_ref text;
  v_ecartee uuid;
  v_ib public.filed_fournisseurs_ibans;
  v_autre_four public.filed_fournisseurs;
  v_pays_iban text;
  v_taux_ok numeric[];
  v_taux_fr numeric[];
  v_taux numeric;
  v_taux_trouve numeric;
  v_hors text[];
  v_tol_taux numeric;
  v_ach_siren text;
  v_ent_siren text;
  v_autre_ent public.entites;
  v_auj date;
  v_statut text;
  v_anomalies text[];
  v_bloquants integer;
  v_attention integer;
  v_lecture boolean;
  v_message text;
begin
  select * into v_f from public.filed_factures where id = p_facture for update;
  if not found then
    raise exception 'Facture introuvable.' using errcode = 'P0002';
  end if;
  select * into v_doc from public.filed_documents where id = v_f.document_id;
  select * into v_four from public.filed_fournisseurs where id = v_f.fournisseur_id;
  select * into v_ent from public.entites where id = v_f.entite_id;
  v_reglage := private.filed_reglage(v_f.client_id, v_f.entite_id);
  v_tol := coalesce(v_reglage.tolerance_totaux, 0.05);
  v_auj := (now() at time zone coalesce(v_ent.fuseau, 'Europe/Paris'))::date;
  select count(*) into v_nb_lignes from public.filed_factures_lignes l where l.facture_id = v_f.id;

  delete from public.filed_controles where facture_id = v_f.id;

  -- ── La lecture : ce qui manque, ce qui reste à vérifier ──
  if v_f.numero is null then v_manque := array_append(v_manque, 'le numéro'); end if;
  if v_f.date_emission is null then v_manque := array_append(v_manque, 'la date d''émission'); end if;
  if v_f.montant_ttc is null then v_manque := array_append(v_manque, 'le total TTC'); end if;
  if v_f.montant_ht is null or v_f.montant_tva is null then v_manque := array_append(v_manque, 'le HT et la TVA'); end if;
  if v_f.fournisseur_id is null then v_manque := array_append(v_manque, 'le fournisseur'); end if;
  perform private.filed_poser_resultat(v_f, 'lecture.complete', 'bloquant', cardinality(v_manque) > 0,
    case when cardinality(v_manque) = 0 then 'Les champs essentiels sont lus.'
         else 'À compléter : ' || array_to_string(v_manque, ', ') || '.' end,
    'NON_CONFORME', jsonb_build_object('manque', to_jsonb(v_manque)));
  perform private.filed_poser_resultat(v_f, 'lecture.verifiee', 'bloquant', jsonb_array_length(v_f.champs_douteux) > 0,
    case when jsonb_array_length(v_f.champs_douteux) = 0 then 'Chaque valeur retenue est vérifiée sur la pièce.'
         else 'À vérifier sur la pièce : ' || (select string_agg(x ->> 'champ' || coalesce(' (' || (x ->> 'controle') || ')', ''), ', ')
                                                from jsonb_array_elements(v_f.champs_douteux) x) || '.' end,
    null, jsonb_build_object('champs', v_f.champs_douteux));

  -- ── Les montants ──
  if v_f.montant_ttc is not null then
    perform private.filed_poser_resultat(v_f, 'montant.nul', 'bloquant', v_f.montant_ttc = 0,
      case when v_f.montant_ttc = 0 then 'Total à zéro : une lecture ratée, le plus souvent. La pièce attend une personne.'
           else 'Le total n''est pas nul.' end, 'MONTANTTOTAL_ERR');
    perform private.filed_poser_resultat(v_f, 'montant.signe', 'bloquant', v_f.nature = 'facture' and v_f.montant_ttc < 0,
      case when v_f.nature = 'facture' and v_f.montant_ttc < 0
           then 'Total négatif sur une facture : c''est peut-être un avoir.' else 'Le signe du total est cohérent.' end,
      'MONTANTTOTAL_ERR', '{}'::jsonb, v_f.montant_ttc::text);
  end if;
  if v_f.montant_ht is not null and v_f.montant_tva is not null and v_f.montant_ttc is not null then
    v_ecart := v_f.montant_ht + v_f.montant_tva - v_f.montant_ttc;
    perform private.filed_poser_resultat(v_f, 'montant.coherence', 'bloquant', abs(v_ecart) > v_tol,
      case when abs(v_ecart) > v_tol
           then format('HT + TVA − TTC = %s : l''écart dépasse la tolérance de %s. La pièce attend une personne.',
                       private.filed_montant_texte(v_ecart), private.filed_montant_texte(v_tol))
           else 'HT + TVA = TTC.' end,
      'CALCUL_ERR', jsonb_build_object('ht', v_f.montant_ht, 'tva', v_f.montant_tva, 'ttc', v_f.montant_ttc,
                                       'ecart', v_ecart, 'tolerance', v_tol), v_ecart::text);
  end if;
  if v_nb_lignes > 0 and v_f.montant_ht is not null then
    select sum(l.montant_ht) into v_somme from public.filed_factures_lignes l where l.facture_id = v_f.id;
    if v_somme is not null then
      perform private.filed_poser_resultat(v_f, 'montant.lignes', 'attention', abs(v_somme - v_f.montant_ht) > v_tol,
        case when abs(v_somme - v_f.montant_ht) > v_tol
             then format('Les lignes font %s pour un HT de %s : remise ou frais au pied de la facture, ou ligne mal lue.',
                         private.filed_montant_texte(v_somme), private.filed_montant_texte(v_f.montant_ht))
             else 'La somme des lignes égale le HT.' end,
        'CALCUL_ERR', jsonb_build_object('somme_lignes', v_somme, 'ht', v_f.montant_ht, 'lignes', v_nb_lignes));
    end if;
  end if;
  if v_f.net_a_payer is not null and v_f.montant_ttc is not null and v_f.net_a_payer <> v_f.montant_ttc then
    perform private.filed_poser_resultat(v_f, 'montant.net_a_payer', 'info', true,
      format('Net à payer de %s pour un TTC de %s : un acompte ou un paiement déjà fait est déduit.',
             private.filed_montant_texte(v_f.net_a_payer), private.filed_montant_texte(v_f.montant_ttc)),
      null, jsonb_build_object('net_a_payer', v_f.net_a_payer, 'ttc', v_f.montant_ttc));
  end if;
  if v_f.devise <> 'EUR' then
    perform private.filed_poser_resultat(v_f, 'montant.devise', 'info', true,
      format('Montants en %s, lus tels qu''ils figurent sur la pièce, sans conversion.', v_f.devise));
  end if;
  if cardinality(v_f.montants_calcules) > 0 then
    perform private.filed_poser_resultat(v_f, 'montant.calcule', 'info', true,
      'Montant déduit des autres, faute de ligne sur la pièce : ' || array_to_string(v_f.montants_calcules, ', ') || '.',
      null, jsonb_build_object('champs', to_jsonb(v_f.montants_calcules)));
  end if;

  -- ── Les doublons : numéro, année de la date d'émission, SIREN du fournisseur
  -- (règles G1.42 et G1.45 de la DGFiP). Seule une pièce reçue plus tôt fait
  -- d'une autre son doublon. ──
  if v_f.numero_normalise is not null and v_f.date_emission is not null and v_f.fournisseur_id is not null then
    select e.* into v_autre
    from public.filed_factures e
    join public.filed_documents d on d.id = e.document_id
    left join public.filed_fournisseurs ef on ef.id = e.fournisseur_id
    where e.client_id = v_f.client_id and e.id <> v_f.id and e.nature = v_f.nature and e.statut <> 'ecartee'
      and (e.fournisseur_id = v_f.fournisseur_id or (v_four.siren is not null and ef.siren = v_four.siren))
      and e.numero_normalise = v_f.numero_normalise
      and extract(year from e.date_emission) = extract(year from v_f.date_emission)
      and (d.annee_reception, d.numero_reception) < (v_doc.annee_reception, v_doc.numero_reception)
    order by d.annee_reception, d.numero_reception
    limit 1;
    if v_autre.id is not null then
      select d.reference into v_autre_ref from public.filed_documents d where d.id = v_autre.document_id;
      if v_autre.montant_ttc is not distinct from v_f.montant_ttc and v_autre.date_emission = v_f.date_emission then
        v_ecartee := v_autre.id;
      end if;
    end if;
    perform private.filed_poser_resultat(v_f, 'doublon.exact', 'bloquant', v_autre.id is not null,
      case when v_autre.id is null then 'Aucune autre facture de ce fournisseur ne porte ce numéro cette année.'
           when v_ecartee is not null then format('Même facture que la pièce %s : même numéro, même date, même montant. Écartée, elle reste consultable.', v_autre_ref)
           else format('Même numéro que la pièce %s, pour un montant de %s au lieu de %s : un numéro ne sert qu''une fois.',
                       v_autre_ref, private.filed_montant_texte(v_f.montant_ttc), private.filed_montant_texte(v_autre.montant_ttc)) end,
      'DOUBLON', case when v_autre.id is null then '{}'::jsonb
                      else jsonb_build_object('facture', v_autre.id, 'piece', v_autre_ref) end,
      coalesce(v_autre.id::text, ''));
  end if;
  if v_f.montant_ttc is not null and v_f.date_emission is not null and v_f.fournisseur_id is not null and v_ecartee is null then
    v_autre := null;
    select e.* into v_autre
    from public.filed_factures e join public.filed_documents d on d.id = e.document_id
    where e.client_id = v_f.client_id and e.id <> v_f.id and e.nature = v_f.nature and e.statut <> 'ecartee'
      and e.fournisseur_id = v_f.fournisseur_id and e.montant_ttc = v_f.montant_ttc
      and e.numero_normalise is distinct from v_f.numero_normalise
      and abs(e.date_emission - v_f.date_emission) <= coalesce(v_reglage.doublon_fenetre_jours, 3)
      and (d.annee_reception, d.numero_reception) < (v_doc.annee_reception, v_doc.numero_reception)
    order by d.annee_reception, d.numero_reception
    limit 1;
    if v_autre.id is not null then
      select d.reference into v_autre_ref from public.filed_documents d where d.id = v_autre.document_id;
    end if;
    perform private.filed_poser_resultat(v_f, 'doublon.probable', 'bloquant', v_autre.id is not null,
      case when v_autre.id is null then 'Aucune facture voisine du même fournisseur au même montant.'
           else format('Même fournisseur, même montant (%s), à %s jour(s) de la pièce %s : doublon probable, sous un autre numéro.',
                       private.filed_montant_texte(v_f.montant_ttc), abs(v_autre.date_emission - v_f.date_emission), v_autre_ref) end,
      'DOUBLON', case when v_autre.id is null then '{}'::jsonb
                      else jsonb_build_object('facture', v_autre.id, 'piece', v_autre_ref, 'numero', v_autre.numero) end,
      coalesce(v_autre.id::text, ''));
    v_autre := null;
    select e.* into v_autre
    from public.filed_factures e join public.filed_documents d on d.id = e.document_id
    where e.client_id = v_f.client_id and e.id <> v_f.id and e.fournisseur_id is distinct from v_f.fournisseur_id
      and e.numero_normalise = v_f.numero_normalise and e.montant_ttc = v_f.montant_ttc
      and e.date_emission = v_f.date_emission and e.statut <> 'ecartee'
      and (d.annee_reception, d.numero_reception) < (v_doc.annee_reception, v_doc.numero_reception)
    limit 1;
    if v_autre.id is not null then
      select d.reference into v_autre_ref from public.filed_documents d where d.id = v_autre.document_id;
      perform private.filed_poser_resultat(v_f, 'doublon.autre_fournisseur', 'attention', true,
        format('Même numéro, même date et même montant que la pièce %s, sous un autre fournisseur : la même facture présentée deux fois ?', v_autre_ref),
        'DOUBLON', jsonb_build_object('facture', v_autre.id, 'piece', v_autre_ref), v_autre.id::text);
    end if;
  end if;

  -- ── Le fournisseur ──
  if v_four.id is not null then
    perform private.filed_poser_resultat(v_f, 'fournisseur.a_confirmer', 'bloquant', v_four.statut = 'a_confirmer',
      case when v_four.statut = 'a_confirmer'
           then format('Fournisseur nouveau (%s) : une personne le confirme avant tout paiement.', private.filed_libelle_fournisseur(v_four))
           else 'Fournisseur connu.' end,
      'EMMET_INC', jsonb_build_object('fournisseur', v_four.id));
    if v_four.statut = 'refuse' then
      perform private.filed_poser_resultat(v_f, 'fournisseur.refuse', 'bloquant', true,
        format('Fournisseur refusé par une personne (%s) : ne pas payer.', coalesce(v_four.motif, 'sans motif écrit')),
        'EMMET_INC', jsonb_build_object('fournisseur', v_four.id));
    end if;
    if v_four.statut = 'bloque' then
      perform private.filed_poser_resultat(v_f, 'fournisseur.bloque', 'bloquant', true,
        format('Fournisseur bloqué (%s) : aucune facture ne passe.', coalesce(v_four.motif, 'sans motif écrit')),
        'CREANCIER_ERR', jsonb_build_object('fournisseur', v_four.id));
    end if;
    if v_f.fournisseur_identification = 'nom' then
      perform private.filed_poser_resultat(v_f, 'fournisseur.identification', 'attention', true,
        'Fournisseur reconnu à son seul nom, faute de SIREN ou de TVA lisibles : vérifier.', null,
        jsonb_build_object('fournisseur', v_four.id));
    end if;
    if v_f.fournisseur_lu ? 'siren' and v_four.siren is not null then
      perform private.filed_poser_resultat(v_f, 'fournisseur.siren', 'bloquant', v_f.fournisseur_lu ->> 'siren' <> v_four.siren,
        case when v_f.fournisseur_lu ->> 'siren' <> v_four.siren
             then format('Le SIREN de la facture (%s) n''est pas celui du fournisseur retenu (%s).', v_f.fournisseur_lu ->> 'siren', v_four.siren)
             else 'Le SIREN de la facture est celui du fournisseur.' end,
        'NON_CONFORME', jsonb_build_object('lu', v_f.fournisseur_lu ->> 'siren', 'fournisseur', v_four.siren),
        v_f.fournisseur_lu ->> 'siren');
    end if;
  end if;

  -- ── L'IBAN ──
  if v_f.iban is not null then
    if not private.filed_iban_valide(v_f.iban) then
      perform private.filed_poser_resultat(v_f, 'iban.invalide', 'bloquant', true,
        format('IBAN faux (%s) : sa clé ne tombe pas juste.', private.filed_masquer_iban(v_f.iban)), 'COORD_BANC_ERR');
    elsif v_four.id is not null then
      select * into v_ib from public.filed_fournisseurs_ibans
      where client_id = v_f.client_id and fournisseur_id = v_four.id and iban = v_f.iban;
      if v_ib.statut = 'refuse' then
        perform private.filed_poser_resultat(v_f, 'iban.refuse', 'bloquant', true,
          format('IBAN déjà refusé pour ce fournisseur (%s) : ne pas payer, alerter.', v_ib.iban_masque), 'COORD_BANC_ERR',
          jsonb_build_object('iban', v_ib.iban_masque, 'refuse_le', v_ib.decide_le));
        perform private.lever_alerte_module(v_f.client_id, 'filed', 'critique',
          left(format('IBAN refusé présenté de nouveau par %s', v_four.nom), 200),
          jsonb_build_object('facture', v_f.id, 'fournisseur', v_four.id, 'iban', v_ib.iban_masque),
          'iban_refuse:' || v_ib.id::text || ':' || v_f.id::text, true, null);
      elsif v_ib.statut = 'propose' and v_four.statut = 'actif' then
        perform private.filed_poser_resultat(v_f, 'iban.nouveau', 'bloquant', true,
          format('Nouvel IBAN (%s) pour ce fournisseur : une personne le vérifie auprès de lui avant tout paiement.', v_ib.iban_masque),
          'COORD_BANC_ERR', jsonb_build_object('iban', v_ib.iban_masque));
      elsif v_ib.statut = 'revoque' then
        perform private.filed_poser_resultat(v_f, 'iban.nouveau', 'bloquant', true,
          format('IBAN révoqué pour ce fournisseur (%s) : il ne sert plus.', v_ib.iban_masque), 'COORD_BANC_ERR',
          jsonb_build_object('iban', v_ib.iban_masque));
      else
        perform private.filed_poser_resultat(v_f, 'iban.nouveau', 'bloquant', false,
          case when v_ib.statut = 'valide' then 'IBAN connu et validé pour ce fournisseur.'
               else 'IBAN proposé avec le fournisseur nouveau : il se valide avec lui.' end);
      end if;
      select f.* into v_autre_four
      from public.filed_fournisseurs_ibans i join public.filed_fournisseurs f on f.id = i.fournisseur_id
      where i.client_id = v_f.client_id and i.iban = v_f.iban and i.statut = 'valide' and i.fournisseur_id <> v_four.id
      limit 1;
      perform private.filed_poser_resultat(v_f, 'iban.partage', 'bloquant', v_autre_four.id is not null,
        case when v_autre_four.id is null then 'L''IBAN n''appartient à aucun autre fournisseur.'
             else format('Cet IBAN est déjà celui d''un autre fournisseur (%s) : affacturage à justifier, ou fraude.', v_autre_four.nom) end,
        'COORD_BANC_ERR', case when v_autre_four.id is null then '{}'::jsonb
                               else jsonb_build_object('autre_fournisseur', v_autre_four.id) end,
        coalesce(v_autre_four.id::text, ''));
      v_pays_iban := left(v_f.iban, 2);
      if v_four.pays is not null and v_pays_iban <> replace(v_four.pays, 'EL', 'GR') then
        perform private.filed_poser_resultat(v_f, 'iban.pays', 'attention', true,
          format('IBAN tenu dans un autre pays (%s) que celui du fournisseur (%s) : à vérifier.', v_pays_iban, v_four.pays),
          'COORD_BANC_ERR', jsonb_build_object('pays_iban', v_pays_iban, 'pays_fournisseur', v_four.pays));
      end if;
    end if;
  elsif v_four.id is not null and not exists (select 1 from public.filed_fournisseurs_ibans i
                                             where i.fournisseur_id = v_four.id and i.statut = 'valide') then
    perform private.filed_poser_resultat(v_f, 'iban.absent', 'info', true,
      'Aucun IBAN sur la facture ni au référentiel : le paiement passera par un autre moyen.');
  end if;

  -- ── Le destinataire : la facture est-elle adressée à cette société ? ──
  v_ach_siren := v_f.acheteur_lu ->> 'siren';
  v_ent_siren := coalesce(v_ent.siren, case when v_ent.principale then (select c.siren from public.clients c where c.id = v_f.client_id) end);
  if v_ach_siren is not null then
    if v_ent_siren = v_ach_siren then
      perform private.filed_poser_resultat(v_f, 'destinataire.societe', 'bloquant', false,
        'Facture adressée à cette société.');
    else
      select e.* into v_autre_ent from public.entites e
      where e.client_id = v_f.client_id and e.id <> v_f.entite_id and e.siren = v_ach_siren
      limit 1;
      if v_autre_ent.id is not null then
        update public.filed_factures set entite_id = v_autre_ent.id where id = v_f.id;
        update public.filed_documents set entite_id = v_autre_ent.id where id = v_f.document_id;
        v_f.entite_id := v_autre_ent.id;
        perform private.filed_historiser(v_f.client_id, v_f.document_id, 'filed_document', v_f.document_id::text, 'reorientee',
          format('Adressée à %s (SIREN %s) : rangée dans cette société.', v_autre_ent.nom, v_ach_siren),
          jsonb_build_object('entite', v_autre_ent.id, 'siren', v_ach_siren));
        perform private.filed_poser_resultat(v_f, 'destinataire.societe', 'info', true,
          format('Adressée à %s : rangée dans cette société.', v_autre_ent.nom), null,
          jsonb_build_object('entite', v_autre_ent.id));
      elsif v_ent_siren is null then
        perform private.filed_poser_resultat(v_f, 'destinataire.societe', 'info', true,
          'Le SIREN de la société n''est pas renseigné : le destinataire n''est pas vérifié.');
      else
        perform private.filed_poser_resultat(v_f, 'destinataire.societe', 'bloquant', true,
          format('Facture adressée à une autre société (SIREN %s) que celle-ci (SIREN %s).', v_ach_siren, v_ent_siren),
          'DEST_ERR', jsonb_build_object('siren_facture', v_ach_siren, 'siren_societe', v_ent_siren), v_ach_siren);
      end if;
    end if;
  end if;

  -- ── La TVA ──
  if v_f.montant_tva is not null and v_f.montant_ht is not null then
    v_regime := case
      when v_f.montant_tva <> 0 and (select count(distinct t.taux) from public.filed_factures_tva t
                                     where t.facture_id = v_f.id and t.taux > 0) > 1 then 'mixte'
      when v_f.montant_tva <> 0 then 'normal'
      when exists (select 1 from public.filed_factures_tva t where t.facture_id = v_f.id and upper(t.categorie) = 'AE')
           or coalesce((v_f.mentions ->> 'autoliquidation')::boolean, false)
           or v_four.regime_tva = 'autoliquidation_btp' then 'autoliquidation'
      when private.filed_pays_ue(v_four.pays) then 'intracom'
      when v_four.pays is not null and v_four.pays <> 'FR' then 'hors_ue'
      when coalesce((v_f.mentions ->> 'franchise_293b')::boolean, false) or v_four.regime_tva = 'franchise' then 'franchise'
      when exists (select 1 from public.filed_factures_tva t where t.facture_id = v_f.id
                   and upper(t.categorie) in ('E', 'Z', 'G', 'K', 'O'))
           or v_four.regime_tva = 'exonere' then 'exonere'
      else 'sans_tva' end;
    update public.filed_factures set regime_tva = v_regime where id = v_f.id;
    v_f.regime_tva := v_regime;

    if v_four.pays = 'FR' and v_f.montant_ht > coalesce(v_reglage.seuil_mentions_ht, 150)
       and v_regime not in ('franchise') and v_four.tva is null and not (v_f.fournisseur_lu ? 'tva') then
      perform private.filed_poser_resultat(v_f, 'tva.numero', 'attention', true,
        'Numéro de TVA du fournisseur absent de la facture : mention obligatoire (CGI, art. 242 nonies A), et la TVA déductible en dépend.',
        'NON_CONFORME');
    end if;
    if v_f.fournisseur_lu ->> 'tva' like 'FR%' and coalesce(v_f.fournisseur_lu ->> 'siren', v_four.siren) is not null then
      perform private.filed_poser_resultat(v_f, 'tva.numero_siren', 'bloquant',
        right(v_f.fournisseur_lu ->> 'tva', 9) <> coalesce(v_f.fournisseur_lu ->> 'siren', v_four.siren),
        case when right(v_f.fournisseur_lu ->> 'tva', 9) <> coalesce(v_f.fournisseur_lu ->> 'siren', v_four.siren)
             then format('Le numéro de TVA (%s) n''est pas celui du SIREN %s : il appartient à une autre société.',
                         v_f.fournisseur_lu ->> 'tva', coalesce(v_f.fournisseur_lu ->> 'siren', v_four.siren))
             else 'Le numéro de TVA est bien celui du SIREN du fournisseur.' end,
        'NON_CONFORME', '{}'::jsonb, v_f.fournisseur_lu ->> 'tva');
    end if;

    v_regime_ter := private.filed_regime_territorial(v_f.client_id, v_f.entite_id);
    select coalesce(array_agg(distinct t.taux), '{}') into v_taux_fr from public.filed_taux_tva t;
    select coalesce(array_agg(distinct t.taux), '{}') into v_taux_ok from public.filed_taux_tva t
    where v_regime_ter is null or t.regime = v_regime_ter;

    if v_regime in ('normal', 'mixte') then
      if v_regime_ter = 'sans_tva' then
        perform private.filed_poser_resultat(v_f, 'tva.taux', 'attention', true,
          'TVA facturée à une société d''un territoire où la TVA française ne s''applique pas (Guyane, Mayotte, collectivité à fiscalité propre) : à vérifier.',
          'TX_TVA_ERR', jsonb_build_object('territoire', v_regime_ter), 'territoire');
      elsif exists (select 1 from public.filed_factures_tva t where t.facture_id = v_f.id and t.taux is not null) then
        select array_agg(distinct t.taux::text order by t.taux::text) into v_hors from public.filed_factures_tva t
        where t.facture_id = v_f.id and t.taux > 0 and not (t.taux = any (v_taux_fr));
        if v_hors is not null then
          perform private.filed_poser_resultat(v_f, 'tva.taux', 'bloquant', true,
            'Taux de TVA qui n''existe pas en France : ' || array_to_string(v_hors, ' %, ') || ' %.', 'TX_TVA_ERR',
            jsonb_build_object('taux', to_jsonb(v_hors)), array_to_string(v_hors, ','));
        else
          select array_agg(distinct t.taux::text order by t.taux::text) into v_hors from public.filed_factures_tva t
          where t.facture_id = v_f.id and t.taux > 0 and not (t.taux = any (v_taux_ok));
          perform private.filed_poser_resultat(v_f, 'tva.taux', 'attention', v_hors is not null,
            case when v_hors is null then 'Chaque taux de TVA est un taux légal du territoire de la société.'
                 else 'Taux légal ailleurs en France, pas dans le territoire de la société : ' || array_to_string(v_hors, ' %, ') || ' %.' end,
            'TX_TVA_ERR', jsonb_build_object('territoire', v_regime_ter, 'taux', to_jsonb(v_hors)),
            coalesce(array_to_string(v_hors, ','), ''));
        end if;
        select sum(t.montant) into v_somme from public.filed_factures_tva t where t.facture_id = v_f.id;
        if v_somme is not null then
          perform private.filed_poser_resultat(v_f, 'tva.ventilation', 'attention', abs(v_somme - v_f.montant_tva) > v_tol,
            case when abs(v_somme - v_f.montant_tva) > v_tol
                 then format('La ventilation fait %s de TVA pour un total de %s.', private.filed_montant_texte(v_somme),
                             private.filed_montant_texte(v_f.montant_tva))
                 else 'La ventilation de la TVA égale son total.' end,
            'CALCUL_ERR', jsonb_build_object('somme', v_somme, 'tva', v_f.montant_tva));
        end if;
      elsif v_f.montant_ht <> 0 then
        -- Sans ventilation : le taux qui redonne la TVA au centime près, ligne par ligne arrondie.
        v_tol_taux := least(1.00, greatest(0.02, 0.005 * greatest(v_nb_lignes, 1)));
        v_taux_trouve := null;
        foreach v_taux in array v_taux_fr loop
          if abs(round(v_f.montant_ht * v_taux / 100, 2) - v_f.montant_tva) <= v_tol_taux then
            if v_taux_trouve is null or v_taux = any (v_taux_ok) then
              v_taux_trouve := v_taux;
            end if;
          end if;
        end loop;
        if v_taux_trouve is not null and v_taux_trouve = any (v_taux_ok) then
          perform private.filed_poser_resultat(v_f, 'tva.taux', 'bloquant', false,
            format('TVA au taux légal de %s %%.', replace(trim(trailing '.' from trim(trailing '0' from v_taux_trouve::text)), '.', ',')),
            'TX_TVA_ERR', jsonb_build_object('taux', v_taux_trouve, 'territoire', v_regime_ter), v_taux_trouve::text);
        elsif v_taux_trouve is not null then
          perform private.filed_poser_resultat(v_f, 'tva.taux', 'attention', true,
            format('TVA au taux de %s %%, légal ailleurs en France mais pas dans le territoire de la société.',
                   replace(trim(trailing '.' from trim(trailing '0' from v_taux_trouve::text)), '.', ',')),
            'TX_TVA_ERR', jsonb_build_object('taux', v_taux_trouve, 'territoire', v_regime_ter), v_taux_trouve::text);
        elsif v_f.montant_tva / v_f.montant_ht * 100 between (select min(x) from unnest(v_taux_ok) x) - 0.01
                                                         and (select max(x) from unnest(v_taux_ok) x) + 0.01 then
          perform private.filed_poser_resultat(v_f, 'tva.taux', 'attention', true,
            format('Taux moyen de %s %% : plusieurs taux probables, que la pièce ne détaille pas.',
                   replace(round(v_f.montant_tva / v_f.montant_ht * 100, 2)::text, '.', ',')),
            'TX_TVA_ERR', jsonb_build_object('taux_moyen', round(v_f.montant_tva / v_f.montant_ht * 100, 3)),
            round(v_f.montant_tva / v_f.montant_ht * 100, 3)::text);
        else
          perform private.filed_poser_resultat(v_f, 'tva.taux', 'bloquant', true,
            format('Taux moyen de %s %% : aucun taux légal ne redonne cette TVA.',
                   replace(round(v_f.montant_tva / v_f.montant_ht * 100, 2)::text, '.', ',')),
            'TX_TVA_ERR', jsonb_build_object('taux_moyen', round(v_f.montant_tva / v_f.montant_ht * 100, 3)),
            round(v_f.montant_tva / v_f.montant_ht * 100, 3)::text);
        end if;
      end if;
    end if;

    if v_regime = 'sans_tva' and v_f.montant_ht <> 0 then
      perform private.filed_poser_resultat(v_f, 'tva.sans_mention', 'attention', true,
        'Aucune TVA, sans mention d''exonération, d''autoliquidation ou de franchise : à vérifier.', 'TX_TVA_ERR');
    end if;
    if v_four.regime_tva = 'autoliquidation_btp' then
      perform private.filed_poser_resultat(v_f, 'tva.autoliquidation_attendue', 'bloquant', v_f.montant_tva <> 0,
        case when v_f.montant_tva <> 0
             then 'Sous-traitant du bâtiment : sa facture se fait hors taxes avec la mention « autoliquidation » (CGI, art. 283-2 nonies). La TVA facturée est une anomalie.'
             else 'Facture de sous-traitant hors taxes : la TVA sera autoliquidée.' end,
        'TX_TVA_ERR', '{}'::jsonb, v_f.montant_tva::text);
    end if;
    if v_regime in ('autoliquidation', 'intracom', 'hors_ue') then
      perform private.filed_poser_resultat(v_f, 'tva.regime', 'info', true,
        case v_regime
          when 'autoliquidation' then 'TVA due par l''acheteur (autoliquidation) : elle sera déclarée et déduite à l''écriture.'
          when 'intracom' then 'Fournisseur de l''Union européenne, sans TVA : acquisition ou service intracommunautaire, TVA autoliquidée.'
          else 'Fournisseur hors de l''Union, sans TVA : TVA autoliquidée à l''écriture, ou payée à l''importation.' end);
    end if;
  end if;

  -- ── Les dates ──
  if v_f.date_emission is not null then
    perform private.filed_poser_resultat(v_f, 'date.future', 'bloquant', v_f.date_emission > v_auj + 1,
      case when v_f.date_emission > v_auj + 1
           then format('Date d''émission dans le futur (%s) : erreur de lecture ou de saisie.', to_char(v_f.date_emission, 'DD/MM/YYYY'))
           else 'Date d''émission passée.' end,
      'NON_CONFORME', '{}'::jsonb, v_f.date_emission::text);
    if v_f.date_emission < v_auj - 365 then
      perform private.filed_poser_resultat(v_f, 'date.ancienne', 'attention', true,
        format('Pièce émise le %s, reçue le %s : plus d''un an d''écart, l''exercice est à vérifier.',
               to_char(v_f.date_emission, 'DD/MM/YYYY'), to_char(v_f.date_reception, 'DD/MM/YYYY')));
    end if;
    if v_f.echeance_lue is not null and v_f.echeance_lue < v_f.date_emission then
      perform private.filed_poser_resultat(v_f, 'date.echeance', 'attention', true,
        'Échéance antérieure à la date d''émission : à vérifier.', 'MODPAI_ERR');
    end if;
  end if;

  -- ── Le cadre de facturation (règle G1.02) ──
  if upper(coalesce(v_f.cadre_facturation, '')) in ('B2', 'S2', 'M2') then
    perform private.filed_poser_resultat(v_f, 'cadre.deja_payee', 'info', true,
      format('Facture déjà payée (cadre %s) : elle ne se paie pas une seconde fois.', upper(v_f.cadre_facturation)));
  end if;

  -- ── Le rapprochement (lot F3) : la commande, la réception, l'avoir ──
  perform private.filed_rapprocher_facture(v_f.id);

  -- ── L'état ──
  select count(*) filter (where c.resultat = 'anomalie' and c.gravite = 'bloquant'),
         count(*) filter (where c.resultat = 'anomalie' and c.gravite = 'attention'),
         bool_or(c.resultat = 'anomalie' and c.famille = 'lecture'),
         coalesce(array_agg(c.code order by c.code) filter (where c.resultat = 'anomalie' and c.gravite <> 'info'), '{}')
  into v_bloquants, v_attention, v_lecture, v_anomalies
  from public.filed_controles c where c.facture_id = v_f.id;

  v_statut := case when coalesce(v_lecture, false) then 'a_completer'
                   when v_ecartee is not null then 'ecartee'
                   when v_bloquants > 0 then 'bloquee'
                   else 'a_valider' end;

  if v_statut is distinct from v_f.statut or v_anomalies is distinct from v_f.anomalies then
    select string_agg(c.message, ' ' order by c.code) into v_message
    from public.filed_controles c
    where c.facture_id = v_f.id and c.resultat = 'anomalie' and c.gravite = 'bloquant';
    perform private.filed_historiser(v_f.client_id, v_f.document_id, 'filed_document', v_f.document_id::text,
      'controlee',
      case v_statut
        when 'a_completer' then 'À compléter. ' || coalesce(v_message, '')
        when 'bloquee' then 'Bloquée. ' || coalesce(v_message, '')
        when 'ecartee' then 'Écartée : doublon exact d''une pièce reçue plus tôt.'
        else 'Contrôlée : prête à valider' || case when v_attention > 0 then format(', avec %s point(s) d''attention.', v_attention) else '.' end end,
      jsonb_build_object('statut', v_statut, 'anomalies', to_jsonb(v_anomalies), 'version', v_f.version));
    perform private.filed_journaliser(v_f.client_id, 'filed.controles', 'filed_facture', v_f.id::text,
      jsonb_build_object('statut', v_statut, 'version', v_f.version, 'anomalies', to_jsonb(v_anomalies)), v_f.entite_id);
  end if;

  update public.filed_factures
     set statut = v_statut, doublon_de = v_ecartee, anomalies = v_anomalies, nb_bloquants = v_bloquants,
         nb_attention = v_attention, controle_le = now(), maj_le = now()
   where id = v_f.id;
  return v_statut;
end $function$;

-- ═══════════════════════════════════════════════════════════════════════
-- 6. SIGNATURES, COLONNES, CONTRAINTES, MOTIFS
-- ═══════════════════════════════════════════════════════════════════════
-- private.lever_alerte_module(p_client uuid, p_module text, p_niveau text, p_titre text,
--   p_detail jsonb = '{}', p_cle text = null, p_pour_client boolean = false, p_destinataire uuid = null) → uuid
--   niveau : 'critique' (vu dans le socle) ; p_pour_client true = visible par le client ;
--   p_destinataire doit être membre (public.comptes) de l'organisation ; clé finale = module || ':' || p_cle.
-- private.acteur_courant(OUT acteur_type text, OUT acteur_id uuid, OUT acteur_libelle text)
--   acteur_type : 'utilisateur' (auth.uid()), 'operateur' (omega.operateur / x-omega-operateur), 'systeme'
--   (libellé = omega.module, x-omega-module ou le rôle).
-- private.deposer_travail(p_client uuid, p_module text, p_genre text, p_charge jsonb = '{}', p_cle text = null,
--   p_priorite smallint = 0) → bigint  (idempotent sur (genre, cle) tant que a_faire / en_cours)
-- private.publier_evenement(p_client uuid, p_evenement text, p_charge jsonb, p_cle text) → int
-- private.abonnements (evenement text, module text, genre text) ; aujourd'hui pour FILED :
--   ('piece_lue.filed', 'filed', 'filed.integrer'), ('demande.decidee.filed', 'filed', 'filed.decision').
-- private.tables_locataires (nom text, ordre_effacement smallint = 100, note text)
-- private.tables_objets (nom text, objet_type text, colonne text, ordre_effacement smallint = 100)
--
-- public.demandes_validation : id, client_id, entite_id, module, type_action, objet_type, objet_id, resume (1..500),
--   montant (>= 0 ou null), devise char(3) 'EUR', payload jsonb, demandeur_type utilisateur|systeme, demandeur_id,
--   statut en_attente|approuvee|rejetee|annulee|expiree|executee|echec_execution, approbations_requises smallint,
--   roles_autorises text[] (gerant, admin, valideur), regle_id, echeance timestamptz, cle_idempotence (unique par client),
--   cree_le, decide_le, execute_le, motif_echec, equipe_id, politique_id.
--   PAS de destinataire personne ni de niveau : le ciblage se fait par roles_autorises + equipe_id (regles_validation).
-- public.approbations : id, demande_id, client_id, user_id, au_nom_de, delegation_id, decision approuve|rejete,
--   commentaire (<= 2000), decide_le. UNIQUE (demande_id, user_id).
-- public.delegations : id, client_id, delegant, delegataire, entite_id, module, debut, fin, motif, cree_par, cree_le, revoquee_le.
-- public.regles_validation : id, client_id, entite_id, module, montant_min, montant_max, approbations_requises,
--   roles_autorises, actif, cree_le, type_action, equipe_id.
-- public.politiques : accords permanents (plafond_operation, plafond_mensuel, nombre_mensuel, debut, fin, statut…).
--
-- Pour un jeu d'essai pgTAP :
--   public.clients  : nom NOT NULL ; statut 'prospect' par défaut ; profil 'generique'.
--   public.entites  : client_id, nom NOT NULL ; type 'societe' ; principale false ; fuseau 'Europe/Paris'.
--   public.comptes  : user_id, client_id NOT NULL ; role 'gerant' par défaut ; perimetre_total true.
--   Un utilisateur = une ligne auth.users (insert minimal : id, email, instance_id '00000000-0000-0000-0000-000000000000',
--   aud 'authenticated', role 'authenticated', encrypted_password '', created_at, updated_at).
--   Se faire passer pour un membre dans un test :
--     set local role authenticated;
--     select set_config('request.jwt.claims', json_build_object('sub', '<uuid>', 'role', 'authenticated')::text, true);
--   puis « reset role » pour revenir. Aucune fonction d'exemple n'existe dans le socle (les « jeu » trouvés
--   sont Tiroma : relevés). pgTAP n'est pas installé sur la recette : A5 le pose ; en attendant, écris tes
--   tests en DO $$ … assert … $$.
-- Aucune table d'annexes (pièce jointe + commentaire sur une facture) n'existe : crée filed_factures_annexes.
--
-- filed_factures.statut CHECK actuel : a_completer | bloquee | a_valider | ecartee.
-- Motifs utiles (public.filed_motifs_refus) : EMMET_INC « Émetteur inconnu », CREANCIER_ERR « Créancier inconnu ou
--   différent de celui du marché ou de la commande », NON_CONFORME « Mention légale manquante », DEST_ERR, DEST_INC,
--   SIRET_ERR « SIRET erroné ou absent », JUSTIF_ABS, FACT_NON_CONFORME, CALCUL_ERR, DOUBLON, COORD_BANC_ERR, TX_TVA_ERR,
--   PU_ERR, QTE_ERR, LIVR_INCOMP, MODPAI_ERR, MONTANT_ERR, MONTANTTOTAL_ERR, REF_ERR, REM_ERR, AUTRE.
