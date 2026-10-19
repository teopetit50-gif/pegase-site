-- c3_24 — REPUT : la transcription des appels, commutable (twilio | ue).
-- Exécutable tel quel par execute_sql sur la RECETTE, après c3_00 à c3_23 (aides tests.c3_*) et les migrations c3_01 à c3_24.
-- Rien n'est appelé. runtests() annule tout.

create or replace function tests.test_c3_24_transcription() returns setof text
language plpgsql as $f$
declare
  banc jsonb;
  v_client uuid; v_gerant uuid; v_collab uuid;
begin
  banc := tests.c3_banc();
  v_client := (banc ->> 'client')::uuid;
  perform tests.redevenir_admin();
  v_gerant := tests.c3_compte(v_client, 'gerant', 'c3-24-gerant@banc-varelo.test');
  v_collab := tests.c3_compte(v_client, 'collaborateur', 'c3-24-collab@banc-varelo.test');
  perform public.reput_installer(v_client);

  return next is(public.reput_voie_transcription(v_client), 'twilio', 'Par défaut : la reconnaissance de Twilio (l''essai)');
  perform tests.endosser(v_collab, 'c3-24-collab@banc-varelo.test');
  return next throws_ok(format('select public.reput_regler_transcription(%L, %L)', v_client, 'ue'), '42501', null,
                        'Un collaborateur ne choisit pas la voie de transcription');
  return next throws_ok(format('select public.reput_voie_transcription(%L)', v_client), '42501', null,
                        'Une personne connectée ne lit pas la voie de l''ouvrier');
  perform tests.endosser(v_gerant, 'c3-24-gerant@banc-varelo.test');
  return next throws_ok(format('select public.reput_regler_transcription(%L, %L)', v_client, 'autre'), '22023', null, 'Une voie inconnue est refusée');
  perform public.reput_regler_transcription(v_client, 'ue');
  perform tests.redevenir_admin();
  return next is(public.reput_voie_transcription(v_client), 'ue', 'Réglée sur « ue » : l''ouvrier enregistre court et transcrit en UE');
  return next ok(tests.c3_journal(v_client, 'reput.transcription_reglee') is not null, 'Journal : reput.transcription_reglee');
end $f$;

select * from runtests('tests'::name, '^test_c3_24_');
