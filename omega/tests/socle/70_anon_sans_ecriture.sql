-- SOCLE 19bb — LE GARDIEN DES DROITS D'ANON SUR LES TABLES (27/10/2026).
-- Copie du dépôt omega-metiers (socle/base/), où ce lot a été écrit et testé, 27/10/2026.
-- Exécutable tel quel sur la base locale (base/monter.sh) ou la RECETTE, après socle_19bb_anon_sans_ecriture.sql.
-- runtests() annule tout.
--
-- anon est la clé publique, sans compte. Aucune table ni vue de public ne lui donne INSERT, UPDATE, DELETE, TRUNCATE
-- (ni par colonne), sauf exception écrite ici avec sa raison ; il n'y en a aucune. Il ne lit que ce que la production
-- lui ouvre : public.catalogue_site. Une nouvelle table naît avec les droits par défaut de Supabase (tout à anon) :
-- son lot les retire, sinon ce test est rouge.

create or replace function tests.test_socle_19bb_anon_sans_ecriture() returns setof text
language plpgsql as $f$
declare
  -- Exceptions d'écriture, une par une, avec leur raison. Aucune aujourd'hui.
  v_ecriture_admise constant text[] := array[]::text[];
  -- Lecture par anon : la production n'ouvre que le catalogue du site (pages publiques).
  v_lecture_admise constant text[] := array['catalogue_site'];
  v_trop text;
begin
  select string_agg(c.relname || ':' || p, ', ' order by c.relname, p) into v_trop
  from pg_class c join pg_namespace n on n.oid = c.relnamespace
  cross join unnest(array['INSERT', 'UPDATE', 'DELETE', 'TRUNCATE']) p
  where n.nspname = 'public' and c.relkind in ('r', 'p', 'v', 'm', 'f')
    and c.relname <> all (v_ecriture_admise)
    and (has_table_privilege('anon', c.oid, p)
         or (p in ('INSERT', 'UPDATE') and has_any_column_privilege('anon', c.oid, p)));
  return next is(v_trop, null, 'Aucune table ni vue de public ne donne INSERT, UPDATE, DELETE ou TRUNCATE à anon');

  select string_agg(c.relname, ', ' order by c.relname) into v_trop
  from pg_class c join pg_namespace n on n.oid = c.relnamespace
  where n.nspname = 'public' and c.relkind in ('r', 'p', 'v', 'm', 'f')
    and c.relname <> all (v_lecture_admise)
    and has_any_column_privilege('anon', c.oid, 'SELECT');
  return next is(v_trop, null, 'anon ne lit que catalogue_site (comme en production)');

  return next ok(to_regclass('public.catalogue_site') is null or has_table_privilege('anon', 'public.catalogue_site', 'SELECT'),
                 'anon lit toujours le catalogue du site (la page publique)');
end $f$;

select * from runtests('tests'::name, '^test_socle_19bb_');
