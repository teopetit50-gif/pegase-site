-- CASHD — c2_27 : la mise en demeure nomme le canal par lequel elle part (TCASHD-10a).
-- Sur le banc (client cccccccc-0000-4000-8000-00000000000c), dans une transaction annulée. Utilise tests.c2_parti (c2_24).

create or replace function tests.test_c2_27_canal_dit() returns setof text
language plpgsql as $f$
declare
  banc jsonb; v_client uuid; v_gerant uuid; j date := tests.c2_jour(); v_a uuid; v_b uuid; ra public.cashd_relances; rb public.cashd_relances;
begin
  banc := tests.c2_banc();
  v_client := (banc ->> 'client')::uuid; v_gerant := (banc ->> 'gerant')::uuid;
  perform tests.redevenir_admin();
  perform public.cashd_installer(v_client);
  perform tests.endosser(v_gerant, 'gerant@banc-varelo.test');
  perform public.cashd_regler_relances(v_client, jsonb_build_object(
    'scenario', '[{"palier": "echeance", "jours": 0}, {"palier": "rappel", "jours": 7}, {"palier": "relance", "jours": 21}, {"palier": "mise_en_demeure", "jours": 30}]'::jsonb,
    'seuil_lre', 2000));
  v_a := public.cashd_ecrire_compte(null, v_client, jsonb_build_object('reference', 'C-CAN-A', 'nom', 'Rénovation Courriel', 'contact_facturation_email', 'compta@can-a.test'));
  perform public.cashd_ecrire_facture(null, v_client, jsonb_build_object('compte_id', v_a, 'numero', 'FB-2026-1021', 'date_emission', j - 70, 'echeance', j - 40, 'montant_ttc', 1085));
  v_b := public.cashd_ecrire_compte(null, v_client, jsonb_build_object('reference', 'C-CAN-B', 'nom', 'Rénovation Recommandée', 'contact_facturation_email', 'compta@can-b.test'));
  perform public.cashd_ecrire_facture(null, v_client, jsonb_build_object('compte_id', v_b, 'numero', 'FB-2026-1022', 'date_emission', j - 70, 'echeance', j - 40, 'montant_ttc', 3000));
  perform tests.redevenir_admin();
  perform private.cashd_preparer_relances(v_client, j, null);
  perform private.cashd_preparer_relances(v_client, j + 5, null);
  perform tests.c2_parti(x.id) from public.cashd_relances x where x.compte_id in (v_a, v_b) and x.jour = j + 5;
  perform private.cashd_preparer_relances(v_client, j + 10, null);
  select * into ra from public.cashd_relances x where x.compte_id = v_a and x.jour = j + 10;
  select * into rb from public.cashd_relances x where x.compte_id = v_b and x.jour = j + 10;
  return next ok(ra.palier = 'mise_en_demeure' and ra.canal = 'email' and tests.c2_plat(ra.corps) like '%à compter de la réception de ce courriel%'
                 and ra.corps not like '%ce courrier%',
                 'Par courriel : « à compter de la réception de ce courriel »');
  return next ok(rb.palier = 'mise_en_demeure' and rb.canal = 'lre' and tests.c2_plat(rb.corps) like '%à compter de la réception de ce courrier%',
                 'En lettre recommandée (au-delà du seuil LRE) : « ce courrier »');
end $f$;
