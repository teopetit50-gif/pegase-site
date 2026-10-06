-- Tests B7 — private.filed_verification_recente ignore un « indisponible » quand une réponse du registre existe
-- (lot b7_05), en pgTAP, schéma « tests » d'A5.
-- Exécutable tel quel par execute_sql sur la RECETTE, après b7_01_portes.sql (tests) et b7_05_recente.sql.
-- Client du banc ; identifiants tirés au sort (préfixe ZZ, jamais vus) ; runtests() annule tout.

create or replace function tests.test_b7_12_recente() returns setof text
language plpgsql as $f$
declare
  v_cl uuid := tests.b7_client();
  i text; v_valide uuid; v_doute uuid; v_inval uuid; v_ind uuid; r public.filed_verifications_tiers;
  v_autre uuid;
begin
  -- 1. Le cas Orange : valide il y a une heure, doute il y a dix minutes → la réponse valide.
  i := 'ZZ' || upper(substr(md5(random()::text), 1, 11));
  insert into public.filed_verifications_tiers (client_id, registre, identifiant, demande_le, repondu_le, resultat, preuve)
  values (v_cl, 'vies', i, now() - interval '1 hour', now() - interval '1 hour', 'valide', '{"nom":"SA ESSAI"}') returning id into v_valide;
  insert into public.filed_verifications_tiers (client_id, registre, identifiant, demande_le, repondu_le, resultat, preuve)
  values (v_cl, 'vies', i, now() - interval '10 minutes', now() - interval '10 minutes', 'indisponible', '{"doute":{"rang":1},"resultat_registre":"invalide"}') returning id into v_doute;
  r := private.filed_verification_recente(v_cl, 'vies', i);
  return next is(r.id, v_valide, 'Un doute de dix minutes ne cache pas la réponse valide d''il y a une heure');
  return next is(r.resultat, 'valide', 'résultat : valide');
  r := private.filed_verification_recente(v_cl, 'vies', lower(i));
  return next is(r.id, v_valide, 'l''identifiant est normalisé');

  -- 2. Une panne ordinaire après une réponse valide de vingt jours : la réponse valide.
  i := 'ZZ' || upper(substr(md5(random()::text), 1, 11));
  insert into public.filed_verifications_tiers (client_id, registre, identifiant, demande_le, repondu_le, resultat)
  values (v_cl, 'sirene', i, now() - interval '20 days', now() - interval '20 days', 'valide') returning id into v_valide;
  insert into public.filed_verifications_tiers (client_id, registre, identifiant, demande_le, repondu_le, resultat, preuve)
  values (v_cl, 'sirene', i, now() - interval '5 minutes', now() - interval '5 minutes', 'indisponible', '{"motif":"Sirene : HTTP 503"}');
  return next is((private.filed_verification_recente(v_cl, 'sirene', i)).id, v_valide, 'Une panne de cinq minutes ne cache pas un valide de vingt jours');

  -- 3. Une panne après un refus : le refus reste (une panne n'adoucit pas un blocage).
  i := 'ZZ' || upper(substr(md5(random()::text), 1, 11));
  insert into public.filed_verifications_tiers (client_id, registre, identifiant, demande_le, repondu_le, resultat)
  values (v_cl, 'vies', i, now() - interval '3 days', now() - interval '3 days', 'invalide') returning id into v_inval;
  insert into public.filed_verifications_tiers (client_id, registre, identifiant, demande_le, repondu_le, resultat)
  values (v_cl, 'vies', i, now() - interval '5 minutes', now() - interval '5 minutes', 'indisponible');
  return next is((private.filed_verification_recente(v_cl, 'vies', i)).id, v_inval, 'Une panne ne cache pas un refus de trois jours');

  -- 4. Sans réponse du registre : la règle d'a4_10 (un indisponible vaut deux heures).
  i := 'ZZ' || upper(substr(md5(random()::text), 1, 11));
  insert into public.filed_verifications_tiers (client_id, registre, identifiant, demande_le, repondu_le, resultat)
  values (v_cl, 'vies', i, now() - interval '1 hour', now() - interval '1 hour', 'indisponible') returning id into v_ind;
  return next is((private.filed_verification_recente(v_cl, 'vies', i)).id, v_ind, 'Seul, un indisponible d''une heure compte encore');
  update public.filed_verifications_tiers set repondu_le = now() - interval '3 hours' where id = v_ind;
  return next ok((private.filed_verification_recente(v_cl, 'vies', i)).id is null, 'Seul, un indisponible de trois heures ne compte plus');

  -- 5. Une réponse plus récente que tout gagne toujours ; hors fenêtre, rien ne compte.
  i := 'ZZ' || upper(substr(md5(random()::text), 1, 11));
  insert into public.filed_verifications_tiers (client_id, registre, identifiant, demande_le, repondu_le, resultat)
  values (v_cl, 'vies', i, now() - interval '2 days', now() - interval '2 days', 'valide');
  insert into public.filed_verifications_tiers (client_id, registre, identifiant, demande_le, repondu_le, resultat)
  values (v_cl, 'vies', i, now() - interval '1 day', now() - interval '1 day', 'invalide') returning id into v_inval;
  return next is((private.filed_verification_recente(v_cl, 'vies', i)).id, v_inval, 'La réponse la plus récente du registre gagne');
  i := 'ZZ' || upper(substr(md5(random()::text), 1, 11));
  insert into public.filed_verifications_tiers (client_id, registre, identifiant, demande_le, repondu_le, resultat)
  values (v_cl, 'vies', i, now() - interval '100 days', now() - interval '100 days', 'valide');
  insert into public.filed_verifications_tiers (client_id, registre, identifiant, demande_le, repondu_le, resultat)
  values (v_cl, 'vies', i, now() - interval '10 minutes', now() - interval '10 minutes', 'indisponible') returning id into v_ind;
  return next is((private.filed_verification_recente(v_cl, 'vies', i)).id, v_ind, 'Un valide de cent jours (hors fenêtre) ne cache pas l''indisponible');
  return next is((private.filed_verification_recente(v_cl, 'vies', i, 120)).resultat, 'valide', 'mais avec une fenêtre de 120 jours, si');

  -- 6. Une réponse d'un autre client ne compte pas (la fonction reste par client).
  i := 'ZZ' || upper(substr(md5(random()::text), 1, 11));
  v_autre := (select c.id from public.clients c where c.id <> v_cl limit 1);
  if v_autre is not null then
    insert into public.filed_verifications_tiers (client_id, registre, identifiant, demande_le, repondu_le, resultat)
    values (v_autre, 'vies', i, now() - interval '1 day', now() - interval '1 day', 'valide');
  end if;
  insert into public.filed_verifications_tiers (client_id, registre, identifiant, demande_le, repondu_le, resultat)
  values (v_cl, 'vies', i, now() - interval '10 minutes', now() - interval '10 minutes', 'indisponible') returning id into v_ind;
  return next is((private.filed_verification_recente(v_cl, 'vies', i)).id, v_ind, 'La réponse d''un autre client ne cache pas l''indisponible de celui-ci');
end $f$;

select * from runtests('tests'::name, '^test_b7_12');
