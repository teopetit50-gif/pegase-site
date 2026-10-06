-- Tests B7 — la porte identite_balayer (lot b7_03), en pgTAP, schéma « tests » d'A5.
-- Exécutable tel quel par execute_sql sur la RECETTE, après b7_01_portes.sql (tests) et b7_03_balayer.sql.
-- Client du banc ; fournisseurs et identifiants fabriqués (SIREN à clé juste, 99999…) ; runtests() annule tout.

create or replace function tests.b7_fournisseur(p_code text, p_siren text, p_tva text default null, p_statut text default 'actif') returns uuid
language plpgsql as $$
declare v_id uuid;
begin
  insert into public.filed_fournisseurs (client_id, code, nom, nom_normalise, siren, tva, pays, statut, source)
  values (tests.b7_client(), p_code, 'Fournisseur ' || p_code, 'fournisseur ' || lower(p_code), p_siren, p_tva, 'FR', p_statut, 'saisie')
  returning id into v_id;
  return v_id;
end $$;

create or replace function tests.test_b7_10_balayer() returns setof text
language plpgsql as $f$
declare
  v_cl uuid := tests.b7_client();
  f_jamais uuid; f_recent uuid; f_vieux uuid; f_ouvert uuid; f_tva uuid; f_refuse uuid; f_faux uuid;
  n int; v public.filed_verifications_tiers;
begin
  -- Sept fournisseurs : jamais vérifié ; vérifié il y a 10 jours ; il y a 100 jours ; demande déjà ouverte ;
  -- avec un numéro de TVA (→ VIES) ; refusé (ignoré) ; SIREN à clé fausse (ignoré).
  f_jamais := tests.b7_fournisseur('B7-JAMAIS', '999990104');
  f_recent := tests.b7_fournisseur('B7-RECENT', '999990112');
  f_vieux  := tests.b7_fournisseur('B7-VIEUX',  '999990120');
  f_ouvert := tests.b7_fournisseur('B7-OUVERT', '999990138');
  f_tva    := tests.b7_fournisseur('B7-TVA',    '999990146', 'FR' || lpad((((12 + 3 * (999990146 % 97)) % 97))::text, 2, '0') || '999990146');
  f_refuse := tests.b7_fournisseur('B7-REFUSE', '999990153', null, 'refuse');
  f_faux   := tests.b7_fournisseur('B7-FAUX',   '999990105');
  insert into public.filed_verifications_tiers (client_id, fournisseur_id, registre, identifiant, demande_le, repondu_le, resultat)
  values (v_cl, f_recent, 'sirene', '999990112', now() - interval '10 days', now() - interval '10 days', 'valide'),
         (v_cl, f_vieux,  'sirene', '999990120', now() - interval '100 days', now() - interval '100 days', 'valide');
  insert into public.filed_verifications_tiers (client_id, fournisseur_id, registre, identifiant) values (v_cl, f_ouvert, 'sirene', '999990138');

  -- p_max : un seul, le plus ancien d'abord (jamais vérifié avant 100 jours).
  n := public.identite_balayer(90, 1);
  return next is(n, 1, 'p_max = 1 : un seul fournisseur balayé');
  return next ok(exists (select 1 from public.filed_verifications_tiers where fournisseur_id in (f_jamais, f_tva) and repondu_le is null),
                 'le plus ancien d''abord : un fournisseur jamais vérifié');

  -- Le reste, sans plafond.
  n := public.identite_balayer(90, 50);
  return next is(n, 2, 'puis les deux autres à balayer (second jamais vérifié, vieux de 100 jours)');
  return next ok(exists (select 1 from public.filed_verifications_tiers where fournisseur_id = f_jamais and repondu_le is null), 'jamais vérifié → demande ouverte');
  return next ok(exists (select 1 from public.filed_verifications_tiers where fournisseur_id = f_vieux and repondu_le is null), '100 jours → demande ouverte');
  return next ok(not exists (select 1 from public.filed_verifications_tiers where fournisseur_id = f_recent and repondu_le is null), '10 jours → rien');
  return next is((select count(*) from public.filed_verifications_tiers where fournisseur_id = f_ouvert and repondu_le is null), 1::bigint, 'demande déjà ouverte → pas doublée');
  select * into v from public.filed_verifications_tiers where fournisseur_id = f_tva and repondu_le is null;
  return next is(v.registre, 'vies', 'un numéro de TVA valide → VIES, comme le contrôle d''A4');
  return next is(v.identifiant, 'FR' || lpad((((12 + 3 * (999990146 % 97)) % 97))::text, 2, '0') || '999990146', 'identifiant = le numéro de TVA normalisé');
  return next is(v.preuve ->> 'origine', 'balayage', 'la demande dit d''où elle vient');
  return next ok(not exists (select 1 from public.filed_verifications_tiers where fournisseur_id = f_refuse), 'fournisseur refusé → ignoré');
  return next ok(not exists (select 1 from public.filed_verifications_tiers where fournisseur_id = f_faux), 'SIREN à clé fausse → ignoré (rien à demander au registre)');
  return next ok(exists (select 1 from public.travaux t join public.filed_verifications_tiers w on t.cle = 'verification:' || w.id::text
                         where w.fournisseur_id = f_vieux and t.genre = 'identite.verifier'), 'et le travail est déposé par le déclencheur');

  -- Rejouer ne rouvre rien.
  n := public.identite_balayer(90, 50);
  return next is(n, 0, 'un second balayage ne rouvre rien');
  return next ok(not has_function_privilege('authenticated', 'public.identite_balayer(integer,integer)', 'execute'), 'authenticated n''exécute pas identite_balayer');
  return next ok(has_function_privilege('service_role', 'public.identite_balayer(integer,integer)', 'execute'), 'service_role exécute identite_balayer');
end $f$;

select * from runtests('tests'::name, '^test_b7_10_');
