-- b1_23 — VARELO : la page du groupe dans le point du matin de la présidence (migration b1_20, après b1_17)
-- Exécutable tel quel par execute_sql sur la RECETTE, après 00_installation.sql (A5), b1_00_aides.sql et b1_11.
-- runtests() annule tout ce que le test écrit. Motif : ^test_b1_23_
--
-- La société A a ses comptes annuels publiés (exercices N et N-1, clos il y a plus d'un an) ; la société B une
-- balance de logiciel d'il y a 5 jours. La présidence lit le total, une ligne par société avec l'écart sur l'an
-- dernier, « non publiée » pour la trésorerie de A, et pas de « à redéposer » pour des comptes publiés.

create or replace function tests.test_b1_23_page_presidence() returns setof text
language plpgsql as $f$
declare
  b jsonb;
  v_client uuid; a uuid; bb uuid;
  g uuid; ge text := 'b1-gerant@essai.invalid';
  n date := (date_trunc('year', current_date) - interval '1 day')::date - 365;
  m jsonb; t text;
begin
  b := tests.b1_preparer(3);
  v_client := (b ->> 'client')::uuid; a := (b ->> 'soc_a')::uuid; bb := (b ->> 'soc_b')::uuid; g := (b ->> 'gerant')::uuid;
  perform tests.endosser(g, ge);
  perform public.grp_deposer_balance(v_client, a, (n - interval '1 year')::date, (n - interval '2 years' + interval '1 day')::date,
    jsonb_build_array(jsonb_build_object('compte', '706000', 'solde', '-1000000'), jsonb_build_object('compte', '600000', 'solde', '900000'),
                      jsonb_build_object('compte', '471000', 'solde', '100000')), 'Comptes annuels publiés (INPI), exercice N-1, SIREN 849300157');
  perform public.grp_deposer_balance(v_client, a, n, (n - interval '1 year' + interval '1 day')::date,
    jsonb_build_array(jsonb_build_object('compte', '706000', 'solde', '-1200000'), jsonb_build_object('compte', '600000', 'solde', '1050000'),
                      jsonb_build_object('compte', '471000', 'solde', '150000')), 'Comptes annuels publiés (INPI), exercice N, SIREN 849300157');
  perform public.grp_deposer_balance(v_client, bb, current_date - 5, date_trunc('year', current_date)::date, tests.b1_balance_a(), 'EBP');
  perform tests.redevenir_admin();

  m := private.grp_lignes_groupe(v_client);
  select string_agg(e ->> 'texte', ' | ' order by i) into t from jsonb_array_elements(m) with ordinality as x(e, i);
  return next ok(m -> 0 ->> 'texte' like 'Le groupe : ventes 1 300 000 €, résultat % €, 2 sociétés ; trésorerie % hors 1 société aux comptes publiés',
                 format('le total du groupe vient en premier : %s', m -> 0 ->> 'texte'));
  return next ok(t like format('%%Essai B1 Distribution : ventes 1 200 000 € (exercice clos le %s, derniers comptes publiés), +20,0 %% sur l''an dernier ; résultat 150 000 € ; trésorerie non publiée%%',
                               to_char(n, 'DD/MM/YYYY')), format('la société aux comptes publiés : ventes, écart, résultat, « non publiée » (%s)', t));
  return next ok(t like '%Essai B1 Logistique : ventes 100 000 € au % ; résultat % € ; trésorerie % €%', 'la société au logiciel : sa trésorerie en euros');
  return next ok(t not like '%Essai B1 Distribution date du%à redéposer%', 'pas de « à redéposer » pour des comptes publiés');
  return next ok(jsonb_array_length(m) <= 15, 'au plus 15 lignes');

  perform private.grp_deposer_points((current_date + time '06:00') at time zone 'Europe/Paris');
  return next is(tests.compter('public', 'points_sections', format('client_id = %L and module = ''varelo'' and titre = ''Le groupe ce matin'' and equipe_id = %L',
                 v_client, (select id from public.equipes where client_id = v_client and cle = 'presidence'))), 1::bigint,
                 'la section « Le groupe ce matin » est déposée à la présidence');
end $f$;
