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
        -- une aide de private, un filtre sur client_id, l'identité (auth.uid()), ou une jointure sur la table parente
        and (coalesce(p.qual, '') || coalesce(p.with_check, '')) ~* '(private\.[a-z_]+\(|client_id|auth\.uid\(\)|exists ?\( ?select)')
      -- une table interne fermée à authenticated (aucun SELECT) n'a pas besoin de politique
      and has_table_privilege('authenticated', to_regclass('public.' || quote_ident(regexp_replace(tl.nom, '^public\.', ''))), 'SELECT')
    order by 1
  $q$, 'Toute table locataire lisible par authenticated a une politique non triviale (aide de private, client_id, auth.uid() ou jointure)');
  -- Pour SECURITE.md : les politiques qui ne passent ni par mes_clients() ni par lit_objet() (autres aides ou jointure sur la table parente)
  return next diag('Politiques hors mes_clients()/lit_objet() : ' || coalesce((
    select string_agg(p.tablename || '.' || p.policyname, ', ' order by 1) from pg_policies p
    where p.schemaname = 'public' and p.tablename in (select regexp_replace(nom, '^public\.', '') from private.tables_locataires)
      and (coalesce(p.qual, '') || coalesce(p.with_check, '')) !~ '(mes_clients|lit_objet)'), 'aucune'));
end $f$;

select * from runtests('tests'::name, '^test_43_');
