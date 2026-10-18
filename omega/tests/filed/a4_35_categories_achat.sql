-- Tests A4 — lot 39 (a4_47) : les catégories d'achat propres à l'organisation. Données fictives.
-- pgTAP, schéma « tests » d'A5 ; utilise tests.a4_organisation, tests.a4_facture (a4_10_facture_electronique.sql) et
-- tests.a4_comme (a4_26_sortie_envois.sql), à poser avant. Ce fichier ne supprime rien.

-- La proposition du lecteur pour une pièce (comme le lecteur l'écrit).
create or replace function tests.a4_lu_categorie(p_org jsonb, p_facture jsonb, p_texte text) returns void
language sql as $$
  insert into public.pieces_valeurs (client_id, piece_id, champ, valeur, texte, source, confiance, verifiee)
  values ((p_org ->> 'client')::uuid, (p_facture ->> 'piece')::uuid, 'categorie', to_jsonb(p_texte), p_texte, 'ia', 0.9, false)
$$;

create or replace function tests.test_a4_47_01_liste() returns setof text
language plpgsql as $f$
declare o jsonb := tests.a4_organisation(); v_cl uuid := (o ->> 'client')::uuid; n integer; n2 integer; v_id uuid;
begin
  reset role; perform tests.a4_comme((o ->> 'gerant')::uuid);
  n := public.filed_categories_par_defaut(v_cl);
  n2 := public.filed_categories_par_defaut(v_cl);
  v_id := public.filed_poser_categorie(v_cl, 'chantier', 'Matériaux de chantier', array['béton', 'ciment', ' '], null, 5);
  reset role;
  return next ok(n >= 15, 'Une liste de départ est posée : ' || n);
  return next is(n2, 0, 'La reposer ne change rien');
  return next is((select code || '|' || array_to_string(mots_cles, ',') || '|' || rang from public.filed_categories where id = v_id),
                 'CHANTIER|béton,ciment|5', 'Une catégorie propre : code en capitales, mots-clés nettoyés, rang');
  return next ok(private.filed_categories_lecteur(v_cl) -> 0 ->> 'code' = 'CHANTIER', 'Le lecteur reçoit la liste, dans l''ordre');

  reset role; perform tests.a4_comme((o ->> 'valideur')::uuid);
  return next throws_ok(format('select public.filed_poser_categorie(%L, %L, %L)', v_cl, 'X', 'X'), '42501', null,
                        'La liste est au gérant ou à l''admin');
  reset role;
end $f$;

create or replace function tests.test_a4_47_02_rangement() returns setof text
language plpgsql as $f$
declare o jsonb := tests.a4_organisation(); v_cl uuid := (o ->> 'client')::uuid; a jsonb; b jsonb; c jsonb; d jsonb; r record;
begin
  reset role; perform tests.a4_comme((o ->> 'gerant')::uuid);
  perform public.filed_categories_par_defaut(v_cl);
  perform public.filed_poser_categorie(v_cl, 'CHANTIER', 'Matériaux de chantier', array['béton', 'ciment'], null, 5);
  reset role;

  -- 1. Le lecteur propose un libellé de la liste.
  a := tests.a4_facture(o, 'ia', 'CAT-001', 120);
  perform tests.a4_lu_categorie(o, a, 'Logiciels et abonnements');
  perform private.filed_categoriser((a ->> 'facture')::uuid);
  return next is((select categorie || '/' || categorie_source from public.filed_factures where id = (a ->> 'facture')::uuid),
                 'LOGICIELS/lecture', 'Le libellé proposé par la lecture range la facture');

  -- 2. Un mot-clé dans un texte libre.
  b := tests.a4_facture(o, 'ia', 'CAT-002', 240);
  perform tests.a4_lu_categorie(o, b, 'Livraison de ciment pour le chantier');
  perform private.filed_categoriser((b ->> 'facture')::uuid);
  return next is((select categorie from public.filed_factures where id = (b ->> 'facture')::uuid), 'CHANTIER', 'Un mot-clé suffit');

  -- 3. Une personne range la première facture ailleurs : son choix tient.
  reset role; perform tests.a4_comme((o ->> 'valideur')::uuid);
  perform public.filed_categoriser_facture((a ->> 'facture')::uuid, 'chantier');
  reset role;
  perform private.filed_categoriser((a ->> 'facture')::uuid);
  return next is((select categorie || '/' || categorie_source from public.filed_factures where id = (a ->> 'facture')::uuid),
                 'CHANTIER/humain', 'Le choix d''une personne n''est pas repris par la machine');

  -- 4. Une proposition hors de la liste : la catégorie habituelle du fournisseur.
  c := tests.a4_facture(o, 'ia', 'CAT-003', 60);
  perform tests.a4_lu_categorie(o, c, 'Voyage sur Mars');
  perform private.filed_categoriser((c ->> 'facture')::uuid);
  return next is((select categorie || '/' || categorie_source from public.filed_factures where id = (c ->> 'facture')::uuid),
                 'CHANTIER/fournisseur', 'Hors de la liste : la catégorie habituelle du fournisseur, jamais une catégorie inventée');

  -- 5. Une catégorie hors de la liste est refusée à une personne aussi.
  reset role; perform tests.a4_comme((o ->> 'valideur')::uuid);
  return next throws_ok(format('select public.filed_categoriser_facture(%L, %L)', c ->> 'facture', 'MARS'), '22023', null,
                        'Une personne range aussi dans la liste seulement');
  reset role;

  -- 6. Après le contrôle, la facture est rangée d'elle-même.
  d := tests.a4_facture(o, 'ia', 'CAT-004', 36);
  perform tests.a4_lu_categorie(o, d, 'Abonnement logiciel mensuel');
  perform private.filed_controler_facture((d ->> 'facture')::uuid);
  return next is((select categorie from public.filed_factures where id = (d ->> 'facture')::uuid), 'LOGICIELS',
                 'Le contrôle range la facture');
  return next ok(exists (select 1 from public.filed_historique where client_id = v_cl and objet_id = d ->> 'facture' and etape = 'categorisee'),
                 'et l''historique le dit');

  -- 7. Le pilotage par catégorie.
  reset role; perform tests.a4_comme((o ->> 'gerant')::uuid);
  select * into r from public.filed_depenses_par_categorie(v_cl, date '2026-01-01', date '2026-12-31') where categorie = 'CHANTIER';
  reset role;
  return next is(r.nombre, 3::bigint, 'Les dépenses par catégorie comptent les factures rangées');
  return next is(r.montant_ttc, 420.00::numeric, 'et leurs montants');
end $f$;
