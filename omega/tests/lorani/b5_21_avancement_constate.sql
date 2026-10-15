-- Tests B5 — LORANI : l'avancement constaté au compte rendu, comparé à l'avancement que la situation facture (b5_32).
-- pgTAP, schéma « tests », client du banc cccccccc-0000-4000-8000-00000000000c ; aides tests.b5_* de b5_01.
-- runtests() annule tout ce que le test écrit.

create or replace function tests.test_b5_21_avancement_constate() returns setof text
language plpgsql as $f$
declare
  jeu jsonb; v_client uuid; v_gerant uuid; v_referent uuid;
  v_projet uuid; v_autre uuid; v_lot uuid; v_lot_autre uuid; v_marche uuid; v_cr uuid; v_s4 uuid; v_s5 uuid;
  s public.lorani_situations;
begin
  jeu := tests.b5_jeu();
  v_client := (jeu ->> 'client')::uuid; v_gerant := (jeu ->> 'gerant')::uuid; v_referent := (jeu ->> 'referent')::uuid;
  perform tests.b5_endosser(v_gerant);
  insert into public.lorani_projets (client_id, nom, code_postal, commune, code_insee, nature)
  values (v_client, 'Maison Lemaître (test b5_21)', '44000', 'Nantes', '44109', 'maison_individuelle') returning id into v_projet;
  insert into public.lorani_projets (client_id, nom, code_postal, commune, code_insee, nature)
  values (v_client, 'Autre projet (test b5_21)', '44000', 'Nantes', '44109', 'maison_individuelle') returning id into v_autre;
  insert into public.lorani_membres_projet (client_id, projet_id, user_id, role_projet) values (v_client, v_projet, v_referent, 'chef_projet');
  insert into public.lorani_lots (client_id, projet_id, numero, intitule) values (v_client, v_projet, '02', 'Gros œuvre') returning id into v_lot;
  insert into public.lorani_lots (client_id, projet_id, numero, intitule) values (v_client, v_autre, '02', 'Gros œuvre') returning id into v_lot_autre;
  insert into public.lorani_marches (client_id, projet_id, lot_id, titulaire, montant_ht, avenants_ht)
  values (v_client, v_projet, v_lot, 'Bâti Ouest SAS', 95000, 5000) returning id into v_marche;

  -- ── 1. Le compte rendu porte l'avancement constaté par lot ──
  perform tests.b5_endosser(v_referent);
  return next throws_ok(format('insert into public.lorani_comptes_rendus (client_id, entite_id, projet_id, visite_le, avancement_lots) values (%L, %L, %L, current_date - 5, %L)',
                               v_client, v_client, v_projet, jsonb_build_object(v_lot_autre, 50)), '22023', null, '1. un lot d''un autre projet est refusé');
  return next throws_ok(format('insert into public.lorani_comptes_rendus (client_id, entite_id, projet_id, visite_le, avancement_lots) values (%L, %L, %L, current_date - 5, %L)',
                               v_client, v_client, v_projet, jsonb_build_object(v_lot, 120)), '22023', null, '1. un avancement au-delà de 100 % est refusé');
  insert into public.lorani_comptes_rendus (client_id, entite_id, projet_id, visite_le, avancement_lots)
  values (v_client, v_client, v_projet, current_date - 5, jsonb_build_object(v_lot, 55.04)) returning id into v_cr;
  perform tests.b5_admin();
  return next ok((select (avancement_lots ->> v_lot::text)::numeric = 55.0 from public.lorani_comptes_rendus where id = v_cr), '1. 55 % constatés au gros œuvre, arrondi au dixième');

  -- ── 2. Une situation à 62 % : comparée dès que le compte rendu est diffusé ──
  perform tests.b5_endosser(v_referent);
  insert into public.lorani_situations (client_id, projet_id, marche_id, numero, mois, cumul_ht, recue_le)
  values (v_client, v_projet, v_marche, 4, current_date, 62000, current_date - 2) returning id into v_s4;
  perform tests.b5_admin();
  select * into s from public.lorani_situations where id = v_s4;
  return next ok(s.avancement_declare = 62.0 and s.avancement_constate is null, '2. avant diffusion : 62 % déclarés (62 000 € sur 100 000 €), rien de constaté');
  perform tests.b5_endosser(v_referent);
  update public.lorani_comptes_rendus set statut = 'diffuse' where id = v_cr;
  perform tests.b5_admin();
  select * into s from public.lorani_situations where id = v_s4;
  return next ok(s.avancement_constate = 55.0 and s.avancement_cr = v_cr, '2. diffusé : 55 % constatés, le compte rendu cité');
  return next ok(exists (select 1 from public.alertes where client_id = v_client and cle_regroupement = format('lorani:situation:%s:avancement', v_s4)
                         and niveau = 'attention' and titre like '%facture 62 % d''avancement, le chantier en est à 55 %%'),
                 '2. alerte : la situation facture 62 %, le chantier en est à 55 %');

  -- ── 3. Sous 5 points : comparée, sans alerte ; diffusé, le constat est figé ──
  perform tests.b5_endosser(v_referent);
  insert into public.lorani_situations (client_id, projet_id, marche_id, numero, mois, cumul_ht, recue_le)
  values (v_client, v_projet, v_marche, 5, current_date, 59000, current_date - 1) returning id into v_s5;
  perform tests.b5_admin();
  return next ok((select avancement_constate = 55.0 from public.lorani_situations where id = v_s5)
                 and not exists (select 1 from public.alertes where client_id = v_client and cle_regroupement = format('lorani:situation:%s:avancement', v_s5)),
                 '3. 59 % contre 55 % : comparée, pas d''alerte');
  perform tests.b5_endosser(v_referent);
  return next throws_ok(format('update public.lorani_comptes_rendus set avancement_lots = %L where id = %L', '{}', v_cr), '55000', null,
                        '3. l''avancement d''un compte rendu diffusé ne se réécrit pas');
end $f$;

select * from runtests('tests'::name, '^test_b5_21_');
