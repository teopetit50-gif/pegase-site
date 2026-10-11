-- 26 — L'archive d'un dossier, l'effacement du dossier de faits, le point du matin complété (migration b4_17).
-- Après 00_jeu_tamila.sql, b4_01 à b4_17. runtests() annule tout.

create or replace function tests.test_b4_26_archive_point() returns setof text
language plpgsql as $f$
declare
  jeu jsonb; v_client uuid; v_dossier uuid; v_piece uuid; v_export uuid; r jsonb; v_a uuid; v_demande uuid; v_txt text;
  v_jour date := (now() at time zone 'Europe/Paris')::date; v_m timestamptz; n bigint;
begin
  jeu := tests.tamila_scene();
  v_client := (jeu ->> 'client')::uuid;
  v_dossier := (jeu ->> 'dossier')::uuid;
  v_m := (v_jour + time '08:00') at time zone 'Europe/Paris';
  v_piece := tests.tamila_piece(jeu, 'conclusions.pdf');

  -- ── 1. Le contenu de l'archive ──
  perform tests.endosser((jeu ->> 'gerant')::uuid, 'b4-delorme@essai.invalid');
  perform public.tamila_consulter(v_dossier, 'dossier');
  v_export := public.tamila_demander_export(v_dossier);
  return next throws_ok(format('select public.tamila_export_contenu(%L::uuid)', v_export), '42501', null, 'une personne ne lit pas le contenu brut d''une archive (42501)');
  perform tests.redevenir_admin();
  return next ok(not has_function_privilege('authenticated', 'public.tamila_export_contenu(uuid)', 'execute'), 'la porte est au serveur seul');
  perform tests.endosser_serveur();
  r := public.tamila_export_contenu(v_export);
  perform tests.redevenir_admin();
  return next is(r ->> 'format', 'tamila-archive/1', 'format de l''archive');
  return next is(jsonb_array_length(r -> 'dossiers'), 1, 'un dossier');
  return next ok(left(r -> 'dossiers' -> 0 -> 'dossier' ->> 'reference_chiffree', 4) = '\x01', 'la référence reste chiffrée (hexadécimal, format Tamila)');
  return next ok(jsonb_array_length(r -> 'dossiers' -> 0 -> 'parties') >= 2 and left(r -> 'dossiers' -> 0 -> 'parties' -> 0 ->> 'nom_chiffre', 4) = '\x01', 'les parties, noms chiffrés');
  return next ok(exists (select 1 from jsonb_array_elements(r -> 'dossiers' -> 0 -> 'pieces') p where (p ->> 'id')::uuid = v_piece and p ->> 'chemin' like v_client::text || '/tamila_dossier/%'), 'la pièce et son chemin au bucket');
  return next ok(position(tests.tamila_sentinelle() in r::text) = 0, 'aucun nom en clair dans le contenu de l''archive');
  perform tests.endosser_serveur();
  perform public.tamila_export_pret(v_export, v_client::text || '/tamila_dossier/' || v_dossier::text || '/exports/' || v_export::text || '.zip', 1234, repeat('ab', 32));
  return next throws_ok(format('select public.tamila_export_contenu(%L::uuid)', v_export), '55000', null, 'une archive prête ne se relit pas (55000)');
  perform tests.redevenir_admin();

  -- ── 2. Le point du matin du gérant : forfait dépassé, dossier sans diligence ──
  perform tests.endosser((jeu ->> 'gerant')::uuid, 'b4-delorme@essai.invalid');
  perform public.tamila_poser_convention(v_dossier, 'forfait', null, 300000);
  perform public.tamila_prevoir_forfait(v_dossier, 60);
  perform public.tamila_saisir_temps(v_dossier, v_jour - 40, 90, 'redaction');
  perform tests.redevenir_admin();
  update public.tamila_dossiers set ouvert_le = now() - interval '90 days', cree_le = now() - interval '90 days' where id = v_dossier;
  update public.pieces set recue_le = now() - interval '60 days' where client_id = v_client and objet_id = v_dossier::text;
  update public.tamila_parties set cree_le = cree_le where dossier_id = v_dossier;
  perform private.tamila_deposer_points(v_m);
  select string_agg(i.texte, ' | ') into v_txt from public.points_sections s join public.points_items i on i.section_id = s.id
   where s.client_id = v_client and s.role = 'gerant' and s.titre = 'Tamila : le cabinet';
  return next ok(v_txt like '%1 forfait dépassé : le temps passé excède le temps prévu à la convention%', 'le point : le forfait dépassé (1 h 30 pour 1 h prévue)');
  return next ok(v_txt like '%1 dossier sans diligence depuis trente jours%', 'le point : le dossier sans diligence (rien depuis 40 jours)');
  perform tests.endosser((jeu ->> 'gerant')::uuid, 'b4-delorme@essai.invalid');
  perform public.tamila_saisir_temps(v_dossier, v_jour - 1, 15, 'correspondance');
  perform tests.redevenir_admin();
  perform private.tamila_deposer_points(v_m);
  select string_agg(i.texte, ' | ') into v_txt from public.points_sections s join public.points_items i on i.section_id = s.id
   where s.client_id = v_client and s.role = 'gerant' and s.titre = 'Tamila : le cabinet';
  return next ok(coalesce(v_txt, '') not like '%sans diligence%', 'du temps saisi hier : le dossier n''est plus sans diligence');

  -- ── 3. L'effacement vide le dossier de faits ──
  insert into public.analyses (client_id, module, objet_type, objet_id, type, statut, pieces, chiffrement, resultat_chiffre, comptes)
  values (v_client, 'tamila', 'tamila_dossier', v_dossier::text, 'tamila.chronologie', 'finie', array[v_piece], 'dossier:v1', decode('01' || repeat('ab', 40), 'hex'), '{"info": 3}')
  returning id into v_a;
  perform tests.endosser((jeu ->> 'gerant')::uuid, 'b4-delorme@essai.invalid');
  v_demande := public.tamila_demander_cloture(v_dossier);
  perform public.tamila_decider(v_demande, 'approuve');
  perform tests.redevenir_admin();
  update public.tamila_dossiers set effacement_prevu_le = now() - interval '1 hour' where id = v_dossier;
  perform tests.endosser_serveur();
  perform public.tamila_dossier_a_effacer(v_dossier);
  r := public.tamila_effacer_dossier_verifie(v_dossier);
  perform tests.redevenir_admin();
  return next is((select statut from public.tamila_dossiers where id = v_dossier), 'efface', 'dossier effacé');
  return next ok((select resultat_chiffre is null and comptes is null and motif = 'Effacée avec le dossier.' from public.analyses where id = v_a),
                 'la lecture longue du dossier est vidée de son contenu, la trace reste');
end $f$;

select * from runtests('tests'::name, '^test_b4_26_');
