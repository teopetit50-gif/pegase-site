-- c3_01 — REPUT : la base de connaissances par client (session C3, 06/10/2026)
--
-- CE QUE ÇA TIENT. Le site promet que « la réponse est tirée de la base de connaissances
-- construite avec vos équipes », que « hors de cette base, le système ne formule aucune
-- hypothèse », que « la base est versionnée : chaque règle porte sa date et son auteur »,
-- qu'« une modification de tarif ou d'horaire s'applique à la réponse suivante » et que « le ton,
-- la signature et les formules se règlent entité par entité ». Rien de tout cela n'existait :
-- la réception (A2) range les demandes dans public.receptions, personne n'y répond.
--
-- CE QUI EST POSÉ.
--   · public.reput_reglages : par organisation, et au besoin par entité (site, société) :
--     signature, formule d'appel, formule de politesse, ton, mention de la réponse automatisée
--     (dans les termes du client), langues couvertes, actif.
--   · public.reput_sujets : les sujets d'une organisation (horaires, tarifs, rendez_vous, devis,
--     information, suivi, avis, reclamation, urgence, humain, autre). Le classement d'une demande
--     se fait dans cette liste ; l'accord permanent (palier 3) se donne par sujet. Les sujets
--     « reclamation », « urgence », « humain », « litige » et « autre » ne sont JAMAIS autorisables
--     à l'envoi seul (colonne autorisable, figée par la porte).
--   · public.reput_connaissances : les fiches. Genre question (question / réponse), horaires,
--     tarif, document (résumé écrit par l'équipe, la pièce rattachée), information. Chaque fiche
--     porte sa SOURCE (où l'information a été prise) et sa période de validité (valide_du,
--     valide_au). Versionnée : corriger une fiche en crée une nouvelle version (même origine_id),
--     l'ancienne passe « remplacee » quand la nouvelle est validée. Qui l'a écrite, qui l'a
--     validée, quand : sur la ligne et au journal opposable.
--   · Portes (SECURITY DEFINER, contrôle de rôle dans la porte) :
--       reput_installer(p_client, p_entite)              serveur, gérant ou admin ; rejouable
--       reput_regler(p_client, p_entite, p_reglages)     gérant ou admin
--       reput_ecrire_sujet(p_client, p_code, p_libelle, p_description, p_actif)   gérant ou admin
--       reput_ecrire_connaissance(p_id, p_client, p_fiche)  gérant, admin, valideur, collaborateur
--         (une personne de décision écrit une fiche validée d'emblée ; un collaborateur un brouillon)
--       reput_valider_connaissance(p_id)                 gérant, admin, valideur
--       reput_retirer_connaissance(p_id, p_motif)        gérant, admin, valideur
--       reput_base(p_client, p_entite, p_instant)        serveur seul : la base EN VIGUEUR, pour la
--                                                        fonction Edge reput-reponse (palier 2)
--   · Lecture des trois tables sous RLS (SELECT seulement, périmètre d'entité) ; aucune écriture
--     directe : tout passe par les portes.
--   · private.abonnements : reception.nouvelle → module reput, genre reput.preparer. Le travail
--     est déposé pour toute réception ; l'ouvrier (palier 2) ignore celles d'un autre module.
--   · private.tables_locataires : les trois tables (export et effacement du client).
--
-- Règles de pose : create … if not exists / create or replace / on conflict ; ni DROP ni DELETE.

-- ─────────────────────────────────────────────────────────────────────────
-- Tables
-- ─────────────────────────────────────────────────────────────────────────
create table if not exists public.reput_reglages (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients(id) on delete cascade,
  entite_id uuid,
  signature text not null,
  formule_appel text not null default 'Bonjour,',
  formule_politesse text not null default 'Bien cordialement,',
  ton text not null default 'vouvoiement',
  mention_automatisee text,
  langues text[] not null default array['fr'],
  actif boolean not null default true,
  installe_le timestamptz not null default now(),
  maj_par uuid,
  maj_le timestamptz not null default now(),
  constraint reput_reglages_entite_fkey foreign key (client_id, entite_id) references public.entites(client_id, id) on delete cascade,
  constraint reput_reglages_signature_check check (char_length(btrim(signature)) between 1 and 500),
  constraint reput_reglages_appel_check check (char_length(formule_appel) <= 200),
  constraint reput_reglages_politesse_check check (char_length(formule_politesse) <= 200),
  constraint reput_reglages_ton_check check (ton in ('vouvoiement', 'tutoiement')),
  constraint reput_reglages_mention_check check (mention_automatisee is null or char_length(mention_automatisee) <= 500),
  constraint reput_reglages_langues_check check (cardinality(langues) between 1 and 12
                                                 and array_to_string(langues, ',') ~ '^[a-z]{2}(,[a-z]{2})*$')
);
create unique index if not exists reput_reglages_un_par_entite
  on public.reput_reglages (client_id, coalesce(entite_id, '00000000-0000-0000-0000-000000000000'::uuid));

create table if not exists public.reput_sujets (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients(id) on delete cascade,
  code text not null,
  libelle text not null,
  description text,
  autorisable boolean not null default true,
  actif boolean not null default true,
  ordre smallint not null default 100,
  cree_le timestamptz not null default now(),
  constraint reput_sujets_code_check check (code ~ '^[a-z][a-z0-9_]{1,39}$'),
  constraint reput_sujets_libelle_check check (char_length(btrim(libelle)) between 1 and 120),
  constraint reput_sujets_description_check check (description is null or char_length(description) <= 500),
  constraint reput_sujets_client_code_key unique (client_id, code)
);

create table if not exists public.reput_connaissances (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients(id) on delete cascade,
  entite_id uuid,
  origine_id uuid not null,
  version integer not null default 1,
  remplace_id uuid references public.reput_connaissances(id),
  sujet text not null,
  genre text not null,
  titre text not null,
  contenu text not null,
  langue text not null default 'fr',
  source text not null,
  piece_id uuid references public.pieces(id) on delete set null,
  valide_du date not null default current_date,
  valide_au date,
  statut text not null default 'brouillon',
  cree_par uuid,
  cree_le timestamptz not null default now(),
  valide_par uuid,
  valide_le timestamptz,
  retire_par uuid,
  retire_le timestamptz,
  motif_retrait text,
  constraint reput_connaissances_entite_fkey foreign key (client_id, entite_id) references public.entites(client_id, id) on delete cascade,
  constraint reput_connaissances_sujet_fkey foreign key (client_id, sujet) references public.reput_sujets(client_id, code),
  constraint reput_connaissances_genre_check check (genre in ('question', 'horaires', 'tarif', 'document', 'information')),
  constraint reput_connaissances_titre_check check (char_length(btrim(titre)) between 1 and 300),
  constraint reput_connaissances_contenu_check check (char_length(btrim(contenu)) between 1 and 4000),
  constraint reput_connaissances_langue_check check (langue ~ '^[a-z]{2}$'),
  constraint reput_connaissances_source_check check (char_length(btrim(source)) between 1 and 300),
  constraint reput_connaissances_periode_check check (valide_au is null or valide_au >= valide_du),
  constraint reput_connaissances_statut_check check (statut in ('brouillon', 'validee', 'remplacee', 'retiree')),
  constraint reput_connaissances_version_check check (version >= 1),
  constraint reput_connaissances_motif_check check (motif_retrait is null or char_length(motif_retrait) <= 500),
  constraint reput_connaissances_validee_check check (statut = 'brouillon' or valide_le is not null)
);
create index if not exists reput_connaissances_en_vigueur_idx
  on public.reput_connaissances (client_id, statut, sujet);
create unique index if not exists reput_connaissances_origine_version_key
  on public.reput_connaissances (origine_id, version);

alter table public.reput_reglages enable row level security;
alter table public.reput_sujets enable row level security;
alter table public.reput_connaissances enable row level security;

revoke all on public.reput_reglages from authenticated, anon;
revoke all on public.reput_sujets from authenticated, anon;
revoke all on public.reput_connaissances from authenticated, anon;
grant select on public.reput_reglages to authenticated;
grant select on public.reput_sujets to authenticated;
grant select on public.reput_connaissances to authenticated;
grant all on public.reput_reglages, public.reput_sujets, public.reput_connaissances to service_role;

do $do$ begin
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'reput_reglages'
                 and policyname = 'membres lisent les reglages reput de leur perimetre') then
    create policy "membres lisent les reglages reput de leur perimetre" on public.reput_reglages
      for select to authenticated
      using (client_id in (select private.mes_clients()) and private.perimetre_couvre((select auth.uid()), client_id, entite_id));
  end if;
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'reput_sujets'
                 and policyname = 'membres lisent les sujets reput') then
    create policy "membres lisent les sujets reput" on public.reput_sujets
      for select to authenticated
      using (client_id in (select private.mes_clients()));
  end if;
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'reput_connaissances'
                 and policyname = 'membres lisent la base reput de leur perimetre') then
    create policy "membres lisent la base reput de leur perimetre" on public.reput_connaissances
      for select to authenticated
      using (client_id in (select private.mes_clients()) and private.perimetre_couvre((select auth.uid()), client_id, entite_id));
  end if;
end $do$;

-- ─────────────────────────────────────────────────────────────────────────
-- Aides privées
-- ─────────────────────────────────────────────────────────────────────────
create or replace function private.reput_est_serveur()
 returns boolean
 language sql
 stable
 set search_path to ''
as $function$
  select (select auth.uid()) is null
     and coalesce(nullif(current_setting('role', true), 'none'), session_user::text) in ('service_role', 'postgres')
$function$;

-- Les sujets jamais autorisables à l'envoi seul : ils sortent du traitement courant.
create or replace function private.reput_sujets_proteges()
 returns text[]
 language sql
 immutable
 set search_path to ''
as $function$ select array['reclamation', 'urgence', 'humain', 'litige', 'autre'] $function$;

-- Les sujets posés à l'installation (code, libellé, description pour le classement, ordre).
create or replace function private.reput_sujets_defaut()
 returns table (code text, libelle text, description text, ordre smallint)
 language sql
 immutable
 set search_path to ''
as $function$
  values
    ('horaires', 'Horaires et accès', 'Heures et jours d''ouverture, fermetures exceptionnelles, adresse, accès, stationnement.', 10::smallint),
    ('tarifs', 'Tarifs et prix', 'Prix d''un service ou d''un produit, frais, modes de paiement.', 20::smallint),
    ('rendez_vous', 'Rendez-vous', 'Prendre, déplacer ou annuler un rendez-vous ou une intervention.', 30::smallint),
    ('devis', 'Demande de devis', 'Demande de devis, d''estimation ou de chiffrage ; relance d''un devis demandé.', 40::smallint),
    ('information', 'Renseignement', 'Question générale sur les services, les produits, les conditions, les documents à fournir.', 50::smallint),
    ('suivi', 'Suivi d''un dossier', 'Où en est ma commande, mon dossier, mon intervention.', 60::smallint),
    ('avis', 'Avis et retours', 'Remerciement, avis laissé, retour d''expérience positif.', 70::smallint),
    ('reclamation', 'Réclamation', 'Mécontentement, plainte, contestation, menace de partir : sort du traitement courant.', 80::smallint),
    ('urgence', 'Urgence', 'Danger, panne bloquante, situation qui ne peut pas attendre la réouverture.', 90::smallint),
    ('humain', 'Parler à une personne', 'Le client demande à parler à quelqu''un : honoré sans discussion.', 95::smallint),
    ('autre', 'Autre', 'Tout ce qui n''entre dans aucun autre sujet : transféré.', 100::smallint)
$function$;

-- Une fiche lisible pour le modèle et pour l'écran (sans les colonnes de gestion).
create or replace function private.reput_fiche_json(c public.reput_connaissances)
 returns jsonb
 language sql
 immutable
 set search_path to ''
as $function$
  select jsonb_build_object('id', c.id, 'origine', c.origine_id, 'version', c.version, 'entite', c.entite_id,
                            'sujet', c.sujet, 'genre', c.genre, 'titre', c.titre, 'contenu', c.contenu,
                            'langue', c.langue, 'source', c.source, 'piece', c.piece_id,
                            'valide_du', c.valide_du, 'valide_au', c.valide_au, 'valide_le', c.valide_le)
$function$;

-- Installer REPUT pour une organisation (et une entité) : réglages et sujets par défaut. Rejouable.
create or replace function private.reput_installer(p_client uuid, p_entite uuid default null)
 returns jsonb
 language plpgsql
 security definer
 set search_path to ''
as $function$
declare
  v_nom text;
  v_reglage uuid;
  v_sujets integer;
begin
  select coalesce(e.nom, c.nom) into v_nom
  from public.clients c left join public.entites e on e.client_id = c.id and e.id = p_entite
  where c.id = p_client;
  if v_nom is null then
    raise exception 'Organisation introuvable.' using errcode = 'P0002';
  end if;
  if p_entite is not null and not exists (select 1 from public.entites e where e.client_id = p_client and e.id = p_entite) then
    raise exception 'Entité introuvable dans cette organisation.' using errcode = '22023';
  end if;
  insert into public.reput_reglages (client_id, entite_id, signature, maj_par)
  values (p_client, p_entite, v_nom, (select auth.uid()))
  on conflict (client_id, coalesce(entite_id, '00000000-0000-0000-0000-000000000000'::uuid)) do nothing
  returning id into v_reglage;
  if v_reglage is null then
    select r.id into v_reglage from public.reput_reglages r
    where r.client_id = p_client and r.entite_id is not distinct from p_entite;
  else
    perform private.journaliser_module(p_client, 'reput', 'reput.installe', 'reput_reglages', v_reglage::text,
      jsonb_build_object('entite', p_entite), p_entite);
  end if;
  insert into public.reput_sujets (client_id, code, libelle, description, autorisable, ordre)
  select p_client, d.code, d.libelle, d.description, not (d.code = any (private.reput_sujets_proteges())), d.ordre
  from private.reput_sujets_defaut() d
  on conflict (client_id, code) do nothing;
  select count(*) into v_sujets from public.reput_sujets s where s.client_id = p_client;
  return jsonb_build_object('reglages', v_reglage, 'sujets', v_sujets);
end $function$;

-- La base EN VIGUEUR à un instant : réglages de l'entité (sinon de l'organisation), sujets actifs,
-- fiches validées dont la période couvre le jour (heure de Paris), propres à l'entité ou communes.
create or replace function private.reput_base(p_client uuid, p_entite uuid default null, p_instant timestamptz default now())
 returns jsonb
 language sql
 stable security definer
 set search_path to ''
as $function$
  with jour as (select (p_instant at time zone 'Europe/Paris')::date as j),
  reg as (
    select r.* from public.reput_reglages r
    where r.client_id = p_client and (r.entite_id = p_entite or r.entite_id is null)
    order by (r.entite_id is not null) desc limit 1
  )
  select jsonb_build_object(
    'client', p_client,
    'entite', p_entite,
    'instant', p_instant,
    'organisation', (select c.nom from public.clients c where c.id = p_client),
    'installe', exists (select 1 from reg),
    'reglages', (select jsonb_build_object('signature', r.signature, 'formule_appel', r.formule_appel,
                                           'formule_politesse', r.formule_politesse, 'ton', r.ton,
                                           'mention_automatisee', r.mention_automatisee, 'langues', to_jsonb(r.langues),
                                           'actif', r.actif, 'entite', r.entite_id)
                 from reg r),
    'sujets', (select coalesce(jsonb_agg(jsonb_build_object('code', s.code, 'libelle', s.libelle,
                                                            'description', s.description, 'autorisable', s.autorisable)
                                         order by s.ordre, s.code), '[]'::jsonb)
               from public.reput_sujets s where s.client_id = p_client and s.actif),
    'fiches', (select coalesce(jsonb_agg(private.reput_fiche_json(c) order by c.sujet, c.genre, c.titre), '[]'::jsonb)
               from public.reput_connaissances c, jour
               where c.client_id = p_client and c.statut = 'validee'
                 and (c.entite_id is null or c.entite_id = p_entite)
                 and c.valide_du <= jour.j and (c.valide_au is null or c.valide_au >= jour.j)))
$function$;

-- ─────────────────────────────────────────────────────────────────────────
-- Portes
-- ─────────────────────────────────────────────────────────────────────────
create or replace function public.reput_installer(p_client uuid, p_entite uuid default null)
 returns jsonb
 language plpgsql
 security definer
 set search_path to ''
as $function$
begin
  if not private.reput_est_serveur()
     and ((select auth.uid()) is null or not private.a_un_role(p_client, array['gerant', 'admin'])) then
    raise exception 'REPUT s''installe par Omega, le gérant ou un administrateur.' using errcode = '42501';
  end if;
  return private.reput_installer(p_client, p_entite);
end $function$;

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
    if v_cle not in ('signature', 'formule_appel', 'formule_politesse', 'ton', 'mention_automatisee', 'langues', 'actif') then
      raise exception 'Réglage inconnu : « % » (signature, formule_appel, formule_politesse, ton, mention_automatisee, langues, actif).', v_cle
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
    maj_par = v_uid, maj_le = now()
  where r.id = v_r.id
  returning * into v_r;
  perform private.journaliser_module(p_client, 'reput', 'reput.reglages_modifies', 'reput_reglages', v_r.id::text,
    jsonb_build_object('cles', (select jsonb_agg(k order by k) from jsonb_object_keys(p_reglages) k)), p_entite);
  return to_jsonb(v_r);
end $function$;

create or replace function public.reput_ecrire_sujet(p_client uuid, p_code text, p_libelle text,
                                                     p_description text default null, p_actif boolean default true)
 returns jsonb
 language plpgsql
 security definer
 set search_path to ''
as $function$
declare
  v_s public.reput_sujets;
  v_code text := lower(btrim(p_code));
begin
  if (select auth.uid()) is null or not private.a_un_role(p_client, array['gerant', 'admin']) then
    raise exception 'Les sujets se posent par le gérant ou un administrateur.' using errcode = '42501';
  end if;
  if v_code is null or v_code !~ '^[a-z][a-z0-9_]{1,39}$' then
    raise exception 'Code de sujet invalide : lettres minuscules, chiffres et _ (2 à 40).' using errcode = '22023';
  end if;
  if not coalesce(p_actif, true) and v_code = 'autre' then
    raise exception 'Le sujet « autre » reste actif : c''est lui qui reçoit ce qui n''entre nulle part.' using errcode = '22023';
  end if;
  insert into public.reput_sujets (client_id, code, libelle, description, autorisable, actif)
  values (p_client, v_code, btrim(p_libelle), nullif(btrim(p_description), ''),
          not (v_code = any (private.reput_sujets_proteges())), coalesce(p_actif, true))
  on conflict (client_id, code) do update
    set libelle = excluded.libelle, description = excluded.description, actif = excluded.actif
  returning * into v_s;
  perform private.journaliser_module(p_client, 'reput', 'reput.sujet_ecrit', 'reput_sujets', v_s.id::text,
    jsonb_build_object('code', v_s.code, 'actif', v_s.actif, 'autorisable', v_s.autorisable), null);
  return to_jsonb(v_s);
end $function$;

-- Écrire une fiche : p_id null = nouvelle fiche ; p_id = la fiche à corriger (une nouvelle version).
-- p_fiche : {entite, sujet, genre, titre, contenu, langue, source, piece, valide_du, valide_au}.
-- Une personne de décision (gérant, admin, valideur) écrit une fiche validée d'emblée ; un
-- collaborateur écrit un brouillon qu'une personne de décision valide.
create or replace function public.reput_ecrire_connaissance(p_id uuid, p_client uuid, p_fiche jsonb)
 returns jsonb
 language plpgsql
 security definer
 set search_path to ''
as $function$
declare
  v_uid uuid := (select auth.uid());
  v_decideur boolean;
  v_avant public.reput_connaissances;
  v_c public.reput_connaissances;
  v_cle text;
  v_entite uuid;
  v_piece uuid;
  v_id uuid := gen_random_uuid();
begin
  if v_uid is null or not private.a_un_role(p_client, array['gerant', 'admin', 'valideur', 'collaborateur']) then
    raise exception 'La base de connaissances s''écrit par les membres de l''organisation (pas un lecteur).' using errcode = '42501';
  end if;
  v_decideur := private.a_un_role(p_client, array['gerant', 'admin', 'valideur']);
  if p_fiche is null or jsonb_typeof(p_fiche) <> 'object' then
    raise exception 'La fiche forme un objet JSON.' using errcode = '22023';
  end if;
  for v_cle in select jsonb_object_keys(p_fiche) loop
    if v_cle not in ('entite', 'sujet', 'genre', 'titre', 'contenu', 'langue', 'source', 'piece', 'valide_du', 'valide_au') then
      raise exception 'Champ inconnu : « % » (entite, sujet, genre, titre, contenu, langue, source, piece, valide_du, valide_au).', v_cle
        using errcode = '22023';
    end if;
  end loop;

  if p_id is not null then
    select * into v_avant from public.reput_connaissances c where c.id = p_id and c.client_id = p_client for update;
    if v_avant.id is null then
      raise exception 'Fiche introuvable dans cette organisation.' using errcode = 'P0002';
    end if;
    if v_avant.statut not in ('brouillon', 'validee') then
      raise exception 'Cette fiche est % : on corrige la version en vigueur.', v_avant.statut using errcode = '23514';
    end if;
    if exists (select 1 from public.reput_connaissances c
               where c.origine_id = v_avant.origine_id and c.version > v_avant.version and c.statut = 'brouillon') then
      raise exception 'Une correction de cette fiche attend déjà sa validation.' using errcode = '23514';
    end if;
  end if;

  v_entite := case when p_fiche ? 'entite' then nullif(p_fiche ->> 'entite', '')::uuid else v_avant.entite_id end;
  if v_entite is not null and not exists (select 1 from public.entites e where e.client_id = p_client and e.id = v_entite) then
    raise exception 'Entité introuvable dans cette organisation.' using errcode = '22023';
  end if;
  if not private.perimetre_couvre(v_uid, p_client, v_entite) then
    raise exception 'Cette entité est hors de votre périmètre.' using errcode = '42501';
  end if;
  v_piece := case when p_fiche ? 'piece' then nullif(p_fiche ->> 'piece', '')::uuid else v_avant.piece_id end;
  if v_piece is not null and not exists (select 1 from public.pieces p where p.id = v_piece and p.client_id = p_client) then
    raise exception 'Pièce introuvable dans cette organisation.' using errcode = '22023';
  end if;

  perform private.reput_installer(p_client, null);   -- les sujets doivent exister (rejouable, sans effet sinon)
  if p_id is null and coalesce(nullif(btrim(p_fiche ->> 'source'), ''), '') = '' then
    raise exception 'Une fiche dit sa source : d''où vient l''information (document, personne, page du site…).' using errcode = '22023';
  end if;

  insert into public.reput_connaissances (id, client_id, entite_id, origine_id, version, remplace_id, sujet, genre, titre,
    contenu, langue, source, piece_id, valide_du, valide_au, statut, cree_par, valide_par, valide_le)
  values (
    v_id, p_client, v_entite, coalesce(v_avant.origine_id, v_id), coalesce(v_avant.version + 1, 1), v_avant.id,
    coalesce(nullif(lower(btrim(p_fiche ->> 'sujet')), ''), v_avant.sujet, 'information'),
    coalesce(nullif(btrim(p_fiche ->> 'genre'), ''), v_avant.genre, 'question'),
    coalesce(nullif(btrim(p_fiche ->> 'titre'), ''), v_avant.titre),
    coalesce(nullif(btrim(p_fiche ->> 'contenu'), ''), v_avant.contenu),
    coalesce(nullif(lower(btrim(p_fiche ->> 'langue')), ''), v_avant.langue, 'fr'),
    coalesce(nullif(btrim(p_fiche ->> 'source'), ''), v_avant.source),
    v_piece,
    coalesce(nullif(p_fiche ->> 'valide_du', '')::date, v_avant.valide_du, (now() at time zone 'Europe/Paris')::date),
    case when p_fiche ? 'valide_au' then nullif(p_fiche ->> 'valide_au', '')::date else v_avant.valide_au end,
    case when v_decideur then 'validee' else 'brouillon' end,
    v_uid,
    case when v_decideur then v_uid end,
    case when v_decideur then now() end)
  returning * into v_c;

  -- Une nouvelle version validée remplace la précédente en vigueur (la suivante réponse la lit).
  if v_c.statut = 'validee' and v_avant.id is not null then
    update public.reput_connaissances c set statut = 'remplacee'
    where c.origine_id = v_c.origine_id and c.id <> v_c.id and c.statut in ('validee', 'brouillon');
  end if;

  perform private.journaliser_module(p_client, 'reput',
    case when v_avant.id is null then 'reput.connaissance_creee' else 'reput.connaissance_corrigee' end,
    'reput_connaissances', v_c.id::text,
    jsonb_build_object('origine', v_c.origine_id, 'version', v_c.version, 'remplace', v_c.remplace_id,
                       'sujet', v_c.sujet, 'genre', v_c.genre, 'titre', v_c.titre, 'statut', v_c.statut,
                       'valide_du', v_c.valide_du, 'valide_au', v_c.valide_au, 'source', v_c.source),
    v_c.entite_id);
  return private.reput_fiche_json(v_c) || jsonb_build_object('statut', v_c.statut);
end $function$;

create or replace function public.reput_valider_connaissance(p_id uuid)
 returns jsonb
 language plpgsql
 security definer
 set search_path to ''
as $function$
declare
  v_uid uuid := (select auth.uid());
  v_c public.reput_connaissances;
begin
  select * into v_c from public.reput_connaissances c where c.id = p_id for update;
  if v_c.id is null or v_uid is null or not private.a_un_role(v_c.client_id, array['gerant', 'admin', 'valideur'])
     or not private.perimetre_couvre(v_uid, v_c.client_id, v_c.entite_id) then
    raise exception 'Une fiche se valide par le gérant, un administrateur ou un valideur de son périmètre.' using errcode = '42501';
  end if;
  if v_c.statut <> 'brouillon' then
    raise exception 'Cette fiche est déjà %.', v_c.statut using errcode = '23514';
  end if;
  update public.reput_connaissances c set statut = 'validee', valide_par = v_uid, valide_le = now()
  where c.id = v_c.id returning * into v_c;
  update public.reput_connaissances c set statut = 'remplacee'
  where c.origine_id = v_c.origine_id and c.id <> v_c.id and c.statut = 'validee';
  perform private.journaliser_module(v_c.client_id, 'reput', 'reput.connaissance_validee', 'reput_connaissances', v_c.id::text,
    jsonb_build_object('origine', v_c.origine_id, 'version', v_c.version, 'sujet', v_c.sujet, 'redige_par', v_c.cree_par),
    v_c.entite_id);
  return private.reput_fiche_json(v_c) || jsonb_build_object('statut', v_c.statut);
end $function$;

create or replace function public.reput_retirer_connaissance(p_id uuid, p_motif text)
 returns jsonb
 language plpgsql
 security definer
 set search_path to ''
as $function$
declare
  v_uid uuid := (select auth.uid());
  v_c public.reput_connaissances;
begin
  select * into v_c from public.reput_connaissances c where c.id = p_id for update;
  if v_c.id is null or v_uid is null or not private.a_un_role(v_c.client_id, array['gerant', 'admin', 'valideur'])
     or not private.perimetre_couvre(v_uid, v_c.client_id, v_c.entite_id) then
    raise exception 'Une fiche se retire par le gérant, un administrateur ou un valideur de son périmètre.' using errcode = '42501';
  end if;
  if nullif(btrim(p_motif), '') is null then
    raise exception 'Retirer une fiche dit pourquoi.' using errcode = '22023';
  end if;
  if v_c.statut not in ('brouillon', 'validee') then
    raise exception 'Cette fiche est déjà %.', v_c.statut using errcode = '23514';
  end if;
  update public.reput_connaissances c
     set statut = 'retiree', retire_par = v_uid, retire_le = now(), motif_retrait = left(btrim(p_motif), 500),
         valide_le = coalesce(c.valide_le, now())
  where c.id = v_c.id returning * into v_c;
  perform private.journaliser_module(v_c.client_id, 'reput', 'reput.connaissance_retiree', 'reput_connaissances', v_c.id::text,
    jsonb_build_object('origine', v_c.origine_id, 'version', v_c.version, 'motif', v_c.motif_retrait), v_c.entite_id);
  return private.reput_fiche_json(v_c) || jsonb_build_object('statut', v_c.statut);
end $function$;

-- La base en vigueur, pour la fonction Edge reput-reponse (clé de service).
create or replace function public.reput_base(p_client uuid, p_entite uuid default null, p_instant timestamptz default now())
 returns jsonb
 language plpgsql
 stable security definer
 set search_path to ''
as $function$
begin
  if not private.reput_est_serveur() then
    raise exception 'La base en vigueur se lit par le serveur d''Omega ; l''écran lit les fiches sous RLS.' using errcode = '42501';
  end if;
  return private.reput_base(p_client, p_entite, p_instant);
end $function$;

-- ─────────────────────────────────────────────────────────────────────────
-- Droits (fonctions de private : le serveur seul ; portes : authenticated sauf reput_base)
-- ─────────────────────────────────────────────────────────────────────────
revoke execute on function private.reput_est_serveur() from public, anon, authenticated;
revoke execute on function private.reput_sujets_proteges() from public, anon, authenticated;
revoke execute on function private.reput_sujets_defaut() from public, anon, authenticated;
revoke execute on function private.reput_fiche_json(public.reput_connaissances) from public, anon, authenticated;
revoke execute on function private.reput_installer(uuid, uuid) from public, anon, authenticated;
revoke execute on function private.reput_base(uuid, uuid, timestamptz) from public, anon, authenticated;
grant execute on function private.reput_est_serveur() to service_role;
grant execute on function private.reput_sujets_proteges() to service_role;
grant execute on function private.reput_sujets_defaut() to service_role;
grant execute on function private.reput_fiche_json(public.reput_connaissances) to service_role;
grant execute on function private.reput_installer(uuid, uuid) to service_role;
grant execute on function private.reput_base(uuid, uuid, timestamptz) to service_role;

revoke execute on function public.reput_installer(uuid, uuid) from public, anon;
revoke execute on function public.reput_regler(uuid, uuid, jsonb) from public, anon;
revoke execute on function public.reput_ecrire_sujet(uuid, text, text, text, boolean) from public, anon;
revoke execute on function public.reput_ecrire_connaissance(uuid, uuid, jsonb) from public, anon;
revoke execute on function public.reput_valider_connaissance(uuid) from public, anon;
revoke execute on function public.reput_retirer_connaissance(uuid, text) from public, anon;
revoke execute on function public.reput_base(uuid, uuid, timestamptz) from public, anon, authenticated;
grant execute on function public.reput_installer(uuid, uuid) to authenticated, service_role;
grant execute on function public.reput_regler(uuid, uuid, jsonb) to authenticated, service_role;
grant execute on function public.reput_ecrire_sujet(uuid, text, text, text, boolean) to authenticated, service_role;
grant execute on function public.reput_ecrire_connaissance(uuid, uuid, jsonb) to authenticated, service_role;
grant execute on function public.reput_valider_connaissance(uuid) to authenticated, service_role;
grant execute on function public.reput_retirer_connaissance(uuid, text) to authenticated, service_role;
grant execute on function public.reput_base(uuid, uuid, timestamptz) to service_role;

-- ─────────────────────────────────────────────────────────────────────────
-- Abonnement : une demande reçue devient un travail REPUT
-- ─────────────────────────────────────────────────────────────────────────
insert into private.abonnements (evenement, module, genre)
select 'reception.nouvelle', 'reput', 'reput.preparer'
where not exists (select 1 from private.abonnements a
                  where a.evenement = 'reception.nouvelle' and a.module = 'reput' and a.genre = 'reput.preparer');

-- Export et effacement du client : les trois tables sont à lui.
do $do$ begin
  if to_regclass('private.tables_locataires') is not null then
    begin
      execute $q$insert into private.tables_locataires (nom)
                 select x from unnest(array['reput_reglages', 'reput_sujets', 'reput_connaissances']) x
                 where not exists (select 1 from private.tables_locataires t where t.nom = x)$q$;
    exception when others then
      raise notice 'tables_locataires : %', sqlerrm;
    end;
  end if;
end $do$;
