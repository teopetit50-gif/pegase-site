-- Tests B7 — les portes de l'ouvrier identite (lot b7_01), en pgTAP, schéma « tests » d'A5.
-- Exécutable tel quel par execute_sql sur la RECETTE, après 00_installation.sql d'A5 et b7_01_portes.sql.
-- Client du banc cccccccc-0000-4000-8000-00000000000c ; identifiants fabriqués (clés justes), aucune donnée réelle.
-- runtests() annule tout ce que les tests écrivent.

create or replace function tests.b7_client() returns uuid language sql immutable as $$ select 'cccccccc-0000-4000-8000-00000000000c'::uuid $$;

-- Une demande ouverte, comme filed_controles_identite la pose.
create or replace function tests.b7_demande(p_registre text, p_identifiant text) returns uuid
language plpgsql as $$
declare v_id uuid;
begin
  insert into public.filed_verifications_tiers (client_id, fournisseur_id, registre, identifiant)
  values (tests.b7_client(), null, p_registre, p_identifiant) returning id into v_id;
  return v_id;
end $$;

create or replace function tests.test_b7_01_declencheur_depose_un_travail() returns setof text
language plpgsql as $f$
declare v_id uuid; t public.travaux; n bigint; v public.filed_verifications_tiers;
begin
  v_id := tests.b7_demande('sirene', '123456782');
  select * into t from public.travaux where cle = 'verification:' || v_id::text order by id desc limit 1;
  return next ok(t.id is not null, 'Une demande ouverte dépose un travail');
  return next is(t.genre, 'identite.verifier', 'genre identite.verifier');
  return next is(t.module, 'filed', 'module filed (le demandeur)');
  return next is(t.client_id, tests.b7_client(), 'chez le client de la demande');
  return next is(t.etat, 'a_faire', 'à faire');
  return next is(t.charge ->> 'verification', v_id::text, 'la charge porte la vérification');
  return next is(t.charge ->> 'registre', 'sirene', 'la charge porte le registre');
  return next is(t.charge ->> 'identifiant', '123456782', 'la charge porte l''identifiant');
  select * into v from public.filed_verifications_tiers where id = v_id;
  perform private.identite_deposer_travail(v);
  select count(*) into n from public.travaux where cle = 'verification:' || v_id::text;
  return next is(n, 1::bigint, 'Pas de second travail pour la même demande (rattrapage idempotent)');
  insert into public.filed_verifications_tiers (client_id, registre, identifiant, repondu_le, resultat)
  values (tests.b7_client(), 'sirene', '100000009', now(), 'valide') returning id into v_id;
  select count(*) into n from public.travaux where cle = 'verification:' || v_id::text;
  return next is(n, 0::bigint, 'Une ligne déjà répondue ne dépose pas de travail');
end $f$;

create or replace function tests.test_b7_02_a_verifier() returns setof text
language plpgsql as $f$
declare v_id uuid; d jsonb;
begin
  v_id := tests.b7_demande('vies', 'FR11123456782');
  d := public.identite_a_verifier(v_id);
  return next ok(d is not null, 'La porte rend la demande');
  return next is(d ->> 'id', v_id::text, 'id');
  return next is(d ->> 'registre', 'vies', 'registre');
  return next is(d ->> 'identifiant', 'FR11123456782', 'identifiant normalisé');
  return next is(d ->> 'client_id', tests.b7_client()::text, 'client');
  return next ok(d ->> 'repondu_le' is null, 'pas encore répondue');
  return next ok(jsonb_typeof(d -> 'cache') = 'null', 'aucun cache pour un identifiant jamais vu');
  return next ok(jsonb_typeof(d -> 'fournisseur') = 'null', 'pas de fournisseur rattaché : null');
  return next ok(public.identite_a_verifier(gen_random_uuid()) is null, 'Une vérification inconnue rend null');
end $f$;

create or replace function tests.test_b7_03_noter() returns setof text
language plpgsql as $f$
declare v_id uuid; r jsonb; v public.filed_verifications_tiers; c public.identites_registre;
begin
  v_id := tests.b7_demande('sirene', '123456782');
  r := public.noter_identite(v_id, 'valide', '{"registre":"sirene","denomination":"ATELIER DURAND","etat":"actif","verifie_par":"identite/2026-10-05/t"}'::jsonb, 'sirene');
  return next is(r ->> 'deja_repondue', 'false', 'première réponse');
  return next is((r ->> 'recontrolees')::int, 0, 'aucune facture à recontrôler sur le banc d''essai');
  select * into v from public.filed_verifications_tiers where id = v_id;
  return next is(v.resultat, 'valide', 'la vérification est répondue valide');
  return next ok(v.repondu_le is not null, 'repondu_le posé');
  return next is(v.preuve ->> 'source', 'sirene', 'la preuve porte la source');
  return next is(v.preuve ->> 'denomination', 'ATELIER DURAND', 'la preuve garde ce que le registre a rendu');
  select * into c from public.identites_registre where registre = 'sirene' and identifiant = '123456782';
  return next ok(c.id is not null, 'le cache global est écrit');
  return next is(c.resultat, 'valide', 'cache : résultat');
  return next is(c.version, 'identite/2026-10-05/t', 'cache : version de l''ouvrier');
  r := public.noter_identite(v_id, 'invalide', '{}'::jsonb, 'sirene');
  return next is(r ->> 'deja_repondue', 'true', 'Une seconde réponse est ignorée');
  select * into v from public.filed_verifications_tiers where id = v_id;
  return next is(v.resultat, 'valide', 'et ne réécrit rien');
  return next throws_ok(format('select public.noter_identite(%L, %L, %L, %L)', v_id, 'bof', '{}', 'sirene'), '22023', null, 'Un résultat inconnu est refusé');
  return next throws_ok(format('select public.noter_identite(%L, %L, %L, %L)', gen_random_uuid(), 'valide', '{}', 'sirene'), 'P0002', null, 'Une vérification inconnue est refusée');
  return next throws_ok(format('select public.noter_identite(%L, %L, %L, %L)', v_id, 'valide', '{}', ''), '22023', null, 'La source est obligatoire');
end $f$;

create or replace function tests.test_b7_04_cache() returns setof text
language plpgsql as $f$
declare v1 uuid; v2 uuid; d jsonb;
begin
  v1 := tests.b7_demande('vies', 'DE123456788');
  perform public.noter_identite(v1, 'valide', '{"registre":"vies","nom":"X GMBH"}'::jsonb, 'vies');
  v2 := tests.b7_demande('vies', 'DE123456788');
  d := public.identite_a_verifier(v2);
  return next is(d -> 'cache' ->> 'resultat', 'valide', 'La seconde demande du même identifiant voit la réponse en cache');
  return next is(d -> 'cache' ->> 'source', 'vies', 'cache : source');
  return next ok((d -> 'cache' ->> 'age_jours')::numeric < 1, 'cache : tout frais');
  return next is(d -> 'cache' -> 'preuve' ->> 'nom', 'X GMBH', 'cache : la preuve');
  -- Une réponse depuis le cache ne réécrit pas le cache (sa date reste celle du registre).
  perform public.noter_identite(v2, 'valide', '{"registre":"vies","cache_du":"x"}'::jsonb, 'cache');
  return next is((select count(*) from public.identites_registre where registre = 'vies' and identifiant = 'DE123456788'), 1::bigint, 'une seule entrée de cache');
  return next is((select preuve ->> 'nom' from public.identites_registre where registre = 'vies' and identifiant = 'DE123456788'), 'X GMBH', 'le cache garde la preuve du registre, pas celle recopiée');
end $f$;

create or replace function tests.test_b7_05_complements() returns setof text
language plpgsql as $f$
declare v_id uuid; r jsonb; c public.filed_verifications_tiers;
begin
  v_id := tests.b7_demande('vies', 'FR11123456782');
  r := public.noter_identite(v_id, 'valide', '{"registre":"vies"}'::jsonb, 'vies',
    '[{"registre":"sirene","identifiant":"123 456 782","resultat":"valide","preuve":{"registre":"sirene","etat":"actif"},"source":"sirene"},
      {"registre":"bidon","identifiant":"1","resultat":"valide","preuve":{}}]'::jsonb);
  return next is((r ->> 'complements')::int, 1, 'Un complément valide est écrit, un registre inconnu est ignoré');
  select * into c from public.filed_verifications_tiers
   where client_id = tests.b7_client() and registre = 'sirene' and identifiant = '123456782' and preuve ->> 'complement_de' = v_id::text;
  return next ok(c.id is not null, 'Le complément est une vérification répondue, rattachée à la demande');
  return next is(c.resultat, 'valide', 'complément : résultat');
  return next ok(c.repondu_le is not null, 'complément : répondu d''office');
  return next is(c.preuve ->> 'source', 'sirene', 'complément : source');
  return next is((select resultat from public.identites_registre where registre = 'sirene' and identifiant = '123456782'), 'valide', 'complément : cache écrit');
  return next is((select count(*) from public.travaux where cle = 'verification:' || c.id::text), 0::bigint, 'Un complément déjà répondu ne dépose pas de travail');
end $f$;

create or replace function tests.test_b7_06_relancer() returns setof text
language plpgsql as $f$
declare v_vieux uuid; v_recent uuid; v_ok uuid; n int; nouveau public.filed_verifications_tiers;
begin
  insert into public.filed_verifications_tiers (client_id, registre, identifiant, demande_le, repondu_le, resultat, preuve)
  values (tests.b7_client(), 'vies', 'IT01234567897', now() - interval '3 hours', now() - interval '3 hours', 'indisponible', '{"motif":"VIES : MS_UNAVAILABLE"}')
  returning id into v_vieux;
  insert into public.filed_verifications_tiers (client_id, registre, identifiant, demande_le, repondu_le, resultat)
  values (tests.b7_client(), 'vies', 'LU12345613', now() - interval '10 minutes', now() - interval '10 minutes', 'indisponible')
  returning id into v_recent;
  insert into public.filed_verifications_tiers (client_id, registre, identifiant, demande_le, repondu_le, resultat)
  values (tests.b7_client(), 'sirene', '100000009', now() - interval '3 hours', now() - interval '3 hours', 'valide')
  returning id into v_ok;
  n := public.identite_relancer(2);
  return next is(n, 1, 'Seul l''« indisponible » de plus de deux heures est relancé');
  select * into nouveau from public.filed_verifications_tiers
   where client_id = tests.b7_client() and registre = 'vies' and identifiant = 'IT01234567897' and repondu_le is null;
  return next ok(nouveau.id is not null, 'Une nouvelle demande ouverte existe pour lui');
  return next is((select count(*) from public.travaux where cle = 'verification:' || nouveau.id::text), 1::bigint, 'et son travail est déposé');
  n := public.identite_relancer(2);
  return next is(n, 0, 'Relancer de nouveau ne rouvre rien tant que la demande est ouverte');
  perform public.noter_identite(nouveau.id, 'valide', '{}'::jsonb, 'vies');
  n := public.identite_relancer(2);
  return next is(n, 0, 'Une fois répondue, l''ancien « indisponible » ne se relance plus');
end $f$;

create or replace function tests.test_b7_07_droits() returns setof text
language plpgsql as $f$
begin
  return next ok(not has_function_privilege('anon', 'public.identite_a_verifier(uuid)', 'execute'), 'anon n''exécute pas identite_a_verifier');
  return next ok(not has_function_privilege('authenticated', 'public.identite_a_verifier(uuid)', 'execute'), 'authenticated n''exécute pas identite_a_verifier');
  return next ok(has_function_privilege('service_role', 'public.identite_a_verifier(uuid)', 'execute'), 'service_role exécute identite_a_verifier');
  return next ok(not has_function_privilege('anon', 'public.noter_identite(uuid,text,jsonb,text,jsonb)', 'execute'), 'anon n''exécute pas noter_identite');
  return next ok(not has_function_privilege('authenticated', 'public.noter_identite(uuid,text,jsonb,text,jsonb)', 'execute'), 'authenticated n''exécute pas noter_identite');
  return next ok(has_function_privilege('service_role', 'public.noter_identite(uuid,text,jsonb,text,jsonb)', 'execute'), 'service_role exécute noter_identite');
  return next ok(not has_function_privilege('authenticated', 'public.identite_relancer(integer)', 'execute'), 'authenticated n''exécute pas identite_relancer');
  return next ok(has_function_privilege('service_role', 'public.identite_relancer(integer)', 'execute'), 'service_role exécute identite_relancer');
  return next ok(not has_table_privilege('authenticated', 'public.identites_registre', 'select'), 'authenticated ne lit pas le cache');
  return next ok(not has_table_privilege('anon', 'public.identites_registre', 'select'), 'anon ne lit pas le cache');
  return next ok((select relrowsecurity from pg_class where oid = 'public.identites_registre'::regclass), 'RLS activée sur le cache');
  return next ok(exists (select 1 from pg_trigger where tgname = 'identite_demander_travail' and tgrelid = 'public.filed_verifications_tiers'::regclass and tgenabled <> 'D'), 'le déclencheur est posé et actif');
end $f$;

create or replace function tests.test_b7_08_verdict_fournisseur() returns setof text
language plpgsql as $f$
declare v_four uuid; v_id uuid; r record;
begin
  -- Les colonnes d'A4 (a4_10 : identite_verdict jsonb) : posées si elles manquent encore ici (annulé par runtests), sinon laissées telles quelles.
  alter table public.filed_fournisseurs add column if not exists identite_verifiee_le timestamptz;
  alter table public.filed_fournisseurs add column if not exists identite_source text;
  alter table public.filed_fournisseurs add column if not exists identite_verdict jsonb;
  insert into public.filed_fournisseurs (client_id, code, nom, nom_normalise, siren, pays, statut, source)
  values (tests.b7_client(), 'B7-ESSAI', 'Fournisseur d''essai B7', 'fournisseur d essai b7', '999999998', 'FR', 'a_confirmer', 'saisie') returning id into v_four;
  insert into public.filed_verifications_tiers (client_id, fournisseur_id, registre, identifiant) values (tests.b7_client(), v_four, 'sirene', '999999998') returning id into v_id;
  return next is((public.identite_a_verifier(v_id) -> 'fournisseur' ->> 'siren'), '999999998', 'La porte rend le fournisseur rattaché');
  perform public.noter_identite(v_id, 'valide', '{"registre":"sirene","etat":"actif"}'::jsonb, 'sirene');
  execute 'select identite_verifiee_le, identite_source, identite_verdict from public.filed_fournisseurs where id = $1' into r using v_four;
  return next ok(r.identite_verifiee_le is not null, 'Le verdict est daté sur la fiche fournisseur');
  return next is(r.identite_source, 'sirene', 'verdict : source');
  return next is(r.identite_verdict ->> 'resultat', 'valide', 'verdict : valide (objet jsonb)');
  return next is(r.identite_verdict ->> 'registre', 'sirene', 'verdict : registre');
  return next is(r.identite_verdict ->> 'identifiant', '999999998', 'verdict : identifiant');
  return next is(r.identite_verdict ->> 'verification', v_id::text, 'verdict : la vérification d''origine');
  -- Depuis le cache : la source initiale est reportée, pas « cache ».
  insert into public.filed_verifications_tiers (client_id, fournisseur_id, registre, identifiant) values (tests.b7_client(), v_four, 'sirene', '999999998') returning id into v_id;
  perform public.noter_identite(v_id, 'invalide', '{"registre":"sirene","source_initiale":"recherche-entreprises"}'::jsonb, 'cache');
  execute 'select identite_verifiee_le, identite_source, identite_verdict from public.filed_fournisseurs where id = $1' into r using v_four;
  return next is(r.identite_source, 'recherche-entreprises', 'verdict depuis le cache : la source initiale');
  return next is(r.identite_verdict ->> 'resultat', 'invalide', 'verdict : invalide');
  return next is(r.identite_verdict ->> 'source', 'recherche-entreprises', 'verdict : source initiale dans l''objet');
end $f$;

select * from runtests('tests'::name, '^test_b7_');
