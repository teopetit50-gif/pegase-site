-- CASHD — c2_36 : la mise en demeure donne les moyens de règlement (TCASHD-13).
-- Sur le banc (client cccccccc-0000-4000-8000-00000000000c), dans une transaction annulée. Utilise tests.c2_parti (c2_24).

create or replace function tests.test_c2_36_med_reglement() returns setof text
language plpgsql as $f$
declare
  banc jsonb; v_client uuid; v_gerant uuid; j date := tests.c2_jour(); v_a uuid; r public.cashd_relances;
begin
  banc := tests.c2_banc();
  v_client := (banc ->> 'client')::uuid; v_gerant := (banc ->> 'gerant')::uuid;
  perform tests.redevenir_admin();
  perform public.cashd_installer(v_client);
  perform tests.endosser(v_gerant, 'gerant@banc-varelo.test');
  perform public.cashd_regler_relances(v_client, jsonb_build_object(
    'scenario', '[{"palier": "echeance", "jours": 0}, {"palier": "rappel", "jours": 7}, {"palier": "relance", "jours": 21}, {"palier": "mise_en_demeure", "jours": 30}]'::jsonb,
    'moyens_reglement', 'par virement sur le compte FR76 3000 4000 0500 0012 3456 789'));
  v_a := public.cashd_ecrire_compte(null, v_client, jsonb_build_object('reference', 'A-MEDR', 'nom', 'Rénovation Moyens', 'contact_facturation_email', 'compta@medr.test'));
  perform public.cashd_ecrire_facture(null, v_client, jsonb_build_object('compte_id', v_a, 'numero', 'FB-2026-1913', 'date_emission', j - 70, 'echeance', j - 40, 'montant_ttc', 1085));
  perform tests.redevenir_admin();
  perform private.cashd_preparer_relances(v_client, j, null);
  perform tests.c2_parti(x.id) from public.cashd_relances x where x.compte_id = v_a and x.jour = j;
  perform private.cashd_preparer_relances(v_client, j + 5, null);
  select * into r from public.cashd_relances x where x.compte_id = v_a and x.jour = j + 5;
  return next ok(r.palier = 'relance' and tests.c2_plat(r.corps) like '%par virement sur le compte FR76%', 'La relance ferme donne les moyens de règlement');
  perform tests.c2_parti(r.id);
  perform private.cashd_preparer_relances(v_client, j + 10, null);
  select * into r from public.cashd_relances x where x.compte_id = v_a and x.jour = j + 10;
  return next ok(r.palier = 'mise_en_demeure' and tests.c2_plat(r.corps) like '%mettons en demeure%par virement sur le compte FR76%À défaut de règlement%',
                 'La mise en demeure aussi, après la somme et le délai');
  return next ok(tests.c2_plat(r.corps) not like '%plusieurs fois%', 'Sans proposition d''échelonnement à ce palier');
end $f$;
