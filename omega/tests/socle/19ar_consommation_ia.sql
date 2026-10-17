-- Socle 19ar — le plafond d'IA compte tous les genres de travaux et les consommations hors travaux.
-- Banc cccccccc-…000c. runtests() annule tout.

create or replace function tests.test_socle_19ar_consommation_ia() returns setof text
language plpgsql as $f$
declare
  banc uuid := 'cccccccc-0000-4000-8000-00000000000c';
  v_avant numeric;
  v_apres numeric;
begin
  perform tests.endosser_serveur();
  v_avant := public.consommation_ia_jour(banc);
  perform tests.redevenir_admin();
  insert into public.travaux (client_id, module, genre, charge, cle, etat, resultat, fini_le) values
    (banc, 'lecteur', 'lecteur.analyser', '{}'::jsonb, 'socle19ar:1', 'fait', '{"cout_eur": 0.25, "cout_total_eur": 0.75}'::jsonb, now()),
    (banc, 'lecteur', 'lecteur.media', '{}'::jsonb, 'socle19ar:2', 'fait', '{"cout_eur": 0.0125}'::jsonb, now()),
    (banc, 'lecteur', 'lecteur.lire', '{}'::jsonb, 'socle19ar:3', 'fait', '{"cout_eur": 1}'::jsonb, now() - interval '3 days'),
    (banc, 'lecteur', 'lecteur.lire', '{}'::jsonb, 'socle19ar:4', 'echec', '{"cout_eur": 2}'::jsonb, now());
  perform tests.endosser_serveur();
  perform public.noter_consommation_ia(banc, 'varelo', 'assistant.reponse', 0.1, '{"appels": 1}'::jsonb);
  v_apres := public.consommation_ia_jour(banc);
  perform tests.redevenir_admin();
  return next is(v_apres - v_avant, 0.3625::numeric, 'analyse (coût du palier) + médias + hors travaux ; ni la veille ni les échecs');
  return next ok(has_function_privilege('service_role', 'public.noter_consommation_ia(uuid, text, text, numeric, jsonb)', 'execute')
                 and not has_function_privilege('authenticated', 'public.noter_consommation_ia(uuid, text, text, numeric, jsonb)', 'execute'),
                 'noter_consommation_ia : service_role seul');
  return next ok(not has_table_privilege('authenticated', 'public.consommations_ia', 'select'), 'registre fermé aux utilisateurs');
  perform tests.endosser_serveur();
  return next throws_ok(format('select public.noter_consommation_ia(%L::uuid, ''varelo'', ''x'', -1)', banc), '22023', null, 'coût négatif refusé');
  perform tests.redevenir_admin();
end $f$;

select * from runtests('tests'::name, '^test_socle_19ar_');
