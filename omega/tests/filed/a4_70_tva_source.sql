-- Tests A4 — lot 74 (a4_82) : TFILED-24, identite.tva_intracom dit sa source ; tva.numero signale la mention absente
-- même quand la fiche porte un numéro. Doublures : organisation et fournisseur d'exemple, numéros fictifs à clé juste
-- (FR15912345626, FR39912345634, FR88912345618).
-- pgTAP, schéma « tests » d'A5 ; utilise tests.a4_organisation, tests.a4_facture (a4_10_facture_electronique.sql) et
-- tests.a4_facture_identifiants_lus (a4_62_cles_identifiants.sql), à poser avant. Ce fichier ne supprime rien.

-- Une facture d'un fournisseur dont la fiche porte p_tva, et ce que le lecteur a lu.
create or replace function tests.a4_facture_fiche_tva(p_org jsonb, p_numero text, p_tva text, p_lu jsonb) returns uuid
language plpgsql as $$
declare v_f uuid := tests.a4_facture_identifiants_lus(p_org, p_numero, '{}');
begin
  update public.filed_fournisseurs set tva = p_tva where id = (select fournisseur_id from public.filed_factures where id = v_f);
  update public.filed_factures set fournisseur_lu = p_lu where id = v_f;
  perform private.filed_controler_facture(v_f);
  return v_f;
end $$;

create or replace function tests.test_a4_82_01_tva_source() returns setof text
language plpgsql as $f$
declare o jsonb := tests.a4_organisation(); f uuid; c public.filed_controles;
begin
  -- F13 : la pièce n'imprime aucun numéro ; la fiche en porte un.
  f := tests.a4_facture_fiche_tva(o, 'TVA-001', 'FR15912345626', '{}');
  select * into c from public.filed_controles where facture_id = f and code = 'identite.tva_intracom';
  return next ok(c.resultat = 'ok' and c.message like '%Celui de la fiche du fournisseur : la pièce n''en imprime pas%',
                 'identite.tva_intracom nomme la source : la fiche');
  select * into c from public.filed_controles where facture_id = f and code = 'tva.numero';
  return next ok(c.resultat = 'anomalie' and c.gravite = 'attention'
                 and c.message like 'Mention obligatoire absente : numéro de TVA intracommunautaire du vendeur non imprimé sur la facture%FR15912345626%',
                 'et la mention absente est signalée, même avec la fiche');
  -- La pièce en porte un autre, lu sans être vérifié : bloquant.
  f := tests.a4_facture_fiche_tva(o, 'TVA-002', 'FR39912345634', '{"non_verifie": {"tva": "FR88912345618"}}');
  select * into c from public.filed_controles where facture_id = f and code = 'identite.tva_intracom';
  return next ok(c.resultat = 'anomalie' and c.gravite = 'bloquant' and c.message like '%la pièce en porte un autre (FR88912345618)%',
                 'Un autre numéro sur la pièce : bloquant');
end $f$;
