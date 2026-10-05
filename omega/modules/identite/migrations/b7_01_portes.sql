-- IDENTITÉ DES TIERS (B7), lot 1 — les portes de l'ouvrier `identite`.
--
-- Ce que ce lot pose :
--   public.identites_registre                          le cache global des réponses des registres publics
--                                                      (Sirene, VIES) : un même SIREN n'est pas revérifié avant 30 jours ;
--   private.identite_demander_travail()                déclencheur sur filed_verifications_tiers : chaque demande ouverte
--                                                      devient un travail `identite.verifier` ;
--   public.identite_a_verifier(p_verification)         porte : la demande, le fournisseur, le cache ;
--   public.noter_identite(p_verification, …)           porte : la réponse, le cache, les compléments, le recontrôle ;
--   public.identite_relancer(p_heures)                 porte : rouvre les « indisponible » trop vieux.
-- Toutes les portes sont réservées au rôle de service. Migration idempotente : create or replace, if not exists,
-- on conflict ; aucun DROP, aucun DELETE.
--
-- Dépend du lot 4d d'A4 (a4_04_filed_lot4d_controles_identite.sql) : public.filed_verifications_tiers,
-- private.filed_repondre_verification, et du socle : private.deposer_travail, private.filed_controler_facture.

-- ───────────────────────────────────────────────────────────────────────────
-- 1. Le cache global des registres
-- ───────────────────────────────────────────────────────────────────────────
create table if not exists public.identites_registre (
  id            uuid primary key default gen_random_uuid(),
  -- sirene : SIREN (9 chiffres) ; vies : numéro de TVA de l'Union (pays + numéro, sans séparateur).
  registre      text not null check (registre in ('sirene', 'vies')),
  identifiant   text not null,
  resultat      text not null check (resultat in ('valide', 'invalide', 'indisponible')),
  -- Ce que le registre a rendu (dénomination, état, dates), jamais de secret.
  preuve        jsonb not null default '{}'::jsonb,
  -- D'où vient la réponse : 'sirene' (INSEE), 'recherche-entreprises' (repli sans clé), 'vies', 'cache'.
  source        text not null,
  -- La version de l'ouvrier qui a vérifié (identite/<date>/<n>).
  version       text,
  verifie_le    timestamptz not null default now(),
  cree_le       timestamptz not null default now(),
  unique (registre, identifiant)
);
comment on table public.identites_registre is
  'Cache global des réponses des registres publics (Sirene, VIES) écrites par l''ouvrier identite. Pas de client : un SIREN est une donnée publique, vérifiée une fois pour tous. Réservé au service.';

alter table public.identites_registre enable row level security;
revoke all on table public.identites_registre from public, anon, authenticated;

-- ───────────────────────────────────────────────────────────────────────────
-- 2. Chaque demande ouverte devient un travail identite.verifier
-- ───────────────────────────────────────────────────────────────────────────
create or replace function private.identite_normaliser(p text) returns text
language sql immutable set search_path to '' as $$
  select nullif(upper(regexp_replace(coalesce(p, ''), '[^A-Za-z0-9]', '', 'g')), '')
$$;

-- Dépose le travail d'une demande ouverte ; idempotent sur la clé (deposer_travail l'est tant que le travail est à faire ou en cours).
create or replace function private.identite_deposer_travail(p_v public.filed_verifications_tiers) returns bigint
language plpgsql set search_path to '' as $$
begin
  if p_v.repondu_le is not null then return null; end if;
  return private.deposer_travail(
    p_v.client_id, 'filed', 'identite.verifier',
    jsonb_build_object('verification', p_v.id, 'registre', p_v.registre, 'identifiant', p_v.identifiant, 'fournisseur', p_v.fournisseur_id),
    'verification:' || p_v.id::text, 0::smallint);
end $$;

create or replace function private.identite_demander_travail() returns trigger
language plpgsql security definer set search_path to '' as $$
begin
  perform private.identite_deposer_travail(new);
  return new;
end $$;

do $$ begin
  if not exists (select 1 from pg_trigger where tgname = 'identite_demander_travail' and tgrelid = 'public.filed_verifications_tiers'::regclass) then
    create trigger identite_demander_travail
      after insert on public.filed_verifications_tiers
      for each row when (new.repondu_le is null)
      execute function private.identite_demander_travail();
  end if;
end $$;

-- Rattrapage : les demandes déjà ouvertes avant ce lot (dont la première facture réelle du 5/10).
select private.identite_deposer_travail(v) from public.filed_verifications_tiers v where v.repondu_le is null;

-- ───────────────────────────────────────────────────────────────────────────
-- 3. Porte : ce qu'il y a à vérifier
-- ───────────────────────────────────────────────────────────────────────────
create or replace function public.identite_a_verifier(p_verification uuid) returns jsonb
language plpgsql stable security definer set search_path to '' as $$
declare
  v public.filed_verifications_tiers;
  f public.filed_fournisseurs;
  c public.identites_registre;
begin
  select * into v from public.filed_verifications_tiers where id = p_verification;
  if not found then return null; end if;
  if v.fournisseur_id is not null then
    select * into f from public.filed_fournisseurs where id = v.fournisseur_id;
  end if;
  select * into c from public.identites_registre where registre = v.registre and identifiant = v.identifiant;
  return jsonb_build_object(
    'id', v.id, 'client_id', v.client_id, 'fournisseur_id', v.fournisseur_id,
    'registre', v.registre, 'identifiant', v.identifiant,
    'demande_le', v.demande_le, 'repondu_le', v.repondu_le, 'resultat', v.resultat,
    'fournisseur', case when f.id is null then null
                        else jsonb_build_object('id', f.id, 'pays', f.pays, 'siren', f.siren, 'tva', f.tva, 'statut', f.statut) end,
    'cache', case when c.id is null then null
                  else jsonb_build_object('resultat', c.resultat, 'preuve', c.preuve, 'source', c.source, 'version', c.version,
                                          'verifie_le', c.verifie_le,
                                          'age_jours', extract(epoch from (now() - c.verifie_le)) / 86400.0) end);
end $$;
comment on function public.identite_a_verifier(uuid) is
  'Porte de l''ouvrier identite : la demande de vérification, son fournisseur et la dernière réponse en cache pour le même identifiant. Réservée au service.';
revoke all on function public.identite_a_verifier(uuid) from public, anon, authenticated;
grant execute on function public.identite_a_verifier(uuid) to service_role;

-- ───────────────────────────────────────────────────────────────────────────
-- 4. Porte : la réponse
-- ───────────────────────────────────────────────────────────────────────────
-- Écrit le cache (sauf pour une réponse venue du cache lui-même).
create or replace function private.identite_memoriser(p_registre text, p_identifiant text, p_resultat text, p_preuve jsonb, p_source text, p_version text)
returns void language plpgsql set search_path to '' as $$
begin
  if p_source = 'cache' then return; end if;
  insert into public.identites_registre (registre, identifiant, resultat, preuve, source, version, verifie_le)
  values (p_registre, private.identite_normaliser(p_identifiant), p_resultat, coalesce(p_preuve, '{}'::jsonb), p_source, left(p_version, 40), now())
  on conflict (registre, identifiant) do update
    set resultat = excluded.resultat, preuve = excluded.preuve, source = excluded.source, version = excluded.version, verifie_le = now();
end $$;

-- Recontrôle les factures qu'une vérification concerne : celles du fournisseur, ou, sans fournisseur rattaché,
-- celles dont la pièce porte cet identifiant. Seules les factures encore ouvertes (a_valider, bloquee) bougent.
create or replace function private.identite_recontroler(p_v public.filed_verifications_tiers) returns integer
language plpgsql set search_path to '' as $$
declare
  n integer := 0;
  r record;
begin
  for r in
    select f.id from public.filed_factures f
    where f.client_id = p_v.client_id and f.statut in ('a_valider', 'bloquee')
      and ((p_v.fournisseur_id is not null and f.fournisseur_id = p_v.fournisseur_id)
           or private.identite_normaliser(f.fournisseur_lu ->> 'siren') = p_v.identifiant
           or private.identite_normaliser(f.fournisseur_lu ->> 'tva') = p_v.identifiant)
    order by f.cree_le
  loop
    begin
      perform private.filed_controler_facture(r.id);
      n := n + 1;
    exception when others then
      -- Une facture qui ne se recontrôle pas n'empêche pas les autres ; le motif reste dans les journaux de la base.
      raise warning 'identite : recontrôle de la facture % impossible : %', r.id, sqlerrm;
    end;
  end loop;
  return n;
end $$;

create or replace function public.noter_identite(p_verification uuid, p_resultat text, p_preuve jsonb, p_source text, p_complements jsonb default '[]'::jsonb)
returns jsonb language plpgsql security definer set search_path to '' as $$
declare
  v public.filed_verifications_tiers;
  c jsonb;
  v_version text := coalesce(p_preuve ->> 'verifie_par', null);
  n_compl integer := 0;
  n_recontrolees integer := 0;
  v_registre text;
  v_ident text;
  v_resultat text;
begin
  if p_resultat not in ('valide', 'invalide', 'indisponible') then
    raise exception 'Résultat inconnu : %', p_resultat using errcode = '22023';
  end if;
  if coalesce(p_source, '') = '' then
    raise exception 'Source obligatoire (sirene, recherche-entreprises, vies, cache).' using errcode = '22023';
  end if;
  select * into v from public.filed_verifications_tiers where id = p_verification for update;
  if not found then
    raise exception 'Vérification inconnue : %', p_verification using errcode = 'P0002';
  end if;
  if v.repondu_le is not null then
    return jsonb_build_object('verification', v.id, 'deja_repondue', true, 'complements', 0, 'recontrolees', 0);
  end if;

  perform private.filed_repondre_verification(v.id, p_resultat, coalesce(p_preuve, '{}'::jsonb) || jsonb_build_object('source', p_source));
  perform private.identite_memoriser(v.registre, v.identifiant, p_resultat, coalesce(p_preuve, '{}'::jsonb), p_source, v_version);

  -- Les compléments : ce que l'ouvrier a vérifié en plus (Sirene sur le SIREN que porte une TVA FR, par exemple).
  for c in select * from jsonb_array_elements(coalesce(p_complements, '[]'::jsonb)) loop
    v_registre := c ->> 'registre';
    v_ident := private.identite_normaliser(c ->> 'identifiant');
    v_resultat := c ->> 'resultat';
    if v_registre not in ('sirene', 'vies') or v_ident is null or v_resultat not in ('valide', 'invalide', 'indisponible') then
      continue;
    end if;
    insert into public.filed_verifications_tiers (client_id, fournisseur_id, registre, identifiant, demande_le, repondu_le, resultat, preuve)
    values (v.client_id, v.fournisseur_id, v_registre, v_ident, now(), now(), v_resultat,
            coalesce(c -> 'preuve', '{}'::jsonb) || jsonb_build_object('source', coalesce(c ->> 'source', p_source), 'complement_de', v.id));
    perform private.identite_memoriser(v_registre, v_ident, v_resultat, coalesce(c -> 'preuve', '{}'::jsonb), coalesce(c ->> 'source', p_source), v_version);
    n_compl := n_compl + 1;
  end loop;

  select * into v from public.filed_verifications_tiers where id = p_verification;
  if p_resultat <> 'indisponible' then
    n_recontrolees := private.identite_recontroler(v);
  end if;
  return jsonb_build_object('verification', v.id, 'deja_repondue', false, 'complements', n_compl, 'recontrolees', n_recontrolees);
end $$;
comment on function public.noter_identite(uuid, text, jsonb, text, jsonb) is
  'Porte de l''ouvrier identite : la réponse d''un registre pour une vérification demandée, le cache global, les vérifications complémentaires, puis le recontrôle des factures concernées. Idempotente. Réservée au service.';
revoke all on function public.noter_identite(uuid, text, jsonb, text, jsonb) from public, anon, authenticated;
grant execute on function public.noter_identite(uuid, text, jsonb, text, jsonb) to service_role;

-- ───────────────────────────────────────────────────────────────────────────
-- 5. Porte : relancer ce qui est resté « indisponible »
-- ───────────────────────────────────────────────────────────────────────────
create or replace function public.identite_relancer(p_heures integer default 2) returns integer
language plpgsql security definer set search_path to '' as $$
declare
  n integer := 0;
  r record;
begin
  for r in
    select v.* from public.filed_verifications_tiers v
    where v.resultat = 'indisponible' and v.repondu_le < now() - make_interval(hours => greatest(p_heures, 1))
      and not exists (select 1 from public.filed_verifications_tiers w
                      where w.client_id = v.client_id and w.registre = v.registre and w.identifiant = v.identifiant
                        and (w.repondu_le is null or w.repondu_le > v.repondu_le))
  loop
    insert into public.filed_verifications_tiers (client_id, fournisseur_id, registre, identifiant)
    values (r.client_id, r.fournisseur_id, r.registre, r.identifiant);
    n := n + 1;
  end loop;
  return n;
end $$;
comment on function public.identite_relancer(integer) is
  'Porte de l''ouvrier identite : rouvre une demande pour chaque vérification restée « indisponible » depuis plus de p_heures sans réponse plus récente. Réservée au service.';
revoke all on function public.identite_relancer(integer) from public, anon, authenticated;
grant execute on function public.identite_relancer(integer) to service_role;

-- Le service exécute les fonctions privées de ce lot (le lot 19j du socle donne déjà EXECUTE à service_role sur private).
grant execute on function private.identite_normaliser(text) to service_role;
grant execute on function private.identite_deposer_travail(public.filed_verifications_tiers) to service_role;
grant execute on function private.identite_memoriser(text, text, text, jsonb, text, text) to service_role;
grant execute on function private.identite_recontroler(public.filed_verifications_tiers) to service_role;
