-- c4_28 — OFFLOAD : un réglage hors bornes se dit en français (testeur T-OFFLOAD, TOFFLOAD-08 ; C4, 21/10/2026).
-- Après c4_00, c4_03 (aides) et les migrations c4_01 à c4_28. runtests() annule tout.

create or replace function tests.test_c4_28_reglages_en_francais() returns setof text
language plpgsql as $f$
declare
  banc jsonb := tests.c4_banc();
  v_client uuid := (banc ->> 'client')::uuid;
begin
  perform tests.c4_reprises_pretes();
  perform tests.endosser((banc ->> 'gerant')::uuid, 'gerant@banc-varelo.test');
  return next throws_ok(format('select public.offload_regler(%L::uuid, %L)', v_client, '{"vague_jour": 9}'), '23514',
                        'Le jour de la vague va de 1 (lundi) à 7 (dimanche).', 'Le jour de la vague hors bornes se dit en français');
  return next throws_ok(format('select public.offload_regler(%L::uuid, %L)', v_client, '{"quarantaine_jours": 10}'), '23514',
                        'La quarantaine entre deux reprises va de 90 à 730 jours.', 'La quarantaine aussi (90 à 730 jours depuis c4_40)');
  return next throws_ok(format('select public.offload_regler(%L::uuid, %L)', v_client, '{"seuil_non_remis_pct": 95}'), '23514',
                        'Le seuil de messages non remis va de 5 à 80 %.', 'Le seuil de non-remise aussi');
  return next throws_ok(format('select public.offload_regler(%L::uuid, %L)', v_client, '{"arrete_jour": 31}'), '23514',
                        'Le jour d''arrêté du mois va de 1 à 28.', 'Le jour d''arrêté aussi');
  return next throws_ok(format('select public.offload_regler(%L::uuid, %L)', v_client, '{"vague_jour": "lundi"}'), '22023',
                        'Réglage invalide : une valeur attendue est un nombre, dans ses bornes.', 'Une valeur qui n''est pas un nombre se dit en français');
  return next is((public.offload_regler(v_client, '{"vague_jour": 2}') ->> 'vague_jour')::integer, 2, 'Dans ses bornes, le réglage passe');
  perform tests.redevenir_admin();
end $f$;

select * from runtests('tests'::name, '^test_c4_28_');
