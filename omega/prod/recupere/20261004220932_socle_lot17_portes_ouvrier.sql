-- recupere 20261004220932 socle_lot17_portes_ouvrier
-- Source : fil de la session coordinateur session_01B4JNQXyT69GytdvE9SjAnE, paramètre « query » tel que posé (lecture autorisée par le coordinateur le 6/10).
-- Fichier brut : le nettoyage pour la production (ligne de migration, banc, outillage, URL, pgtap) est fait par assembler.mjs.

-- ═══ requête 5915bc86-20cd-445b-9dff-6d51c1859f7f (mcp__Supabase__apply_migration, 2026-10-04T22:09:27.661Z, résultat : réussi)
-- Socle, lot 17 : la porte des ouvriers hors de la base (04/10/2026).
--
-- Un ouvrier est un service qui tourne hors de Postgres (fonction Edge) et
-- qui ne voit la base que par des portes publiques réservées au rôle de
-- service. Les portes de fin existent déjà (finir_travail, echouer_travail,
-- commencer_lecture, enregistrer_lecture, signaler_battement,
-- publier_evenement) ; il manquait celle qui PREND les travaux sous bail.
-- Elle enveloppe private.prendre_travaux sans rien y changer.

create or replace function public.prendre_travaux(
  p_genres text[],
  p_nombre integer default 5,
  p_bail interval default interval '10 minutes',
  p_ouvrier text default null
) returns setof public.travaux
language sql
set search_path to ''
as $$
  select * from private.prendre_travaux(p_genres, p_nombre, p_bail, p_ouvrier)
$$;

comment on function public.prendre_travaux(text[], integer, interval, text) is
  'Porte des ouvriers : prend jusqu''à n travaux des genres donnés sous bail, les rend avec leur charge. Service seul.';

revoke all on function public.prendre_travaux(text[], integer, interval, text) from public, anon, authenticated;
grant execute on function public.prendre_travaux(text[], integer, interval, text) to service_role;

-- Le battement d''un ouvrier qui ne travaille pour aucune organisation ce
-- passage-là : il bat pour chaque organisation qui a du travail de son genre
-- en attente ou en cours, sinon pour aucune. Le chien de garde ne réclame un
-- battement que là où un battement a déjà été réglé.
create or replace function public.battre_ouvrier(
  p_module text,
  p_genres text[],
  p_detail jsonb default '{}'::jsonb,
  p_attendu interval default interval '15 minutes'
) returns integer
language plpgsql
security definer
set search_path to ''
as $$
declare r record; n integer := 0;
begin
  for r in
    select distinct t.client_id from public.travaux t
    where t.genre = any (p_genres) and t.client_id is not null
      and (t.etat in ('a_faire', 'en_cours') or t.fini_le > now() - interval '1 day')
  loop
    perform private.battre(r.client_id, p_module, p_detail, p_attendu);
    n := n + 1;
  end loop;
  return n;
end $$;

comment on function public.battre_ouvrier(text, text[], jsonb, interval) is
  'Porte des ouvriers : bat le battement du module chez chaque organisation qui a eu du travail de ces genres dans la journée. Service seul.';

revoke all on function public.battre_ouvrier(text, text[], jsonb, interval) from public, anon, authenticated;
grant execute on function public.battre_ouvrier(text, text[], jsonb, interval) to service_role;
