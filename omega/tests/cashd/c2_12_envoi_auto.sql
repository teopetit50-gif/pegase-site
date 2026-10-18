-- CASHD — c2_12 : le « modèle 2 ». Sous accord permanent, les rappels des paliers 1 et 2 partent sans validation ;
-- la relance ferme, la mise en demeure et la LRE restent retenues pour une personne.
-- Sur le banc (client cccccccc-0000-4000-8000-00000000000c), dans une transaction annulée. Utilise tests.c2_approuver (c2_11).

create or replace function tests.test_c2_12_envoi_auto() returns setof text
language plpgsql as $f$
declare
  banc jsonb; v_client uuid; v_gerant uuid; v_daf uuid; v_collab uuid; j date := tests.c2_jour();
  v_a uuid; v_b uuid; v_c uuid; v_d uuid; v_r jsonb; v_pol uuid; v_act uuid;
  ra public.cashd_relances; rb public.cashd_relances; rc public.cashd_relances; da public.demandes_validation;
begin
  banc := tests.c2_banc();
  v_client := (banc ->> 'client')::uuid; v_gerant := (banc ->> 'gerant')::uuid; v_daf := (banc ->> 'daf')::uuid;
  perform tests.redevenir_admin();
  perform public.cashd_installer(v_client);
  v_collab := tests.c2_compte(v_client, 'collaborateur', 'c2-auto-collab@banc-varelo.test');
  perform tests.endosser(v_gerant, 'gerant@banc-varelo.test');
  perform public.cashd_regler_relances(v_client, jsonb_build_object(
    'scenario', '[{"palier": "echeance", "jours": 0}, {"palier": "rappel", "jours": 7}, {"palier": "relance", "jours": 21}, {"palier": "mise_en_demeure", "jours": 30}]'::jsonb,
    'seuil_lre', 100));
  v_a := public.cashd_ecrire_compte(null, v_client, jsonb_build_object('reference', 'C-AUTO-A', 'nom', 'Plâtrerie Benoît', 'contact_facturation_email', 'compta@benoit.test'));
  perform public.cashd_ecrire_facture(null, v_client, jsonb_build_object('compte_id', v_a, 'numero', 'F-2026-510', 'date_emission', j - 40, 'echeance', j - 10, 'montant_ttc', 1200));
  v_b := public.cashd_ecrire_compte(null, v_client, jsonb_build_object('reference', 'C-AUTO-B', 'nom', 'Carrelages Faure', 'contact_facturation_email', 'compta@faure.test'));
  perform public.cashd_ecrire_facture(null, v_client, jsonb_build_object('compte_id', v_b, 'numero', 'F-2026-511', 'date_emission', j - 30, 'echeance', j, 'montant_ttc', 800));
  v_c := public.cashd_ecrire_compte(null, v_client, jsonb_build_object('reference', 'C-AUTO-C', 'nom', 'Toitures Masson', 'contact_facturation_email', 'compta@masson.test'));
  perform public.cashd_ecrire_facture(null, v_client, jsonb_build_object('compte_id', v_c, 'numero', 'F-2026-512', 'date_emission', j - 70, 'echeance', j - 40, 'montant_ttc', 3000));

  -- ── Les gardes ──
  perform tests.endosser(v_collab, 'c2-auto-collab@banc-varelo.test');
  return next throws_ok(format('select public.cashd_regler_envoi_auto(%L, true)', v_client), '42501', null, 'Un collaborateur n''active pas l''envoi automatique');
  perform tests.endosser(v_daf, 'daf@banc-varelo.test');
  return next throws_ok(format('select public.cashd_regler_envoi_auto(%L, true)', v_client), '42501', null, 'Un valideur non plus : seul le gérant le décide');
  perform tests.endosser(v_gerant, 'gerant@banc-varelo.test');
  return next throws_ok(format('select public.cashd_regler_envoi_auto(%L, true, 0)', v_client), '22023', null, 'Un plafond nul est refusé');

  -- ── Le gérant propose ; une seconde personne active l'accord ──
  v_r := public.cashd_regler_envoi_auto(v_client, true, 2000);
  v_pol := (v_r ->> 'propose')::uuid;
  return next ok(v_pol is not null and (select p.type_action || '/' || p.statut || '/' || p.plafond_operation from public.politiques p where p.id = v_pol) = 'cashd.rappel/a_valider/2000.00',
                 'Un accord permanent du socle est proposé : type cashd.rappel, plafond 2 000 € par rappel, à valider');
  return next ok(not (v_r ->> 'actif')::boolean, 'Tant qu''il n''est pas activé, rien ne part seul');
  return next is((public.cashd_regler_envoi_auto(v_client, true, 2000) ->> 'propose'), null, 'Le redemander ne crée rien de plus');
  perform tests.redevenir_admin();
  select p.demande_id into v_act from public.politiques p where p.id = v_pol;
  perform tests.c2_approuver(v_act, v_client, v_daf, 'daf@banc-varelo.test');
  return next ok((public.cashd_envoi_auto(v_client) ->> 'actif')::boolean, 'Activé par le valideur : l''envoi automatique des rappels est en place');

  -- ── Les paliers 1 et 2 partent seuls ──
  perform private.cashd_preparer_relances(v_client, j, null);
  select * into ra from public.cashd_relances x where x.compte_id = v_a and x.jour = j;
  select * into rb from public.cashd_relances x where x.compte_id = v_b and x.jour = j;
  select * into da from public.demandes_validation d where d.id = ra.demande_id;
  return next ok(ra.palier = 'rappel' and da.type_action = 'cashd.rappel' and da.statut = 'approuvee' and da.politique_id = v_pol,
                 'Le rappel J+7 (palier 2) naît approuvé par l''accord : il part sans validation');
  return next ok(rb.palier = 'echeance' and (select d.statut = 'approuvee' and d.politique_id = v_pol from public.demandes_validation d where d.id = rb.demande_id),
                 'Le rappel du jour d''échéance (palier 1) aussi');
  return next is((select x.etat from public.cashd_relances_etat x where x.id = ra.id), 'validee', 'Il est validé, prêt pour le moteur d''envoi (selon le réglage d''envoi)');
  return next ok(exists (select 1 from jsonb_array_elements(private.cashd_point_lignes(v_client, j)) x
                        where tests.c2_plat(x ->> 'texte') like '2 rappels courtois approuvés d''office par l''accord permanent%2 000,00 €%'),
                 'Le point du matin dit les deux rappels partis sans validation, et leur montant (c2_13)');

  -- ── Au-delà du plafond, la personne décide ──
  select * into rc from public.cashd_relances x where x.compte_id = v_c and x.jour = j;
  return next ok(rc.palier = 'rappel' and (select d.statut = 'en_attente' and d.politique_id is null from public.demandes_validation d where d.id = rc.demande_id),
                 'Un rappel de 3 000 €, au-delà du plafond de 2 000 €, attend une personne');

  -- ── Relance ferme, mise en demeure et LRE : toujours retenues ──
  perform private.cashd_preparer_relances(v_client, j + 5, null);
  select * into rc from public.cashd_relances x where x.compte_id = v_c and x.jour = j + 5;
  return next ok(rc.palier = 'relance' and rc.statut = 'a_valider'
                 and (select d.type_action = 'cashd.relance' and d.statut = 'en_attente' and d.politique_id is null from public.demandes_validation d where d.id = rc.demande_id),
                 'La relance ferme (palier 3) attend une personne, accord ou pas');
  perform private.cashd_preparer_relances(v_client, j + 10, null);
  select * into rc from public.cashd_relances x where x.compte_id = v_c and x.jour = j + 10;
  return next ok(rc.palier = 'mise_en_demeure' and rc.canal = 'lre' and rc.statut = 'a_valider'
                 and (select d.type_action = 'cashd.mise_en_demeure' and d.statut = 'en_attente' and d.politique_id is null from public.demandes_validation d where d.id = rc.demande_id),
                 'La mise en demeure, en lettre recommandée électronique, attend une personne');
  if to_regclass('private.actions_sans_accord') is not null then
    return next ok((select count(*) from private.actions_sans_accord a where a.module = 'cashd'
                    and a.type_action in ('cashd.relance', 'cashd.devis', 'cashd.mise_en_demeure')) = 3,
                   'Relance ferme, devis et mise en demeure : aucun accord ne peut les couvrir (actions_sans_accord)');
  else
    return next ok(true, 'actions_sans_accord absente du banc local');
  end if;

  -- ── Coupé par le gérant : l'accord est révoqué, les rappels attendent de nouveau ──
  perform tests.endosser(v_gerant, 'gerant@banc-varelo.test');
  v_r := public.cashd_regler_envoi_auto(v_client, false);
  return next ok(not (v_r ->> 'actif')::boolean and (v_r ->> 'revoques')::int = 1 and (select p.statut from public.politiques p where p.id = v_pol) = 'revoquee',
                 'Couper révoque l''accord');
  v_d := public.cashd_ecrire_compte(null, v_client, jsonb_build_object('reference', 'C-AUTO-D', 'nom', 'Menuiserie Hamel', 'contact_facturation_email', 'compta@hamel.test'));
  perform public.cashd_ecrire_facture(null, v_client, jsonb_build_object('compte_id', v_d, 'numero', 'F-2026-513', 'date_emission', j - 40, 'echeance', j - 10, 'montant_ttc', 500));
  perform tests.redevenir_admin();
  perform private.cashd_preparer_relances(v_client, j + 11, null);
  return next ok((select d.statut from public.cashd_relances x join public.demandes_validation d on d.id = x.demande_id where x.compte_id = v_d and x.jour = j + 11) = 'en_attente',
                 'Sans accord, le rappel suivant attend de nouveau une personne');
  return next ok(exists (select 1 from public.cashd_historique_reglages h where h.client_id = v_client and h.donnees ? 'envoi_auto_rappels'),
                 'Activer et couper restent datés');
end $f$;
