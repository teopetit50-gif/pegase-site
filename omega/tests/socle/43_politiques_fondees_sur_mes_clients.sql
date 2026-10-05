-- 43 — chaque table locataire a une politique fondée sur private.mes_clients() ou private.lit_objet()
-- Exécutable tel quel par execute_sql sur la RECETTE, après 00_installation.sql.
-- runtests() annule tout ce que le test écrit.

create or replace function tests.test_43_politiques_fondees_sur_mes_clients() returns setof text
language plpgsql as $f$
declare
  -- rien
begin
  return next is_empty($q$
    select tl.nom from private.tables_locataires tl
    where not exists (
      select 1 from pg_policies p where p.schemaname = 'public' and p.tablename = regexp_replace(tl.nom, '^public\.', '')
        and (coalesce(p.qual, '') || coalesce(p.with_check, '')) ~ '(mes_clients|lit_objet)')
    order by 1
  $q$, 'Toute table locataire est protégée par mes_clients() ou lit_objet()');
end $f$;

select * from runtests('tests'::name, '^test_43_');
