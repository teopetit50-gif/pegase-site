-- SOCLE 19ba — la reprise après refus ne vaut que pour FILED, CASHD, REPUT et OFFLOAD (décision D3, 26/10/2026).
-- Copie du dépôt omega-metiers (socle/base/), où ce lot a été écrit et testé, 27/10/2026.
-- Exécutable tel quel sur la base locale (base/monter.sh) ou la RECETTE, après socle_19ba_reprise_modules.sql.
-- runtests() annule tout.
--
-- Scène : sur le client du banc, un avenant Daliro est refusé par la DAF (même chemin que b6_72) : aucune reprise
-- n'est inscrite, et l'avenant suit son propre chemin (« refusé »). Une demande CASHD refusée reçoit sa reprise
-- « à faire », comme avec 19az. Un module hors liste (Lorani) n'en reçoit pas.

create or replace function tests.test_socle_19ba_reprise_modules() returns setof text
language plpgsql as $f$
declare
  banc jsonb; v_client uuid; v_gerant uuid; v_daf uuid;
  v_mo uuid; v_ch uuid; v_lot uuid; v_m uuid; v_av uuid; v_dem uuid; v_cashd uuid; v_lorani uuid; v_entite uuid;
begin
  banc := tests.b6_banc();
  v_client := (banc ->> 'client')::uuid; v_gerant := (banc ->> 'gerant')::uuid; v_daf := (banc ->> 'daf')::uuid;
  perform tests.redevenir_admin();
  select e.id into v_entite from public.entites e where e.client_id = v_client and e.principale;

  return next is((select array_agg(m.module order by m.module) from private.modules_reprise m),
                 array['cashd', 'filed', 'offload', 'reput'], 'Quatre modules reprennent après un refus, et eux seuls');

  -- ── Daliro : un avenant refusé ──
  perform public.btp_installer(v_client, 'chantiers');
  perform tests.endosser(v_gerant, 'gerant@banc-varelo.test');
  insert into public.btp_tiers (client_id, roles, nom) values (v_client, array['maitre_ouvrage'], 'MO 19ba') returning id into v_mo;
  insert into public.btp_chantiers (client_id, nom, code_postal, commune, maitre_ouvrage_type, place_client, maitre_ouvrage_id, statut)
  values (v_client, 'Chantier 19ba', '69100', 'Villeurbanne', 'professionnel', 'titulaire', v_mo, 'ouvert') returning id into v_ch;
  insert into public.btp_lots (client_id, chantier_id, code, libelle, execution) values (v_client, v_ch, '01', 'Lot 19ba', 'client') returning id into v_lot;
  v_m := public.btp_ecrire_marche(null, v_ch, jsonb_build_object('reference', '19BA', 'mode_prix', 'unitaire', 'montant_ht_declare', 1000));
  perform public.btp_ecrire_ligne(null, v_m, jsonb_build_object('designation', 'Ouvrage', 'unite_lue', 'u', 'quantite', 10, 'prix_unitaire_ht', 100, 'montant_ht', 1000, 'lot_id', v_lot));
  perform public.btp_verifier_marche(v_m);
  v_av := public.btp_ouvrir_avenant(v_ch, 'Avenant 19ba');
  perform public.btp_chiffrer_ligne_avenant(v_av, 5, null, v_lot, 'Carrelage', 'm2', 80);
  v_dem := public.btp_soumettre_avenant(v_av);
  perform tests.endosser(v_daf, 'daf@banc-varelo.test');
  insert into public.approbations (demande_id, decision, commentaire) values (v_dem, 'rejete', 'Prix trop haut');
  perform tests.redevenir_admin();
  return next is((select d.statut from public.demandes_validation d where d.id = v_dem), 'rejetee', 'Daliro : la demande est refusée');
  return next ok(not exists (select 1 from private.reprises r where r.demande_id = v_dem),
                 'Daliro : aucune reprise « à faire » après un refus (D3) ; l''avenant suit son chemin (b6_72)');
  return next is((select a.statut from public.btp_avenants a where a.id = v_av), 'refuse', 'Daliro : l''avenant passe « refusé »');

  -- ── CASHD et Lorani : une demande déposée par le système, refusée par la DAF ──
  insert into public.demandes_validation (client_id, entite_id, module, type_action, objet_type, objet_id, resume, payload, cle_idempotence)
  values (v_client, v_entite, 'cashd', 'envoi_relance', 'cashd_relance', gen_random_uuid()::text, 'Relance 19ba', '{}'::jsonb, 'essai:19ba:cashd')
  returning id into v_cashd;
  insert into public.demandes_validation (client_id, entite_id, module, type_action, objet_type, objet_id, resume, payload, cle_idempotence)
  values (v_client, v_entite, 'lorani', 'envoi_courrier', 'essai_19ba', gen_random_uuid()::text, 'Courrier 19ba', '{}'::jsonb, 'essai:19ba:lorani')
  returning id into v_lorani;
  perform tests.endosser(v_daf, 'daf@banc-varelo.test');
  insert into public.approbations (demande_id, decision, commentaire) values (v_cashd, 'rejete', 'Pas maintenant');
  insert into public.approbations (demande_id, decision, commentaire) values (v_lorani, 'rejete', 'Pas maintenant');
  perform tests.redevenir_admin();
  return next is((select r.statut || '/' || r.module from private.reprises r where r.demande_id = v_cashd), 'a_faire/cashd',
                 'CASHD : la reprise « à faire » est inscrite, comme avec 19az');
  return next ok((select d.statut from public.demandes_validation d where d.id = v_lorani) = 'rejetee'
                 and not exists (select 1 from private.reprises r where r.demande_id = v_lorani),
                 'Lorani (hors liste) : refusée, sans reprise');
  return next ok(not exists (select 1 from private.reprises r where r.statut = 'a_faire'
                             and not exists (select 1 from private.modules_reprise m where m.module = r.module)),
                 'Aucune reprise « à faire » d''un module qui ne reprend pas');
  return next ok(not has_table_privilege('authenticated', 'private.modules_reprise', 'select')
                 and not has_function_privilege('anon', 'private.reprise_deposer()', 'execute'),
                 'La liste et le déclencheur ne sont pas ouverts aux comptes');
end $f$;

select * from runtests('tests'::name, '^test_socle_19ba_');
