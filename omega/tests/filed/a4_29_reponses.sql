-- Tests A4 — lot 30 (a4_38) : « rédige ce qui repart » — FILED rédige, une personne valide, rien ne part seul.
-- pgTAP, schéma « tests » d'A5 ; utilise tests.a4_organisation, tests.a4_facture (a4_10_facture_electronique.sql),
-- tests.a4_comme (a4_26_sortie_envois.sql), tests.a4_inserer (a4_16_rapprochement_3voies.sql), à poser avant. `select * from runtests('tests', '^test_a4_')` ;
-- runtests() annule tout. Données d'exemple seulement.
--
-- Sur une base où l'envoi par courriel existe (recette), le courriel est préparé adossé à la demande : il est
-- « a_valider » tant qu'aucune personne n'a approuvé, ou « bloque » si le socle le verrouille d'emblée (adresse,
-- réglage) — jamais en route. Ailleurs, le brouillon est « non_reglee » (à envoyer à la main).

-- Le statut de l'envoi d'une réponse (null s'il n'y en a pas, ou si la base n'a pas d'envois).
create or replace function tests.a4_statut_envoi(p_reponse uuid) returns text language plpgsql stable as $$
declare v text;
begin
  if to_regclass('public.envois') is null then return null; end if;
  execute 'select e.statut from public.envois e join public.filed_reponses r on r.envoi_id = e.id where r.id = $1' into v using p_reponse;
  return v;
end $$;

-- Une personne approuve (ou rejette) la demande d'une réponse, puis FILED exécute la décision.
create or replace function tests.a4_decider_reponse(p_org jsonb, p_reponse uuid, p_decision text, p_commentaire text default null) returns void
language plpgsql as $$
declare v_dem uuid := (select demande_id from public.filed_reponses where id = p_reponse);
begin
  perform set_config('request.jwt.claims', json_build_object('sub', p_org ->> 'gerant', 'role', 'authenticated')::text, true);
  set local role authenticated;
  insert into public.approbations (demande_id, decision, commentaire) values (v_dem, p_decision, p_commentaire);
  reset role;
  perform set_config('request.jwt.claims', '', true);
  perform private.filed_traiter(10);
end $$;

create or replace function tests.test_a4_38_01_piece_manquante() returns setof text
language plpgsql as $f$
declare o jsonb := tests.a4_organisation(); fa jsonb; v_col uuid := gen_random_uuid(); v_r uuid; v_rep public.filed_reponses; v_p uuid; v_doc uuid;
begin
  insert into auth.users (id, email, instance_id, aud, role, encrypted_password, created_at, updated_at)
  values (v_col, 'comptable@exemple.test', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', '', now(), now());
  insert into public.comptes (user_id, client_id, role) values (v_col, (o ->> 'client')::uuid, 'collaborateur');
  -- Un message reçu sans facture lisible, avec son expéditeur (le journal des pièces reçues est figé : on le pose à l'arrivée).
  v_p := tests.a4_inserer('public.pieces', jsonb_build_object('client_id', o ->> 'client', 'module', 'filed', 'source', 'courriel', 'nom_fichier', 'message.eml',
    'mime', 'message/rfc822', 'octets', 512, 'sha256', repeat('e', 64), 'chemin', (o ->> 'client') || '/filed_document/test/message.eml'));
  v_doc := tests.a4_inserer('public.filed_documents', jsonb_build_object('client_id', o ->> 'client', 'entite_id', o ->> 'entite', 'annee_reception', 2026,
    'numero_reception', 900001, 'piece_id', v_p, 'source', 'courriel', 'nom_fichier', 'message.eml', 'sha256', repeat('e', 64),
    'expediteur', 'Service compta <Compta@Fournisseur-Exemple.test>'));
  fa := jsonb_build_object('document', v_doc);

  reset role; perform tests.a4_comme(v_col);
  v_r := public.filed_preparer_reponse((fa ->> 'document')::uuid, 'piece_manquante');
  reset role;
  select * into v_rep from public.filed_reponses where id = v_r;
  return next is(v_rep.destinataire_adresse, 'compta@fournisseur-exemple.test', 'Le destinataire est l''expéditeur du message');
  return next ok(v_rep.corps like '%notre référence R2026-%' and v_rep.corps like '%format PDF%', 'Le brouillon cite la référence de réception et demande la pièce');
  return next ok(v_rep.statut in ('a_valider', 'non_reglee'), 'Il attend une personne : ' || v_rep.statut);
  return next is((select type_action || ':' || statut from public.demandes_validation where id = v_rep.demande_id), 'filed.repondre:en_attente',
                 'Une demande de validation « filed.repondre » est déposée');
  -- Avant la validation, le courriel attend (a_valider) ou le socle l'a déjà verrouillé (bloque) : jamais en route.
  return next ok(coalesce(tests.a4_statut_envoi(v_r), 'a_valider') in ('a_valider', 'bloque'),
                 'Aucun courriel n''est parti avant la validation : ' || coalesce(tests.a4_statut_envoi(v_r), 'pas d''envoi'));
  return next ok(tests.a4_statut_envoi(v_r) is distinct from 'bloque' or v_rep.statut = 'non_reglee',
                 'Un courriel verrouillé par le socle laisse le brouillon « à envoyer à la main »');
  if to_regclass('private.actions_sans_accord') is not null then
    return next ok(exists (select 1 from private.actions_sans_accord a where a.module = 'filed' and a.type_action = 'filed.repondre'),
                   'Aucun accord permanent ne couvre filed.repondre');
  else
    return next pass('actions_sans_accord absente de cette base (souche locale)');
  end if;

  perform tests.a4_decider_reponse(o, v_r, 'approuve');
  return next is((select statut from public.filed_reponses where id = v_r), 'validee', 'Approuvée par une personne : la réponse est validée');
  return next is((select statut from public.demandes_validation where id = v_rep.demande_id), 'executee', 'et la décision exécutée');
  return next ok(coalesce(tests.a4_statut_envoi(v_r), 'pret') <> 'a_valider', 'Le courriel ne reste pas en attente après l''approbation');
end $f$;

create or replace function tests.test_a4_38_02_contestation_refusee() returns setof text
language plpgsql as $f$
declare o jsonb := tests.a4_organisation(); fa jsonb; v_r uuid; v_rep public.filed_reponses;
begin
  fa := tests.a4_facture(o, 'ia', 'CONT-7', 240);
  reset role; perform tests.a4_comme((o ->> 'valideur')::uuid);
  return next throws_ok(format('select public.filed_preparer_reponse(%L, ''contestation'')', fa ->> 'document'), '22023', null,
                        'Une contestation sans motif ni contrôle bloquant est refusée');
  v_r := public.filed_preparer_reponse((fa ->> 'document')::uuid, 'contestation', 'Le prix unitaire facturé (12,00 €) diffère de la commande (10,00 €).',
                                       'facturation@fournisseur.test');
  reset role;
  select * into v_rep from public.filed_reponses where id = v_r;
  return next ok(v_rep.sujet like 'Votre facture CONT-7%' and v_rep.corps like '%240,00 EUR%' and v_rep.corps like '%prix unitaire facturé%'
                 and v_rep.corps like '%avoir ou une facture rectificative%', 'Le brouillon dit quoi, combien, pourquoi, et ce qu''on attend');

  perform tests.a4_decider_reponse(o, v_r, 'rejete', 'On appelle plutôt le fournisseur.');
  return next is((select statut || ':' || motif from public.filed_reponses where id = v_r), 'refusee:On appelle plutôt le fournisseur.',
                 'Refusée : rien ne part, le motif reste');
  return next ok(coalesce(tests.a4_statut_envoi(v_r), 'refuse') in ('refuse', 'annule', 'bloque', 'expire'),
                 'Le courriel adossé est clos sans partir : ' || coalesce(tests.a4_statut_envoi(v_r), 'pas d''envoi'));
end $f$;

create or replace function tests.test_a4_38_03_confirmation_et_droits() returns setof text
language plpgsql as $f$
declare o jsonb := tests.a4_organisation(); fa jsonb; v_r uuid; v_rep public.filed_reponses;
begin
  fa := tests.a4_facture(o, 'ia', 'CONF-3', 120);
  update public.filed_factures set echeance_lue = date '2026-11-30' where id = (fa ->> 'facture')::uuid;
  reset role; perform tests.a4_comme((o ->> 'gerant')::uuid);
  v_r := public.filed_preparer_reponse((fa ->> 'document')::uuid, 'confirmation', null, null, 'Accusé de réception', null);
  return next throws_ok(format('select public.filed_preparer_reponse(%L, ''relance'')', fa ->> 'document'), '22023', null, 'Sorte inconnue refusée');
  return next throws_ok(format('select public.filed_preparer_reponse(%L, ''confirmation'', null, ''pas-une-adresse'')', fa ->> 'document'), '22023', null,
                        'Adresse invalide refusée');
  reset role;
  select * into v_rep from public.filed_reponses where id = v_r;
  return next is(v_rep.sujet, 'Accusé de réception', 'Le sujet donné par la personne prime');
  return next ok(v_rep.corps like '%facture CONF-3 du 28/09/2026, d''un montant de 120,00 EUR%' and v_rep.corps like '%échéance au 30/11/2026%',
                 'Le corps rédigé : numéro, date, montant, échéance');
  return next is(v_rep.statut, 'non_reglee', 'Sans adresse : le brouillon est à valider puis à envoyer à la main');
  return next ok(not has_function_privilege('authenticated', 'private.filed_rediger_reponse(uuid, text, text)', 'execute')
             and not has_function_privilege('authenticated', 'private.filed_decider_reponse(public.demandes_validation, uuid, text)', 'execute')
             and not has_function_privilege('anon', 'public.filed_preparer_reponse(uuid, text, text, text, text, text)', 'execute'),
                 'Le moteur n''est pas ouvert ; anon ne prépare rien');
end $f$;
