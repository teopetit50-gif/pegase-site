-- 31 — toutes les empreintes du journal font 32 octets (SHA-256) et sont uniques
-- Exécutable tel quel par execute_sql sur la RECETTE, après 00_installation.sql.
-- runtests() annule tout ce que le test écrit.

create or replace function tests.test_31_journal_hash_sha256() returns setof text
language plpgsql as $f$
declare
  -- rien
begin
  return next is_empty($q$ select id from public.journal_opposable where hash is null or octet_length(hash) <> 32 $q$, 'Toute empreinte fait 32 octets');
  return next is_empty($q$ select hash from public.journal_opposable group by hash having count(*) > 1 $q$, 'Aucune empreinte en double');
  return next is_empty($q$ select id from public.journal_opposable where hash_precedent is not null and octet_length(hash_precedent) <> 32 $q$, 'Toute empreinte précédente fait 32 octets');
end $f$;

select * from runtests('tests'::name, '^test_31_');
