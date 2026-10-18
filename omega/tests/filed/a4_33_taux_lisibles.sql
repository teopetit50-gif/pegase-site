-- Tests A4 — lot 37 (a4_45) : les taux des messages de tva.taux s'écrivent sans zéros inutiles, avec la virgule.
-- pgTAP, schéma « tests » d'A5 ; utilise tests.a4_organisation, tests.a4_facture (a4_10_facture_electronique.sql) et
-- tests.a4_facture_etrangere (a4_19_registres_hors_union.sql), à poser avant. Données fictives ; ne supprime rien.
-- Les taux sont posés avec trois décimales (19.000, 7.500), comme sur la recette, quel que soit le type local.

create or replace function tests.test_a4_45_01_taux_lisibles() returns setof text
language plpgsql as $f$
declare o jsonb := tests.a4_organisation(); de jsonb; v_f uuid; m text; c text;
begin
  de := tests.a4_facture_etrangere(o, 'DE-45-001', 'DE', 'DE136695976');
  v_f := (de ->> 'facture')::uuid;
  update public.filed_factures set regime_tva = null, montant_ht = 200, montant_tva = 53, montant_ttc = 253 where id = v_f;
  insert into public.filed_factures_tva (client_id, facture_id, document_id, categorie, taux, base, montant, source)
  values ((o ->> 'client')::uuid, v_f, (de ->> 'document')::uuid, 'S', 19.000, 100, 19, 'xml'),
         ((o ->> 'client')::uuid, v_f, (de ->> 'document')::uuid, 'S', 34.000, 100, 34, 'xml');
  update public.filed_factures_tva set taux = 7.500 where facture_id = v_f and taux = 34;
  update public.filed_factures set montant_tva = 26.5, montant_ttc = 226.5 where id = v_f;
  perform private.filed_controler_facture(v_f);
  select message, cle into m, c from public.filed_controles where facture_id = v_f and code = 'tva.taux';
  return next ok(m like 'TVA étrangère facturée (7,5 %, 19 %) par un fournisseur établi hors de France%', 'Taux lisibles, dans l''ordre : ' || coalesce(m, '(aucun)'));
  return next ok(m not like '%.000%' and m not like '%7.5%', 'Ni zéros inutiles ni point décimal');
  return next ok(c like '%19%' and c like '%7%5%', 'La clé du contrôle garde les taux : ' || coalesce(c, '(aucune)'));
end $f$;
