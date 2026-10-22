-- c3_38 — REPUT, TREPUT-13 et TREPUT-14 : le gérant lit le suivi des appels d'astreinte (sans numéro) ; une garde à
-- l'envers est refusée par le constat. Exécutable tel quel par execute_sql sur la RECETTE, après c3_00 à c3_37 et les
-- migrations c3_01 à c3_38. Numéros fictifs ; aucun appel réel. runtests() annule tout.

create or replace function tests.test_c3_38_astreinte_suivi() returns setof text
language plpgsql as $f$
declare
  banc jsonb;
  v_client uuid; v_gerant uuid; m1 uuid; v_autre uuid; v_dem uuid; v_t timestamptz := now();
begin
  banc := tests.c3_banc();
  v_client := (banc ->> 'client')::uuid;
  perform tests.redevenir_admin();
  v_gerant := tests.c3_compte(v_client, 'gerant', 'c3-38-gerant@banc-varelo.test');
  m1 := tests.c3_compte(v_client, 'collaborateur', 'c3-38-m1@banc-varelo.test');
  perform public.reput_installer(v_client);
  perform tests.endosser(v_gerant, 'c3-38-gerant@banc-varelo.test');

  -- ── TREPUT-14 ──
  return next throws_like(format('select public.reput_poser_garde(%L, null, %L, %L, now() + interval ''1 day'', now())', v_client, m1, '0600000038'),
                          'La fin de la garde (%) est avant son début (%).', 'Fin avant le début : le constat est dit');
  return next throws_like(format('select public.reput_poser_garde(%L, null, %L, %L, ''2026-10-22 10:00+00'', ''2026-10-22 10:00+00'')', v_client, m1, '0600000038'),
                          'La garde commence et finit au même moment%', 'Même instant : dit aussi');

  -- ── TREPUT-13 ──
  perform public.reput_regler_astreinte(v_client, true, 10);
  perform public.reput_poser_garde(v_client, null, m1, '06 00 00 00 38', v_t - interval '1 hour', v_t + interval '1 day', 1);
  perform tests.redevenir_admin();
  v_dem := tests.c3_15_demande(v_client, 'email', 'c3-38a@exemple.test', 'Fictif Suivi', 'Inondation dans la cave.');
  update public.reput_demandes set urgence = true where id = v_dem;
  perform tests.endosser(v_gerant, 'c3-38-gerant@banc-varelo.test');
  return next ok(exists (select 1 from public.reput_astreinte_suivi s where s.demande_id = v_dem and s.rang = 1 and s.membre = m1
                                                                      and s.etat = 'À appeler' and s.de_nom = 'Fictif Suivi'),
                 'Le gérant lit l''appel d''astreinte : rang, membre, état en clair');
  return next ok(not exists (select 1 from information_schema.columns c where c.table_schema = 'public' and c.table_name = 'reput_astreinte_suivi'
                                                                   and c.column_name in ('telephone', 'corps')),
                 'Ni le numéro de garde ni le contenu de la demande');
  return next throws_ok('select public.reput_appels_a_passer()', '42501', null, 'La porte de l''ouvrier reste fermée au gérant');
  perform tests.redevenir_admin();
  v_autre := (tests.jeu() ->> 'gerant_a')::uuid;
  perform tests.endosser(v_autre, 'autre@exemple.test');
  return next is((select count(*)::int from public.reput_astreinte_suivi s where s.demande_id = v_dem), 0, 'Une autre organisation ne lit rien');
end $f$;

select * from runtests('tests'::name, '^test_c3_38_');
