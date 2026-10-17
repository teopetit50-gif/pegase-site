-- Tests A4 — lot 32 (a4_40) : l'effacement garde ce que la loi impose (registre, archives, factures, écritures),
-- scellé, exportable ; le reste part. pgTAP, schéma « tests » d'A5 ; utilise tests.a4_organisation, tests.a4_facture
-- (a4_10_facture_electronique.sql), tests.a4_facture_comptabilisee (a4_18_envoi_comptable.sql), tests.a4_comme
-- (a4_26_sortie_envois.sql), à poser avant. `select * from runtests('tests', '^test_a4_')` ; runtests() annule tout.
--
-- Ce fichier ne supprime rien : l'effacement simulé (suppressions dans la transaction annulée de runtests) est dans
-- a4_30b_conservation_effacement.sql, à jouer à la main.

create or replace function tests.test_a4_40_01_bilan() returns setof text
language plpgsql as $f$
declare o jsonb := tests.a4_organisation(); v_cl uuid := (o ->> 'client')::uuid; fa jsonb; b jsonb; n_doc bigint; n_ecr bigint;
begin
  update public.entites set siren = '987654329' where id = (o ->> 'entite')::uuid;
  fa := tests.a4_facture_comptabilisee(o, 'CONS-001');
  perform tests.a4_facture(o, 'ia', 'CONS-002', 60);
  select count(*) into n_doc from public.filed_documents where client_id = v_cl;
  select count(*) into n_ecr from public.filed_ecritures where client_id = v_cl;

  reset role; perform tests.a4_comme((o ->> 'valideur')::uuid);
  return next throws_ok(format('select public.filed_bilan_effacement(%L)', v_cl), '42501', null, 'Le bilan est pour le gérant ou l''admin');
  reset role; perform tests.a4_comme((o ->> 'gerant')::uuid);
  b := public.filed_bilan_effacement(v_cl);
  reset role;
  return next is((b -> 'garde' ->> 'registre')::bigint, n_doc, 'Le bilan compte le registre gardé');
  return next is((b -> 'garde' ->> 'ecritures')::bigint, n_ecr, 'et les écritures');
  return next ok((b ->> 'garde_jusqu_au')::date >= (current_date + interval '10 years')::date, 'Gardé au moins dix ans : ' || (b ->> 'garde_jusqu_au'));
  return next ok(b ->> 'texte' like 'Tout ce que FILED tient pour vous est effacé, sauf ce que la loi oblige à garder.%'
                 and b ->> 'texte' like '%fichiers des pièces sont gardés 10 ans%scellés%exportables sur demande%', 'La phrase de l''écran le dit (a4_42 : fichiers compris)');
  return next ok(b ->> 'fichiers' like 'Les fichiers des pièces sont gardés dix ans, scellés, exportables%', 'et la ligne des fichiers');
  return next ok(b -> 'efface' ? 'filed_fournisseurs', 'Le bilan dit ce qui part (les fournisseurs)');

  return next ok(exists (select 1 from pg_trigger where tgrelid = 'public.filed_conservation'::regclass and tgname = 'filed_conservation_scellee'
                           and tgtype & 8 = 8 and tgtype & 16 = 16), 'Le dépôt est gardé contre la modification et la suppression');
  return next ok((select count(*) from pg_trigger where tgname in ('filed_documents_conservation', 'filed_archives_conservation',
                   'filed_factures_conservation', 'filed_ecritures_conservation')) = 4, 'Les quatre tables gardées recopient avant suppression');
  return next ok(not exists (select 1 from private.tables_locataires where nom in ('filed_conservation', 'filed_conservation_clients')),
                 'Le dépôt n''est pas dans les tables que l''effacement vide');
  return next ok(not exists (select 1 from pg_constraint where conrelid = 'public.filed_conservation'::regclass and contype = 'f'),
                 'et aucune clé étrangère ne l''emporte avec l''organisation');
  return next ok(not has_table_privilege('authenticated', 'public.filed_conservation', 'select')
             and not has_function_privilege('authenticated', 'public.filed_exporter_conservation(uuid, text)', 'execute'), 'Le dépôt est fermé aux membres');
end $f$;

-- Lot 33 (a4_41) : à son dernier terme, le dépôt d'une organisation part en entier ; avant, rien ne part.
create or replace function tests.test_a4_41_01_purge_au_terme() returns setof text
language plpgsql as $f$
declare v_echu uuid := gen_random_uuid(); v_vivant uuid := gen_random_uuid(); n integer;
begin
  -- Deux dépôts d'exemple posés directement (organisations déjà effacées) : l'un échu hier, l'autre dans dix ans.
  insert into public.filed_conservation (client_id, nature, source_id, donnees, conserver_jusqu_au, cause, empreinte)
  values (v_echu, 'registre', 'r1', '{}', current_date - 1, 'effacement_organisation', repeat('a', 64)),
         (v_echu, 'ecriture', 'e1', '{}', current_date - 2, 'effacement_organisation', repeat('b', 64)),
         (v_vivant, 'registre', 'r2', '{}', current_date + 3650, 'effacement_organisation', repeat('c', 64));
  insert into public.filed_conservation_clients (client_id, nom, conserver_jusqu_au, lignes, empreinte)
  values (v_echu, 'Échue', current_date - 1, 2, repeat('b', 64)), (v_vivant, 'Vivante', current_date + 3650, 1, repeat('c', 64));
  n := private.filed_purger_conservation();
  return next ok(n >= 2, 'La purge retire les lignes échues : ' || n);
  return next is((select count(*) from public.filed_conservation where client_id = v_echu), 0::bigint, 'Le dépôt échu est parti en entier');
  return next is((select count(*) from public.filed_conservation_clients where client_id = v_echu), 0::bigint, 'avec son en-tête');
  return next is((select lignes || ':' || empreinte from public.filed_conservation_purges where client_id = v_echu), '2:' || repeat('b', 64),
                 'Un constat reste, sans donnée');
  return next is((select count(*) from public.filed_conservation where client_id = v_vivant), 1::bigint, 'Le dépôt vivant reste');
  return next ok(pg_get_functiondef('private.filed_produire_exports(date)'::regprocedure) like '%filed_purger_conservation%',
                 'Le balayage des exports purge');
end $f$;
