-- Tests A4 — lot 21 (a4_29) : un numéro de TVA étranger s'écrit sous sa forme compacte dans filed_fournisseurs.tva.
-- pgTAP, schéma « tests » d'A5 ; utilise tests.a4_organisation (a4_10_facture_electronique.sql).
-- `select * from runtests('tests', '^test_a4_')` ; runtests() annule tout. Données d'exemple seulement.

create or replace function tests.test_a4_29_01_forme_compacte() returns setof text
language plpgsql as $f$
declare o jsonb := tests.a4_organisation(); v_cl uuid := (o ->> 'client')::uuid; r public.filed_fournisseurs;
begin
  insert into public.filed_fournisseurs (client_id, code, nom, nom_normalise, pays, statut, source, tva)
  values (v_cl, 'TVA-CH', 'Suisse d''exemple', 'suisse d exemple', 'CH', 'actif', 'saisie', 'CHE-116.281.710 MWST') returning * into r;
  return next is(r.tva, 'CHE116281710', 'IDE suisse lu tel qu''imprimé : forme compacte, sans MWST');
  insert into public.filed_fournisseurs (client_id, code, nom, nom_normalise, pays, statut, source, tva)
  values (v_cl, 'TVA-NO', 'Norvège d''exemple', 'norvege d exemple', 'NO', 'actif', 'saisie', 'NO 923 609 016 MVA') returning * into r;
  return next is(r.tva, 'NO923609016', 'Norvège : sans MVA');
  insert into public.filed_fournisseurs (client_id, code, nom, nom_normalise, pays, statut, source, tva)
  values (v_cl, 'TVA-FR', 'France d''exemple', 'france d exemple', 'FR', 'actif', 'saisie', 'fr 40 303 265 045') returning * into r;
  return next is(r.tva, 'FR40303265045', 'Un numéro de l''Union : majuscules, sans espaces');
  insert into public.filed_fournisseurs (client_id, code, nom, nom_normalise, pays, statut, source, tva)
  values (v_cl, 'TVA-US', 'États-Unis d''exemple', 'etats unis d exemple', 'US', 'actif', 'saisie', 'US 12-3456789-0001-ABCDEF') returning * into r;
  return next is(r.tva, null, 'Une valeur qui ne tient pas dans la contrainte (20 caractères compactée) laisse tva vide…');
  return next is(r.id_etranger, 'US 12-3456789-0001-ABCDEF', '… et passe dans id_etranger, telle qu''écrite');
  update public.filed_fournisseurs set tva = 'gb 980 7806 84' where id = r.id returning * into r;
  return next is(r.tva, 'GB980780684', 'À la mise à jour aussi');
end $f$;
