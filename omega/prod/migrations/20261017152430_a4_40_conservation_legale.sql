-- 20261017152430 a4_40_conservation_legale
-- Source : dépôt : aba2925 omega/migrations/a4_40_filed_lot32_conservation_legale.sql.
-- Assemblé par omega/prod/assembler.mjs pour la production (noepmkkplxshjbmqqxft). Transformations : fichiers : a4_40_filed_lot32_conservation_legale.sql @ aba2925.
-- ═══ omega/migrations/a4_40_filed_lot32_conservation_legale.sql @ aba2925
-- FILED, lot 32 (a4_40) — l'effacement efface tout, sauf ce que la loi oblige à garder.
--
-- Décision de Teo (17/10) : « tout sauf ce que la loi oblige à garder ; archive probante et registre 10 ans, scellés,
-- exportables, et l'écran le dit ». Le Code de commerce (L123-22) fait garder dix ans les documents comptables et les
-- pièces justificatives, à compter de la clôture de l'exercice.
--
-- Le socle efface une organisation (private.effacer_client) table par table, puis supprime la ligne de clients — ce
-- qui emporte par cascade toute table qui la référence. Ce qui doit survivre ne peut donc pas rester où il est. Ce
-- lot pose :
--   filed_conservation           le dépôt légal : sans lien avec clients (rien ne l'emporte), absent de
--                                private.tables_locataires (effacer_client ne le vide pas), fermé aux membres, en ajout
--                                seul jusqu'à son terme, chaîné ligne à ligne par SHA-256 (scellé) ;
--   filed_conservation_clients   par organisation effacée : nom, SIREN, date, terme, nombre de lignes, dernière
--                                empreinte de la chaîne ;
--   les déclencheurs             avant chaque suppression, pendant un effacement (private.effacement_en_cours :
--                                organisation ou objet), d'une ligne du registre des pièces reçues
--                                (filed_documents), d'une archive probante (filed_archives), d'une facture
--                                (filed_factures : le résumé comptable de la pièce) ou d'une écriture (filed_ecritures),
--                                la ligne est recopiée au dépôt, avec son terme : clôture de l'exercice + 10 ans ;
--                                l'adresse de l'expéditeur, donnée personnelle sans valeur comptable, n'y va pas ;
--   public.filed_bilan_effacement(client)    pour l'écran : ce qui sera effacé, ce qui sera gardé et jusqu'à quand ;
--   public.filed_exporter_conservation(client), public.filed_verifier_conservation(client)   (service_role) : le
--                                dépôt d'une organisation effacée, exporté et vérifié (la chaîne recalculée).
-- Les FICHIERS des pièces ne sont pas traités ici : le socle exige qu'ils soient retirés avant l'effacement
-- (private.fichiers_de, private.preparer_effacement, A5). Le bilan le dit. La purge du dépôt à son terme est un lot
-- à part (une suppression, à poser à la main). Migration idempotente ; aucune suppression.

create table if not exists public.filed_conservation (
  id                     bigint generated always as identity primary key,
  -- Pas de clé étrangère : l'organisation est effacée, son dépôt légal demeure.
  client_id              uuid not null,
  nature                 text not null check (nature in ('registre', 'archive', 'facture', 'ecriture')),
  source_id              text not null,
  origine_le             date,
  donnees                jsonb not null,
  conserver_jusqu_au     date not null,
  cause                  text not null check (cause in ('effacement_organisation', 'effacement_objet')),
  empreinte_precedente   text,
  empreinte              text not null check (empreinte ~ '^[0-9a-f]{64}$'),
  conserve_le            timestamptz not null default now()
);
comment on table public.filed_conservation is
  'Lot 32 (a4_40) : ce que la loi oblige à garder dix ans après l''effacement d''une organisation (registre des pièces reçues, archives probantes, factures, écritures). Sans lien avec clients, chaîné par SHA-256, en ajout seul jusqu''à son terme. Fermé aux membres.';
create index if not exists filed_conservation_client on public.filed_conservation (client_id, id);
create index if not exists filed_conservation_terme on public.filed_conservation (conserver_jusqu_au);
alter table public.filed_conservation enable row level security;
revoke all on table public.filed_conservation from public, anon, authenticated;
grant select on public.filed_conservation to service_role;

create table if not exists public.filed_conservation_clients (
  client_id           uuid primary key,
  nom                 text,
  sirens              text[] not null default '{}',
  premiere_le         timestamptz not null default now(),
  derniere_le         timestamptz not null default now(),
  conserver_jusqu_au  date not null,
  lignes              integer not null default 0,
  empreinte           text not null
);
comment on table public.filed_conservation_clients is 'Lot 32 (a4_40) : par organisation effacée, l''en-tête de son dépôt légal FILED (nom, SIREN, terme, dernière empreinte de la chaîne).';
alter table public.filed_conservation_clients enable row level security;
revoke all on table public.filed_conservation_clients from public, anon, authenticated;
grant select on public.filed_conservation_clients to service_role;

-- En ajout seul : rien ne se modifie ; rien ne s'efface avant son terme.
create or replace function private.filed_conservation_scellee()
returns trigger language plpgsql set search_path to '' as $$
begin
  if tg_op = 'DELETE' and old.conserver_jusqu_au < current_date then return old; end if;
  raise exception 'Le dépôt légal ne se modifie pas et ne s''efface pas avant son terme (%).', old.conserver_jusqu_au using errcode = '55000';
end $$;
revoke all on function private.filed_conservation_scellee() from public, anon, authenticated;
create or replace trigger filed_conservation_scellee
  before update or delete on public.filed_conservation
  for each row execute function private.filed_conservation_scellee();

-- Le terme : clôture de l'exercice + 10 ans ; sans exercice connu, fin de l'année + 10 ans.
create or replace function private.filed_terme_conservation(p_client uuid, p_entite uuid, p_date date, p_exercice uuid default null)
returns date language sql stable security definer set search_path to '' as $$
  select (coalesce(
            (select x.fin from public.filed_exercices x where x.id = p_exercice),
            (select x.fin from public.filed_exercices x where x.client_id = p_client and x.entite_id = p_entite
                and coalesce(p_date, current_date) between x.debut and x.fin order by x.fin limit 1),
            (date_trunc('year', coalesce(p_date, current_date)::timestamp) + interval '1 year - 1 day')::date)
          + interval '10 years')::date
$$;
revoke all on function private.filed_terme_conservation(uuid, uuid, date, uuid) from public, anon, authenticated;

-- Une ligne au dépôt, chaînée à la précédente de la même organisation.
create or replace function private.filed_conserver(p_client uuid, p_nature text, p_source text, p_origine date, p_donnees jsonb, p_terme date)
returns void language plpgsql security definer set search_path to '' as $$
declare v_prec text; v_emp text; v_cause text; v_nom text; v_sirens text[];
begin
  perform pg_advisory_xact_lock(hashtextextended('filed_conservation|' || p_client::text, 0));
  v_cause := case when p_client::text = coalesce(current_setting('omega.effacement_client', true), '') then 'effacement_organisation' else 'effacement_objet' end;
  select c.empreinte into v_prec from public.filed_conservation c where c.client_id = p_client order by c.id desc limit 1;
  v_emp := encode(sha256(convert_to(concat_ws('|', coalesce(v_prec, ''), p_nature, p_source, coalesce(p_origine::text, ''), p_terme::text, p_donnees::text), 'UTF8')), 'hex');
  insert into public.filed_conservation (client_id, nature, source_id, origine_le, donnees, conserver_jusqu_au, cause, empreinte_precedente, empreinte)
  values (p_client, p_nature, p_source, p_origine, p_donnees, p_terme, v_cause, v_prec, v_emp);
  select c.nom into v_nom from public.clients c where c.id = p_client;
  select coalesce(array_agg(distinct e.siren) filter (where e.siren is not null), '{}') into v_sirens from public.entites e where e.client_id = p_client;
  insert into public.filed_conservation_clients (client_id, nom, sirens, conserver_jusqu_au, lignes, empreinte)
  values (p_client, v_nom, v_sirens, p_terme, 1, v_emp)
  on conflict (client_id) do update
     set nom = coalesce(excluded.nom, filed_conservation_clients.nom),
         sirens = (select array(select distinct unnest(filed_conservation_clients.sirens || excluded.sirens))),
         derniere_le = now(), conserver_jusqu_au = greatest(filed_conservation_clients.conserver_jusqu_au, excluded.conserver_jusqu_au),
         lignes = filed_conservation_clients.lignes + 1, empreinte = excluded.empreinte;
end $$;
revoke all on function private.filed_conserver(uuid, text, text, date, jsonb, date) from public, anon, authenticated;

-- Les déclencheurs : avant la suppression, pendant un effacement, la copie au dépôt.
create or replace function private.filed_conserver_avant_effacement()
returns trigger language plpgsql security definer set search_path to '' as $$
declare v_f public.filed_factures; v_d public.filed_documents;
begin
  if not private.effacement_en_cours(old.client_id) then return old; end if;
  if tg_table_name = 'filed_documents' then
    v_d := old;
    select * into v_f from public.filed_factures f where f.document_id = v_d.id;
    perform private.filed_conserver(v_d.client_id, 'registre', v_d.id::text, (v_d.recu_le at time zone 'Europe/Paris')::date,
      to_jsonb(v_d) - 'expediteur' - 'depose_par',
      private.filed_terme_conservation(v_d.client_id, v_d.entite_id, coalesce(v_f.date_emission, (v_d.recu_le at time zone 'Europe/Paris')::date)));
  elsif tg_table_name = 'filed_archives' then
    perform private.filed_conserver(old.client_id, 'archive', (to_jsonb(old) ->> 'id'), (old.archive_le at time zone 'Europe/Paris')::date, to_jsonb(old),
      private.filed_terme_conservation(old.client_id, old.entite_id,
        (select f.date_emission from public.filed_factures f where f.id = (to_jsonb(old) ->> 'facture_id')::uuid)));
  elsif tg_table_name = 'filed_factures' then
    v_f := old;
    perform private.filed_conserver(v_f.client_id, 'facture', v_f.id::text, v_f.date_emission,
      jsonb_build_object('document_id', v_f.document_id, 'entite_id', v_f.entite_id, 'nature', v_f.nature, 'numero', v_f.numero,
        'date_emission', v_f.date_emission, 'date_reception', v_f.date_reception, 'devise', v_f.devise, 'montant_ht', v_f.montant_ht,
        'montant_tva', v_f.montant_tva, 'montant_ttc', v_f.montant_ttc, 'statut', v_f.statut, 'version', v_f.version,
        'empreinte_donnees', v_f.empreinte_donnees, 'fournisseur', (select jsonb_build_object('nom', fo.nom, 'siren', fo.siren, 'tva', fo.tva, 'pays', fo.pays)
                                                                     from public.filed_fournisseurs fo where fo.id = v_f.fournisseur_id)),
      private.filed_terme_conservation(v_f.client_id, v_f.entite_id, v_f.date_emission));
  elsif tg_table_name = 'filed_ecritures' then
    perform private.filed_conserver(old.client_id, 'ecriture', (to_jsonb(old) ->> 'id'), (to_jsonb(old) ->> 'ecriture_date')::date, to_jsonb(old),
      private.filed_terme_conservation(old.client_id, (to_jsonb(old) ->> 'entite_id')::uuid, (to_jsonb(old) ->> 'ecriture_date')::date,
                                       (to_jsonb(old) ->> 'exercice_id')::uuid));
  end if;
  return old;
end $$;
revoke all on function private.filed_conserver_avant_effacement() from public, anon, authenticated;

-- Noms en « filed_*_conservation » : ils passent avant les gardes du même événement (ordre alphabétique).
create or replace trigger filed_documents_conservation before delete on public.filed_documents
  for each row execute function private.filed_conserver_avant_effacement();
create or replace trigger filed_archives_conservation before delete on public.filed_archives
  for each row execute function private.filed_conserver_avant_effacement();
create or replace trigger filed_factures_conservation before delete on public.filed_factures
  for each row execute function private.filed_conserver_avant_effacement();
create or replace trigger filed_ecritures_conservation before delete on public.filed_ecritures
  for each row execute function private.filed_conserver_avant_effacement();

-- ───────────────────────────────────────────────────────────────────────────
-- L'écran : ce qui part, ce qui reste, jusqu'à quand
-- ───────────────────────────────────────────────────────────────────────────
create or replace function private.filed_bilan_effacement(p_client uuid)
returns jsonb language plpgsql stable security definer set search_path to '' as $$
declare v_garde jsonb; v_efface jsonb; v_terme date; r record; n bigint;
begin
  perform private.filed_exiger_acteur(p_client, array['gerant', 'admin']);
  select jsonb_build_object(
           'registre', (select count(*) from public.filed_documents d where d.client_id = p_client),
           'archives', (select count(*) from public.filed_archives a where a.client_id = p_client),
           'factures', (select count(*) from public.filed_factures f where f.client_id = p_client),
           'ecritures', (select count(*) from public.filed_ecritures e where e.client_id = p_client))
    into v_garde;
  select max(t) into v_terme from (
    select private.filed_terme_conservation(e.client_id, e.entite_id, e.ecriture_date, e.exercice_id) t from public.filed_ecritures e where e.client_id = p_client
    union all
    select private.filed_terme_conservation(f.client_id, f.entite_id, f.date_emission) from public.filed_factures f where f.client_id = p_client
    union all
    select private.filed_terme_conservation(d.client_id, d.entite_id, (d.recu_le at time zone 'Europe/Paris')::date) from public.filed_documents d where d.client_id = p_client) s;
  v_efface := '{}'::jsonb;
  for r in select t.nom from private.tables_locataires t
            where t.nom like 'filed\_%' and t.nom not in ('filed_documents', 'filed_archives', 'filed_factures', 'filed_ecritures')
              and to_regclass('public.' || t.nom) is not null
            order by t.nom loop
    execute format('select count(*) from public.%I where client_id = $1', r.nom) into n using p_client;
    if n > 0 then v_efface := v_efface || jsonb_build_object(r.nom, n); end if;
  end loop;
  return jsonb_build_object(
    'garde', v_garde,
    'garde_jusqu_au', v_terme,
    'efface', v_efface,
    'fichiers', 'Les fichiers des pièces sont retirés avant l''effacement par le parcours du socle (préparation, puis stockage) ; leur conservation n''est pas assurée par FILED.',
    'texte', concat_ws(' ',
      'Tout ce que FILED tient pour vous est effacé, sauf ce que la loi oblige à garder.',
      format('Le registre des pièces reçues (%s), les archives probantes (%s), les factures (%s) et les écritures comptables (%s) sont conservés dix ans après la clôture de leur exercice%s,',
             v_garde ->> 'registre', v_garde ->> 'archives', v_garde ->> 'factures', v_garde ->> 'ecritures',
             coalesce(', jusqu''au ' || to_char(v_terme, 'DD/MM/YYYY') || ' au plus tard', '')),
      'scellés (chaque ligne porte l''empreinte de la précédente), hors de votre espace, et exportables sur demande.',
      'Le reste — fournisseurs, imputations, contrôles, réglages, historique de traitement — est effacé.'));
end $$;
revoke all on function private.filed_bilan_effacement(uuid) from public, anon;
grant execute on function private.filed_bilan_effacement(uuid) to authenticated, service_role;

create or replace function public.filed_bilan_effacement(p_client uuid)
returns jsonb language sql stable set search_path to '' as $$ select private.filed_bilan_effacement(p_client) $$;
comment on function public.filed_bilan_effacement(uuid) is
  'Pour l''écran d''effacement : ce qui sera gardé (registre, archives, factures, écritures : nombre et terme), ce qui sera effacé, et la phrase qui le dit. Gérant ou admin.';
revoke all on function public.filed_bilan_effacement(uuid) from public, anon;
grant execute on function public.filed_bilan_effacement(uuid) to authenticated, service_role;

-- ───────────────────────────────────────────────────────────────────────────
-- Exporter et vérifier le dépôt d'une organisation effacée (service_role : l'opérateur, sur demande)
-- ───────────────────────────────────────────────────────────────────────────
create or replace function public.filed_verifier_conservation(p_client uuid)
returns jsonb language plpgsql stable security definer set search_path to '' as $$
declare r record; v_prec text; v_calc text; n integer := 0; v_rompue bigint;
begin
  for r in select * from public.filed_conservation c where c.client_id = p_client order by c.id loop
    v_calc := encode(sha256(convert_to(concat_ws('|', coalesce(v_prec, ''), r.nature, r.source_id, coalesce(r.origine_le::text, ''),
                                                 r.conserver_jusqu_au::text, r.donnees::text), 'UTF8')), 'hex');
    if r.empreinte_precedente is distinct from v_prec or r.empreinte <> v_calc then v_rompue := r.id; exit; end if;
    v_prec := r.empreinte; n := n + 1;
  end loop;
  return jsonb_build_object('client', p_client, 'lignes', n, 'intacte', v_rompue is null, 'rompue_a', v_rompue, 'empreinte', v_prec,
    'empreinte_entete', (select c.empreinte from public.filed_conservation_clients c where c.client_id = p_client));
end $$;
comment on function public.filed_verifier_conservation(uuid) is 'Recalcule la chaîne du dépôt légal FILED d''une organisation : intacte ou rompue (et où). service_role.';
revoke all on function public.filed_verifier_conservation(uuid) from public, anon, authenticated;
grant execute on function public.filed_verifier_conservation(uuid) to service_role;

create or replace function public.filed_exporter_conservation(p_client uuid, p_par text)
returns jsonb language plpgsql security definer set search_path to '' as $$
declare v jsonb;
begin
  if nullif(btrim(p_par), '') is null then raise exception 'Dites qui exporte (opérateur) et pour qui.' using errcode = '22023'; end if;
  select jsonb_build_object(
    'entete', (select to_jsonb(c) from public.filed_conservation_clients c where c.client_id = p_client),
    'verification', public.filed_verifier_conservation(p_client),
    'lignes', coalesce((select jsonb_agg(jsonb_build_object('nature', x.nature, 'source', x.source_id, 'origine_le', x.origine_le,
                                                            'jusqu_au', x.conserver_jusqu_au, 'donnees', x.donnees, 'empreinte', x.empreinte) order by x.id)
                        from public.filed_conservation x where x.client_id = p_client), '[]'::jsonb))
    into v;
  if v -> 'entete' is null or v -> 'entete' = 'null'::jsonb then raise exception 'Aucun dépôt légal FILED pour cette organisation.' using errcode = 'P0002'; end if;
  -- L'organisation est effacée : la trace de l'export va au dépôt lui-même, hors chaîne, dans les journaux du serveur.
  raise log 'FILED : dépôt légal de % exporté par % (% lignes)', p_client, btrim(p_par), jsonb_array_length(v -> 'lignes');
  return v;
end $$;
comment on function public.filed_exporter_conservation(uuid, text) is 'Exporte le dépôt légal FILED d''une organisation effacée (en-tête, lignes, vérification de la chaîne). service_role, sur demande ; p_par : qui.';
revoke all on function public.filed_exporter_conservation(uuid, text) from public, anon, authenticated;
grant execute on function public.filed_exporter_conservation(uuid, text) to service_role;
