-- Tests B5 — LORANI : retenue de garantie, avance et pénalités recalculées sur chaque situation (b5_33).
-- pgTAP, schéma « tests », client du banc cccccccc-0000-4000-8000-00000000000c ; aides tests.b5_* de b5_01.
-- runtests() annule tout ce que le test écrit.

create or replace function tests.test_b5_22_retenue_avance_penalites() returns setof text
language plpgsql as $f$
declare
  jeu jsonb; v_client uuid; v_gerant uuid; v_referent uuid;
  v_projet uuid; v_lot uuid; v_marche uuid; v_s1 uuid; v_s2 uuid; v_s3 uuid; x jsonb;
begin
  jeu := tests.b5_jeu();
  v_client := (jeu ->> 'client')::uuid; v_gerant := (jeu ->> 'gerant')::uuid; v_referent := (jeu ->> 'referent')::uuid;
  perform tests.b5_endosser(v_gerant);
  insert into public.lorani_projets (client_id, nom, code_postal, commune, code_insee, nature, marche_public)
  values (v_client, 'Groupe scolaire (test b5_22)', '44000', 'Nantes', '44109', 'erp', true) returning id into v_projet;
  insert into public.lorani_membres_projet (client_id, projet_id, user_id, role_projet) values (v_client, v_projet, v_referent, 'chef_projet');
  insert into public.lorani_lots (client_id, projet_id, numero, intitule) values (v_client, v_projet, '01', 'Terrassement') returning id into v_lot;
  return next throws_ok(format('insert into public.lorani_marches (client_id, projet_id, lot_id, titulaire, montant_ht, avance_pct) values (%L, %L, %L, ''X'', 1000, 40)', v_client, v_projet, v_lot),
                        '23514', null, '0. une avance au-delà de 30 % est refusée');
  insert into public.lorani_marches (client_id, projet_id, lot_id, titulaire, montant_ht, avance_pct, delai_execution_jours, demarrage_le)
  values (v_client, v_projet, v_lot, 'Terrassements du Lac', 90000, 5, 90, current_date - 120) returning id into v_marche;

  -- ── 1. La retenue n'est pas déduite ──
  perform tests.b5_endosser(v_referent);
  insert into public.lorani_situations (client_id, projet_id, marche_id, numero, mois, cumul_ht, recue_le, retenue_deduite_ht)
  values (v_client, v_projet, v_marche, 1, current_date, 36000, current_date - 100, 0) returning id into v_s1;
  perform tests.b5_admin();
  select montants into x from public.lorani_situations where id = v_s1;
  return next ok((x ->> 'retenue_attendue')::numeric = 1800 and x -> 'ecarts' -> 0 ->> 'nature' = 'retenue' and (x ->> 'net_attendu')::numeric = 34200,
                 '1. 36 000 € cumulés : 1 800 € de retenue attendus, non déduits ; net attendu 34 200 € : ' || x::text);
  return next ok(exists (select 1 from public.alertes where client_id = v_client and cle_regroupement = format('lorani:situation:%s:montants', v_s1)
                         and niveau = 'attention' and titre like '%la retenue de garantie (5 %) n''est pas déduite du cumul%'),
                 '1. alerte : « la retenue de garantie (5 %) n''est pas déduite du cumul »');

  -- ── 2. L'avance : remboursée de 65 % à 80 % d'exécution ──
  perform tests.b5_endosser(v_referent);
  insert into public.lorani_situations (client_id, projet_id, marche_id, numero, mois, cumul_ht, recue_le, retenue_deduite_ht, avance_remboursee_ht)
  values (v_client, v_projet, v_marche, 2, current_date, 65250, current_date - 40, 3262.50, 0) returning id into v_s2;
  perform tests.b5_admin();
  select montants into x from public.lorani_situations where id = v_s2;
  return next ok((x ->> 'avance')::numeric = 4500 and (x ->> 'avance_a_rembourser')::numeric = 2250 and jsonb_array_length(x -> 'ecarts') = 1
                 and x -> 'ecarts' -> 0 ->> 'nature' = 'avance',
                 '2. 72,5 % exécutés : la moitié de l''avance de 4 500 € à rembourser (2 250 €), rien remboursé ; la retenue est juste : ' || x::text);

  -- ── 3. Les pénalités : après la fin contractuelle, 1/3000 du marché par jour (marché public) ──
  perform tests.b5_endosser(v_referent);
  insert into public.lorani_situations (client_id, projet_id, marche_id, numero, mois, cumul_ht, recue_le, retenue_deduite_ht, avance_remboursee_ht)
  values (v_client, v_projet, v_marche, 3, current_date, 81000, current_date - 20, 4050, 4500) returning id into v_s3;
  perform tests.b5_admin();
  select montants into x from public.lorani_situations where id = v_s3;
  return next ok((x ->> 'jours_retard')::int = 10 and (x ->> 'penalite_jour')::numeric = 30 and (x ->> 'penalites_applicables')::numeric = 300
                 and x -> 'ecarts' -> 0 ->> 'nature' = 'penalites',
                 '3. 10 jours après la fin contractuelle : 30 € par jour, 300 € applicables, non déduits : ' || x::text);
  perform tests.b5_endosser(v_referent);
  update public.lorani_situations set penalites_ht = 300 where id = v_s3;
  perform tests.b5_admin();
  return next ok((select montants -> 'ecarts' = '[]'::jsonb from public.lorani_situations where id = v_s3), '3. les 300 € déduits : plus d''écart');
end $f$;

select * from runtests('tests'::name, '^test_b5_22_');
