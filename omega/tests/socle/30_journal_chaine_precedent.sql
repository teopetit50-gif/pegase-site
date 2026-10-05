-- 30 — chaque ligne du journal porte l'empreinte de la précédente (chaîne par client ou globale)
-- Exécutable tel quel par execute_sql sur la RECETTE, après 00_installation.sql.
-- runtests() annule tout ce que le test écrit.

create or replace function tests.test_30_journal_chaine_precedent() returns setof text
language plpgsql as $f$
declare
  jeu jsonb; i int; ruptures_client bigint; ruptures_globale bigint;
begin
  jeu := tests.jeu();
  for i in 1..3 loop
    perform tests.journaliser((jeu ->> 'client_a')::uuid, 'essai_a5_' || i, 'essai', 'x', jsonb_build_object('i', i));
  end loop;
  select count(*) into ruptures_client from (
    select id, hash_precedent, lag(hash) over (partition by client_id order by id) as precedent from public.journal_opposable) s
    where precedent is distinct from hash_precedent;
  select count(*) into ruptures_globale from (
    select id, hash_precedent, lag(hash) over (order by id) as precedent from public.journal_opposable) s
    where precedent is distinct from hash_precedent;
  return next ok(ruptures_client = 0 or ruptures_globale = 0, format('La chaîne se suit (ruptures : %s par client, %s en global)', ruptures_client, ruptures_globale));
  return next is(tests.compter('public', 'journal_opposable', format('client_id = %L', jeu ->> 'client_a')), 3::bigint, 'Les trois lignes d''essai sont écrites');
  return next is_empty($q$
    select client_id, count(*) from public.journal_opposable where hash_precedent is null group by client_id having count(*) > 1
  $q$, 'Au plus une ligne de genèse (hash_precedent null) par client');
end $f$;

select * from runtests('tests'::name, '^test_30_');
