-- b6_23 — DALIRO : les fonctions ouvertes selon la formule (session B6, 11/10/2026), b6_27.
-- Exécutable tel quel par execute_sql sur la RECETTE, après b6_00_jeu.sql et les migrations b6_01 à b6_27.
-- runtests() annule tout. Le banc reste en formule Chantiers (passer en Démarrage contredirait le quota de 5 chantiers
-- si le banc en a davantage d'ouverts) : on y vérifie ce que Chantiers ouvre et ferme, et qu'une organisation sans
-- Daliro n'ouvre rien.

create or replace function tests.b6_fonction(p_client uuid, p_fonction text) returns void
language sql security definer set search_path to '' as $$ select private.btp_exiger_fonction(p_client, p_fonction) $$;

create or replace function tests.test_b6_23_formules() returns setof text
language plpgsql as $f$
declare
  banc jsonb; v_client uuid; v_gerant uuid;
  v_mo uuid; v_ch uuid; v_lot uuid; v_m uuid; v_s uuid;
begin
  banc := tests.b6_banc();
  v_client := (banc ->> 'client')::uuid; v_gerant := (banc ->> 'gerant')::uuid;
  perform tests.redevenir_admin();
  perform public.btp_installer(v_client, 'chantiers');

  -- ── Ce que la formule Chantiers ouvre, ce qu'elle ferme ──
  return next lives_ok(format('select tests.b6_fonction(%L, %L)', v_client, 'ordre_lots'), 'Chantiers : le recalage des lots est ouvert');
  return next lives_ok(format('select tests.b6_fonction(%L, %L)', v_client, 'remplacants'), 'Chantiers : les remplaçants proposés sont ouverts');
  return next throws_ok(format('select tests.b6_fonction(%L, %L)', v_client, 'bons_livraison'), '42501',
                        'Le rapprochement des bons de livraison : compris dans la formule Entreprise, pas dans la formule Chantiers.',
                        'Chantiers : les bons de livraison sont refusés, avec la formule qui les ouvre');
  return next throws_ok(format('select tests.b6_fonction(%L, %L)', v_client, 'retours'), '42501', null, 'Chantiers : le suivi des retours est refusé');
  return next throws_ok(format('select tests.b6_fonction(%L, %L)', gen_random_uuid(), 'ordre_lots'), '42501', null,
                        'Une organisation sans Daliro n''ouvre rien');

  -- ── Les portes qui la demandent ──
  return next ok((select bool_and(pg_get_functiondef(p.oid) like '%btp_exiger_fonction(%''' || x.f || '''%')
                  from (values ('btp_proposer_recalage', 'ordre_lots'), ('btp_recaler', 'ordre_lots'), ('btp_preparer_liste', 'liste_cadencee'),
                               ('btp_noter_retour', 'retours'), ('btp_recevoir', 'bons_livraison'), ('btp_proposer_remplacants', 'remplacants')) x(n, f)
                  join pg_proc p on p.proname = x.n and p.pronamespace = 'public'::regnamespace),
                 'Recalage, liste cadencée, retours, bons de livraison et remplaçants demandent leur fonction');
  return next ok(not (select p.prosecdef from pg_proc p where p.proname = 'btp_proposer_remplacants' and p.pronamespace = 'public'::regnamespace),
                 'btp_proposer_remplacants reste SECURITY INVOKER (la RLS du lecteur s''applique)');

  -- ── L'avancement lu dans les photos : vide, motif dit, sans refus ──
  perform tests.endosser(v_gerant, 'gerant@banc-varelo.test');
  insert into public.btp_tiers (client_id, roles, nom) values (v_client, array['maitre_ouvrage'], 'MO des formules') returning id into v_mo;
  insert into public.btp_chantiers (client_id, nom, code_postal, commune, maitre_ouvrage_type, place_client, maitre_ouvrage_id, statut)
  values (v_client, 'Chantier des formules', '69100', 'Villeurbanne', 'professionnel', 'titulaire', v_mo, 'ouvert') returning id into v_ch;
  insert into public.btp_lots (client_id, chantier_id, code, libelle, execution) values (v_client, v_ch, '01', 'Lot des formules', 'client') returning id into v_lot;
  v_m := public.btp_ecrire_marche(null, v_ch, jsonb_build_object('reference', 'FOR-1', 'mode_prix', 'forfait', 'montant_ht_declare', 1000, 'retenue_taux', 0));
  perform public.btp_ecrire_ligne(null, v_m, jsonb_build_object('designation', 'Travaux', 'unite_lue', 'forfait', 'nature', 'forfait', 'montant_ht', 1000, 'lot_id', v_lot));
  perform public.btp_verifier_marche(v_m);
  v_s := public.btp_ouvrir_situation(v_ch, current_date);
  return next is(public.btp_avancement_photos(v_s) ->> 'motif', 'compris dans la formule Entreprise',
                 'Chantiers : l''avancement lu dans les photos ne propose rien et dit pourquoi');
  perform tests.redevenir_admin();
end $f$;

select * from runtests('tests'::name, '^test_b6_23_');
