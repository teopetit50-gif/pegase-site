-- CASHD — c2_32 : une relance non_reglee (pas d'envoi CASHD réglé) se note envoyée à la main une fois validée (TCASHD-15).
-- Sur le banc (client cccccccc-0000-4000-8000-00000000000c), dans une transaction annulée. Utilise tests.c2_approuver (c2_11).

create or replace function tests.test_c2_32_main_non_reglee() returns setof text
language plpgsql as $f$
declare
  banc jsonb; v_client uuid; v_gerant uuid; v_daf uuid; j date := tests.c2_jour(); v_c uuid; r public.cashd_relances; v_x jsonb;
begin
  banc := tests.c2_banc();
  v_client := (banc ->> 'client')::uuid; v_gerant := (banc ->> 'gerant')::uuid; v_daf := (banc ->> 'daf')::uuid;
  perform tests.redevenir_admin();
  perform public.cashd_installer(v_client);
  perform tests.endosser(v_gerant, 'gerant@banc-varelo.test');
  v_c := public.cashd_ecrire_compte(null, v_client, jsonb_build_object('reference', 'A-C17NR', 'nom', 'Envoie Lui-Même', 'contact_facturation_email', 'compta@c17nr.test'));
  perform public.cashd_ecrire_facture(null, v_client, jsonb_build_object('compte_id', v_c, 'numero', 'FB-2026-1717', 'date_emission', j - 40, 'echeance', j - 10, 'montant_ttc', 1085));
  perform tests.redevenir_admin();
  perform private.cashd_preparer_relances(v_client, j, null);
  -- Sans réglage d'envoi CASHD, le préparateur la laisse « non_reglee » (posé ici : le banc a un réglage d'envoi).
  update public.cashd_relances set statut = 'non_reglee',
         motif = 'l''envoi par courriel n''est pas encore réglé pour CASHD : la relance est écrite et validable, l''envoi viendra une fois le réglage posé'
   where compte_id = v_c and jour = j returning * into r;

  perform tests.endosser(v_gerant, 'gerant@banc-varelo.test');
  return next throws_ok(format('select public.cashd_noter_envoi_main(%L, %L)', r.id, 'email'), '55000', 'Une relance ne part qu''après sa validation : validez-la d''abord dans la file.',
                        'Non validée, elle ne se note pas encore');
  perform tests.redevenir_admin();
  perform tests.c2_approuver(r.demande_id, v_client, v_daf, 'daf@banc-varelo.test');
  perform tests.endosser(v_gerant, 'gerant@banc-varelo.test');
  v_x := public.cashd_noter_envoi_main(r.id, 'email', null, 'Envoyé depuis notre messagerie');
  return next ok(v_x ->> 'canal' = 'email', 'Validée, la relance non_reglee se note envoyée à la main');
  return next ok((select x ->> 'etat' from jsonb_array_elements(public.cashd_relances_du_jour(v_client, j)) x where (x ->> 'id')::uuid = r.id) = 'envoyee',
                 'Dans la liste du jour, elle est partie');
  perform tests.redevenir_admin();
  return next ok(private.cashd_palier_parti((select p.facture_id from public.cashd_relances_pieces p where p.relance_id = r.id), 'rappel'),
                 'Le palier compte comme parti : la séquence peut avancer');
end $f$;
