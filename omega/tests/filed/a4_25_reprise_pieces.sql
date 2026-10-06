-- Tests A4 — lot 24 (a4_32) : une pièce de l'historique repris, retrouvée dans le FEC, sort d'elle-même du circuit.
-- pgTAP, schéma « tests » d'A5 ; utilise tests.a4_organisation, tests.a4_facture (a4_10), tests.a4_siren_aleatoire (a4_12),
-- tests.a4_fec_2024, tests.a4_agir (a4_17_reprise_exercices.sql). runtests() annule tout. Données d'exemple seulement.

-- Une organisation qui a repris son FEC 2024, et le fournisseur Delorme lié à son tiers. Rend {org, fournisseur}.
create or replace function tests.a4_reprise_2024() returns jsonb
language plpgsql as $$
declare o jsonb := tests.a4_organisation(); v_s text := tests.a4_siren_aleatoire(); v_f jsonb; v_four uuid;
begin
  update public.entites set siren = v_s where id = (o ->> 'entite')::uuid;
  v_f := jsonb_build_array(jsonb_build_object('nom_fichier', v_s || 'FEC20241231.txt', 'contenu', tests.a4_fec_2024()));
  perform tests.a4_agir((o ->> 'gerant')::uuid);
  perform public.filed_reprendre_historique((o ->> 'client')::uuid, (o ->> 'entite')::uuid, v_f);
  reset role;
  insert into public.filed_fournisseurs (client_id, code, nom, nom_normalise, pays, statut, source, siren)
  values ((o ->> 'client')::uuid, 'PDEL', 'PAPETERIE DELORME', 'papeterie delorme', 'FR', 'actif', 'saisie', tests.a4_siren_aleatoire())
  returning id into v_four;
  return o || jsonb_build_object('delorme', v_four);
end $$;

-- Une facture de Delorme, à son numéro et sa date, contrôlée. Rend {piece, document, facture}.
create or replace function tests.a4_facture_delorme(p_org jsonb, p_numero text, p_date date) returns jsonb
language plpgsql as $$
declare fa jsonb := tests.a4_facture(p_org, 'ia', p_numero, 120);
begin
  update public.filed_factures set fournisseur_id = (p_org ->> 'delorme')::uuid, date_emission = p_date, statut = 'a_completer'
   where id = (fa ->> 'facture')::uuid;
  perform private.filed_controler_facture((fa ->> 'facture')::uuid);
  return fa;
end $$;

create or replace function tests.test_a4_32_01_piece_historique() returns setof text
language plpgsql as $f$
declare o jsonb := tests.a4_reprise_2024(); fa jsonb; v_f uuid;
begin
  fa := tests.a4_facture_delorme(o, 'FA 2024 001', date '2024-03-15');
  v_f := (fa ->> 'facture')::uuid;
  return next is((select statut from public.filed_factures where id = v_f), 'ecartee', 'Retrouvée dans le FEC repris : écartée d''elle-même');
  return next ok(exists (select 1 from public.filed_archives where facture_id = v_f), 'archivée à valeur probante');
  return next ok(exists (select 1 from public.filed_historique where objet_id = v_f::text and etape = 'reprise_historique'
                          and message like '%écriture HA 2 du 15/03/2024%'), 'liée à son écriture d''origine');
  return next ok(exists (select 1 from public.journal_opposable where client_id = (o ->> 'client')::uuid and action = 'filed.reprise_piece'), 'au journal');
  return next is((select count(*) from public.demandes_validation where objet_id = v_f::text and statut = 'en_attente'), 0::bigint, 'aucune validation demandée');
  return next is((select count(*) from public.filed_ecritures where facture_id = v_f), 0::bigint, 'aucune écriture');
  perform private.filed_controler_facture(v_f);
  return next is((select statut from public.filed_factures where id = v_f), 'ecartee', 'Recontrôlée : toujours écartée');
  return next is((select count(*) from public.filed_historique where objet_id = v_f::text and etape = 'reprise_historique'), 1::bigint,
                 'sans historique en double');
end $f$;

create or replace function tests.test_a4_32_02_hors_historique() returns setof text
language plpgsql as $f$
declare o jsonb := tests.a4_reprise_2024(); fa jsonb; fb jsonb; r jsonb;
begin
  fa := tests.a4_facture_delorme(o, 'FA-2024-999', date '2024-05-02');
  return next isnt((select statut from public.filed_factures where id = (fa ->> 'facture')::uuid), 'ecartee',
                   'Une pièce de la période sans écriture dans le FEC reste dans le circuit');
  fb := tests.a4_facture_delorme(o, 'FA 2024 077', date '2026-09-28');
  return next is((select statut from public.filed_factures where id = (fb ->> 'facture')::uuid), 'bloquee',
                 'Un doublon daté hors des exercices repris reste bloqué : une personne regarde');
  perform tests.a4_facture_delorme(o, 'FA 2024 001', date '2024-03-15');
  perform tests.a4_agir((o ->> 'gerant')::uuid);
  r := public.filed_etat_reprise((o ->> 'client')::uuid, (o ->> 'entite')::uuid) -> 0;
  reset role;
  return next is((r ->> 'pieces')::int || '/' || (r ->> 'rapprochees') || '/' || (r ->> 'a_regarder'), '2/1/1',
                 'État : deux pièces de la période, une rapprochée, une à regarder');
  return next is((r ->> 'achats_sans_piece')::int, 1, 'et l''achat du FEC dont la pièce manque (l''ordinateur de Pomme)');
end $f$;
