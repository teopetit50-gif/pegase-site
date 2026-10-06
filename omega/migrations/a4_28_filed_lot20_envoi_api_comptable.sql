-- FILED, lot 20 (a4_28) — les écritures partent par API : Pennylane (v2), QuickBooks Online, Cegid Loop.
--
-- Carnet n° 6, second temps (feu vert du coordinateur, 6/10). Le premier temps (a4_25) produit les fichiers d'import ;
-- celui-ci pousse chaque écriture, l'une après l'autre, dans le logiciel de la société, par l'ouvrier « compta »
-- (omega/functions/compta). Une écriture n'est envoyée qu'une fois : l'envoi est noté AVANT l'appel (commencer), puis
-- confirmé (noter) ou refusé (échouer) ; un envoi resté « en cours » est repris avec une recherche préalable chez
-- l'éditeur (Pennylane n'a pas d'idempotence : « handle idempotency in your integration logic »).
--
-- Les jetons ne sont jamais dans une table : ils sont dans le coffre (Vault), sous le nom compta:<connexion>, posés et
-- renouvelés par l'ouvrier (portes service_role). La connexion ne garde que ce nom.
--
--   Tables : filed_connexions_comptables (une par société et par éditeur), filed_envois_api (une ligne par écriture et
--   par connexion).
--   Personnes (gérant, admin) : public.filed_connecter_logiciel(client, entite, editeur, parametres, depuis) → uuid ;
--     public.filed_preparer_autorisation(connexion) → nonce à usage unique (state OAuth) ;
--     public.filed_suspendre_connexion(connexion, motif) ; public.filed_reprendre_connexion(connexion).
--   Ouvrier (service_role seul) : compta_consommer_autorisation(nonce), compta_activer_connexion(connexion, secret, parametres),
--     compta_secret(connexion),
--     compta_poser_secret(connexion, secret), compta_a_envoyer(max), compta_commencer_envoi, compta_noter_envoi,
--     compta_echouer_envoi, compta_reference_envoi, compta_connexion_en_panne.
-- Migration idempotente ; aucune suppression.

-- ───────────────────────────────────────────────────────────────────────────
-- 1. Tables
-- ───────────────────────────────────────────────────────────────────────────
create table if not exists public.filed_connexions_comptables (
  id                 uuid primary key default gen_random_uuid(),
  client_id          uuid not null references public.clients(id) on delete cascade,
  entite_id          uuid not null references public.entites(id) on delete cascade,
  editeur            text not null check (editeur in ('pennylane', 'quickbooks', 'cegid_loop')),
  etat               text not null default 'a_autoriser' check (etat in ('a_autoriser', 'active', 'suspendue', 'en_panne')),
  -- Le nom du secret dans le coffre (jamais le secret) : compta:<id>.
  secret_nom         text,
  -- pennylane : {journal_achats, journal_banque, journal_caisse} (codes) ; quickbooks : {realm_id, environnement} ;
  -- cegid_loop : {code_ibs, environnement}. Jamais de secret ici.
  parametres         jsonb not null default '{}'::jsonb,
  -- Les écritures d'id supérieur partent ; posé à la connexion (pas d'historique envoyé sans le demander).
  depuis_ecriture    bigint not null default 0,
  erreur             text,
  derniere_reussite  timestamptz,
  -- L'autorisation en cours chez l'éditeur : l'empreinte d'un nonce à usage unique (jamais le nonce) et son échéance.
  autorisation_empreinte text,
  autorisation_expire    timestamptz,
  cree_par           uuid,
  cree_le            timestamptz not null default now(),
  maj_le             timestamptz not null default now(),
  constraint filed_connexions_comptables_sans_secret check (not (parametres ?| array['access_token', 'refresh_token', 'token', 'secret', 'api_key', 'apikey', 'password']))
);
comment on table public.filed_connexions_comptables is
  'La connexion d''une société à son logiciel comptable (Pennylane, QuickBooks, Cegid Loop) : état, paramètres sans secret, nom du secret dans le coffre (a4_28).';
create unique index if not exists filed_connexions_comptables_un on public.filed_connexions_comptables (entite_id, editeur);
alter table public.filed_connexions_comptables enable row level security;
do $$ begin
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'filed_connexions_comptables' and policyname = 'filed_connexions_comptables_lecture') then
    execute 'create policy filed_connexions_comptables_lecture on public.filed_connexions_comptables for select to authenticated using (client_id in (select private.mes_clients()))';
  end if;
end $$;
alter table public.filed_connexions_comptables add column if not exists autorisation_empreinte text;
alter table public.filed_connexions_comptables add column if not exists autorisation_expire timestamptz;
revoke all on table public.filed_connexions_comptables from anon, authenticated;
grant select (id, client_id, entite_id, editeur, etat, parametres, depuis_ecriture, erreur, derniere_reussite, cree_par, cree_le, maj_le)
  on public.filed_connexions_comptables to authenticated;

create table if not exists public.filed_envois_api (
  id            uuid primary key default gen_random_uuid(),
  connexion_id  uuid not null references public.filed_connexions_comptables(id) on delete cascade,
  client_id     uuid not null references public.clients(id) on delete cascade,
  entite_id     uuid not null references public.entites(id) on delete cascade,
  exercice_cle  text not null,
  ecriture_num  integer not null,
  etat          text not null check (etat in ('en_cours', 'a_reprendre', 'envoye', 'refuse')),
  tentatives    integer not null default 0,
  id_externe    text,
  erreur        text,
  commence_le   timestamptz,
  envoye_le     timestamptz,
  maj_le        timestamptz not null default now(),
  unique (connexion_id, exercice_cle, ecriture_num)
);
comment on table public.filed_envois_api is
  'Chaque écriture poussée par API dans un logiciel comptable (a4_28) : état, essais, identifiant chez l''éditeur. Une écriture « envoyee » ne repart jamais.';
create index if not exists filed_envois_api_etat on public.filed_envois_api (connexion_id, etat);
alter table public.filed_envois_api enable row level security;
do $$ begin
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'filed_envois_api' and policyname = 'filed_envois_api_lecture') then
    execute 'create policy filed_envois_api_lecture on public.filed_envois_api for select to authenticated using (client_id in (select private.mes_clients()))';
  end if;
end $$;
revoke all on table public.filed_envois_api from anon, authenticated;
grant select on public.filed_envois_api to authenticated;

insert into private.tables_locataires (nom, ordre_effacement, note) values
  ('filed_envois_api', 2, 'FILED, lot 20'), ('filed_connexions_comptables', 3, 'FILED, lot 20')
on conflict (nom) do update set ordre_effacement = excluded.ordre_effacement, note = excluded.note;

-- ───────────────────────────────────────────────────────────────────────────
-- 2. Les personnes : connecter, suspendre, reprendre
-- ───────────────────────────────────────────────────────────────────────────
create or replace function private.filed_connecter_logiciel(p_client uuid, p_entite uuid, p_editeur text, p_parametres jsonb default '{}'::jsonb,
                                                           p_depuis date default null)
returns uuid language plpgsql security definer set search_path to '' as $$
declare v_acteur uuid; v_id uuid; v_depuis bigint; v_p jsonb := coalesce(p_parametres, '{}'::jsonb);
begin
  v_acteur := private.filed_exiger_acteur(p_client, array['gerant', 'admin'], p_entite);
  if p_editeur is null or p_editeur not in ('pennylane', 'quickbooks', 'cegid_loop') then
    raise exception 'Éditeur inconnu : pennylane, quickbooks ou cegid_loop.' using errcode = '22023';
  end if;
  if not exists (select 1 from public.entites where id = p_entite and client_id = p_client) then
    raise exception 'Société introuvable dans cette organisation.' using errcode = '22023';
  end if;
  if jsonb_typeof(v_p) <> 'object' or v_p ?| array['access_token', 'refresh_token', 'token', 'secret', 'api_key', 'apikey', 'password'] then
    raise exception 'Les paramètres d''une connexion ne portent jamais de secret : il passe par l''autorisation de l''éditeur.' using errcode = '22023';
  end if;
  if p_editeur = 'quickbooks' and coalesce(v_p ->> 'environnement', 'production') not in ('sandbox', 'production') then
    raise exception 'QuickBooks : environnement sandbox ou production.' using errcode = '22023';
  end if;
  if p_editeur = 'cegid_loop' and nullif(btrim(v_p ->> 'code_ibs'), '') is null then
    raise exception 'Cegid Loop : le code du dossier (code_ibs) est nécessaire.' using errcode = '22023';
  end if;
  -- Depuis une date : les écritures enregistrées à partir de ce jour ; sans date, seulement les futures.
  if p_depuis is not null then
    select coalesce(min(e.id) - 1, (select coalesce(max(id), 0) from public.filed_ecritures)) into v_depuis
      from public.filed_ecritures e where e.client_id = p_client and e.entite_id = p_entite and e.ecriture_date >= p_depuis;
  else
    select coalesce(max(id), 0) into v_depuis from public.filed_ecritures;
  end if;
  insert into public.filed_connexions_comptables (client_id, entite_id, editeur, etat, parametres, depuis_ecriture, cree_par)
  values (p_client, p_entite, p_editeur, 'a_autoriser', v_p, v_depuis, v_acteur)
  on conflict (entite_id, editeur) do update
    set parametres = excluded.parametres, depuis_ecriture = excluded.depuis_ecriture, maj_le = now(),
        etat = case when public.filed_connexions_comptables.etat = 'active' then 'active' else 'a_autoriser' end
  returning id into v_id;
  update public.filed_connexions_comptables set secret_nom = 'compta:' || v_id::text where id = v_id and secret_nom is null;
  perform private.filed_journaliser(p_client, 'filed.connexion_comptable', 'entite', p_entite::text,
    jsonb_build_object('connexion', v_id, 'editeur', p_editeur, 'depuis', p_depuis, 'depuis_ecriture', v_depuis), p_entite);
  return v_id;
end $$;
revoke all on function private.filed_connecter_logiciel(uuid, uuid, text, jsonb, date) from public, anon;
grant execute on function private.filed_connecter_logiciel(uuid, uuid, text, jsonb, date) to authenticated, service_role;
create or replace function public.filed_connecter_logiciel(p_client uuid, p_entite uuid, p_editeur text, p_parametres jsonb default '{}'::jsonb,
                                                          p_depuis date default null)
returns uuid language sql set search_path to '' as $$ select private.filed_connecter_logiciel(p_client, p_entite, p_editeur, p_parametres, p_depuis) $$;
comment on function public.filed_connecter_logiciel(uuid, uuid, text, jsonb, date) is
  'Déclare la connexion d''une société à Pennylane, QuickBooks ou Cegid Loop (à autoriser chez l''éditeur ensuite). Gérant ou admin.';
revoke all on function public.filed_connecter_logiciel(uuid, uuid, text, jsonb, date) from public, anon;
grant execute on function public.filed_connecter_logiciel(uuid, uuid, text, jsonb, date) to authenticated, service_role;

create or replace function private.filed_regler_connexion(p_connexion uuid, p_etat text, p_motif text)
returns void language plpgsql security definer set search_path to '' as $$
declare c public.filed_connexions_comptables;
begin
  select * into c from public.filed_connexions_comptables where id = p_connexion for update;
  if not found then raise exception 'Connexion introuvable.' using errcode = 'P0002'; end if;
  perform private.filed_exiger_acteur(c.client_id, array['gerant', 'admin'], c.entite_id);
  if p_etat = 'active' and c.etat not in ('suspendue', 'en_panne') then
    raise exception 'Seule une connexion suspendue ou en panne se reprend (état : %).', c.etat using errcode = '55000';
  end if;
  update public.filed_connexions_comptables set etat = p_etat, erreur = case when p_etat = 'active' then null else left(p_motif, 500) end, maj_le = now()
   where id = c.id;
  perform private.filed_journaliser(c.client_id, 'filed.connexion_comptable', 'entite', c.entite_id::text,
    jsonb_build_object('connexion', c.id, 'editeur', c.editeur, 'etat', p_etat, 'motif', p_motif), c.entite_id);
end $$;
revoke all on function private.filed_regler_connexion(uuid, text, text) from public, anon;
grant execute on function private.filed_regler_connexion(uuid, text, text) to authenticated, service_role;
create or replace function public.filed_suspendre_connexion(p_connexion uuid, p_motif text default null)
returns void language sql set search_path to '' as $$ select private.filed_regler_connexion(p_connexion, 'suspendue', coalesce(p_motif, 'Suspendue par une personne.')) $$;
create or replace function public.filed_reprendre_connexion(p_connexion uuid)
returns void language sql set search_path to '' as $$ select private.filed_regler_connexion(p_connexion, 'active', null) $$;
revoke all on function public.filed_suspendre_connexion(uuid, text) from public, anon;
revoke all on function public.filed_reprendre_connexion(uuid) from public, anon;
grant execute on function public.filed_suspendre_connexion(uuid, text), public.filed_reprendre_connexion(uuid) to authenticated, service_role;

-- ───────────────────────────────────────────────────────────────────────────
-- 3. L'ouvrier : le secret (dans le coffre)
-- ───────────────────────────────────────────────────────────────────────────
-- Pose ou remplace le secret d'une connexion (jetons OAuth en JSON, ou clé d'API) ; jamais lu ni écrit ailleurs.
create or replace function public.compta_poser_secret(p_connexion uuid, p_secret text)
returns void language plpgsql security definer set search_path to '' as $$
declare c public.filed_connexions_comptables; v_id uuid;
begin
  select * into c from public.filed_connexions_comptables where id = p_connexion;
  if not found then raise exception 'Connexion introuvable.' using errcode = 'P0002'; end if;
  if nullif(p_secret, '') is null then raise exception 'Secret vide.' using errcode = '22023'; end if;
  select s.id into v_id from vault.secrets s where s.name = c.secret_nom;
  if v_id is null then
    perform vault.create_secret(p_secret, c.secret_nom, 'Connexion comptable ' || c.editeur || ' (FILED, a4_28)');
  else
    perform vault.update_secret(v_id, p_secret);
  end if;
end $$;
create or replace function public.compta_secret(p_connexion uuid)
returns text language sql stable security definer set search_path to '' as $$
  select s.decrypted_secret from public.filed_connexions_comptables c
    join vault.decrypted_secrets s on s.name = c.secret_nom
   where c.id = p_connexion
$$;
-- L'autorisation donnée chez l'éditeur : le secret est posé, la connexion devient active.
create or replace function public.compta_activer_connexion(p_connexion uuid, p_secret text, p_parametres jsonb default null)
returns void language plpgsql security definer set search_path to '' as $$
declare c public.filed_connexions_comptables;
begin
  select * into c from public.filed_connexions_comptables where id = p_connexion for update;
  if not found then raise exception 'Connexion introuvable.' using errcode = 'P0002'; end if;
  if p_parametres is not null and (jsonb_typeof(p_parametres) <> 'object'
     or p_parametres ?| array['access_token', 'refresh_token', 'token', 'secret', 'api_key', 'apikey', 'password']) then
    raise exception 'Paramètres invalides : un objet, sans secret.' using errcode = '22023';
  end if;
  perform public.compta_poser_secret(p_connexion, p_secret);
  update public.filed_connexions_comptables
     set etat = 'active', erreur = null, parametres = parametres || coalesce(p_parametres, '{}'::jsonb), maj_le = now()
   where id = c.id;
  perform private.filed_journaliser(c.client_id, 'filed.connexion_comptable', 'entite', c.entite_id::text,
    jsonb_build_object('connexion', c.id, 'editeur', c.editeur, 'etat', 'active', 'origine', 'autorisation'), c.entite_id);
end $$;
-- Le jeton est refusé pour de bon (révoqué, expiré sans renouvellement) : la connexion s'arrête et une personne est prévenue.
create or replace function public.compta_connexion_en_panne(p_connexion uuid, p_erreur text)
returns void language plpgsql security definer set search_path to '' as $$
declare c public.filed_connexions_comptables;
begin
  update public.filed_connexions_comptables set etat = 'en_panne', erreur = left(coalesce(p_erreur, 'panne'), 500), maj_le = now()
   where id = p_connexion and etat = 'active' returning * into c;
  if c.id is null then return; end if;
  perform private.lever_alerte_module(c.client_id, 'filed', 'attention',
    left(format('Envoi vers %s arrêté : %s', private.filed_editeur_libelle(c.editeur), coalesce(p_erreur, 'connexion refusée')), 200),
    jsonb_build_object('connexion', c.id, 'editeur', c.editeur, 'action', 'reautoriser'), 'compta_panne:' || c.id::text, false, null);
end $$;

-- Le gérant commence l'autorisation chez l'éditeur : un nonce à usage unique (quinze minutes), rendu une seule fois ;
-- seule son empreinte est gardée. L'écran l'envoie comme « state » à l'éditeur ; le retour de l'éditeur le rend à
-- l'ouvrier, qui le consomme. Personne d'autre ne peut rattacher un compte d'éditeur à cette connexion.
create or replace function private.filed_preparer_autorisation(p_connexion uuid)
returns text language plpgsql security definer set search_path to '' as $$
declare c public.filed_connexions_comptables; v_nonce text := encode(sha256(convert_to(gen_random_uuid()::text || clock_timestamp()::text || random()::text, 'UTF8')), 'hex');
begin
  select * into c from public.filed_connexions_comptables where id = p_connexion for update;
  if not found then raise exception 'Connexion introuvable.' using errcode = 'P0002'; end if;
  perform private.filed_exiger_acteur(c.client_id, array['gerant', 'admin'], c.entite_id);
  if c.editeur = 'cegid_loop' then
    raise exception 'Cegid Loop ne passe pas par une autorisation en ligne : les clés sont posées par le service.' using errcode = '22023';
  end if;
  update public.filed_connexions_comptables
     set autorisation_empreinte = encode(sha256(convert_to(v_nonce, 'UTF8')), 'hex'), autorisation_expire = now() + interval '15 minutes', maj_le = now()
   where id = c.id;
  return v_nonce;
end $$;
revoke all on function private.filed_preparer_autorisation(uuid) from public, anon;
grant execute on function private.filed_preparer_autorisation(uuid) to authenticated, service_role;
create or replace function public.filed_preparer_autorisation(p_connexion uuid)
returns text language sql set search_path to '' as $$ select private.filed_preparer_autorisation(p_connexion) $$;
comment on function public.filed_preparer_autorisation(uuid) is
  'Commence l''autorisation d''une connexion comptable chez l''éditeur : rend un nonce à usage unique (15 minutes) à passer en « state ». Gérant ou admin.';
revoke all on function public.filed_preparer_autorisation(uuid) from public, anon;
grant execute on function public.filed_preparer_autorisation(uuid) to authenticated, service_role;

-- Le retour de l'éditeur : le nonce est consommé (une fois) et désigne la connexion ; null s'il est inconnu ou échu.
create or replace function public.compta_consommer_autorisation(p_nonce text)
returns jsonb language plpgsql security definer set search_path to '' as $$
declare c public.filed_connexions_comptables;
begin
  if p_nonce is null or p_nonce !~ '^[0-9a-f]{64}$' then return null; end if;
  update public.filed_connexions_comptables
     set autorisation_empreinte = null, autorisation_expire = null, maj_le = now()
   where autorisation_empreinte = encode(sha256(convert_to(p_nonce, 'UTF8')), 'hex') and autorisation_expire > now()
  returning * into c;
  if c.id is null then return null; end if;
  return jsonb_build_object('connexion', c.id, 'editeur', c.editeur, 'client_id', c.client_id, 'entite_id', c.entite_id);
end $$;

create or replace function private.filed_editeur_libelle(p text)
returns text language sql immutable set search_path to '' as $$
  select case p when 'pennylane' then 'Pennylane' when 'quickbooks' then 'QuickBooks' when 'cegid_loop' then 'Cegid Loop' else p end
$$;
revoke all on function private.filed_editeur_libelle(text) from public, anon, authenticated;
grant execute on function private.filed_editeur_libelle(text) to service_role;

-- ───────────────────────────────────────────────────────────────────────────
-- 4. L'ouvrier : la file des écritures à envoyer
-- ───────────────────────────────────────────────────────────────────────────
-- Les écritures à pousser, les plus anciennes d'abord : pas encore envoyées ni refusées, ou en cours depuis plus de
-- dix minutes (reprise : l'ouvrier cherche d'abord chez l'éditeur), huit essais au plus. Chaque élément porte sa
-- connexion (sans secret) et l'écriture entière, lignes comprises.
create or replace function public.compta_a_envoyer(p_max integer default 20)
returns jsonb language sql stable security definer set search_path to '' as $$
  with ecr as (
    select c.id connexion_id, e.exercice_cle, e.ecriture_num, min(e.id) premier
      from public.filed_connexions_comptables c
      join public.filed_ecritures e on e.client_id = c.client_id and e.entite_id = c.entite_id and e.id > c.depuis_ecriture
      left join public.filed_envois_api x on x.connexion_id = c.id and x.exercice_cle = e.exercice_cle and x.ecriture_num = e.ecriture_num
     where c.etat = 'active'
       and (x.id is null or x.etat = 'a_reprendre' or (x.etat = 'en_cours' and x.commence_le < now() - interval '10 minutes'))
       and coalesce(x.tentatives, 0) < 8
     group by c.id, e.exercice_cle, e.ecriture_num
     order by min(e.id)
     limit greatest(1, least(coalesce(p_max, 20), 100)))
  select coalesce(jsonb_agg(jsonb_build_object(
      'connexion', jsonb_build_object('id', c.id, 'editeur', c.editeur, 'client_id', c.client_id, 'entite_id', c.entite_id,
                                      'parametres', c.parametres),
      'ecriture', (select jsonb_build_object(
          'exercice_cle', min(l.exercice_cle), 'ecriture_num', min(l.ecriture_num), 'journal_code', min(l.journal_code),
          'journal_lib', min(l.journal_lib), 'date', min(l.ecriture_date), 'piece', min(l.piece_ref), 'piece_date', min(l.piece_date),
          'libelle', min(l.ecriture_lib), 'origine', min(l.origine), 'extourne_de', min(l.extourne_de),
          'cle', 'OMEGA-' || regexp_replace(min(l.exercice_cle), '[^A-Za-z0-9]', '', 'g') || '-' || min(l.journal_code) || '-' || min(l.ecriture_num),
          'lignes', jsonb_agg(jsonb_build_object('compte_num', l.compte_num, 'compte_lib', l.compte_lib, 'comp_aux_num', l.comp_aux_num,
                                                 'comp_aux_lib', l.comp_aux_lib, 'libelle', l.ecriture_lib, 'debit', l.debit, 'credit', l.credit,
                                                 'montant_devise', l.montant_devise, 'idevise', l.idevise) order by l.id))
          from public.filed_ecritures l
         where l.client_id = c.client_id and l.entite_id = c.entite_id and l.exercice_cle = ecr.exercice_cle and l.ecriture_num = ecr.ecriture_num),
      'envoi', (select jsonb_build_object('etat', x.etat, 'tentatives', x.tentatives, 'id_externe', x.id_externe, 'commence_le', x.commence_le)
                  from public.filed_envois_api x where x.connexion_id = c.id and x.exercice_cle = ecr.exercice_cle and x.ecriture_num = ecr.ecriture_num))
      order by ecr.premier), '[]'::jsonb)
    from ecr join public.filed_connexions_comptables c on c.id = ecr.connexion_id
$$;

-- Avant l'appel : l'envoi est noté « en cours ». Rend {reprise, tentatives} (reprise : il y a déjà eu un essai) ; refuse
-- une écriture déjà envoyée ou refusée.
create or replace function public.compta_commencer_envoi(p_connexion uuid, p_exercice_cle text, p_ecriture_num integer)
returns jsonb language plpgsql security definer set search_path to '' as $$
declare c public.filed_connexions_comptables; x public.filed_envois_api; v_reprise boolean;
begin
  select * into c from public.filed_connexions_comptables where id = p_connexion;
  if not found then raise exception 'Connexion introuvable.' using errcode = 'P0002'; end if;
  if c.etat <> 'active' then raise exception 'Connexion % : %.', private.filed_editeur_libelle(c.editeur), c.etat using errcode = '55000'; end if;
  if not exists (select 1 from public.filed_ecritures e where e.client_id = c.client_id and e.entite_id = c.entite_id
                  and e.exercice_cle = p_exercice_cle and e.ecriture_num = p_ecriture_num) then
    raise exception 'Écriture % % introuvable pour cette société.', p_exercice_cle, p_ecriture_num using errcode = 'P0002';
  end if;
  select * into x from public.filed_envois_api where connexion_id = c.id and exercice_cle = p_exercice_cle and ecriture_num = p_ecriture_num for update;
  if x.etat = 'envoye' then raise exception 'Écriture déjà envoyée (%).', x.id_externe using errcode = '55000'; end if;
  if x.etat = 'refuse' then raise exception 'Écriture refusée par l''éditeur : elle ne repart que sur décision d''une personne.' using errcode = '55000'; end if;
  -- Un essai précédent, confirmé ou non (délai dépassé, réponse perdue), a pu aboutir chez l'éditeur : l'ouvrier cherche d'abord.
  v_reprise := x.id is not null;
  insert into public.filed_envois_api (connexion_id, client_id, entite_id, exercice_cle, ecriture_num, etat, tentatives, commence_le)
  values (c.id, c.client_id, c.entite_id, p_exercice_cle, p_ecriture_num, 'en_cours', 1, now())
  on conflict (connexion_id, exercice_cle, ecriture_num) do update
    set etat = 'en_cours', tentatives = public.filed_envois_api.tentatives + 1, commence_le = now(), maj_le = now()
  returning * into x;
  return jsonb_build_object('reprise', coalesce(v_reprise, false), 'tentatives', x.tentatives);
end $$;

-- Après un appel réussi (ou une écriture retrouvée chez l'éditeur) : envoyée, avec l'identifiant de l'éditeur.
create or replace function public.compta_noter_envoi(p_connexion uuid, p_exercice_cle text, p_ecriture_num integer, p_id_externe text)
returns void language plpgsql security definer set search_path to '' as $$
declare x public.filed_envois_api; c public.filed_connexions_comptables;
begin
  update public.filed_envois_api set etat = 'envoye', id_externe = left(p_id_externe, 200), erreur = null, envoye_le = now(), maj_le = now()
   where connexion_id = p_connexion and exercice_cle = p_exercice_cle and ecriture_num = p_ecriture_num and etat in ('en_cours', 'a_reprendre')
  returning * into x;
  if x.id is null then
    if exists (select 1 from public.filed_envois_api where connexion_id = p_connexion and exercice_cle = p_exercice_cle and ecriture_num = p_ecriture_num
               and etat = 'envoye') then return; end if;
    raise exception 'Aucun envoi en cours pour cette écriture.' using errcode = '55000';
  end if;
  update public.filed_connexions_comptables set derniere_reussite = now(), erreur = null, maj_le = now() where id = p_connexion returning * into c;
  perform private.filed_journaliser(c.client_id, 'filed.envoi_api', 'entite', c.entite_id::text,
    jsonb_build_object('connexion', c.id, 'editeur', c.editeur, 'exercice', p_exercice_cle, 'ecriture', p_ecriture_num, 'id_externe', p_id_externe), c.entite_id);
end $$;

-- Un appel qui échoue : repris plus tard, ou refusé pour de bon (l'éditeur rejette l'écriture, ou huit essais).
-- Un refus prévient une personne.
create or replace function public.compta_echouer_envoi(p_connexion uuid, p_exercice_cle text, p_ecriture_num integer, p_erreur text, p_definitif boolean default false)
returns text language plpgsql security definer set search_path to '' as $$
declare x public.filed_envois_api; c public.filed_connexions_comptables; v_etat text;
begin
  select * into x from public.filed_envois_api where connexion_id = p_connexion and exercice_cle = p_exercice_cle and ecriture_num = p_ecriture_num for update;
  if not found or x.etat not in ('en_cours', 'a_reprendre') then raise exception 'Aucun envoi en cours pour cette écriture.' using errcode = '55000'; end if;
  v_etat := case when p_definitif or x.tentatives >= 8 then 'refuse' else 'a_reprendre' end;
  update public.filed_envois_api set etat = v_etat, erreur = left(coalesce(p_erreur, 'erreur inconnue'), 1000), maj_le = now() where id = x.id;
  select * into c from public.filed_connexions_comptables where id = p_connexion;
  update public.filed_connexions_comptables set erreur = left(coalesce(p_erreur, 'erreur inconnue'), 500), maj_le = now() where id = c.id;
  if v_etat = 'refuse' then
    perform private.lever_alerte_module(c.client_id, 'filed', 'attention',
      left(format('Écriture %s %s refusée par %s : %s', p_exercice_cle, p_ecriture_num, private.filed_editeur_libelle(c.editeur), coalesce(p_erreur, 'erreur inconnue')), 200),
      jsonb_build_object('connexion', c.id, 'exercice', p_exercice_cle, 'ecriture', p_ecriture_num), 'compta_refus:' || x.id::text, false, null);
    perform private.filed_journaliser(c.client_id, 'filed.envoi_api_refuse', 'entite', c.entite_id::text,
      jsonb_build_object('connexion', c.id, 'editeur', c.editeur, 'exercice', p_exercice_cle, 'ecriture', p_ecriture_num, 'erreur', left(p_erreur, 500)), c.entite_id);
  end if;
  return v_etat;
end $$;

-- Un éditeur asynchrone (Cegid Loop) rend d'abord un numéro de demande : il est gardé sur l'envoi en cours, pour en
-- suivre l'état au passage suivant sans renvoyer le fichier.
create or replace function public.compta_reference_envoi(p_connexion uuid, p_exercice_cle text, p_ecriture_num integer, p_reference text)
returns void language plpgsql security definer set search_path to '' as $$
begin
  update public.filed_envois_api set id_externe = left(p_reference, 200), maj_le = now()
   where connexion_id = p_connexion and exercice_cle = p_exercice_cle and ecriture_num = p_ecriture_num and etat = 'en_cours';
  if not found then raise exception 'Aucun envoi en cours pour cette écriture.' using errcode = '55000'; end if;
end $$;

-- Les portes de l'ouvrier : service_role seul.
do $$
declare f text;
begin
  foreach f in array array['public.compta_poser_secret(uuid, text)', 'public.compta_secret(uuid)', 'public.compta_activer_connexion(uuid, text, jsonb)',
                           'public.compta_connexion_en_panne(uuid, text)', 'public.compta_a_envoyer(integer)',
                           'public.compta_commencer_envoi(uuid, text, integer)', 'public.compta_noter_envoi(uuid, text, integer, text)',
                           'public.compta_echouer_envoi(uuid, text, integer, text, boolean)',
                           'public.compta_reference_envoi(uuid, text, integer, text)', 'public.compta_consommer_autorisation(text)'] loop
    execute format('revoke all on function %s from public, anon, authenticated', f);
    execute format('grant execute on function %s to service_role', f);
  end loop;
end $$;
