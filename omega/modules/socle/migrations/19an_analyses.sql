-- 19an_analyses — socle : les lectures longues d'un dossier (lecteur.analyser). A1, 06/10/2026, confié par le coordinateur.
-- Contrat : omega/CONTRAT-ANALYSE.md (A1, d'accord avec B4). Le lecteur est prêt (worker-a1, lecteur/analyse/) et ne
-- prend aucun travail d'analyse tant que LECTEUR_ANALYSES=1 n'est pas posé.
--
-- Ce lot pose :
--   · public.analyses : une analyse = un type (« tamila.chronologie »…), un périmètre de pièces, un statut, un résultat
--     (en clair, ou CHIFFRÉ sous la clé du dossier pour un module chiffré), l'état entre deux paliers, les comptes et le coût.
--     Contrainte demandée par B4 : un module chiffré (Tamila) n'a jamais de résultat ni d'état en clair.
--     RLS : on voit les analyses des objets qu'on voit (private.voit_objet, qui suit les gardiens des modules) ;
--     aucune écriture directe, tout passe par les portes.
--   · private.demander_analyse(…) → uuid : pour les portes des modules (Tamila : tamila_demander_analyse de B4).
--     Crée l'analyse et dépose le travail lecteur.analyser (clé analyse:<id>:<palier>).
--   · public.commencer_analyse(p_analyse) → jsonb | null (serveur seul) : le dossier, les pages déjà lues
--     (texte, ou texte_chiffre en base64), l'état du palier précédent.
--   · public.terminer_analyse(p_analyse, p_resultat, p_version) → jsonb (serveur seul) : finie | partielle | echec
--     (rangée, événement analyse_finie.<module>) ou en_cours (état rangé, travail du palier suivant déposé).
--     Refuse un résultat en clair pour une analyse chiffrée, et l'inverse (22023), comme enregistrer_lecture.
--
-- Create or replace et create if not exists seulement ; aucune suppression. Fonctions private : revoke from public,
-- anon, authenticated, grant au seul service_role ; portes public : idem.

create table if not exists public.analyses (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients(id),
  module text not null check (module ~ '^[a-z][a-z_]{1,29}$'),
  objet_type text check (objet_type ~ '^[a-z][a-z0-9_]{1,59}$'),
  objet_id text check (char_length(objet_id) <= 200),
  type text not null check (type ~ '^[a-z][a-z_]{1,29}\.[a-z][a-z0-9_]{1,59}$'),
  statut text not null default 'demandee' check (statut in ('demandee', 'en_cours', 'finie', 'partielle', 'echec')),
  pieces uuid[] not null default '{}',
  chiffrement text check (chiffrement = 'dossier:v1'),
  resultat jsonb,
  resultat_chiffre bytea,
  etat jsonb,
  etat_chiffre bytea,
  comptes jsonb,
  sans_source integer check (sans_source >= 0),
  pieces_lues integer check (pieces_lues >= 0),
  pieces_non_lues uuid[],
  cout_eur numeric(12, 6) check (cout_eur >= 0),
  appels_ia integer check (appels_ia >= 0),
  modele text check (char_length(modele) <= 120),
  version text check (char_length(version) <= 40),
  motif text check (char_length(motif) <= 500),
  paliers integer not null default 0 check (paliers >= 0),
  demandee_par uuid,
  demandee_le timestamptz not null default now(),
  commencee_le timestamptz,
  finie_le timestamptz,
  constraint analyses_client_id_id_key unique (client_id, id),
  -- Un module chiffré : rien en clair ; un module en clair : rien de chiffré.
  constraint analyses_clair_ou_chiffre check (
    (chiffrement is null or (resultat is null and etat is null))
    and (chiffrement is not null or (resultat_chiffre is null and etat_chiffre is null))),
  -- Tamila (B4) : toujours chiffré.
  constraint analyses_tamila_chiffree check (module <> 'tamila' or (chiffrement is not null and resultat is null and etat is null))
);

create index if not exists analyses_objet on public.analyses (client_id, module, objet_type, objet_id, demandee_le desc);

alter table public.analyses enable row level security;
do $p$
begin
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'analyses'
                 and policyname = 'on voit les analyses des objets qu''on voit') then
    create policy "on voit les analyses des objets qu'on voit" on public.analyses
      for select to authenticated using (private.voit_objet(client_id, objet_type, objet_id));
  end if;
end $p$;
revoke all on table public.analyses from public, anon, authenticated;
grant select on table public.analyses to authenticated;
grant all on table public.analyses to service_role;

comment on table public.analyses is
  'Lectures longues d''un dossier (lecteur.analyser, 19an). Écriture par les portes seulement ; un module chiffré n''a ni résultat ni état en clair.';

-- ─── private.demander_analyse : pour les portes des modules ───
create or replace function private.demander_analyse(
  p_client uuid, p_module text, p_objet_type text, p_objet_id text, p_type text, p_pieces uuid[],
  p_chiffrement text default null, p_par uuid default null)
returns uuid language plpgsql security definer set search_path to '' as $$
declare v_id uuid; v_inconnues integer;
begin
  if p_client is null or p_module is null or p_type is null then
    raise exception 'Organisation, module et type d''analyse sont nécessaires.' using errcode = '22023';
  end if;
  if split_part(p_type, '.', 1) <> p_module then
    raise exception 'Le type % n''est pas du module %.', p_type, p_module using errcode = '22023';
  end if;
  if coalesce(cardinality(p_pieces), 0) = 0 then
    raise exception 'Une analyse porte sur au moins une pièce.' using errcode = '22023';
  end if;
  select count(*) into v_inconnues from unnest(p_pieces) x(id)
   where not exists (select 1 from public.pieces p where p.id = x.id and p.client_id = p_client);
  if v_inconnues > 0 then
    raise exception '% pièce(s) hors de cette organisation.', v_inconnues using errcode = '22023';
  end if;
  insert into public.analyses (client_id, module, objet_type, objet_id, type, pieces, chiffrement, demandee_par)
  values (p_client, p_module, p_objet_type, p_objet_id, p_type, p_pieces, p_chiffrement, p_par)
  returning id into v_id;
  perform private.deposer_travail(p_client, p_module, 'lecteur.analyser', jsonb_build_object('analyse', v_id),
                                  'analyse:' || v_id::text || ':0', 0::smallint);
  return v_id;
end $$;

-- ─── private.commencer_analyse : le dossier rendu au lecteur ───
create or replace function private.commencer_analyse(p_analyse uuid)
returns jsonb language plpgsql security definer set search_path to '' as $$
declare a public.analyses; v_pieces jsonb;
begin
  perform private.exiger_ouvrier();
  select * into a from public.analyses where id = p_analyse for update;
  if not found or a.statut not in ('demandee', 'en_cours') then
    return null;
  end if;
  update public.analyses set statut = 'en_cours', commencee_le = coalesce(commencee_le, now()) where id = a.id;
  -- Les pièces du périmètre déjà lues, dans l'ordre du périmètre, avec leurs pages.
  select coalesce(jsonb_agg(jsonb_build_object(
           'piece', p.id, 'nom', p.nom_fichier, 'role', null, 'chiffrement', p.chiffrement,
           'pages', coalesce((select jsonb_agg(jsonb_build_object(
                                'n', g.n,
                                'texte', case when g.texte_chiffre is null then g.texte else '' end,
                                'texte_chiffre', case when g.texte_chiffre is not null then replace(encode(g.texte_chiffre, 'base64'), chr(10), '') end)
                              order by g.n)
                              from public.pieces_pages g where g.piece_id = p.id), '[]'::jsonb))
           order by x.ord), '[]'::jsonb)
    into v_pieces
    from unnest(a.pieces) with ordinality x(id, ord)
    join public.pieces p on p.id = x.id and p.client_id = a.client_id
   where p.statut in ('lue', 'a_verifier');
  return jsonb_build_object(
    'analyse', a.id, 'client', a.client_id, 'module', a.module, 'type', a.type, 'chiffrement', a.chiffrement,
    'objet_type', a.objet_type, 'objet_id', a.objet_id, 'paliers', a.paliers, 'pieces', v_pieces,
    'etat', a.etat, 'etat_chiffre', case when a.etat_chiffre is not null then replace(encode(a.etat_chiffre, 'base64'), chr(10), '') end);
end $$;

-- ─── private.terminer_analyse : le résultat (ou l'état) rendu par le lecteur ───
create or replace function private.terminer_analyse(p_analyse uuid, p_resultat jsonb, p_version text default null)
returns jsonb language plpgsql security definer set search_path to '' as $$
declare
  a public.analyses;
  v_statut text := p_resultat ->> 'statut';
  v_res bytea; v_etat bytea;
  v_non_lues uuid[];
begin
  perform private.exiger_ouvrier();
  select * into a from public.analyses where id = p_analyse for update;
  if not found then raise exception 'Analyse introuvable.' using errcode = 'P0002'; end if;
  if a.statut <> 'en_cours' then
    raise exception 'L''analyse n''est pas en cours (statut %).', a.statut using errcode = '55000';
  end if;
  if v_statut is null or v_statut not in ('finie', 'partielle', 'en_cours', 'echec') then
    raise exception 'Statut d''analyse inconnu : %.', coalesce(v_statut, 'vide') using errcode = '22023';
  end if;
  if a.chiffrement is not null and (p_resultat ? 'resultat' or p_resultat ? 'etat') then
    raise exception 'Analyse chiffrée (%) : ni résultat ni état en clair.', a.chiffrement using errcode = '22023';
  end if;
  if a.chiffrement is null and (p_resultat ? 'resultat_chiffre' or p_resultat ? 'etat_chiffre') then
    raise exception 'Analyse en clair : rien ne s''y écrit chiffré.' using errcode = '22023';
  end if;
  begin
    v_res := case when p_resultat ->> 'resultat_chiffre' is not null then decode(p_resultat ->> 'resultat_chiffre', 'base64') end;
    v_etat := case when p_resultat ->> 'etat_chiffre' is not null then decode(p_resultat ->> 'etat_chiffre', 'base64') end;
  exception when others then
    raise exception 'Chiffré illisible (base64 attendu).' using errcode = '22023';
  end;
  select coalesce(array_agg(x::uuid), '{}') into v_non_lues
    from jsonb_array_elements_text(coalesce(p_resultat -> 'pieces_non_lues', '[]'::jsonb)) x
   where x ~ '^[0-9a-f-]{36}$';

  if v_statut = 'en_cours' then
    if a.paliers >= 50 then
      -- Garde-fou : une analyse qui n'avance plus ne tourne pas sans fin.
      update public.analyses set statut = 'echec', motif = 'Trop de paliers (50) : l''analyse est arrêtée.', finie_le = now(),
             etat = null, etat_chiffre = null, version = left(p_version, 40)
       where id = a.id;
      return jsonb_build_object('analyse', a.id, 'statut', 'echec', 'paliers', a.paliers);
    end if;
    update public.analyses
       set etat = case when a.chiffrement is null then p_resultat -> 'etat' end,
           etat_chiffre = v_etat,
           paliers = a.paliers + 1,
           cout_eur = coalesce((p_resultat ->> 'cout_eur')::numeric, cout_eur),
           appels_ia = coalesce((p_resultat ->> 'appels_ia')::integer, appels_ia),
           modele = coalesce(left(p_resultat ->> 'modele', 120), modele),
           version = left(p_version, 40)
     where id = a.id;
    perform private.deposer_travail(a.client_id, a.module, 'lecteur.analyser', jsonb_build_object('analyse', a.id),
                                    'analyse:' || a.id::text || ':' || (a.paliers + 1)::text, 0::smallint);
    return jsonb_build_object('analyse', a.id, 'statut', 'en_cours', 'paliers', a.paliers + 1);
  end if;

  update public.analyses
     set statut = v_statut,
         resultat = case when a.chiffrement is null and v_statut <> 'echec' then p_resultat -> 'resultat' end,
         resultat_chiffre = case when v_statut <> 'echec' then v_res end,
         etat = null, etat_chiffre = null,
         comptes = p_resultat -> 'comptes',
         sans_source = (p_resultat ->> 'sans_source')::integer,
         pieces_lues = (p_resultat ->> 'pieces_lues')::integer,
         pieces_non_lues = v_non_lues,
         cout_eur = (p_resultat ->> 'cout_eur')::numeric,
         appels_ia = (p_resultat ->> 'appels_ia')::integer,
         modele = left(p_resultat ->> 'modele', 120),
         motif = left(p_resultat ->> 'motif', 500),
         version = left(p_version, 40),
         finie_le = now()
   where id = a.id;
  perform private.publier_evenement(a.client_id, 'analyse_finie.' || a.module,
    jsonb_build_object('analyse', a.id, 'module', a.module, 'type', a.type, 'statut', v_statut,
                       'objet_type', a.objet_type, 'objet_id', a.objet_id, 'comptes', p_resultat -> 'comptes'),
    'analyse:' || a.id::text);
  return jsonb_build_object('analyse', a.id, 'statut', v_statut);
end $$;

-- ─── Les portes du lecteur ───
create or replace function public.commencer_analyse(p_analyse uuid)
returns jsonb language sql set search_path to '' as $$ select private.commencer_analyse(p_analyse) $$;

create or replace function public.terminer_analyse(p_analyse uuid, p_resultat jsonb, p_version text default null)
returns jsonb language sql set search_path to '' as $$ select private.terminer_analyse(p_analyse, p_resultat, p_version) $$;

revoke all on function private.demander_analyse(uuid, text, text, text, text, uuid[], text, uuid) from public, anon, authenticated;
revoke all on function private.commencer_analyse(uuid) from public, anon, authenticated;
revoke all on function private.terminer_analyse(uuid, jsonb, text) from public, anon, authenticated;
revoke all on function public.commencer_analyse(uuid) from public, anon, authenticated;
revoke all on function public.terminer_analyse(uuid, jsonb, text) from public, anon, authenticated;
grant execute on function private.demander_analyse(uuid, text, text, text, text, uuid[], text, uuid) to service_role;
grant execute on function private.commencer_analyse(uuid) to service_role;
grant execute on function private.terminer_analyse(uuid, jsonb, text) to service_role;
grant execute on function public.commencer_analyse(uuid) to service_role;
grant execute on function public.terminer_analyse(uuid, jsonb, text) to service_role;

comment on function public.commencer_analyse(uuid) is
  'Lecteur (19an) : passe l''analyse en cours et rend le dossier (pièces lues, pages en texte ou texte_chiffre base64, état du palier précédent) ; null s''il n''y a plus rien à faire. Serveur seul.';
comment on function public.terminer_analyse(uuid, jsonb, text) is
  'Lecteur (19an) : range le résultat (finie, partielle, echec ; événement analyse_finie.<module>) ou l''état (en_cours ; travail du palier suivant). Refuse le clair pour une analyse chiffrée. Serveur seul.';
comment on function private.demander_analyse(uuid, text, text, text, text, uuid[], text, uuid) is
  'Socle (19an) : crée une analyse et dépose lecteur.analyser ; appelée par les portes des modules (tamila_demander_analyse).';
