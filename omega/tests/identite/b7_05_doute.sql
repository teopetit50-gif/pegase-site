-- Tests B7 — un refus isolé de VIES n'est pas un verdict (lot b7_04), en pgTAP, schéma « tests » d'A5.
-- Exécutable tel quel par execute_sql sur la RECETTE, après b7_01_portes.sql (tests) et b7_04_doute.sql.
-- Client du banc ; identifiants tirés au sort (préfixe ZZ, hors de l'Union : jamais dans le cache réel) ;
-- runtests() annule tout.

-- Un identifiant neuf à chaque appel.
create or replace function tests.b7_ident() returns text language sql volatile as $$ select 'ZZ' || upper(substr(md5(random()::text), 1, 11)) $$;

-- Une réponse déjà écrite il y a p_age (le registre a dit p_resultat), avec sa preuve.
create or replace function tests.b7_reponse(p_ident text, p_resultat text, p_age interval, p_preuve jsonb default '{}'::jsonb) returns uuid
language plpgsql as $$
declare v_id uuid;
begin
  insert into public.filed_verifications_tiers (client_id, registre, identifiant, demande_le, repondu_le, resultat, preuve)
  values (tests.b7_client(), 'vies', p_ident, now() - p_age, now() - p_age, p_resultat, p_preuve) returning id into v_id;
  return v_id;
end $$;

create or replace function tests.test_b7_11_doute() returns setof text
language plpgsql as $f$
declare
  i text; v_id uuid; r jsonb; v public.filed_verifications_tiers; c public.identites_registre; n int;
  v_four uuid; rv record;
begin
  -- 1. Sans réponse valide récente ni soupçon : un refus conclut, comme avant.
  i := tests.b7_ident();
  v_id := tests.b7_demande('vies', i);
  r := public.noter_identite(v_id, 'invalide', '{"registre":"vies","motif":"VIES ne reconnaît pas ce numéro de TVA."}'::jsonb, 'vies');
  return next is(r ->> 'resultat', 'invalide', 'Refus sans réponse valide ni soupçon : invalide');
  return next is(r ->> 'doute', 'false', 'pas de doute');

  -- 2. Le cas Orange : valide il y a six minutes, refus maintenant → indisponible, doute, rien d'écrasé.
  i := tests.b7_ident();
  alter table public.filed_fournisseurs add column if not exists identite_verifiee_le timestamptz;
  alter table public.filed_fournisseurs add column if not exists identite_source text;
  alter table public.filed_fournisseurs add column if not exists identite_verdict jsonb;
  insert into public.filed_fournisseurs (client_id, code, nom, nom_normalise, tva, pays, statut, source)
  values (tests.b7_client(), 'B7-DOUTE', 'Fournisseur doute B7', 'fournisseur doute b7', i, 'FR', 'actif', 'saisie') returning id into v_four;
  insert into public.filed_verifications_tiers (client_id, fournisseur_id, registre, identifiant) values (tests.b7_client(), v_four, 'vies', i) returning id into v_id;
  perform public.noter_identite(v_id, 'valide', '{"registre":"vies","nom":"SA ESSAI"}'::jsonb, 'vies');
  update public.filed_verifications_tiers set repondu_le = now() - interval '6 minutes' where id = v_id;
  update public.identites_registre set verifie_le = now() - interval '6 minutes' where registre = 'vies' and identifiant = i;
  insert into public.filed_verifications_tiers (client_id, fournisseur_id, registre, identifiant, preuve)
  values (tests.b7_client(), v_four, 'vies', i, '{"force": true}') returning id into v_id;
  r := public.noter_identite(v_id, 'invalide', '{"registre":"vies","motif":"VIES ne reconnaît pas ce numéro de TVA."}'::jsonb, 'vies');
  return next is(r ->> 'resultat', 'indisponible', 'Refus six minutes après un valide : écrit indisponible');
  return next is(r ->> 'doute', 'true', 'la porte le dit : doute');
  return next is((r ->> 'recontrolees')::int, 0, 'aucun recontrôle sur un doute');
  select * into v from public.filed_verifications_tiers where id = v_id;
  return next is(v.resultat, 'indisponible', 'la vérification est indisponible');
  return next is(v.preuve ->> 'resultat_registre', 'invalide', 'la preuve garde ce que le registre a dit');
  return next is((v.preuve -> 'doute' ->> 'rang')::int, 1, 'premier doute : rang 1');
  return next ok(v.preuve -> 'doute' ->> 'valide_le' is not null, 'le doute cite la réponse valide');
  select * into c from public.identites_registre where registre = 'vies' and identifiant = i;
  return next is(c.resultat, 'valide', 'Le cache garde la réponse valide');
  return next is(c.preuve ->> 'nom', 'SA ESSAI', 'et sa preuve');
  execute 'select identite_verdict from public.filed_fournisseurs where id = $1' into rv using v_four;
  return next is(rv.identite_verdict ->> 'resultat', 'valide', 'Le verdict valide du fournisseur n''est pas écrasé');

  -- 3. La relance : rien avant une heure ; après une heure, une demande forcée, son travail forcé.
  n := public.identite_relancer(2);
  return next is(n, 0, 'Pas de relance du doute avant une heure');
  -- (le temps passe : le valide à -70 min, le doute à -61 min)
  update public.filed_verifications_tiers set repondu_le = now() - interval '70 minutes' where registre = 'vies' and identifiant = i and resultat = 'valide';
  update public.identites_registre set verifie_le = now() - interval '70 minutes' where registre = 'vies' and identifiant = i;
  update public.filed_verifications_tiers set repondu_le = now() - interval '61 minutes' where id = v_id;
  n := public.identite_relancer(2);
  return next is(n, 1, 'Une heure après, le doute est redemandé (avant les deux heures d''un indisponible ordinaire)');
  select * into v from public.filed_verifications_tiers where client_id = tests.b7_client() and registre = 'vies' and identifiant = i and repondu_le is null;
  return next is(v.preuve ->> 'force', 'true', 'la demande est forcée (le cache valide ne répond pas à la place de VIES)');
  return next is(v.preuve ->> 'origine', 'doute', 'origine : doute');
  return next is((select charge ->> 'force' from public.travaux where cle = 'verification:' || v.id::text), 'true', 'le travail porte force');

  -- 4. Second refus, une heure après le premier : deux refus espacés d'au moins une heure, le refus conclut.
  r := public.noter_identite(v.id, 'invalide', '{"registre":"vies","motif":"VIES ne reconnaît pas ce numéro de TVA."}'::jsonb, 'vies');
  return next is(r ->> 'resultat', 'invalide', 'Deux refus à plus d''une heure : invalide');
  execute 'select identite_verdict from public.filed_fournisseurs where id = $1' into rv using v_four;
  return next is(rv.identite_verdict ->> 'resultat', 'invalide', 'et le verdict du fournisseur suit');
  return next is((select resultat from public.identites_registre where registre = 'vies' and identifiant = i), 'invalide', 'et le cache aussi');

  -- 5. Deux refus à moins d'une heure : second doute, rang 2, relance à six heures.
  i := tests.b7_ident();
  perform tests.b7_reponse(i, 'valide', interval '2 days', '{"nom":"X"}');
  perform tests.b7_reponse(i, 'indisponible', interval '20 minutes', '{"doute":{"rang":1},"resultat_registre":"invalide"}');
  v_id := tests.b7_demande('vies', i);
  r := public.noter_identite(v_id, 'invalide', '{}'::jsonb, 'vies');
  return next is(r ->> 'resultat', 'indisponible', 'Second refus vingt minutes après le premier : encore un doute');
  select * into v from public.filed_verifications_tiers where id = v_id;
  return next is((v.preuve -> 'doute' ->> 'rang')::int, 2, 'rang 2');
  update public.filed_verifications_tiers set repondu_le = now() - interval '2 hours' where id = v_id;
  n := public.identite_relancer(2);
  return next is(n, 0, 'Un doute de rang 2 n''est pas redemandé à deux heures');
  -- (le temps passe : le premier doute à -400 min, le second à -361 min, toujours moins d'une heure d'écart)
  update public.filed_verifications_tiers set repondu_le = now() - interval '400 minutes'
   where registre = 'vies' and identifiant = i and resultat = 'indisponible' and id <> v_id;
  update public.filed_verifications_tiers set repondu_le = now() - interval '361 minutes' where id = v_id;
  n := public.identite_relancer(2);
  return next is(n, 1, 'mais à six heures');

  -- 6. Suspect (TVA FR à clé juste, SIREN actif), sans réponse valide : doute, puis refus confirmé une heure après.
  i := tests.b7_ident();
  v_id := tests.b7_demande('vies', i);
  r := public.noter_identite(v_id, 'invalide', '{"suspect":{"motif":"clé juste, SIREN actif"}}'::jsonb, 'vies');
  return next is(r ->> 'resultat', 'indisponible', 'Refus suspect sans réponse valide : doute');
  update public.filed_verifications_tiers set repondu_le = now() - interval '90 minutes' where id = v_id;
  v_id := tests.b7_demande('vies', i);
  r := public.noter_identite(v_id, 'invalide', '{"suspect":{"motif":"clé juste, SIREN actif"}}'::jsonb, 'vies');
  return next is(r ->> 'resultat', 'invalide', 'confirmé une heure et demie après : invalide (non assujetti)');

  -- 7. Un refus déjà conclu il y a longtemps : un nouveau refus suspect le confirme sans attendre.
  i := tests.b7_ident();
  perform tests.b7_reponse(i, 'invalide', interval '10 days');
  v_id := tests.b7_demande('vies', i);
  r := public.noter_identite(v_id, 'invalide', '{"suspect":{}}'::jsonb, 'vies');
  return next is(r ->> 'resultat', 'invalide', 'Refus suspect qui confirme un refus de dix jours : invalide');

  -- 8. Le cache ne doute pas : une réponse servie depuis le cache est écrite telle quelle.
  i := tests.b7_ident();
  perform tests.b7_reponse(i, 'valide', interval '1 day');
  v_id := tests.b7_demande('vies', i);
  r := public.noter_identite(v_id, 'invalide', '{"cache_du":"x"}'::jsonb, 'cache');
  return next is(r ->> 'resultat', 'invalide', 'Une réponse du cache n''est jamais mise en doute');

  -- 9. Une réponse valide après un doute clôt la série.
  i := tests.b7_ident();
  perform tests.b7_reponse(i, 'valide', interval '3 hours');
  perform tests.b7_reponse(i, 'indisponible', interval '2 hours', '{"doute":{"rang":1}}');
  v_id := tests.b7_demande('vies', i);
  perform public.noter_identite(v_id, 'valide', '{}'::jsonb, 'vies');
  v_id := tests.b7_demande('vies', i);
  r := public.noter_identite(v_id, 'invalide', '{}'::jsonb, 'vies');
  return next is(r ->> 'resultat', 'indisponible', 'Après un valide, un nouveau refus repart en doute (la série recommence)');

  -- 10. Un complément Sirene refusé alors que Sirene a dit valide il y a deux jours : doute, le cache reste valide.
  i := tests.b7_ident();
  insert into public.identites_registre (registre, identifiant, resultat, preuve, source, verifie_le)
  values ('sirene', '999990104', 'valide', '{"etat":"actif"}', 'sirene', now() - interval '2 days')
  on conflict (registre, identifiant) do update set resultat = 'valide', verifie_le = now() - interval '2 days';
  v_id := tests.b7_demande('vies', i);
  r := public.noter_identite(v_id, 'valide', '{}'::jsonb, 'vies',
    '[{"registre":"sirene","identifiant":"999990104","resultat":"invalide","preuve":{"motif":"inconnu"},"source":"recherche-entreprises"}]'::jsonb);
  return next is((select resultat from public.filed_verifications_tiers where preuve ->> 'complement_de' = v_id::text), 'indisponible', 'Complément refusé contre un valide récent : doute');
  return next is((select resultat from public.identites_registre where registre = 'sirene' and identifiant = '999990104'), 'valide', 'le cache Sirene reste valide');

  -- 11. Le cache : un « indisponible » ordinaire n'écrase pas non plus une réponse du registre.
  i := tests.b7_ident();
  v_id := tests.b7_demande('vies', i);
  perform public.noter_identite(v_id, 'valide', '{"nom":"Y"}'::jsonb, 'vies');
  v_id := tests.b7_demande('vies', i);
  perform public.noter_identite(v_id, 'indisponible', '{"motif":"VIES : MS_UNAVAILABLE"}'::jsonb, 'vies');
  return next is((select resultat from public.identites_registre where registre = 'vies' and identifiant = i), 'valide', 'Un indisponible n''écrase pas le cache valide');

  -- 12. Droits : la règle est privée.
  return next ok(not has_function_privilege('authenticated', 'private.identite_doute(text,text,jsonb)', 'execute'), 'authenticated n''exécute pas identite_doute');
end $f$;

select * from runtests('tests'::name, '^test_b7_11');
