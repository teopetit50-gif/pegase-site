-- Tests A4 — lot 62 (a4_70) : un devis sans SIREN rattaché à son fournisseur par un nom approché, toujours proposé à une
-- personne. Doublures : organisation, fournisseurs, devis et factures d'exemple (noms et SIREN fictifs).
-- pgTAP, schéma « tests » d'A5 ; utilise tests.a4_organisation, tests.a4_facture (a4_10_facture_electronique.sql) et
-- tests.a4_facture_lignes (a4_54_rapprochement_devis.sql), à poser avant. Ce fichier ne supprime rien.

-- Un devis lu, sans SIREN, au nom tel qu'écrit sur la pièce. Rend l'id du document.
create or replace function tests.a4_devis_nom(p_org jsonb, p_numero text, p_nom text, p_ttc numeric) returns uuid
language plpgsql as $$
declare v_cl uuid := (p_org ->> 'client')::uuid; v_piece uuid; v_doc uuid; v_n int := (floor(random() * 900000) + 100000)::int;
begin
  insert into public.pieces (id, client_id, module, source, nom_fichier, mime, octets, sha256, chemin, objet_type, objet_id, statut, type_piece)
  values (gen_random_uuid(), v_cl, 'filed', 'depot', p_numero || '.pdf', 'application/pdf', 2048, md5('dn' || v_n) || md5(v_n || 'dn'),
          v_cl::text || '/filed_document/test/' || p_numero || '.pdf', 'filed_document', p_numero, 'lue', 'devis')
  returning id into v_piece;
  insert into public.pieces_valeurs (client_id, piece_id, champ, valeur, texte, source, confiance, verifiee)
  select v_cl, v_piece, c.champ, c.valeur, c.valeur #>> '{}', 'ia', 1, true
  from (values ('numero', to_jsonb(p_numero)), ('date', to_jsonb('2026-09-10'::text)), ('montant_ttc', to_jsonb(p_ttc)),
               ('fournisseur.nom', to_jsonb(p_nom)), ('lignes', '[{"designation": "Disques à tronçonner", "montant": 60}]'::jsonb)) c(champ, valeur);
  insert into public.filed_documents (client_id, entite_id, annee_reception, numero_reception, piece_id, source, nom_fichier, sha256, recu_le, etat)
  values (v_cl, (p_org ->> 'entite')::uuid, 2026, v_n, v_piece, 'depot', p_numero || '.pdf', md5('dn' || v_n) || md5(v_n || 'dn'), now(), 'a_traiter')
  returning id into v_doc;
  update public.filed_documents set etat = 'classe', nature = 'devis', nature_source = 'lecteur' where id = v_doc;
  return v_doc;
end $$;

create or replace function tests.test_a4_70_01_devis_nom_approche() returns setof text
language plpgsql as $f$
declare
  o jsonb := tests.a4_organisation(); v_cl uuid := (o ->> 'client')::uuid; v_top uuid; v_dup1 uuid; v_dup2 uuid;
  d1 uuid; d2 uuid; f1 uuid; f2 uuid; x public.filed_devis; c public.filed_controles;
begin
  return next is(private.filed_cle_nom('TOPPRO MOTEUR'), private.filed_cle_nom('TOP PRO MOTEURS'),
                 'Clé de nom : TOPPRO MOTEUR = TOP PRO MOTEURS (espaces et pluriel ignorés)');
  return next is(private.filed_cle_nom('Dupont Matériaux SARL'), private.filed_cle_nom('DUPONT MATERIAU'), 'et la forme sociale ignorée');

  insert into public.filed_fournisseurs (client_id, code, nom, nom_normalise, pays, statut, source, siren)
  values (v_cl, 'TOPPRO', 'TOP PRO MOTEURS d''exemple', 'top pro moteurs d exemple', 'FR', 'actif', 'saisie', '476543210') returning id into v_top;

  -- Un devis sans SIREN, au nom écrit autrement : rattaché par son nom approché, et la proposition le dit.
  d1 := tests.a4_devis_nom(o, 'DV-TP-1', 'TOPPRO MOTEUR d''exemple', 151.10);
  f1 := tests.a4_facture_lignes(o, 'FAC-TP-1', 148.75, array['Chaussures de sécurité (5 paires)']);
  update public.filed_factures set fournisseur_id = v_top where id = f1;
  perform private.filed_controler_facture(f1);
  select * into x from public.filed_devis where document_id = d1;
  return next ok(x.fournisseur_id = v_top and x.fournisseur_par = 'nom_approche', 'Le devis est rattaché au fournisseur par son nom approché');
  select * into c from public.filed_controles where facture_id = f1 and code = 'rapprochement.devis';
  return next ok(c.resultat = 'anomalie' and c.gravite = 'attention' and c.message like '%devis rattaché par son nom (« TOPPRO MOTEUR d''exemple »), à vérifier%'
                 and c.message like '%À confirmer ou écarter par une personne%',
                 'La facture reçoit la proposition, qui dit le rattachement par le nom ; une personne tranche');
  return next ok(not exists (select 1 from public.filed_devis_rapprochements where facture_id = f1 and statut = 'confirme'), 'Rien n''est rapproché seul');

  -- Deux fournisseurs au même nom approché : le devis n'est rattaché à aucun, mais il est proposé à la facture de chacun.
  insert into public.filed_fournisseurs (client_id, code, nom, nom_normalise, pays, statut, source)
  values (v_cl, 'DUP1', 'Dupont Matériaux', 'dupont materiaux', 'FR', 'actif', 'saisie') returning id into v_dup1;
  insert into public.filed_fournisseurs (client_id, code, nom, nom_normalise, pays, statut, source)
  values (v_cl, 'DUP2', 'DUPONT MATERIAU SARL', 'dupont materiau sarl', 'FR', 'actif', 'saisie') returning id into v_dup2;
  -- Le nom du devis est écrit d'un seul mot : aucun nom normalisé (avec ou sans forme sociale) ne lui est identique,
  -- seule la clé approchée le relie, aux deux fournisseurs.
  d2 := tests.a4_devis_nom(o, 'DV-DUP-1', 'DUPONTMATERIAU', 90);
  select * into x from public.filed_devis where document_id = d2;
  return next ok(x.fournisseur_id is null, 'Nom approché de deux fournisseurs : le devis n''est rattaché à aucun');
  f2 := tests.a4_facture_lignes(o, 'FAC-DUP-1', 90, array['Disques à tronçonner']);
  update public.filed_factures set fournisseur_id = v_dup1 where id = f2;
  perform private.filed_controler_facture(f2);
  return next ok(exists (select 1 from public.filed_devis_rapprochements k join public.filed_devis y on y.id = k.devis_id
                          where k.facture_id = f2 and y.document_id = d2 and k.statut = 'propose')
                 and (select message from public.filed_controles where facture_id = f2 and code = 'rapprochement.devis') like '%rattaché par son nom%',
                 'mais proposé à la facture du fournisseur au même nom approché, en le disant');
end $f$;
