-- Tests A4 — lot 72 (a4_80) : TFILED-18 et TFILED-19, des messages clairs au lieu d'une contrainte ou d'un transtypage
-- bruts. Données d'exemple.
-- pgTAP, schéma « tests » d'A5 ; utilise tests.a4_organisation, tests.a4_facture (a4_10_facture_electronique.sql),
-- tests.a4_compte (a4_11_ecritures_fec.sql) et tests.a4_comme (a4_26_sortie_envois.sql), à poser avant.
-- Ce fichier ne supprime rien.

create or replace function tests.test_a4_80_01_messages_clairs() returns setof text
language plpgsql as $f$
declare o jsonb := tests.a4_organisation(); g uuid := (o ->> 'gerant')::uuid; fa jsonb; v_c uuid;
begin
  -- TFILED-19 : une nature inconnue, dite en clair.
  reset role; perform tests.a4_comme(g);
  return next throws_like(format('select public.filed_poser_compte(%L, null, %L, %L, %L)', o ->> 'client', '606400', 'Fournitures', 'bidon'),
                          'Nature de compte inconnue (bidon) : charge, immobilisation, stock, tiers ou autre.',
                          'Nature inconnue : les valeurs admises, pas la contrainte');
  reset role;

  -- TFILED-18 : « compte » par son numéro.
  v_c := tests.a4_compte(o, '601000', 'Achats de matières premières');
  fa := tests.a4_facture(o, 'ia', 'IMP-001', 120);
  reset role; perform tests.a4_comme(g);
  return next lives_ok(format('select public.filed_imputer_facture(%L, %L::jsonb)', fa ->> 'facture', '[{"compte": "601000", "montant_ht": 100}]'),
                       '« compte » accepte le numéro du plan (601000)');
  reset role;
  return next is((select compte_id from public.filed_imputations where facture_id = (fa ->> 'facture')::uuid and statut = 'validee'), v_c,
                 'et l''imputation porte ce compte');
  reset role; perform tests.a4_comme(g);
  return next throws_like(format('select public.filed_imputer_facture(%L, %L::jsonb)', fa ->> 'facture', '[{"compte": "699999", "montant_ht": 100}]'),
                          'Ligne 1 : compte inconnu ou retiré (699999)%', 'Un numéro inconnu : dit en clair, avec ce qui a été donné');
  return next throws_like(format('select public.filed_imputer_facture(%L, %L::jsonb)', fa ->> 'facture', '[{"compte": "601000", "montant_ht": "cent"}]'),
                          'Ligne 1 : montant hors taxes illisible (cent)%', 'Un montant illisible : dit en clair');
  reset role;
end $f$;
