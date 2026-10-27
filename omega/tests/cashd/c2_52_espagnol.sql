-- CASHD — c2_52 : un compte en espagnol reçoit sa relance en espagnol (C17). Sur le banc (client cccccccc-…-0c),
-- transaction annulée.

create or replace function tests.test_c2_52_espagnol() returns setof text
language plpgsql as $f$
declare
  banc jsonb; v_client uuid; v_gerant uuid; j date := tests.c2_jour(); v_es uuid; v_de uuid; r public.cashd_relances; v_t text; k text;
begin
  banc := tests.c2_banc();
  v_client := (banc ->> 'client')::uuid; v_gerant := (banc ->> 'gerant')::uuid;
  perform tests.redevenir_admin();
  perform public.cashd_installer(v_client);
  perform tests.endosser(v_gerant, 'gerant@banc-varelo.test');
  v_es := public.cashd_ecrire_compte(null, v_client, jsonb_build_object('reference', 'A-ES', 'nom', 'Distribuidora Caribe SRL', 'langue', 'es',
                                                                       'contact_facturation_nom', 'Sra. Pérez', 'contact_facturation_email', 'cuentas@caribe.test'));
  perform public.cashd_ecrire_facture(null, v_client, jsonb_build_object('compte_id', v_es, 'numero', 'FB-2026-3601', 'date_emission', j - 40, 'echeance', j - 10, 'montant_ttc', 1085));
  v_de := public.cashd_ecrire_compte(null, v_client, jsonb_build_object('reference', 'A-DE', 'nom', 'Handel GmbH', 'langue', 'de', 'contact_facturation_email', 'buchhaltung@handel.test'));
  perform public.cashd_ecrire_facture(null, v_client, jsonb_build_object('compte_id', v_de, 'numero', 'FB-2026-3602', 'date_emission', j - 40, 'echeance', j - 10, 'montant_ttc', 1085));
  perform tests.redevenir_admin();
  perform private.cashd_preparer_relances(v_client, j, null);

  select * into r from public.cashd_relances x where x.compte_id = v_es and x.jour = j;
  v_t := tests.c2_plat(r.sujet || E'\n' || r.corps);
  return next ok(v_t like '%Estimado/a Sra. Pérez:%' and v_t ~ '(Salvo error por nuestra parte|Nos ponemos en contacto con usted)'
                 and v_t like '%Factura FB-2026-3601 del %, 1.085,00 € IVA incluido, vencida el % (10 días de retraso): 1.085,00 € pendientes%'
                 and v_t like '%Atentamente,%',
                 'Le compte en espagnol reçoit son rappel en espagnol : salutation, ligne de facture, montants, formule');
  return next ok(v_t !~ '(Sauf erreur|Bonjour|Unless we are mistaken|Dear |Kind regards|restant dus)', 'Ni français ni anglais dans ce texte');
  return next ok(r.sujet like '% — recordatorio: factura FB-2026-3601 vencida' or r.sujet like '% — factura FB-2026-3601 vencida: recordatorio',
                 'L''objet est en espagnol');

  -- Les six paliers ont leur texte espagnol, toutes variantes ; la mise en demeure cite le délai et le recouvrement.
  foreach k in array array['echeance', 'rappel', 'relance', 'relance_premier', 'mise_en_demeure', 'mise_en_demeure_premier', 'devis_rappel', 'devis_relance'] loop
    if private.cashd_gabarit_defaut(k, 'es', 1) is null or (private.cashd_gabarit_defaut(k, 'es', 1) ->> 'corps') = (private.cashd_gabarit_defaut(k, 'en', 1) ->> 'corps') then
      return next ok(false, 'Texte espagnol manquant : ' || k);
    end if;
  end loop;
  return next ok(private.cashd_gabarit_defaut('mise_en_demeure', 'es', 1) ->> 'corps' like '%le requerimos formalmente el pago%{delai} días%procedimiento de cobro%',
                 'Les paliers ont leur texte espagnol ; la mise en demeure dit le délai et la suite');

  -- Une autre langue garde l'anglais par défaut ; le français ne change pas.
  select * into r from public.cashd_relances x where x.compte_id = v_de and x.jour = j;
  return next ok(r.corps ~ '(Unless we are mistaken|We are writing about your account)', 'Un compte en allemand, sans texte écrit par l''organisation, reçoit l''anglais');
  return next is(private.cashd_eur(1085, 'fr'), '1' || chr(8239) || '085,00' || chr(160) || '€', 'Les montants français ne changent pas');
  return next is(private.cashd_eur(1085, 'es'), '1.085,00' || chr(160) || '€', 'Les montants espagnols : 1.085,00 €');
end $f$;
