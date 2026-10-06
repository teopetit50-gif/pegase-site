-- c4_02 — OFFLOAD, palier 2 : le rythme de chaque client, le décrochage, la saison, l'alerte avant la clôture
-- (session C4, 06/10/2026). Exécutable tel quel par execute_sql sur la RECETTE, après c4_00_jeu.sql et les
-- migrations c4_01 et c4_02. runtests() annule tout.
--
-- Le jour du calcul est FIXÉ au mercredi 21 octobre 2026 (clôture le 31, alerte 10 jours avant) : les achats sont
-- posés relativement à ce jour, directement en table (en admin), pour que le test ne dépende pas de la date du jour.

-- Un compte du banc et ses achats : p_ecarts = âges des achats en jours avant le jour J, p_montants = leurs montants
-- (le dernier montant sert pour tous les suivants si la liste est plus courte).
create or replace function tests.c4_compte_achats(p_ref text, p_nom text, p_jour date, p_ages integer[], p_montants numeric[])
returns uuid language plpgsql as $$
declare
  banc jsonb := tests.c4_banc();
  v_compte uuid;
  k integer;
begin
  perform tests.redevenir_admin();
  v_compte := public.offload_saisir_compte((banc ->> 'client')::uuid, null, p_ref, p_nom, '{}'::jsonb);
  for k in 1 .. coalesce(cardinality(p_ages), 0) loop
    insert into public.offload_achats (client_id, entite_id, compte_id, date_achat, montant_ht, reference, nature, source)
    values ((banc ->> 'client')::uuid, (banc ->> 'entite')::uuid, v_compte, p_jour - p_ages[k],
            p_montants[least(k, cardinality(p_montants))], p_ref || '-' || k, 'facture', 'saisie');
  end loop;
  return v_compte;
end $$;

create or replace function tests.c4_signal(p_compte uuid) returns public.offload_signaux
language sql stable as $$ select * from public.offload_signaux s where s.compte_id = p_compte $$;

create or replace function tests.test_c4_02_detection() returns setof text
language plpgsql as $f$
declare
  banc jsonb := tests.c4_banc();
  v_client uuid := (banc ->> 'client')::uuid;
  j date := date '2026-10-21';
  v_regulier uuid; v_decroche uuid; v_tu uuid; v_baisse uuid; v_saison uuid; v_unique uuid; v_rien uuid; v_petit uuid;
  s public.offload_signaux;
  r jsonb;
begin
  perform tests.c4_installer();
  perform public.offload_regler(v_client, '{"montant_min": 200}');

  -- Régulier : un achat tous les 30 jours depuis deux ans, le dernier il y a 10 jours.
  v_regulier := tests.c4_compte_achats('R1', 'Régulier SA', j, array(select 10 + 30 * k from generate_series(0, 23) k), array[500]);
  -- Décroche : tous les 30 jours pendant deux ans, puis rien depuis 60 jours.
  v_decroche := tests.c4_compte_achats('D1', 'Décrochage SARL', j, array(select 60 + 30 * k from generate_series(0, 23) k), array[800]);
  -- S'est tu : tous les 20 jours, puis rien depuis 200 jours.
  v_tu := tests.c4_compte_achats('T1', 'Silence & Fils', j, array(select 200 + 20 * k from generate_series(0, 20) k), array[300]);
  -- Baisse : tous les 30 jours, au même rythme, mais 1 000 € par achat il y a un an et 300 € depuis.
  v_baisse := tests.c4_compte_achats('B1', 'Baisse Industrie', j, array(select 5 + 30 * k from generate_series(0, 23) k),
                                     array[300, 300, 300, 300, 300, 300, 300, 300, 300, 300, 300, 300, 1000]);
  -- Saison : achète chaque mois de septembre (2023, 2024, 2025), rien en septembre 2026.
  v_saison := tests.c4_compte_achats('S1', 'Saison Jardins', j, array[j - date '2025-09-15', j - date '2024-09-12', j - date '2023-09-20'], array[2400]);
  -- Un seul achat il y a 200 jours.
  v_unique := tests.c4_compte_achats('U1', 'Unique SAS', j, array[200], array[900]);
  -- Aucun achat.
  v_rien := tests.c4_compte_achats('N1', 'Jamais Daté', j, array[]::integer[], array[0]);
  -- Sous le seuil : 150 € cumulés.
  v_petit := tests.c4_compte_achats('P1', 'Petit Compte', j, array[300, 400], array[75]);

  r := private.offload_detecter(v_client, j);
  return next is(r ->> 'cloture', '2026-10-31', 'La clôture du mois est le 31 octobre');

  s := tests.c4_signal(v_regulier);
  return next is(s.niveau, 'ok', 'Le client régulier est « ok »');
  return next is(s.rythme_jours, 30.0::numeric(8,1), 'Son rythme est mesuré : un achat tous les 30 jours');
  return next is(s.attendu_le, j + 20, 'Son prochain achat est attendu dans 20 jours');
  return next is(s.score, 0::smallint, 'Score nul');

  s := tests.c4_signal(v_decroche);
  return next is(s.niveau, 'decroche', 'Le client sans achat depuis deux fois son rythme décroche');
  return next ok(s.raisons @> '[{"code": "retard"}]' and (s.raisons -> 0 ->> 'phrase') like 'Il achetait en moyenne tous les 30 jours ; rien depuis 60 jours%(2,0 fois son rythme).',
                 'La raison est écrite en phrase, avec ses chiffres : ' || coalesce(s.raisons -> 0 ->> 'phrase', 'aucune'));
  return next is(s.score, 30::smallint, 'Le score est la somme des points : (2 − 1) × 30');
  return next ok(s.avant_cloture, 'Il est signalé avant la clôture du 31 octobre');
  return next ok(s.raisons @> '[{"code": "avant_cloture"}]', 'La phrase de clôture figure dans les raisons');
  return next ok(s.priorite > 0 and s.priorite = round(s.valeur_annuelle * s.score / 100.0, 2),
                 'La priorité est la valeur annuelle attendue pondérée par le score');

  s := tests.c4_signal(v_tu);
  return next is(s.niveau, 'eteint', 'Le client sans achat depuis dix fois son rythme s''est tu');
  return next ok((s.raisons -> 0 ->> 'phrase') like 'Le client s''est tu%', 'Phrase : ' || coalesce(s.raisons -> 0 ->> 'phrase', 'aucune'));

  s := tests.c4_signal(v_baisse);
  return next is(s.niveau, 'ralentit', 'Le client qui achète toujours mais trois fois moins ralentit');
  return next ok(s.raisons @> '[{"code": "baisse"}]', 'Raison : baisse du chiffre sur douze mois');
  return next ok(s.raisons @> '[{"code": "panier"}]', 'Raison : son panier fond');
  return next ok(not s.avant_cloture, 'Un client qui ralentit sans retard n''est pas une alerte de clôture');

  s := tests.c4_signal(v_saison);
  return next is(s.niveau, 'saison', 'Le client de septembre, sans achat en septembre 2026, est signalé « saison »');
  return next ok((select x ->> 'phrase' from jsonb_array_elements(s.raisons) x where x ->> 'code' = 'saison')
                   = 'Il achète chaque année en septembre (2023, 2024, 2025) ; rien en septembre 2026 à ce jour.',
                 'Phrase de saison exacte');

  s := tests.c4_signal(v_unique);
  return next is(s.niveau, 'eteint', 'Un seul achat il y a 200 jours, au-delà du délai de 90 jours : il s''est tu');
  return next ok((s.raisons -> 0 ->> 'phrase') like 'Un seul achat connu, le % : rien depuis 200 jours, au-delà de votre délai de 90 jours.',
                 'Phrase : ' || coalesce(s.raisons -> 0 ->> 'phrase', 'aucune'));

  return next is((tests.c4_signal(v_rien)).niveau, 'sans_achat', 'Un compte que rien ne date est présenté à part');
  return next is((tests.c4_signal(v_petit)).niveau, 'sous_seuil', 'Un compte sous le montant minimal n''est pas alerté');

  return next ok((select bool_and(s2.score = coalesce((select sum((x ->> 'points')::integer) from jsonb_array_elements(s2.raisons) x), 0))
                  from public.offload_signaux s2 where s2.client_id = v_client),
                 'Partout, le score est exactement la somme des points de ses raisons');
  return next is((select s2.compte_id from public.offload_signaux s2 where s2.client_id = v_client order by s2.priorite desc limit 1), v_tu,
                 'Le premier de la liste est celui qui pèse le plus (priorité), pas le premier par ordre alphabétique');

  return next ok(exists (select 1 from public.journal_opposable x where x.client_id = v_client and x.action = 'offload.signal'
                         and x.objet_id = v_decroche::text and x.donnees ->> 'niveau' = 'decroche'),
                 'L''entrée en décrochage est au journal');
  r := private.offload_detecter(v_client, j);
  return next is((r ->> 'entrees')::integer, 0, 'Recalculer le même jour n''inscrit rien de plus au journal');
  return next is((tests.c4_signal(v_decroche)).depuis_le, j, 'depuis_le garde la date d''entrée dans le niveau');

  -- Le client qui décroche commande : il redevient « ok ».
  insert into public.offload_achats (client_id, entite_id, compte_id, date_achat, montant_ht, reference, nature, source)
  values (v_client, (banc ->> 'entite')::uuid, v_decroche, j - 1, 800, 'D1-retour', 'facture', 'saisie');
  perform private.offload_detecter(v_client, j);
  return next is((tests.c4_signal(v_decroche)).niveau, 'ok', 'Après une commande, il redevient « ok »');

  -- Hors de la fenêtre de clôture (le 5 du mois), pas d'alerte de clôture.
  perform private.offload_detecter(v_client, date '2026-11-05');
  return next ok(not (tests.c4_signal(v_tu)).avant_cloture, 'Le 5 novembre, loin de la clôture, pas d''alerte de clôture');
end $f$;

create or replace function tests.test_c4_02_reglages_et_droits() returns setof text
language plpgsql as $f$
declare
  banc jsonb := tests.c4_banc();
  v_client uuid := (banc ->> 'client')::uuid;
  v_lecteur uuid;
  r jsonb;
begin
  perform tests.c4_installer();
  v_lecteur := tests.c4_compte(v_client, 'lecteur', 'lecteur-c4@banc-varelo.test');
  return next is(private.offload_cloture(date '2026-10-21', null), date '2026-10-31', 'Sans jour fixé, la clôture est la fin du mois');
  return next is(private.offload_cloture(date '2026-02-10', 31::smallint), date '2026-02-28', 'Un 31 en février tombe le 28');
  return next is(private.offload_cloture(date '2026-10-26', 25::smallint), date '2026-11-25', 'Une clôture passée renvoie au mois suivant');

  perform tests.endosser((banc ->> 'gerant')::uuid, 'gerant@banc-varelo.test');
  r := public.offload_regler(v_client, '{"delai_silence_jours": 120, "jour_cloture": 25}');
  return next is((r ->> 'delai_silence_jours')::integer, 120, 'Le gérant règle le délai de silence');
  return next throws_ok(format('select public.offload_regler(%L::uuid, %L::jsonb)', v_client, '{"mode": "reel"}'), '22023',
                        'Le mode ne se change pas par les réglages');
  r := public.offload_recalculer(v_client);
  return next ok(r ? 'niveaux', 'Le gérant recalcule à la demande');
  perform tests.endosser(v_lecteur, 'lecteur-c4@banc-varelo.test');
  return next throws_ok(format('select public.offload_regler(%L::uuid, %L::jsonb)', v_client, '{"montant_min": 1}'), '42501',
                        'Un lecteur ne règle rien');
  return next throws_ok(format('select public.offload_recalculer(%L::uuid)', v_client), '42501', 'Un lecteur ne recalcule pas');
  perform tests.redevenir_admin();
  return next ok(not has_function_privilege('authenticated', 'private.offload_detecter(uuid, date)', 'execute'),
                 'Le calcul reste au serveur');
  return next ok((select c.relrowsecurity from pg_class c where c.oid = 'public.offload_signaux'::regclass)
                 and not has_table_privilege('anon', 'public.offload_signaux', 'select')
                 and not has_table_privilege('authenticated', 'public.offload_signaux', 'update'),
                 'offload_signaux : RLS, rien pour anon, lecture seule pour authenticated');
  return next ok(exists (select 1 from cron.job where jobname = 'offload-detection'), 'Le cron offload-detection est posé');
end $f$;

-- Après un import, la détection est recalculée sans attendre la nuit.
create or replace function tests.test_c4_02_apres_import() returns setof text
language plpgsql as $f$
declare
  banc jsonb := tests.c4_banc();
  v_client uuid := (banc ->> 'client')::uuid;
begin
  perform tests.c4_installer();
  perform tests.c4_deposer('ventes', jsonb_build_array(
    jsonb_build_object('compte_ref', 'C010', 'compte_nom', 'Import Direct', 'date', to_char(current_date - 300, 'DD/MM/YYYY'), 'reference', 'F1', 'montant', '400,00')),
    'detection-1');
  return next is((select s.niveau from public.offload_signaux s join public.offload_comptes c on c.id = s.compte_id
                  where c.client_id = v_client and c.ref = 'C010'), 'eteint',
                 'Le compte importé est évalué dès l''import (un achat il y a 300 jours : il s''est tu)');
end $f$;

select * from runtests('tests'::name, '^test_c4_02_');
