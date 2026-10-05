-- 35 — private.canaux_envoi porte des plages horaires pour les envois non transactionnels
-- Exécutable tel quel par execute_sql sur la RECETTE, après 00_installation.sql.
-- runtests() annule tout ce que le test écrit.

create or replace function tests.test_35_canaux_heures_legales() returns setof text
language plpgsql as $f$
declare
  -- rien
begin
  return next ok((select count(*) from private.canaux_envoi) > 0, 'Des canaux sont déclarés');
  return next ok((select count(*) from private.canaux_envoi where plages_non_transactionnel is not null) > 0, 'Au moins un canal a des plages non transactionnelles (heures légales)');
  return next is_empty($q$
    select canal from private.canaux_envoi where plages_non_transactionnel is not null and jsonb_typeof(plages_non_transactionnel) not in ('object', 'array')
  $q$, 'Les plages sont des objets ou tableaux JSON');
  return next ok(exists (select 1 from private.canaux_envoi where canal ~* 'sms' and plages_non_transactionnel is not null), 'Le canal SMS est borné par des plages (prospection : 8 h – 20 h, jamais le dimanche)');
  return next diag('Canaux : ' || (select string_agg(canal || ' → ' || coalesce(plages_non_transactionnel::text, 'libre'), ' ; ') from private.canaux_envoi));
end $f$;

select * from runtests('tests'::name, '^test_35_');
