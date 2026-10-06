-- Tests B5 — LORANI : les courriels du guichet numérique rangés dans le bon dossier (b5_11, vague 3, manque n° 1).
-- pgTAP, schéma « tests », client du banc cccccccc-0000-4000-8000-00000000000c. Les aides tests.b5_* sont celles de
-- omega/tests/lorani/b5_01_parcours_permis.sql (à poser avant). runtests() annule tout ce que le test écrit.
--
-- Portes empruntées : lorani_projets / lorani_permis écrits sous RLS par le gérant ; public.deposer_reception (clé de
-- service, comme l'ouvrier de réception d'A2) ; private.lorani_lectures_passage() (cron, appelé tel quel).

create or replace function tests.test_b5_02_courriels_guichet() returns setof text
language plpgsql as $f$
declare
  jeu jsonb; v_client uuid; v_gerant uuid;
  v_projet uuid; v_permis uuid; v_autre uuid;
  r jsonb; v_rec bigint; v_rec2 bigint; v_rec3 bigint; v_rec4 bigint; v_piece uuid; n integer;
  v_chemin text;
begin
  jeu := tests.b5_jeu();
  v_client := (jeu ->> 'client')::uuid; v_gerant := (jeu ->> 'gerant')::uuid;

  -- ── 1. La lecture des numéros cités ──
  return next is(private.lorani_numeros_cites('Accusé de réception électronique - Dossier PC 044 109 26 A0199 déposé le 15/09/2026'),
                 array['PC04410926A0199'], '1. un numéro écrit avec des espaces est lu et normalisé');
  return next is(private.lorani_numeros_cites(E'Objet : DP0441092600107\nARE_pc-044-109-26-a0199.pdf ; rappel DP 044109 26 00107'),
                 array['DP0441092600107', 'PC04410926A0199'], '1. … collé, en minuscules, avec des tirets, dans un nom de fichier ; sans doublon, dans l''ordre');
  return next is(private.lorani_numeros_cites('Votre demande est complète. Référence 2026-0042.'), '{}'::text[], '1. … rien quand aucun numéro d''autorisation n''est cité');

  -- ── 2. Un dossier et son permis, saisis par le gérant ──
  perform tests.b5_endosser(v_gerant);
  insert into public.lorani_projets (client_id, nom, code_postal, commune, code_insee, parcelles, nature)
  values (v_client, 'Atelier Ferrand (test b5_02)', '44000', 'Nantes', '44109', array['AB 12'], 'maison_individuelle') returning id into v_projet;
  insert into public.lorani_permis (client_id, projet_id, type_autorisation, intitule, numero)
  values (v_client, v_projet, 'pcmi', 'Maison Ferrand', 'PC 044109 26 A0199') returning id into v_permis;
  insert into public.lorani_projets (client_id, nom, code_postal, commune, code_insee, parcelles, nature)
  values (v_client, 'Autre dossier (test b5_02)', '44000', 'Nantes', '44109', array['AB 13'], 'maison_individuelle') returning id into v_autre;
  insert into public.lorani_permis (client_id, projet_id, type_autorisation, intitule, numero)
  values (v_client, v_autre, 'dp', 'Clôture voisine', 'DP 044109 26 00777');
  perform tests.b5_admin();

  -- ── 3. L'ARE arrive par courriel sur la boîte Lorani, avec sa pièce jointe ──
  v_chemin := format('%s/receptions/b5-02-are/ARE_PC0441092600199.pdf', v_client);
  perform tests.b5_ouvrier();
  r := public.deposer_reception(v_client, 'email', 'lorani@banc-varelo.test', 'b5-02-are', 'ne-pas-repondre@guichet.nantes.test',
         'Guichet numérique des autorisations d''urbanisme', 'Accusé de réception électronique — PC 044 109 26 A0199',
         'Votre demande de permis de construire a été enregistrée le 15/09/2026.', null,
         jsonb_build_array(jsonb_build_object('nom', 'ARE_PC0441092600199.pdf', 'mime', 'application/pdf', 'taille', 18000, 'chemin', v_chemin)),
         '{"module": "lorani"}'::jsonb, now());
  perform tests.b5_admin();
  v_rec := (r ->> 'id')::bigint;
  return next ok(exists (select 1 from public.travaux where module = 'lorani' and genre = 'lorani.reception' and (charge ->> 'reception')::bigint = v_rec),
                 '3. la réception publie un travail lorani.reception (abonnement b5_11)');
  r := private.lorani_lectures_passage();
  return next ok((r ->> 'erreurs')::integer = 0, '3. le passage des lectures prend le courriel sans erreur : ' || r::text);
  select id into v_piece from public.pieces
  where client_id = v_client and module = 'lorani' and objet_type = 'lorani_projet' and objet_id = v_projet::text and chemin = v_chemin;
  return next ok(v_piece is not null, '3. la pièce jointe devient une pièce du dossier « Atelier Ferrand »');
  return next ok((select source = 'courriel' and depose_par is null and nom_fichier = 'ARE_PC0441092600199.pdf' and mime = 'application/pdf'
                  from public.pieces where id = v_piece), '3. … source « courriel », sans déposant, nom et type gardés');
  return next ok(exists (select 1 from public.travaux where genre = 'lecteur.lire' and cle = 'piece:' || v_piece),
                 '3. … et le socle a déposé sa lecture (lecteur.lire) : la chaîne des courriers suit');
  return next is((select statut from public.receptions where id = v_rec), 'traitee', '3. la réception de la boîte Lorani passe « traitee »');
  return next ok(exists (select 1 from public.journal_opposable where client_id = v_client and action = 'lorani.courriel_rattache'
                         and objet_id = v_projet::text), '3. journal : lorani.courriel_rattache');

  -- ── 4. Le même courriel rejoué ne crée rien de plus ──
  r := private.lorani_rattacher_reception(v_rec);
  select count(*) into n from public.pieces where client_id = v_client and objet_id = v_projet::text and chemin = v_chemin;
  return next is(n, 1, '4. rejoué, le rattachement ne double pas la pièce');

  -- ── 5. Un courriel sans pièce jointe sur un dossier reconnu : à lire ──
  perform tests.b5_ouvrier();
  r := public.deposer_reception(v_client, 'email', 'lorani@banc-varelo.test', 'b5-02-corps', 'ne-pas-repondre@guichet.nantes.test',
         'Guichet numérique', 'Dossier PC0441092600199 : votre dossier est complet', 'Le délai d''instruction court depuis le 15/09/2026.',
         null, '[]'::jsonb, '{"module": "lorani"}'::jsonb, now());
  perform tests.b5_admin();
  v_rec2 := (r ->> 'id')::bigint;
  r := private.lorani_lectures_passage();
  return next ok(exists (select 1 from public.alertes where client_id = v_client and cle_regroupement = 'lorani:courriel:' || v_rec2
                         and titre like '%sans pièce jointe, à lire%'), '5. sans pièce jointe : alerte « à lire » sur le dossier');

  -- ── 6. Un courriel de la boîte Lorani sans numéro reconnu, puis un qui cite deux dossiers : à ranger ──
  perform tests.b5_ouvrier();
  r := public.deposer_reception(v_client, 'email', 'lorani@banc-varelo.test', 'b5-02-sans', 'urbanisme@mairie.test', 'Mairie',
         'Votre demande', 'Bonjour, voici la suite de votre dossier.', null, '[]'::jsonb, '{"module": "lorani"}'::jsonb, now());
  v_rec3 := (r ->> 'id')::bigint;
  r := public.deposer_reception(v_client, 'email', 'lorani@banc-varelo.test', 'b5-02-deux', 'urbanisme@mairie.test', 'Mairie',
         'PC 044109 26 A0199 et DP 044109 26 00777', 'Deux dossiers.', null,
         jsonb_build_array(jsonb_build_object('nom', 'courrier.pdf', 'mime', 'application/pdf', 'taille', 900,
                                              'chemin', format('%s/receptions/b5-02-deux/courrier.pdf', v_client))),
         '{"module": "lorani"}'::jsonb, now());
  v_rec4 := (r ->> 'id')::bigint;
  perform tests.b5_admin();
  r := private.lorani_lectures_passage();
  return next ok(exists (select 1 from public.alertes where client_id = v_client and cle_regroupement = 'lorani:courriel:' || v_rec3
                         and titre like 'Courriel du guichet à ranger%aucun numéro de dossier%'), '6. sans numéro : alerte « à ranger »');
  return next ok(exists (select 1 from public.alertes where client_id = v_client and cle_regroupement = 'lorani:courriel:' || v_rec4
                         and titre like '%plusieurs dossiers%'), '6. deux dossiers cités : alerte « à ranger », rien n''est deviné');
  return next ok(not exists (select 1 from public.pieces where client_id = v_client and chemin = format('%s/receptions/b5-02-deux/courrier.pdf', v_client)),
                 '6. … et sa pièce jointe n''est rangée nulle part');

  -- ── 7. Un courriel d'un autre module sans numéro Lorani : ignoré sans bruit ──
  perform tests.b5_ouvrier();
  r := public.deposer_reception(v_client, 'email', 'compta@banc-varelo.test', 'b5-02-autre', 'fournisseur@test', 'Fournisseur',
         'Facture 2026-118', 'Ci-joint notre facture.', null, '[]'::jsonb, '{}'::jsonb, now());
  perform tests.b5_admin();
  r := private.lorani_rattacher_reception((r ->> 'id')::bigint);
  return next ok(r ? 'ignore' and not exists (select 1 from public.alertes where client_id = v_client and cle_regroupement = 'lorani:courriel:' || (r ->> 'reception')),
                 '7. un courriel étranger à Lorani est ignoré, sans alerte : ' || r::text);
end $f$;

select * from runtests('tests'::name, '^test_b5_02_');
