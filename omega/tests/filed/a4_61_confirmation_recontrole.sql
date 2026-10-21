-- Tests A4 — lot 65 (a4_73) : TFILED-08, confirmer un fournisseur recontrôle ses factures non closes, par tous les
-- chemins ; un second IBAN d'un fournisseur à confirmer se signale tout de suite. Doublures : organisation, fournisseur
-- et IBAN d'exemple (clés justes, fictifs).
-- pgTAP, schéma « tests » d'A5 ; utilise tests.a4_organisation et tests.a4_facture (a4_10_facture_electronique.sql),
-- à poser avant. Ce fichier ne supprime rien.

-- Une facture dont le fournisseur se résout par la porte du socle (filed_resoudre_fournisseur), avec son IBAN.
create or replace function tests.a4_facture_fournisseur_lu(p_org jsonb, p_numero text, p_ttc numeric, p_iban text) returns uuid
language plpgsql as $$
declare v_f uuid := (tests.a4_facture(p_org, 'ia', p_numero, p_ttc) ->> 'facture')::uuid;
begin
  update public.filed_factures
     set fournisseur_id = null, fournisseur_force = null, fournisseur_identification = null, statut = 'a_completer', iban = p_iban,
         fournisseur_lu = '{"nom": "Béton Archipel d''exemple", "siren": "412345670"}'
   where id = v_f;
  perform private.filed_resoudre_fournisseur(v_f);
  perform private.filed_controler_facture(v_f);
  return v_f;
end $$;

create or replace function tests.test_a4_73_01_confirmation_recontrole() returns setof text
language plpgsql as $f$
declare o jsonb := tests.a4_organisation(); fa uuid; fb uuid; v_four uuid; c public.filed_controles;
begin
  -- F2a : le fournisseur naît de la pièce, avec l'IBAN 1.
  fa := tests.a4_facture_fournisseur_lu(o, 'F2A-001', 1200, 'FR7630006000011234567890189');
  select fournisseur_id into v_four from public.filed_factures where id = fa;
  return next ok((select statut from public.filed_fournisseurs where id = v_four) = 'a_confirmer'
                 and (select resultat from public.filed_controles where facture_id = fa and code = 'iban.nouveau') = 'ok',
                 'F2a : fournisseur à confirmer ; son IBAN, celui de la pièce d''origine, se valide avec lui');
  -- F2b : le même fournisseur, un autre IBAN : signalé tout de suite.
  fb := tests.a4_facture_fournisseur_lu(o, 'F2B-001', 1300, 'FR1420041010050500013M02606');
  select * into c from public.filed_controles where facture_id = fb and code = 'iban.nouveau';
  return next ok(c.resultat = 'anomalie' and c.gravite = 'bloquant' and c.message like 'Un autre IBAN%encore à confirmer%',
                 'F2b, avant la confirmation : le second IBAN est signalé (plus « il se valide avec lui »)');
  -- Confirmé par un autre chemin que les deux portes (ici, la fiche corrigée) : F2b est recontrôlée.
  update public.filed_fournisseurs set statut = 'actif', confirme_le = now() where id = v_four;
  return next is((select resultat from public.filed_controles where facture_id = fb and code = 'fournisseur.a_confirmer'), 'ok',
                 'Confirmé : F2b est recontrôlée, fournisseur.a_confirmer passe à ok');
  select * into c from public.filed_controles where facture_id = fb and code = 'iban.nouveau';
  return next ok(c.resultat = 'anomalie' and c.message like 'Nouvel IBAN (%) pour ce fournisseur%',
                 'et iban.nouveau dit le nouvel IBAN d''un fournisseur actif');
end $f$;
