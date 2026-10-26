-- Tests A4 — lot 84 (a4_92) : TMOD-01, une facture refusée reste visible avec son motif ; après « reprise impossible »,
-- une personne la classe sans suite. Données d'exemple.
-- pgTAP, schéma « tests » d'A5 ; utilise tests.a4_organisation, tests.a4_facture (a4_10_facture_electronique.sql),
-- tests.a4_comme (a4_26_sortie_envois.sql), tests.a4_facture_refusee (a4_74_reprise_apres_refus.sql) et
-- tests.a4_corriger_comme (a4_75_correction_reprise.sql), à poser avant. Ce fichier ne supprime rien.

-- Classer sans suite comme p_user (ou, sans personne, comme le serveur) ; rend 'ok' ou le code et le message d'erreur.
create or replace function tests.a4_classer_comme(p_user uuid, p_facture uuid, p_motif text) returns text
language plpgsql as $$
declare v text := 'ok';
begin
  if p_user is not null then perform tests.a4_comme(p_user); else set local role service_role; end if;
  begin
    perform public.filed_classer_refusee(p_facture, p_motif);
  exception when others then
    v := sqlstate || ' ' || sqlerrm;
  end;
  reset role;
  perform set_config('request.jwt.claims', '', true);
  return v;
end $$;

create or replace function tests.test_a4_92_01_refusee_visible() returns setof text
language plpgsql as $f$
declare o jsonb := tests.a4_organisation(); v_cl uuid := (o ->> 'client')::uuid; d uuid; f uuid; l record;
begin
  -- Pendant les 24 h de sa reprise, la facture refusée est comptée et listée, avec son motif.
  d := tests.a4_facture_refusee(o, 'VIS-001', 'Le montant TTC est faux : 1 260 € sur le bon de commande.');
  select objet_id::uuid into f from public.demandes_validation where id = d;
  perform tests.a4_comme((o ->> 'gerant')::uuid);
  return next ok((select nombre = 1 and montant_ttc = 1200 from public.filed_pieces_en_cours(v_cl) where categorie = 'refusees'),
                 'Pièces en cours : « Refusées, à reprendre ou à classer » 1 pour 1 200 €');
  select * into l from public.filed_factures_refusees(v_cl);
  return next ok(l.facture_id = f and l.motif = 'Le montant TTC est faux : 1 260 € sur le bon de commande.'
                 and l.reprise = 'a_faire' and l.corriger_avant > now() + interval '23 hours'
                 and l.geste like 'À corriger pour sa reprise%',
                 'Liste des refusées : motif du refus, reprise à faire, heure limite, geste');
  reset role;
  perform set_config('request.jwt.claims', '', true);
end $f$;

create or replace function tests.test_a4_92_02_classer_apres_impossible() returns setof text
language plpgsql as $f$
declare o jsonb := tests.a4_organisation(); v_cl uuid := (o ->> 'client')::uuid; d uuid; f uuid; l record; v text;
begin
  d := tests.a4_facture_refusee(o, 'VIS-002', 'Vérifiez le fournisseur.');
  select objet_id::uuid into f from public.demandes_validation where id = d;
  perform private.filed_traiter_reprises(interval '0 seconds');
  perform tests.a4_comme((o ->> 'gerant')::uuid);
  select * into l from public.filed_factures_refusees(v_cl);
  reset role;
  perform set_config('request.jwt.claims', '', true);
  return next ok(l.reprise = 'impossible'
                 and l.reprise_motif like 'Aucune correction de la facture dans les 24 h%à classer sans suite, ou à redéposer en facture rectificative.'
                 and l.geste = 'À classer sans suite, ou à redéposer en facture rectificative.',
                 'Reprise impossible : toujours listée, le motif et le geste disent quoi faire');
  -- La sortie : classée sans suite, par une personne, avec un motif.
  v := tests.a4_classer_comme((o ->> 'valideur')::uuid, f, 'non');
  return next ok(v like '22023 Un classement sans suite se motive%', 'Sans motif : refusé');
  v := tests.a4_classer_comme(null, f, 'Classée par le serveur.');
  return next ok(v like '42501 Une facture se classe sans suite par une personne.%', 'Sans personne : refusé');
  v := tests.a4_classer_comme((o ->> 'valideur')::uuid, f, 'Le fournisseur envoie une facture rectificative.');
  return next is(v, 'ok', 'Le valideur la classe sans suite');
  return next ok((select statut from public.filed_factures where id = f) = 'refusee'
                 and exists (select 1 from public.filed_historique h join public.filed_factures x on x.document_id = h.document_id
                              where x.id = f and h.etape = 'classee_sans_suite'),
                 'Elle reste refusée, rien n''est effacé, le classement est à l''historique');
  perform tests.a4_comme((o ->> 'gerant')::uuid);
  return next ok(not exists (select 1 from public.filed_factures_refusees(v_cl))
                 and (select classee_motif from public.filed_factures_refusees(v_cl, null, true)) = 'Le fournisseur envoie une facture rectificative.'
                 and not exists (select 1 from public.filed_pieces_en_cours(v_cl) where categorie = 'refusees'),
                 'Classée : hors des pièces en cours et de la liste ordinaire, retrouvée avec les classées');
  reset role;
  perform set_config('request.jwt.claims', '', true);
  v := tests.a4_classer_comme((o ->> 'gerant')::uuid, f, 'Une seconde fois.');
  return next ok(v like '55000 Cette facture est déjà classée sans suite.%', 'Une seule fois');
end $f$;

create or replace function tests.test_a4_92_03_classer_pendant_la_reprise() returns setof text
language plpgsql as $f$
declare o jsonb := tests.a4_organisation(); d uuid; f uuid; g uuid; v text;
begin
  -- Classée pendant que sa reprise est à faire : la reprise devient impossible, la correction n'est plus ouverte.
  d := tests.a4_facture_refusee(o, 'VIS-003', 'Le montant TTC est faux.');
  select objet_id::uuid into f from public.demandes_validation where id = d;
  v := tests.a4_classer_comme((o ->> 'gerant')::uuid, f, 'Le fournisseur annule cette facture.');
  return next ok(v = 'ok' and (select statut || ':' || motif from private.reprises where demande_id = d) = 'impossible:Classée sans suite par une personne.',
                 'Classée pendant la reprise : reprise impossible, motif écrit');
  v := tests.a4_corriger_comme((o ->> 'gerant')::uuid, f);
  return next ok(v like '55000 Cette facture est décidée (refusee)%', 'Classée : elle ne se corrige plus');
  -- Une facture qui n'est pas refusée ne se classe pas sans suite.
  g := (tests.a4_facture(o, 'ia', 'VIS-004', 333) ->> 'facture')::uuid;
  v := tests.a4_classer_comme((o ->> 'gerant')::uuid, g, 'Essai sur une facture à valider.');
  return next ok(v like '55000 Seule une facture refusée se classe sans suite%', 'Non refusée : refusé');
end $f$;
