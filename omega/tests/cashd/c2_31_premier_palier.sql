-- CASHD — c2_31 : une relance en file dont le palier précédent n'est pas parti est remplacée par le premier palier non
-- parti (TCASHD-14 : A-C02, A-C17, A-C14). Sur le banc (client cccccccc-…-0c), transaction annulée. Utilise tests.c2_parti.

create or replace function tests.test_c2_31_premier_palier() returns setof text
language plpgsql as $f$
declare
  banc jsonb; v_client uuid; v_gerant uuid; j date := tests.c2_jour(); v_x uuid; v_y uuid; v_z uuid; v_fy uuid; v_n integer; v_p jsonb;
begin
  banc := tests.c2_banc();
  v_client := (banc ->> 'client')::uuid; v_gerant := (banc ->> 'gerant')::uuid;
  perform tests.redevenir_admin();
  perform public.cashd_installer(v_client);
  perform tests.endosser(v_gerant, 'gerant@banc-varelo.test');
  perform public.cashd_regler_relances(v_client, jsonb_build_object(
    'scenario', '[{"palier": "echeance", "jours": 0}, {"palier": "rappel", "jours": 7}, {"palier": "relance", "jours": 21}, {"palier": "mise_en_demeure", "jours": 30}]'::jsonb));
  v_x := public.cashd_ecrire_compte(null, v_client, jsonb_build_object('reference', 'A-C17', 'nom', 'Ferme En File', 'contact_facturation_email', 'compta@c17.test'));
  perform public.cashd_ecrire_facture(null, v_client, jsonb_build_object('compte_id', v_x, 'numero', 'FB-2026-1617', 'date_emission', j - 70, 'echeance', j - 40, 'montant_ttc', 1085));
  v_z := public.cashd_ecrire_compte(null, v_client, jsonb_build_object('reference', 'A-C14', 'nom', 'Ferme Bloquée', 'contact_facturation_email', 'compta@c14.test'));
  perform public.cashd_ecrire_facture(null, v_client, jsonb_build_object('compte_id', v_z, 'numero', 'FB-2026-1614', 'date_emission', j - 70, 'echeance', j - 40, 'montant_ttc', 900));
  perform tests.redevenir_admin();

  -- L'état de la recette avant c2_24b, reconstitué : une relance ferme en file, alors que le rappel n'est jamais parti
  -- (un envoi noté pour l'écrire, puis retiré).
  perform private.cashd_preparer_relances(v_client, j, null);
  perform tests.c2_parti(x.id) from public.cashd_relances x where x.compte_id in (v_x, v_z) and x.jour = j;
  perform private.cashd_preparer_relances(v_client, j + 5, null);
  delete from public.cashd_envois_main m using public.cashd_relances x where x.id = m.relance_id and x.compte_id in (v_x, v_z);
  update public.cashd_relances set statut = 'bloquee', motif = 'le message contient un mot interdit par vos règles : « contentieux »'
   where compte_id = v_z and jour = j + 5;
  return next ok((select count(*) from public.cashd_relances x where x.compte_id in (v_x, v_z) and x.jour = j + 5 and x.palier = 'relance') = 2,
                 'Reconstitué : deux relances fermes, aucun rappel parti');

  -- ── La reprise de la pose : la ferme en file de A-C17 est coupée ; le passage suivant écrit le rappel ──
  v_n := private.cashd_reprendre_paliers(v_client);
  return next ok(v_n >= 2 and (select x.statut = 'coupee' and x.motif like 'remplacée : le palier qui la précède n''est jamais parti%'
                                from public.cashd_relances x where x.compte_id = v_x and x.jour = j + 5),
                 'La reprise coupe les relances fermes en file sans rappel parti');
  -- A-C02 : reconstitué après la reprise, pour éprouver le passage lui-même — une ferme en file, son rappel jamais parti.
  perform tests.endosser(v_gerant, 'gerant@banc-varelo.test');
  v_y := public.cashd_ecrire_compte(null, v_client, jsonb_build_object('reference', 'A-C02', 'nom', 'Ferme Puis MED', 'contact_facturation_email', 'compta@c02.test'));
  v_fy := public.cashd_ecrire_facture(null, v_client, jsonb_build_object('compte_id', v_y, 'numero', 'FB-2026-1602', 'date_emission', j - 70, 'echeance', j - 40, 'montant_ttc', 1185));
  perform tests.redevenir_admin();
  perform private.cashd_preparer_relances(v_client, j, null);
  perform tests.c2_parti(x.id) from public.cashd_relances x where x.compte_id = v_y and x.jour = j;
  perform private.cashd_preparer_relances(v_client, j + 5, null);
  delete from public.cashd_envois_main m using public.cashd_relances x where x.id = m.relance_id and x.compte_id = v_y;

  -- ── Au passage où la mise en demeure est due ──
  perform private.cashd_preparer_relances(v_client, j + 10, null);
  return next ok((select x.palier from public.cashd_relances x where x.compte_id = v_x and x.jour = j + 10) = 'rappel',
                 'A-C17 : le rappel est écrit (premier palier non parti)');
  return next ok((select x.palier from public.cashd_relances x where x.compte_id = v_y and x.jour = j + 10) = 'rappel'
                 and (select x.statut from public.cashd_relances x where x.compte_id = v_y and x.jour = j + 5) = 'coupee'
                 and not exists (select 1 from public.cashd_relances x where x.compte_id = v_y and x.palier = 'mise_en_demeure'),
                 'A-C02 : la mise en demeure due fait écrire le rappel, qui remplace la ferme en file ; pas de mise en demeure');
  return next ok((select x.palier from public.cashd_relances x where x.compte_id = v_z and x.jour = j + 10) = 'rappel',
                 'A-C14 : sa ferme bloquée, rien en file : le rappel est écrit');
  perform tests.endosser(v_gerant, 'gerant@banc-varelo.test');
  select x into v_p from jsonb_array_elements(public.cashd_fiche_compte(v_y) -> 'pieces') x where x ->> 'numero' = 'FB-2026-1602';
  return next ok(v_p ->> 'relance_suspendue' like 'mise en demeure retenue%Elle est dans la liste des relances%'
                 and exists (select 1 from public.cashd_relances x where x.compte_id = v_y and x.statut in ('a_valider', 'non_reglee')),
                 'La fiche dit la mise en demeure retenue, et la relance qu''elle attend est bien en file');
  perform tests.redevenir_admin();

  -- ── Le rappel attend : les passages suivants n'écrivent rien de plus ──
  perform private.cashd_preparer_relances(v_client, j + 15, null);
  return next ok(not exists (select 1 from public.cashd_relances x where x.compte_id in (v_x, v_y, v_z) and x.jour = j + 15),
                 'Le rappel en file attend : rien n''est réécrit');
end $f$;
