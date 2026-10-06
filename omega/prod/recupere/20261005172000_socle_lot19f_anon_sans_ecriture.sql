-- recupere 20261005172000 socle_lot19f_anon_sans_ecriture
-- Source : fil de la session coordinateur session_01B4JNQXyT69GytdvE9SjAnE, paramètre « query » tel que posé (lecture autorisée par le coordinateur le 6/10).
-- Fichier brut : le nettoyage pour la production (ligne de migration, banc, outillage, URL, pgtap) est fait par assembler.mjs.

-- ═══ requête 613fd768-187f-4abc-81f3-0195b3289c03 (mcp__Supabase__execute_sql, 2026-10-05T17:25:23.455Z, résultat : réussi)
-- socle_lot19f : anon n'écrit nulle part (sept tables posées avec les droits par défaut, dont deux sans RLS).
revoke insert, update on table public.audit_journal, public.catalogue_site, public.clients, public.lorani_echeances_permis, public.moteurs_reconnus, public.profils_metier, public.tamila_registre from anon;
insert into supabase_migrations.schema_migrations (version, name, statements)
values ('20261005172000', 'socle_lot19f_anon_sans_ecriture', array['revoke insert, update on table public.audit_journal, public.catalogue_site, public.clients, public.lorani_echeances_permis, public.moteurs_reconnus, public.profils_metier, public.tamila_registre from anon;'])
on conflict do nothing;
select c.relname as table_, k.conname, pg_get_constraintdef(k.oid) as def
from pg_constraint k join pg_class c on c.oid = k.conrelid join pg_namespace n on n.oid = c.relnamespace
where n.nspname = 'public' and k.contype = 'c'
  and c.relname in ('filed_documents', 'filed_factures', 'filed_factures_lignes', 'filed_commandes', 'filed_commandes_lignes', 'journal_opposable', 'envois_evenements', 'suivis_evenements', 'effacements', 'filed_historique', 'echeances_pro_journal')
order by 1, 2;
