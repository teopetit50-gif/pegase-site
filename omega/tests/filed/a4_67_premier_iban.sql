-- Tests A4 — lot 71 (a4_79) : « premier IBAN » quand le fournisseur à confirmer, né d'une pièce sans IBAN, n'en a aucun
-- autre. Doublures : organisation, fournisseur et IBAN d'exemple (clés justes, fictifs).
-- pgTAP, schéma « tests » d'A5 ; utilise tests.a4_organisation, tests.a4_facture (a4_10_facture_electronique.sql) et
-- tests.a4_facture_fournisseur_lu (a4_61_confirmation_recontrole.sql), à poser avant. Ce fichier ne supprime rien.

create or replace function tests.test_a4_79_01_premier_iban() returns setof text
language plpgsql as $f$
declare o jsonb := tests.a4_organisation(); fa uuid; fb uuid; fc uuid; c public.filed_controles;
begin
  -- La pièce d'origine ne porte aucun IBAN ; la suivante, si : « premier IBAN ».
  fa := tests.a4_facture_fournisseur_lu(o, 'PIB-001', 1200, null);
  fb := tests.a4_facture_fournisseur_lu(o, 'PIB-002', 1300, 'FR7630006000011234567890189');
  select * into c from public.filed_controles where facture_id = fb and code = 'iban.nouveau';
  return next ok(c.resultat = 'anomalie' and c.gravite = 'bloquant' and c.message like 'Premier IBAN de ce fournisseur (%)%qui n''en portait pas%',
                 'Origine sans IBAN : « premier IBAN », toujours bloquant');
  -- Un troisième IBAN, alors que le fournisseur en a déjà un : « un autre IBAN », comme avant.
  fc := tests.a4_facture_fournisseur_lu(o, 'PIB-003', 1400, 'FR1420041010050500013M02606');
  return next ok((select message from public.filed_controles where facture_id = fc and code = 'iban.nouveau') like 'Un autre IBAN (%',
                 'Un IBAN de plus : « un autre IBAN »');
end $f$;
