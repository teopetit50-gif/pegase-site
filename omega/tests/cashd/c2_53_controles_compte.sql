-- CASHD — c2_53 : codes de langue et numéro de facturation contrôlés à la saisie ; la langue réelle du texte
-- (TNUIT-05, TNUIT-07). Sur le banc (client cccccccc-…-0c), transaction annulée.

create or replace function tests.test_c2_53_controles_compte() returns setof text
language plpgsql as $f$
declare
  banc jsonb; v_client uuid; v_gerant uuid; j date := tests.c2_jour(); v_es uuid; v_pt uuid; v_fr uuid; v_imp uuid;
begin
  banc := tests.c2_banc();
  v_client := (banc ->> 'client')::uuid; v_gerant := (banc ->> 'gerant')::uuid;
  perform tests.redevenir_admin();
  perform public.cashd_installer(v_client);
  perform tests.endosser(v_gerant, 'gerant@banc-varelo.test');

  -- Langue : un code régional est ramené à sa langue ; un code inconnu est refusé avec un message juste.
  v_es := public.cashd_ecrire_compte(null, v_client, jsonb_build_object('reference', 'A-LG-ES', 'nom', 'Langue Régionale', 'langue', 'es-ES', 'contact_facturation_email', 'a@lg.test'));
  v_pt := public.cashd_ecrire_compte(null, v_client, jsonb_build_object('reference', 'A-LG-PT', 'nom', 'Langue Portugaise', 'langue', 'PT_br', 'contact_facturation_email', 'b@lg.test'));
  return next ok((select x.langue from public.cashd_comptes x where x.id = v_es) = 'es' and (select x.langue from public.cashd_comptes x where x.id = v_pt) = 'pt',
                 'es-ES devient es, PT_br devient pt');
  return next throws_ok(format('select public.cashd_ecrire_compte(null, %L, %L)', v_client, '{"reference":"A-LG-X","nom":"X","langue":"espagnol"}'), '22023',
                        'Langue de facturation inconnue : « espagnol ». Donnez son code de deux lettres (fr, en, es, de…), au besoin avec sa région (es-ES).',
                        'Une langue illisible est refusée par un message clair, pas par une contrainte brute');

  -- Téléphone : « abc » est refusé à la saisie ; un vrai numéro passe.
  return next throws_ok(format('select public.cashd_ecrire_compte(null, %L, %L)', v_client, '{"reference":"A-TEL-X","nom":"X","contact_facturation_telephone":"abc"}'), '22023',
                        'Numéro de facturation invalide : « abc ». Un numéro compte au moins 9 chiffres, par exemple +590 690 12 34 56.',
                        'Un numéro sans chiffres est refusé à la saisie, avec la raison');
  v_fr := public.cashd_ecrire_compte(null, v_client, jsonb_build_object('reference', 'A-TEL-OK', 'nom', 'Numéro Valide', 'contact_facturation_telephone', '+590 690 12 34 56', 'contact_facturation_email', 'c@lg.test'));
  return next ok((select x.contact_facturation_telephone from public.cashd_comptes x where x.id = v_fr) = '+590 690 12 34 56', 'Un vrai numéro est accepté tel quel');
  return next throws_ok(format('select public.cashd_ecrire_compte(%L, %L, %L)', v_fr, v_client, '{"contact_facturation_telephone":"06-ab"}'), '22023', null,
                        'La modification d''un numéro est contrôlée de même');
  perform tests.redevenir_admin();

  -- À l'import, une ligne n'est pas perdue pour un numéro illisible : il est écarté, et l'organisation est prévenue.
  v_imp := private.cashd_ecrire_compte(null, v_client, jsonb_build_object('reference', 'A-TEL-IMP', 'nom', 'Import Numéro', 'contact_facturation_telephone', 'n/a', 'langue', 'de-AT'), 'import');
  return next ok((select x.contact_facturation_telephone is null and x.langue = 'de' from public.cashd_comptes x where x.id = v_imp)
                 and exists (select 1 from public.alertes a where a.client_id = v_client and a.titre like '%numéro de facturation illisible%Import Numéro%'),
                 'À l''import, le numéro illisible est écarté et signalé ; la langue régionale est ramenée');

  -- La langue réelle du texte : un compte portugais, sans texte écrit par l'organisation, reçoit l'anglais et le dit.
  perform tests.endosser(v_gerant, 'gerant@banc-varelo.test');
  perform public.cashd_ecrire_facture(null, v_client, jsonb_build_object('compte_id', v_pt, 'numero', 'FB-2026-3701', 'date_emission', j - 40, 'echeance', j - 10, 'montant_ttc', 300));
  perform public.cashd_ecrire_facture(null, v_client, jsonb_build_object('compte_id', v_es, 'numero', 'FB-2026-3702', 'date_emission', j - 40, 'echeance', j - 10, 'montant_ttc', 300));
  perform tests.redevenir_admin();
  perform private.cashd_preparer_relances(v_client, j, null);
  return next ok((select x.langue = 'pt' and x.langue_texte = 'en' from public.cashd_relances x where x.compte_id = v_pt and x.jour = j)
                 and (select x.langue_texte = 'es' from public.cashd_relances x where x.compte_id = v_es and x.jour = j)
                 and (select e.langue_texte = 'en' from public.cashd_relances_etat e join public.cashd_relances x on x.id = e.id where x.compte_id = v_pt and x.jour = j),
                 'La relance dit la langue de son texte (en pour un compte pt sans texte propre, es pour es), jusque dans la vue');
end $f$;
