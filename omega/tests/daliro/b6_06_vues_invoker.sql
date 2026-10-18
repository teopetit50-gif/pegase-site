-- b6_06 — DALIRO : les vues des avenants lisent sous la RLS du lecteur (session B6, 06/10/2026), b6_11.
-- Exécutable tel quel par execute_sql sur la RECETTE, après b6_00_jeu.sql et les migrations b6_01 à b6_11.
-- runtests() annule tout.

create or replace function tests.test_b6_06_vues_invoker() returns setof text
language plpgsql as $f$
declare
  banc jsonb; jeu jsonb; v_client uuid; v_gerant uuid; v_collab uuid; v_autre uuid;
  v_mo uuid; v_ch uuid; v_lot uuid; v_av uuid; v_j jsonb;
begin
  banc := tests.b6_banc();
  v_client := (banc ->> 'client')::uuid; v_gerant := (banc ->> 'gerant')::uuid;
  perform tests.redevenir_admin();
  perform public.btp_installer(v_client, 'chantiers');
  v_collab := tests.b6_compte(v_client, 'collaborateur', 'b6-vues-collab@banc-varelo.test');
  jeu := tests.jeu();
  v_autre := (jeu ->> 'gerant_a')::uuid;

  return next ok((select coalesce(c.reloptions, '{}') @> array['security_invoker=true'] from pg_class c where c.oid = 'public.btp_avenants_chiffres'::regclass),
                 'btp_avenants_chiffres est security_invoker');
  return next ok((select coalesce(c.reloptions, '{}') @> array['security_invoker=true'] from pg_class c where c.oid = 'public.btp_avenants_lignes_chiffrees'::regclass),
                 'btp_avenants_lignes_chiffrees est security_invoker');
  return next ok(has_function_privilege('authenticated', 'private.btp_prix_avenant(uuid)', 'execute')
                 and has_function_privilege('authenticated', 'private.btp_prix_ligne_avenant(uuid)', 'execute'),
                 'Le lecteur peut appeler les fonctions de prix (elles vérifient elles-mêmes entité et droit voir_prix)');
  return next ok(not has_table_privilege('anon', 'public.btp_avenants_chiffres', 'select'), 'anon ne lit pas btp_avenants_chiffres');

  -- Un chantier ouvert, un avenant d'une ligne chiffrée (12 × 15 = 180 € HT), posés par le gérant.
  perform tests.endosser(v_gerant, 'gerant@banc-varelo.test');
  insert into public.btp_tiers (client_id, roles, nom) values (v_client, array['maitre_ouvrage'], 'MO des vues') returning id into v_mo;
  insert into public.btp_chantiers (client_id, nom, code_postal, commune, maitre_ouvrage_type, place_client, maitre_ouvrage_id, statut)
  values (v_client, 'Chantier des vues', '69100', 'Villeurbanne', 'professionnel', 'titulaire', v_mo, 'ouvert') returning id into v_ch;
  insert into public.btp_lots (client_id, chantier_id, code, libelle, execution) values (v_client, v_ch, '01', 'Lot des vues', 'client') returning id into v_lot;
  v_av := public.btp_ouvrir_avenant(v_ch, 'Avenant des vues');
  perform public.btp_chiffrer_ligne_avenant(v_av, 12, null, v_lot, 'Dépose du garde-corps provisoire', 'ml', 15);

  -- Le gérant lit l'avenant et sa ligne, prix compris, par les vues et par le tableau de l'écran.
  return next is((select a.montant_ht from public.btp_avenants_chiffres a where a.id = v_av), 180.00::numeric, 'Gérant : la vue rend le montant de l''avenant (180 €)');
  return next is((select count(*)::int from public.btp_avenants_lignes_chiffrees l where l.avenant_id = v_av and l.prix_unitaire_ht = 15), 1, 'Gérant : la vue rend la ligne et son prix');
  v_j := public.btp_tableau_chantier(v_ch);
  return next is((select (x ->> 'montant_ht')::numeric from jsonb_array_elements(v_j -> 'avenants') x where x ->> 'id' = v_av::text), 180.00::numeric,
                 'Gérant : le tableau de l''écran lit toujours l''avenant chiffré');
  return next is((select jsonb_array_length(x -> 'lignes') from jsonb_array_elements(v_j -> 'avenants') x where x ->> 'id' = v_av::text), 1,
                 'Gérant : et sa ligne');

  -- Un collaborateur sans le droit voir_prix : il lit l'avenant, pas les prix.
  perform tests.endosser(v_collab, 'b6-vues-collab@banc-varelo.test');
  return next is((select count(*)::int from public.btp_avenants_chiffres a where a.id = v_av), 1, 'Collaborateur : il voit l''avenant de son organisation');
  return next ok((select a.montant_ht is null from public.btp_avenants_chiffres a where a.id = v_av), 'Collaborateur sans voit_prix : montant caché');
  return next ok((select bool_and(l.prix_unitaire_ht is null and l.montant_ht is null) from public.btp_avenants_lignes_chiffrees l where l.avenant_id = v_av),
                 'Collaborateur sans voit_prix : prix des lignes cachés');

  -- Le gérant d'une autre organisation : rien, la RLS du lecteur s'applique désormais à la vue.
  perform tests.endosser(v_autre, 'autre@essai.invalid');
  return next is((select count(*)::int from public.btp_avenants_chiffres a where a.client_id = v_client), 0, 'Autre organisation : aucun avenant du banc par la vue');
  return next is((select count(*)::int from public.btp_avenants_lignes_chiffrees l where l.client_id = v_client), 0, 'Autre organisation : aucune ligne du banc par la vue');
  perform tests.redevenir_admin();
end $f$;

select * from runtests('tests'::name, '^test_b6_06_');
