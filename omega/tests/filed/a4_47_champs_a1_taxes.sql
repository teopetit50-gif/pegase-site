-- Tests A4 — lot 51 (a4_59) : les noms de champs d'A1 pour l'octroi de mer et l'exonération. Données fictives.
-- pgTAP, schéma « tests » d'A5 ; utilise tests.a4_organisation (a4_10_facture_electronique.sql) et
-- tests.a4_facture_dom (a4_46_octroi_de_mer.sql), à poser avant. Ce fichier ne supprime rien.

create or replace function tests.test_a4_59_01_champs_a1() returns setof text
language plpgsql as $f$
declare o jsonb := tests.a4_organisation(); a jsonb; c jsonb; f public.filed_factures;
begin
  -- Le cas NOBAT, avec les noms d'A1.
  a := tests.a4_facture_dom(o, 'NOBAT-A1-001', 715.40, 0.26, 747.71, jsonb_build_object(
         'taxes.hors_tva', jsonb_build_array(jsonb_build_object('nature', 'OMR', 'libelle', 'Octroi de mer', 'base', 715.40, 'taux', 4.48, 'montant', 32.05)),
         'mention.exoneration_tva', 'Exonération de TVA — art. 295 CGI'));
  select * into f from public.filed_factures where id = (a ->> 'facture')::uuid;
  return next ok(f.autres_taxes_montant = 32.05 and f.autres_taxes -> 0 ->> 'code' = 'OMR', '« taxes.hors_tva » est lu, sa nature tient lieu de code');
  return next is((select resultat from public.filed_controles where facture_id = f.id and code = 'montant.coherence'), 'ok',
                 '715,40 + 0,26 + 32,05 = 747,71 : plus d''écart');
  return next ok(coalesce((f.mentions ->> 'exoneration')::boolean, false), '« mention.exoneration_tva » est relevée');
  -- Une facture sans TVA avec la mention d'A1 : exonérée.
  c := tests.a4_facture_dom(o, 'NOBAT-A1-002', 300, 0, 300, jsonb_build_object('mention.exoneration_tva', true));
  return next ok((select regime_tva = 'exonere' from public.filed_factures where id = (c ->> 'facture')::uuid), 'Sans TVA, mention d''A1 : exonérée');
end $f$;
