-- CASHD — c2_24b : aucune relance ferme sans message réellement parti (A-C17, A-C02 après une suspension levée), et la
-- reprise des mises en demeure déjà en file sans message parti (A-C14). Sur le banc (client cccccccc-…-0c), transaction
-- annulée. Utilise tests.c2_parti (c2_24).

create or replace function tests.test_c2_24b_paliers_partis() returns setof text
language plpgsql as $f$
declare
  banc jsonb; v_client uuid; v_gerant uuid; j date := tests.c2_jour(); v_17 uuid; v_02 uuid; v_14 uuid; v_f02 uuid; v_f14 uuid;
  r public.cashd_relances; v_med uuid; v_p jsonb; v_n integer;
begin
  banc := tests.c2_banc();
  v_client := (banc ->> 'client')::uuid; v_gerant := (banc ->> 'gerant')::uuid;
  perform tests.redevenir_admin();
  perform public.cashd_installer(v_client);
  perform tests.endosser(v_gerant, 'gerant@banc-varelo.test');
  perform public.cashd_regler_relances(v_client, jsonb_build_object(
    'scenario', '[{"palier": "echeance", "jours": 0}, {"palier": "rappel", "jours": 7}, {"palier": "relance", "jours": 21}, {"palier": "mise_en_demeure", "jours": 30}]'::jsonb));
  v_17 := public.cashd_ecrire_compte(null, v_client, jsonb_build_object('reference', 'A-C17', 'nom', 'Rappel Jamais Parti', 'contact_facturation_email', 'compta@c17.test'));
  perform public.cashd_ecrire_facture(null, v_client, jsonb_build_object('compte_id', v_17, 'numero', 'FB-2026-1217', 'date_emission', j - 70, 'echeance', j - 40, 'montant_ttc', 1085));
  v_02 := public.cashd_ecrire_compte(null, v_client, jsonb_build_object('reference', 'A-C02', 'nom', 'Gros Œuvre Total Faux', 'contact_facturation_email', 'compta@c02.test'));
  v_f02 := public.cashd_ecrire_facture(null, v_client, jsonb_build_object('compte_id', v_02, 'numero', 'FB-2026-1202', 'date_emission', j - 70, 'echeance', j - 40, 'montant_ttc', 1185));
  v_14 := public.cashd_ecrire_compte(null, v_client, jsonb_build_object('reference', 'A-C14', 'nom', 'Interdits Partout', 'contact_facturation_email', 'compta@c14.test'));
  v_f14 := public.cashd_ecrire_facture(null, v_client, jsonb_build_object('compte_id', v_14, 'numero', 'FB-2026-1214', 'date_emission', j - 70, 'echeance', j - 40, 'montant_ttc', 900));
  perform tests.redevenir_admin();

  -- Jour j : un rappel pour chacun ; aucun ne part.
  perform private.cashd_preparer_relances(v_client, j, null);
  -- A-C02 : la facture est marquée incohérente (sa relance est coupée), puis la marque est levée.
  update public.cashd_factures set incoherence = 'TTC 1185 ≠ lignes : HT 1000 + TVA 85.00 = 1085.00' where id = v_f02;
  perform private.cashd_verifier_relances(v_client);
  update public.cashd_factures set incoherence = null where id = v_f02;

  -- Jour j + 5 : la relance ferme serait due ; rien n'est parti.
  perform private.cashd_preparer_relances(v_client, j + 5, null);
  select * into r from public.cashd_relances x where x.compte_id = v_17 and x.jour = j + 5;
  return next ok(r.palier = 'rappel' and r.gabarit = 'rappel', 'A-C17 : son rappel n''est jamais parti — pas de relance ferme, la séquence reprend au rappel');
  return next ok((select x.statut = 'coupee' and x.motif like 'remplacée par la relance%' from public.cashd_relances x where x.compte_id = v_17 and x.jour = j),
                 'Le nouveau rappel remplace celui qui attendait');
  return next ok((select x.palier from public.cashd_relances x where x.compte_id = v_02 and x.jour = j + 5) = 'rappel',
                 'A-C02 : après la suspension levée, la séquence reprend au premier palier non parti (le rappel)');
  -- Une fois le rappel parti, la relance ferme suit.
  perform tests.c2_parti(r.id);
  -- (A-C14 : son rappel aussi est tenu pour parti — pour reconstituer plus bas une mise en demeure d'avant c2_24)
  perform tests.c2_parti(x.id) from public.cashd_relances x where x.compte_id = v_14 and x.jour = j + 5;
  perform private.cashd_preparer_relances(v_client, j + 10, null);
  return next ok((select x.palier from public.cashd_relances x where x.compte_id = v_17 and x.jour = j + 10) = 'relance',
                 'Le rappel parti, la relance ferme suit');

  -- ── La reprise : une mise en demeure écrite avant c2_24 sans message parti (A-C14) ──
  -- (reconstituée : un envoi noté pour l'écrire, puis retiré, comme si rien n'était parti)
  perform tests.c2_parti(x.id) from public.cashd_relances x where x.compte_id = v_14 and x.jour = j + 10;
  perform private.cashd_preparer_relances(v_client, j + 15, null);
  select x.id into v_med from public.cashd_relances x where x.compte_id = v_14 and x.palier = 'mise_en_demeure' and x.statut = 'a_valider';
  delete from public.cashd_envois_main m using public.cashd_relances x where x.id = m.relance_id and x.compte_id = v_14;
  return next ok(v_med is not null, 'Reconstitué : une mise en demeure de A-C14 en file, sans message parti');
  v_n := private.cashd_retenir_med_sans_envoi(v_client);
  select * into r from public.cashd_relances x where x.id = v_med;
  return next ok(v_n >= 1 and r.statut = 'coupee' and r.motif like 'mise en demeure retenue : la relance qui la précède%'
                 and (select d.statut from public.demandes_validation d where d.id = r.demande_id) = 'annulee',
                 'La reprise la coupe avec le motif, et retire sa demande de la file');
  perform tests.endosser(v_gerant, 'gerant@banc-varelo.test');
  select x into v_p from jsonb_array_elements(public.cashd_fiche_compte(v_14) -> 'pieces') x where x ->> 'numero' = 'FB-2026-1214';
  return next ok(v_p ->> 'relance_suspendue' like 'mise en demeure retenue%' and (v_p ->> 'reste_relancable')::numeric = 0, 'La fiche de A-C14 le dit');
  perform tests.redevenir_admin();
  return next is(private.cashd_retenir_med_sans_envoi(v_client), 0, 'Rejouée, la reprise ne fait plus rien');
end $f$;
