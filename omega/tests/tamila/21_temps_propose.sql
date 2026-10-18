-- 21 — Le temps proposé à la saisie et le forfait consommé contre prévu (migration b4_12). Après 00_jeu_tamila.sql,
-- b4_01 à b4_12. runtests() annule tout.

create or replace function tests.test_b4_21_temps_propose() returns setof text
language plpgsql as $f$
declare
  jeu jsonb; v_client uuid; v_dossier uuid; v_autre uuid; v_aud uuid; v_aud_autre uuid; v_avis uuid; v_t uuid; v_t2 uuid;
  v_auj date := (now() at time zone 'Europe/Paris')::date; n bigint;
begin
  jeu := tests.tamila_scene();
  v_client := (jeu ->> 'client')::uuid;
  v_dossier := (jeu ->> 'dossier')::uuid;
  v_autre := tests.tamila_dossier(jeu);
  perform tests.redevenir_admin();
  v_aud := (tests.inserer_minimal('public', 'tamila_audiences', jsonb_build_object('client_id', v_client, 'dossier_id', v_dossier,
              'date_heure', now() - interval '2 days', 'nature', 'plaidoiries', 'statut', 'tenue', 'avocat_id', jeu ->> 'avocat', 'source', 'saisie')) ->> 'id')::uuid;
  v_aud_autre := (tests.inserer_minimal('public', 'tamila_audiences', jsonb_build_object('client_id', v_client, 'dossier_id', v_autre,
              'date_heure', now() - interval '3 days', 'nature', 'mise_en_etat', 'statut', 'tenue', 'source', 'saisie')) ->> 'id')::uuid;
  v_avis := (tests.inserer_minimal('public', 'tamila_avis', jsonb_build_object('client_id', v_client, 'dossier_id', v_dossier,
              'type_avis', 'rpva_avis_fixation', 'date_avis', v_auj - 1, 'confiance', 'saisie', 'statut', 'lu')) ->> 'id')::uuid;

  return next ok(not has_function_privilege('anon', 'public.tamila_saisir_temps_propose(uuid, text, date, integer, text, bytea, boolean)', 'execute')
                 and not has_function_privilege('anon', 'public.tamila_ecarter_proposition(uuid, text)', 'execute')
                 and not has_function_privilege('anon', 'public.tamila_prevoir_forfait(uuid, integer)', 'execute'),
                 'les trois portes sont fermées à anon');

  -- ── 1. Saisir un temps proposé ──
  perform tests.endosser((jeu ->> 'avocat')::uuid, 'b4-rousseau@essai.invalid');
  v_t := public.tamila_saisir_temps_propose(v_dossier, 'audience:' || v_aud, v_auj - 2, 120, 'audience');
  return next is((select origine from public.tamila_temps where id = v_t), 'audience:' || v_aud, 'le temps garde son origine (l''audience tenue)');
  return next is((select minutes from public.tamila_temps where id = v_t), 120, 'deux heures, corrigeables avant saisie');
  return next throws_ok(format('select public.tamila_saisir_temps_propose(%L::uuid, %L, %L::date, 60, ''audience'')', v_dossier, 'audience:' || v_aud, v_auj - 2),
                        '55000', null, 'la même audience ne se saisit pas deux fois (55000)');
  return next throws_ok(format('select public.tamila_saisir_temps_propose(%L::uuid, %L, %L::date, 60, ''audience'')', v_dossier, 'audience:' || v_aud_autre, v_auj - 3),
                        '22023', null, 'l''audience d''un autre dossier est refusée (22023)');
  return next throws_ok(format('select public.tamila_saisir_temps_propose(%L::uuid, ''audience:pas-un-id'', %L::date, 60, ''audience'')', v_dossier, v_auj),
                        '22023', null, 'une origine illisible est refusée (22023)');
  return next throws_ok(format('select public.tamila_saisir_temps_propose(%L::uuid, %L, %L::date, 0, ''audience'')', v_dossier, 'avis:' || v_avis, v_auj),
                        '22023', null, 'les règles de la saisie valent : zéro minute refusée (22023)');
  -- Annulé, il se ressaisit.
  perform public.tamila_annuler_temps(v_t);
  v_t2 := public.tamila_saisir_temps_propose(v_dossier, 'audience:' || v_aud, v_auj - 2, 90, 'audience');
  return next ok(v_t2 is not null and v_t2 <> v_t, 'un temps annulé se ressaisit depuis la même proposition');
  perform tests.redevenir_admin();

  -- Une autre personne peut saisir le sien pour la même audience.
  perform tests.endosser((jeu ->> 'gerant')::uuid, 'b4-delorme@essai.invalid');
  return next lives_ok(format('select public.tamila_saisir_temps_propose(%L::uuid, %L, %L::date, 120, ''audience'')', v_dossier, 'audience:' || v_aud, v_auj - 2),
                       'le gérant saisit aussi son temps d''audience (chacun le sien)');
  perform tests.redevenir_admin();

  -- Le stagiaire (lecteur) n'écrit pas.
  perform tests.endosser((jeu ->> 'stagiaire')::uuid, 'b4-stagiaire@essai.invalid');
  return next throws_ok(format('select public.tamila_saisir_temps_propose(%L::uuid, %L, %L::date, 15, ''correspondance'')', v_dossier, 'avis:' || v_avis, v_auj),
                        '42501', null, 'le stagiaire ne saisit pas de temps (42501)');
  perform tests.redevenir_admin();

  -- ── 2. Ignorer une proposition ──
  perform tests.endosser((jeu ->> 'avocat')::uuid, 'b4-rousseau@essai.invalid');
  perform public.tamila_ecarter_proposition(v_dossier, 'avis:' || v_avis);
  return next lives_ok(format('select public.tamila_ecarter_proposition(%L::uuid, %L)', v_dossier, 'avis:' || v_avis), 'ignorée deux fois : sans erreur');
  select count(*) into n from public.tamila_temps_ecartes where dossier_id = v_dossier;
  return next is(n, 1::bigint, 'l''avocat lit ce qu''il a ignoré');
  return next throws_ok(format('select public.tamila_ecarter_proposition(%L::uuid, %L)', v_dossier, 'audience:' || v_aud_autre),
                        '22023', null, 'on n''ignore pas l''événement d''un autre dossier (22023)');
  perform tests.redevenir_admin();
  perform tests.endosser((jeu ->> 'assistante')::uuid, 'b4-assistante@essai.invalid');
  select count(*) into n from public.tamila_temps_ecartes where dossier_id = v_dossier;
  return next is(n, 0::bigint, 'l''assistante ne voit pas ce que l''avocat a ignoré');
  perform tests.redevenir_admin();
  return next throws_ok(format('insert into public.tamila_temps_ecartes (client_id, dossier_id, user_id, origine) values (%L, %L, %L, %L)',
                               v_client, v_dossier, jeu ->> 'avocat', 'avis:' || v_avis), '23505', null, 'une seule ligne par personne et par événement (23505)');

  -- ── 3. Le forfait prévu ──
  perform tests.endosser((jeu ->> 'gerant')::uuid, 'b4-delorme@essai.invalid');
  return next throws_ok(format('select public.tamila_prevoir_forfait(%L::uuid, 600)', v_dossier), '55000', null, 'sans convention au forfait : refusé (55000)');
  perform public.tamila_poser_convention(v_dossier, 'temps_passe', 25000);
  return next throws_ok(format('select public.tamila_prevoir_forfait(%L::uuid, 600)', v_dossier), '55000', null, 'une convention au temps passé n''a pas de temps prévu (55000)');
  perform public.tamila_poser_convention(v_dossier, 'forfait', null, 300000);
  perform public.tamila_prevoir_forfait(v_dossier, 1200);
  return next is((select minutes_prevues from public.tamila_conventions where dossier_id = v_dossier and statut <> 'resiliee'), 1200, 'forfait de 3 000 € prévu pour 20 heures');
  return next throws_ok(format('select public.tamila_prevoir_forfait(%L::uuid, 10)', v_dossier), '22023', null, 'dix minutes : refusé (22023)');
  perform tests.redevenir_admin();
  perform tests.endosser((jeu ->> 'avocat')::uuid, 'b4-rousseau@essai.invalid');
  return next throws_ok(format('select public.tamila_prevoir_forfait(%L::uuid, 600)', v_dossier), '42501', null, 'un avocat qui ne gère pas le dossier ne prévoit pas le forfait (42501)');
  perform tests.redevenir_admin();
end $f$;

select * from runtests('tests'::name, '^test_b4_21_');
