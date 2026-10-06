-- Tests A4 — lot 11 (a4_18) : les portes de l'ouvrier echange-pa (A2).
-- pgTAP, schéma « tests » d'A5 ; utilise tests.a4_organisation, tests.a4_facture et tests.a4_facture_pa
-- (a4_10_facture_electronique.sql, à poser avant). `select * from runtests('tests', '^test_a4_')`. runtests() annule tout.

-- Un SIREN juste à la clé de Luhn, tiré au sort (jamais vu sur la recette).
create or replace function tests.a4_siren_aleatoire() returns text
language plpgsql volatile as $$
declare v text := lpad((floor(random() * 99999999))::bigint::text, 8, '0'); s int := 0; d int; i int; k int;
begin
  for k in 0..9 loop
    s := 0;
    for i in 1..9 loop
      d := substr(v || k::text, i, 1)::int;
      if i % 2 = 0 then d := d * 2; if d > 9 then d := d - 9; end if; end if;
      s := s + d;
    end loop;
    if s % 10 = 0 then return v || k::text; end if;
  end loop;
  return null;
end $$;

create or replace function tests.test_a4_18_01_droits() returns setof text
language plpgsql as $f$
declare f text;
begin
  foreach f in array array['public.pa_commencer_statut(uuid)', 'public.pa_noter_statut(uuid, text, timestamptz)',
    'public.pa_echouer_statut(uuid, text, boolean)', 'public.pa_commencer_depot(uuid)', 'public.pa_curseur()',
    'public.pa_poser_curseur(timestamptz)', 'public.pa_noter_flux(text, text, text, text, text, text, timestamptz, text, text, jsonb, text)',
    'public.pa_deposer_facture(bigint, bigint)'] loop
    return next ok(not has_function_privilege('authenticated', f, 'execute') and not has_function_privilege('anon', f, 'execute')
                   and has_function_privilege('service_role', f, 'execute'), f || ' : service_role seul');
  end loop;
end $f$;

create or replace function tests.test_a4_18_02_statut_a_emettre() returns setof text
language plpgsql as $f$
declare o jsonb := tests.a4_organisation(); s jsonb; l jsonb; v_suivi uuid; r jsonb;
begin
  update public.entites set siren = '123456782', nom = 'Société acheteuse d''exemple' where id = (o ->> 'entite')::uuid;
  s := tests.a4_facture_pa(o, 'xml', 'PA-2026-001');
  l := tests.a4_facture(o, 'xml', 'MAIL-2026-001');
  select suivi into v_suivi from public.filed_cycle_vie where facture_id = (s ->> 'facture')::uuid and code = 204;
  return next ok(exists (select 1 from public.travaux where cle = 'pa.statut:' || v_suivi::text and genre = 'pa.statut'
                          and charge ->> 'statut' = v_suivi::text), 'Reçue par la PA : travail pa.statut déposé, charge {statut: suivi}');
  return next is((select etat from public.filed_cycle_vie where facture_id = (l ->> 'facture')::uuid and code = 204), 'sans_objet',
                 'Factur-X reçue par courriel : statut au journal seulement');
  r := public.pa_commencer_statut(v_suivi);
  return next is((r ->> 'envoyer')::boolean, true, 'pa_commencer_statut : à envoyer');
  return next is((r ->> 'statut')::int, 204, 'code 204');
  return next is(r -> 'cdar' -> 'emetteur' ->> 'role', 'BY', 'Omega émet pour l''acheteur (BY)');
  return next is(r -> 'cdar' -> 'emetteur' ->> 'siren', '123456782', 'SIREN de la société acheteuse');
  return next is(r -> 'cdar' -> 'destinataire' ->> 'role', 'SE', 'vers le vendeur (SE)');
  return next is(r -> 'cdar' -> 'facture' ->> 'numero', 'PA-2026-001', 'numéro de la facture');
  return next is(r -> 'cdar' -> 'facture' ->> 'type_code', '380', 'type 380');
  return next is((select etat from public.filed_cycle_vie where suivi = v_suivi), 'en_cours', 'verrouillé : en cours');
  perform public.pa_noter_statut(v_suivi, 'FLUX-S1', now());
  return next is((select etat || ':' || flux_pa from public.filed_cycle_vie where suivi = v_suivi), 'emis:FLUX-S1', 'Noté : émis, avec son flux');
  perform public.pa_noter_statut(v_suivi, 'FLUX-S1-BIS', now());
  return next is((select flux_pa from public.filed_cycle_vie where suivi = v_suivi), 'FLUX-S1', 'Rejoué : rien ne change');
  return next is((public.pa_commencer_statut(v_suivi) ->> 'envoyer')::boolean, false, 'Déjà émis : pas renvoyé');
  return next is((public.pa_commencer_statut(gen_random_uuid()) ->> 'envoyer')::boolean, false, 'Statut inconnu : pas envoyé');
end $f$;

create or replace function tests.test_a4_18_03_motif_montant_echec() returns setof text
language plpgsql as $f$
declare o jsonb := tests.a4_organisation(); s jsonb; v_f uuid; v_suivi uuid; r jsonb;
begin
  s := tests.a4_facture_pa(o, 'xml', 'PA-2026-002');
  v_f := (s ->> 'facture')::uuid;
  update public.filed_factures set statut = 'refusee' where id = v_f;
  select suivi into v_suivi from public.filed_cycle_vie where facture_id = v_f and code = 210;
  r := public.pa_commencer_statut(v_suivi);
  return next is(r -> 'cdar' -> 'motif' ->> 'code', 'AUTRE', 'Refus : motif normalisé dans le CDAR');
  perform public.pa_echouer_statut(v_suivi, 'Plateforme injoignable', false);
  return next is((select etat from public.filed_cycle_vie where suivi = v_suivi), 'a_emettre', 'Échec passager : de nouveau à émettre');
  perform public.pa_echouer_statut(v_suivi, 'Refus de la plateforme', true);
  return next is((select etat from public.filed_cycle_vie where suivi = v_suivi), 'echec', 'Échec définitif : échec');

  s := tests.a4_facture_pa(o, 'xml', 'PA-2026-003');
  update public.filed_factures set statut = 'validee' where id = (s ->> 'facture')::uuid;
  insert into public.filed_reglements (client_id, facture_id, document_id, regle_le, montant, mode, reference)
  values ((o ->> 'client')::uuid, (s ->> 'facture')::uuid, (s ->> 'document')::uuid, current_date, 120, 'virement', 'VIR-PA');
  select suivi into v_suivi from public.filed_cycle_vie where facture_id = (s ->> 'facture')::uuid and code = 211;
  r := public.pa_commencer_statut(v_suivi);
  return next is((r -> 'cdar' -> 'montant' ->> 'valeur')::numeric, 120.00::numeric, 'Paiement transmis : montant dans le CDAR');
  return next is(r -> 'cdar' -> 'montant' ->> 'devise', 'EUR', 'et sa devise');
end $f$;

create or replace function tests.test_a4_18_04_depot_et_curseur() returns setof text
language plpgsql as $f$
declare t timestamptz := date_trunc('second', now()) - interval '3 days';
begin
  return next is((public.pa_commencer_depot(gen_random_uuid()) ->> 'deposer')::boolean, false, 'Dépôt de facture émise : non pris en charge');
  return next throws_ok($$select public.pa_noter_depot(gen_random_uuid(), 'X', now())$$, '0A000', null, 'pa_noter_depot le dit');
  perform public.pa_poser_curseur(t);
  return next is(public.pa_curseur(), t, 'Le curseur posé se relit');
end $f$;

create or replace function tests.test_a4_18_05_flux_sortant() returns setof text
language plpgsql as $f$
declare o jsonb := tests.a4_organisation(); s jsonb; v_suivi uuid; r jsonb; v_suivi2 uuid;
begin
  s := tests.a4_facture_pa(o, 'xml', 'PA-2026-004');
  select suivi into v_suivi from public.filed_cycle_vie where facture_id = (s ->> 'facture')::uuid and code = 204;
  perform public.pa_commencer_statut(v_suivi);
  r := public.pa_noter_flux('FLUX-A', 'sortant', 'CustomerInvoiceLC', 'CDAR', v_suivi::text, 'ok', now(), null, null, '{}', 'pa:FLUX-A:t1:ok');
  return next is((r ->> 'nouveau')::boolean, true, 'Accusé noté');
  return next is((select etat from public.filed_cycle_vie where suivi = v_suivi), 'emis', 'Accusé ok : émis (rapprochement par trackingId)');
  r := public.pa_noter_flux('FLUX-A', 'sortant', 'CustomerInvoiceLC', 'CDAR', v_suivi::text, 'ok', now(), null, null, '{}', 'pa:FLUX-A:t1:ok');
  return next is((r ->> 'nouveau')::boolean, false, 'Même clé : pas de second enregistrement');

  update public.filed_factures set statut = 'validee' where id = (s ->> 'facture')::uuid;
  select suivi into v_suivi2 from public.filed_cycle_vie where facture_id = (s ->> 'facture')::uuid and code = 205;
  perform public.pa_noter_flux('FLUX-B', 'sortant', 'CustomerInvoiceLC', 'CDAR', v_suivi2::text, 'erreur', now(), null, null,
                               '{"details": "Destinataire inconnu"}', 'pa:FLUX-B:t1:erreur');
  return next is((select etat from public.filed_cycle_vie where suivi = v_suivi2), 'echec', 'Accusé en erreur : échec');
  return next ok((select erreur from public.filed_cycle_vie where suivi = v_suivi2) like '%Destinataire inconnu%', 'avec le motif de la plateforme');
  r := public.pa_noter_flux('FLUX-C', 'sortant', 'CustomerInvoiceLC', 'CDAR', gen_random_uuid()::text, 'ok', now(), null, null, '{}', 'pa:FLUX-C:t1:ok');
  return next is(r ->> 'etat', 'sans_suite', 'Accusé d''un flux inconnu : sans suite');
end $f$;

create or replace function tests.test_a4_18_06_facture_entrante() returns setof text
language plpgsql as $f$
declare o jsonb := tests.a4_organisation(); v_siren text := tests.a4_siren_aleatoire(); r jsonb; r2 jsonb; v_id bigint; d jsonb;
begin
  update public.entites set siren = v_siren where id = (o ->> 'entite')::uuid;
  r := public.pa_noter_flux('FLUX-IN-1', 'entrant', 'SupplierInvoice', 'UBL', null, 'ok', now(), '_pa/entrants/FLUX-IN-1/facture.xml',
                            repeat('a', 64), jsonb_build_object('acheteur_siren', v_siren), 'pa:FLUX-IN-1:t1:ok');
  return next is(r ->> 'etat', 'rattache', 'Acheteur retrouvé par son SIREN : rattachée');
  return next is(r ->> 'client_id', o ->> 'client', 'au bon client');
  return next is(r ->> 'chemin_cible', (o ->> 'client') || '/filed_document/' || (r ->> 'document') || '/facture.xml',
                 'chemin_cible sous <client>/filed_document/<document>/');
  r2 := public.pa_noter_flux('FLUX-IN-1', 'entrant', 'SupplierInvoice', 'UBL', null, 'ok', now() + interval '1 minute', '_pa/entrants/FLUX-IN-1/facture.xml',
                             repeat('a', 64), jsonb_build_object('acheteur_siren', v_siren), 'pa:FLUX-IN-1:t2:ok');
  return next is(r2 ->> 'document', r ->> 'document', 'Le même flux relevé deux fois garde son document');
  r2 := public.pa_noter_flux('FLUX-IN-2', 'entrant', 'SupplierInvoice', 'UBL', null, 'ok', now(), '_pa/entrants/FLUX-IN-2/f.xml',
                             repeat('b', 64), jsonb_build_object('acheteur_siren', tests.a4_siren_aleatoire()), 'pa:FLUX-IN-2:t1:ok');
  return next is(r2 ->> 'etat', 'orphelin', 'SIREN inconnu : orphelin');
  if to_regprocedure('private.filed_deposer_piece(uuid, uuid, text, text, bigint, text, text, uuid, text, text)') is not null then
    set local role service_role;
    perform set_config('request.jwt.claims', json_build_object('role', 'service_role')::text, true);
    d := public.pa_deposer_facture((r ->> 'id')::bigint, 2048);
    reset role;
    return next is(d ->> 'document', r ->> 'document', 'Déposée dans FILED sous le document réservé');
    return next is((select source from public.filed_documents where id = (r ->> 'document')::uuid), 'connecteur', 'source connecteur');
    return next is((select etat from public.filed_pa_flux where id = (r ->> 'id')::bigint), 'depose', 'Flux déposé');
    return next ok(private.filed_recue_par_pa((r ->> 'document')::uuid), 'La facture compte comme reçue par la plateforme');
  else
    return next skip('private.filed_deposer_piece absente (souche locale)', 4);
  end if;
end $f$;

create or replace function tests.test_a4_18_07_statut_entrant() returns setof text
language plpgsql as $f$
declare o jsonb := tests.a4_organisation(); s jsonb; r jsonb;
begin
  s := tests.a4_facture_pa(o, 'xml', 'PA-2026-005');
  r := public.pa_noter_flux('FLUX-LC-1', 'entrant', 'SupplierInvoiceLC', 'CDAR', null, 'ok', now(), null, null,
    '{"cdar": {"message": "M1", "code": "212", "libelle": "Encaissée", "facture": {"numero": "PA-2026-005", "emetteur_siren": "123456782"}}}',
    'pa:FLUX-LC-1:t1:ok');
  return next is(r ->> 'facture', s ->> 'facture', 'CDAR rapproché de la facture reçue');
  return next ok(exists (select 1 from public.filed_cycle_vie where facture_id = (s ->> 'facture')::uuid and code = 212 and sens = 'recu' and etat = 'sans_objet'),
                 'Au cycle de vie : 212 reçu, jamais réémis');
  r := public.pa_noter_flux('FLUX-LC-2', 'entrant', 'SupplierInvoiceLC', 'CDAR', null, 'ok', now(), null, null,
    '{"cdar": {"code": "212", "facture": {"numero": "INCONNUE", "emetteur_siren": "123456782"}}}', 'pa:FLUX-LC-2:t1:ok');
  return next is(r ->> 'etat', 'orphelin', 'CDAR d''une facture inconnue : orphelin');
end $f$;
