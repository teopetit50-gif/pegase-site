-- Tests A4 — lot 15 (a4_23) : la facture arrivée avant son bon de livraison, ou avant sa commande, est recontrôlée
-- quand la pièce manquante arrive. pgTAP, schéma « tests » d'A5 ; utilise tests.a4_organisation et tests.a4_facture
-- (a4_10_facture_electronique.sql, à poser avant). `select * from runtests('tests', '^test_a4_')` ; runtests() annule tout.

-- Une commande d'une ligne (10 × 10,00 €) du fournisseur de l'organisation d'exemple. Rend {commande, ligne}.
create or replace function tests.a4_commande(p_org jsonb, p_numero text, p_avec_ligne boolean default true)
returns jsonb language plpgsql as $$
declare v_cmd uuid; v_l uuid;
begin
  insert into public.filed_commandes (client_id, entite_id, fournisseur_id, numero, numero_normalise, source)
  values ((p_org ->> 'client')::uuid, (p_org ->> 'entite')::uuid, (p_org ->> 'fournisseur')::uuid, p_numero,
          upper(regexp_replace(p_numero, '[^A-Za-z0-9]', '', 'g')), 'saisie')
  returning id into v_cmd;
  if p_avec_ligne then
    insert into public.filed_commandes_lignes (client_id, commande_id, rang, designation, quantite, prix_unitaire, montant_ht, source)
    values ((p_org ->> 'client')::uuid, v_cmd, 1, 'Licence', 10, 10.00, 100.00, 'saisie') returning id into v_l;
  end if;
  return jsonb_build_object('commande', v_cmd, 'ligne', v_l);
end $$;

-- Une facture de 120 € TTC (10 × 10,00 € HT) qui cite la commande, encore à compléter. Rend {piece, document, facture}.
create or replace function tests.a4_facture_commande(p_org jsonb, p_numero text, p_commande text)
returns jsonb language plpgsql as $$
declare fa jsonb := tests.a4_facture(p_org, 'humain', p_numero, 120);
begin
  update public.filed_factures set statut = 'a_completer', refs = jsonb_build_object('commande', p_commande) where id = (fa ->> 'facture')::uuid;
  insert into public.filed_factures_lignes (client_id, facture_id, document_id, rang, designation, quantite, prix_unitaire, montant_ht, source)
  values ((p_org ->> 'client')::uuid, (fa ->> 'facture')::uuid, (fa ->> 'document')::uuid, 1, 'Licence', 10, 10.00, 100.00, 'humain');
  return fa;
end $$;

create or replace function tests.test_a4_23_01_reception_apres_facture() returns setof text
language plpgsql as $f$
declare o jsonb := tests.a4_organisation(); v_cl uuid := (o ->> 'client')::uuid; c jsonb; fa jsonb; v_f uuid; v_rec uuid;
begin
  update public.filed_reglages set reception_exigee = true where client_id = v_cl and entite_id is null;
  c := tests.a4_commande(o, 'CMD-301');
  fa := tests.a4_facture_commande(o, 'F-301', 'CMD-301');
  v_f := (fa ->> 'facture')::uuid;
  return next is(private.filed_controler_facture(v_f), 'bloquee', 'Réception exigée, rien de reçu : la facture est bloquée');
  return next ok(exists (select 1 from public.filed_controles where facture_id = v_f and code = 'rapprochement.reception' and gravite = 'bloquant'),
                 'par le rapprochement avec la réception');
  return next is((select commande_id from public.filed_factures where id = v_f), (c ->> 'commande')::uuid, 'La commande citée est rattachée');

  insert into public.filed_receptions (client_id, commande_id) values (v_cl, (c ->> 'commande')::uuid) returning id into v_rec;
  insert into public.filed_receptions_lignes (reception_id, commande_ligne_id, quantite) values (v_rec, (c ->> 'ligne')::uuid, 4);
  return next is((select statut from public.filed_factures where id = v_f), 'bloquee', 'Livraison partielle (4 sur 10) : toujours bloquée');
  insert into public.filed_receptions_lignes (reception_id, commande_ligne_id, quantite) values (v_rec, (c ->> 'ligne')::uuid, 6);
  return next is((select statut from public.filed_factures where id = v_f), 'a_valider', 'Le reste livré : la facture passe à valider, sans geste');
  return next ok(not exists (select 1 from public.filed_controles where facture_id = v_f and code = 'rapprochement.reception' and resultat <> 'ok'),
                 'le non-reçu a disparu');
  return next ok(exists (select 1 from public.filed_historique where document_id = (fa ->> 'document')::uuid and etape = 'recontrolee'
                          and message like '%reçue%'), 'Historique : recontrôlée à la réception');

  begin
    update public.filed_receptions set statut = 'annulee' where id = v_rec;
  exception when check_violation then
    return next skip('Le socle ne connaît pas le statut « annulee » des réceptions');
    return;
  end;
  return next is((select statut from public.filed_factures where id = v_f), 'bloquee', 'Réception annulée : la facture encore à valider se rebloque');
end $f$;

create or replace function tests.test_a4_23_02_commande_apres_facture() returns setof text
language plpgsql as $f$
declare o jsonb := tests.a4_organisation(); v_cl uuid := (o ->> 'client')::uuid; c jsonb; fa jsonb; v_f uuid; v_rec uuid;
begin
  update public.filed_reglages set reception_exigee = true where client_id = v_cl and entite_id is null;
  fa := tests.a4_facture_commande(o, 'F-302', 'CMD 302');
  v_f := (fa ->> 'facture')::uuid;
  perform private.filed_controler_facture(v_f);
  return next is((select commande_id from public.filed_factures where id = v_f), null::uuid, 'Commande inconnue : pas de rattachement');

  c := tests.a4_commande(o, 'CMD 302', false);
  return next is((select commande_id from public.filed_factures where id = v_f), (c ->> 'commande')::uuid,
                 'La commande arrive : la facture qui la cite y est rattachée, sans geste');
  insert into public.filed_commandes_lignes (client_id, commande_id, rang, designation, quantite, prix_unitaire, montant_ht, source)
  values (v_cl, (c ->> 'commande')::uuid, 1, 'Licence', 10, 10.00, 100.00, 'saisie');
  return next ok(exists (select 1 from public.filed_controles where facture_id = v_f and code = 'rapprochement.reception' and gravite = 'bloquant'),
                 'Ses lignes arrivent : rapprochées, le non-reçu apparaît');
  return next is((select statut from public.filed_factures where id = v_f), 'bloquee', 'la facture attend la livraison');
  insert into public.filed_receptions (client_id, commande_id) values (v_cl, (c ->> 'commande')::uuid) returning id into v_rec;
  insert into public.filed_receptions_lignes (reception_id, commande_ligne_id, quantite)
  select v_rec, id, 10 from public.filed_commandes_lignes where commande_id = (c ->> 'commande')::uuid;
  return next is((select statut from public.filed_factures where id = v_f), 'a_valider', 'Livrée : à valider');
end $f$;

create or replace function tests.test_a4_23_03_perimetre() returns setof text
language plpgsql as $f$
declare o jsonb := tests.a4_organisation(); v_cl uuid := (o ->> 'client')::uuid; c jsonb; fa jsonb; v_f uuid; v_rec uuid;
begin
  update public.filed_reglages set reception_exigee = true where client_id = v_cl and entite_id is null;
  c := tests.a4_commande(o, 'CMD-303');
  fa := tests.a4_facture_commande(o, 'F-303', 'CMD-303');
  v_f := (fa ->> 'facture')::uuid;
  perform private.filed_controler_facture(v_f);
  update public.filed_factures set statut = 'ecartee' where id = v_f;
  insert into public.filed_receptions (client_id, commande_id) values (v_cl, (c ->> 'commande')::uuid) returning id into v_rec;
  insert into public.filed_receptions_lignes (reception_id, commande_ligne_id, quantite) values (v_rec, (c ->> 'ligne')::uuid, 10);
  return next is((select statut from public.filed_factures where id = v_f), 'ecartee', 'Une facture écartée n''est pas recontrôlée');
  return next is(private.filed_recontroler_factures(null, 'essai'), 0, 'Rien à recontrôler : zéro');
  return next ok(not has_function_privilege('authenticated', 'private.filed_recontroler_factures(uuid[], text)', 'execute'),
                 'Le recontrôle n''est pas ouvert aux utilisateurs');
  return next ok(not has_function_privilege('authenticated', 'private.filed_reception_arrivee()', 'execute')
                 and not has_function_privilege('authenticated', 'private.filed_commande_lignes_arrivees()', 'execute'),
                 'ni les fonctions de déclencheur');
end $f$;
