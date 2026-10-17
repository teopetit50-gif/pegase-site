-- b6_36 — DALIRO : l'assistant « questions » sur le chantier (session B6, 17/10/2026)
--
-- LA PROMESSE (/secteurs/btp, démonstration ; CHIFFRAGE/daliro.md n° 9) : « Qu'est-ce qui n'est pas au devis chez
-- Lefèvre », « Préparer la réunion de chantier », « Résumer la visite ». La fonction « questions » est listée dans
-- toutes les formules (btp_fonctions_de) ; rien ne la réalisait.
--
-- DÉCISION (Teo, 17/10) : même fournisseur et mêmes garde-fous que le lecteur — l'abstraction commutable de
-- omega/functions/_partage (recette = API Anthropic), le plafond d'IA par client et par jour ; aucun autre fournisseur.
--
-- CE QUI EST POSÉ.
--   · public.btp_questions : une question posée sur un chantier, sa réponse, ses sources, son coût. Lue par son
--     auteur seul (une réponse peut citer des prix : elle reste à celui qui avait le droit de les voir).
--   · public.btp_poser_question(chantier, question) : tout membre qui voit le chantier, fonction « questions » de la
--     formule. Le CONTEXTE est figé à cet instant, avec les droits de la personne : le tableau du chantier
--     (btp_tableau_chantier : prix masqués sans le droit voir_prix ; situations, réception, factures et déboursé
--     retirés sans ce droit) et les 40 derniers messages du fil. Au plus
--     30 questions par personne et par jour, 3 en attente à la fois. Dépose le travail daliro.question.
--   · Portes de l'ouvrier daliro-questions (fonction Edge, clé de service seulement) : btp_question_commencer,
--     btp_question_deposer, btp_question_echec.
--   · public.btp_questions_du_chantier(chantier) : mes 20 dernières questions sur ce chantier, sans le contexte.
--   · Le plafond : private.consommation_ia_jour du socle 19ar (A1) compte déjà tous les genres ; rien à changer ici.
--   · NON FAIT ICI : le cron de la fonction Edge (omega/recette-b6/cron_daliro_questions.sql, à poser APRÈS son
--     déploiement, comme omega-reput).
--
-- Règles de pose : create or replace ; rien n'est retiré ni effacé.

create table if not exists public.btp_questions (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients(id) on delete cascade,
  entite_id uuid,
  chantier_id uuid not null,
  pose_par uuid not null,
  question text not null,
  contexte jsonb not null default '{}'::jsonb,
  voit_prix boolean not null default false,
  statut text not null default 'en_attente',
  reponse text,
  couverte boolean,
  sources text[] not null default '{}',
  raison text,
  motif text,
  modele text,
  version_ouvrier text,
  jetons_entree integer not null default 0,
  jetons_sortie integer not null default 0,
  cout_eur numeric(12,6) not null default 0,
  cree_le timestamptz not null default now(),
  repondu_le timestamptz,
  constraint btp_questions_chantier_fkey foreign key (client_id, chantier_id) references public.btp_chantiers(client_id, id) on delete cascade,
  constraint btp_questions_statut_check check (statut in ('en_attente', 'repondue', 'echec')),
  constraint btp_questions_question_check check (char_length(btrim(question)) between 3 and 1000),
  constraint btp_questions_reponse_check check (reponse is null or char_length(reponse) <= 6000),
  constraint btp_questions_raison_check check (raison is null or char_length(raison) <= 500),
  constraint btp_questions_motif_check check (motif is null or char_length(motif) <= 500),
  constraint btp_questions_jetons_check check (jetons_entree >= 0 and jetons_sortie >= 0 and cout_eur >= 0)
);
comment on table public.btp_questions is 'DALIRO — questions posées à l''assistant sur un chantier (b6_36). Écrite par les portes seules ; lue par son auteur.';
create index if not exists btp_questions_chantier_idx on public.btp_questions (chantier_id, pose_par, cree_le desc);
create index if not exists btp_questions_jour_idx on public.btp_questions (pose_par, cree_le desc);
alter table public.btp_questions enable row level security;
do $do$ begin
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'btp_questions' and policyname = 'chacun lit ses questions') then
    create policy "chacun lit ses questions" on public.btp_questions
      for select to authenticated using (client_id in (select private.mes_clients()) and pose_par = (select auth.uid()));
  end if;
end $do$;
revoke all on table public.btp_questions from anon, authenticated;
grant select on table public.btp_questions to authenticated;
grant all on table public.btp_questions to service_role;
do $do$ begin
  if to_regclass('private.tables_locataires') is not null then
    begin
      execute $q$insert into private.tables_locataires (nom) select x from unnest(array['btp_questions']) x
               where not exists (select 1 from private.tables_locataires t where t.nom = x)$q$;
    exception when others then raise notice 'tables_locataires : % (à inscrire à la main)', sqlerrm; end;
  end if;
end $do$;

-- Le serveur d'Omega (clé de service, ou postgres pour la recette), jamais une personne.
create or replace function private.btp_est_serveur()
 returns boolean
 language sql
 stable
 set search_path to ''
as $function$
  select (select auth.uid()) is null
     and coalesce(nullif(current_setting('role', true), 'none'), session_user::text) in ('service_role', 'postgres')
$function$;

-- ─────────────────────────────────────────────────────────────────────────
create or replace function public.btp_poser_question(p_chantier uuid, p_question text)
 returns uuid
 language plpgsql
 security definer
 set search_path to ''
as $function$
declare
  c public.btp_chantiers;
  v_q text := btrim(coalesce(p_question, ''));
  v_tableau jsonb;
  v_fil jsonb;
  v_id uuid;
begin
  if (select auth.uid()) is null then
    raise exception 'Réservé aux membres du client.' using errcode = '42501';
  end if;
  select * into c from public.btp_chantiers where id = p_chantier;
  if not found then
    raise exception 'Chantier introuvable.' using errcode = 'P0002';
  end if;
  if not exists (select 1 from public.comptes k where k.client_id = c.client_id and k.user_id = (select auth.uid()))
     or (c.entite_id is not null and not private.voit_entite(c.client_id, c.entite_id)) then
    raise exception 'Ce chantier ne vous est pas ouvert.' using errcode = '42501';
  end if;
  perform private.btp_exiger_fonction(c.client_id, 'questions');
  if char_length(v_q) < 3 or char_length(v_q) > 1000 then
    raise exception 'La question tient en 3 à 1 000 caractères.' using errcode = '22023';
  end if;
  if (select count(*) from public.btp_questions q where q.pose_par = (select auth.uid()) and q.statut = 'en_attente'
        and q.cree_le > now() - interval '15 minutes') >= 3 then
    raise exception 'Trois questions attendent déjà leur réponse : patientez une minute.' using errcode = '53400';
  end if;
  if (select count(*) from public.btp_questions q where q.pose_par = (select auth.uid())
        and q.cree_le >= date_trunc('day', now() at time zone 'Europe/Paris') at time zone 'Europe/Paris') >= 30 then
    raise exception 'Trente questions posées aujourd''hui : la limite du jour est atteinte.' using errcode = '53400';
  end if;

  -- Le contexte, avec les droits de la personne : btp_tableau_chantier masque les prix sans voir_prix.
  v_tableau := public.btp_tableau_chantier(p_chantier)
               - 'bibliotheque' - 'controles_organisation' - 'reglages' - 'equipes' - 'dependances' - 'tiers';
  -- Les situations, la réception, les factures et le déboursé ne sont cachés que par la RLS, que cette porte
  -- (security definer) ne subit pas : sans voir_prix, ils sortent du contexte, comme l'écran les montre vides.
  if not coalesce((v_tableau ->> 'voit_prix')::boolean, false) then
    v_tableau := v_tableau - 'situations' - 'reception' - 'factures' - 'debourse';
  end if;
  select coalesce(jsonb_agg(jsonb_build_object('recu_le', m.recu_le, 'canal', m.canal, 'de', m.de_nom,
                                               'texte', left(coalesce(m.texte, ''), 1000),
                                               'pieces', jsonb_array_length(coalesce(m.pieces, '[]'::jsonb)))
                            order by m.recu_le), '[]'::jsonb)
    into v_fil
    from (select * from public.btp_messages x
          where x.chantier_id = c.id and x.statut <> 'ecarte' order by x.recu_le desc limit 40) m;

  insert into public.btp_questions (client_id, entite_id, chantier_id, pose_par, question, contexte, voit_prix)
  values (c.client_id, c.entite_id, c.id, (select auth.uid()), v_q,
          jsonb_build_object('tableau', v_tableau, 'fil', v_fil, 'aujourdhui', (now() at time zone 'Europe/Paris')::date),
          coalesce((v_tableau ->> 'voit_prix')::boolean, false))
  returning id into v_id;
  perform private.deposer_travail(c.client_id, 'daliro', 'daliro.question', jsonb_build_object('question', v_id), 'question:' || v_id::text);
  perform private.journaliser(c.client_id, 'daliro.question_posee', 'btp_questions', v_id::text,
    jsonb_build_object('chantier', c.id, 'longueur', char_length(v_q)), c.entite_id);
  return v_id;
end $function$;

create or replace function public.btp_questions_du_chantier(p_chantier uuid)
 returns jsonb
 language sql
 stable
 security definer
 set search_path to ''
as $function$
  select coalesce(jsonb_agg(jsonb_build_object('id', q.id, 'question', q.question, 'statut', q.statut, 'reponse', q.reponse,
                                               'couverte', q.couverte, 'sources', to_jsonb(q.sources), 'raison', q.raison,
                                               'motif', q.motif, 'cree_le', q.cree_le, 'repondu_le', q.repondu_le)
                            order by q.cree_le desc), '[]'::jsonb)
  from (select * from public.btp_questions x
        where x.chantier_id = p_chantier and x.pose_par = (select auth.uid())
        order by x.cree_le desc limit 20) q
$function$;

-- ─── Portes de l'ouvrier daliro-questions ───────────────────────────────
create or replace function public.btp_question_commencer(p_question uuid)
 returns jsonb
 language plpgsql
 stable
 security definer
 set search_path to ''
as $function$
declare
  q public.btp_questions;
begin
  if not private.btp_est_serveur() then
    raise exception 'Réservé au serveur d''Omega.' using errcode = '42501';
  end if;
  select * into q from public.btp_questions where id = p_question;
  if not found then
    return jsonb_build_object('statut', 'ignore', 'motif', 'question introuvable');
  end if;
  if q.statut <> 'en_attente' then
    return jsonb_build_object('statut', 'deja', 'question', q.id, 'etat', q.statut);
  end if;
  return jsonb_build_object('statut', 'a_repondre', 'question', q.id, 'client', q.client_id, 'texte', q.question,
                            'voit_prix', q.voit_prix, 'contexte', q.contexte);
end $function$;

-- p_resultat : {reponse, couverte, sources: [texte], raison, modele, tokens_entree, tokens_sortie, cout_eur}
create or replace function public.btp_question_deposer(p_question uuid, p_resultat jsonb, p_version text default null)
 returns jsonb
 language plpgsql
 security definer
 set search_path to ''
as $function$
declare
  q public.btp_questions;
  v_rep text := btrim(coalesce(p_resultat ->> 'reponse', ''));
begin
  if not private.btp_est_serveur() then
    raise exception 'Réservé au serveur d''Omega.' using errcode = '42501';
  end if;
  select * into q from public.btp_questions where id = p_question for update;
  if not found then
    raise exception 'Question introuvable.' using errcode = 'P0002';
  end if;
  if q.statut <> 'en_attente' then
    return jsonb_build_object('statut', 'deja', 'etat', q.statut);
  end if;
  if v_rep = '' then
    raise exception 'Réponse vide.' using errcode = '22023';
  end if;
  update public.btp_questions
     set statut = 'repondue', reponse = left(v_rep, 6000),
         couverte = coalesce((p_resultat ->> 'couverte')::boolean, false),
         sources = coalesce((select array_agg(left(s, 120)) from jsonb_array_elements_text(
                     case when jsonb_typeof(p_resultat -> 'sources') = 'array' then p_resultat -> 'sources' else '[]'::jsonb end) s), '{}'),
         raison = left(nullif(btrim(p_resultat ->> 'raison'), ''), 500),
         modele = left(p_resultat ->> 'modele', 80), version_ouvrier = left(p_version, 80),
         jetons_entree = greatest(coalesce((p_resultat ->> 'tokens_entree')::integer, 0), 0),
         jetons_sortie = greatest(coalesce((p_resultat ->> 'tokens_sortie')::integer, 0), 0),
         cout_eur = greatest(coalesce((p_resultat ->> 'cout_eur')::numeric, 0), 0),
         repondu_le = now()
   where id = q.id;
  perform private.journaliser(q.client_id, 'daliro.question_repondue', 'btp_questions', q.id::text,
    jsonb_build_object('chantier', q.chantier_id, 'couverte', coalesce((p_resultat ->> 'couverte')::boolean, false),
                       'modele', p_resultat ->> 'modele', 'cout_eur', p_resultat ->> 'cout_eur'), q.entite_id);
  return jsonb_build_object('statut', 'repondue', 'question', q.id);
end $function$;

create or replace function public.btp_question_echec(p_question uuid, p_motif text)
 returns void
 language plpgsql
 security definer
 set search_path to ''
as $function$
begin
  if not private.btp_est_serveur() then
    raise exception 'Réservé au serveur d''Omega.' using errcode = '42501';
  end if;
  update public.btp_questions set statut = 'echec', motif = left(coalesce(p_motif, 'échec'), 500), repondu_le = now()
   where id = p_question and statut = 'en_attente';
end $function$;

-- ─── Droits ─────────────────────────────────────────────────────────────
revoke execute on function private.btp_est_serveur() from public, anon, authenticated;
grant execute on function private.btp_est_serveur() to service_role;

revoke execute on function public.btp_poser_question(uuid, text) from public, anon;
revoke execute on function public.btp_questions_du_chantier(uuid) from public, anon;
grant execute on function public.btp_poser_question(uuid, text) to authenticated, service_role;
grant execute on function public.btp_questions_du_chantier(uuid) to authenticated, service_role;

revoke execute on function public.btp_question_commencer(uuid) from public, anon, authenticated;
revoke execute on function public.btp_question_deposer(uuid, jsonb, text) from public, anon, authenticated;
revoke execute on function public.btp_question_echec(uuid, text) from public, anon, authenticated;
grant execute on function public.btp_question_commencer(uuid) to service_role;
grant execute on function public.btp_question_deposer(uuid, jsonb, text) to service_role;
grant execute on function public.btp_question_echec(uuid, text) to service_role;
