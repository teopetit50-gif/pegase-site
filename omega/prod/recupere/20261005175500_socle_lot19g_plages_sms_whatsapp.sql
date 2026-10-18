-- recupere 20261005175500 socle_lot19g_plages_sms_whatsapp
-- Source : fil de la session coordinateur session_01B4JNQXyT69GytdvE9SjAnE, paramètre « query » tel que posé (lecture autorisée par le coordinateur le 6/10).
-- Fichier brut : le nettoyage pour la production (ligne de migration, banc, outillage, URL, pgtap) est fait par assembler.mjs.

-- ═══ requête cf538323-dd28-4d32-80f2-b90efd4b4611 (mcp__Supabase__execute_sql, 2026-10-05T17:45:23.236Z, résultat : réussi)
-- socle_lot19g : les envois non transactionnels par SMS et WhatsApp (prospection, relances commerciales) restent dans les heures d'usage : 8 h – 20 h, du lundi au samedi, jamais le dimanche.
update private.canaux_envoi
   set plages_non_transactionnel = '[{"debut": "08:00", "fin": "20:00", "jours": [1, 2, 3, 4, 5, 6]}]'::jsonb
 where canal in ('sms', 'whatsapp') and plages_non_transactionnel is null;
insert into supabase_migrations.schema_migrations (version, name, statements)
values ('20261005175500', 'socle_lot19g_plages_sms_whatsapp', array['update private.canaux_envoi set plages_non_transactionnel = ''[{"debut": "08:00", "fin": "20:00", "jours": [1, 2, 3, 4, 5, 6]}]''::jsonb where canal in (''sms'', ''whatsapp'') and plages_non_transactionnel is null;'])
on conflict do nothing;
select canal, plages_non_transactionnel from private.canaux_envoi order by canal;
