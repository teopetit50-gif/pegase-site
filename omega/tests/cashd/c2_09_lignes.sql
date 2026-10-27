-- CASHD — c2_09 : un compte allemand reçoit le texte ET le détail de ses factures en allemand.
-- Sur le banc (client cccccccc-0000-4000-8000-00000000000c), dans une transaction annulée.

create or replace function tests.test_c2_09_lignes() returns setof text
language plpgsql as $f$
declare
  banc jsonb; v_client uuid; v_gerant uuid; v_collab uuid; j date := tests.c2_jour(); v_compte uuid; r public.cashd_relances;
begin
  banc := tests.c2_banc();
  v_client := (banc ->> 'client')::uuid; v_gerant := (banc ->> 'gerant')::uuid;
  perform tests.redevenir_admin();
  perform public.cashd_installer(v_client);
  v_collab := tests.c2_compte(v_client, 'collaborateur', 'c2-lignes-collab@banc-varelo.test');
  perform tests.endosser(v_gerant, 'gerant@banc-varelo.test');
  v_compte := public.cashd_ecrire_compte(null, v_client, jsonb_build_object('reference', 'C-BERLIN', 'nom', 'Holzbau Berlin GmbH',
                'langue', 'de', 'contact_facturation_email', 'buchhaltung@holzbau.test'));
  perform public.cashd_ecrire_facture(null, v_client, jsonb_build_object('compte_id', v_compte, 'numero', 'F-2026-DE1', 'date_emission', j - 50,
             'echeance', j - 20, 'montant_ttc', 9000));

  -- ── Les gardes ──
  return next throws_ok(format('select public.cashd_ecrire_ligne(%L, %L, %L, %L)', v_client, 'de', 'facture', 'Rechnung {numero}'), '22023', null,
                        'Une ligne de facture sans {reste} est refusée');
  return next throws_ok(format('select public.cashd_ecrire_ligne(%L, %L, %L, %L)', v_client, 'de', 'devis', 'Angebot {numero} : {reste}'), '22023', null,
                        'Un devis n''a pas de reste dû : {reste} est refusé dans sa ligne');
  perform tests.endosser(v_collab, 'c2-lignes-collab@banc-varelo.test');
  return next throws_ok(format('select public.cashd_ecrire_ligne(%L, %L, %L, %L)', v_client, 'de', 'facture', '{numero} {reste}'), '42501', null,
                        'Un collaborateur n''écrit pas les lignes');

  -- ── Le texte et la ligne en allemand ──
  perform tests.endosser(v_gerant, 'gerant@banc-varelo.test');
  perform public.cashd_ecrire_gabarit(v_client, 'rappel', 'de', 1, '{emetteur} — Zahlungserinnerung: {numero}',
    E'Sehr geehrte Damen und Herren,\n\nfolgender Betrag ist noch offen ({compte}):\n{lignes}\nGesamt: {total}.\n');
  perform public.cashd_ecrire_ligne(v_client, 'de', 'facture', 'Rechnung {numero} vom {date}, fällig am {echeance} ({retard} Tage überfällig): {reste} offen');
  return next ok(exists (select 1 from jsonb_array_elements(public.cashd_gabarits(v_client) -> 'lignes') x where x ->> 'langue' = 'de' and x ->> 'nature' = 'facture'),
                 'La ligne se lit avec les textes de l''organisation');
  perform tests.redevenir_admin();
  perform private.cashd_preparer_relances(v_client, j + 1, null);
  select * into r from public.cashd_relances x where x.compte_id = v_compte and x.jour = j + 1;
  return next ok(r.corps like '%Rechnung F-2026-DE1 vom % fällig am % (21 Tage überfällig): %offen%' and r.corps not like '%Invoice%' and r.corps not like '%Facture%',
                 'Le détail de la facture est en allemand, sans un mot d''anglais ni de français');

  -- ── Retirée, la ligne anglaise reprend ──
  perform tests.endosser(v_gerant, 'gerant@banc-varelo.test');
  perform public.cashd_ecrire_ligne(v_client, 'de', 'facture', null, false);
  perform tests.redevenir_admin();
  perform private.cashd_couper(v_client, v_compte, null, 'essai', true, 'facture');
  perform private.cashd_preparer_relances(v_client, j + 2, null);
  select * into r from public.cashd_relances x where x.compte_id = v_compte and x.jour = j + 2;
  return next ok(r.corps like '%Invoice F-2026-DE1%', 'Sans ligne propre, la ligne anglaise s''applique');
end $f$;
