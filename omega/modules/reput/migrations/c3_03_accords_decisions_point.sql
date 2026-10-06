-- c3_03 — REPUT : l'accord permanent par sujet, Valider / Corriger / Refuser, le point du matin (session C3, 06/10/2026)
--
-- CE QUE ÇA TIENT. Règle de fond du coordinateur : la réponse ne part seule QUE sur les sujets que le client a
-- autorisés d'avance, par un accord permanent du socle (public.politiques), sujet par sujet. Le reste attend
-- la validation d'une personne, qui valide, corrige ou refuse. Chaque matin, le point dit : demandes reçues,
-- en attente, répondues.
--
-- CE QUI EST POSÉ.
--   · L'accord par sujet (mécanisme du socle, comme b6_08) :
--       reput_donner_accord(p_client, p_sujet, p_entite)  gérant ou admin (une personne) : propose une politique
--         module reput, type_action « reput.repondre.<sujet> », nombre_mensuel 1000, un an. Le socle dépose la
--         demande d'activation (politique.activer) ; la règle reput / politique.activer l'ouvre aux gérants,
--         admins et valideurs (le demandeur exclu, socle).
--       reput_activer_accord_seul(p_client, p_sujet)       le gérant SEUL décideur l'active lui-même (lot 19af :
--         (reput, reput.repondre.<sujet>) inscrit dans private.activation_seul_autorisee pour les sujets autorisables
--         par défaut).
--       reput_revoquer_accord(p_client, p_sujet, p_motif)   gérant ou admin : private.revoquer_politique du socle.
--       reput_accords(p_client)                            l'état, sujet par sujet (membres de l'organisation).
--     Garde (déclencheur BEFORE INSERT sur public.politiques, module reput seulement) : une politique REPUT ne
--     porte que sur « reput.repondre.<sujet> » d'un sujet actif ET autorisable. Jamais reput.transferer, jamais
--     réclamation, urgence, humain, litige, autre — même par un INSERT direct du gérant.
--   · Décider :
--       reput_decider(p_reponse, p_decision, p_motif)     valider | refuser, par une personne de décision : une
--         approbation du socle à son nom (la file reste la seule voie), puis la synchronisation immédiate.
--       reput_corriger(p_reponse, p_corps, p_objet)        la personne réécrit le message : l'ancienne version est
--         rejetée dans la file (commentaire « corrigée »), une version n+1 (redigee_par = la personne) est
--         redéposée par le serveur dans la minute (travail reput.redeposer), demandeur « système » : la même
--         personne peut alors la valider.
--   · Le point du matin : section « Demandes clients : reçues, en attente, répondues » pour le gérant et les
--     valideurs, dès 5 h (Paris), cron reput-matin toutes les 30 minutes.
--
-- Règles de pose : create … if not exists / create or replace / on conflict ; ni DROP ni DELETE.

-- ─────────────────────────────────────────────────────────────────────────
-- La garde sur les politiques REPUT
-- ─────────────────────────────────────────────────────────────────────────
create or replace function private.reput_garder_politique()
 returns trigger
 language plpgsql
 security definer
 set search_path to ''
as $function$
declare
  v_sujet text;
begin
  if new.module is distinct from 'reput' then
    return new;
  end if;
  if new.type_action !~ '^reput\.repondre\.[a-z][a-z0-9_]{1,39}$' then
    raise exception 'Un accord permanent REPUT porte sur « reput.repondre.<sujet> », jamais sur « % ».', new.type_action
      using errcode = '42501';
  end if;
  v_sujet := substr(new.type_action, char_length('reput.repondre.') + 1);
  if v_sujet = any (private.reput_sujets_proteges())
     or not exists (select 1 from public.reput_sujets s
                    where s.client_id = new.client_id and s.code = v_sujet and s.actif and s.autorisable) then
    raise exception 'Le sujet « % » ne peut pas partir sans relecture : réclamations, urgences, demandes de parler à quelqu''un et hors sujet sont toujours relues.', v_sujet
      using errcode = '42501';
  end if;
  return new;
end $function$;

do $do$ begin
  if not exists (select 1 from pg_trigger t where t.tgrelid = 'public.politiques'::regclass and t.tgname = 'politiques_reput_garde') then
    create trigger politiques_reput_garde before insert on public.politiques
      for each row execute function private.reput_garder_politique();
  end if;
end $do$;

-- Le gérant seul décideur active lui-même l'accord d'un sujet autorisable par défaut (lot 19af).
do $do$ begin
  if to_regclass('private.activation_seul_autorisee') is not null then
    insert into private.activation_seul_autorisee (module, type_action, note)
    select 'reput', 'reput.repondre.' || d.code, 'Accord permanent REPUT, sujet « ' || d.libelle || ' » (c3_03)'
    from private.reput_sujets_defaut() d
    where not (d.code = any (private.reput_sujets_proteges()))
    on conflict (module, type_action) do nothing;
  end if;
end $do$;

-- ─────────────────────────────────────────────────────────────────────────
-- L'état des accords
-- ─────────────────────────────────────────────────────────────────────────
create or replace function private.reput_accords_etat(p_client uuid)
 returns jsonb
 language sql
 stable security definer
 set search_path to ''
as $function$
  with p as (
    select p.*, row_number() over (partition by p.type_action
                                   order by (p.statut = 'active' and now() >= p.debut and now() < p.fin) desc,
                                            (p.statut = 'a_valider') desc, p.cree_le desc) as rang
    from public.politiques p
    where p.client_id = p_client and p.module = 'reput' and p.type_action like 'reput.repondre.%'
  )
  select coalesce(jsonb_agg(jsonb_build_object(
           'sujet', s.code, 'libelle', s.libelle, 'autorisable', s.autorisable, 'actif', s.actif,
           'politique', p.id,
           'statut', case when p.id is null then 'aucun'
                          when p.statut = 'active' and p.fin <= now() then 'expire'
                          else p.statut end,
           'debut', p.debut, 'fin', p.fin, 'entite', p.entite_id, 'active_le', p.active_le,
           'donne_par_libelle', (select u.email from auth.users u where u.id = p.cree_par),
           'demande_activation', p.demande_id,
           'demande_activation_statut', (select d.statut from public.demandes_validation d where d.id = p.demande_id),
           'revoquee_le', p.revoquee_le, 'motif_revocation', p.motif_revocation,
           'envoyees_seules_mois', (select count(*) from public.demandes_validation d
                                    where d.politique_id = p.id
                                      and d.cree_le >= date_trunc('month', now() at time zone 'Europe/Paris') at time zone 'Europe/Paris'),
           'nombre_mensuel', p.nombre_mensuel)
         order by s.ordre, s.code), '[]'::jsonb)
  from public.reput_sujets s
  left join p on p.type_action = 'reput.repondre.' || s.code and p.rang = 1
  where s.client_id = p_client
$function$;

create or replace function public.reput_accords(p_client uuid)
 returns jsonb
 language plpgsql
 stable security definer
 set search_path to ''
as $function$
declare
  v_uid uuid := (select auth.uid());
begin
  if not private.reput_est_serveur() and (v_uid is null or p_client not in (select private.mes_clients())) then
    raise exception 'Les accords se lisent par les membres de l''organisation.' using errcode = '42501';
  end if;
  return jsonb_build_object(
    'sujets', private.reput_accords_etat(p_client),
    'peut_donner', v_uid is not null and private.a_un_role(p_client, array['gerant', 'admin']),
    'seul_decideur', v_uid is not null and to_regprocedure('private.seul_decideur(uuid, uuid)') is not null
                     and private.reput_seul_decideur(p_client, v_uid));
end $function$;

-- private.seul_decideur (19af) quand il existe ; sinon le décompte des comptes de décision.
create or replace function private.reput_seul_decideur(p_client uuid, p_user uuid)
 returns boolean
 language plpgsql
 stable security definer
 set search_path to ''
as $function$
declare
  v boolean;
begin
  if to_regprocedure('private.seul_decideur(uuid, uuid)') is not null then
    execute 'select private.seul_decideur($1, $2)' into v using p_client, p_user;
    return coalesce(v, false);
  end if;
  return exists (select 1 from public.comptes c where c.client_id = p_client and c.user_id = p_user and c.role in ('gerant', 'admin'))
     and not exists (select 1 from public.comptes c where c.client_id = p_client and c.user_id <> p_user
                     and c.role in ('gerant', 'admin', 'valideur'));
end $function$;

-- ─────────────────────────────────────────────────────────────────────────
-- Donner, activer seul, révoquer
-- ─────────────────────────────────────────────────────────────────────────
create or replace function public.reput_donner_accord(p_client uuid, p_sujet text, p_entite uuid default null)
 returns jsonb
 language plpgsql
 security definer
 set search_path to ''
as $function$
declare
  v_uid uuid := (select auth.uid());
  s public.reput_sujets;
  v_type text;
  v_id uuid;
begin
  if v_uid is null or not private.a_un_role(p_client, array['gerant', 'admin']) then
    raise exception 'Un accord permanent se donne par le gérant ou un administrateur.' using errcode = '42501';
  end if;
  select * into s from public.reput_sujets x where x.client_id = p_client and x.code = lower(btrim(p_sujet));
  if s.id is null then
    raise exception 'Sujet inconnu : %.', p_sujet using errcode = 'P0002';
  end if;
  if not s.autorisable or not s.actif then
    raise exception 'Le sujet « % » ne peut pas partir sans relecture.', s.libelle using errcode = '42501';
  end if;
  if p_entite is not null and not exists (select 1 from public.entites e where e.client_id = p_client and e.id = p_entite) then
    raise exception 'Entité introuvable dans cette organisation.' using errcode = '22023';
  end if;
  v_type := 'reput.repondre.' || s.code;
  perform pg_advisory_xact_lock(hashtextextended('reput.accord:' || p_client::text || ':' || s.code, 0));
  -- Deux personnes : l'activation est ouverte aux gérants, admins et valideurs (le demandeur exclu par le socle).
  insert into public.regles_validation (client_id, entite_id, module, type_action, approbations_requises, roles_autorises, actif)
  select p_client, null, 'reput', 'politique.activer', 1, array['gerant', 'admin', 'valideur'], true
  where not exists (select 1 from public.regles_validation r
                    where r.client_id = p_client and r.module = 'reput' and r.type_action = 'politique.activer'
                      and r.entite_id is null and r.actif);
  if not exists (select 1 from public.politiques p
                 where p.client_id = p_client and p.module = 'reput' and p.type_action = v_type
                   and p.entite_id is not distinct from p_entite
                   and (p.statut = 'a_valider' or (p.statut = 'active' and p.fin > now() + interval '30 days'))) then
    insert into public.politiques (client_id, entite_id, module, type_action, libelle, nombre_mensuel, debut, fin)
    values (p_client, p_entite, 'reput', v_type,
            left('Accord permanent : réponses « ' || s.libelle || ' » envoyées sans relecture', 200),
            1000, now(), now() + interval '365 days')
    returning id into v_id;
    perform private.journaliser_module(p_client, 'reput', 'reput.accord_donne', 'reput_sujets', s.id::text,
      jsonb_build_object('sujet', s.code, 'politique', v_id, 'entite', p_entite, 'par', v_uid), p_entite);
  end if;
  return jsonb_build_object('sujet', s.code, 'proposee', v_id, 'sujets', private.reput_accords_etat(p_client));
end $function$;

create or replace function public.reput_activer_accord_seul(p_client uuid, p_sujet text)
 returns jsonb
 language plpgsql
 security definer
 set search_path to ''
as $function$
declare
  v_uid uuid := (select auth.uid());
  v_email text;
  v_trace text;
  r record;
  v_n integer := 0;
begin
  if v_uid is null or not private.a_un_role(p_client, array['gerant', 'admin']) then
    raise exception 'Seul le gérant active lui-même un accord permanent.' using errcode = '42501';
  end if;
  perform pg_advisory_xact_lock(hashtextextended('reput.accord:' || p_client::text || ':' || lower(btrim(p_sujet)), 0));
  perform 1 from public.comptes c where c.client_id = p_client for share;
  if not private.reput_seul_decideur(p_client, v_uid) then
    raise exception 'Un autre décideur existe dans l''organisation : l''accord s''active par lui, dans « À valider ».' using errcode = '42501';
  end if;
  select u.email into v_email from auth.users u where u.id = v_uid;
  v_trace := format('activé par le seul décideur de l''organisation, %s, %s', coalesce(v_email, v_uid::text),
                    to_char(now() at time zone 'Europe/Paris', 'DD/MM/YYYY HH24:MI'));
  for r in
    select p.id as politique, p.demande_id
    from public.politiques p
    join public.demandes_validation d on d.id = p.demande_id
    where p.client_id = p_client and p.module = 'reput' and p.type_action = 'reput.repondre.' || lower(btrim(p_sujet))
      and p.statut = 'a_valider' and d.type_action = 'politique.activer' and d.statut = 'en_attente'
  loop
    insert into public.approbations (demande_id, client_id, user_id, decision, commentaire)
    values (r.demande_id, p_client, v_uid, 'approuve', left(v_trace, 2000));
    v_n := v_n + 1;
  end loop;
  if v_n > 0 then
    perform private.journaliser_module(p_client, 'reput', 'reput.accord_active_seul', 'reput_sujets',
      (select s.id::text from public.reput_sujets s where s.client_id = p_client and s.code = lower(btrim(p_sujet))),
      jsonb_build_object('sujet', lower(btrim(p_sujet)), 'politiques', v_n, 'trace', v_trace), null);
  end if;
  return jsonb_build_object('activees', v_n, 'trace', v_trace, 'sujets', private.reput_accords_etat(p_client));
end $function$;

create or replace function public.reput_revoquer_accord(p_client uuid, p_sujet text, p_motif text default null)
 returns jsonb
 language plpgsql
 security definer
 set search_path to ''
as $function$
declare
  r record;
  v_n integer := 0;
begin
  if (select auth.uid()) is null or not private.a_un_role(p_client, array['gerant', 'admin']) then
    raise exception 'Un accord permanent se révoque par le gérant ou un administrateur.' using errcode = '42501';
  end if;
  for r in select p.id from public.politiques p
           where p.client_id = p_client and p.module = 'reput' and p.type_action = 'reput.repondre.' || lower(btrim(p_sujet))
             and p.statut in ('a_valider', 'active')
  loop
    perform private.revoquer_politique(r.id, left(coalesce(nullif(btrim(p_motif), ''), 'Accord REPUT révoqué'), 500));
    v_n := v_n + 1;
  end loop;
  if v_n > 0 then
    perform private.journaliser_module(p_client, 'reput', 'reput.accord_revoque', 'reput_sujets',
      coalesce((select s.id::text from public.reput_sujets s where s.client_id = p_client and s.code = lower(btrim(p_sujet))), p_sujet),
      jsonb_build_object('sujet', lower(btrim(p_sujet)), 'politiques', v_n, 'motif', p_motif), null);
  end if;
  return jsonb_build_object('revoquees', v_n, 'sujets', private.reput_accords_etat(p_client));
end $function$;

-- ─────────────────────────────────────────────────────────────────────────
-- Valider, refuser, corriger
-- ─────────────────────────────────────────────────────────────────────────
create or replace function public.reput_decider(p_reponse uuid, p_decision text, p_motif text default null)
 returns jsonb
 language plpgsql
 security definer
 set search_path to ''
as $function$
declare
  v_uid uuid := (select auth.uid());
  p public.reput_reponses;
  v_statut text;
begin
  select * into p from public.reput_reponses x where x.id = p_reponse;
  if p.id is null or v_uid is null or not private.a_un_role(p.client_id, array['gerant', 'admin', 'valideur'])
     or not private.perimetre_couvre(v_uid, p.client_id, p.entite_id) then
    raise exception 'Une réponse se valide ou se refuse par le gérant, un administrateur ou un valideur de son périmètre.' using errcode = '42501';
  end if;
  if p_decision not in ('valider', 'refuser') then
    raise exception 'Décision : valider ou refuser.' using errcode = '22023';
  end if;
  if p.statut <> 'a_valider' or p.demande_validation_id is null then
    raise exception 'Cette réponse n''attend plus de décision (%).', p.statut using errcode = '23514';
  end if;
  if p_decision = 'refuser' and nullif(btrim(p_motif), '') is null then
    raise exception 'Refuser une réponse dit pourquoi.' using errcode = '22023';
  end if;
  insert into public.approbations (demande_id, client_id, user_id, decision, commentaire)
  values (p.demande_validation_id, p.client_id, v_uid, case p_decision when 'valider' then 'approuve' else 'rejete' end,
          nullif(left(btrim(p_motif), 2000), ''));
  perform private.reput_synchroniser(p.client_id);
  select x.statut into v_statut from public.reput_reponses x where x.id = p.id;
  return jsonb_build_object('reponse', p.id, 'statut', v_statut,
    'demande', (select to_jsonb(d) - 'adresse_reponse' from public.reput_demandes d where d.id = p.demande_id));
end $function$;

create or replace function public.reput_corriger(p_reponse uuid, p_corps text, p_objet text default null)
 returns jsonb
 language plpgsql
 security definer
 set search_path to ''
as $function$
declare
  v_uid uuid := (select auth.uid());
  p public.reput_reponses;
  n public.reput_reponses;
begin
  select * into p from public.reput_reponses x where x.id = p_reponse for update;
  if p.id is null or v_uid is null or not private.a_un_role(p.client_id, array['gerant', 'admin', 'valideur'])
     or not private.perimetre_couvre(v_uid, p.client_id, p.entite_id) then
    raise exception 'Une réponse se corrige par le gérant, un administrateur ou un valideur de son périmètre.' using errcode = '42501';
  end if;
  if p.statut not in ('a_valider', 'sans_envoi') then
    raise exception 'Cette réponse n''est plus à corriger (%).', p.statut using errcode = '23514';
  end if;
  if nullif(btrim(p_corps), '') is null or char_length(p_corps) > 5000 then
    raise exception 'Le message corrigé fait de 1 à 5 000 caractères.' using errcode = '22023';
  end if;
  -- L'ancienne version sort du circuit : remplacée ici, rejetée dans la file (une personne, en son nom).
  update public.reput_reponses x set statut = 'remplacee', maj_le = now() where x.id = p.id;
  if p.demande_validation_id is not null
     and (select d.statut from public.demandes_validation d where d.id = p.demande_validation_id) = 'en_attente' then
    insert into public.approbations (demande_id, client_id, user_id, decision, commentaire)
    values (p.demande_validation_id, p.client_id, v_uid, 'rejete', 'Corrigée : une nouvelle version la remplace.');
  end if;
  insert into public.reput_reponses (client_id, entite_id, demande_id, version, sujet, langue, couverte, objet, brouillon, corps,
    sources, raison, type_action, statut, redigee_par, modele, version_ouvrier)
  values (p.client_id, p.entite_id, p.demande_id,
          (select max(x.version) + 1 from public.reput_reponses x where x.demande_id = p.demande_id),
          p.sujet, p.langue, p.couverte,
          case when p.objet is not null then left(coalesce(nullif(btrim(p_objet), ''), p.objet), 300) end,
          left(btrim(p_corps), 4000), btrim(p_corps), p.sources, 'Corrigée par une personne.',
          -- Une réponse réécrite par une personne repasse toujours par la file : jamais d'envoi seul.
          'reput.transferer', 'a_valider', v_uid, null, 'correction')
  returning * into n;
  update public.reput_demandes d set statut = 'a_valider', motif = null, maj_le = now() where d.id = p.demande_id;
  perform private.deposer_travail(p.client_id, 'reput', 'reput.redeposer', jsonb_build_object('reponse', n.id),
                                  'reponse:' || n.id::text, 5::smallint);
  perform private.journaliser_module(p.client_id, 'reput', 'reput.reponse_corrigee', 'reput_demandes', p.demande_id::text,
    jsonb_build_object('remplacee', p.id, 'reponse', n.id, 'version', n.version, 'par', v_uid), p.entite_id);
  return jsonb_build_object('reponse', n.id, 'version', n.version, 'statut', n.statut, 'remplacee', p.id);
end $function$;

-- Le serveur redépose une version corrigée : demande de validation (demandeur « système ») et envoi adossé.
create or replace function private.reput_redeposer(p_reponse uuid)
 returns jsonb
 language plpgsql
 security definer
 set search_path to ''
as $function$
declare
  p public.reput_reponses;
  d public.reput_demandes;
  v_dv uuid;
  v_envoi uuid;
  v_e public.envois;
  v_erreur text;
  v_libelle text;
begin
  select * into p from public.reput_reponses x where x.id = p_reponse for update;
  if p.id is null or p.statut <> 'a_valider' or p.demande_validation_id is not null then
    return jsonb_build_object('ignore', 'réponse absente, déjà déposée ou plus à valider');
  end if;
  select * into d from public.reput_demandes x where x.id = p.demande_id;
  select s.libelle into v_libelle from public.reput_sujets s where s.client_id = p.client_id and s.code = p.sujet;
  begin
    insert into public.demandes_validation (client_id, entite_id, module, type_action, objet_type, objet_id, resume, payload,
                                            echeance, cle_idempotence)
    values (p.client_id, p.entite_id, 'reput', p.type_action, 'reput_demandes', d.id::text,
            left(format('Réponse corrigée à %s — %s', coalesce(nullif(btrim(d.de_nom), ''), coalesce(d.adresse_reponse, 'un client')),
                        coalesce(v_libelle, p.sujet)), 500),
            jsonb_build_object('reponse', p.id, 'demande', d.id, 'sujet', p.sujet, 'couverte', p.couverte, 'version', p.version,
                               'canal', d.canal_reponse, 'langue', p.langue, 'objet', p.objet, 'corps', p.corps,
                               'redigee_par', p.redigee_par),
            now() + interval '7 days', 'reput:reponse:' || p.id::text)
    returning id into v_dv;
    if d.canal_reponse is not null then
      v_envoi := private.preparer_envoi(p.client_id, 'reput', 'reput_demandes', d.id::text, d.canal_reponse,
        jsonb_build_object('adresse', d.adresse_reponse, 'nom', d.de_nom, 'langue', p.langue, 'professionnel', false),
        null, '{}'::jsonb, p.objet, p.corps, null::uuid[], 'reput:envoi:' || p.id::text, p.entite_id,
        true, false, null::timestamptz, jsonb_build_object('demande', v_dv));
      select * into v_e from public.envois e where e.id = v_envoi;
    end if;
  exception when others then
    v_erreur := left(sqlstate || ' ' || sqlerrm, 500);
    v_dv := null; v_envoi := null; v_e := null;
  end;
  update public.reput_reponses x set demande_validation_id = v_dv, envoi_id = v_envoi,
         statut = case when v_erreur is not null or v_envoi is null then 'sans_envoi'
                       when v_e.statut in ('bloque', 'refuse', 'annule', 'expire', 'echec') then 'bloquee' else 'a_valider' end,
         raison = case when v_erreur is not null then 'Dépôt impossible : ' || v_erreur else x.raison end, maj_le = now()
  where x.id = p.id returning * into p;
  update public.reput_demandes x set statut = case p.statut when 'sans_envoi' then 'a_traiter' when 'bloquee' then 'bloquee' else 'a_valider' end,
         motif = case when p.statut in ('sans_envoi', 'bloquee') then left(coalesce(p.raison, v_e.motif, v_e.verrou), 500) end, maj_le = now()
  where x.id = d.id;
  perform private.journaliser_module(p.client_id, 'reput', 'reput.reponse_redeposee', 'reput_demandes', d.id::text,
    jsonb_build_object('reponse', p.id, 'version', p.version, 'demande_validation', v_dv, 'envoi', v_envoi,
                       'envoi_statut', v_e.statut, 'erreur', v_erreur), p.entite_id);
  return jsonb_build_object('reponse', p.id, 'statut', p.statut, 'demande_validation', v_dv, 'envoi', v_envoi, 'erreur', v_erreur);
end $function$;

-- L'ouvrier de base : les versions corrigées à redéposer, puis la synchronisation des décisions.
create or replace function private.reput_ouvrier(p_nombre integer default 20)
 returns jsonb
 language plpgsql
 security definer
 set search_path to ''
as $function$
declare
  t public.travaux;
  v_r jsonb;
  v_faits integer := 0;
  v_rendus integer := 0;
  v_synchro integer;
begin
  for t in select * from private.prendre_travaux(array['reput.redeposer'], p_nombre, interval '5 minutes', 'reput-base') loop
    begin
      v_r := private.reput_redeposer((t.charge ->> 'reponse')::uuid);
      perform private.finir_travail(t.id, v_r);
      v_faits := v_faits + 1;
    exception when others then
      perform private.echouer_travail(t.id, left(sqlstate || ' ' || sqlerrm, 300), true);
      v_rendus := v_rendus + 1;
    end;
  end loop;
  v_synchro := private.reput_synchroniser(null);
  begin
    perform private.battre_ouvrier('reput', array['reput.redeposer'],
      jsonb_build_object('faits', v_faits, 'rendus', v_rendus, 'synchronisees', v_synchro), interval '15 minutes');
  exception when others then
    raise notice 'battre_ouvrier : %', sqlerrm;
  end;
  return jsonb_build_object('faits', v_faits, 'rendus', v_rendus, 'synchronisees', v_synchro);
end $function$;

-- Le cron reput-synchro (c3_02) passe désormais par l'ouvrier de base : redépôts compris
-- (cron.schedule d'un nom existant remplace sa commande ; rejouable).
select cron.schedule('reput-synchro', '* * * * *', $cron$select private.reput_ouvrier(20)$cron$);

-- ─────────────────────────────────────────────────────────────────────────
-- Le point du matin : demandes reçues, en attente, répondues
-- ─────────────────────────────────────────────────────────────────────────
create or replace function private.reput_point_matin_lignes(p_client uuid, p_jour date)
 returns jsonb
 language plpgsql
 stable security definer
 set search_path to ''
as $function$
declare
  v_debut timestamptz := (p_jour - 1)::timestamp at time zone 'Europe/Paris';
  v_fin timestamptz := p_jour::timestamp at time zone 'Europe/Paris';
  v_recues integer; v_repondues integer; v_seules integer; v_attente integer; v_traiter integer;
  v_items jsonb := '[]'::jsonb;
  r record;
  v_n integer := 0;
begin
  select count(*), count(*) filter (where d.statut = 'envoyee'),
         count(*) filter (where d.statut = 'envoyee' and exists (select 1 from public.reput_reponses p
                                                                 join public.demandes_validation v on v.id = p.demande_validation_id
                                                                 where p.demande_id = d.id and v.politique_id is not null))
    into v_recues, v_repondues, v_seules
  from public.reput_demandes d where d.client_id = p_client and d.recu_le >= v_debut and d.recu_le < v_fin;
  select count(*) filter (where d.statut in ('a_valider', 'validee')), count(*) filter (where d.statut in ('a_traiter', 'bloquee'))
    into v_attente, v_traiter
  from public.reput_demandes d where d.client_id = p_client and d.statut in ('a_valider', 'validee', 'a_traiter', 'bloquee', 'a_preparer');
  if v_recues = 0 and v_attente = 0 and v_traiter = 0 then
    return '[]'::jsonb;
  end if;
  v_items := v_items || jsonb_build_object(
    'texte', format('Hier : %s demande%s reçue%s, %s répondue%s%s. En attente de votre validation : %s. À traiter vous-même : %s.',
                    v_recues, case when v_recues > 1 then 's' else '' end, case when v_recues > 1 then 's' else '' end,
                    v_repondues, case when v_repondues > 1 then 's' else '' end,
                    case when v_seules > 0 then format(' (dont %s partie%s seule%s par accord)', v_seules,
                                                       case when v_seules > 1 then 's' else '' end, case when v_seules > 1 then 's' else '' end) else '' end,
                    v_attente, v_traiter),
    'gravite', case when v_traiter > 0 or v_attente > 0 then 'attention' else 'info' end,
    'lien', '/espace/reput');
  for r in
    select d.*, s.libelle from public.reput_demandes d
    left join public.reput_sujets s on s.client_id = d.client_id and s.code = d.sujet
    where d.client_id = p_client and d.statut in ('a_traiter', 'bloquee', 'a_valider')
    order by d.urgence desc, (d.statut in ('a_traiter', 'bloquee')) desc, d.recu_le
  loop
    exit when v_n >= 30;
    v_items := v_items || jsonb_build_object(
      'texte', left(format('%s%s — %s : %s', case when r.urgence then 'URGENT · ' else '' end,
                           coalesce(nullif(btrim(r.de_nom), ''), 'Client'), coalesce(r.libelle, 'demande'),
                           case r.statut when 'a_valider' then 'réponse prête, à valider'
                                         when 'bloquee' then 'réponse bloquée, à traiter'
                                         else 'à traiter vous-même' end), 300),
      'gravite', case when r.urgence or r.statut <> 'a_valider' then 'attention' else 'info' end,
      'lien', '/espace/reput', 'objet_type', 'reput_demandes', 'objet_id', r.id::text);
    v_n := v_n + 1;
  end loop;
  return v_items;
end $function$;

create or replace function private.reput_deposer_points(p_maintenant timestamptz default now())
 returns integer
 language plpgsql
 security definer
 set search_path to ''
as $function$
declare
  k record;
  v_jour date;
  v_items jsonb;
  v_role text;
  v_titre constant text := 'Demandes clients : reçues, en attente, répondues';
  n integer := 0;
begin
  if (p_maintenant at time zone 'Europe/Paris')::time < time '05:00' then
    return 0;
  end if;
  v_jour := (p_maintenant at time zone 'Europe/Paris')::date;
  for k in select distinct g.client_id from public.reput_reglages g where g.actif order by g.client_id loop
    begin
      v_items := private.reput_point_matin_lignes(k.client_id, v_jour);
      foreach v_role in array array['gerant', 'valideur'] loop
        if jsonb_array_length(v_items) = 0 then
          perform private.retirer_section(k.client_id, 'reput', v_jour, null, v_role, v_titre, null, null);
        else
          perform private.deposer_section(k.client_id, 'reput', v_jour, null, v_role, v_titre, v_items,
                                          null, null, false, p_maintenant, false, 20);
        end if;
      end loop;
      n := n + 1;
    exception when others then
      perform private.lever_alerte_module(k.client_id, 'reput', 'attention',
        'Le point du matin des demandes clients n''a pas pu être déposé.',
        jsonb_build_object('erreur', left(sqlstate || ' ' || sqlerrm, 300)), 'point:depot:reput', false, null);
    end;
  end loop;
  return n;
end $function$;

-- ─────────────────────────────────────────────────────────────────────────
-- Droits
-- ─────────────────────────────────────────────────────────────────────────
revoke execute on function private.reput_garder_politique() from public, anon, authenticated;
revoke execute on function private.reput_accords_etat(uuid) from public, anon, authenticated;
revoke execute on function private.reput_seul_decideur(uuid, uuid) from public, anon, authenticated;
revoke execute on function private.reput_redeposer(uuid) from public, anon, authenticated;
revoke execute on function private.reput_ouvrier(integer) from public, anon, authenticated;
revoke execute on function private.reput_point_matin_lignes(uuid, date) from public, anon, authenticated;
revoke execute on function private.reput_deposer_points(timestamptz) from public, anon, authenticated;
grant execute on function private.reput_garder_politique() to service_role;
grant execute on function private.reput_accords_etat(uuid) to service_role;
grant execute on function private.reput_seul_decideur(uuid, uuid) to service_role;
grant execute on function private.reput_redeposer(uuid) to service_role;
grant execute on function private.reput_ouvrier(integer) to service_role;
grant execute on function private.reput_point_matin_lignes(uuid, date) to service_role;
grant execute on function private.reput_deposer_points(timestamptz) to service_role;

revoke execute on function public.reput_accords(uuid) from public, anon;
revoke execute on function public.reput_donner_accord(uuid, text, uuid) from public, anon;
revoke execute on function public.reput_activer_accord_seul(uuid, text) from public, anon;
revoke execute on function public.reput_revoquer_accord(uuid, text, text) from public, anon;
revoke execute on function public.reput_decider(uuid, text, text) from public, anon;
revoke execute on function public.reput_corriger(uuid, text, text) from public, anon;
grant execute on function public.reput_accords(uuid) to authenticated, service_role;
grant execute on function public.reput_donner_accord(uuid, text, uuid) to authenticated, service_role;
grant execute on function public.reput_activer_accord_seul(uuid, text) to authenticated, service_role;
grant execute on function public.reput_revoquer_accord(uuid, text, text) to authenticated, service_role;
grant execute on function public.reput_decider(uuid, text, text) to authenticated, service_role;
grant execute on function public.reput_corriger(uuid, text, text) to authenticated, service_role;

select cron.schedule('reput-matin', '*/30 * * * *', $cron$select private.reput_deposer_points()$cron$)
where not exists (select 1 from cron.job where jobname = 'reput-matin');
