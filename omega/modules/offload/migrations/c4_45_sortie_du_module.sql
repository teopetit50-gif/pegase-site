-- c4_45 — OFFLOAD : la sortie ne concerne qu'OFFLOAD, ne laisse rien en suspens, et la relance des prospects s'allume
-- par choix (session C4, 27/10/2026 ; contre-recette de nuit du testeur, omega/TESTEUR/CONTRE-RECETTE-NUIT-2026-10-27.md,
-- branche testeur-modules 4b2ad9a5).
--
--   · TNUIT-02 — la sortie (c4_42) renvoyait à l'effacement de TOUTE l'organisation (porte du socle), qui emportait
--     CASHD, FILED, REPUT et les métiers. Arrêter OFFLOAD n'efface plus qu'OFFLOAD :
--     public.offload_effacer_module(organisation, nom exact de l'organisation) — le gérant (ou le serveur, signé), après
--     la sortie seulement. Les messages et les demandes de validation d'OFFLOAD s'effacent par la porte du socle
--     (private.effacer_objet, objet par objet) ; puis toutes les lignes des tables offload_* de l'organisation, réglages
--     compris (OFFLOAD est désinstallé). Les autres modules ne sont pas touchés. Restent, et c'est voulu : le journal
--     opposable (chaîné, il prouve les actes ; il ne porte pas les données des comptes, c4_26) et les oppositions
--     (« ne plus jamais écrire » doit survivre à tout) ;
--   · TNUIT-03 — après la sortie, plus rien en suspens : toutes les tâches à faire sont abandonnées (échéances comprises),
--     les affaires ouvertes se closent « sans suite », les échéances ouvertes se closent, chacune avec la trace « Sortie
--     d'OFFLOAD : <motif> » ; et la saisie s'arrête : une garde refuse toute nouvelle ligne (compte, achat, affaire,
--     contact, équipement, intervention, contrat, échéance, reprise, tâche, règle, exclusion) et toute modification d'un
--     compte, d'une règle, d'une exclusion ou des réglages (55000, avec la date de la sortie). La détection de nuit
--     saute l'organisation sortie ;
--   · TNUIT-04 — la relance des prospects (c4_44) est éteinte par défaut, et éteinte partout où personne ne l'a choisie
--     (aucun offload_regler_prospects au journal) : le gérant l'allume lui-même.
--
-- Règles de pose : alter … add column if not exists, alter … set default, update ciblé, déclencheurs posés s'ils
-- manquent, create or replace. Aucun DROP. Les seules suppressions sont celles de l'effacement, à l'appel du gérant.

alter table public.offload_reglages add column if not exists sortie_le timestamptz;
alter table public.offload_reglages add column if not exists sortie_motif text;

-- TNUIT-04 : les prospects par choix.
alter table public.offload_reglages alter column prospects_actifs set default false;
update public.offload_reglages g set prospects_actifs = false, maj_le = now()
 where g.prospects_actifs
   and not exists (select 1 from public.journal_opposable j
                   where j.client_id = g.client_id and j.action = 'offload.reglages'
                     and coalesce(j.donnees -> 'demande', '{}'::jsonb) ? 'prospects_actifs');

-- TNUIT-03 : après la sortie, la saisie s'arrête.
create or replace function private.offload_garder_sortie() returns trigger
 language plpgsql
 security definer
 set search_path to ''
as $function$
declare v_sortie timestamptz;
begin
  if tg_table_name = 'offload_reglages' then
    v_sortie := old.sortie_le;
  else
    select g.sortie_le into v_sortie from public.offload_reglages g where g.client_id = new.client_id;
  end if;
  if v_sortie is not null then
    raise exception 'OFFLOAD est arrêté pour cette organisation depuis le % (sortie) : plus aucune saisie n''est reçue.',
      to_char(v_sortie at time zone private.offload_fuseau(new.client_id), 'DD/MM/YYYY') using errcode = '55000';
  end if;
  return new;
end $function$;
revoke execute on function private.offload_garder_sortie() from public, anon, authenticated;

do $do$
declare t text;
begin
  foreach t in array array['offload_comptes', 'offload_achats', 'offload_affaires', 'offload_contacts', 'offload_equipements',
                           'offload_interventions', 'offload_contrats', 'offload_echeances', 'offload_reprises', 'offload_taches',
                           'offload_regles', 'offload_exclusions'] loop
    if not exists (select 1 from pg_trigger where tgrelid = ('public.' || t)::regclass and tgname = t || '_garder_sortie') then
      execute format('create trigger %I before insert on public.%I for each row execute function private.offload_garder_sortie()',
                     t || '_garder_sortie', t);
    end if;
  end loop;
  foreach t in array array['offload_comptes', 'offload_regles', 'offload_exclusions', 'offload_reglages'] loop
    if not exists (select 1 from pg_trigger where tgrelid = ('public.' || t)::regclass and tgname = t || '_garder_sortie_maj') then
      execute format('create trigger %I before update on public.%I for each row execute function private.offload_garder_sortie()',
                     t || '_garder_sortie_maj', t);
    end if;
  end loop;
end $do$;

-- La détection de nuit saute une organisation sortie.
create or replace function private.offload_detecter_tout(p_jour date default null)
 returns jsonb
 language plpgsql
 security definer
 set search_path to ''
as $function$
declare
  k record;
  n integer := 0;
  e integer := 0;
begin
  for k in select g.client_id from public.offload_reglages g where g.sortie_le is null order by g.client_id loop
    begin
      perform private.offload_detecter(k.client_id, p_jour);
      perform private.offload_proposer_rapprochements(k.client_id);
      perform private.offload_cycle(k.client_id, p_jour);
      perform private.offload_echeances_cycle(k.client_id, p_jour);
      perform private.offload_affaires_cycle(k.client_id, p_jour);
      perform private.offload_arreter(k.client_id, p_jour);
      n := n + 1;
    exception when others then
      e := e + 1;
      perform private.lever_alerte_module(k.client_id, 'offload', 'attention',
        'La détection des clients qui décrochent n''a pas pu être calculée.',
        jsonb_build_object('erreur', left(sqlstate || ' ' || sqlerrm, 300)), 'offload:detection', false, null);
    end;
  end loop;
  return jsonb_build_object('organisations', n, 'echecs', e);
end $function$;
revoke execute on function private.offload_detecter_tout(date) from public, anon, authenticated;
grant execute on function private.offload_detecter_tout(date) to service_role;

-- La sortie : l'arrêt, plus rien en suspens (TNUIT-03), la restitution, et l'effacement du seul OFFLOAD (TNUIT-02).
create or replace function private.offload_sortie(p_client uuid, p_motif text)
 returns jsonb
 language plpgsql
 security definer
 set search_path to ''
as $function$
declare
  v_motif text := private.offload_texte(p_motif, 400);
  v_trace text;
  v_nom text;
  g public.offload_reglages;
  r record;
  n_reprises integer := 0;
  n_envois integer := 0;
  n_demandes integer := 0;
  n_taches integer := 0;
  n_affaires integer := 0;
  n_echeances integer := 0;
  v_restitution jsonb;
  v_tableur jsonb;
  v_empreinte text;
begin
  perform private.offload_exiger(p_client, null, array['gerant', 'admin'], 'faire sortir l''organisation d''OFFLOAD');
  if v_motif is null then
    raise exception 'Une sortie dit pourquoi.' using errcode = '22023';
  end if;
  select c.nom into v_nom from public.clients c where c.id = p_client;
  select * into g from public.offload_reglages x where x.client_id = p_client for update;
  if g.client_id is null then
    raise exception 'OFFLOAD n''est pas installé pour cette organisation.' using errcode = 'P0002';
  end if;
  if g.sortie_le is not null then
    raise exception 'OFFLOAD est déjà arrêté pour cette organisation (sortie du %).',
      to_char(g.sortie_le at time zone private.offload_fuseau(p_client), 'DD/MM/YYYY') using errcode = '55000';
  end if;
  v_trace := left('Sortie d''OFFLOAD : ' || v_motif, 300);

  -- 1. L'arrêt.
  if not private.offload_suspendu(p_client) then
    perform private.offload_suspendre_interne(p_client, 'sortie : ' || v_motif, coalesce((select auth.uid())::text, 'serveur'));
  end if;

  -- 2. Plus rien en suspens, chaque fermeture avec sa trace.
  for r in select p.id from public.offload_reprises p
           where p.client_id = p_client and p.statut in ('a_valider', 'appel', 'envoyee', 'relance_a_valider', 'relancee') loop
    perform private.offload_clore(r.id, 'abandon', v_trace);
    n_reprises := n_reprises + 1;
  end loop;
  for r in select e.id from public.envois e
           where e.client_id = p_client and e.module = 'offload' and e.statut in ('a_valider', 'differe', 'pret') loop
    perform private.annuler_envoi(r.id, v_trace);
    n_envois := n_envois + 1;
  end loop;
  update public.demandes_validation d set statut = 'annulee'
   where d.client_id = p_client and d.module = 'offload' and d.statut = 'en_attente';
  get diagnostics n_demandes = row_count;
  update public.offload_taches t set statut = 'abandonnee', faite_le = now(), maj_le = now(), compte_rendu = coalesce(t.compte_rendu, v_trace)
   where t.client_id = p_client and t.statut = 'a_faire';
  get diagnostics n_taches = row_count;
  update public.offload_affaires a set statut = 'close_sans_suite', maj_le = now(), motif = v_trace
   where a.client_id = p_client and a.statut in ('en_attente', 'relancee_1', 'relancee_2', 'decision', 'repondue');
  get diagnostics n_affaires = row_count;
  update public.offload_echeances h set statut = 'close', maj_le = now(), motif = v_trace
   where h.client_id = p_client and h.statut in ('a_venir', 'a_valider', 'prevenue', 'appel', 'depassee');
  get diagnostics n_echeances = row_count;

  -- 3. La saisie s'arrête : la date de sortie arme la garde.
  update public.offload_reglages set sortie_le = now(), sortie_motif = v_motif, maj_le = now() where client_id = p_client;

  -- 4. La restitution, en JSON et en tableur.
  v_restitution := private.offload_restitution(p_client);
  v_tableur := private.offload_restitution_tableur(p_client);
  v_empreinte := encode(extensions.digest(convert_to(v_restitution::text, 'UTF8'), 'sha256'), 'hex');

  perform private.journaliser_module(p_client, 'offload', 'offload.sortie', 'offload_reglages', p_client::text,
    jsonb_build_object('motif', v_motif, 'resume', v_restitution -> 'resume', 'empreinte_sha256', v_empreinte,
                       'reprises_closes', n_reprises, 'envois_annules', n_envois, 'demandes_annulees', n_demandes,
                       'taches_abandonnees', n_taches, 'affaires_closes', n_affaires, 'echeances_closes', n_echeances), null);

  return jsonb_build_object(
    'organisation', p_client,
    'arrete', true,
    'reprises_closes', n_reprises, 'envois_annules', n_envois, 'demandes_annulees', n_demandes,
    'taches_abandonnees', n_taches, 'affaires_closes', n_affaires, 'echeances_closes', n_echeances,
    'empreinte_sha256', v_empreinte,
    'restitution', v_restitution,
    'tableur', v_tableur,
    'effacement', jsonb_build_object(
      'porte', 'public.offload_effacer_module',
      'confirmation', v_nom,
      'phrase', 'Une fois vos fichiers enregistrés, l''effacement d''OFFLOAD se confirme par le nom exact de votre organisation. '
                || 'Il n''efface qu''OFFLOAD : vos autres modules continuent.'));
end $function$;
revoke execute on function private.offload_sortie(uuid, text) from public, anon;
grant execute on function private.offload_sortie(uuid, text) to authenticated, service_role;

-- L'effacement du seul OFFLOAD (TNUIT-02), après la sortie.
create or replace function private.offload_effacer_module(p_client uuid, p_confirmation text, p_par text default null)
 returns jsonb
 language plpgsql
 security definer
 set search_path to ''
as $function$
declare
  v_uid uuid := (select auth.uid());
  v_nom text;
  v_par text;
  g public.offload_reglages;
  r record;
  v_objets integer := 0;
  v_lignes jsonb := '{}'::jsonb;
  v_restantes text[];
  v_table text;
  v_n bigint;
  v_passe integer := 0;
  v_progres boolean;
begin
  select c.nom into v_nom from public.clients c where c.id = p_client;
  if v_nom is null then
    raise exception 'Organisation introuvable.' using errcode = 'P0002';
  end if;
  if v_uid is not null then
    perform private.offload_exiger(p_client, null, array['gerant'], 'effacer OFFLOAD');
    v_par := coalesce((select u.email from auth.users u where u.id = v_uid), v_uid::text);
  else
    v_par := nullif(btrim(coalesce(p_par, '')), '');
    if v_par is null then
      raise exception 'Un effacement est toujours signé : qui efface ?' using errcode = '22023';
    end if;
  end if;
  select * into g from public.offload_reglages x where x.client_id = p_client;
  if g.client_id is null then
    raise exception 'OFFLOAD n''est pas installé pour cette organisation : rien à effacer.' using errcode = 'P0002';
  end if;
  if g.sortie_le is null then
    raise exception 'Arrêtez d''abord OFFLOAD et enregistrez vos fichiers (sortie) : la restitution précède l''effacement.'
      using errcode = '55000';
  end if;
  if p_confirmation is distinct from v_nom then
    raise exception 'Confirmation refusée : saisir exactement le nom de l''organisation.' using errcode = '22023';
  end if;

  -- 1. Par la porte du socle : les messages, demandes et lignes de point attachés à chaque objet d'OFFLOAD.
  for r in
    select 'offload_reprises' as t, p.id::text as id from public.offload_reprises p where p.client_id = p_client
    union all select 'offload_affaires', a.id::text from public.offload_affaires a where a.client_id = p_client
    union all select 'offload_echeances', h.id::text from public.offload_echeances h where h.client_id = p_client
    union all select 'offload_comptes', c.id::text from public.offload_comptes c where c.client_id = p_client
  loop
    perform private.effacer_objet(p_client, r.t, r.id, r.id, v_par);
    v_objets := v_objets + 1;
  end loop;

  -- 2. Les tables d'OFFLOAD, réglages compris, pour cette organisation seulement.
  select array_agg(c.relname::text order by c.relname) into v_restantes
  from pg_catalog.pg_class c join pg_catalog.pg_namespace n on n.oid = c.relnamespace
  where n.nspname = 'public' and c.relkind = 'r' and c.relname like 'offload\_%'
    and exists (select 1 from pg_catalog.pg_attribute a where a.attrelid = c.oid and a.attname = 'client_id' and not a.attisdropped);
  loop
    v_passe := v_passe + 1;
    v_progres := false;
    foreach v_table in array v_restantes loop
      begin
        execute format('delete from public.%I where client_id = $1', v_table) using p_client;
        get diagnostics v_n = row_count;
        v_lignes := v_lignes || jsonb_build_object(v_table, coalesce((v_lignes ->> v_table)::bigint, 0) + v_n);
        v_restantes := array_remove(v_restantes, v_table);
        v_progres := true;
      exception when foreign_key_violation then
        null;
      end;
    end loop;
    exit when cardinality(v_restantes) = 0;
    if not v_progres or v_passe >= 10 then
      raise exception 'Effacement d''OFFLOAD bloqué par des références croisées : %.', v_restantes using errcode = '23503';
    end if;
  end loop;

  perform private.journaliser(p_client, 'offload.effacement', 'clients', p_client::text,
    jsonb_build_object('par', v_par, 'objets', v_objets, 'lignes', v_lignes), null);
  return jsonb_build_object('organisation', p_client, 'module', 'offload', 'par', v_par, 'objets', v_objets, 'lignes', v_lignes,
    'garde', 'Restent : le journal opposable (la preuve des actes, sans les données des comptes) et les oppositions (« ne plus écrire »).');
end $function$;

create or replace function public.offload_effacer_module(p_client uuid, p_confirmation text)
 returns jsonb
 language sql
 set search_path to ''
as $function$ select private.offload_effacer_module(p_client, p_confirmation, null) $function$;

revoke execute on function private.offload_effacer_module(uuid, text, text) from public, anon;
grant execute on function private.offload_effacer_module(uuid, text, text) to authenticated, service_role;
revoke execute on function public.offload_effacer_module(uuid, text) from public, anon;
grant execute on function public.offload_effacer_module(uuid, text) to authenticated, service_role;
