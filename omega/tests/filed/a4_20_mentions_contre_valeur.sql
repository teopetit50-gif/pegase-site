-- Tests A4 — lot 19 (a4_27) : les champs du lecteur v24 (mentions de paiement, TVA sur les débits, contre-valeur en euros).
-- pgTAP, schéma « tests » d'A5 ; utilise tests.a4_organisation, tests.a4_facture (a4_10_facture_electronique.sql),
-- tests.a4_compte, tests.a4_imputer (a4_11_ecritures_fec.sql), tests.a4_inserer (a4_16_rapprochement_3voies.sql). `select * from runtests('tests', '^test_a4_')` ;
-- runtests() annule tout. Données d'exemple seulement.

-- Une valeur lue sur la pièce d'une facture (source donnée ; « humain » passe devant le lecteur).
create or replace function tests.a4_valeur(p_fac jsonb, p_champ text, p_valeur jsonb, p_source text default 'ia') returns void
language sql as $$
  insert into public.pieces_valeurs (client_id, piece_id, champ, valeur, texte, source, confiance, verifiee)
  select p.client_id, p.id, p_champ, p_valeur, p_valeur #>> '{}', p_source, 0.9, p_source = 'humain'
    from public.pieces p where p.id = (p_fac ->> 'piece')::uuid
$$;

-- Le résultat d'un contrôle : 'anomalie' ou 'ok' (ce qu'écrit filed_poser_resultat), nul s'il n'est pas posé.
create or replace function tests.a4_controle(p_fac jsonb, p_code text) returns text language sql stable as $$
  select c.resultat from public.filed_controles c where c.facture_id = (p_fac ->> 'facture')::uuid and c.code = p_code
$$;

create or replace function tests.test_a4_27_01_mentions_lues() returns setof text
language plpgsql as $f$
declare o jsonb := tests.a4_organisation(); fa jsonb; fb jsonb;
begin
  fa := tests.a4_facture(o, 'ia', 'MEN-001', 120);
  perform tests.a4_valeur(fa, 'mention.escompte', '"Pas d''escompte pour paiement anticipé"');
  perform tests.a4_valeur(fa, 'mention.indemnite_recouvrement', 'true');
  perform tests.a4_valeur(fa, 'indemnite_recouvrement.montant', '30');
  perform private.filed_controler_facture((fa ->> 'facture')::uuid);
  return next is(tests.a4_controle(fa, 'mentions.penalites'), 'anomalie', 'Pénalités de retard absentes : attention');
  return next is(tests.a4_controle(fa, 'mentions.indemnite'), 'anomalie', 'Indemnité de 30 € : sous les 40 € légaux');
  return next isnt(tests.a4_controle(fa, 'mentions.escompte'), 'anomalie', 'L''escompte est mentionné');
  return next is((select mentions ->> 'escompte' from public.filed_factures where id = (fa ->> 'facture')::uuid),
                 'Pas d''escompte pour paiement anticipé', 'et recopié dans les mentions de la facture');
  return next is((select gravite from public.filed_controles where facture_id = (fa ->> 'facture')::uuid and code = 'mentions.penalites'), 'attention',
                 'jamais bloquant');

  perform tests.a4_valeur(fa, 'mention.penalites', '"Taux BCE majoré de 10 points"', 'humain');
  perform tests.a4_valeur(fa, 'penalites.taux', '"13,5"', 'humain');
  perform tests.a4_valeur(fa, 'indemnite_recouvrement.montant', '40', 'humain');
  perform private.filed_controler_facture((fa ->> 'facture')::uuid);
  return next is(tests.a4_controle(fa, 'mentions.penalites'), 'ok', 'Corrigées par une personne : les pénalités passent');
  return next ok(exists (select 1 from public.filed_controles where facture_id = (fa ->> 'facture')::uuid and code = 'mentions.penalites' and message = 'Pénalités de retard : 13,5 %.'),
                 'avec leur taux');
  return next is(tests.a4_controle(fa, 'mentions.indemnite'), 'ok', 'l''indemnité de 40 € aussi');

  fb := tests.a4_facture(o, 'ia', 'MEN-002', 120);
  update public.filed_fournisseurs set pays = 'DE' where id = (o ->> 'fournisseur')::uuid;
  perform tests.a4_valeur(fb, 'mention.escompte', '"Kein Skonto"');
  perform private.filed_controler_facture((fb ->> 'facture')::uuid);
  return next is(tests.a4_controle(fb, 'mentions.penalites'), null, 'Fournisseur étranger : le code de commerce ne s''applique pas');

  fb := tests.a4_facture(o, 'ia', 'MEN-003', 120);
  update public.filed_fournisseurs set pays = 'FR' where id = (o ->> 'fournisseur')::uuid;
  perform private.filed_controler_facture((fb ->> 'facture')::uuid);
  return next is(tests.a4_controle(fb, 'mentions.penalites'), null, 'Lecture sans les champs v24 ni texte de pages : on ne juge pas');
end $f$;

create or replace function tests.test_a4_27_02_texte_des_pages() returns setof text
language plpgsql as $f$
declare o jsonb := tests.a4_organisation(); fa jsonb;
begin
  fa := tests.a4_facture(o, 'ia', 'MEN-010', 120);
  perform tests.a4_inserer('public.pieces_pages', jsonb_build_object('client_id', o ->> 'client', 'piece_id', fa ->> 'piece', 'n', 1, 'texte',
    'Pénalités de retard : trois fois le taux d''intérêt légal. Indemnité forfaitaire pour frais de recouvrement : 40 €. '
    || 'Option pour le paiement de la taxe d''après les débits.'));
  perform private.filed_controler_facture((fa ->> 'facture')::uuid);
  return next is(tests.a4_controle(fa, 'mentions.penalites'), 'ok', 'Pénalités reconnues dans le texte');
  return next is(tests.a4_controle(fa, 'mentions.indemnite'), 'ok', 'indemnité aussi');
  return next is(tests.a4_controle(fa, 'mentions.escompte'), 'anomalie', 'l''escompte manque : info');
  return next is((select gravite from public.filed_controles where facture_id = (fa ->> 'facture')::uuid and code = 'mentions.escompte'), 'info', 'seulement info');
  return next is((select (mentions ->> 'tva_debits')::boolean from public.filed_factures where id = (fa ->> 'facture')::uuid), true,
                 'L''option pour la TVA d''après les débits est notée');
  return next is(tests.a4_controle(fa, 'tva.debits'), 'ok', 'et signalée');
end $f$;

create or replace function tests.test_a4_27_03_contre_valeur() returns setof text
language plpgsql as $f$
declare o jsonb := tests.a4_organisation(); fa jsonb; v_f uuid;
begin
  set local role service_role;
  perform public.filed_poser_taux_change('USD', date '2026-09-28', 1.1);
  perform public.filed_poser_taux_change('USD', current_date, 1.2);
  reset role;

  fa := tests.a4_facture(o, 'ia', 'USD-101', 1200);
  v_f := (fa ->> 'facture')::uuid;
  update public.filed_factures set devise = 'USD', montant_ht = 1000, montant_tva = 200, montant_ttc = 1200, date_emission = date '2026-09-28' where id = v_f;
  perform private.filed_controler_facture(v_f);
  return next is(tests.a4_controle(fa, 'devise.tva_eur'), 'anomalie', 'En devise, sans la TVA en euros : attention');

  perform tests.a4_valeur(fa, 'contre_valeur.montant_tva_eur', '181.67');
  perform tests.a4_valeur(fa, 'contre_valeur.montant_ttc_eur', '"1 090,00"');
  perform private.filed_controler_facture(v_f);
  return next is(tests.a4_controle(fa, 'devise.tva_eur'), 'ok', 'Avec la TVA en euros lue : rien à redire');
  return next is((select private.filed_taux_facture_source(f) from public.filed_factures f where f.id = v_f), 'TTC en euros de la pièce',
                 'Le taux vient du TTC en euros imprimé');

  perform tests.a4_imputer(fa, tests.a4_compte(o, '6061', 'Fournitures non stockables'), 1000);
  update public.filed_factures set statut = 'validee' where id = v_f;
  update public.filed_factures set statut = 'comptabilisee' where id = v_f;
  return next is((select debit from public.filed_ecritures where facture_id = v_f and compte_num = '44566'), 181.67::numeric,
                 'La TVA déductible est celle lue en euros');
  return next is((select credit from public.filed_ecritures where facture_id = v_f and compte_num = '401' and origine = 'facture'), 1090.00::numeric,
                 'Le fournisseur porte le TTC en euros de la pièce');
  return next is((select sum(debit) - sum(credit) from public.filed_ecritures where facture_id = v_f), 0.00::numeric, 'équilibrée');

  insert into public.filed_reglements (client_id, facture_id, document_id, regle_le, montant, mode, reference)
  values ((o ->> 'client')::uuid, v_f, (fa ->> 'document')::uuid, current_date, 1200, 'virement', 'VIR-USD-101');
  return next is((select debit from public.filed_ecritures where facture_id = v_f and origine = 'reglement' and compte_num = '401'), 1090.00::numeric,
                 'Le règlement solde le fournisseur à sa valeur d''achat');
  return next is((select credit from public.filed_ecritures where facture_id = v_f and origine = 'reglement' and compte_num = '766'), 90.00::numeric,
                 'l''écart au cours du jour va en gain de change');
  return next ok((select ecriture_let from public.filed_ecritures where facture_id = v_f and compte_num = '401' and origine = 'facture') is not null,
                 'et le fournisseur est lettré');
end $f$;

create or replace function tests.test_a4_27_04_taux_aberrant() returns setof text
language plpgsql as $f$
declare o jsonb := tests.a4_organisation(); fa jsonb; v_f uuid;
begin
  set local role service_role;
  perform public.filed_poser_taux_change('USD', date '2026-09-28', 1.1);
  reset role;
  fa := tests.a4_facture(o, 'ia', 'USD-102', 1200);
  v_f := (fa ->> 'facture')::uuid;
  update public.filed_factures set devise = 'USD', montant_ht = 1000, montant_tva = 200, montant_ttc = 1200, date_emission = date '2026-09-28' where id = v_f;
  perform tests.a4_valeur(fa, 'contre_valeur.taux_change', '0.9091');
  perform private.filed_controler_facture(v_f);
  return next is((select round(private.filed_taux_facture(f), 4) || ' ' || private.filed_taux_facture_source(f) from public.filed_factures f where f.id = v_f),
                 '1.1000 taux de la pièce', 'Un taux « 1 USD = 0,9091 € » est lu dans le bon sens');
  perform tests.a4_valeur(fa, 'contre_valeur.taux_change', '5', 'humain');
  perform private.filed_controler_facture(v_f);
  return next is((select private.filed_taux_facture_source(f) from public.filed_factures f where f.id = v_f), 'BCE',
                 'Un taux lu à plus de 10 % du cours BCE est écarté');
  return next ok(not has_function_privilege('authenticated', 'private.filed_controles_mentions(public.filed_factures)', 'execute'),
                 'Le contrôle n''est pas ouvert aux membres');
end $f$;
