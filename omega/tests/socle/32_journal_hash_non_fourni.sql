-- 32 — l'empreinte est calculée par la base, pas acceptée du client
-- Exécutable tel quel par execute_sql sur la RECETTE, après 00_installation.sql.
-- runtests() annule tout ce que le test écrit.

create or replace function tests.test_32_journal_hash_non_fourni() returns setof text
language plpgsql as $f$
declare
  jeu jsonb; ligne jsonb;
begin
  jeu := tests.jeu();
  ligne := tests.inserer_minimal('public', 'journal_opposable', jsonb_build_object('client_id', jeu ->> 'client_a', 'action', 'essai_a5', 'acteur_type', 'systeme', 'objet_type', 'essai', 'hash', '\x0000000000000000000000000000000000000000000000000000000000000000'));
  return next isnt(ligne ->> 'hash', '\x0000000000000000000000000000000000000000000000000000000000000000', 'Une empreinte fournie à l''insertion est remplacée par le calcul de la base');
  return next is(octet_length(decode(substr(ligne ->> 'hash', 3), 'hex')), 32, 'L''empreinte calculée fait 32 octets');
end $f$;

select * from runtests('tests'::name, '^test_32_');
