-- CASHD — c2_25 : une mise en demeure approuvée sans commentaire ne part pas (TCASHD-07, approbation fe3fe337).
-- Sur le banc (client cccccccc-0000-4000-8000-00000000000c), dans une transaction annulée. Utilise tests.c2_parti (c2_24).

create or replace function tests.test_c2_25_med_commentee() returns setof text
language plpgsql as $f$
declare
  banc jsonb; v_client uuid; v_gerant uuid; v_daf uuid; j date := tests.c2_jour(); v_a uuid; v_b uuid;
  ra public.cashd_relances; rb public.cashd_relances;
begin
  if to_regclass('public.approbations') is null then
    return next ok(true, 'public.approbations absente du banc : garde non vérifiable ici');
    return;
  end if;
  banc := tests.c2_banc();
  v_client := (banc ->> 'client')::uuid; v_gerant := (banc ->> 'gerant')::uuid; v_daf := (banc ->> 'daf')::uuid;
  perform tests.redevenir_admin();
  perform public.cashd_installer(v_client);
  perform tests.endosser(v_gerant, 'gerant@banc-varelo.test');
  perform public.cashd_regler_relances(v_client, jsonb_build_object(
    'scenario', '[{"palier": "echeance", "jours": 0}, {"palier": "rappel", "jours": 7}, {"palier": "relance", "jours": 21}, {"palier": "mise_en_demeure", "jours": 30}]'::jsonb));
  v_a := public.cashd_ecrire_compte(null, v_client, jsonb_build_object('reference', 'C-MEDC-A', 'nom', 'Rénovation Sans Mot', 'contact_facturation_email', 'compta@medc-a.test'));
  perform public.cashd_ecrire_facture(null, v_client, jsonb_build_object('compte_id', v_a, 'numero', 'FB-2026-0991', 'date_emission', j - 70, 'echeance', j - 40, 'montant_ttc', 1085));
  v_b := public.cashd_ecrire_compte(null, v_client, jsonb_build_object('reference', 'C-MEDC-B', 'nom', 'Rénovation Commentée', 'contact_facturation_email', 'compta@medc-b.test'));
  perform public.cashd_ecrire_facture(null, v_client, jsonb_build_object('compte_id', v_b, 'numero', 'FB-2026-0992', 'date_emission', j - 70, 'echeance', j - 40, 'montant_ttc', 900));
  perform tests.redevenir_admin();
  perform private.cashd_preparer_relances(v_client, j, null);
  perform tests.c2_parti(x.id) from public.cashd_relances x where x.compte_id in (v_a, v_b) and x.jour = j;   -- rappel parti (c2_24b)
  perform private.cashd_preparer_relances(v_client, j + 5, null);
  perform tests.c2_parti(x.id) from public.cashd_relances x where x.compte_id in (v_a, v_b) and x.jour = j + 5;
  perform private.cashd_preparer_relances(v_client, j + 10, null);
  select * into ra from public.cashd_relances x where x.compte_id = v_a and x.jour = j + 10;
  select * into rb from public.cashd_relances x where x.compte_id = v_b and x.jour = j + 10;
  return next ok(ra.palier = 'mise_en_demeure' and rb.palier = 'mise_en_demeure', 'Deux mises en demeure à valider');

  -- A : approuvée sans commentaire, comme l'approbation fe3fe337 de la recette.
  perform tests.endosser(v_daf, 'daf@banc-varelo.test');
  insert into public.approbations (demande_id, client_id, user_id, decision, commentaire) values (ra.demande_id, v_client, v_daf, 'approuve', null);
  -- B : approuvée avec un commentaire.
  insert into public.approbations (demande_id, client_id, user_id, decision, commentaire)
  values (rb.demande_id, v_client, v_daf, 'approuve', 'Trois relances sans réponse, accord du gérant ce matin.');
  perform tests.redevenir_admin();

  select * into ra from public.cashd_relances x where x.id = ra.id;
  select * into rb from public.cashd_relances x where x.id = rb.id;
  return next ok(ra.statut = 'coupee' and ra.motif like 'mise en demeure approuvée sans commentaire : elle ne part pas%',
                 'Approuvée sans commentaire : la mise en demeure est coupée, avec le motif');
  return next ok(not exists (select 1 from public.cashd_relances_pieces p where p.relance_id = ra.id and not p.annulee),
                 'Ses paliers sont rendus : une nouvelle mise en demeure sera proposée');
  return next ok(rb.statut <> 'coupee' and (select x.etat from public.cashd_relances_etat x where x.id = rb.id) in ('validee', 'envoyee'),
                 'Approuvée avec un commentaire : elle suit son cours');
  return next ok(tests.c2_journal(v_client, 'cashd.relance_coupee', ra.id::text) ->> 'donnees' like '%sans commentaire%', 'La coupure est au journal');
  perform private.cashd_preparer_relances(v_client, j + 11, null);
  return next ok((select x.palier = 'mise_en_demeure' and x.statut = 'a_valider' from public.cashd_relances x where x.compte_id = v_a and x.jour = j + 11),
                 'Au passage suivant, la mise en demeure de A est proposée de nouveau, à valider');
end $f$;
