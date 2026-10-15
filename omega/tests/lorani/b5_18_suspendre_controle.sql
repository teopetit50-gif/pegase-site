-- Tests B5 — LORANI : suspendre un contrôle du dossier, puis le reprendre (b5_29).
-- pgTAP, schéma « tests », client du banc cccccccc-0000-4000-8000-00000000000c ; aides tests.b5_* de b5_01.
-- runtests() annule tout ce que le test écrit.

create or replace function tests.test_b5_18_suspendre_controle() returns setof text
language plpgsql as $f$
declare
  jeu jsonb; v_client uuid; v_gerant uuid; v_referent uuid;
  v_projet uuid; v_pc2 uuid; v_pc5 uuid; v_c uuid; r jsonb;
begin
  jeu := tests.b5_jeu();
  v_client := (jeu ->> 'client')::uuid; v_gerant := (jeu ->> 'gerant')::uuid; v_referent := (jeu ->> 'referent')::uuid;
  perform tests.b5_endosser(v_gerant);
  insert into public.lorani_projets (client_id, nom, code_postal, commune, code_insee, nature)
  values (v_client, 'Maison Perrin (test b5_18)', '44000', 'Nantes', '44109', 'maison_individuelle') returning id into v_projet;
  insert into public.lorani_membres_projet (client_id, projet_id, user_id, role_projet) values (v_client, v_projet, v_referent, 'chef_projet');
  perform tests.b5_admin();
  v_pc2 := tests.b5_lire(v_referent, v_projet, 'PC2-b5_18.pdf', 'lorani_planche', jsonb_build_array(
    jsonb_build_object('champ', 'mesure.hauteur_faitage_m.projet', 'valeur', '7.50', 'texte', '+7,50')));
  v_pc5 := tests.b5_lire(v_referent, v_projet, 'PC5-b5_18.pdf', 'lorani_planche', jsonb_build_array(
    jsonb_build_object('champ', 'mesure.hauteur_faitage_m.projet', 'valeur', '7.90', 'texte', '+7,90')));
  r := private.lorani_lectures_passage();

  perform tests.b5_endosser(v_referent);
  insert into public.lorani_controles (client_id, projet_id, intitule, indice) values (v_client, v_projet, 'Dépôt du PC', 'A') returning id into v_c;
  insert into public.lorani_controle_pieces (client_id, projet_id, controle_id, piece_id, role, reference) values
    (v_client, v_projet, v_c, v_pc2, 'planche', 'PC2'), (v_client, v_projet, v_c, v_pc5, 'planche', 'PC5');

  -- ── 1. Suspendre : le motif est obligatoire ──
  return next throws_ok(format('select public.lorani_suspendre_controle(%L, %L)', v_c, ' '), '22023', null, '1. suspendre sans motif est refusé');
  r := public.lorani_suspendre_controle(v_c, 'En attente de l''indice B des façades');
  return next ok((select suspendu_le is not null and suspendu_motif = 'En attente de l''indice B des façades' and statut = 'en_lecture' from public.lorani_controles where id = v_c),
                 '1. suspendu : daté, motif gardé, statut inchangé');

  -- ── 2. Suspendu, il ne se lance pas ──
  return next throws_ok(format('select public.lorani_lancer_controle(%L)', v_c), '55000', null, '2. le lancer à la main est refusé tant qu''il est suspendu');
  perform tests.b5_admin();
  r := private.lorani_piece_controle_lue(v_pc5);
  return next ok(r -> 'controles' = '[]'::jsonb and (select statut = 'en_lecture' and lance_le is null from public.lorani_controles where id = v_c),
                 '2. la lecture de sa dernière pièce ne le lance pas : il attend');

  -- ── 3. Reprendre : les pièces étant lues, il se lance tout de suite ──
  perform tests.b5_endosser(v_referent);
  r := public.lorani_reprendre_controle(v_c);
  perform tests.b5_admin();
  return next ok(r -> 'lance' is not null and (select suspendu_le is null and suspendu_motif is null and statut = 'controle' and lance_le is not null from public.lorani_controles where id = v_c),
                 '3. repris : la suspension est levée et le contrôle passe aussitôt (pièces toutes lues) : ' || r::text);
  return next ok(exists (select 1 from public.lorani_constats where controle_id = v_c and signature = 'incoherence|hauteur_faitage_m|projet'),
                 '3. … le croisement a tourné : faîtage 7,50 m contre 7,90 m relevé');
  return next ok(exists (select 1 from public.journal_opposable where client_id = v_client and action = 'lorani.controle_suspendu' and objet_id = v_projet::text)
                 and exists (select 1 from public.journal_opposable where client_id = v_client and action = 'lorani.controle_repris' and objet_id = v_projet::text),
                 '3. journal : lorani.controle_suspendu puis lorani.controle_repris');

  -- ── 4. Droits ──
  return next ok(not has_function_privilege('anon', 'public.lorani_suspendre_controle(uuid, text)', 'EXECUTE')
                 and has_function_privilege('authenticated', 'public.lorani_reprendre_controle(uuid)', 'EXECUTE'),
                 '4. les portes sont aux membres, pas à anon');
end $f$;

select * from runtests('tests'::name, '^test_b5_18_');
