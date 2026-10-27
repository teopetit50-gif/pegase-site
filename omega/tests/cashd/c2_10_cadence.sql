-- CASHD — c2_10 : la cadence du site par défaut. Facture : un rappel courtois le jour de l'échéance (puis J+7, J+21,
-- J+30) ; devis : J+3 puis J+7 après l'envoi. Réglable par organisation.
-- Sur le banc (client cccccccc-0000-4000-8000-00000000000c), dans une transaction annulée.

create or replace function tests.test_c2_10_cadence() returns setof text
language plpgsql as $f$
declare
  banc jsonb; v_client uuid; v_gerant uuid; j date := tests.c2_jour(); v_fr uuid; v_en uuid; v_retard uuid; r public.cashd_relances;
  v_f_jour uuid; v_f_plus_tard uuid; v_f_retard uuid; v_devis uuid;
begin
  banc := tests.c2_banc();
  v_client := (banc ->> 'client')::uuid; v_gerant := (banc ->> 'gerant')::uuid;
  perform tests.redevenir_admin();
  perform public.cashd_installer(v_client);

  -- ── La cadence par défaut ──
  return next ok((select substring(c.column_default from '^''(.*)''::jsonb$')::jsonb from information_schema.columns c
                  where c.table_schema = 'public' and c.table_name = 'cashd_reglages' and c.column_name = 'scenario')
                   = '[{"palier": "echeance", "jours": 0}, {"palier": "rappel", "jours": 7}, {"palier": "relance", "jours": 21}, {"palier": "mise_en_demeure", "jours": 30}]'::jsonb
                 and (select substring(c.column_default from '^''(.*)''::jsonb$')::jsonb from information_schema.columns c
                      where c.table_schema = 'public' and c.table_name = 'cashd_reglages' and c.column_name = 'scenario_devis')
                   = '[{"palier": "devis_rappel", "jours": 3}, {"palier": "devis_relance", "jours": 7}]'::jsonb,
                 'Par défaut : facture J 0, J+7, J+21, J+30 ; devis J+3 puis J+7');

  -- Le banc reçoit la cadence par défaut (il a pu être réglé autrement) et trois comptes.
  perform tests.endosser(v_gerant, 'gerant@banc-varelo.test');
  perform public.cashd_regler_relances(v_client, jsonb_build_object(
    'scenario', '[{"palier": "echeance", "jours": 0}, {"palier": "rappel", "jours": 7}, {"palier": "relance", "jours": 21}, {"palier": "mise_en_demeure", "jours": 30}]'::jsonb,
    'scenario_devis', '[{"palier": "devis_rappel", "jours": 3}, {"palier": "devis_relance", "jours": 7}]'::jsonb));
  v_fr := public.cashd_ecrire_compte(null, v_client, jsonb_build_object('reference', 'C-ECHEANCE', 'nom', 'Menuiserie Arnaud',
            'contact_facturation_email', 'compta@arnaud.test', 'contact_facturation_nom', 'M. Arnaud'));
  v_en := public.cashd_ecrire_compte(null, v_client, jsonb_build_object('reference', 'C-LONDON', 'nom', 'Thames Joinery Ltd', 'langue', 'en',
            'contact_facturation_email', 'accounts@thames.test'));
  v_retard := public.cashd_ecrire_compte(null, v_client, jsonb_build_object('reference', 'C-RETARD', 'nom', 'Garage Morel',
            'contact_facturation_email', 'compta@morel.test'));
  v_f_jour := public.cashd_ecrire_facture(null, v_client, jsonb_build_object('compte_id', v_fr, 'numero', 'F-2026-310', 'date_emission', j - 29,
                'echeance', j + 1, 'montant_ttc', 4800));
  v_f_plus_tard := public.cashd_ecrire_facture(null, v_client, jsonb_build_object('compte_id', v_en, 'numero', 'F-2026-311', 'date_emission', j - 25,
                     'echeance', j + 5, 'montant_ttc', 1200));
  v_f_retard := public.cashd_ecrire_facture(null, v_client, jsonb_build_object('compte_id', v_retard, 'numero', 'F-2026-312', 'date_emission', j - 33,
                  'echeance', j - 3, 'montant_ttc', 900));
  v_devis := public.cashd_ecrire_facture(null, v_client, jsonb_build_object('compte_id', v_fr, 'nature', 'devis', 'numero', 'D-2026-090',
               'date_emission', j - 2, 'montant_ttc', 15600));
  perform tests.redevenir_admin();

  -- ── Le jour de l'échéance ──
  perform private.cashd_preparer_relances(v_client, j + 1, null);
  select * into r from public.cashd_relances x where x.compte_id = v_fr and x.nature = 'facture' and x.jour = j + 1;
  return next is(r.palier || '/' || r.gabarit, 'echeance/echeance', 'Le jour de son échéance, la facture reçoit son rappel courtois');
  return next ok(tests.c2_plat(r.corps) like '%la facture suivante arrive à échéance aujourd''hui%'
                 and tests.c2_plat(r.corps) like '%Facture F-2026-310 du %, 4 800,00 € TTC, à régler le ' || to_char(j + 1, 'DD/MM/YYYY') || '%'
                 and r.corps not like '%retard%' and r.corps not like '%L441-10%' and r.penalites = 0 and r.indemnites = 0,
                 'Il dit que la facture est à régler aujourd''hui : ni retard, ni pénalité, ni indemnité');
  return next ok(r.sujet like '%facture F-2026-310%échéance du jour%' and r.statut in ('a_valider', 'non_reglee', 'preparee'),
                 'Son objet le dit, et il attend la validation comme toute relance');
  return next ok(not exists (select 1 from public.cashd_relances x where x.compte_id = v_en),
                 'Une facture qui arrive à échéance dans cinq jours attend son jour');
  return next is((select s.palier_suivant || '/' || (s.palier_suivant_le - j) from public.cashd_suivi s where s.facture_id = v_f_plus_tard), 'echeance/5',
                 'Son rappel du jour d''échéance est prévu à sa date');

  return next is((select x.palier from public.cashd_relances x where x.compte_id = v_fr and x.nature = 'devis' and x.jour = j + 1), 'devis_rappel',
                 'Trois jours après l''envoi, le devis est relancé');
  return next is((select s.palier_suivant || '/' || (s.palier_suivant_le - j) from public.cashd_suivi s where s.facture_id = v_devis), 'devis_relance/5',
                 'Sa seconde relance du devis tombe à J+7, quatre jours après la première : l''écart des devis est celui de leur scénario');

  -- ── Une facture déjà échue ne reçoit pas de « échéance du jour » ──
  return next is((select s.palier_suivant from public.cashd_suivi s where s.facture_id = v_f_retard), 'rappel',
                 'Déjà échue de trois jours : le rappel du jour d''échéance est sauté, le rappel J+7 suit');
  return next ok(not exists (select 1 from public.cashd_relances x where x.compte_id = v_retard and x.palier = 'echeance'),
                 'Aucun rappel « à régler aujourd''hui » sur une facture en retard');
  perform private.cashd_preparer_relances(v_client, j + 3, null);
  return next ok(not exists (select 1 from public.cashd_relances x where x.compte_id = v_retard), 'Rien avant J+7');
  perform private.cashd_preparer_relances(v_client, j + 4, null);
  return next is((select x.palier from public.cashd_relances x where x.compte_id = v_retard and x.jour = j + 4), 'rappel', 'À J+7 de l''échéance, le rappel');
  perform private.cashd_preparer_relances(v_client, j + 5, null);
  return next ok(not exists (select 1 from public.cashd_relances x where x.compte_id = v_en and x.jour = j + 4)
                 and exists (select 1 from public.cashd_relances x where x.compte_id = v_en and x.jour = j + 5 and x.palier = 'echeance'
                             and x.sujet like '%invoice F-2026-311 due today%' and tests.c2_plat(x.corps) like '%invoice is due today%'),
                 'Un compte anglais reçoit le sien en anglais, le jour dit');

  -- ── Le devis : J+3 puis J+7 ──
  return next ok(exists (select 1 from public.cashd_relances x where x.compte_id = v_fr and x.nature = 'devis' and x.jour = j + 5 and x.palier = 'devis_relance')
                 and not exists (select 1 from public.cashd_relances x where x.compte_id = v_fr and x.nature = 'devis' and x.jour = j + 4),
                 'Et elle part à J+7, pas avant');

  -- ── Réglable par organisation ──
  perform tests.endosser(v_gerant, 'gerant@banc-varelo.test');
  perform public.cashd_regler_relances(v_client, '{"scenario": [{"palier": "rappel", "jours": 7}, {"palier": "relance", "jours": 21}, {"palier": "mise_en_demeure", "jours": 30}]}');
  perform tests.redevenir_admin();
  return next is((select s.palier_suivant from public.cashd_suivi s where s.facture_id = v_f_jour), 'rappel',
                 'Sans rappel du jour d''échéance dans son scénario, l''organisation passe au rappel J+7 — même après un rappel d''échéance déjà écrit');
  return next ok(exists (select 1 from public.cashd_historique_reglages h where h.client_id = v_client and h.donnees ? 'scenario'),
                 'Le changement de cadence reste daté');
end $f$;
