-- Tests B7 — les fournisseurs suisses et britanniques (lot b7_06), en pgTAP, schéma « tests » d'A5.
-- Exécutable tel quel par execute_sql sur la RECETTE, après le lot d'A4 qui élargit les contraintes, b7_01_portes.sql
-- (tests), b7_04_balayer.sql (tests.b7_fournisseur) et b7_06_etrangers.sql.
-- Client du banc ; fournisseurs et identifiants fabriqués (IDE et TVA GB à clé juste, jamais vus) ; runtests() annule tout.

create or replace function tests.test_b7_13_etrangers() returns setof text
language plpgsql as $f$
declare
  v_cl uuid := tests.b7_client();
  f_ch uuid; f_gb uuid; f_ide uuid; f_xi uuid; f_us uuid;
  v_id uuid; t public.travaux; r jsonb; v public.filed_verifications_tiers; n int; rv record; e record;
begin
  -- 0. Les contraintes élargies par A4 (sans elles, rien de ce lot ne peut s'écrire).
  return next ok(exists (select 1 from pg_constraint c where c.conrelid = 'public.filed_verifications_tiers'::regclass and c.contype = 'c'
                          and pg_get_constraintdef(c.oid) ~ 'registre' and pg_get_constraintdef(c.oid) ~ 'uid_ch' and pg_get_constraintdef(c.oid) ~ 'hmrc'),
                 'filed_verifications_tiers.registre admet uid_ch et hmrc');
  return next ok(exists (select 1 from pg_constraint c where c.conrelid = 'public.identites_registre'::regclass and c.contype = 'c'
                          and pg_get_constraintdef(c.oid) ~ 'registre' and pg_get_constraintdef(c.oid) ~ 'uid_ch' and pg_get_constraintdef(c.oid) ~ 'hmrc'),
                 'identites_registre.registre admet uid_ch et hmrc');
  return next ok(exists (select 1 from pg_constraint c where c.conrelid = 'public.filed_fournisseurs'::regclass and c.contype = 'c'
                          and pg_get_constraintdef(c.oid) ~ 'identite_source' and pg_get_constraintdef(c.oid) ~ 'uid_ch' and pg_get_constraintdef(c.oid) ~ 'hmrc'),
                 'filed_fournisseurs.identite_source admet uid_ch et hmrc');

  -- 1. La cible d'un fournisseur hors Union.
  select * into e from private.identite_cible_etrangere('CHE-999.999.996', null);
  return next is(e.registre || ':' || e.identifiant, 'uid_ch:CHE999999996MWST', 'TVA suisse → uid_ch, suffixe MWST (on vérifie la TVA)');
  select * into e from private.identite_cible_etrangere('CHE999999996 TVA', null);
  return next is(e.identifiant, 'CHE999999996TVA', 'le suffixe donné est gardé');
  select * into e from private.identite_cible_etrangere('GB 980 7806 84', null);
  return next is(e.registre || ':' || e.identifiant, 'hmrc:GB980780684', 'TVA GB → hmrc');
  select * into e from private.identite_cible_etrangere(null, 'CHE-999.999.996');
  return next is(e.registre || ':' || e.identifiant, 'uid_ch:CHE999999996', 'IDE en id_etranger → uid_ch, l''entreprise seule');
  select * into e from private.identite_cible_etrangere('XI980780684', null);
  return next ok(e.registre is null, 'XI reste à VIES');
  select * into e from private.identite_cible_etrangere(null, 'EIN 12-3456789');
  return next ok(e.registre is null, 'un identifiant américain : aucun registre');

  -- 2. Demander : formes admises et refusées (le service, comme un autre module).
  execute 'set local role service_role';
  v_id := public.identite_demander(v_cl, 'uid_ch', 'CHE-999.999.985 MWST');
  execute 'reset role';
  select * into v from public.filed_verifications_tiers where id = v_id;
  return next is(v.registre || ':' || v.identifiant, 'uid_ch:CHE999999985MWST', 'Une demande uid_ch s''ouvre, identifiant normalisé');
  select * into t from public.travaux where cle = 'verification:' || v_id::text order by id desc limit 1;
  return next is(t.charge ->> 'registre', 'uid_ch', 'et son travail porte le registre');
  return next throws_ok(format('select public.identite_demander(%L, %L, %L)', v_cl, 'uid_ch', 'CH123'), '22023', null, 'uid_ch : forme refusée');
  return next throws_ok(format('select public.identite_demander(%L, %L, %L)', v_cl, 'hmrc', 'XI980780684'), '22023', null, 'hmrc : XI refusé (VIES)');
  return next throws_ok(format('select public.identite_demander(%L, %L, %L)', v_cl, 'hmrc', 'GB12345'), '22023', null, 'hmrc : forme refusée');
  return next throws_ok(format('select public.identite_demander(%L, %L, %L)', v_cl, 'irs', 'US1'), '22023', null, 'registre inconnu refusé');

  -- 3. Balayer : un fournisseur suisse, un britannique, une IDE seule, XI à VIES, un américain ignoré.
  f_ch := tests.b7_fournisseur('B7-CH', null, 'CHE999999996');
  f_gb := tests.b7_fournisseur('B7-GB', null, 'GB980780684');
  f_xi := tests.b7_fournisseur('B7-XI', null, 'XI980780684');
  insert into public.filed_fournisseurs (client_id, code, nom, nom_normalise, id_etranger, pays, statut, source)
  values (v_cl, 'B7-IDE', 'Fournisseur B7-IDE', 'fournisseur b7-ide', 'CHE-999.999.996', 'CH', 'actif', 'saisie') returning id into f_ide;
  insert into public.filed_fournisseurs (client_id, code, nom, nom_normalise, id_etranger, pays, statut, source)
  values (v_cl, 'B7-US', 'Fournisseur B7-US', 'fournisseur b7-us', 'EIN 12-3456789', 'US', 'actif', 'saisie') returning id into f_us;
  n := public.identite_balayer(90, 500);
  return next ok(exists (select 1 from public.filed_verifications_tiers where fournisseur_id = f_ch and registre = 'uid_ch' and identifiant = 'CHE999999996MWST' and repondu_le is null),
                 'Balayage : le fournisseur suisse est demandé au registre IDE (TVA)');
  return next ok(exists (select 1 from public.filed_verifications_tiers where fournisseur_id = f_gb and registre = 'hmrc' and identifiant = 'GB980780684' and repondu_le is null),
                 'Balayage : le fournisseur britannique est demandé à HMRC');
  return next ok(exists (select 1 from public.filed_verifications_tiers where fournisseur_id = f_ide and registre = 'uid_ch' and identifiant = 'CHE999999996' and repondu_le is null),
                 'Balayage : l''IDE seule est demandée au registre IDE (entreprise)');
  return next ok(exists (select 1 from public.filed_verifications_tiers where fournisseur_id = f_xi and registre = 'vies' and repondu_le is null),
                 'Balayage : XI part chez VIES');
  return next ok(not exists (select 1 from public.filed_verifications_tiers where fournisseur_id = f_us), 'Balayage : l''américain est ignoré (pas de registre)');

  -- 4. De bout en bout : la réponse du registre suisse pose le verdict sur la fiche, identite_source = uid_ch.
  select * into v from public.filed_verifications_tiers where fournisseur_id = f_ch and registre = 'uid_ch' and repondu_le is null;
  r := public.noter_identite(v.id, 'valide',
         '{"registre":"uid_ch","uid":"CHE-999.999.996","nom":"ESSAI SA","statut_ide":"définitif","tva":{"statut":"inscrit"},"verifie_par":"identite/t"}'::jsonb, 'uid_ch');
  return next is(r ->> 'resultat', 'valide', 'noter_identite : valide');
  execute 'select identite_verifiee_le, identite_source, identite_verdict from public.filed_fournisseurs where id = $1' into rv using f_ch;
  return next is(rv.identite_source, 'uid_ch', 'La fiche porte identite_source = uid_ch');
  return next is(rv.identite_verdict ->> 'identifiant', 'CHE999999996MWST', 'et l''identifiant vérifié');
  return next is(rv.identite_verdict -> 'preuve' ->> 'nom', 'ESSAI SA', 'et la preuve du registre');
  return next is((select resultat from public.identites_registre where registre = 'uid_ch' and identifiant = 'CHE999999996MWST'), 'valide', 'Le cache global garde la réponse');

  -- 5. HMRC : un refus pose le verdict invalide.
  select * into v from public.filed_verifications_tiers where fournisseur_id = f_gb and registre = 'hmrc' and repondu_le is null;
  perform public.noter_identite(v.id, 'invalide', '{"registre":"hmrc","motif":"HMRC : numéro de TVA non enregistré."}'::jsonb, 'hmrc');
  execute 'select identite_source, identite_verdict from public.filed_fournisseurs where id = $1' into rv using f_gb;
  return next is(rv.identite_source || ':' || (rv.identite_verdict ->> 'resultat'), 'hmrc:invalide', 'La fiche britannique porte hmrc : invalide');
end $f$;

select * from runtests('tests'::name, '^test_b7_13');
