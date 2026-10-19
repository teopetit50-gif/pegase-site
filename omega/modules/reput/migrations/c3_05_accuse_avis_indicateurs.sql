-- c3_05 — REPUT : accusé de réception, relance des devis demandés, demandes d'avis, indicateurs (session C3, 06/10/2026)
--
-- CE QUE ÇA TIENT (lib/produits/capacites/accueil.ts et lib/produits/accueil.ts) :
--   · « Un accusé de réception part dans la minute, sous votre signature. » — quand la réponse attend une
--     validation ou une personne, un accusé fixe (texte des réglages, formules, signature, mention) est déposé
--     dans la minute, sur le canal de la demande. Il part seul si le client l'a autorisé d'avance (accord
--     « accuse », type reput.accuser), sinon il attend comme le reste. En français seulement (texte du client).
--   · La relance d'un devis demandé : au point du matin, chaque demande de devis sans réponse depuis plus de
--     deux jours remonte (« relancez votre équipe »).
--   · « La demande d'avis part dans les trois jours qui suivent le règlement, puis elle est relancée deux fois au
--     maximum. La même personne n'est plus sollicitée avant six mois. » — public.reput_avis et la porte
--     reput_programmer_avis (serveur ou membre : un module, CASHD, FILED ou une personne, déclare le règlement) ;
--     l'ouvrier de base envoie à J+3 (10 h, Paris), relance à J+7 et J+14 au plus, s'arrête quand l'avis est noté
--     reçu (reput_avis_recu) ; une adresse sollicitée depuis moins de 183 jours est écartée. Message non
--     transactionnel : les verrous du socle (consentement, heures) s'appliquent. Accord « avis » (reput.avis).
--   · Pilotage : vues reput_indicateurs (par jour, canal, sujet : reçues, répondues, parties seules, hors base,
--     délai médian de première réponse en minutes) et reput_volumes_heure (par heure de la journée), security_invoker.
--
-- Règles de pose : alter … if not exists / create … if not exists / create or replace ; ni DROP ni DELETE.

-- ─────────────────────────────────────────────────────────────────────────
-- Réglages et colonnes
-- ─────────────────────────────────────────────────────────────────────────
alter table public.reput_reglages add column if not exists accuse boolean not null default true;
alter table public.reput_reglages add column if not exists texte_accuse text not null
  default 'Nous avons bien reçu votre message. Notre équipe vous répond au plus vite.';
alter table public.reput_reglages add column if not exists lien_avis text;
alter table public.reput_reglages add column if not exists texte_avis text not null
  default 'Merci de nous avoir fait confiance. Votre avis aide d''autres clients à nous choisir : il prend une minute.';
do $do$ begin
  if not exists (select 1 from pg_constraint where conname = 'reput_reglages_textes_c3_05_check') then
    alter table public.reput_reglages add constraint reput_reglages_textes_c3_05_check
      check (char_length(btrim(texte_accuse)) between 1 and 1000 and char_length(btrim(texte_avis)) between 1 and 1000
             and (lien_avis is null or (lien_avis ~ '^https://[^\s]+$' and char_length(lien_avis) <= 500)));
  end if;
end $do$;

alter table public.reput_demandes add column if not exists accuse_envoi uuid references public.envois(id) on delete set null;
alter table public.reput_demandes add column if not exists accuse_le timestamptz;

create table if not exists public.reput_avis (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients(id) on delete cascade,
  entite_id uuid,
  canal text not null,
  adresse text not null,
  empreinte text not null,
  nom text,
  reference text,
  regle_le date not null,
  statut text not null default 'programme',
  motif text,
  prochain_le timestamptz,
  envois uuid[] not null default '{}',
  premier_envoi_le timestamptz,
  avis_recu_le timestamptz,
  cree_par uuid,
  cree_le timestamptz not null default now(),
  maj_le timestamptz not null default now(),
  constraint reput_avis_entite_fkey foreign key (client_id, entite_id) references public.entites(client_id, id) on delete cascade,
  constraint reput_avis_canal_check check (canal in ('email', 'whatsapp', 'sms')),
  constraint reput_avis_statut_check check (statut in ('programme', 'sollicite', 'termine', 'avis_recu', 'ecarte')),
  constraint reput_avis_adresse_check check (char_length(btrim(adresse)) between 3 and 254),
  constraint reput_avis_reference_check check (reference is null or char_length(reference) <= 120),
  constraint reput_avis_nom_check check (nom is null or char_length(nom) <= 200),
  constraint reput_avis_motif_check check (motif is null or char_length(motif) <= 300)
);
create index if not exists reput_avis_a_faire_idx on public.reput_avis (statut, prochain_le);
create index if not exists reput_avis_empreinte_idx on public.reput_avis (client_id, empreinte, premier_envoi_le);
alter table public.reput_avis enable row level security;
revoke all on public.reput_avis from authenticated, anon;
grant select on public.reput_avis to authenticated;
grant all on public.reput_avis to service_role;
do $do$ begin
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'reput_avis'
                 and policyname = 'membres lisent les demandes d''avis de leur perimetre') then
    create policy "membres lisent les demandes d'avis de leur perimetre" on public.reput_avis
      for select to authenticated
      using (client_id in (select private.mes_clients()) and private.perimetre_couvre((select auth.uid()), client_id, entite_id));
  end if;
  if to_regclass('private.tables_locataires') is not null then
    begin
      execute $q$insert into private.tables_locataires (nom) select 'reput_avis'
                 where not exists (select 1 from private.tables_locataires t where t.nom = 'reput_avis')$q$;
    exception when others then raise notice 'tables_locataires : %', sqlerrm;
    end;
  end if;
  if to_regclass('private.activation_seul_autorisee') is not null then
    insert into private.activation_seul_autorisee (module, type_action, note) values
      ('reput', 'reput.accuser', 'Accord permanent REPUT : accusés de réception (c3_05)'),
      ('reput', 'reput.avis', 'Accord permanent REPUT : demandes d''avis (c3_05)')
    on conflict (module, type_action) do nothing;
  end if;
end $do$;

-- ─────────────────────────────────────────────────────────────────────────
-- Les accords : deux messages fixes en plus des sujets
-- ─────────────────────────────────────────────────────────────────────────
create or replace function private.reput_type_accord(p_code text)
 returns text
 language sql
 immutable
 set search_path to ''
as $function$
  select case lower(btrim(p_code)) when 'accuse' then 'reput.accuser' when 'avis' then 'reput.avis'
              else 'reput.repondre.' || lower(btrim(p_code)) end
$function$;

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
    where p.client_id = p_client and p.module = 'reput'
  ), s as (
    select x.code, x.libelle, x.autorisable, x.actif, x.ordre, 'reput.repondre.' || x.code as type_action, 'sujet' as genre
    from public.reput_sujets x where x.client_id = p_client
    union all select 'accuse', 'Accusés de réception', true, true, (-2)::smallint, 'reput.accuser', 'message'
    union all select 'avis', 'Demandes d''avis', true, true, (-1)::smallint, 'reput.avis', 'message'
  )
  select coalesce(jsonb_agg(jsonb_build_object(
           'sujet', s.code, 'libelle', s.libelle, 'genre', s.genre, 'autorisable', s.autorisable, 'actif', s.actif,
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
  from s
  left join p on p.type_action = s.type_action and p.rang = 1
$function$;

create or replace function public.reput_donner_accord(p_client uuid, p_sujet text, p_entite uuid default null)
 returns jsonb
 language plpgsql
 security definer
 set search_path to ''
as $function$
declare
  v_uid uuid := (select auth.uid());
  v_code text := lower(btrim(p_sujet));
  v_libelle text;
  v_ok boolean;
  v_ref text;
  v_type text;
  v_id uuid;
begin
  if v_uid is null or not private.a_un_role(p_client, array['gerant', 'admin']) then
    raise exception 'Un accord permanent se donne par le gérant ou un administrateur.' using errcode = '42501';
  end if;
  if v_code in ('accuse', 'avis') then
    v_libelle := case v_code when 'accuse' then 'accusés de réception' else 'demandes d''avis' end;
    v_ok := true;
    v_ref := p_client::text;
  else
    select s.libelle, s.autorisable and s.actif, s.id::text into v_libelle, v_ok, v_ref
    from public.reput_sujets s where s.client_id = p_client and s.code = v_code;
    if v_libelle is null then
      raise exception 'Sujet inconnu : %.', p_sujet using errcode = 'P0002';
    end if;
  end if;
  if not v_ok then
    raise exception 'Le sujet « % » ne peut pas partir sans relecture.', v_libelle using errcode = '42501';
  end if;
  if p_entite is not null and not exists (select 1 from public.entites e where e.client_id = p_client and e.id = p_entite) then
    raise exception 'Entité introuvable dans cette organisation.' using errcode = '22023';
  end if;
  v_type := private.reput_type_accord(v_code);
  perform pg_advisory_xact_lock(hashtextextended('reput.accord:' || p_client::text || ':' || v_code, 0));
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
            left('Accord permanent : ' || case when v_code in ('accuse', 'avis') then v_libelle || ' envoyés sans relecture'
                                               else 'réponses « ' || v_libelle || ' » envoyées sans relecture' end, 200),
            1000, now(), now() + interval '365 days')
    returning id into v_id;
    perform private.journaliser_module(p_client, 'reput', 'reput.accord_donne', 'reput_sujets', v_ref,
      jsonb_build_object('sujet', v_code, 'type_action', v_type, 'politique', v_id, 'entite', p_entite, 'par', v_uid), p_entite);
  end if;
  return jsonb_build_object('sujet', v_code, 'proposee', v_id, 'sujets', private.reput_accords_etat(p_client));
end $function$;

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
  -- c3_05 : l'accusé de réception et la demande d'avis sont des messages fixes, autorisables d'avance.
  if new.type_action in ('reput.accuser', 'reput.avis') then
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
    where p.client_id = p_client and p.module = 'reput' and p.type_action = private.reput_type_accord(p_sujet)
      and p.statut = 'a_valider' and d.type_action = 'politique.activer' and d.statut = 'en_attente'
  loop
    insert into public.approbations (demande_id, client_id, user_id, decision, commentaire)
    values (r.demande_id, p_client, v_uid, 'approuve', left(v_trace, 2000));
    v_n := v_n + 1;
  end loop;
  if v_n > 0 then
    perform private.journaliser_module(p_client, 'reput', 'reput.accord_active_seul', 'reput_sujets',
      coalesce((select s.id::text from public.reput_sujets s where s.client_id = p_client and s.code = lower(btrim(p_sujet))), p_client::text),
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
           where p.client_id = p_client and p.module = 'reput' and p.type_action = private.reput_type_accord(p_sujet)
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
  -- c3_05 : les devis demandés qui attendent encore une réponse (la relance d'un devis demandé).
  for r in
    select d.* from public.reput_demandes d
    where d.client_id = p_client and d.sujet = 'devis' and d.statut not in ('envoyee', 'refusee', 'ignoree')
      and d.recu_le < (p_jour - 2)::timestamp at time zone 'Europe/Paris'
    order by d.recu_le
  loop
    exit when v_n >= 40;
    v_items := v_items || jsonb_build_object(
      'texte', left(format('Devis demandé par %s il y a %s jours : toujours sans réponse, relancez votre équipe',
                           coalesce(nullif(btrim(r.de_nom), ''), 'un client'),
                           (p_jour - (r.recu_le at time zone 'Europe/Paris')::date)), 300),
      'gravite', 'attention', 'lien', '/espace/reput', 'objet_type', 'reput_demandes', 'objet_id', r.id::text);
    v_n := v_n + 1;
  end loop;
  return v_items;
end $function$;
-- Les réglages : quatre clés de plus (accusé, avis).
create or replace function public.reput_regler(p_client uuid, p_entite uuid, p_reglages jsonb)
 returns jsonb
 language plpgsql
 security definer
 set search_path to ''
as $function$
declare
  v_uid uuid := (select auth.uid());
  v_cle text;
  v_r public.reput_reglages;
  v_langues text[];
begin
  if v_uid is null or not private.a_un_role(p_client, array['gerant', 'admin']) then
    raise exception 'Les réglages des réponses se changent par le gérant ou un administrateur.' using errcode = '42501';
  end if;
  if p_reglages is null or jsonb_typeof(p_reglages) <> 'object' then
    raise exception 'Les réglages forment un objet JSON.' using errcode = '22023';
  end if;
  for v_cle in select jsonb_object_keys(p_reglages) loop
    if v_cle not in ('signature', 'formule_appel', 'formule_politesse', 'ton', 'mention_automatisee', 'langues', 'actif',
                     'accuse', 'texte_accuse', 'lien_avis', 'texte_avis') then
      raise exception 'Réglage inconnu : « % » (signature, formule_appel, formule_politesse, ton, mention_automatisee, langues, actif, accuse, texte_accuse, lien_avis, texte_avis).', v_cle
        using errcode = '22023';
    end if;
  end loop;
  perform private.reput_installer(p_client, p_entite);
  select * into v_r from public.reput_reglages r where r.client_id = p_client and r.entite_id is not distinct from p_entite for update;
  if p_reglages ? 'langues' then
    if jsonb_typeof(p_reglages -> 'langues') <> 'array' then
      raise exception 'Les langues forment une liste de codes à deux lettres (fr, en, es…).' using errcode = '22023';
    end if;
    select array_agg(lower(btrim(x)) order by o) into v_langues
    from jsonb_array_elements_text(p_reglages -> 'langues') with ordinality t(x, o);
  end if;
  update public.reput_reglages r set
    signature = case when p_reglages ? 'signature' then btrim(p_reglages ->> 'signature') else r.signature end,
    formule_appel = case when p_reglages ? 'formule_appel' then coalesce(p_reglages ->> 'formule_appel', '') else r.formule_appel end,
    formule_politesse = case when p_reglages ? 'formule_politesse' then coalesce(p_reglages ->> 'formule_politesse', '') else r.formule_politesse end,
    ton = case when p_reglages ? 'ton' then p_reglages ->> 'ton' else r.ton end,
    mention_automatisee = case when p_reglages ? 'mention_automatisee' then nullif(btrim(p_reglages ->> 'mention_automatisee'), '') else r.mention_automatisee end,
    langues = coalesce(v_langues, r.langues),
    actif = case when p_reglages ? 'actif' then (p_reglages ->> 'actif')::boolean else r.actif end,
    accuse = case when p_reglages ? 'accuse' then (p_reglages ->> 'accuse')::boolean else r.accuse end,
    texte_accuse = case when p_reglages ? 'texte_accuse' then btrim(p_reglages ->> 'texte_accuse') else r.texte_accuse end,
    lien_avis = case when p_reglages ? 'lien_avis' then nullif(btrim(p_reglages ->> 'lien_avis'), '') else r.lien_avis end,
    texte_avis = case when p_reglages ? 'texte_avis' then btrim(p_reglages ->> 'texte_avis') else r.texte_avis end,
    maj_par = v_uid, maj_le = now()
  where r.id = v_r.id
  returning * into v_r;
  perform private.journaliser_module(p_client, 'reput', 'reput.reglages_modifies', 'reput_reglages', v_r.id::text,
    jsonb_build_object('cles', (select jsonb_agg(k order by k) from jsonb_object_keys(p_reglages) k)), p_entite);
  return to_jsonb(v_r);
end $function$;


-- ─────────────────────────────────────────────────────────────────────────
-- L'accusé de réception
-- ─────────────────────────────────────────────────────────────────────────
create or replace function private.reput_accuser(p_demande uuid)
 returns jsonb
 language plpgsql
 security definer
 set search_path to ''
as $function$
declare
  d public.reput_demandes;
  g public.reput_reglages;
  v_corps text;
  v_objet text;
  v_dv uuid;
  v_envoi uuid;
  v_e public.envois;
begin
  select * into d from public.reput_demandes x where x.id = p_demande for update;
  if d.id is null or d.accuse_le is not null or d.statut not in ('a_valider', 'a_traiter') or d.canal_reponse is null then
    return jsonb_build_object('ignore', 'demande absente, déjà accusée, déjà répondue ou sans adresse');
  end if;
  select * into g from public.reput_reglages r
  where r.client_id = d.client_id and (r.entite_id = d.entite_id or r.entite_id is null)
  order by (r.entite_id is not null) desc limit 1;
  if g.id is null or not g.actif or not g.accuse then
    update public.reput_demandes x set accuse_le = now() where x.id = d.id;   -- rien à accuser : ne plus y revenir
    return jsonb_build_object('ignore', 'accusé désactivé dans les réglages');
  end if;
  if coalesce(d.langue, 'fr') <> 'fr' then
    update public.reput_demandes x set accuse_le = now() where x.id = d.id;
    return jsonb_build_object('ignore', 'accusé écrit en français, demande en ' || d.langue);
  end if;
  v_corps := concat_ws(E'\n\n', nullif(btrim(g.formule_appel), ''), btrim(g.texte_accuse),
                       concat_ws(E'\n', nullif(btrim(g.formule_politesse), ''), nullif(btrim(g.signature), '')),
                       nullif(btrim(g.mention_automatisee), ''));
  v_objet := case when d.canal_reponse = 'email' then left('Re : ' || coalesce(nullif(btrim(d.objet), ''), 'votre message'), 300) end;
  insert into public.demandes_validation (client_id, entite_id, module, type_action, objet_type, objet_id, resume, payload,
                                          echeance, cle_idempotence)
  values (d.client_id, d.entite_id, 'reput', 'reput.accuser', 'reput_demandes', d.id::text,
          left('Accusé de réception à ' || coalesce(nullif(btrim(d.de_nom), ''), d.adresse_reponse), 500),
          jsonb_build_object('demande', d.id, 'canal', d.canal_reponse, 'objet', v_objet, 'corps', v_corps),
          now() + interval '2 days', 'reput:accuse:' || d.id::text)
  returning id into v_dv;
  v_envoi := private.preparer_envoi(d.client_id, 'reput', 'reput_demandes', d.id::text, d.canal_reponse,
    jsonb_build_object('adresse', d.adresse_reponse, 'nom', d.de_nom, 'langue', 'fr', 'professionnel', false),
    null, '{}'::jsonb, v_objet, v_corps, null::uuid[], 'reput:accuse:' || d.id::text, d.entite_id,
    true, false, null::timestamptz, jsonb_build_object('demande', v_dv));
  select * into v_e from public.envois e where e.id = v_envoi;
  update public.reput_demandes x set accuse_envoi = v_envoi, accuse_le = now(), maj_le = now() where x.id = d.id;
  perform private.journaliser_module(d.client_id, 'reput', 'reput.accuse_prepare', 'reput_demandes', d.id::text,
    jsonb_build_object('envoi', v_envoi, 'envoi_statut', v_e.statut, 'verrou', v_e.verrou, 'demande_validation', v_dv), d.entite_id);
  return jsonb_build_object('demande', d.id, 'envoi', v_envoi, 'envoi_statut', v_e.statut, 'demande_validation', v_dv);
end $function$;

-- ─────────────────────────────────────────────────────────────────────────
-- Les demandes d'avis
-- ─────────────────────────────────────────────────────────────────────────
create or replace function public.reput_programmer_avis(p_client uuid, p_canal text, p_adresse text, p_nom text default null,
                                                        p_reference text default null, p_regle_le date default null,
                                                        p_entite uuid default null)
 returns jsonb
 language plpgsql
 security definer
 set search_path to ''
as $function$
declare
  v_uid uuid := (select auth.uid());
  g public.reput_reglages;
  v_adresse text := btrim(p_adresse);
  v_empreinte text;
  v_regle date := coalesce(p_regle_le, (now() at time zone 'Europe/Paris')::date);
  v_a public.reput_avis;
  v_ecart text;
begin
  if not private.reput_est_serveur()
     and (v_uid is null or not private.a_un_role(p_client, array['gerant', 'admin', 'valideur', 'collaborateur'])) then
    raise exception 'Une demande d''avis se programme par le serveur ou un membre de l''organisation.' using errcode = '42501';
  end if;
  if p_canal not in ('email', 'whatsapp', 'sms') then
    raise exception 'Canal : email, whatsapp ou sms.' using errcode = '22023';
  end if;
  if v_adresse is null or char_length(v_adresse) < 3 then
    raise exception 'Une demande d''avis a une adresse.' using errcode = '22023';
  end if;
  if p_entite is not null and not exists (select 1 from public.entites e where e.client_id = p_client and e.id = p_entite) then
    raise exception 'Entité introuvable dans cette organisation.' using errcode = '22023';
  end if;
  if v_regle > (now() at time zone 'Europe/Paris')::date then
    raise exception 'La demande d''avis suit un règlement passé, pas à venir.' using errcode = '22023';
  end if;
  perform private.reput_installer(p_client, null);
  select * into g from public.reput_reglages r
  where r.client_id = p_client and (r.entite_id = p_entite or r.entite_id is null)
  order by (r.entite_id is not null) desc limit 1;
  if g.lien_avis is null then
    raise exception 'Posez d''abord le lien de votre page d''avis dans les réglages (lien_avis).' using errcode = '22023';
  end if;
  v_adresse := case when p_canal = 'email' then lower(v_adresse) else v_adresse end;
  v_empreinte := encode(extensions.digest(lower(v_adresse), 'sha256'), 'hex');
  perform pg_advisory_xact_lock(hashtextextended('reput.avis:' || p_client::text || ':' || v_empreinte, 0));
  if exists (select 1 from public.reput_avis a where a.client_id = p_client and a.empreinte = v_empreinte
             and (a.statut = 'programme' or a.premier_envoi_le > now() - interval '183 days')) then
    v_ecart := 'Déjà sollicité depuis moins de six mois, ou une demande est déjà programmée.';
  end if;
  insert into public.reput_avis (client_id, entite_id, canal, adresse, empreinte, nom, reference, regle_le, statut, motif,
                                 prochain_le, cree_par)
  values (p_client, p_entite, p_canal, v_adresse, v_empreinte, left(nullif(btrim(p_nom), ''), 200), left(nullif(btrim(p_reference), ''), 120),
          v_regle, case when v_ecart is null then 'programme' else 'ecarte' end, v_ecart,
          case when v_ecart is null then greatest(((v_regle + 3)::timestamp + time '10:00') at time zone 'Europe/Paris', now()) end, v_uid)
  returning * into v_a;
  perform private.journaliser_module(p_client, 'reput', 'reput.avis_programme', 'reput_avis', v_a.id::text,
    jsonb_build_object('statut', v_a.statut, 'canal', p_canal, 'regle_le', v_regle, 'prochain_le', v_a.prochain_le, 'reference', v_a.reference),
    p_entite);
  return jsonb_build_object('avis', v_a.id, 'statut', v_a.statut, 'prochain_le', v_a.prochain_le, 'motif', v_a.motif);
end $function$;

create or replace function public.reput_avis_recu(p_avis uuid)
 returns jsonb
 language plpgsql
 security definer
 set search_path to ''
as $function$
declare
  a public.reput_avis;
begin
  select * into a from public.reput_avis x where x.id = p_avis for update;
  if a.id is null or (not private.reput_est_serveur()
     and ((select auth.uid()) is null or not private.a_un_role(a.client_id, array['gerant', 'admin', 'valideur', 'collaborateur']))) then
    raise exception 'Demande d''avis introuvable dans votre organisation.' using errcode = '42501';
  end if;
  update public.reput_avis x set statut = 'avis_recu', avis_recu_le = now(), prochain_le = null, maj_le = now()
  where x.id = a.id and x.statut in ('programme', 'sollicite') returning * into a;
  if a.id is not null then
    perform private.journaliser_module(a.client_id, 'reput', 'reput.avis_recu', 'reput_avis', a.id::text, '{}'::jsonb, a.entite_id);
  end if;
  return jsonb_build_object('avis', p_avis, 'statut', coalesce(a.statut, 'inchange'));
end $function$;

-- Un envoi d'avis (premier ou relance) : rang 1 à J+3, rang 2 à J+7, rang 3 à J+14, puis terminé.
create or replace function private.reput_solliciter_avis(p_avis uuid)
 returns jsonb
 language plpgsql
 security definer
 set search_path to ''
as $function$
declare
  a public.reput_avis;
  g public.reput_reglages;
  v_rang integer;
  v_corps text;
  v_dv uuid;
  v_envoi uuid;
  v_e public.envois;
begin
  select * into a from public.reput_avis x where x.id = p_avis for update;
  if a.id is null or a.statut not in ('programme', 'sollicite') or a.prochain_le is null or a.prochain_le > now() then
    return jsonb_build_object('ignore', 'rien à envoyer maintenant');
  end if;
  v_rang := cardinality(a.envois) + 1;
  select * into g from public.reput_reglages r
  where r.client_id = a.client_id and (r.entite_id = a.entite_id or r.entite_id is null)
  order by (r.entite_id is not null) desc limit 1;
  if g.id is null or not g.actif or g.lien_avis is null then
    update public.reput_avis x set statut = 'termine', motif = 'Réponses désactivées ou lien d''avis retiré.', prochain_le = null, maj_le = now()
    where x.id = a.id;
    return jsonb_build_object('ignore', 'réglages');
  end if;
  v_corps := concat_ws(E'\n\n', nullif(btrim(g.formule_appel), ''),
                       case when v_rang > 1 then 'Nous nous permettons de vous le redemander une dernière fois. ' else '' end || btrim(g.texte_avis),
                       g.lien_avis,
                       concat_ws(E'\n', nullif(btrim(g.formule_politesse), ''), nullif(btrim(g.signature), '')));
  insert into public.demandes_validation (client_id, entite_id, module, type_action, objet_type, objet_id, resume, payload,
                                          echeance, cle_idempotence)
  values (a.client_id, a.entite_id, 'reput', 'reput.avis', 'reput_avis', a.id::text,
          left(format('Demande d''avis%s à %s', case when v_rang > 1 then ' (relance ' || (v_rang - 1) || ')' else '' end,
                      coalesce(a.nom, a.adresse)), 500),
          jsonb_build_object('avis', a.id, 'rang', v_rang, 'canal', a.canal, 'corps', v_corps),
          now() + interval '3 days', 'reput:avis:' || a.id::text || ':' || v_rang)
  returning id into v_dv;
  v_envoi := private.preparer_envoi(a.client_id, 'reput', 'reput_avis', a.id::text, a.canal,
    jsonb_build_object('adresse', a.adresse, 'nom', a.nom, 'langue', 'fr', 'professionnel', false),
    null, '{}'::jsonb, case when a.canal = 'email' then 'Votre avis compte pour nous' end, v_corps, null::uuid[],
    'reput:avis:' || a.id::text || ':' || v_rang, a.entite_id, false, false, null::timestamptz, jsonb_build_object('demande', v_dv));
  select * into v_e from public.envois e where e.id = v_envoi;
  update public.reput_avis x set
    envois = x.envois || v_envoi,
    statut = case when v_rang >= 3 then 'termine' else 'sollicite' end,
    premier_envoi_le = coalesce(x.premier_envoi_le, now()),
    prochain_le = case v_rang when 1 then now() + interval '4 days' when 2 then now() + interval '7 days' end,
    maj_le = now()
  where x.id = a.id;
  perform private.journaliser_module(a.client_id, 'reput', 'reput.avis_sollicite', 'reput_avis', a.id::text,
    jsonb_build_object('rang', v_rang, 'envoi', v_envoi, 'envoi_statut', v_e.statut, 'verrou', v_e.verrou, 'demande_validation', v_dv),
    a.entite_id);
  return jsonb_build_object('avis', a.id, 'rang', v_rang, 'envoi', v_envoi, 'envoi_statut', v_e.statut, 'verrou', v_e.verrou);
end $function$;

-- ─────────────────────────────────────────────────────────────────────────
-- L'ouvrier de base : redépôts, accusés, avis, synchronisation
-- ─────────────────────────────────────────────────────────────────────────
create or replace function private.reput_ouvrier(p_nombre integer default 20)
 returns jsonb
 language plpgsql
 security definer
 set search_path to ''
as $function$
declare
  t public.travaux;
  x record;
  v_r jsonb;
  v_faits integer := 0;
  v_rendus integer := 0;
  v_accuses integer := 0;
  v_avis integer := 0;
  v_erreurs integer := 0;
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
  -- Les accusés de réception des demandes qui attendent (déposées depuis moins d'un jour).
  for x in select d.id, d.client_id from public.reput_demandes d
           where d.statut in ('a_valider', 'a_traiter') and d.accuse_le is null and d.canal_reponse is not null
             and d.preparee_le > now() - interval '1 day'
           order by d.recu_le limit 50 loop
    begin
      v_r := private.reput_accuser(x.id);
      if v_r ? 'envoi' then v_accuses := v_accuses + 1; end if;
    exception when others then
      v_erreurs := v_erreurs + 1;
      update public.reput_demandes d set accuse_le = now() where d.id = x.id;   -- jamais deux fois, jamais en boucle
      perform private.lever_alerte_module(x.client_id, 'reput', 'info', 'Un accusé de réception n''a pas pu être préparé.',
        jsonb_build_object('demande', x.id, 'erreur', left(sqlstate || ' ' || sqlerrm, 300)), 'accuse:' || x.id::text, false, null);
    end;
  end loop;
  -- Les demandes d'avis arrivées à échéance.
  for x in select a.id, a.client_id from public.reput_avis a
           where a.statut in ('programme', 'sollicite') and a.prochain_le <= now()
           order by a.prochain_le limit 50 loop
    begin
      v_r := private.reput_solliciter_avis(x.id);
      if v_r ? 'envoi' then v_avis := v_avis + 1; end if;
    exception when others then
      v_erreurs := v_erreurs + 1;
      update public.reput_avis a set statut = 'termine', motif = left('Envoi impossible : ' || sqlerrm, 300), prochain_le = null where a.id = x.id;
    end;
  end loop;
  v_synchro := private.reput_synchroniser(null);
  begin
    perform private.battre_ouvrier('reput', array['reput.redeposer'],
      jsonb_build_object('faits', v_faits, 'rendus', v_rendus, 'accuses', v_accuses, 'avis', v_avis, 'erreurs', v_erreurs,
                         'synchronisees', v_synchro), interval '15 minutes');
  exception when others then
    raise notice 'battre_ouvrier : %', sqlerrm;
  end;
  return jsonb_build_object('faits', v_faits, 'rendus', v_rendus, 'accuses', v_accuses, 'avis', v_avis, 'erreurs', v_erreurs,
                            'synchronisees', v_synchro);
end $function$;

-- ─────────────────────────────────────────────────────────────────────────
-- Les indicateurs (vues security_invoker : la RLS de reput_demandes s'applique)
-- ─────────────────────────────────────────────────────────────────────────
create or replace view public.reput_indicateurs with (security_invoker = true) as
select d.client_id, d.entite_id,
       (d.recu_le at time zone 'Europe/Paris')::date as jour,
       d.canal, coalesce(d.sujet, 'autre') as sujet,
       count(*)::int as recues,
       count(*) filter (where d.statut = 'envoyee')::int as repondues,
       count(*) filter (where d.statut = 'envoyee' and exists (
         select 1 from public.reput_reponses p join public.demandes_validation v on v.id = p.demande_validation_id
         where p.demande_id = d.id and v.politique_id is not null))::int as parties_seules,
       count(*) filter (where d.couverte is false)::int as hors_base,
       count(*) filter (where d.statut in ('a_valider', 'a_traiter', 'bloquee', 'a_preparer'))::int as en_attente,
       round((percentile_cont(0.5) within group (order by extract(epoch from (d.envoyee_le - d.recu_le)) / 60.0)
              filter (where d.envoyee_le is not null))::numeric, 1) as delai_median_minutes
from public.reput_demandes d
group by 1, 2, 3, 4, 5;

create or replace view public.reput_volumes_heure with (security_invoker = true) as
select d.client_id, d.entite_id,
       (d.recu_le at time zone 'Europe/Paris')::date as jour,
       extract(hour from d.recu_le at time zone 'Europe/Paris')::int as heure,
       d.canal, count(*)::int as recues
from public.reput_demandes d
group by 1, 2, 3, 4, 5;

revoke all on public.reput_indicateurs, public.reput_volumes_heure from authenticated, anon;
grant select on public.reput_indicateurs, public.reput_volumes_heure to authenticated;
grant select on public.reput_indicateurs, public.reput_volumes_heure to service_role;

-- ─────────────────────────────────────────────────────────────────────────
-- Droits
-- ─────────────────────────────────────────────────────────────────────────
revoke execute on function private.reput_type_accord(text) from public, anon, authenticated;
revoke execute on function private.reput_accuser(uuid) from public, anon, authenticated;
revoke execute on function private.reput_solliciter_avis(uuid) from public, anon, authenticated;
grant execute on function private.reput_type_accord(text) to service_role;
grant execute on function private.reput_accuser(uuid) to service_role;
grant execute on function private.reput_solliciter_avis(uuid) to service_role;
revoke execute on function public.reput_programmer_avis(uuid, text, text, text, text, date, uuid) from public, anon;
revoke execute on function public.reput_avis_recu(uuid) from public, anon;
grant execute on function public.reput_programmer_avis(uuid, text, text, text, text, date, uuid) to authenticated, service_role;
grant execute on function public.reput_avis_recu(uuid) to authenticated, service_role;
