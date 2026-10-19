-- Tests A4 — lot 58 (a4_66) : devis ↔ facture, proposé par FILED, confirmé par une personne. Doublures : organisation,
-- fournisseur, devis et factures d'exemple.
-- pgTAP, schéma « tests » d'A5 ; utilise tests.a4_organisation, tests.a4_facture (a4_10_facture_electronique.sql) et
-- tests.a4_comme (a4_26_sortie_envois.sql), à poser avant. Ce fichier ne supprime rien.

-- Un devis lu (valeurs du lecteur), rangé par FILED en nature « devis ». Rend l'id du document.
create or replace function tests.a4_devis(p_org jsonb, p_numero text, p_date date, p_ttc numeric, p_lignes jsonb)
returns uuid language plpgsql as $$
declare v_cl uuid := (p_org ->> 'client')::uuid; v_piece uuid; v_doc uuid; v_n int := (floor(random() * 900000) + 100000)::int;
begin
  insert into public.pieces (id, client_id, module, source, nom_fichier, mime, octets, sha256, chemin, objet_type, objet_id, statut, type_piece)
  values (gen_random_uuid(), v_cl, 'filed', 'depot', p_numero || '.pdf', 'application/pdf', 2048, md5('dv' || v_n) || md5(v_n || 'dv'),
          v_cl::text || '/filed_document/test/' || p_numero || '.pdf', 'filed_document', p_numero, 'lue', 'devis')
  returning id into v_piece;
  insert into public.pieces_valeurs (client_id, piece_id, champ, valeur, texte, source, confiance, verifiee)
  select v_cl, v_piece, c.champ, c.valeur, c.valeur #>> '{}', 'ia', 1, true
  from (values ('numero', to_jsonb(p_numero)), ('date', to_jsonb(p_date::text)), ('montant_ttc', to_jsonb(p_ttc)),
               ('fournisseur.siren', to_jsonb('123456782'::text)), ('lignes', p_lignes)) c(champ, valeur);
  insert into public.filed_documents (client_id, entite_id, annee_reception, numero_reception, piece_id, source, nom_fichier, sha256, recu_le, etat)
  values (v_cl, (p_org ->> 'entite')::uuid, 2026, v_n, v_piece, 'depot', p_numero || '.pdf', md5('dv' || v_n) || md5(v_n || 'dv'), now(), 'a_traiter')
  returning id into v_doc;
  update public.filed_documents set etat = 'classe', nature = 'devis', nature_source = 'lecteur' where id = v_doc;
  return v_doc;
end $$;

-- Une facture du même fournisseur, avec ses lignes.
create or replace function tests.a4_facture_lignes(p_org jsonb, p_numero text, p_ttc numeric, p_lignes text[]) returns uuid
language plpgsql as $$
declare a jsonb := tests.a4_facture(p_org, 'ia', p_numero, p_ttc); v_f uuid := (a ->> 'facture')::uuid;
begin
  insert into public.filed_factures_lignes (client_id, facture_id, document_id, rang, designation, quantite, prix_unitaire, montant_ht, source)
  select (p_org ->> 'client')::uuid, v_f, (a ->> 'document')::uuid, l.rang, l.d, 1, round(p_ttc / 1.2 / cardinality(p_lignes), 2),
         round(p_ttc / 1.2 / cardinality(p_lignes), 2), 'ia'
  from unnest(p_lignes) with ordinality l(d, rang);
  return v_f;
end $$;

create or replace function tests.test_a4_66_01_rapprochement_devis() returns setof text
language plpgsql as $f$
declare
  o jsonb := tests.a4_organisation(); v_cl uuid := (o ->> 'client')::uuid;
  d1 uuid; d2 uuid; f1 uuid; f2 uuid; c public.filed_controles; k public.filed_devis_rapprochements; x public.filed_devis; v jsonb;
begin
  -- Le devis lu a sa fiche, rattachée au fournisseur par son SIREN.
  d1 := tests.a4_devis(o, 'DV-151', date '2026-09-10', 151.10,
    '[{"designation": "Disques à tronçonner", "montant": 60}, {"designation": "Traceurs de chantier", "montant": 40}, {"designation": "Pointes", "montant": 25.92}]');
  select * into x from public.filed_devis where document_id = d1;
  return next ok(x.id is not null and x.montant_ttc = 151.10 and x.fournisseur_id = (o ->> 'fournisseur')::uuid and jsonb_array_length(x.lignes) = 3,
                 'Le devis lu a sa fiche : 151,10 €, trois lignes, son fournisseur');

  -- Une facture du même fournisseur, sans article en commun : proposé, à vérifier ; jamais rapproché d'office.
  f1 := tests.a4_facture_lignes(o, 'FAC-148', 148.75, array['Chaussures de sécurité (5 paires)']);
  perform private.filed_controler_facture(f1);
  select * into c from public.filed_controles where facture_id = f1 and code = 'rapprochement.devis';
  return next ok(c.resultat = 'anomalie' and c.gravite = 'attention' and c.message like '%aucun article en commun%'
                 and c.message like '%À confirmer ou écarter par une personne%',
                 'Articles différents : devis proposé, à vérifier (attention), une personne tranche');
  return next ok(exists (select 1 from public.filed_devis_rapprochements where facture_id = f1 and statut = 'propose')
                 and not exists (select 1 from public.filed_devis_rapprochements where statut = 'confirme' and client_id = v_cl),
                 'Rien n''est rapproché sans une personne');

  -- Mêmes articles, même montant : proposé, concordant (info), toujours à confirmer.
  d2 := tests.a4_devis(o, 'DV-120', date '2026-09-15', 120,
    '[{"designation": "Disques à tronçonner", "montant": 60}, {"designation": "Pointes", "montant": 40}]');
  f2 := tests.a4_facture_lignes(o, 'FAC-120', 120, array['Disques à tronçonner', 'Pointes']);
  perform private.filed_controler_facture(f2);
  select * into c from public.filed_controles where facture_id = f2 and code = 'rapprochement.devis';
  return next ok(c.resultat = 'anomalie' and c.gravite = 'info' and c.message like '%DV-120%' and c.message like '%2 article(s) en commun%',
                 'Mêmes articles, même montant : le bon devis d''abord, concordant (info), à confirmer');

  -- Une personne confirme : le contrôle devient juste ; les autres propositions de la facture sont écartées.
  select r.* into k from public.filed_devis_rapprochements r join public.filed_devis y on y.id = r.devis_id
   where r.facture_id = f2 and y.document_id = d2;
  perform tests.a4_comme((o ->> 'valideur')::uuid);
  perform public.filed_confirmer_devis(k.id);
  reset role; perform set_config('request.jwt.claims', '', true);
  select * into c from public.filed_controles where facture_id = f2 and code = 'rapprochement.devis';
  return next ok(c.resultat = 'ok' and c.message like '%confirmé par une personne%', 'Confirmé par une personne : rapprochement juste');
  return next ok(not exists (select 1 from public.filed_devis_rapprochements where facture_id = f2 and statut = 'propose'),
                 'Les autres devis proposés pour cette facture sont écartés');

  -- Écarter, avec un motif : le devis ne revient plus pour cette facture.
  select * into k from public.filed_devis_rapprochements where facture_id = f1 and statut = 'propose'
   order by articles_communs, abs(ecart) limit 1;
  perform tests.a4_comme((o ->> 'gerant')::uuid);
  return next throws_ok(format('select public.filed_ecarter_devis(%L, %L)', k.id, ''), '22023', null, 'Écarter demande un motif');
  perform public.filed_ecarter_devis(k.id, 'Ce devis porte sur un autre achat');
  reset role; perform set_config('request.jwt.claims', '', true);
  perform private.filed_controler_facture(f1);
  return next ok((select statut from public.filed_devis_rapprochements where id = k.id) = 'ecarte',
                 'Le devis écarté le reste au contrôle suivant');

  -- Un devis soldé par une facture confirmée n'est plus proposé ailleurs.
  return next ok(not exists (select 1 from public.filed_devis_rapprochements r join public.filed_devis y on y.id = r.devis_id
                              where r.facture_id = f1 and y.document_id = d2 and r.statut = 'propose'),
                 'Le devis soldé n''est plus proposé à une autre facture');

  -- Au banc : les deux scénarios devis ↔ facture tiennent leur attente.
  v := private.filed_banc_scenario(v_cl, (select scenario from private.filed_banc_cas where code = 'OMEGA-DEVIS-ARTICLES-DIFFERENTS'));
  return next is(private.filed_banc_juger('rapprochement.devis', '{"resultat": "anomalie", "gravites": ["attention"]}', v), 'juste',
                 'Banc : articles différents → proposé, à vérifier');
  v := private.filed_banc_scenario(v_cl, (select scenario from private.filed_banc_cas where code = 'OMEGA-DEVIS-MEMES-ARTICLES'));
  return next is(private.filed_banc_juger('rapprochement.devis', '{"resultat": "anomalie", "gravites": ["info"]}', v), 'juste',
                 'Banc : mêmes articles → proposé, concordant');

  return next ok(not has_function_privilege('anon', 'public.filed_confirmer_devis(uuid)', 'execute')
                 and has_function_privilege('authenticated', 'public.filed_confirmer_devis(uuid)', 'execute'),
                 'Confirmer : une personne de l''organisation, pas un anonyme');
end $f$;
