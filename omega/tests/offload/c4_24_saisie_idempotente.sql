-- c4_24 — OFFLOAD : une saisie rejouée ne double rien (testeur T-OFFLOAD, TOFFLOAD-05 ; session C4, 21/10/2026).
-- Après c4_00, c4_03 (aides) et les migrations c4_01 à c4_24. Données fictives. runtests() annule tout.

create or replace function tests.test_c4_24_saisie_idempotente() returns setof text
language plpgsql as $f$
declare
  banc jsonb := tests.c4_banc();
  v_client uuid := (banc ->> 'client')::uuid;
  v_gerant uuid := (banc ->> 'gerant')::uuid;
  v_x uuid; v_a1 uuid; v_a2 uuid; v_a3 uuid; v_k1 uuid; v_k2 uuid;
  v_d1 uuid; v_d2 uuid;
  v_collab uuid;
  n integer;
begin
  perform tests.c4_reprises_pretes();
  v_x := tests.c4_compte_courriel('ID1', 'Garage Rejeu', 'atelier@garage-rejeu.test', 70);

  perform tests.endosser(v_gerant, 'gerant@banc-varelo.test');
  v_a1 := public.offload_saisir_achat(v_x, current_date - 5, 450, 'F-1013', 'Entretien', 'facture');
  v_a2 := public.offload_saisir_achat(v_x, current_date - 5, 450, 'F-1013', 'Entretien', 'facture');
  v_a3 := public.offload_saisir_achat(v_x, current_date - 5, 450, 'F-1014', 'Entretien', 'facture');
  v_k1 := public.offload_noter_contact(v_x, current_date - 3, 'appel', 'Sophie', 'Rappel du client');
  v_k2 := public.offload_noter_contact(v_x, current_date - 3, 'appel', 'Sophie', 'Rappel du client');
  perform tests.redevenir_admin();

  return next ok(v_a1 = v_a2, 'Rejouer la même saisie rend le même achat');
  return next is((select count(*)::int from public.offload_achats a where a.compte_id = v_x and a.reference = 'F-1013' and a.annule_le is null), 1,
                 'Un seul achat F-1013 actif : le chiffre n''est pas doublé');
  return next ok(v_a3 <> v_a1, 'Une autre référence est un autre achat');
  return next ok(v_k1 = v_k2 and (select count(*)::int from public.offload_contacts k where k.compte_id = v_x) = 1,
                 'Rejouer le même contact ne le double pas');

  -- L'existant : deux achats saisis identiques (comme sur banc-test-offload avant le lot).
  insert into public.offload_achats (client_id, entite_id, compte_id, date_achat, montant_ht, reference, nature, source, cree_le)
  select v_client, k.entite_id, k.id, current_date - 40, 300, 'F-DBL', 'facture', 'saisie', now() - interval '2 hours'
  from public.offload_comptes k where k.id = v_x returning id into v_d1;
  insert into public.offload_achats (client_id, entite_id, compte_id, date_achat, montant_ht, reference, nature, source, cree_le)
  select v_client, k.entite_id, k.id, current_date - 40, 300, 'F-DBL', 'facture', 'saisie', now() - interval '1 hour'
  from public.offload_comptes k where k.id = v_x returning id into v_d2;

  v_collab := tests.c4_compte(v_client, 'collaborateur', 'collab-c4-doublons@banc-varelo.test');
  perform tests.endosser(v_collab, 'collab-c4-doublons@banc-varelo.test');
  return next throws_ok(format('select public.offload_dedoublonner_achats(%L::uuid)', v_client), '42501', null,
                        'Un collaborateur ne répare pas les doublons');
  perform tests.endosser(v_gerant, 'gerant@banc-varelo.test');
  n := public.offload_dedoublonner_achats(v_client);
  perform tests.redevenir_admin();
  return next ok(n >= 1 and (select a.annule_le from public.offload_achats a where a.id = v_d1) is null
                 and (select a.annule_le from public.offload_achats a where a.id = v_d2) is not null,
                 'La réparation annule le doublon, garde le premier (' || n || ' annulé(s))');
  return next ok(exists (select 1 from public.offload_achats a where a.id = v_d2), 'Le doublon est annulé, pas effacé');
  perform tests.endosser(v_gerant, 'gerant@banc-varelo.test');
  return next is(public.offload_dedoublonner_achats(v_client), 0, 'Rejouer la réparation ne change plus rien');
  perform tests.redevenir_admin();
end $f$;

select * from runtests('tests'::name, '^test_c4_24_');
