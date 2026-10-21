-- c3_30 — REPUT, correctif TREPUT-07 : délai vide sans envoyee_le ; heures et période au fuseau de l'entité (Guadeloupe).
-- Exécutable tel quel par execute_sql sur la RECETTE, après c3_00 à c3_29 (aides tests.c3_*, dont tests.c3_15_demande de
-- c3_15) et les migrations c3_01 à c3_30. runtests() annule tout.

create or replace function tests.test_c3_30_export_delai_fuseau() returns setof text
language plpgsql as $f$
declare
  banc jsonb;
  v_client uuid; v_gerant uuid; v_gp uuid; v_prog uuid; v_a uuid; v_b uuid; x public.reput_exports; v_ligne text; v_cell text[];
begin
  banc := tests.c3_banc();
  v_client := (banc ->> 'client')::uuid;
  perform tests.redevenir_admin();
  v_gerant := tests.c3_compte(v_client, 'gerant', 'c3-30-gerant@banc-varelo.test');
  insert into public.entites (client_id, nom, type, fuseau) values (v_client, 'Agence de Pointe-à-Pitre (C3-30)', 'site', 'America/Guadeloupe')
  returning id into v_gp;
  perform public.reput_installer(v_client);
  perform tests.endosser(v_gerant, 'c3-30-gerant@banc-varelo.test');
  v_prog := (public.reput_programmer_export(v_client, 'mensuel', 1, v_gp) ->> 'programme')::uuid;
  perform tests.redevenir_admin();

  -- 31/10/2026 à 23 h 30 en Guadeloupe = 01/11/2026 03 h 30 UTC (04 h 30 à Paris) ; jamais répondue.
  v_a := tests.c3_15_demande(v_client, 'email', 'c3-30a@exemple.test', 'Fictif Antilles', 'Ouvert le 1er novembre ?',
                             '2026-10-31 23:30:00 America/Guadeloupe'::timestamptz);
  update public.reput_demandes set entite_id = v_gp where id = v_a;
  -- une répondue en 45 minutes
  v_b := tests.c3_15_demande(v_client, 'email', 'c3-30b@exemple.test', 'Fictif Répondu', 'Un devis ?', '2026-10-15 10:00:00 America/Guadeloupe'::timestamptz);
  update public.reput_demandes set entite_id = v_gp, envoyee_le = '2026-10-15 10:45:00 America/Guadeloupe'::timestamptz where id = v_b;

  v_a := private.reput_fabriquer_export(v_prog, '2026-10-01', '2026-10-31');
  select * into x from public.reput_exports r where r.id = v_a;
  return next ok(position('Fictif Antilles' in x.contenu) > 0, 'La demande du 31 octobre au soir, heure de Guadeloupe, est dans octobre');
  select l into v_ligne from unnest(string_to_array(x.contenu, E'\r\n')) l where l like '%Fictif Antilles%';
  v_cell := string_to_array(v_ligne, ';');
  return next is(v_cell[1], '31/10/2026 23:30', 'Son heure est celle du site (et non 01/11 04:30, heure de Paris)');
  return next is(v_cell[10], '', 'Jamais répondue : le délai de réponse reste vide (et non 1)');
  select l into v_ligne from unnest(string_to_array(x.contenu, E'\r\n')) l where l like '%Fictif Répondu%';
  v_cell := string_to_array(v_ligne, ';');
  return next ok(v_cell[10] = '45' and v_cell[9] = '15/10/2026 10:45', 'Répondue : 45 minutes, à l''heure du site');

  -- « le jour dit » au fuseau du site : le 1er novembre à 00 h 30 en Guadeloupe (= 1er à 05 h 30 Paris), mais aussi
  -- le 31 octobre 22 h en Guadeloupe (= 1er novembre 03 h à Paris) ne déclenche PAS l'export mensuel.
  return next is((select count(*)::int from public.reput_exports r where r.programme_id = v_prog and r.periode_du = '2026-10-01'), 1,
                 'Un seul fichier d''octobre (fabriqué à la main ci-dessus)');
  perform private.reput_exports_du_jour('2026-10-31 22:00:00 America/Guadeloupe'::timestamptz);
  return next is((select count(*)::int from public.reput_exports r where r.programme_id = v_prog), 1,
                 'Le 31 octobre au soir en Guadeloupe n''est pas encore « le 1er » : rien de plus');
end $f$;

select * from runtests('tests'::name, '^test_c3_30_');
