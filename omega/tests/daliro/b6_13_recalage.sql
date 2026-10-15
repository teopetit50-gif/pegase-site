-- b6_13 — DALIRO : le recalage du planning quand un lot prend du retard (session B6, 06/10/2026), b6_19.
-- Exécutable tel quel par execute_sql sur la RECETTE, après b6_00_jeu.sql et les migrations b6_01 à b6_19.
-- runtests() annule tout.
--
-- Quatre passages enchaînés dans cinq semaines : A (5 jours) → B (1 jour) → C (4 jours) → D (2 jours, 1 jour ouvré
-- de délai après C) ; E sans lien. A finit 3 jours ouvrés plus tard : B, C, D glissent, E ne bouge pas. Les dates
-- attendues sont calculées avec public.ajouter_jours (jours ouvrés et fériés de métropole), comme la porte.

create or replace function tests.test_b6_13_recalage() returns setof text
language plpgsql as $f$
declare
  banc jsonb; v_client uuid; v_gerant uuid; v_collab uuid;
  v_mo uuid; v_ch uuid; v_lot uuid;
  v_l date := date_trunc('week', current_date + 35)::date;
  v_a uuid; v_b uuid; v_c uuid; v_d uuid; v_e uuid; v_f uuid;
  v_fin_a date; v_r jsonb; v_b_debut date; v_c_fin date;
  v_duree_c integer; v_duree_c2 integer;
begin
  banc := tests.b6_banc();
  v_client := (banc ->> 'client')::uuid; v_gerant := (banc ->> 'gerant')::uuid;
  perform tests.redevenir_admin();
  perform public.btp_installer(v_client, 'chantiers');
  v_collab := tests.b6_compte(v_client, 'collaborateur', 'b6-recalage-collab@banc-varelo.test');

  perform tests.endosser(v_gerant, 'gerant@banc-varelo.test');
  insert into public.btp_tiers (client_id, roles, nom) values (v_client, array['maitre_ouvrage'], 'MO du recalage') returning id into v_mo;
  insert into public.btp_chantiers (client_id, nom, code_postal, commune, maitre_ouvrage_type, place_client, maitre_ouvrage_id, statut)
  values (v_client, 'Chantier du recalage', '69100', 'Villeurbanne', 'professionnel', 'titulaire', v_mo, 'ouvert') returning id into v_ch;
  insert into public.btp_lots (client_id, chantier_id, code, libelle, execution) values (v_client, v_ch, '01', 'Lot du recalage', 'client') returning id into v_lot;
  insert into public.btp_passages (client_id, chantier_id, lot_id, tache, debut, fin, confirmation)
  values (v_client, v_ch, v_lot, 'Recalage A', v_l, v_l + 4, 'confirmee') returning id into v_a;
  insert into public.btp_passages (client_id, chantier_id, lot_id, tache, debut, fin, confirmation)
  values (v_client, v_ch, v_lot, 'Recalage B', v_l + 7, v_l + 7, 'confirmee') returning id into v_b;
  insert into public.btp_passages (client_id, chantier_id, lot_id, tache, debut, fin)
  values (v_client, v_ch, v_lot, 'Recalage C', v_l + 8, v_l + 11) returning id into v_c;
  insert into public.btp_passages (client_id, chantier_id, lot_id, tache, debut, fin)
  values (v_client, v_ch, v_lot, 'Recalage D', v_l + 15, v_l + 16) returning id into v_d;
  insert into public.btp_passages (client_id, chantier_id, lot_id, tache, debut, fin)
  values (v_client, v_ch, v_lot, 'Recalage E', v_l + 1, v_l + 2) returning id into v_e;
  insert into public.btp_passages (client_id, chantier_id, lot_id, tache, debut, fin)
  values (v_client, v_ch, v_lot, 'Recalage F en retard', current_date - 6, current_date - 3) returning id into v_f;
  insert into public.btp_dependances (client_id, chantier_id, amont_id, aval_id, delai_min_jours) values
    (v_client, v_ch, v_a, v_b, 0), (v_client, v_ch, v_b, v_c, 0), (v_client, v_ch, v_c, v_d, 1), (v_client, v_ch, v_f, v_c, 0);

  -- ── Les droits ──
  return next ok(not has_function_privilege('anon', 'public.btp_recaler(uuid, date, text)', 'execute'), 'anon ne recale pas');
  return next ok(not has_function_privilege('authenticated', 'private.btp_calculer_recalage(uuid, date)', 'execute'), 'authenticated n''appelle pas le calcul privé');
  perform tests.endosser(v_collab, 'b6-recalage-collab@banc-varelo.test');
  return next throws_ok(format('select public.btp_proposer_recalage(%L, %L)', v_a, v_l + 6), '42501', null, 'Un collaborateur ne recale pas le planning');
  perform tests.endosser(v_gerant, 'gerant@banc-varelo.test');

  -- ── La proposition : rien n'est écrit ──
  v_fin_a := public.ajouter_jours(v_l + 4, 3, 'ouvres', 'metropole');
  v_r := public.btp_proposer_recalage(v_a, v_fin_a);
  return next is((v_r ->> 'nombre')::int, 4, 'A finit 3 jours ouvrés plus tard : A, B, C et D bougent');
  return next ok(not exists (select 1 from jsonb_array_elements(v_r -> 'deplaces') x where x ->> 'passage_id' = v_e::text), 'E, sans lien, ne bouge pas');
  return next is((select p.fin from public.btp_passages p where p.id = v_a), v_l + 4, 'Proposer n''écrit rien');
  v_b_debut := (select (x ->> 'nouveau_debut')::date from jsonb_array_elements(v_r -> 'deplaces') x where x ->> 'passage_id' = v_b::text);
  return next is(v_b_debut, public.ajouter_jours(v_fin_a, 1, 'ouvres', 'metropole'), 'B commence le jour ouvré qui suit la nouvelle fin de A');
  return next ok((select (x ->> 'reconfirmer')::boolean from jsonb_array_elements(v_r -> 'deplaces') x where x ->> 'passage_id' = v_b::text),
                 'B était confirmé : il faudra le reconfirmer');
  v_c_fin := (select (x ->> 'nouveau_fin')::date from jsonb_array_elements(v_r -> 'deplaces') x where x ->> 'passage_id' = v_c::text);
  select count(*) into v_duree_c from generate_series(v_l + 8, v_l + 11, interval '1 day') g where public.jour_ouvre(g::date, 'metropole', false);
  select count(*) into v_duree_c2 from jsonb_array_elements(v_r -> 'deplaces') x, generate_series((x ->> 'nouveau_debut')::date, (x ->> 'nouveau_fin')::date, interval '1 day') g
  where x ->> 'passage_id' = v_c::text and public.jour_ouvre(g::date, 'metropole', false);
  return next is(v_duree_c2, v_duree_c, 'C garde sa durée en jours ouvrés');
  return next is((select (x ->> 'nouveau_debut')::date from jsonb_array_elements(v_r -> 'deplaces') x where x ->> 'passage_id' = v_d::text),
                 public.ajouter_jours(v_c_fin, 2, 'ouvres', 'metropole'), 'D respecte son jour ouvré de délai après C');
  return next throws_ok(format('select public.btp_proposer_recalage(%L, %L)', v_a, v_l - 1), '22023', null, 'Une fin avant le début est refusée');

  -- ── Recaler : écrit, reconfirmation, journal, rejeu ──
  v_r := public.btp_recaler(v_a, v_fin_a, 'Livraison des châssis en retard');
  return next is((select p.debut from public.btp_passages p where p.id = v_b), v_b_debut, 'Recaler écrit les nouvelles dates');
  return next is((select p.confirmation from public.btp_passages p where p.id = v_b), 'non_demandee', 'B déplacé : sa confirmation J-2 repartira à la nouvelle date');
  return next is((public.btp_proposer_recalage(v_a, v_fin_a) ->> 'nombre')::int, 0, 'Recaler deux fois ne déplace plus rien');
  perform tests.redevenir_admin();
  return next ok(tests.b6_journal(v_client, 'daliro.planning_recale', v_ch::text) is not null, 'Le recalage est au journal, avec son motif');

  -- ── Le passage en retard : point du matin, puis noté fait ──
  return next ok(exists (select 1 from jsonb_array_elements(private.btp_point_matin_lignes(v_client, current_date)) x
                         where x ->> 'texte' like 'Chantier du recalage : « Recalage F en retard » devait finir le % et n''est pas noté fait : notez-le fait ou recalez la suite (2 passages en aval)'
                           and x ->> 'gravite' = 'attention'), 'Le point du matin signale le passage en retard et sa suite');
  perform tests.endosser(v_gerant, 'gerant@banc-varelo.test');
  return next throws_ok(format('select public.btp_terminer_passage(%L, current_date + 1)', v_f), '22023', null, 'Un passage ne se note pas fait dans le futur');
  v_r := public.btp_terminer_passage(v_f, current_date - 1);
  return next is((select p.statut || '/' || p.fin from public.btp_passages p where p.id = v_f), 'fait/' || (current_date - 1)::text, 'F noté fait, à sa fin réelle');
  return next throws_ok(format('select public.btp_recaler(%L, current_date)', v_f), '23514', null, 'Un passage fait ne se recale plus');
  perform tests.redevenir_admin();
  return next ok(not exists (select 1 from jsonb_array_elements(private.btp_point_matin_lignes(v_client, current_date)) x
                             where x ->> 'texte' like 'Chantier du recalage : « Recalage F en retard »%'), 'Noté fait, il sort du point du matin');
end $f$;

select * from runtests('tests'::name, '^test_b6_13_');
