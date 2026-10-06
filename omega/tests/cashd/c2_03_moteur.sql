-- c2_03 — CASHD, palier 2 : le moteur de relance (session C2, 06/10/2026).
-- Après c2_00_jeu.sql et les migrations c2_01 et c2_02. runtests() annule tout.
--
-- Le portefeuille d'Atelier Bertin (c2_00) : SCI Lefèvre (F-2026-101 échue depuis 45 jours, F-2026-140 à échoir, un
-- devis de 5 jours), Hôtel des Brotteaux (F-2026-050 échue depuis 100 jours, un avoir), Mairie de Caluire (à échoir).
-- Le statut attendu d'une relance écrite dépend du réglage d'envoi du banc : « a_valider » si l'envoi de CASHD est réglé
-- (essai ou réel), « non_reglee » sinon. La file de validation reçoit la demande dans les deux cas.

create or replace function tests.test_c2_03_moteur() returns setof text
language plpgsql as $f$
declare
  banc jsonb; v_client uuid; v_gerant uuid; v_collab uuid; p jsonb; j date := tests.c2_jour();
  v_mode text; v_attendu text; v_b jsonb; r public.cashd_relances; d public.demandes_validation; v_rel uuid; v_x uuid; v_items jsonb; v_n integer;
begin
  banc := tests.c2_banc();
  v_client := (banc ->> 'client')::uuid; v_gerant := (banc ->> 'gerant')::uuid;
  perform tests.redevenir_admin();
  perform public.cashd_installer(v_client);
  v_collab := tests.c2_compte(v_client, 'collaborateur', 'c2-moteur-collab@banc-varelo.test');
  v_mode := private.reglages_envois_effectifs(v_client, 'cashd') ->> 'mode';
  v_attendu := case when v_mode is null then 'non_reglee' else 'a_valider' end;

  perform tests.endosser(v_gerant, 'gerant@banc-varelo.test');
  perform public.cashd_regler(v_client, '{"taux_penalites": 0.1215}');
  perform public.cashd_regler_relances(v_client, '{"signature": "Atelier Bertin — service comptable", "formule": "Bien cordialement,"}');
  p := tests.c2_portefeuille();
  perform public.cashd_regler_compte((p ->> 'sci')::uuid, '{"secteur": "Immobilier"}');

  -- ── Les droits ──
  perform tests.endosser(v_collab, 'c2-moteur-collab@banc-varelo.test');
  return next throws_ok(format('select public.cashd_preparer_maintenant(%L)', v_client), '42501', null, 'Un collaborateur sans droit ne déclenche pas les relances');
  perform tests.redevenir_admin();
  return next ok(not has_function_privilege('anon', 'public.cashd_preparer_maintenant(uuid)', 'execute')
                 and not has_table_privilege('authenticated', 'public.cashd_relances', 'insert')
                 and not has_function_privilege('authenticated', 'private.cashd_preparer_relances(uuid, date, uuid)', 'execute'),
                 'anon ne déclenche rien ; les relances ne s''écrivent que par le moteur');

  -- ── Le matin du jour J ──
  perform tests.endosser(v_gerant, 'gerant@banc-varelo.test');
  v_b := public.cashd_preparer_maintenant(v_client);
  return next is((v_b ->> 'preparees')::int, 3, 'Trois relances écrites : la SCI (facture), l''hôtel (facture), la SCI (devis)');
  select * into r from public.cashd_relances x where x.compte_id = (p ->> 'sci')::uuid and x.nature = 'facture' and x.jour = j;
  return next is(r.palier || '/' || r.statut, 'rappel/' || v_attendu, 'SCI : premier palier, le rappel courtois, dans la file');
  return next ok(r.sujet like '%rappel%F-2026-101%' and r.corps like '%F-2026-101%' and tests.c2_plat(r.corps) like '%12 000,00 €%' and r.corps like '%45 jours de retard%'
                 and r.corps like '%C-LEFEVRE, secteur Immobilier%' and r.corps like '%Mme Lefèvre%' and r.corps like '%Bien cordialement,%Atelier Bertin — service comptable%',
                 'Le message reprend la facture, son montant, son retard, la référence et le secteur du compte, la formule et la signature');
  return next ok(r.corps not like '%F-2026-140%', 'La facture non échue n''y est pas');
  return next ok(r.corps like '%simple oubli%', 'Un compte sans retard passé : le ton du rappel est le plus doux');
  select * into d from public.demandes_validation x where x.id = r.demande_id;
  return next is(d.module || '/' || d.type_action || '/' || d.objet_type || '/' || d.montant || '/' || d.statut, 'cashd/cashd.relance/cashd_relances/12000.00/en_attente',
                 'Une demande de validation du socle, avec son montant, attend une décision humaine');
  return next ok(d.payload ->> 'corps' = r.corps and d.payload #>> '{destinataire,adresse}' = 'compta@lefevre-patrimoine.test',
                 'La file montre le texte exact et son destinataire');
  if v_mode is not null then
    return next ok(exists (select 1 from public.envois e where e.id = r.envoi_id and e.demande_id = d.id and e.statut = 'a_valider'),
                   'Le message est préparé par le socle, adossé à la demande : il ne part que si elle est approuvée');
  else
    return next ok(r.envoi_id is null and r.motif like '%pas encore réglé%', 'Envoi non réglé : la relance est écrite et validable, l''envoi attend le réglage');
  end if;
  select * into r from public.cashd_relances x where x.compte_id = (p ->> 'sci')::uuid and x.nature = 'devis' and x.jour = j;
  return next is(r.palier || '/' || (select x.type_action from public.demandes_validation x where x.id = r.demande_id), 'devis_rappel/cashd.devis',
                 'Le devis de 5 jours est relancé (J+3)');
  return next is((public.cashd_preparer_maintenant(v_client) ->> 'preparees')::int, 0, 'Rejouer le matin n''écrit rien de plus');
  return next is((select s.palier_atteint || '/' || s.palier_suivant || '/' || s.etat_sequence from public.cashd_suivi s where s.facture_id = (p ->> 'f3')::uuid),
                 'rappel/relance/en_cours', 'La ligne de l''hôtel indique le palier atteint et le palier suivant');

  -- ── Un règlement coupe ce qui est prêt ──
  select * into r from public.cashd_relances x where x.compte_id = (p ->> 'sci')::uuid and x.nature = 'facture' and x.jour = j;
  perform public.cashd_noter_reglement(v_client, (p ->> 'sci')::uuid, 12000, j, 'VIR LEFEVRE F-2026-101', 'virement');
  return next is((select x.statut from public.cashd_relances x where x.id = r.id), 'coupee', 'Le règlement de F-2026-101 coupe la relance prête');
  return next is((select x.statut from public.demandes_validation x where x.id = r.demande_id), 'annulee', 'Sa demande de validation est annulée');
  return next ok((select x.etat from public.cashd_relances_etat x where x.id = r.id) = 'coupee', 'L''état de la relance le dit');

  -- ── Les paliers suivants de l'hôtel : J+5 la relance ferme, J+10 la mise en demeure ──
  perform tests.redevenir_admin();
  v_b := private.cashd_preparer_relances(v_client, j + 4, null);
  return next ok(not exists (select 1 from public.cashd_relances x where x.compte_id = (p ->> 'hotel')::uuid and x.jour = j + 4),
                 'Quatre jours après le rappel, rien : la fermeté ne monte pas avant cinq jours');
  v_b := private.cashd_preparer_relances(v_client, j + 5, null);
  select * into r from public.cashd_relances x where x.compte_id = (p ->> 'hotel')::uuid and x.jour = j + 5;
  return next is(r.palier, 'relance', 'Cinq jours après : la relance ferme');
  return next ok(tests.c2_plat(r.corps) like '%Total restant dû : 3 000,00 €%' and r.corps like '%au plus tard le ' || to_char(j + 5 + 8, 'DD/MM/YYYY') || '%'
                 and tests.c2_plat(r.corps) like '%indemnité forfaitaire pour frais de recouvrement de 40,00 €%' and r.corps like '%L441-10%',
                 'Elle récapitule le reste dû (avoir déduit), fixe une échéance, rappelle l''indemnité et les pénalités');
  return next is(r.indemnites, 40.00::numeric(14,2), 'L''indemnité de 40 € est comptée');
  return next is(r.penalites, round(0.1215 / 365.0 * 3000 * 105, 2)::numeric(14,2), 'Pénalités : 3 000 € × 105 jours × 12,15 % / 365');

  -- Le seuil de la direction : au-delà de 2 000 €, seuls le gérant et un administrateur valident.
  perform tests.endosser(v_gerant, 'gerant@banc-varelo.test');
  perform public.cashd_regler_relances(v_client, '{"seuil_direction": 2000}');
  perform tests.redevenir_admin();
  return next ok(exists (select 1 from public.regles_validation x where x.client_id = v_client and x.module = 'cashd' and x.montant_min = 2000 and x.actif
                         and x.roles_autorises = array['gerant', 'admin']), 'Le seuil pose une règle de validation du socle pour CASHD');
  v_b := private.cashd_preparer_relances(v_client, j + 10, null);
  select * into r from public.cashd_relances x where x.compte_id = (p ->> 'hotel')::uuid and x.jour = j + 10;
  select * into d from public.demandes_validation x where x.id = r.demande_id;
  return next is(r.palier || '/' || d.type_action, 'mise_en_demeure/cashd.mise_en_demeure', 'Dix jours après le rappel : la mise en demeure, préparée');
  return next ok(r.sujet like '%mise en demeure%' and tests.c2_plat(r.corps) like '%nous vous mettons en demeure de régler la somme de 3 000,00 €%'
                 and r.corps like '%articles L441-10 et D441-5%' and r.corps like '%procédure de recouvrement%',
                 'Le texte d''une mise en demeure : somme, délai, pénalités, indemnité, suite');
  return next ok(d.statut = 'en_attente' and (d.payload #>> '{exigences,commentaire}')::boolean and d.roles_autorises = array['gerant', 'admin'],
                 'Elle attend une validation explicite, commentée, de la direction (3 000 € > 2 000 €)');
  return next is((select count(*)::int from public.cashd_relances x where x.compte_id = (p ->> 'hotel')::uuid and x.jour > j + 10), 0, 'Rien après la mise en demeure');
  v_b := private.cashd_preparer_relances(v_client, j + 30, null);
  return next ok(not exists (select 1 from public.cashd_relances x where x.compte_id = (p ->> 'hotel')::uuid and x.jour = j + 30),
                 'La séquence s''arrête à la mise en demeure');

  -- ── Ce qui suspend : la pause, le litige, un règlement à lettrer, l'absence d'adresse, un interdit ──
  perform tests.endosser(v_gerant, 'gerant@banc-varelo.test');
  v_b := public.cashd_statut_compte((p ->> 'hotel')::uuid, 'pause', 'Le directeur de l''hôtel a appelé : paiement promis vendredi');
  return next is((v_b ->> 'relances_coupees')::int, 1, 'Mettre l''hôtel en pause coupe la mise en demeure prête (les relances qu''elle remplaçait l''étaient déjà)');
  return next throws_ok(format('select public.cashd_statut_compte(%L, %L, %L)', p ->> 'hotel', 'actif', ' '), '22023', null, 'La reprise exige un motif : une décision, pas un délai');
  perform public.cashd_statut_compte((p ->> 'hotel')::uuid, 'actif', 'Paiement non reçu vendredi : on reprend');
  return next ok(tests.c2_journal(v_client, 'cashd.compte_statut', p ->> 'hotel') ->> 'donnees' like '%on reprend%', 'Pause et reprise sont au journal');

  -- La mairie : sa facture échue depuis 10 jours, mais un règlement du compte n'est pas lettré.
  perform tests.redevenir_admin();
  update public.cashd_factures set echeance = j - 10, date_emission = j - 40 where id = (p ->> 'f4')::uuid;
  perform tests.endosser(v_gerant, 'gerant@banc-varelo.test');
  perform public.cashd_noter_reglement(v_client, (p ->> 'mairie')::uuid, 999, j, 'MANDAT 2026-77', 'virement');
  perform tests.redevenir_admin();
  v_b := private.cashd_preparer_relances(v_client, j + 1, null);
  return next ok(not exists (select 1 from public.cashd_relances x where x.compte_id = (p ->> 'mairie')::uuid), 'Un règlement du compte reste à lettrer : la mairie n''est pas relancée');
  perform tests.endosser(v_gerant, 'gerant@banc-varelo.test');
  v_b := public.cashd_litige((p ->> 'f4')::uuid, true, 'La mairie conteste la quantité livrée');
  perform public.cashd_annuler_reglement((select x.id from public.cashd_reglements x where x.reference = 'MANDAT 2026-77' and x.client_id = v_client), 'Mandat d''une autre facture');
  perform tests.redevenir_admin();
  v_b := private.cashd_preparer_relances(v_client, j + 2, null);
  return next ok(not exists (select 1 from public.cashd_relances x where x.compte_id = (p ->> 'mairie')::uuid), 'Une facture en litige sort du cycle');
  return next is((select s.etat_sequence from public.cashd_suivi s where s.facture_id = (p ->> 'f4')::uuid), 'litige', 'Et sa ligne le dit');

  -- Un compte sans adresse, et un interdit de l'organisation.
  perform tests.endosser(v_gerant, 'gerant@banc-varelo.test');
  v_x := public.cashd_ecrire_compte(null, v_client, '{"reference": "C-SANS", "nom": "Client sans adresse"}');
  perform public.cashd_ecrire_facture(null, v_client, jsonb_build_object('compte_id', v_x, 'numero', 'F-2026-200', 'date_emission', j - 40, 'echeance', j - 10, 'montant_ttc', 500));
  v_rel := public.cashd_ecrire_compte(null, v_client, '{"reference": "C-INTERDIT", "nom": "Client à ménager", "contact_facturation_email": "compta@menager.test"}');
  perform public.cashd_ecrire_facture(null, v_client, jsonb_build_object('compte_id', v_rel, 'numero', 'F-2026-201', 'date_emission', j - 40, 'echeance', j - 10, 'montant_ttc', 700));
  perform public.cashd_regler_relances(v_client, '{"interdits": ["oubli"]}');
  v_b := public.cashd_preparer_maintenant(v_client);
  return next is((select x.statut from public.cashd_relances x where x.compte_id = v_x and x.jour = j), 'sans_adresse', 'Sans adresse de facturation : écrite, mais elle ne part pas');
  return next ok((select x.statut = 'bloquee' and x.motif like '%oubli%' from public.cashd_relances x where x.compte_id = v_rel and x.jour = j),
                 'Un message qui contient un mot interdit par l''organisation est bloqué');

  -- ── Le devis accepté coupe sa relance ──
  select * into r from public.cashd_relances x where x.compte_id = (p ->> 'sci')::uuid and x.nature = 'devis' and x.jour = j;
  perform public.cashd_ecrire_facture((p ->> 'd1')::uuid, v_client, '{"statut": "accepte"}');
  perform tests.redevenir_admin();
  perform private.cashd_verifier_relances(v_client);
  return next is((select x.statut from public.cashd_relances x where x.id = r.id), 'coupee', 'Le devis accepté : sa relance est coupée avant l''envoi');

  -- ── Le point du matin ──
  v_items := private.cashd_point_lignes(v_client, j);
  return next ok(exists (select 1 from jsonb_array_elements(v_items) x where tests.c2_plat(x ->> 'texte') like 'Hôtel des Brotteaux doit 3 000,00 € échus%'),
                 'Le point du matin dit qui doit quoi');
  return next ok(exists (select 1 from jsonb_array_elements(v_items) x where x ->> 'texte' like '%attend%votre validation%'), 'Et ce qui attend la validation');
  -- Le passage de 7 h (le lendemain) : une fois par jour, jamais avant l'heure.
  return next is(private.cashd_passage(((j + 1)::timestamp + time '06:50') at time zone 'Europe/Paris'), 0, 'Avant 7 h, rien');
  v_n := private.cashd_passage(((j + 1)::timestamp + time '07:05') at time zone 'Europe/Paris');
  return next ok(v_n >= 1 and exists (select 1 from public.cashd_passages x where x.client_id = v_client and x.jour = j + 1), 'Le passage de 7 h a lieu');
  return next is(private.cashd_passage(((j + 1)::timestamp + time '07:20') at time zone 'Europe/Paris'), 0, 'Il ne se refait pas le même jour');
  return next ok(tests.c2_journal(v_client, 'cashd.relance_preparee') is not null and tests.c2_journal(v_client, 'cashd.relance_coupee') is not null,
                 'Préparations et coupures sont au journal');
end $f$;
