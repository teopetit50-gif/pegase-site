-- CASHD — c2_19 : la relance ferme et la mise en demeure ne citent un rappel que s'il est vraiment parti (TCASHD-06).
-- Sur le banc (client cccccccc-0000-4000-8000-00000000000c), dans une transaction annulée. Utilise tests.c2_approuver (c2_11).

create or replace function tests.test_c2_19_texte_parti() returns setof text
language plpgsql as $f$
declare
  banc jsonb; v_client uuid; v_gerant uuid; v_daf uuid; j date := tests.c2_jour(); v_a uuid; v_b uuid; v_c uuid;
  ra public.cashd_relances; rb public.cashd_relances; rc public.cashd_relances;
begin
  banc := tests.c2_banc();
  v_client := (banc ->> 'client')::uuid; v_gerant := (banc ->> 'gerant')::uuid; v_daf := (banc ->> 'daf')::uuid;
  perform tests.redevenir_admin();
  perform public.cashd_installer(v_client);
  perform tests.endosser(v_gerant, 'gerant@banc-varelo.test');
  perform public.cashd_regler_relances(v_client, jsonb_build_object(
    'scenario', '[{"palier": "echeance", "jours": 0}, {"palier": "rappel", "jours": 7}, {"palier": "relance", "jours": 21}, {"palier": "mise_en_demeure", "jours": 30}]'::jsonb));
  -- A : le rappel n'est jamais parti (pas validé).
  v_a := public.cashd_ecrire_compte(null, v_client, jsonb_build_object('reference', 'C-PARTI-A', 'nom', 'Maçonnerie Girard', 'contact_facturation_email', 'compta@girard.test'));
  perform public.cashd_ecrire_facture(null, v_client, jsonb_build_object('compte_id', v_a, 'numero', 'F-2026-810', 'date_emission', j - 70, 'echeance', j - 40, 'montant_ttc', 1500));
  -- B : le rappel est parti (noté envoyé à la main), la relance suit.
  v_b := public.cashd_ecrire_compte(null, v_client, jsonb_build_object('reference', 'C-PARTI-B', 'nom', 'Plomberie Lemaire', 'contact_facturation_email', 'compta@lemaire.test'));
  perform public.cashd_ecrire_facture(null, v_client, jsonb_build_object('compte_id', v_b, 'numero', 'F-2026-811', 'date_emission', j - 70, 'echeance', j - 40, 'montant_ttc', 900));
  -- C : sans adresse, rien ne part.
  v_c := public.cashd_ecrire_compte(null, v_client, jsonb_build_object('reference', 'C-PARTI-C', 'nom', 'Élec Vasseur'));
  perform public.cashd_ecrire_facture(null, v_client, jsonb_build_object('compte_id', v_c, 'numero', 'F-2026-812', 'date_emission', j - 70, 'echeance', j - 40, 'montant_ttc', 700));
  perform tests.redevenir_admin();

  -- Jour j : un rappel pour chacun. Seul celui de B part (validé, noté envoyé à la main) ; celui de A attend, celui de C n'a pas d'adresse.
  perform private.cashd_preparer_relances(v_client, j, null);
  select * into rb from public.cashd_relances x where x.compte_id = v_b and x.jour = j;
  perform tests.c2_approuver(rb.demande_id, v_client, v_daf, 'daf@banc-varelo.test');
  perform tests.endosser(v_gerant, 'gerant@banc-varelo.test');
  perform public.cashd_noter_envoi_main(rb.id, 'email');
  perform tests.redevenir_admin();

  -- Jour j + 5 : la relance ferme remplace les rappels.
  perform private.cashd_preparer_relances(v_client, j + 5, null);
  select * into ra from public.cashd_relances x where x.compte_id = v_a and x.jour = j + 5;
  select * into rb from public.cashd_relances x where x.compte_id = v_b and x.jour = j + 5;
  select * into rc from public.cashd_relances x where x.compte_id = v_c and x.jour = j + 5;
  return next ok(ra.palier = 'relance' and tests.c2_plat(ra.corps) not like '%précédent rappel%' and tests.c2_plat(ra.corps) not like '%premier rappel%'
                 and ra.corps like '%F-2026-810%' and tests.c2_plat(ra.corps) like '%Total restant dû%',
                 'Relance ferme qui remplace un rappel jamais parti : le texte ne cite aucun rappel');
  return next ok(rc.palier = 'relance' and tests.c2_plat(rc.corps) not like '%précédent rappel%' and tests.c2_plat(rc.corps) not like '%premier rappel%',
                 'Même chose pour un compte sans adresse');
  return next ok(rb.palier = 'relance' and tests.c2_plat(rb.corps) like '%Malgré notre précédent rappel%',
                 'Après un rappel réellement parti, la relance ferme le cite');

  -- Jour j + 10 : la mise en demeure. A n'a rien reçu ; B a reçu son rappel.
  perform private.cashd_preparer_relances(v_client, j + 10, null);
  select * into ra from public.cashd_relances x where x.compte_id = v_a and x.jour = j + 10;
  select * into rb from public.cashd_relances x where x.compte_id = v_b and x.jour = j + 10;
  return next ok(ra.palier = 'mise_en_demeure' and tests.c2_plat(ra.corps) not like '%précédentes relances%'
                 and tests.c2_plat(ra.corps) like '%Les sommes suivantes restent impayées%' and tests.c2_plat(ra.corps) like '%mettons en demeure%',
                 'Mise en demeure sans envoi parti : elle ne cite aucune relance précédente, la mise en demeure reste entière');
  return next ok(rb.palier = 'mise_en_demeure' and tests.c2_plat(rb.corps) like '%Malgré nos précédentes relances%',
                 'Après un envoi réellement parti, la mise en demeure cite les relances précédentes');
end $f$;
