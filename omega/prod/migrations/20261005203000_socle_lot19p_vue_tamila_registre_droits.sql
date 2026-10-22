-- 20261005203000 socle_lot19p_vue_tamila_registre_droits
-- Source : requête retrouvée dans le fil de la session coordinateur : omega/prod/recupere/20261005203000_socle_lot19p_vue_tamila_registre_droits.sql.
-- Assemblé par omega/prod/assembler.mjs pour la production (noepmkkplxshjbmqqxft). Transformations : retiré : ligne de schema_migrations (db push écrit la sienne) : insert into supabase_migrations.schema_migrations (version, name, statements) values ('202.
-- recupere 20261005203000 socle_lot19p_vue_tamila_registre_droits
-- Source : fil de la session coordinateur session_01B4JNQXyT69GytdvE9SjAnE, paramètre « query » tel que posé (lecture autorisée par le coordinateur le 6/10).
-- Note : Essai précédent : 84292253 (20:26, erreur).
-- Fichier brut : le nettoyage pour la production (ligne de migration, banc, outillage, URL, pgtap) est fait par assembler.mjs.

-- ═══ requête 61255ef9-6169-4ebd-9714-16e43b57c38d (mcp__Supabase__execute_sql, 2026-10-05T20:27:37.018Z, résultat : réussi)
revoke all on public.tamila_registre from anon;
revoke insert, update, delete on public.tamila_registre from authenticated;
select c.relname, string_agg(g.grantee||':'||g.privilege_type, ',' order by g.grantee, g.privilege_type) as grants
from pg_class c join pg_namespace n on n.oid=c.relnamespace
join information_schema.role_table_grants g on g.table_schema='public' and g.table_name=c.relname
where n.nspname='public' and c.relkind='v' and g.grantee in ('anon','authenticated') and (g.grantee='anon' or g.privilege_type<>'SELECT')
group by c.relname order by 1;
