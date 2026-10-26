-- Tests A4 — lot 82 (a4_90) : TMOD-03, le refus d'une facture ferme ses demandes liées ; une demande liée à une facture
-- refusée ne s'exécute jamais ; la reprise retrouve l'imputation. Données d'exemple.
-- pgTAP, schéma « tests » d'A5 ; utilise tests.a4_organisation, tests.a4_facture (a4_10_facture_electronique.sql),
-- tests.a4_compte (a4_11_ecritures_fec.sql), tests.a4_comme (a4_26_sortie_envois.sql) et tests.a4_facture_imputee
-- (a4_76_pieces_en_cours.sql), à poser avant. Ce fichier ne supprime rien.

-- La décision d'une personne sur une demande ; la file l'exécute si p_traiter.
create or replace function tests.a4_decider(p_user uuid, p_demande uuid, p_decision text, p_commentaire text, p_traiter boolean)
returns void language plpgsql as $$
begin
  perform tests.a4_comme(p_user);
  insert into public.approbations (demande_id, decision, commentaire) values (p_demande, p_decision, p_commentaire);
  reset role;
  perform set_config('request.jwt.claims', '', true);
  if p_traiter then perform private.filed_traiter(10); end if;
end $$;

create or replace function tests.test_a4_90_01_refus_ferme_imputation() returns setof text
language plpgsql as $f$
declare o jsonb := tests.a4_organisation(); v_c uuid; f uuid; v_val uuid; v_imp uuid;
begin
  v_c := tests.a4_compte(o, '606300', 'Petit équipement');
  f := tests.a4_facture_imputee(o, 'LIE-001', 928.20, v_c);
  select demande_id into v_val from public.filed_validations where facture_id = f and issue is null;
  select demande_id into v_imp from public.filed_imputations where facture_id = f and statut = 'proposee';
  return next ok(v_val is not null and v_imp is not null, 'Une demande de validation et une demande d''imputation');
  perform tests.a4_decider((o ->> 'valideur')::uuid, v_val, 'rejete', 'TVA à 19 % non justifiée.', true);
  return next ok((select statut from public.filed_factures where id = f) = 'refusee', 'La facture est refusée');
  return next is((select statut from public.demandes_validation where id = v_imp), 'annulee', 'Sa demande d''imputation est fermée');
  return next is((select statut || ' / ' || motif from public.filed_imputations where demande_id = v_imp),
                 'refusee / Fermée au refus de la facture', 'Son imputation proposée est fermée, motif écrit');
  return next throws_like(format($$select tests.a4_decider(%L, %L, 'approuve', null, false)$$, o ->> 'valideur', v_imp),
                          '%n''est plus en attente%', 'Elle ne s''approuve plus');
end $f$;

create or replace function tests.test_a4_90_02_approuvee_jamais_executee() returns setof text
language plpgsql as $f$
declare o jsonb := tests.a4_organisation(); v_c uuid; f uuid; v_imp uuid;
begin
  -- L'imputation est approuvée, la file ne l'a pas encore exécutée, et la facture est refusée entre-temps.
  v_c := tests.a4_compte(o, '606300', 'Petit équipement');
  f := tests.a4_facture_imputee(o, 'LIE-002', 412.50, v_c);
  select demande_id into v_imp from public.filed_imputations where facture_id = f and statut = 'proposee';
  perform tests.a4_decider((o ->> 'valideur')::uuid, v_imp, 'approuve', null, false);
  update public.filed_factures set statut = 'refusee' where id = f;
  perform private.filed_traiter(10);
  return next is((select statut from public.demandes_validation where id = v_imp), 'echec_execution',
                 'Approuvée sur une facture refusée : elle ne s''exécute pas');
  return next ok(not exists (select 1 from public.filed_imputations where facture_id = f and statut = 'validee'),
                 'Aucune imputation validée sur la facture refusée');
end $f$;

create or replace function tests.test_a4_90_03_reprise_retrouve_imputation() returns setof text
language plpgsql as $f$
declare o jsonb := tests.a4_organisation(); v_cl uuid := (o ->> 'client')::uuid; v_c uuid; fa jsonb; f uuid; v_val uuid; v_new public.filed_imputations;
begin
  -- Une facture lue en entier, imputée, refusée avec un commentaire, corrigée par le gérant : la reprise aboutit.
  v_c := tests.a4_compte(o, '606300', 'Petit équipement');
  fa := tests.a4_facture(o, 'ia', 'LIE-003', 1200);
  f := (fa ->> 'facture')::uuid;
  insert into public.pieces_valeurs (client_id, piece_id, champ, valeur, texte, source, confiance, verifiee)
  select v_cl, (fa ->> 'piece')::uuid, x.champ, x.valeur, x.valeur #>> '{}', 'ia', 1, true
    from (values ('date', to_jsonb('2026-09-28'::text)), ('montant_ht', to_jsonb(1000)), ('montant_tva', to_jsonb(200)),
                 ('fournisseur.siren', to_jsonb('123456782'::text))) x(champ, valeur);
  perform private.filed_integrer_facture((fa ->> 'document')::uuid);
  perform private.filed_proposer_imputation(f, 'recurrente', v_c);
  select demande_id into v_val from public.filed_validations where facture_id = f and issue is null;
  perform tests.a4_decider((o ->> 'valideur')::uuid, v_val, 'rejete', 'Le montant TTC est faux.', true);
  perform tests.a4_comme((o ->> 'gerant')::uuid);
  perform public.filed_corriger_facture(f, '{"montant_ht": 1050, "montant_tva": 210, "montant_ttc": 1260}', 'Facture rectificative.');
  reset role;
  perform set_config('request.jwt.claims', '', true);
  perform private.filed_traiter_reprises();
  select * into v_new from public.filed_imputations where facture_id = f and statut = 'proposee';
  return next ok((select statut from public.filed_factures where id = f) = 'a_valider'
                 and v_new.compte_id = v_c and v_new.montant_ht = 1050
                 and (select statut from public.demandes_validation where id = v_new.demande_id) = 'en_attente',
                 'Reprise : l''imputation est proposée de nouveau, au montant corrigé, avec une demande ouverte');
  return next ok(exists (select 1 from public.filed_imputations where facture_id = f and statut = 'remplacee'),
                 'L''imputation fermée au refus est marquée remplacée');
end $f$;
