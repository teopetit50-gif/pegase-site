-- 20261005215201 socle_lot19y_realtime_loc
-- Source : requête retrouvée dans le fil de la session coordinateur : omega/prod/recupere/20261005215201_socle_lot19y_realtime_loc.sql.
-- Assemblé par omega/prod/assembler.mjs pour la production (noepmkkplxshjbmqqxft). Transformations : retiré : ligne de schema_migrations (db push écrit la sienne) : insert into supabase_migrations.schema_migrations(version,name,statements) values ('202610 ; retiré : outillage de pose de la recette (depot_*) : select 'pub' k, string_agg(tablename, ', ' order by tablename) v from pg_publication_table.
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
