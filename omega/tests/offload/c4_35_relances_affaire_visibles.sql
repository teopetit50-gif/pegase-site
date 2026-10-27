-- c4_35 — OFFLOAD : les relances d'affaire se valident, et la suite attend leur départ (TOFFLOAD-11 ; session C4, 25/10/2026).
-- Après c4_00, c4_03, c4_08, c4_09 (aides) et les migrations c4_01 à c4_35. Mode essai. runtests() annule tout.

create or replace function tests.test_c4_35_relances_affaire_visibles() returns setof text
language plpgsql as $f$
declare
  banc jsonb := tests.c4_banc();
  v_client uuid := (banc ->> 'client')::uuid;
  v_x uuid; v_aff uuid;
  a public.offload_affaires;
  r jsonb; t jsonb;
begin
  perform tests.c4_reprises_pretes();
  v_x := tests.c4_compte_courriel('RV1', 'Garage Retrait', 'atelier@garage-retrait.test', 70);
  v_aff := tests.c4_affaire(v_x, 'CMD-RV1', 10, '{"valeur_ht": 320}');
  r := private.offload_affaires_cycle(v_client, null);
  a := tests.c4_affaire_lue(v_aff);
  perform tests.endosser((banc ->> 'gerant')::uuid, 'gerant@banc-varelo.test');
  t := public.offload_tableau(v_client);
  perform tests.redevenir_admin();
  return next ok(exists (select 1 from jsonb_array_elements(t -> 'a_valider') x where x ->> 'affaire' = v_aff::text and (x ->> 'rang')::int = 1),
                 'La relance de retrait à valider figure dans « à valider »');
  return next ok((r ->> 'relances_1')::int = 0 and (r ->> 'a_valider')::int >= 1,
                 '« Relancé » ne compte pas une relance qui attend sa validation : ' || r::text);

  update public.offload_affaires set relance1_le = now() - interval '8 days' where id = v_aff;
  perform private.offload_affaires_cycle(v_client, null);
  return next is((tests.c4_affaire_lue(v_aff)).statut, 'relancee_1', 'Tant que la première n''est pas partie, pas de seconde relance');

  perform tests.c4_remettre(a.envoi1_id, (banc ->> 'gerant')::uuid, 'gerant@banc-varelo.test');
  perform private.offload_affaires_cycle(v_client, null);
  return next is((tests.c4_affaire_lue(v_aff)).statut, 'relancee_2', 'Partie, la première ouvre la seconde après le délai');
end $f$;

select * from runtests('tests'::name, '^test_c4_35_');
