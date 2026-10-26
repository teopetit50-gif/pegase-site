-- Tests A4 — lot 79 (a4_87) : TFILED-28, une facture refusée se corrige en vue de sa reprise, et seulement alors.
-- pgTAP, schéma « tests » d'A5 ; utilise tests.a4_organisation (a4_10_facture_electronique.sql), tests.a4_comme
-- (a4_26_sortie_envois.sql) et tests.a4_facture_refusee (a4_74_reprise_apres_refus.sql), à poser avant. Données
-- d'exemple. Ce fichier ne supprime rien.

-- La correction ordinaire d'un montant, par une personne de l'organisation (ou, sans personne, par le serveur) ; rend
-- le code et le message d'erreur, ou 'ok'.
create or replace function tests.a4_corriger_comme(p_user uuid, p_facture uuid) returns text
language plpgsql as $$
declare v_err text := 'ok';
begin
  if p_user is not null then perform tests.a4_comme(p_user); else set local role service_role; end if;
  begin
    perform public.filed_corriger_facture(p_facture, '{"montant_ht": 1050, "montant_tva": 210, "montant_ttc": 1260}', 'Facture rectificative.');
  exception when others then
    v_err := sqlstate || ' ' || sqlerrm;
  end;
  reset role;
  perform set_config('request.jwt.claims', '', true);
  return v_err;
end $$;

create or replace function tests.test_a4_87_01_sans_reprise_ouverte() returns setof text
language plpgsql as $f$
declare o jsonb := tests.a4_organisation(); d1 uuid; d2 uuid; f1 uuid; f2 uuid; v_rep uuid; v text;
begin
  -- Reprise déclarée impossible (aucune correction dans le délai) : la facture refusée ne se corrige plus.
  d1 := tests.a4_facture_refusee(o, 'COR-001', 'Vérifiez le fournisseur.');
  select objet_id::uuid into f1 from public.demandes_validation where id = d1;
  perform private.filed_traiter_reprises(interval '0 seconds');
  v := tests.a4_corriger_comme((o ->> 'gerant')::uuid, f1);
  return next ok((select statut from private.reprises where demande_id = d1) = 'impossible'
                 and v like '55000 Cette facture est décidée (refusee) : elle ne se corrige plus.%'
                 and (select montant_ttc from public.filed_factures where id = f1) = 1200,
                 'Reprise impossible : la correction est refusée, rien n''est changé');
  -- La reprise a eu lieu, et sa nouvelle demande est refusée à son tour : plus de reprise ouverte, plus de correction.
  d2 := tests.a4_facture_refusee(o, 'COR-002', 'Le montant TTC est faux.');
  select objet_id::uuid into f2 from public.demandes_validation where id = d2;
  v := tests.a4_corriger_comme((o ->> 'gerant')::uuid, f2);
  perform private.filed_traiter_reprises();
  select id into v_rep from public.demandes_validation where payload ->> 'reprise_de' = d2::text;
  perform tests.a4_comme((o ->> 'valideur')::uuid);
  insert into public.approbations (demande_id, decision, commentaire) values (v_rep, 'rejete', 'Toujours faux.');
  reset role;
  perform set_config('request.jwt.claims', '', true);
  perform private.filed_traiter(10);
  return next ok(v = 'ok' and v_rep is not null and (select statut from public.filed_factures where id = f2) = 'refusee'
                 and (private.filed_reprise_ouverte(f2)).demande_id is null,
                 'Reprise refusée à son tour : la facture est refusée, sans reprise ouverte');
  v := tests.a4_corriger_comme((o ->> 'gerant')::uuid, f2);
  return next ok(v like '55000 Cette facture est décidée (refusee) : elle ne se corrige plus.%',
                 'Refusée sans reprise ouverte : la correction est refusée');
end $f$;

create or replace function tests.test_a4_87_02_limites_de_la_reprise() returns setof text
language plpgsql as $f$
declare o jsonb := tests.a4_organisation(); d uuid; f uuid; v text; v_version integer;
begin
  -- Refus pour doublon : la correction ne répond pas au motif.
  d := tests.a4_facture_refusee(o, 'COR-003', 'Déjà reçue.');
  select objet_id::uuid into f from public.demandes_validation where id = d;
  update private.reprises set consigne = consigne || '{"motif": "Doublon"}' where demande_id = d;
  v := tests.a4_corriger_comme((o ->> 'gerant')::uuid, f);
  return next ok(v like '55000 Refusée pour « Doublon »%', 'Refus pour doublon : pas de correction');
  -- Hors budget, même chose.
  update private.reprises set consigne = consigne || '{"motif": "Hors budget ou hors période"}' where demande_id = d;
  v := tests.a4_corriger_comme((o ->> 'gerant')::uuid, f);
  return next ok(v like '55000 Refusée pour « Hors budget ou hors période »%', 'Refus hors budget : pas de correction');
  -- Plus de 24 h après le refus : le délai de la reprise est passé.
  update private.reprises set consigne = consigne - 'motif', cree_le = now() - interval '25 hours' where demande_id = d;
  v := tests.a4_corriger_comme((o ->> 'gerant')::uuid, f);
  return next ok(v like '55000 Refusée il y a plus de 24 h%', 'Au-delà de 24 h : pas de correction');
  -- Dans le délai, sans personne (le moteur) : refusé, la correction d'une reprise est humaine.
  update private.reprises set cree_le = now() where demande_id = d;
  v := tests.a4_corriger_comme(null, f);
  return next ok(v like '42501 Une facture refusée se corrige, pour sa reprise, par une personne.%', 'Sans personne : pas de correction');
  -- Les refus n'ont rien écrit ; le gérant, dans le délai, corrige.
  select version into v_version from public.filed_factures where id = f;
  return next is((select montant_ttc from public.filed_factures where id = f), 1200.00, 'Rien n''a changé après ces refus');
  v := tests.a4_corriger_comme((o ->> 'gerant')::uuid, f);
  return next ok(v = 'ok' and (select statut = 'refusee' and montant_ttc = 1260 and version = v_version + 1
                                 from public.filed_factures where id = f),
                 'Reprise à faire, par le gérant, dans le délai : corrigée, toujours refusée, nouvelle version');
end $f$;

create or replace function tests.test_a4_87_03_lecture_du_moteur() returns setof text
language plpgsql as $f$
declare o jsonb := tests.a4_organisation(); d uuid; f uuid; v_doc uuid; v_version integer;
begin
  -- Refus sans commentaire : reprise à faire, mais aucune relecture avec consigne demandée au lecteur (a1_02).
  d := tests.a4_facture_refusee(o, 'COR-004', null);
  select objet_id::uuid into f from public.demandes_validation where id = d;
  select document_id, version into v_doc, v_version from public.filed_factures where id = f;
  return next ok((private.filed_reprise_ouverte(f)).demande_id = d
                 and not private.filed_relecture_attendue((select piece_id from public.filed_documents where id = v_doc)),
                 'Refus sans commentaire : reprise à faire, aucune relecture attendue');
  -- Une nouvelle valeur du moteur, hors porte de correction : la facture refusée n'en est pas changée.
  update public.pieces_valeurs set valeur = to_jsonb(1300), texte = '1300'
   where piece_id = (select piece_id from public.filed_documents where id = v_doc) and champ = 'montant_ttc';
  return next is(private.filed_integrer_facture(v_doc), 'refusee', 'Intégration hors correction : refusée');
  return next ok((select version = v_version and montant_ttc = 1200 from public.filed_factures where id = f),
                 'la facture n''a pas changé (le réglage de la correction ne survit pas à la porte)');
end $f$;
