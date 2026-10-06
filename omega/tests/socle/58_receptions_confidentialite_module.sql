-- 58 — lot 19ak : une réception rattachée à un module (et ses fichiers <client>/receptions/…) ne se lit que selon la
-- règle du module ; sans règle de module, tout membre la lit ; un autre client ne lit rien.
-- Exécutable tel quel par execute_sql sur la RECETTE, après 00_installation.sql et le lot 19ak.
-- runtests() annule tout ce que le test écrit : réceptions, boîte, objets Storage fictifs, et la règle d'essai
-- private.essai_huit_peut_lire_reception (module fictif « essai_huit », lettres seules comme les vrais modules : seul le gérant lit, comme un dossier muré).

create or replace function tests.test_58_receptions_confidentialite_module() returns setof text
language plpgsql as $f$
declare
  jeu jsonb; client_a uuid; client_b uuid; gerant uuid; mure uuid; user_b uuid;
  c_r1 text; c_r2 text; c_r3 text; c_autre text; n bigint; v_lus text;
begin
  if to_regprocedure('private.reception_lisible(uuid, text, uuid)') is null then
    return next ok(true, 'lot 19ak absent de cet environnement : sans objet');
    return;
  end if;
  jeu := tests.jeu();
  client_a := (jeu ->> 'client_a')::uuid; client_b := (jeu ->> 'client_b')::uuid;
  gerant := (jeu ->> 'gerant_a')::uuid; mure := (jeu ->> 'user_a')::uuid; user_b := (jeu ->> 'user_b')::uuid;

  -- ── Les politiques ajoutées sont restrictives, et rien n'a été retiré ──
  return next ok(exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'receptions'
                         and policyname = 'réceptions : confidentialité par module' and permissive = 'RESTRICTIVE' and cmd = 'SELECT'),
                 'politique restrictive sur public.receptions');
  return next ok(exists (select 1 from pg_policies where schemaname = 'storage' and tablename = 'objects'
                         and policyname = 'réceptions : confidentialité par module (fichiers)' and permissive = 'RESTRICTIVE' and cmd = 'SELECT'),
                 'politique restrictive sur storage.objects');
  return next ok(exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'receptions' and permissive = 'PERMISSIVE'),
                 'la politique de lecture d''origine des réceptions est toujours là');
  return next ok(not has_function_privilege('anon', 'private.reception_lisible(uuid, text, uuid)', 'execute')
                 and has_function_privilege('authenticated', 'private.reception_lisible(uuid, text, uuid)', 'execute')
                 and has_function_privilege('authenticated', 'private.reception_objet_lisible(text, uuid)', 'execute'),
                 'anon n''exécute pas la règle ; authenticated oui (elle sert aux politiques)');
  if to_regprocedure('private.tamila_peut_lire_reception(uuid, uuid)') is not null then
    return next ok((select prorettype = 'boolean'::regtype from pg_proc where oid = 'private.tamila_peut_lire_reception(uuid, uuid)'::regprocedure),
                   'la règle Tamila (B4) est branchée : tamila_peut_lire_reception(uuid, uuid) rend un booléen');
  end if;

  -- ── Le jeu : une règle de module d'essai, trois réceptions, quatre fichiers ──
  execute 'create function private.essai_huit_peut_lire_reception(p_client uuid, p_user uuid) returns boolean language sql stable as '
       || quote_literal(format('select p_user = %L::uuid', gerant));
  c_r1 := client_a || '/receptions/essai58-r1/avis.pdf';     -- module écrit sur la réception
  c_r2 := client_a || '/receptions/essai58-r2/avis.pdf';     -- module venu de la boîte (expediteurs)
  c_r3 := client_a || '/receptions/essai58-r3/devis.pdf';    -- module sans règle propre
  c_autre := client_a || '/filed_document/essai58.pdf';      -- hors réceptions
  perform tests.inserer_minimal('public', 'expediteurs', jsonb_build_object('client_id', client_a, 'module', 'essai_huit',
                                'canal', 'email', 'identite', 'essai58@boite.invalid',
                                'fournisseur', 'brevo'));   -- un fournisseur connu : preparer_expediteur le vérifie
  perform tests.inserer_minimal('public', 'receptions', jsonb_build_object('client_id', client_a, 'module', 'essai_huit', 'canal', 'email',
          'boite', 'autre@boite.invalid', 'identifiant_externe', 'essai58-r1', 'pieces', jsonb_build_array(jsonb_build_object('chemin', c_r1))));
  perform tests.inserer_minimal('public', 'receptions', jsonb_build_object('client_id', client_a, 'canal', 'email',
          'boite', 'ESSAI58@boite.invalid', 'identifiant_externe', 'essai58-r2', 'pieces', jsonb_build_array(jsonb_build_object('chemin', c_r2))));
  perform tests.inserer_minimal('public', 'receptions', jsonb_build_object('client_id', client_a, 'module', 'filed', 'canal', 'email',
          'boite', 'autre@boite.invalid', 'identifiant_externe', 'essai58-r3', 'pieces', jsonb_build_array(jsonb_build_object('chemin', c_r3))));
  insert into storage.objects (bucket_id, name) values ('omega-clients', c_r1), ('omega-clients', c_r2), ('omega-clients', c_r3), ('omega-clients', c_autre);

  -- ── Le muré ──
  perform tests.endosser(mure);
  select string_agg(identifiant_externe, ',' order by identifiant_externe) into v_lus
  from public.receptions where identifiant_externe like 'essai58-%';
  return next is(v_lus, 'essai58-r3', 'le muré ne lit que la réception sans règle de module (ni r1, ni r2 venue de la boîte)');
  select count(*) into n from storage.objects where name in (c_r1, c_r2);
  return next is(n, 0::bigint, 'le muré ne lit pas les fichiers de ces réceptions');
  select count(*) into n from storage.objects where name in (c_r3, c_autre);
  return next is(n, 2::bigint, 'le muré lit le fichier de l''autre module et le fichier hors réceptions (inchangé)');
  return next ok(not private.reception_lisible(client_a, 'essai_huit', gerant), 'le muré ne sonde pas les droits du gérant');
  perform tests.redevenir_admin();

  -- ── Le gérant (l'avocat du dossier) ──
  perform tests.endosser(gerant);
  select count(*) into n from public.receptions where identifiant_externe like 'essai58-%';
  return next is(n, 3::bigint, 'le gérant lit les trois réceptions');
  select count(*) into n from storage.objects where name in (c_r1, c_r2, c_r3, c_autre);
  return next is(n, 4::bigint, 'le gérant lit les quatre fichiers');
  perform tests.redevenir_admin();

  -- ── Un autre client ──
  perform tests.endosser(user_b);
  select count(*) into n from public.receptions where identifiant_externe like 'essai58-%';
  return next is(n, 0::bigint, 'le client B ne lit aucune réception de A');
  select count(*) into n from storage.objects where name in (c_r1, c_r2, c_r3, c_autre);
  return next is(n, 0::bigint, 'ni aucun de ses fichiers');
  perform tests.redevenir_admin();
end $f$;

select * from runtests('tests'::name, '^test_58_');
