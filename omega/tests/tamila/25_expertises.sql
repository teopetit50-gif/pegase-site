-- 25 — L'expertise et ses pièces attendues (migration b4_16). Après 00_jeu_tamila.sql, b4_01 à b4_16. runtests() annule tout.

create or replace function tests.test_b4_25_expertises() returns setof text
language plpgsql as $f$
declare
  jeu jsonb; v_client uuid; v_dossier uuid; v_x uuid; x public.tamila_expertises; v_jour date := (now() at time zone 'Europe/Paris')::date;
  v_m timestamptz; v_txt text; n bigint;
begin
  jeu := tests.tamila_scene();
  v_client := (jeu ->> 'client')::uuid;
  v_dossier := (jeu ->> 'dossier')::uuid;
  v_m := (v_jour + time '08:00') at time zone 'Europe/Paris';

  -- Qui pose : qui écrit dans le dossier.
  perform tests.endosser((jeu ->> 'stagiaire')::uuid, 'b4-stagiaire@essai.invalid');
  return next throws_ok(format('select public.tamila_poser_expertise(%L::uuid, null, ''{}'')', v_dossier), '42501', null, 'le stagiaire ne pose pas d''expertise (42501)');
  perform tests.redevenir_admin();
  perform tests.endosser((jeu ->> 'assistante')::uuid, 'b4-assistante@essai.invalid');
  return next throws_ok(format('select public.tamila_poser_expertise(%L::uuid, null, ''{"expert": "Dupont"}'')', v_dossier), '22023', null, 'aucun champ libre, aucun nom (22023)');
  return next throws_ok(format('select public.tamila_poser_expertise(%L::uuid, null, ''{"ordonnee_le": "12/03/2026"}'')', v_dossier), '22023', null, 'une date s''écrit AAAA-MM-JJ (22023)');
  return next throws_ok(format('select public.tamila_poser_expertise(%L::uuid, null, %L::jsonb)', v_dossier,
                               jsonb_build_object('ordonnee_le', v_jour - 10, 'dires_jusqu_au', v_jour + 40, 'rapport_attendu_le', v_jour + 30)),
                        '22023', null, 'des dires après le rapport : incohérent (22023)');
  v_x := public.tamila_poser_expertise(v_dossier, null, jsonb_build_object('ordonnee_le', v_jour - 60, 'consignation_avant', v_jour + 2,
            'pre_rapport_attendu_le', v_jour - 3, 'dires_jusqu_au', v_jour + 5, 'rapport_attendu_le', v_jour + 60));
  perform tests.redevenir_admin();
  select * into x from public.tamila_expertises where id = v_x;
  return next ok(x.statut = 'en_cours' and x.mission = 'judiciaire' and x.dires_jusqu_au = v_jour + 5, 'l''assistante pose l''expertise et ses dates');

  -- Le point du matin de l'avocat du dossier : consignation (J-2, critique), dires (J-5), pré-rapport en retard.
  perform private.tamila_deposer_points(v_m);
  select string_agg(i.texte || ' [' || i.gravite || ']', ' | ') into v_txt
    from public.points_sections s join public.points_items i on i.section_id = s.id
   where s.client_id = v_client and s.module = 'tamila' and s.destinataire = (jeu ->> 'avocat')::uuid;
  return next ok(v_txt like format('%%Expertise : consignation à verser avant le %s%%art. 271 CPC) [critique]%%', to_char(v_jour + 2, 'DD/MM/YYYY')), 'le point : la consignation, critique à J-2');
  return next ok(v_txt like format('%%Expertise : dires à adresser à l''expert au plus tard le %s [attention]%%', to_char(v_jour + 5, 'DD/MM/YYYY')), 'le point : les dires à J-5');
  return next ok(v_txt like format('%%Expertise : pré-rapport attendu le %s, pas encore reçu%%', to_char(v_jour - 3, 'DD/MM/YYYY')), 'le point : le pré-rapport en retard');

  -- Les étapes notées.
  perform tests.endosser((jeu ->> 'avocat')::uuid, 'b4-rousseau@essai.invalid');
  return next throws_ok(format('select public.tamila_noter_expertise(%L::uuid, ''pre_rapport_recu'', %L::date)', v_x, v_jour + 1), '22023', null, 'une étape ne se note pas dans le futur (22023)');
  return next throws_ok(format('select public.tamila_noter_expertise(%L::uuid, ''visite'')', v_x), '22023', null, 'une étape inconnue est refusée (22023)');
  perform public.tamila_noter_expertise(v_x, 'consignation_versee');
  perform public.tamila_noter_expertise(v_x, 'pre_rapport_recu', v_jour - 1);
  perform public.tamila_noter_expertise(v_x, 'dires_deposes');
  perform tests.redevenir_admin();
  perform private.tamila_deposer_points(v_m);
  select count(*) into n from public.points_sections s join public.points_items i on i.section_id = s.id
   where s.client_id = v_client and s.destinataire = (jeu ->> 'avocat')::uuid and i.texte like 'Expertise%';
  return next is(n, 0::bigint, 'consignation versée, pré-rapport reçu, dires déposés : plus rien d''attendu au point');
  perform tests.endosser((jeu ->> 'avocat')::uuid, 'b4-rousseau@essai.invalid');
  perform public.tamila_noter_expertise(v_x, 'rapport_recu');
  return next throws_ok(format('select public.tamila_noter_expertise(%L::uuid, ''dires_deposes'')', v_x), '55000', null, 'le rapport reçu clôt l''expertise (55000)');
  perform tests.redevenir_admin();
  return next is((select statut from public.tamila_expertises where id = v_x), 'deposee', 'expertise déposée');

  -- Qui lit.
  perform tests.endosser((jeu ->> 'autre_gerant')::uuid, 'b4-voisin@essai.invalid');
  select count(*) into n from public.tamila_expertises where dossier_id = v_dossier;
  return next is(n, 0::bigint, 'un autre cabinet ne voit pas l''expertise');
  perform tests.redevenir_admin();
  perform tests.endosser((jeu ->> 'avocat')::uuid, 'b4-rousseau@essai.invalid');
  select count(*) into n from public.tamila_expertises where dossier_id = v_dossier;
  return next is(n, 1::bigint, 'l''avocat du dossier la voit');
  perform tests.redevenir_admin();
  return next ok(not has_function_privilege('anon', 'public.tamila_poser_expertise(uuid, uuid, jsonb)', 'execute'), 'fermé à anon');
end $f$;

select * from runtests('tests'::name, '^test_b4_25_');
