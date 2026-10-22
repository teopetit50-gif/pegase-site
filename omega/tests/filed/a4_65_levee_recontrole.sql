-- Tests A4 — lot 69 (a4_77) : une levée posée recontrôle la facture ; levée, elle passe « à valider » et sa demande
-- est déposée. Doublures : organisation et fournisseur d'exemple, SIREN fictif à clé fausse (912345629).
-- pgTAP, schéma « tests » d'A5 ; utilise tests.a4_organisation, tests.a4_facture (a4_10_facture_electronique.sql) et
-- tests.a4_facture_identifiants_lus (a4_62_cles_identifiants.sql), à poser avant. Ce fichier ne supprime rien.

create or replace function tests.test_a4_77_01_levee_recontrole() returns setof text
language plpgsql as $f$
declare o jsonb := tests.a4_organisation(); f uuid; r record;
begin
  -- Bloquée par le seul identite.siren (clé fausse) : on lit le SIREN sans la TVA, le registre le dit aussi.
  f := tests.a4_facture_identifiants_lus(o, 'LEV-001', '{"nom": "Quai des Matériaux d''exemple", "non_verifie": {"siren": "912345629"}}');
  return next is((select statut from public.filed_factures where id = f), 'bloquee', 'Avant : bloquée');
  -- Une personne lève les deux bloquants (comme la porte filed_lever_anomalie, qui écrit dans filed_levees).
  for r in select c.code, c.cle from public.filed_controles c where c.facture_id = f and c.resultat = 'anomalie' and c.gravite = 'bloquant' loop
    insert into public.filed_levees (client_id, facture_id, document_id, code, cle, motif, leve_par)
    select client_id, id, document_id, r.code, r.cle, 'Pièce vérifiée auprès du fournisseur (exemple).', (o ->> 'gerant')::uuid
      from public.filed_factures where id = f;
  end loop;
  return next is((select statut from public.filed_factures where id = f), 'a_valider', 'Levée : la facture est recontrôlée et passe « à valider »');
  return next ok(exists (select 1 from public.filed_controles where facture_id = f and code = 'identite.siren' and resultat = 'levee'),
                 'le contrôle levé le dit');
  return next ok(exists (select 1 from public.filed_validations where facture_id = f and issue is null), 'et la demande de validation est déposée');
end $f$;
