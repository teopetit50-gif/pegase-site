-- Tests A4 — lot 77 (a4_85) : TFILED-05, une facture adressée à une autre société est arrêtée, que l'acheteur soit donné
-- par un SIREN avec espaces, par son numéro de TVA ou par son seul nom. Doublures : organisation d'exemple, SIREN fictifs.
-- pgTAP, schéma « tests » d'A5 ; utilise tests.a4_organisation et tests.a4_facture (a4_10_facture_electronique.sql), à
-- poser avant. Ce fichier ne supprime rien.

create or replace function tests.a4_facture_acheteur(p_org jsonb, p_numero text, p_acheteur jsonb) returns public.filed_controles
language plpgsql as $$
declare v_f uuid := (tests.a4_facture(p_org, 'ia', p_numero, 1200) ->> 'facture')::uuid; c public.filed_controles;
begin
  update public.filed_factures set acheteur_lu = p_acheteur where id = v_f;
  perform private.filed_controler_facture(v_f);
  select * into c from public.filed_controles where facture_id = v_f and code = 'destinataire.societe' order by (resultat = 'anomalie') desc limit 1;
  return c;
end $$;

create or replace function tests.test_a4_85_01_destinataire() returns setof text
language plpgsql as $f$
declare o jsonb := tests.a4_organisation(); c public.filed_controles; v_siren text := '912345642';
begin
  update public.entites set siren = v_siren where id = (o ->> 'entite')::uuid;
  -- Le SIREN de la société, lu avec des espaces : ok.
  c := tests.a4_facture_acheteur(o, 'DEST-001', '{"siren": "912 345 642"}');
  return next ok(c.resultat = 'ok', 'SIREN lu avec des espaces : c''est bien cette société');
  -- Une autre société, donnée par son SIREN avec espaces : bloquant.
  c := tests.a4_facture_acheteur(o, 'DEST-002', '{"siren": "912 345 618"}');
  return next ok(c.resultat = 'anomalie' and c.gravite = 'bloquant' and c.message like 'Facture adressée à une autre société (SIREN 912345618)%',
                 'Autre société, SIREN avec espaces : bloquant');
  -- Une autre société, donnée par son seul numéro de TVA : bloquant.
  c := tests.a4_facture_acheteur(o, 'DEST-003', '{"tva": "FR88912345618"}');
  return next ok(c.resultat = 'anomalie' and c.gravite = 'bloquant', 'Autre société, par son numéro de TVA : bloquant');
  -- Une autre société, donnée par son seul nom : bloquant.
  c := tests.a4_facture_acheteur(o, 'DEST-004', '{"nom": "Société Inconnue d''exemple SARL"}');
  return next ok(c.resultat = 'anomalie' and c.gravite = 'bloquant' and c.message like 'Facture adressée à « Société Inconnue d''exemple SARL »%',
                 'Autre société, par son seul nom : bloquant');
  -- Le nom de la société (ou contenu dans celui-ci) : pas d'arrêt.
  c := tests.a4_facture_acheteur(o, 'DEST-005', jsonb_build_object('nom', (select e.nom from public.entites e where e.id = (o ->> 'entite')::uuid)));
  return next ok(c.id is null or c.resultat = 'ok', 'Le nom de la société : pas d''arrêt');
end $f$;
