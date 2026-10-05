-- 32 — l'empreinte du journal vient de la porte private.journaliser(), jamais d'un INSERT direct
-- Exécutable tel quel par execute_sql sur la RECETTE, après 00_installation.sql.
-- runtests() annule tout ce que le test écrit.

create or replace function tests.test_32_journal_hash_non_fourni() returns setof text
language plpgsql as $f$
declare
  jeu jsonb; r record; n int := 0;
begin
  -- (a) aucun rôle applicatif n'écrit directement au journal
  return next ok(not has_table_privilege('anon', 'public.journal_opposable', 'INSERT'), 'anon : pas d''INSERT direct sur journal_opposable');
  return next ok(not has_table_privilege('authenticated', 'public.journal_opposable', 'INSERT'), 'authenticated : pas d''INSERT direct sur journal_opposable');
  if exists (select 1 from pg_roles where rolname = 'service_role') then
    return next ok(not has_table_privilege('service_role', 'public.journal_opposable', 'INSERT'), 'service_role : pas d''INSERT direct sur journal_opposable');
  else
    return next pass('service_role absent ici');
  end if;
  return next ok(to_regprocedure('private.journaliser(uuid, text, text, text, jsonb, uuid)') is not null, 'La porte private.journaliser(uuid, text, text, text, jsonb, uuid) existe');
  -- (b) la porte produit 32 octets et chaîne sur la précédente
  jeu := tests.jeu();
  perform tests.journaliser((jeu ->> 'client_a')::uuid, 'essai_a5_1');
  perform tests.journaliser((jeu ->> 'client_a')::uuid, 'essai_a5_2');
  for r in select id, hash, hash_precedent, lag(hash) over (order by id) as precedent from public.journal_opposable where client_id = (jeu ->> 'client_a')::uuid and action like 'essai_a5%' order by id loop
    n := n + 1;
    return next is(octet_length(r.hash), 32, format('Ligne %s : empreinte de 32 octets', n));
    if n = 2 then return next ok(r.hash_precedent = r.precedent, 'Ligne 2 : hash_precedent = empreinte de la ligne 1 (lignes d''essai consécutives)'); end if;
  end loop;
  return next is(n, 2, 'Deux lignes écrites par la porte');
end $f$;

select * from runtests('tests'::name, '^test_32_');
