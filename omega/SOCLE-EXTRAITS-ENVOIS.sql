-- SOCLE-EXTRAITS-ENVOIS.sql — définitions brutes (pg_get_functiondef) relevées sur la RECETTE ygwbgpowzlbdaajlsqkn
-- le 06/10/2026 vers 16 h 25 Z par le coordinateur, pour A2 (messageries, statut brouillon_depose) et C3 (REPUT).
-- Lecture seule : ce fichier ne se pose pas.

-- private.annuler_envoi(uuid,text)
CREATE OR REPLACE FUNCTION private.annuler_envoi(p_envoi uuid, p_motif text DEFAULT NULL::text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  e public.envois;
  v_uid uuid := (select auth.uid());
begin
  select * into e from public.envois where id = p_envoi;
  if e.id is null then
    raise exception 'Envoi introuvable.' using errcode = 'P0002';
  end if;
  if v_uid is not null then
    if not exists (select 1 from public.comptes c where c.user_id = v_uid and c.client_id = e.client_id)
       or not private.voit_objet(e.client_id, e.objet_type, e.objet_id)
       or not private.perimetre_couvre(v_uid, e.client_id, e.entite_id) then
      raise exception 'Envoi introuvable.' using errcode = 'P0002';
    end if;
    if e.prepare_par is distinct from v_uid and not private.a_un_role(e.client_id, array['gerant', 'admin']) then
      raise exception 'Seul qui l''a préparé, un gérant ou un admin annule un envoi.' using errcode = '42501';
    end if;
  else
    perform private.exiger_ouvrier();
  end if;
  if e.statut = 'en_cours' and (e.fournisseur <> 'manuel' or e.bail_jusqu_au > now()) then
    raise exception 'Cet envoi est en train de partir : il ne s''annule plus.' using errcode = '55000';
  end if;
  if not private.clore_envoi(p_envoi, 'annule', 'ANNULE', coalesce(left(nullif(btrim(p_motif), ''), 500), 'Annulé.')) then
    raise exception 'Cet envoi ne s''annule plus (%).', e.statut using errcode = '55000';
  end if;
end $function$
;

-- private.clore_envoi(uuid,text,text,text)
CREATE OR REPLACE FUNCTION private.clore_envoi(p_envoi uuid, p_statut text, p_verrou text, p_motif text)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  e public.envois;
begin
  update public.envois
     set statut = p_statut, verrou = coalesce(p_verrou, verrou), motif = left(p_motif, 500), reprise_le = null,
         bail_jusqu_au = null, clos_le = now()
   where id = p_envoi
     and (statut in ('a_valider', 'differe', 'pret') or (statut = 'en_cours' and p_statut in ('bloque', 'annule', 'expire')))
  returning * into e;
  if not found then
    return false;
  end if;
  perform private.clore_demande_envoi(e, false, p_motif, case when p_statut = 'expire' then 'expiree' else 'annulee' end);
  if p_statut in ('bloque', 'refuse', 'expire') then
    perform private.publier_envoi(e, p_statut);
  end if;
  return true;
end $function$
;

-- private.commencer_envoi(uuid)
CREATE OR REPLACE FUNCTION private.commencer_envoi(p_envoi uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  e public.envois;
  v_uid uuid := (select auth.uid());
  v jsonb;
  v_canal private.canaux_envoi;
  v_exp public.expediteurs;
  v_g public.gabarits_messages;
  v_pieces jsonb;
  v_essai_adresse text;
  v_hds boolean;
  v_fictif boolean;
begin
  select * into e from public.envois where id = p_envoi;
  if e.id is null then
    return jsonb_build_object('envoyer', false, 'raison', 'introuvable');
  end if;
  if v_uid is not null then
    perform private.exiger_acteur_envoi(e.client_id, e.entite_id, e.objet_type, e.objet_id);
    if e.fournisseur is distinct from 'manuel' then
      raise exception 'Cet envoi part par l''ouvrier d''envoi, pas à la main.' using errcode = '42501';
    end if;
  else
    perform private.exiger_ouvrier();
  end if;

  perform pg_advisory_xact_lock(hashtextextended('omega.envois:' || e.client_id::text, 0));
  select * into e from public.envois where id = p_envoi for update;
  if e.statut not in ('pret', 'en_cours') then
    return jsonb_build_object('envoyer', false, 'statut', e.statut, 'verrou', e.verrou, 'motif', e.motif);
  end if;
  if e.echeance <= now() then
    perform private.clore_envoi(p_envoi, 'expire', 'ECHEANCE', 'L''échéance de cet envoi est passée avant son départ.');
    return jsonb_build_object('envoyer', false, 'statut', 'expire', 'verrou', 'ECHEANCE');
  end if;

  v := private.verrous_envoi(e, true, now());
  if v ->> 'code' is not null then
    if (v ->> 'definitif')::boolean then
      perform private.clore_envoi(p_envoi, 'bloque', v ->> 'code', v ->> 'motif');
      return jsonb_build_object('envoyer', false, 'statut', 'bloque', 'verrou', v ->> 'code', 'motif', v ->> 'motif');
    end if;
    update public.envois
       set statut = 'differe', verrou = v ->> 'code', motif = v ->> 'motif', reprise_le = (v ->> 'reprise')::timestamptz,
           bail_jusqu_au = null
     where id = p_envoi;
    return jsonb_build_object('envoyer', false, 'statut', 'differe', 'verrou', v ->> 'code', 'motif', v ->> 'motif',
                              'reprise_le', v ->> 'reprise');
  end if;
  if (v ->> 'fournisseur') is distinct from e.fournisseur then
    -- L'expéditeur a changé depuis « pret » : l'envoi repart vers le bon fournisseur.
    update public.envois
       set statut = 'pret', mode = v ->> 'mode', expediteur_id = (v ->> 'expediteur')::uuid,
           fournisseur = v ->> 'fournisseur', pret_le = now(), bail_jusqu_au = null
     where id = p_envoi
    returning * into e;
    perform private.confier_envoi(e);
    return jsonb_build_object('envoyer', false, 'statut', 'pret', 'raison', 'fournisseur_change', 'fournisseur', e.fournisseur);
  end if;

  update public.envois
     set statut = 'en_cours', essais = essais + 1, mode = v ->> 'mode', expediteur_id = (v ->> 'expediteur')::uuid,
         verrou = null, motif = null, reprise_le = null,
         bail_jusqu_au = now() + case when e.fournisseur = 'manuel' then interval '2 hours' else interval '15 minutes' end
   where id = p_envoi
  returning * into e;

  v_hds := coalesce((select f.agree_sante from private.fournisseurs_envoi f where f.fournisseur = e.fournisseur), false);
  v_fictif := e.donnees_sante and e.mode = 'essai' and coalesce((select x.valeur from private.reglages x where x.cle = 'environnement'), '') = 'recette'
              and exists (select 1 from public.reglages_envois g where g.client_id = e.client_id and g.module = e.module
                            and g.mode = 'essai' and g.essai_donnees_fictives);
  select * into v_canal from private.canaux_envoi c where c.canal = e.canal;
  select coalesce(jsonb_agg(jsonb_build_object('id', p.id, 'chemin', p.chemin, 'nom', p.nom_fichier, 'mime', p.mime,
                                               'octets', p.octets, 'sha256', p.sha256) order by p.nom_fichier), '[]'::jsonb)
  into v_pieces
  from public.pieces p where p.client_id = e.client_id and p.id = any (e.pieces);

  if e.mode = 'essai' then
    v_essai_adresse := private.reglages_envois_effectifs(e.client_id, e.module) ->> 'essai_adresse';
    return jsonb_build_object(
      'envoyer', true, 'envoi', e.id, 'mode', 'essai', 'module', e.module, 'canal', 'email', 'canal_reel', e.canal,
      'fournisseur', e.fournisseur, 'donnees_sante', e.donnees_sante, 'fournisseur_hds', v_hds, 'donnees_fictives', coalesce(v_fictif, false),
      'expediteur', jsonb_build_object(
        'identite', (select g.valeur from private.reglages g where g.cle = 'envois_essai_expediteur'),
        'nom_affiche', (select g.valeur from private.reglages g where g.cle = 'envois_essai_nom'),
        'repondre_a', null, 'parametres', '{}'::jsonb, 'secret', false),
      'destinataire', jsonb_build_object('adresse', v_essai_adresse, 'nom', null, 'langue', 'fr', 'professionnel', true),
      'sujet', '[ESSAI] ' || coalesce(e.sujet, v_canal.libelle || ' pour ' || coalesce(e.destinataire_nom, e.destinataire_adresse)),
      'corps', 'Message d''essai. En service réel, il partirait '
               || case e.canal when 'email' then 'par courriel' when 'whatsapp' then 'par WhatsApp' when 'sms' then 'par SMS'
                               when 'lre' then 'en lettre recommandée électronique' else 'par un appel' end
               || ' à ' || coalesce(e.destinataire_nom || ' ', '') || '<' || e.destinataire_adresse || '>.'
               || E'\n\n' || e.corps,
      'pieces', v_pieces, 'modele_externe', null, 'parametres_modele', '[]'::jsonb, 'langue', 'fr',
      'repondre_a', null, 'transactionnel', e.transactionnel, 'cle', e.id,
      'objet', jsonb_build_object('type', e.objet_type, 'id', e.objet_id));
  end if;

  select * into v_exp from public.expediteurs x where x.id = e.expediteur_id;
  select * into v_g from public.gabarits_messages g where g.id = e.gabarit_id;
  return jsonb_build_object(
    'envoyer', true, 'envoi', e.id, 'mode', 'reel', 'module', e.module, 'canal', e.canal, 'fournisseur', e.fournisseur, 'donnees_sante', e.donnees_sante, 'fournisseur_hds', v_hds, 'donnees_fictives', coalesce(v_fictif, false),
    'expediteur', jsonb_build_object('identite', v_exp.identite, 'nom_affiche', v_exp.nom_affiche,
                                     'repondre_a', v_exp.repondre_a, 'parametres', v_exp.parametres,
                                     'secret', v_exp.secret_nom is not null),
    'destinataire', jsonb_build_object('adresse', e.destinataire_adresse, 'nom', e.destinataire_nom,
                                       'langue', e.destinataire_langue, 'professionnel', e.destinataire_professionnel),
    'sujet', e.sujet, 'corps', e.corps, 'pieces', v_pieces,
    'modele_externe', v_g.modele_externe, 'langue', coalesce(v_g.langue, e.destinataire_langue),
    'parametres_modele', case when v_g.id is null then '[]'::jsonb
                              else private.rendre_gabarit(v_g, e.variables, e.client_id, e.entite_id) -> 'parametres' end,
    'repondre_a', coalesce(e.repondre_a, v_exp.repondre_a), 'transactionnel', e.transactionnel, 'cle', e.id,
    'objet', jsonb_build_object('type', e.objet_type, 'id', e.objet_id));
end $function$
;

-- private.confirmer_envoi(uuid,text)
CREATE OR REPLACE FUNCTION private.confirmer_envoi(p_envoi uuid, p_reference text DEFAULT NULL::text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  e public.envois;
begin
  perform private.exiger_ouvrier();
  perform set_config('omega.envois_ouvrier', 'oui', true);
  update public.envois
     set statut = 'envoye', envoye_le = now(), clos_le = now(), erreur = null, bail_jusqu_au = null,
         reference_externe = left(nullif(btrim(p_reference), ''), 300)
   where id = p_envoi and statut = 'en_cours' and fournisseur <> 'manuel'
  returning * into e;
  perform set_config('omega.envois_ouvrier', '', true);
  if e.id is null then
    if exists (select 1 from public.envois x where x.id = p_envoi and x.statut = 'envoye') then
      return;   -- une confirmation rejouée n'est pas une faute
    end if;
    raise exception 'Envoi introuvable, ou pas en cours d''envoi.' using errcode = 'P0002';
  end if;
  perform private.clore_demande_envoi(e, true, null);
  perform private.publier_envoi(e, 'envoye');
end $function$
;

-- private.consommation_ia_jour(uuid)
CREATE OR REPLACE FUNCTION private.consommation_ia_jour(p_client uuid)
 RETURNS numeric
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare v numeric;
begin
  perform private.exiger_ouvrier();
  select coalesce(sum((t.resultat ->> 'cout_eur')::numeric), 0) into v
  from public.travaux t
  where t.client_id = p_client and t.genre = 'lecteur.lire' and t.etat = 'fait'
    and t.fini_le >= date_trunc('day', now() at time zone 'Europe/Paris') at time zone 'Europe/Paris'
    and (t.resultat ->> 'cout_eur') ~ '^[0-9.]+$';
  return v;
end $function$
;

-- private.deposer_travail(uuid,text,text,jsonb,text,smallint)
CREATE OR REPLACE FUNCTION private.deposer_travail(p_client uuid, p_module text, p_genre text, p_charge jsonb DEFAULT '{}'::jsonb, p_cle text DEFAULT NULL::text, p_priorite smallint DEFAULT 0)
 RETURNS bigint
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare v_id bigint;
begin
  insert into public.travaux (client_id, module, genre, charge, cle, priorite)
  values (p_client, p_module, p_genre, coalesce(p_charge, '{}'::jsonb), p_cle, coalesce(p_priorite, 0))
  on conflict (genre, cle) where cle is not null and etat in ('a_faire', 'en_cours') do nothing
  returning id into v_id;
  if v_id is null then
    select t.id into v_id from public.travaux t
    where t.genre = p_genre and t.cle = p_cle and t.etat in ('a_faire', 'en_cours') limit 1;
  end if;
  return v_id;
end $function$
;

-- private.echouer_envoi(uuid,text,boolean)
CREATE OR REPLACE FUNCTION private.echouer_envoi(p_envoi uuid, p_erreur text, p_definitif boolean DEFAULT false)
 RETURNS text
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  e public.envois;
begin
  perform private.exiger_ouvrier();
  if coalesce(p_definitif, false) then
    update public.envois
       set statut = 'echec', erreur = left(p_erreur, 2000), bail_jusqu_au = null, clos_le = now(),
           motif = 'L''envoi a échoué chez le fournisseur ; l''équipe Omega est prévenue.'
     where id = p_envoi and statut = 'en_cours'
    returning * into e;
    if e.id is not null then
      perform private.clore_demande_envoi(e, false, e.motif);
      perform private.publier_envoi(e, 'echec');
      return 'echec';
    end if;
  else
    update public.envois set statut = 'pret', erreur = left(p_erreur, 2000), bail_jusqu_au = null
     where id = p_envoi and statut = 'en_cours'
    returning * into e;
    if e.id is not null then
      return 'pret';
    end if;
  end if;
  return coalesce((select x.statut from public.envois x where x.id = p_envoi), 'introuvable');
end $function$
;

-- private.envoi_valide(uuid,timestamp with time zone)
CREATE OR REPLACE FUNCTION private.envoi_valide(p_envoi uuid, p_instant timestamp with time zone DEFAULT now())
 RETURNS text
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  e public.envois;
  v jsonb;
begin
  select * into e from public.envois where id = p_envoi;
  if not found or e.statut not in ('a_valider', 'differe', 'pret') then
    return coalesce(e.statut, 'introuvable');
  end if;
  -- Un envoi à la fois par organisation : délai, plafonds et doublons ne se croisent pas.
  perform pg_advisory_xact_lock(hashtextextended('omega.envois:' || e.client_id::text, 0));
  select * into e from public.envois where id = p_envoi for update;
  if e.statut not in ('a_valider', 'differe', 'pret') then
    return e.statut;
  end if;
  if e.echeance <= p_instant then
    perform private.clore_envoi(p_envoi, 'expire', 'ECHEANCE', 'L''échéance de cet envoi est passée avant son départ.');
    return 'expire';
  end if;
  v := private.verrous_envoi(e, true, p_instant);
  if v ->> 'code' is null then
    update public.envois
       set statut = 'pret', verrou = null, motif = null, reprise_le = null, mode = v ->> 'mode',
           expediteur_id = (v ->> 'expediteur')::uuid, fournisseur = v ->> 'fournisseur',
           pret_le = now(), decide_le = coalesce(decide_le, now())
     where id = p_envoi
    returning * into e;
    perform private.confier_envoi(e);
    return 'pret';
  elsif not (v ->> 'definitif')::boolean then
    update public.envois
       set statut = 'differe', verrou = v ->> 'code', motif = v ->> 'motif', reprise_le = (v ->> 'reprise')::timestamptz,
           decide_le = coalesce(decide_le, now())
     where id = p_envoi;
    return 'differe';
  end if;
  update public.envois set decide_le = coalesce(decide_le, now()) where id = p_envoi;
  perform private.clore_envoi(p_envoi, 'bloque', v ->> 'code', v ->> 'motif');
  return 'bloque';
end $function$
;

-- private.envois_suivre_demande()
CREATE OR REPLACE FUNCTION private.envois_suivre_demande()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  v_id uuid;
begin
  if new.statut is not distinct from old.statut or new.statut not in ('approuvee', 'rejetee', 'expiree', 'annulee') then
    return null;
  end if;
  select e.id into v_id from public.envois e where e.demande_id = new.id and e.statut = 'a_valider';
  if v_id is null then
    return null;
  end if;
  if new.statut = 'approuvee' then
    perform private.envoi_valide(v_id);
  else
    perform private.clore_envoi(v_id,
      case new.statut when 'rejetee' then 'refuse' when 'expiree' then 'expire' else 'annule' end,
      case new.statut when 'rejetee' then 'REFUSE' when 'expiree' then 'ECHEANCE' else 'ANNULE' end,
      case new.statut when 'rejetee' then 'Refusé à la validation.'
                      when 'expiree' then 'La validation n''est pas venue avant l''échéance.'
                      else 'Demande de validation annulée.' end);
  end if;
  return null;
end $function$
;

-- private.envois_suivre_modification()
CREATE OR REPLACE FUNCTION private.envois_suivre_modification()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  e public.envois;
  v_ancien jsonb;
  v_cle text;
  v_canal private.canaux_envoi;
  v_sujet text;
  v_corps text;
  v_v jsonb;
  v_contexte boolean;
begin
  select * into e from public.envois x
  where x.demande_id = (new.payload ->> 'remplace')::uuid and x.statut = 'a_valider' and not x.adossee
  for update;
  if e.id is null then
    return null;
  end if;
  select d.payload into v_ancien from public.demandes_validation d where d.id = e.demande_id;
  for v_cle in select k from jsonb_object_keys(new.payload) k union select k from jsonb_object_keys(v_ancien) k loop
    if v_cle not in ('sujet', 'corps', 'remplace', 'modifications')
       and (new.payload -> v_cle) is distinct from (v_ancien -> v_cle) then
      raise exception 'Seuls le sujet et le corps d''un envoi se modifient.' using errcode = '42501';
    end if;
  end loop;
  if e.canal = 'whatsapp' and e.gabarit_id is not null then
    raise exception 'Un message WhatsApp suit le modèle approuvé par Meta : il ne se retouche pas.' using errcode = '42501';
  end if;
  select * into v_canal from private.canaux_envoi c where c.canal = e.canal;
  v_sujet := nullif(btrim(new.payload ->> 'sujet'), '');
  v_corps := new.payload ->> 'corps';
  if nullif(btrim(v_corps), '') is null or char_length(v_corps) > v_canal.longueur_max
     or char_length(coalesce(v_sujet, '')) > 300
     or (v_canal.sujet = 'obligatoire' and v_sujet is null) or (v_canal.sujet = 'interdit' and v_sujet is not null) then
    raise exception 'Le texte modifié ne convient pas au canal % (sujet, longueur).', v_canal.libelle using errcode = '22023';
  end if;
  -- Un texte retouché est un texte libre : dans un contexte de santé, il en porte.
  v_contexte := coalesce((select m.sante from private.modules_envois m where m.module = e.module), false)
                or (private.reglages_envois_effectifs(e.client_id, e.module) ->> 'sante')::boolean;
  update public.envois
     set demande_id = new.id, sujet = v_sujet, corps = v_corps,
         empreinte = private.empreinte_contenu(e.canal, e.destinataire_adresse, v_sujet, v_corps, e.pieces),
         donnees_sante = e.donnees_sante or v_contexte, modifie_par = (select auth.uid())
   where id = e.id
  returning * into e;
  v_v := private.verrous_envoi(e, false, now());
  if v_v ->> 'code' is not null then
    perform private.clore_envoi(e.id, 'bloque', v_v ->> 'code', v_v ->> 'motif');
    update public.demandes_validation set statut = 'annulee' where id = new.id and statut = 'en_attente';
  elsif new.statut = 'approuvee' then
    perform private.envoi_valide(e.id);
  end if;
  return null;
end $function$
;

-- private.exiger_acteur_envoi(uuid,uuid,text,text)
CREATE OR REPLACE FUNCTION private.exiger_acteur_envoi(p_client uuid, p_entite uuid, p_objet_type text, p_objet_id text)
 RETURNS uuid
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  v_uid uuid := (select auth.uid());
begin
  if v_uid is null then
    if coalesce(nullif(current_setting('role', true), 'none'), session_user::text) in ('service_role', 'postgres') then
      return null;
    end if;
    raise exception 'Seul un membre de l''organisation, ou un moteur, agit sur les envois.' using errcode = '42501';
  end if;
  if not private.a_un_role(p_client, array['gerant', 'admin', 'valideur', 'collaborateur'])
     or not private.perimetre_couvre(v_uid, p_client, p_entite)
     or (p_objet_type is not null and not private.ecrit_objet(p_client, p_objet_type, p_objet_id)) then
    raise exception 'Seul un membre qui agit, dans son périmètre et sur un objet qu''il peut écrire, agit sur cet envoi.'
      using errcode = '42501';
  end if;
  return v_uid;
end $function$
;

-- private.exiger_ouvrier()
CREATE OR REPLACE FUNCTION private.exiger_ouvrier()
 RETURNS void
 LANGUAGE plpgsql
 STABLE
 SET search_path TO ''
AS $function$
begin
  if (select auth.uid()) is not null
     or coalesce(nullif(current_setting('role', true), 'none'), session_user::text) not in ('service_role', 'postgres') then
    raise exception 'Réservé à l''ouvrier d''envoi (le serveur).' using errcode = '42501';
  end if;
end $function$
;

-- private.garder_demande()
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
end $function$
;

-- private.garder_envoi()
CREATE OR REPLACE FUNCTION private.garder_envoi()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
begin
  if tg_op = 'DELETE' then
    if private.effacement_en_cours(old.client_id) then
      return old;
    end if;
    raise exception 'Un envoi ne s''efface pas : ce qui est parti se prouve. Il part avec son objet ou son organisation.'
      using errcode = '42501';
  end if;
  if not private.ecrit_par_la_brique(tg_relid) then
    raise exception 'Un envoi s''écrit par les portes de la brique (preparer_envoi, annuler_envoi…), jamais directement.'
      using errcode = '42501';
  end if;
  if tg_op = 'INSERT' then
    return new;
  end if;
  if (new.id, new.client_id, new.entite_id, new.module, new.objet_type, new.objet_id, new.canal,
      new.destinataire_adresse, new.destinataire_empreinte, new.destinataire_ref, new.destinataire_membre,
      new.destinataire_fuseau, new.destinataire_territoire, new.destinataire_professionnel, new.transactionnel,
      new.direct, new.adossee, new.suivi_id, new.rang, new.cle_idempotence, new.prepare_par, new.cree_le,
      new.echeance, new.pieces)
     is distinct from
     (old.id, old.client_id, old.entite_id, old.module, old.objet_type, old.objet_id, old.canal,
      old.destinataire_adresse, old.destinataire_empreinte, old.destinataire_ref, old.destinataire_membre,
      old.destinataire_fuseau, old.destinataire_territoire, old.destinataire_professionnel, old.transactionnel,
      old.direct, old.adossee, old.suivi_id, old.rang, old.cle_idempotence, old.prepare_par, old.cree_le,
      old.echeance, old.pieces)
  then
    raise exception 'Un envoi ne change ni de destinataire, ni d''objet, ni de canal, ni d''échéance.' using errcode = '42501';
  end if;
  if (new.sujet, new.corps, new.empreinte, new.variables, new.gabarit_id, new.donnees_sante, new.espacement)
     is distinct from
     (old.sujet, old.corps, old.empreinte, old.variables, old.gabarit_id, old.donnees_sante, old.espacement)
     and old.statut <> 'a_valider' then
    raise exception 'Le contenu d''un envoi décidé ne change plus.' using errcode = '42501';
  end if;
  if new.statut is distinct from old.statut then
    if new.statut = 'envoye' and coalesce(current_setting('omega.envois_ouvrier', true), '') <> 'oui' then
      raise exception '« envoye » est réservé à l''ouvrier d''envoi, ou à la personne qui exécute un envoi manuel.'
        using errcode = '42501';
    end if;
    if not (
         (old.statut = 'a_valider' and new.statut in ('pret', 'differe', 'bloque', 'refuse', 'expire', 'annule'))
      or (old.statut = 'differe' and new.statut in ('pret', 'bloque', 'expire', 'annule'))
      or (old.statut = 'pret' and new.statut in ('en_cours', 'differe', 'bloque', 'expire', 'annule'))
      or (old.statut = 'en_cours' and new.statut in ('envoye', 'pret', 'differe', 'bloque', 'echec', 'annule', 'expire'))
    ) then
      raise exception 'Passage refusé pour un envoi : % vers %.', old.statut, new.statut using errcode = '23514';
    end if;
  end if;
  new.maj_le := now();
  return new;
end $function$
;

-- private.garder_par_les_portes()
CREATE OR REPLACE FUNCTION private.garder_par_les_portes()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
begin
  if tg_op = 'DELETE' then
    if private.effacement_en_cours(old.client_id) then
      return old;
    end if;
    raise exception 'Une preuve de la brique d''envoi ne s''efface pas : elle part avec son organisation.' using errcode = '42501';
  end if;
  if not private.ecrit_par_la_brique(tg_relid) then
    raise exception 'Cette table s''écrit par les portes de la brique d''envoi (noter_consentement, noter_opposition…).'
      using errcode = '42501';
  end if;
  return new;
end $function$
;

-- private.garder_politique()
CREATE OR REPLACE FUNCTION private.garder_politique()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
begin
  if (new.id, new.client_id, new.entite_id, new.module, new.type_action, new.libelle, new.plafond_operation,
      new.plafond_mensuel, new.nombre_mensuel, new.debut, new.fin, new.fuseau, new.demande_id, new.cree_par, new.cree_le)
     is distinct from
     (old.id, old.client_id, old.entite_id, old.module, old.type_action, old.libelle, old.plafond_operation,
      old.plafond_mensuel, old.nombre_mensuel, old.debut, old.fin, old.fuseau, old.demande_id, old.cree_par, old.cree_le)
  then
    raise exception 'Un accord permanent ne se retouche pas : révoquez-le et proposez-en un autre.' using errcode = '42501';
  end if;
  if new.statut is distinct from old.statut and not (
       (old.statut = 'a_valider' and new.statut in ('active', 'refusee', 'revoquee'))
    or (old.statut = 'active' and new.statut = 'revoquee')) then
    raise exception 'Passage refusé : % vers %.', old.statut, new.statut using errcode = '23514';
  end if;
  return new;
end $function$
;

-- private.modifier_demande(uuid,text,numeric,jsonb)
CREATE OR REPLACE FUNCTION private.modifier_demande(p_demande uuid, p_resume text DEFAULT NULL::text, p_montant numeric DEFAULT NULL::numeric, p_payload jsonb DEFAULT NULL::jsonb)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  v_uid uuid := (select auth.uid());
  v_d public.demandes_validation;
  v_resume text;
  v_montant numeric(14,2);
  v_payload jsonb;
  v_modifs jsonb := '[]'::jsonb;
  v_trace jsonb := '[]'::jsonb;
  v_cle text;
  v_nouvelle uuid;
begin
  if v_uid is null then
    raise exception 'Une modification est toujours faite par une personne connectée.' using errcode = '42501';
  end if;

  select * into v_d from public.demandes_validation where id = p_demande for update;
  if not found then
    raise exception 'Demande introuvable.' using errcode = 'P0002';
  end if;
  if not private.voit_objet_pour(v_uid, v_d.client_id, v_d.objet_type, v_d.objet_id)
     or not exists (select 1 from public.comptes c where c.user_id = v_uid and c.client_id = v_d.client_id) then
    raise exception 'Demande introuvable.' using errcode = 'P0002';
  end if;
  if v_d.statut <> 'en_attente' then
    raise exception 'Cette demande n''est plus en attente (%).', v_d.statut using errcode = '23514';
  end if;
  if v_d.demandeur_id = v_uid then
    raise exception 'Vous avez déposé cette demande : annulez-la et déposez-en une autre.' using errcode = '42501';
  end if;
  perform private.exiger_decideur(v_d, v_uid);

  v_resume := coalesce(nullif(btrim(p_resume), ''), v_d.resume);
  v_montant := coalesce(p_montant, v_d.montant);
  v_payload := v_d.payload || coalesce(p_payload, '{}'::jsonb);

  if v_resume is distinct from v_d.resume then
    v_modifs := v_modifs || jsonb_build_array(jsonb_build_object('champ', 'resume', 'avant', v_d.resume, 'apres', v_resume));
    v_trace := v_trace || jsonb_build_array(jsonb_build_object('champ', 'resume', 'avant', v_d.resume, 'apres', v_resume));
  end if;
  if v_montant is distinct from v_d.montant then
    v_modifs := v_modifs || jsonb_build_array(jsonb_build_object('champ', 'montant', 'avant', v_d.montant, 'apres', v_montant));
    v_trace := v_trace || jsonb_build_array(jsonb_build_object('champ', 'montant', 'avant', v_d.montant, 'apres', v_montant));
  end if;
  for v_cle in select jsonb_object_keys(coalesce(p_payload, '{}'::jsonb)) loop
    if (v_d.payload -> v_cle) is distinct from (v_payload -> v_cle) then
      v_modifs := v_modifs || jsonb_build_array(jsonb_build_object(
        'champ', 'payload.' || v_cle, 'avant', v_d.payload -> v_cle, 'apres', v_payload -> v_cle));
      v_trace := v_trace || jsonb_build_array(jsonb_build_object('champ', 'payload.' || v_cle));
    end if;
  end loop;
  if v_modifs = '[]'::jsonb then
    raise exception 'Aucune modification : la demande est identique.' using errcode = '22023';
  end if;

  insert into public.demandes_validation (
    client_id, entite_id, module, type_action, objet_type, objet_id, resume, montant, devise,
    payload, echeance, cle_idempotence)
  values (
    v_d.client_id, v_d.entite_id, v_d.module, v_d.type_action, v_d.objet_type, v_d.objet_id, v_resume, v_montant,
    v_d.devise, v_payload || jsonb_build_object('remplace', v_d.id, 'modifications', v_modifs),
    v_d.echeance, 'remplace:' || v_d.id::text)
  returning id into v_nouvelle;

  update public.demandes_validation set statut = 'annulee' where id = v_d.id;

  perform private.journaliser(
    v_d.client_id, 'demandes_validation.remplacement', 'demandes_validation', v_d.id::text,
    jsonb_build_object('nouvelle', v_nouvelle, 'modifications', v_trace), v_d.entite_id);
  return v_nouvelle;
end $function$
;

-- private.politique_couvrante(uuid,text,text,uuid,numeric,timestamp with time zone)
CREATE OR REPLACE FUNCTION private.politique_couvrante(p_client uuid, p_module text, p_type text, p_entite uuid, p_montant numeric, p_instant timestamp with time zone)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  r record;
  v_debut_mois timestamptz;
  v_cumul numeric;
  v_nombre integer;
begin
  if p_type = 'politique.activer'
     or exists (select 1 from private.actions_sans_accord a where a.module = p_module and a.type_action = p_type) then
    return null;
  end if;
  for r in
    select p.id, p.fuseau, p.plafond_mensuel, p.nombre_mensuel
    from public.politiques p
    where p.client_id = p_client and p.module = p_module and p.type_action = p_type
      and p.statut = 'active' and p_instant >= p.debut and p_instant < p.fin
      and (p.entite_id is null or p.entite_id is not distinct from p_entite)
      and ((p.plafond_operation is null and p_montant is null)
           or (p.plafond_operation is not null and p_montant is not null and p_montant <= p.plafond_operation))
    order by (p.entite_id is not null) desc, p.plafond_operation asc nulls last, p.id
    for update
  loop
    v_debut_mois := date_trunc('month', p_instant at time zone r.fuseau) at time zone r.fuseau;
    select coalesce(sum(d.montant), 0), count(*) into v_cumul, v_nombre
    from public.demandes_validation d
    where d.politique_id = r.id and d.cree_le >= v_debut_mois and d.statut in ('approuvee', 'executee');
    if (r.plafond_mensuel is null or v_cumul + coalesce(p_montant, 0) <= r.plafond_mensuel)
       and (r.nombre_mensuel is null or v_nombre + 1 <= r.nombre_mensuel) then
      return r.id;
    end if;
  end loop;
  return null;
end $function$
;

-- private.preparer_approbation()
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
    -- Lot 19af : un gérant seul décideur active lui-même un accord permanent de la liste blanche.
    if private.activation_par_seul_decideur(v_d, new.au_nom_de, v_uid) then
      new.commentaire := case when coalesce(new.commentaire, '') like '[seul décideur]%' then new.commentaire
                              else left('[seul décideur] ' || coalesce(new.commentaire, ''), 2000) end;
    else
      raise exception 'Le demandeur ne décide pas de sa propre demande.' using errcode = '42501';
    end if;
  end if;
  -- Lot 19c : celui qui a saisi ou corrigé la pièce (payload.saisi_par, tableau d'identifiants) ne l'approuve pas.
  if jsonb_typeof(v_d.payload -> 'saisi_par') = 'array'
     and (v_d.payload -> 'saisi_par' ? v_uid::text or v_d.payload -> 'saisi_par' ? v_decideur::text) then
    raise exception 'Celui qui a saisi la pièce ne l''approuve pas : une autre personne décide.' using errcode = '42501';
  end if;
  perform private.exiger_decideur(v_d, v_decideur);
  if not private.voit_objet_pour(v_uid, v_d.client_id, v_d.objet_type, v_d.objet_id) then
    raise exception 'Vous n''avez pas accès à l''objet de cette demande.' using errcode = '42501';
  end if;
  return new;
end $function$
;

-- private.preparer_expediteur()
CREATE OR REPLACE FUNCTION private.preparer_expediteur()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  v_f private.fournisseurs_envoi;
begin
  select * into v_f from private.fournisseurs_envoi f where f.fournisseur = new.fournisseur;
  if v_f.fournisseur is null then
    raise exception 'Fournisseur inconnu : %.', new.fournisseur using errcode = '22023';
  end if;
  if v_f.canal is not null and v_f.canal <> new.canal then
    raise exception 'Le fournisseur % porte le canal %, pas %.', new.fournisseur, v_f.canal, new.canal using errcode = '22023';
  end if;
  if v_f.automatique and new.canal in ('email', 'lre') then
    new.identite := private.normaliser_email(new.identite);
    if new.identite is null then
      raise exception 'L''identité d''un expéditeur de courriel est une adresse valide.' using errcode = '22023';
    end if;
  end if;
  if new.repondre_a is not null then
    new.repondre_a := private.normaliser_email(new.repondre_a);
    if new.repondre_a is null then
      raise exception 'Adresse de réponse invalide.' using errcode = '22023';
    end if;
  end if;
  if new.fournisseur = 'meta_whatsapp' and nullif(new.parametres ->> 'phone_number_id', '') is null then
    raise exception 'WhatsApp Cloud API : parametres.phone_number_id est nécessaire.' using errcode = '22023';
  end if;
  if new.fournisseur = 'ar24' and nullif(new.parametres ->> 'id_utilisateur', '') is null then
    raise exception 'AR24 : parametres.id_utilisateur (le compte expéditeur) est nécessaire.' using errcode = '22023';
  end if;
  if new.fournisseur in ('gmail', 'microsoft') and new.secret_nom is null then
    raise exception 'Une boîte déléguée garde son jeton dans le coffre : secret_nom est nécessaire.' using errcode = '22023';
  end if;
  if new.statut = 'actif' and (tg_op = 'INSERT' or old.statut is distinct from 'actif') then
    new.verifie_le := coalesce(new.verifie_le, now());
  end if;
  new.maj_le := now();
  return new;
end $function$
;

-- private.preparer_politique()
CREATE OR REPLACE FUNCTION private.preparer_politique()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
begin
  if exists (select 1 from private.actions_sans_accord a where a.module = new.module and a.type_action = new.type_action) then
    raise exception 'Cette action ne se donne jamais par accord permanent : une personne décide chaque fois.'
      using errcode = '42501';
  end if;
  new.statut := 'a_valider';
  new.cree_par := (select auth.uid());
  new.cree_le := now();
  new.active_le := null;
  new.revoquee_le := null;
  new.revoquee_par := null;
  new.motif_revocation := null;
  new.demande_id := gen_random_uuid();
  if new.fin <= now() then
    raise exception 'Un accord permanent finit dans le futur.' using errcode = '22023';
  end if;
  return new;
end $function$
;

-- private.publier_envoi(envois,text)
CREATE OR REPLACE FUNCTION private.publier_envoi(p_e envois, p_issue text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
begin
  perform private.publier_evenement(p_e.client_id, 'envoi.' || p_issue || '.' || p_e.module,
    jsonb_build_object('envoi', p_e.id, 'module', p_e.module, 'objet_type', p_e.objet_type, 'objet_id', p_e.objet_id,
                       'canal', p_e.canal, 'mode', p_e.mode, 'statut', p_e.statut, 'verrou', p_e.verrou,
                       'suivi', p_e.suivi_id, 'rang', p_e.rang),
    p_e.id::text || ':' || p_issue);
end $function$
;

-- private.reglages_envois_effectifs(uuid,text)
CREATE OR REPLACE FUNCTION private.reglages_envois_effectifs(p_client uuid, p_module text)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  c public.reglages_envois;
  m public.reglages_envois;
begin
  select * into c from public.reglages_envois r where r.client_id = p_client and r.module is null;
  select * into m from public.reglages_envois r where r.client_id = p_client and r.module = p_module;
  return jsonb_build_object(
    'mode', case when c.mode = 'coupe' or m.mode = 'coupe' then 'coupe'
                 when m.mode is null then null
                 when c.mode = 'essai' or m.mode = 'essai' then 'essai'
                 else 'reel' end,
    'essai_adresse', coalesce(m.essai_adresse, c.essai_adresse),
    'plages', coalesce(m.plages, c.plages, '[{"jours":[1,2,3,4,5],"debut":"08:00","fin":"19:00"}]'::jsonb),
    'feries', coalesce(m.feries, c.feries, false),
    'delai_min', coalesce(m.delai_min, c.delai_min, interval '3 days'),
    'plafond_destinataire_jour', coalesce(m.plafond_destinataire_jour, c.plafond_destinataire_jour, 5),
    'plafond_jour', coalesce(m.plafond_jour, 200),
    'plafond_jour_organisation', coalesce(c.plafond_jour, 500),
    'fenetre_doublon', coalesce(m.fenetre_doublon, c.fenetre_doublon, interval '7 days'),
    'canaux_organisation', to_jsonb(c.canaux),
    'canaux_module', to_jsonb(m.canaux),
    'pause_reponse', coalesce(m.pause_reponse, c.pause_reponse, interval '14 days'),
    'pause_sensible', coalesce(m.pause_sensible, c.pause_sensible, interval '30 days'),
    'sante', coalesce(c.sante, false) or coalesce(m.sante, false));
end $function$
;

-- private.resoudre_destinataire(uuid,text,jsonb,uuid)
CREATE OR REPLACE FUNCTION private.resoudre_destinataire(p_client uuid, p_canal text, p_destinataire jsonb, p_entite uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  d jsonb := p_destinataire;
  v_forme text := (select c.adresse from private.canaux_envoi c where c.canal = p_canal);
  v_cle text;
  v_membre uuid;
  v_email text;
  v_tel text;
  v_adresse text;
  v_manque text;
  v_fuseau text;
  v_territoire text;
  v_entite uuid;
  v_fuseau_entite text;
  v_territoire_entite text;
  v_numero jsonb;
begin
  if d is null or jsonb_typeof(d) <> 'object' then
    raise exception 'Le destinataire est un objet JSON : {"membre": …} ou {"adresse": …}.' using errcode = '22023';
  end if;
  for v_cle in select jsonb_object_keys(d) loop
    if v_cle not in ('membre', 'adresse', 'nom', 'ref', 'fuseau', 'territoire', 'professionnel', 'langue') then
      raise exception 'Clé inconnue dans le destinataire : « % ».', v_cle using errcode = '22023';
    end if;
  end loop;
  if (d ? 'membre') = (d ? 'adresse') then
    raise exception 'Le destinataire est un membre de l''organisation ou une adresse, l''un ou l''autre.' using errcode = '22023';
  end if;

  if d ? 'membre' then
    begin
      v_membre := (d ->> 'membre')::uuid;
    exception when others then
      raise exception 'Le membre se désigne par son identifiant.' using errcode = '22023';
    end;
    if not exists (select 1 from public.comptes c where c.client_id = p_client and c.user_id = v_membre) then
      raise exception 'Ce membre n''appartient pas à l''organisation.' using errcode = '22023';
    end if;
    select u.email, u.phone into v_email, v_tel from auth.users u where u.id = v_membre;
    v_adresse := case v_forme
      when 'email' then private.normaliser_email(v_email)
      else private.normaliser_telephone(case when nullif(v_tel, '') is null then null else '+' || ltrim(v_tel, '+') end) end;
    if v_adresse is null then
      v_manque := case v_forme when 'email' then 'Ce membre n''a pas d''adresse électronique valide.'
                               else 'Ce membre n''a pas de numéro de téléphone valide.' end;
    end if;
  else
    v_adresse := private.normaliser_adresse(p_canal, d ->> 'adresse');
    if v_adresse is null then
      raise exception 'Adresse invalide pour le canal %.', p_canal using errcode = '22023';
    end if;
  end if;

  -- Le fuseau et le calendrier du destinataire, dans cet ordre : ceux que l'on
  -- donne ; sinon ceux que dit son numéro (l'outre-mer a son indicatif) ;
  -- sinon ceux de l'entité qui écrit. Le calendrier de l'entité ne vaut que si
  -- le destinataire est à la même heure. Jamais la métropole supposée.
  select e.id, e.fuseau into v_entite, v_fuseau_entite from public.entites e
  where e.client_id = p_client and (e.id = p_entite or (p_entite is null and e.principale));
  v_territoire_entite := private.territoire_de_entite(p_client, v_entite);
  if d ? 'territoire' then
    select t.code, t.fuseau into v_territoire, v_fuseau from public.territoires t where t.code = d ->> 'territoire';
    if v_territoire is null then
      raise exception 'Territoire inconnu : %.', d ->> 'territoire' using errcode = '22023';
    end if;
  end if;
  if d ? 'fuseau' then
    if not exists (select 1 from pg_catalog.pg_timezone_names z where z.name = d ->> 'fuseau') then
      raise exception 'Fuseau horaire inconnu : %.', d ->> 'fuseau' using errcode = '22023';
    end if;
    v_fuseau := d ->> 'fuseau';
    v_territoire := coalesce(v_territoire, private.territoire_du_fuseau(v_fuseau));
  end if;
  if v_fuseau is null and v_forme = 'telephone' and v_adresse is not null then
    v_numero := private.fuseau_du_numero(v_adresse);
    v_fuseau := v_numero ->> 'fuseau';
    v_territoire := v_numero ->> 'territoire';
  end if;
  if v_fuseau is null then
    v_fuseau := coalesce(v_fuseau_entite, 'Europe/Paris');
  end if;
  if v_territoire is null
     and (select t.fuseau from public.territoires t where t.code = v_territoire_entite) = v_fuseau then
    v_territoire := v_territoire_entite;
  end if;
  if d ? 'langue' and coalesce(d ->> 'langue', '') !~ '^[a-z]{2}$' then
    raise exception 'La langue du destinataire s''écrit en deux lettres (fr, en…).' using errcode = '22023';
  end if;
  if d ? 'professionnel' and jsonb_typeof(d -> 'professionnel') <> 'boolean' then
    raise exception '« professionnel » vaut true ou false.' using errcode = '22023';
  end if;

  return jsonb_build_object(
    'adresse', v_adresse,
    'nom', left(nullif(btrim(d ->> 'nom'), ''), 200),
    'ref', left(nullif(btrim(d ->> 'ref'), ''), 200),
    'membre', v_membre,
    'fuseau', v_fuseau,
    'territoire', v_territoire,
    'professionnel', coalesce((d ->> 'professionnel')::boolean, v_membre is not null),
    'langue', coalesce(d ->> 'langue', 'fr'),
    'manque', v_manque);
end $function$
;


/* ─── Relevés complémentaires (recette, 06/10/2026 ~16 h 25 Z) ───────────────────────────────────────────
public.travaux, contraintes :
  travaux_cle_check : CHECK (char_length(cle) <= 200)
  travaux_erreur_check : CHECK (char_length(erreur) <= 2000)
  travaux_essais_max_check : CHECK (essais_max between 1 and 20)
  travaux_etat_check : CHECK (etat in ('a_faire','en_cours','fait','echec'))
  travaux_genre_check : CHECK (genre ~ '^[a-z][a-z0-9_.]{2,80}$')
  travaux_module_check : CHECK (module ~ '^[a-z][a-z_]{1,29}$')
  travaux_pris_par_check : CHECK (char_length(pris_par) <= 120)
public.envois, statut : CHECK (statut in ('a_valider','differe','pret','en_cours','envoye','bloque','refuse','annule','expire','echec'))
  canal in ('email','whatsapp','sms','lre','appel') ; mode in ('essai','reel') ;
  remise in ('remis','rebond_temporaire','rebond','plainte','refuse') ; reference_externe ≤ 300 car.
private.fournisseurs_envoi (fournisseur, canal, automatique, branche, agree_sante, note) :
  brevo email branche=t ; manuel (canal null) branche=t automatique=f ;
  gmail email branche=f ; microsoft email branche=f ; scaleway_tem email f ; meta_whatsapp whatsapp f ;
  brevo_sms sms f ; ovh_sms sms f ; ar24 lre f. Aucun agree_sante.
private.canaux_envoi : email (sujet obligatoire, pièces, permis_sante), lre, appel (plages démarchage),
  whatsapp (consentement toujours), sms (permis_sante = false, D6).
private.modules_envois : une seule ligne — tiroma, sante = true, canaux {email,whatsapp,appel}.
Fonctions qui citent 'envoye' : garder_envoi, verrous_envoi, confirmer_envoi, marquer_envoi_manuel,
  loc_envoi_issue, tiroma_indicateurs_semaine, btp_preparer_decompte / btp_envoyer_decompte /
  btp_repondre_decompte (public). Aucune vue.
supabase_vault : 0.3.1
───────────────────────────────────────────────────────────────────────────────────────────────────────── */
