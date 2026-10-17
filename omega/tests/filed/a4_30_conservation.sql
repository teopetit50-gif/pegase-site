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
                 and b ->> 'texte' like '%scellés%exportables sur demande%', 'La phrase de l''écran le dit');
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
