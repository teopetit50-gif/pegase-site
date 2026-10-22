-- Tests A4 — lot 70 (a4_78) : TFILED-16, identite.registre se lève par le gérant seul ; levée, la facture passe
-- « à valider » avec sa demande. Doublures : organisation et fournisseur d'exemple, SIREN fictif à clé juste (912345618)
-- que Sirene « ne connaît pas » (verdict d'exemple).
-- pgTAP, schéma « tests » d'A5 ; utilise tests.a4_organisation, tests.a4_facture (a4_10_facture_electronique.sql),
-- tests.a4_comme (a4_26_sortie_envois.sql) et tests.a4_facture_identifiants_lus (a4_62_cles_identifiants.sql), à poser
-- avant. Sur la recette, la levée passe par la vraie porte public.filed_lever_anomalie ; dans la souche, qui ne l'a pas,
-- par filed_levees et un recontrôle. Ce fichier ne supprime rien.

create or replace function tests.test_a4_78_01_registre_levable() returns setof text
language plpgsql as $f$
declare o jsonb := tests.a4_organisation(); g uuid := (o ->> 'gerant')::uuid; f uuid; c public.filed_controles;
begin
  return next ok(private.filed_levable('identite.registre') and private.filed_levable('doublon.numero')
                 and private.filed_levable('tva.taux') and not private.filed_levable('fournisseur.a_confirmer')
                 and not private.filed_levable('identite.siren') and not private.filed_levable('lecture.complete'),
                 'Levables : identite.registre, doublon.numero, et la liste du socle ; pas les autres');

  -- Le registre ne connaît pas le SIREN : identite.registre bloque, seul.
  insert into public.filed_verifications_tiers (client_id, fournisseur_id, registre, identifiant, demande_le, repondu_le, resultat)
  values ((o ->> 'client')::uuid, null, 'sirene', '912345618', now(), now(), 'invalide');
  f := tests.a4_facture_identifiants_lus(o, 'REG-001', '{"nom": "Quai des Matériaux d''exemple", "siren": "912345618"}');
  select * into c from public.filed_controles where facture_id = f and code = 'identite.registre';
  return next ok(c.resultat = 'anomalie' and c.gravite = 'bloquant' and (select statut from public.filed_factures where id = f) = 'bloquee',
                 'Avant : bloquée par identite.registre');

  -- Le gérant, seul, lève avec son motif.
  if to_regprocedure('public.filed_lever_anomalie(uuid, text, text)') is not null then
    reset role; perform tests.a4_comme(g);
    perform public.filed_lever_anomalie(f, 'identite.registre', 'Kbis reçu du fournisseur (exemple).');
    reset role;
  else
    insert into public.filed_levees (client_id, facture_id, document_id, code, cle, motif, leve_par)
    select client_id, id, document_id, c.code, c.cle, 'Kbis reçu du fournisseur (exemple).', g from public.filed_factures where id = f;
    perform private.filed_controler_facture(f);
  end if;
  return next is((select resultat from public.filed_controles where facture_id = f and code = 'identite.registre'), 'levee', 'identite.registre : levé');
  return next is((select statut from public.filed_factures where id = f), 'a_valider', 'la facture passe « à valider »');
  return next ok(exists (select 1 from public.filed_validations where facture_id = f and issue is null), 'avec sa demande de validation');
end $f$;
