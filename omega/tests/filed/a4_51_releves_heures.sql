-- Tests A4 — lot 55 (a4_63) : le relevé d'heures signé ↔ la facture d'intérim. Doublures : organisation, agence et pièces d'exemple.
-- pgTAP, schéma « tests » d'A5 ; utilise tests.a4_organisation et tests.a4_facture (a4_10_facture_electronique.sql),
-- à poser avant. Ce fichier ne supprime rien.

-- Un relevé d'heures lu (valeurs du lecteur), rangé par FILED (nature autre, classe). Rend l'id du document.
-- Noms d'A1 (4a4ad9e1) : agence, interimaire, periode_du, periode_au, total_heures, signature_client, lignes ; le SIREN
-- de l'agence par fournisseur.siren s'il est écrit. p_noms = 'v1' : les noms de la première version, en repli.
create or replace function tests.a4_releve_heures_lu(p_org jsonb, p_heures numeric, p_du date, p_au date, p_signe boolean,
                                                  p_siren text default '123456782', p_noms text default 'a1', p_lignes jsonb default null)
returns uuid language plpgsql as $$
declare v_cl uuid := (p_org ->> 'client')::uuid; v_piece uuid; v_doc uuid; v_n int := (floor(random() * 900000) + 100000)::int;
begin
  insert into public.pieces (id, client_id, module, source, nom_fichier, mime, octets, sha256, chemin, objet_type, objet_id, statut, type_piece)
  values (gen_random_uuid(), v_cl, 'filed', 'depot', 'releve-' || v_n || '.pdf', 'application/pdf', 2048, md5('rh' || v_n) || md5(v_n || 'rh'),
          v_cl::text || '/filed_document/test/releve-' || v_n || '.pdf', 'filed_document', 'rh' || v_n, 'lue', 'releve_heures')
  returning id into v_piece;
  insert into public.pieces_valeurs (client_id, piece_id, champ, valeur, texte, source, confiance, verifiee)
  select v_cl, v_piece, c.champ, c.valeur, c.valeur #>> '{}', 'ia', 1, true
  from (values
    (case when p_noms = 'a1' then 'total_heures' else 'releve.heures' end, to_jsonb(p_heures)),
    (case when p_noms = 'a1' then 'periode_du' else 'releve.periode_debut' end, to_jsonb(p_du::text)),
    (case when p_noms = 'a1' then 'periode_au' else 'releve.periode_fin' end, to_jsonb(p_au::text)),
    (case when p_noms = 'a1' then 'signature_client' else 'releve.signe' end,
     case when p_noms = 'a1' then to_jsonb(p_signe) else to_jsonb(case when p_signe then 'oui' else 'non' end) end),
    ('fournisseur.siren', to_jsonb(p_siren)),
    (case when p_noms = 'a1' then 'agence' else 'fournisseur.nom' end, to_jsonb('Fournisseur structuré d''exemple'::text)),
    ('interimaire', case when p_noms = 'a1' then to_jsonb('Intérimaire d''exemple'::text) end),
    ('lignes', p_lignes)) c(champ, valeur)
  where c.valeur is not null and jsonb_typeof(c.valeur) <> 'null';
  insert into public.filed_documents (client_id, entite_id, annee_reception, numero_reception, piece_id, source, nom_fichier, sha256, recu_le, etat)
  values (v_cl, (p_org ->> 'entite')::uuid, 2026, v_n, v_piece, 'depot', 'releve-' || v_n || '.pdf', md5('rh' || v_n) || md5(v_n || 'rh'), now(), 'a_traiter')
  returning id into v_doc;
  update public.filed_documents set etat = 'classe', nature = 'autre', nature_source = 'lecteur' where id = v_doc;
  return v_doc;
end $$;

-- Une facture d'intérim (doublure) : une ligne en heures, datée du 28/09/2026.
create or replace function tests.a4_facture_heures(p_org jsonb, p_numero text, p_heures numeric) returns uuid
language plpgsql as $$
declare a jsonb := tests.a4_facture(p_org, 'ia', p_numero, round(p_heures * 30 * 1.2, 2)); v_f uuid := (a ->> 'facture')::uuid;
begin
  insert into public.filed_factures_lignes (client_id, facture_id, document_id, rang, designation, quantite, unite, prix_unitaire, montant_ht, source)
  values ((p_org ->> 'client')::uuid, v_f, (a ->> 'document')::uuid, 1, 'Mise à disposition de personnel', p_heures, 'h', 30, p_heures * 30, 'ia');
  return v_f;
end $$;

create or replace function tests.test_a4_63_01_releves_heures() returns setof text
language plpgsql as $f$
declare o jsonb := tests.a4_organisation(); d1 uuid; d2 uuid; d3 uuid; d4 uuid; f1 uuid; f2 uuid; f3 uuid; f4 uuid; r public.filed_releves_heures;
        c public.filed_controles;
begin
  -- Deux relevés hebdomadaires signés (17,5 h + 17,5 h), puis la facture mensuelle de 35 h : rapprochés, contrôle juste.
  d1 := tests.a4_releve_heures_lu(o, 17.5, date '2026-09-07', date '2026-09-13', true);
  d2 := tests.a4_releve_heures_lu(o, null, date '2026-09-14', date '2026-09-20', true, null, 'a1',
          '[{"date": "2026-09-14", "heures": 7.5, "page": 1}, {"date": "2026-09-15", "heures": 10, "page": 1}]');
  select * into r from public.filed_releves_heures where document_id = d2;
  return next ok(r.heures = 17.5 and r.fournisseur_id = (o ->> 'fournisseur')::uuid and jsonb_array_length(r.lignes) = 2,
                 'Sans total écrit : la somme des lignes (7h30 + 10 h) ; sans SIREN : l''agence reconnue par son nom');
  select * into r from public.filed_releves_heures where document_id = d1;
  return next ok(r.id is not null and r.heures = 17.5 and r.signe and r.fournisseur_id = (o ->> 'fournisseur')::uuid and r.lien = 'libre'
                 and r.periode_debut = date '2026-09-07' and r.interimaire = 'Intérimaire d''exemple',
                 'Noms d''A1 : 17,5 h (total_heures), signé (signature_client), période, intérimaire, l''agence par son SIREN, libre');
  return next is((select nature from public.filed_documents where id = d1), 'autre', 'Il est rangé en nature « autre »');
  f1 := tests.a4_facture_heures(o, 'INT-001', 35);
  perform private.filed_controler_facture(f1);
  select * into c from public.filed_controles where facture_id = f1 and code = 'rapprochement.heures';
  return next ok(c.resultat = 'ok' and c.gravite = 'attention', 'Facture de 35 h, deux relevés signés de 17,5 h : rapprochement juste');
  return next is((select count(*)::int from public.filed_releves_heures where facture_id = f1 and lien = 'rapproche'), 2, 'Les deux relevés sont rattachés à la facture');

  -- Une facture de 40 h pour un relevé de 35 h signé : écart, en attention, jamais bloquant.
  d3 := tests.a4_releve_heures_lu(o, 35, date '2026-08-03', date '2026-08-30', true, '123456782', 'v1');
  return next is((select heures from public.filed_releves_heures where document_id = d3), 35.00::numeric(9,2),
                 'Les noms de la première version restent lus en repli');
  f2 := tests.a4_facture_heures(o, 'INT-002', 40);
  update public.filed_factures set date_emission = date '2026-09-01' where id = f2;
  perform private.filed_controler_facture(f2);
  select * into c from public.filed_controles where facture_id = f2 and code = 'rapprochement.heures';
  return next ok(c.resultat = 'anomalie' and c.gravite = 'attention' and c.message like '%40 h facturées pour 35 h signées%',
                 'Facture de 40 h pour 35 h signées : écart signalé, en attention');

  -- La facture arrive d'abord ; le relevé, non signé, ensuite : il s'y rattache et le défaut de signature est dit.
  f3 := tests.a4_facture_heures(o, 'INT-003', 20);
  update public.filed_factures set date_emission = date '2026-10-30' where id = f3;
  perform private.filed_controler_facture(f3);
  return next is((select resultat from public.filed_controles where facture_id = f3 and code = 'rapprochement.heures'), 'anomalie',
                 'Facture en heures d''une agence qui envoie des relevés, sans relevé : signalée');
  d4 := tests.a4_releve_heures_lu(o, 20, date '2026-10-19', date '2026-10-25', false);
  select * into r from public.filed_releves_heures where document_id = d4;
  return next ok(r.facture_id = f3 and r.lien = 'rapproche', 'Le relevé arrivé après se rattache à la facture ouverte');
  return next ok((select message from public.filed_controles where facture_id = f3 and code = 'rapprochement.heures') like '%sans signature reconnue%',
                 'La facture recontrôlée dit le relevé non signé');

  -- Une facture sans ligne en heures, aucun relevé libre : pas de contrôle des heures.
  f4 := (tests.a4_facture(o, 'ia', 'FRN-001', 120) ->> 'facture')::uuid;
  perform private.filed_controler_facture(f4);
  return next ok(not exists (select 1 from public.filed_controles where facture_id = f4 and code = 'rapprochement.heures'),
                 'Facture sans ligne en heures : pas de contrôle des heures');

  -- Une personne écarte un relevé mal rattaché : la facture est recontrôlée, le relevé ne revient pas.
  perform tests.a4_comme((o ->> 'gerant')::uuid);
  perform public.filed_ecarter_releve_heures((select id from public.filed_releves_heures where document_id = d2), 'Semaine d''un autre chantier');
  reset role; perform set_config('request.jwt.claims', '', true);
  return next ok((select lien = 'ecarte' and facture_id is null from public.filed_releves_heures where document_id = d2)
                 and (select message from public.filed_controles where facture_id = f1 and code = 'rapprochement.heures') like '%35 h facturées pour 17,5 h signées%',
                 'Relevé écarté : il quitte la facture, qui dit l''écart restant');
  perform private.filed_controler_facture(f1);
  return next ok((select lien from public.filed_releves_heures where document_id = d2) = 'ecarte', 'Un relevé écarté ne se rattache plus');

  -- Ouvert en lecture aux membres, pas aux anonymes.
  return next ok(not has_table_privilege('anon', 'public.filed_releves_heures', 'select')
                 and has_function_privilege('authenticated', 'public.filed_ecarter_releve_heures(uuid, text)', 'execute'),
                 'Fiches lisibles par les comptes, pas par les anonymes ; écarter est ouvert aux comptes (rôle vérifié dedans)');
end $f$;
