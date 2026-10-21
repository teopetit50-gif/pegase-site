-- Tests A4 — lot 66 (a4_74) : TFILED-11, la clé d'un identifiant lu est toujours jugée. Doublures : organisation et
-- fournisseur d'exemple ; SIREN fictifs (912345629 à clé fausse, 912345618 à clé juste).
-- pgTAP, schéma « tests » d'A5 ; utilise tests.a4_organisation et tests.a4_facture (a4_10_facture_electronique.sql),
-- à poser avant. Ce fichier ne supprime rien.

-- Une facture d'un fournisseur français sans SIREN ni TVA connus, dont le lecteur a mis à part ce qu'il a lu.
create or replace function tests.a4_facture_identifiants_lus(p_org jsonb, p_numero text, p_lu jsonb) returns uuid
language plpgsql as $$
declare v_f uuid := (tests.a4_facture(p_org, 'ia', p_numero, 1200) ->> 'facture')::uuid; v_four uuid;
begin
  insert into public.filed_fournisseurs (client_id, code, nom, nom_normalise, pays, statut, source)
  values ((p_org ->> 'client')::uuid, 'Q' || upper(substr(md5(p_numero), 1, 8)), 'Quai des Matériaux d''exemple',
          'quai des materiaux d exemple ' || p_numero, 'FR', 'actif', 'saisie')
  returning id into v_four;
  update public.filed_factures set fournisseur_id = v_four, fournisseur_lu = p_lu where id = v_f;
  perform private.filed_controler_facture(v_f);
  return v_f;
end $$;

create or replace function tests.a4_controle(p_f uuid, p_code text) returns public.filed_controles
language sql as $$
  select * from public.filed_controles where facture_id = p_f and code = p_code order by (resultat = 'anomalie') desc, cree_le desc limit 1
$$;

create or replace function tests.test_a4_74_01_siren_cle_fausse() returns setof text
language plpgsql as $f$
declare o jsonb := tests.a4_organisation(); f1 uuid; c public.filed_controles;
begin
  -- F1 reconstituée : SIREN 912345629 (clé de Luhn fausse) et FR24912345629 lus, mis à part par le lecteur.
  f1 := tests.a4_facture_identifiants_lus(o, 'QDM-2026-1001',
          '{"nom": "Quai des Matériaux d''exemple", "non_verifie": {"siren": "912345629", "tva": "FR24912345629"}}');
  c := tests.a4_controle(f1, 'identite.siren');
  return next ok(c.resultat = 'anomalie' and c.gravite = 'bloquant' and c.message like 'SIREN lu (912345629) : clé de contrôle fausse%',
                 'F1 : la clé du SIREN lu est jugée, fausse, bloquante');
  c := tests.a4_controle(f1, 'identite.tva_intracom');
  return next ok(c.resultat = 'anomalie' and c.gravite = 'bloquant' and c.message like '%FR24912345629%SIREN 912345629%clé de contrôle est fausse%',
                 'F1 : le numéro de TVA bâti sur ce SIREN est impossible, bloquant');
  c := tests.a4_controle(f1, 'identite.registre');
  return next ok(c.resultat = 'anomalie' and c.gravite = 'bloquant' and c.message like 'Registre non interrogé : le SIREN lu (912345629)%',
                 'F1 : le registre ne tombe pas en silence');
  c := tests.a4_controle(f1, 'tva.numero');
  return next ok(c.id is null or (c.resultat = 'ok' and c.message not like '%absent%'),
                 'F1 : tva.numero ne dit pas « absent » quand un numéro de TVA a été lu');
  return next isnt((select statut from public.filed_factures where id = f1), 'a_valider', 'F1 ne passe plus « à valider »');
end $f$;

create or replace function tests.test_a4_74_02_cles_justes_et_tva() returns setof text
language plpgsql as $f$
declare o jsonb := tests.a4_organisation(); f uuid; c public.filed_controles;
begin
  -- SIREN juste à la clé, non vérifié : attention, et le registre le dit.
  f := tests.a4_facture_identifiants_lus(o, 'QDM-2026-1002', '{"non_verifie": {"siren": "912345618"}}');
  c := tests.a4_controle(f, 'identite.siren');
  return next ok(c.gravite = 'attention' and c.message like 'SIREN lu (912345618) mais non vérifié%', 'SIREN juste mais non vérifié : attention, comme avant');
  c := tests.a4_controle(f, 'identite.registre');
  return next ok(c.resultat = 'anomalie' and c.gravite = 'attention' and c.message like '%Sirene sera interrogé%', 'et le registre le dit');
  -- TVA française dont la clé ne correspond pas à son SIREN (juste) : bloquante, avec la clé attendue (88).
  f := tests.a4_facture_identifiants_lus(o, 'QDM-2026-1003', '{"non_verifie": {"tva": "FR25912345618"}}');
  c := tests.a4_controle(f, 'identite.tva_intracom');
  return next ok(c.resultat = 'anomalie' and c.gravite = 'bloquant' and c.message like '%clé 25 ne correspond pas au SIREN 912345618 (clé attendue 88)%',
                 'TVA FR à clé fausse : bloquante, clé attendue dite');
  return next is((tests.a4_controle(f, 'tva.numero')).resultat, 'ok', 'tva.numero : présent, jugé au contrôle d''identité');
  -- TVA française juste, non vérifiée : attention, comme avant.
  f := tests.a4_facture_identifiants_lus(o, 'QDM-2026-1004', '{"non_verifie": {"tva": "FR88912345618"}}');
  c := tests.a4_controle(f, 'identite.tva_intracom');
  return next ok(c.gravite = 'attention' and c.message like 'Numéro de TVA lu (FR88912345618) mais non vérifié%', 'TVA FR juste non vérifiée : attention');
end $f$;

create or replace function tests.test_a4_74_03_siret() returns setof text
language plpgsql as $f$
declare o jsonb := tests.a4_organisation(); f uuid; c public.filed_controles;
begin
  f := tests.a4_facture_identifiants_lus(o, 'QDM-2026-1005', '{"non_verifie": {"siret": "91234561800012"}}');
  c := tests.a4_controle(f, 'identite.siret');
  return next ok(c.resultat = 'anomalie' and c.gravite = 'bloquant' and c.message like 'SIRET lu (91234561800012) : clé de contrôle fausse%',
                 'SIRET à clé fausse : bloquant');
  return next ok((tests.a4_controle(f, 'identite.registre')).message like 'Registre non interrogé : le SIRET lu%', 'et le registre le dit');
  f := tests.a4_facture_identifiants_lus(o, 'QDM-2026-1006', '{"siren": "912345618", "non_verifie": {"siret": "91234561800017"}}');
  return next is((tests.a4_controle(f, 'identite.siret')).resultat, 'ok', 'SIRET juste, du SIREN du fournisseur : ok');
  f := tests.a4_facture_identifiants_lus(o, 'QDM-2026-1007', '{"siren": "123456782", "non_verifie": {"siret": "91234561800017"}}');
  c := tests.a4_controle(f, 'identite.siret');
  return next ok(c.resultat = 'anomalie' and c.message like '%n''est pas un établissement du SIREN 123456782%', 'SIRET d''un autre SIREN : bloquant');
  f := tests.a4_facture_identifiants_lus(o, 'QDM-2026-1008', '{"non_verifie": {"siret": "35600000000048"}}');
  return next is((tests.a4_controle(f, 'identite.siret')).resultat, 'ok', 'SIRET de La Poste : clé non jugée');
end $f$;
