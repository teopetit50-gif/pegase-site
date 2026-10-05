-- 49 — private.verifier_sauvegardes() lève l'alerte sans preuve récente et l'acquitte dès qu'une restauration réussie de moins de 26 h est écrite
-- Exécutable tel quel par execute_sql sur la RECETTE, après 00_installation.sql.
-- runtests() annule tout ce que le test écrit.

create or replace function tests.test_49_verifier_sauvegardes() returns setof text
language plpgsql as $f$
declare
  -- rien
begin
  perform private.verifier_sauvegardes();
  return next ok(exists (select 1 from public.alertes where cle_regroupement = 'sauvegarde:manquante' and acquittee_le is null), 'Sans preuve récente : alerte sauvegarde:manquante ouverte');
  insert into private.sauvegardes (faite_le, octets, sha256, restauration, detail, execution)
  values (now(), 1024, repeat('a', 64), 'reussie', '{"essai": "A5"}'::jsonb, 'https://github.com/essai/a5/actions/runs/0');
  perform private.verifier_sauvegardes();
  return next ok(not exists (select 1 from public.alertes where cle_regroupement = 'sauvegarde:manquante' and acquittee_le is null), 'Avec une preuve « reussie » récente : alerte acquittée');
  return next throws_ok($q$ insert into private.sauvegardes (faite_le, octets, sha256, restauration, detail) values (now(), 1, 'x', 'peut-etre', '{}') $q$, null, null, 'Un verdict hors liste est refusé par la contrainte (sinon : la poser)');
end $f$;

select * from runtests('tests'::name, '^test_49_');
