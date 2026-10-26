-- Tests A4 — lot 78 (a4_86) : la reprise après refus, côté FILED (socle 19az d'A5, à poser avant). Données d'exemple.
-- pgTAP, schéma « tests » d'A5 ; utilise tests.a4_organisation, tests.a4_facture (a4_10_facture_electronique.sql) et
-- tests.a4_comme (a4_26_sortie_envois.sql), à poser avant. Ce fichier ne supprime rien.

-- Une facture « à valider », refusée par le valideur avec un commentaire ; la file exécute la décision. Rend la demande.
-- a4_87 : la pièce est lue en entier (date, HT, TVA, SIREN), pour que la correction d'une personne, qui réintègre la
-- facture depuis ses valeurs, ne perde rien de ce qui n'est pas corrigé.
create or replace function tests.a4_facture_refusee(p_org jsonb, p_numero text, p_commentaire text) returns uuid
language plpgsql as $$
declare fa jsonb := tests.a4_facture(p_org, 'ia', p_numero, 1200); v_cl uuid := (p_org ->> 'client')::uuid; v_d uuid;
begin
  insert into public.pieces_valeurs (client_id, piece_id, champ, valeur, texte, source, confiance, verifiee)
  select v_cl, (fa ->> 'piece')::uuid, x.champ, x.valeur, x.valeur #>> '{}', 'ia', 1, true
    from (values ('date', to_jsonb('2026-09-28'::text)), ('montant_ht', to_jsonb(1000)), ('montant_tva', to_jsonb(200)),
                 ('fournisseur.siren', to_jsonb('123456782'::text))) x(champ, valeur);
  perform private.filed_integrer_facture((fa ->> 'document')::uuid);
  select x.demande_id into v_d from public.filed_validations x where x.facture_id = (fa ->> 'facture')::uuid and x.issue is null;
  perform set_config('request.jwt.claims', json_build_object('sub', p_org ->> 'valideur', 'role', 'authenticated')::text, true);
  set local role authenticated;
  insert into public.approbations (demande_id, decision, commentaire) values (v_d, 'rejete', p_commentaire);
  reset role;
  perform set_config('request.jwt.claims', '', true);
  perform private.filed_traiter(10);
  return v_d;
end $$;

create or replace function tests.test_a4_86_01_reprise_apres_refus() returns setof text
language plpgsql as $f$
declare o jsonb := tests.a4_organisation(); d1 uuid; d2 uuid; f uuid; v_rep public.demandes_validation;
begin
  -- Refus avec commentaire : la facture est refusée, la consigne déposée, l'instantané pris.
  d1 := tests.a4_facture_refusee(o, 'REP-001', 'Le montant TTC est faux : 1 260 € sur le bon de commande.');
  select (objet_id)::uuid into f from public.demandes_validation where id = d1;
  return next ok((select statut from public.filed_factures where id = f) = 'refusee'
                 and exists (select 1 from private.reprises where demande_id = d1 and statut = 'a_faire')
                 and exists (select 1 from private.filed_reprises where demande_id = d1),
                 'Refusée : consigne déposée, instantané pris');
  -- Rien n'a changé : la reprise attend ; au-delà du délai, impossible.
  perform private.filed_traiter_reprises();
  return next is((select statut from private.reprises where demande_id = d1), 'a_faire', 'Sans correction : elle attend');
  -- Le gérant corrige les montants par la vraie porte (a4_87, TFILED-28) : la facture refusée se corrige, reste refusée.
  perform tests.a4_comme((o ->> 'gerant')::uuid);
  perform public.filed_corriger_facture(f, '{"montant_ht": 1050, "montant_tva": 210, "montant_ttc": 1260}', 'Facture rectificative reçue.');
  reset role;
  perform set_config('request.jwt.claims', '', true);
  return next ok((select statut = 'refusee' and montant_ttc = 1260 from public.filed_factures where id = f),
                 'La porte de correction accepte la facture refusée dont la reprise est à faire');
  perform private.filed_traiter_reprises();
  select * into v_rep from public.demandes_validation where payload ->> 'reprise_de' = d1::text;
  return next ok(v_rep.id is not null and v_rep.statut = 'en_attente' and v_rep.resume like 'Reprise après refus — facture REP-001, corrigée%',
                 'Corrigée : une demande de reprise, en attente, liée à la refusée');
  return next ok(exists (select 1 from jsonb_array_elements(v_rep.payload -> 'corrections') c
                          where c ->> 'champ' = 'montant_ttc' and (c ->> 'avant')::numeric = 1200 and (c ->> 'apres')::numeric = 1260),
                 'avec la correction du montant (avant 1 200, après 1 260)');
  return next ok((select statut from public.filed_factures where id = f) = 'a_valider'
                 and exists (select 1 from public.filed_validations where demande_id = v_rep.id and facture_id = f),
                 'la facture repasse « à valider », liée à la nouvelle demande');
  return next is((v_rep.payload ->> 'version')::integer, (select version from public.filed_factures where id = f), 'à sa version corrigée');
  -- La reprise aboutit : le valideur approuve la nouvelle demande, la file l'exécute, la facture est validée.
  perform tests.a4_comme((o ->> 'valideur')::uuid);
  insert into public.approbations (demande_id, decision) values (v_rep.id, 'approuve');
  reset role;
  perform set_config('request.jwt.claims', '', true);
  perform private.filed_traiter(10);
  return next ok((select statut from public.demandes_validation where id = v_rep.id) = 'executee'
                 and (select statut from public.filed_factures where id = f) = 'validee',
                 'Reprise approuvée et exécutée : la facture corrigée est validée');

  -- « Doublon » : impossible tout de suite.
  d2 := tests.a4_facture_refusee(o, 'REP-002', 'Déjà reçue.');
  update private.reprises set consigne = consigne || '{"motif": "Doublon"}' where demande_id = d2;
  perform private.filed_traiter_reprises();
  return next ok((select statut from private.reprises where demande_id = d2) = 'impossible'
                 and not exists (select 1 from public.demandes_validation where payload ->> 'reprise_de' = d2::text),
                 'Refus pour doublon : reprise impossible, aucune demande');
end $f$;

create or replace function tests.test_a4_86_02_sans_correction() returns setof text
language plpgsql as $f$
declare o jsonb := tests.a4_organisation(); d2 uuid;
begin
  -- Sans correction au-delà du délai : impossible, sans demande.
  d2 := tests.a4_facture_refusee(o, 'REP-003', 'Vérifiez le fournisseur.');
  perform private.filed_traiter_reprises(interval '0 seconds');
  return next ok((select statut || ':' || motif from private.reprises where demande_id = d2) like 'impossible:Aucune correction%'
                 and not exists (select 1 from public.demandes_validation where payload ->> 'reprise_de' = d2::text),
                 'Sans correction au-delà du délai : reprise impossible, aucune demande');
end $f$;
