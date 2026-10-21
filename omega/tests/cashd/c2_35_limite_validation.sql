-- CASHD — c2_35 : la date limite laisse le temps de la validation et de la remise ; la mise en demeure par défaut compte
-- son délai depuis la réception (TCASHD-10b). Sur le banc (client cccccccc-…-0c), transaction annulée. Utilise tests.c2_parti.

create or replace function tests.test_c2_35_limite_validation() returns setof text
language plpgsql as $f$
declare
  banc jsonb; v_client uuid; v_gerant uuid; j date := tests.c2_jour(); v_a uuid; v_b uuid; ra public.cashd_relances; rb public.cashd_relances; v_d text;
begin
  banc := tests.c2_banc();
  v_client := (banc ->> 'client')::uuid; v_gerant := (banc ->> 'gerant')::uuid;
  perform tests.redevenir_admin();
  perform public.cashd_installer(v_client);
  perform tests.endosser(v_gerant, 'gerant@banc-varelo.test');
  perform public.cashd_regler_relances(v_client, jsonb_build_object(
    'scenario', '[{"palier": "echeance", "jours": 0}, {"palier": "rappel", "jours": 7}, {"palier": "relance", "jours": 21}, {"palier": "mise_en_demeure", "jours": 30}]'::jsonb,
    'delai_mise_en_demeure_jours', 8, 'seuil_lre', 2000));
  v_a := public.cashd_ecrire_compte(null, v_client, jsonb_build_object('reference', 'A-LIM', 'nom', 'Limite Courriel', 'contact_facturation_email', 'compta@lim.test'));
  perform public.cashd_ecrire_facture(null, v_client, jsonb_build_object('compte_id', v_a, 'numero', 'FB-2026-2101', 'date_emission', j - 70, 'echeance', j - 40, 'montant_ttc', 1085));
  v_b := public.cashd_ecrire_compte(null, v_client, jsonb_build_object('reference', 'A-LRE', 'nom', 'Limite Recommandée', 'contact_facturation_email', 'compta@lre.test'));
  perform public.cashd_ecrire_facture(null, v_client, jsonb_build_object('compte_id', v_b, 'numero', 'FB-2026-2102', 'date_emission', j - 70, 'echeance', j - 40, 'montant_ttc', 3000));

  -- Les gardes du texte de l'organisation : une mise en demeure porte {limite} ou {delai}.
  return next throws_ok(format('select public.cashd_ecrire_gabarit(%L, %L, %L, 1, %L, %L)', v_client, 'mise_en_demeure', 'fr', 'MED', '{lignes} {total}'),
                        '22023', 'Ce palier exige dans le corps : {limite} ou {delai}.', 'Une mise en demeure sans délai est refusée');
  return next lives_ok(format('select public.cashd_ecrire_gabarit(%L, %L, %L, 1, %L, %L, false)', v_client, 'mise_en_demeure', 'fr', 'MED', '{lignes} {total} sous {delai} jours'),
                       'Avec {delai} seul, elle est admise');
  perform tests.redevenir_admin();

  perform private.cashd_preparer_relances(v_client, j, null);
  perform tests.c2_parti(x.id) from public.cashd_relances x where x.compte_id in (v_a, v_b) and x.jour = j;
  perform private.cashd_preparer_relances(v_client, j + 5, null);
  select * into ra from public.cashd_relances x where x.compte_id = v_a and x.jour = j + 5;
  v_d := to_char(private.cashd_jours_ouvres(j + 5, 3) + 8, 'DD/MM/YYYY');
  return next ok(ra.palier = 'relance' and ra.corps like '%au plus tard le ' || v_d || '%',
                 'Relance ferme : la limite compte 3 jours ouvrés de validation, puis le délai de 8 jours');

  perform tests.c2_parti(x.id) from public.cashd_relances x where x.compte_id in (v_a, v_b) and x.jour = j + 5;
  perform private.cashd_preparer_relances(v_client, j + 10, null);
  select * into ra from public.cashd_relances x where x.compte_id = v_a and x.jour = j + 10;
  select * into rb from public.cashd_relances x where x.compte_id = v_b and x.jour = j + 10;
  return next ok(ra.palier = 'mise_en_demeure' and tests.c2_plat(ra.corps) like '%dans un délai de 8 jours à compter de la réception de ce courriel.%'
                 and tests.c2_plat(ra.corps) not like '%au plus tard le%',
                 'Mise en demeure par défaut : le délai court depuis la réception, sans date fixée à la préparation');
  return next ok(rb.canal = 'lre' and (private.cashd_ecrire_texte(rb.id) ->> 'corps') not like '%au plus tard%', 'En LRE aussi');

  -- Un texte de l'organisation qui porte {limite}, en LRE : la remise s'ajoute.
  perform tests.endosser(v_gerant, 'gerant@banc-varelo.test');
  perform public.cashd_ecrire_gabarit(v_client, 'mise_en_demeure', 'fr', 1, 'MED {total}', '{lignes} Réglez {total} au plus tard le {limite}.');
  perform tests.redevenir_admin();
  return next ok((private.cashd_ecrire_texte(rb.id) ->> 'corps') like '%au plus tard le ' || to_char(private.cashd_jours_ouvres(j + 10, 3) + 8 + 2, 'DD/MM/YYYY') || '%',
                 'Par lettre recommandée : 3 jours ouvrés, le délai, plus 2 jours de remise');
  -- Les défauts se règlent.
  perform tests.endosser(v_gerant, 'gerant@banc-varelo.test');
  perform public.cashd_regler_relances(v_client, '{"marge_validation_jours": 0, "remise_courrier_jours": 0}');
  perform tests.redevenir_admin();
  return next ok((private.cashd_ecrire_texte(rb.id) ->> 'corps') like '%au plus tard le ' || to_char(j + 10 + 8, 'DD/MM/YYYY') || '%',
                 'Marge et remise réglées à 0 : la limite revient au jour de préparation plus le délai');
end $f$;
