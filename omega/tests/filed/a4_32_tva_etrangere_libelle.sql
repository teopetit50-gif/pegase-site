-- Tests A4 — lot 36 (a4_44) : le message de tva.taux pour un fournisseur établi hors de France. Données fictives.
-- pgTAP, schéma « tests » d'A5 ; utilise tests.a4_organisation, tests.a4_facture (a4_10_facture_electronique.sql) et
-- tests.a4_facture_etrangere (a4_19_registres_hors_union.sql), à poser avant. Ce fichier ne supprime rien.

create or replace function tests.test_a4_44_01_tva_etrangere() returns setof text
language plpgsql as $f$
declare o jsonb := tests.a4_organisation(); de jsonb; fr jsonb;
begin
  -- Un fournisseur allemand (numéro fictif à clé juste) qui facture 19 % de TVA allemande.
  de := tests.a4_facture_etrangere(o, 'DE-44-001', 'DE', 'DE136695976');
  update public.filed_factures set regime_tva = null, montant_ht = 100, montant_tva = 19, montant_ttc = 119 where id = (de ->> 'facture')::uuid;
  insert into public.filed_factures_tva (client_id, facture_id, document_id, categorie, taux, base, montant, source)
  values ((o ->> 'client')::uuid, (de ->> 'facture')::uuid, (de ->> 'document')::uuid, 'S', 19, 100, 19, 'xml');
  perform private.filed_controler_facture((de ->> 'facture')::uuid);
  return next ok(exists (select 1 from public.filed_controles where facture_id = (de ->> 'facture')::uuid and code = 'tva.taux'
                           and resultat = 'anomalie' and gravite = 'bloquant'
                           and message like 'TVA étrangère facturée (19 %) par un fournisseur établi hors de France%'),
                 'Fournisseur allemand à 19 % : « TVA étrangère », toujours bloquant');

  -- Le même taux chez un fournisseur français : le message d'avant.
  fr := tests.a4_facture(o, 'ia', 'FR-44-001', 119);
  update public.filed_factures set montant_ht = 100, montant_tva = 19, montant_ttc = 119 where id = (fr ->> 'facture')::uuid;
  insert into public.filed_factures_tva (client_id, facture_id, document_id, categorie, taux, base, montant, source)
  values ((o ->> 'client')::uuid, (fr ->> 'facture')::uuid, (fr ->> 'document')::uuid, 'S', 19, 100, 19, 'xml');
  perform private.filed_controler_facture((fr ->> 'facture')::uuid);
  return next ok(exists (select 1 from public.filed_controles where facture_id = (fr ->> 'facture')::uuid and code = 'tva.taux'
                           and resultat = 'anomalie' and message like 'Taux de TVA qui n''existe pas en France : 19 %%'),
                 'Fournisseur français à 19 % : « n''existe pas en France »');
end $f$;
