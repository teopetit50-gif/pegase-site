-- pgTAP — FILED lot 5a : l'archive est immuable et son empreinte est déterministe.
begin;
select plan(7);
select has_table('public', 'filed_archives', 'filed_archives existe');
select ok((select relrowsecurity from pg_class where oid = 'public.filed_archives'::regclass), 'RLS activée sur filed_archives');
select has_trigger('public', 'filed_archives', 'filed_archives_immuable', 'le trigger d''immuabilité est posé');
select is(private.filed_empreinte_archive('a', 'b', 'R2026-000001', 1, '00000000-0000-0000-0000-000000000001'),
          private.filed_empreinte_archive('a', 'b', 'R2026-000001', 1, '00000000-0000-0000-0000-000000000001'), 'même entrée, même empreinte');
select isnt(private.filed_empreinte_archive('a', 'b', 'R2026-000001', 1, '00000000-0000-0000-0000-000000000001'),
            private.filed_empreinte_archive('a', 'b', 'R2026-000001', 2, '00000000-0000-0000-0000-000000000001'), 'une autre version, une autre empreinte');
select matches(private.filed_empreinte_archive(null, null, null, 1, '00000000-0000-0000-0000-000000000001'), '^[0-9a-f]{64}$', 'empreinte SHA-256 en hexadécimal');
select has_function('public', 'filed_piste_audit', 'la porte filed_piste_audit existe');
select * from finish();
rollback;
