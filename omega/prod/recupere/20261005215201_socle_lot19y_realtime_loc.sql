-- recupere 20261005215201 socle_lot19y_realtime_loc
-- Source : fil de la session coordinateur session_01B4JNQXyT69GytdvE9SjAnE, paramètre « query » tel que posé (lecture autorisée par le coordinateur le 6/10).
-- Note : Contient aussi deux appels private.depot_demander (tests A5 44 et 51) : outillage de recette.
-- Fichier brut : le nettoyage pour la production (ligne de migration, banc, outillage, URL, pgtap) est fait par assembler.mjs.

-- ═══ requête b92fa179-1579-4ade-a466-bdc92a3decaf (mcp__Supabase__execute_sql, 2026-10-05T20:56:07.086Z, résultat : réussi)
do $$ declare t text; begin
  foreach t in array array['loc_contrats','loc_propositions','loc_factures','loc_avoirs'] loop
    if not exists (select 1 from pg_publication_tables where pubname='supabase_realtime' and schemaname='public' and tablename=t) then
      execute format('alter publication supabase_realtime add table public.%I', t);
    end if;
  end loop; end $$;
insert into supabase_migrations.schema_migrations(version,name,statements) values ('20261005215201','socle_lot19y_realtime_loc', array['alter publication supabase_realtime add table loc_contrats, loc_propositions, loc_factures, loc_avoirs (demande de B2)']) on conflict do nothing;
select 'pub' k, string_agg(tablename, ', ' order by tablename) v from pg_publication_tables where pubname='supabase_realtime' and tablename like 'loc_%'
union all select 'pol:'||policyname, coalesce(with_check, qual) from pg_policies where schemaname='storage' and tablename='objects' and cmd='INSERT'
union all select 'a5_44', private.depot_demander('omega/tests/socle/44_private_fonctions_exposees.sql','e35b825')::text
union all select 'a5_51', private.depot_demander('omega/tests/socle/51_politiques_et_grants.sql','e35b825')::text;
