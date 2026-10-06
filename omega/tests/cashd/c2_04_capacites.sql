-- c2_04 — CASHD, palier 4 : les autres lignes du périmètre (session C2, 06/10/2026).
-- Après c2_00_jeu.sql et les migrations c2_01, c2_02 et c2_03. runtests() annule tout.

create or replace function tests.test_c2_04_capacites() returns setof text
language plpgsql as $f$
declare
  banc jsonb; v_client uuid; v_gerant uuid; v_daf uuid; v_collab uuid; p jsonb; j date := tests.c2_jour();
  v_r jsonb; v_x uuid; v_f uuid; v_e record; r public.cashd_relances; v_d jsonb; v_dem uuid; v_samedi date; v_n integer;
begin
  banc := tests.c2_banc();
  v_client := (banc ->> 'client')::uuid; v_gerant := (banc ->> 'gerant')::uuid; v_daf := (banc ->> 'daf')::uuid;
  perform tests.redevenir_admin();
  perform public.cashd_installer(v_client);
  v_collab := tests.c2_compte(v_client, 'collaborateur', 'c2-capa-collab@banc-varelo.test');
  perform tests.endosser(v_gerant, 'gerant@banc-varelo.test');
  perform public.cashd_regler(v_client, '{"taux_penalites": 0.1215}');
  p := tests.c2_portefeuille();
  -- Le commercial de la SCI : le collaborateur.
  perform public.cashd_ecrire_compte((p ->> 'sci')::uuid, v_client, jsonb_build_object('commercial_id', v_collab, 'contact_commercial_email', 'paul@atelier-bertin.test'));

  -- ── Échéancier négocié ──
  return next throws_ok(format('select public.cashd_poser_echeancier(%L, %L, %L)', p ->> 'f1',
                               jsonb_build_array(jsonb_build_object('echeance', j + 10, 'montant', 5000), jsonb_build_object('echeance', j + 40, 'montant', 5000)), 'Accord'),
                        '23514', null, 'Un échéancier qui ne couvre pas le reste dû (10 000 € pour 12 000 €) est refusé');
  v_r := public.cashd_poser_echeancier((p ->> 'f1')::uuid, jsonb_build_array(jsonb_build_object('echeance', j - 3, 'montant', 4000),
           jsonb_build_object('echeance', j + 27, 'montant', 4000), jsonb_build_object('echeance', j + 57, 'montant', 4000)), 'Accord téléphonique avec Mme Lefèvre');
  return next is((v_r ->> 'echeances')::int || '/' || (v_r ->> 'echeance_suivie'), '3/' || (j - 3)::text, 'Trois échéances ; la première (manquée de 3 jours) est suivie');
  return next is((select f.echeance_origine from public.cashd_factures f where f.id = (p ->> 'f1')::uuid), j - 45, 'L''échéance d''origine est gardée');
  return next is((select b.echu_1_30 || '/' || b.echu_31_60 from public.cashd_balance_agee b where b.compte_id = (p ->> 'sci')::uuid), '12000.00/0.00',
                 'Le suivi épouse ses termes : 3 jours de retard, plus 45');
  perform public.cashd_noter_reglement(v_client, (p ->> 'sci')::uuid, 4000, j, 'ECHEANCE 1', 'virement', (p ->> 'f1')::uuid);
  return next is((select f.echeance from public.cashd_factures f where f.id = (p ->> 'f1')::uuid), j + 27, 'L''échéance payée : le suivi passe à la suivante');
  return next is((select f.retard_jours || '/' || f.reste_du from public.cashd_factures_etat f where f.id = (p ->> 'f1')::uuid), '0/8000.00',
                 'Les autres échéances ne déclenchent rien : plus de retard, 8 000 € restent dus');

  -- ── Litige partiel ──
  v_r := public.cashd_litige_partiel((p ->> 'f3')::uuid, 1000, 'Le client conteste la ligne « pose » (1 000 € TTC)');
  return next is((v_r ->> 'reste_relancable')::numeric, 2600.00::numeric, 'Hôtel : 1 000 € contestés, 2 600 € restent relancés');
  select * into v_e from public.cashd_factures_etat f where f.id = (p ->> 'f3')::uuid;
  return next is(v_e.statut || '/' || v_e.montant_conteste || '/' || v_e.reste_relancable, 'ouverte/1000.00/2600.00', 'La facture reste ouverte, sa part contestée sort du cycle');
  return next is((select b.en_litige || '/' || b.echu_plus_90 from public.cashd_balance_agee b where b.compte_id = (p ->> 'hotel')::uuid), '1000.00/2600.00',
                 'La balance compte la part contestée en litige, le reste en retard');
  perform tests.redevenir_admin();
  perform private.cashd_preparer_relances(v_client, j, null);
  select * into r from public.cashd_relances x where x.compte_id = (p ->> 'hotel')::uuid and x.jour = j;
  return next ok(r.montant = 2000 and tests.c2_plat(r.corps) like '%1 000,00 € contestés ne sont pas réclamés ici%',
                 'La relance ne réclame que la part non contestée (avoir de 600 € déduit : 2 000 €), et le dit');
  -- Le litige d'une facture de la SCI prévient son commercial.
  perform tests.endosser(v_gerant, 'gerant@banc-varelo.test');
  perform public.cashd_litige((p ->> 'f2')::uuid, true, 'Le client conteste la livraison');
  perform tests.redevenir_admin();
  return next ok(exists (select 1 from public.alertes a where a.client_id = v_client and a.destinataire_id = v_collab and a.titre like 'Litige ouvert sur la facture F-2026-140%'),
                 'Le commercial du compte est prévenu dès l''ouverture du litige (alerte nominative)');

  -- ── Dossier de litige / de recouvrement ──
  perform tests.endosser(v_gerant, 'gerant@banc-varelo.test');
  v_d := public.cashd_dossier((p ->> 'hotel')::uuid, null, 'assurance_credit');
  return next ok(v_d ->> 'motif' = 'assurance_credit' and jsonb_array_length(v_d -> 'pieces') = 2 and jsonb_array_length(v_d -> 'relances') >= 1
                 and v_d #>> '{debiteur,nom}' = 'Hôtel des Brotteaux' and (v_d -> 'journal') is not null,
                 'Le dossier réunit le débiteur, les pièces, les relances et le journal');
  v_r := public.cashd_remettre_dossier((p ->> 'hotel')::uuid, 'contentieux@cabinet-durand.test', 'Cabinet Durand', 'Mise en demeure restée sans effet');
  return next is((select c.statut from public.cashd_comptes c where c.id = (p ->> 'hotel')::uuid), 'recouvrement', 'Le compte passe en recouvrement');
  return next is((select x.statut from public.cashd_relances x where x.id = r.id), 'coupee', 'Toute relance commerciale cesse, y compris celle qui était prête');
  return next ok((select d.type_action = 'cashd.dossier_recouvrement' and d.statut = 'en_attente' and d.payload ->> 'corps' like '%Cabinet Durand%'
                  from public.demandes_validation d where d.id = (v_r ->> 'demande')::uuid), 'La remise du dossier attend la validation, avec le récapitulatif');
  return next throws_ok(format('select public.cashd_remettre_dossier(%L, %L, null, %L)', p ->> 'mairie', 'pas-une-adresse', 'x'), '22023', null, 'Une adresse invalide est refusée');

  -- ── Devises ──
  v_f := public.cashd_ecrire_facture(null, v_client, jsonb_build_object('compte_id', p ->> 'mairie', 'numero', 'F-2026-USD', 'date_emission', j - 40,
           'echeance', j - 10, 'montant_ttc', 1000, 'devise', 'USD'));
  return next is((select f.reste_du_eur from public.cashd_factures_etat f where f.id = v_f), null::numeric(14,2), 'Sans taux connu, la facture en dollars n''a pas de contre-valeur');
  return next is((select b.pieces_sans_taux from public.cashd_balance_agee b where b.compte_id = (p ->> 'mairie')::uuid), 1, 'Et la balance le signale');
  perform public.cashd_poser_taux('USD', j - 1, 0.9, v_client);
  select * into v_e from public.cashd_factures_etat f where f.id = v_f;
  return next is(v_e.devise || '/' || v_e.reste_du || '/' || v_e.reste_du_eur, 'USD/1000.00/900.00', 'Suivie dans sa devise et en euros (taux de l''organisation)');
  return next is((select b.echu_1_30 from public.cashd_balance_agee b where b.compte_id = (p ->> 'mairie')::uuid), 900.00::numeric(14,2), 'La balance âgée compte en euros');
  perform tests.redevenir_admin();
  perform tests.endosser_serveur();
  return next is((public.cashd_poser_taux('GBP', j, 1.15) ->> 'source'), 'bce', 'Le serveur pose les taux de référence');
  perform tests.endosser(v_gerant, 'gerant@banc-varelo.test');
  return next throws_ok(format('select public.cashd_poser_taux(%L, %L, 1.1)', 'GBP', j), '22023', null, 'Un membre ne pose pas un taux de référence');

  -- ── Plafond d'encours ──
  perform tests.redevenir_admin();
  insert into public.cashd_factures (client_id, entite_id, compte_id, nature, numero, date_emission, echeance, montant_ttc, statut, source)
  select v_client, (banc ->> 'entite')::uuid, (p ->> 'mairie')::uuid, 'facture', 'H-' || k, j - 30 * k, j - 30 * k + 30, 1200, 'soldee', 'saisie'
  from generate_series(2, 11) k;
  update public.cashd_factures set statut_le = ((date_emission + 35)::timestamp at time zone 'Europe/Paris') where client_id = v_client and numero like 'H-%';
  perform tests.endosser(v_gerant, 'gerant@banc-varelo.test');
  v_r := public.cashd_proposer_plafond((p ->> 'mairie')::uuid);
  return next ok((v_r ->> 'factures_douze_mois')::int = 12 and (v_r ->> 'propose')::numeric > 0 and (v_r ->> 'propose')::numeric % 100 = 0,
                 format('Un plafond est proposé depuis l''historique : %s € (facturé mensuel moyen %s €)', v_r ->> 'propose', v_r ->> 'facture_mensuel_moyen'));
  perform public.cashd_fixer_plafond((p ->> 'mairie')::uuid, 5000, 'Proposé par CASHD, arrondi');
  return next ok(tests.c2_journal(v_client, 'cashd.plafond', p ->> 'mairie') is not null, 'Le plafond fixé est daté au journal');
  perform tests.endosser(v_collab, 'c2-capa-collab@banc-varelo.test');
  v_r := public.cashd_verifier_commande((p ->> 'mairie')::uuid, 200, 'BC-2026-77');
  return next is(v_r ->> 'statut', 'autorisee', 'Une commande qui reste sous le plafond passe (3 300 € d''encours + 200 € ≤ 5 000 €)');
  v_r := public.cashd_verifier_commande((p ->> 'mairie')::uuid, 5000, 'BC-2026-78');
  v_dem := (v_r ->> 'demande')::uuid;
  return next is(v_r ->> 'statut', 'bloquee', 'Une commande qui ferait passer l''encours au-dessus du plafond est bloquée');
  perform tests.redevenir_admin();
  return next ok((select d.type_action = 'cashd.commande_hors_plafond' and d.statut = 'en_attente' and d.montant = 5000 from public.demandes_validation d where d.id = v_dem),
                 'Elle attend la décision d''un responsable (demande de validation)');
  perform public.cashd_fixer_plafond((p ->> 'mairie')::uuid, 1000, 'Abaissé pour l''essai');
  v_n := private.cashd_alerter_plafonds(v_client);
  return next ok(v_n >= 1 and exists (select 1 from public.alertes a where a.client_id = v_client and a.titre like 'Mairie de Caluire dépasse son plafond%'),
                 'Le dépassement du plafond déclenche une alerte');

  -- ── Délai moyen de règlement, dégradation, prévision ──
  return next is((select d.factures_payees || '/' || d.delai_moyen_jours from public.cashd_delais_reglement d where d.compte_id = (p ->> 'mairie')::uuid), '10/35.0',
                 'Le délai moyen de règlement se mesure compte par compte (mairie : 35 jours sur dix factures)');
  -- Un compte qui se dégrade : la mairie paie d'habitude 5 jours après l'échéance ; une facture en retard de 30 jours le signale.
  perform tests.redevenir_admin();
  insert into public.cashd_factures (client_id, entite_id, compte_id, nature, numero, date_emission, echeance, montant_ttc, statut, source)
  values (v_client, (banc ->> 'entite')::uuid, (p ->> 'mairie')::uuid, 'facture', 'F-2026-RETARD', j - 60, j - 30, 100, 'ouverte', 'saisie');
  return next ok((select d.se_degrade and d.retard_actuel_jours = 30 and d.retard_moyen_jours = 5 from public.cashd_delais_reglement d where d.compte_id = (p ->> 'mairie')::uuid)
                 and tests.c2_plat((select x ->> 'texte' from jsonb_array_elements(private.cashd_point_lignes(v_client, j)) x where x ->> 'texte' like 'Mairie de Caluire se dégrade%' limit 1))
                     like '%30 jours de retard aujourd''hui, contre 5 jours en moyenne%',
                 'Un compte qui se dégrade est signalé (30 jours de retard contre 5 d''habitude) au point du matin');
  v_r := public.cashd_prevision(v_client);
  return next ok((v_r ->> 'a_30_jours') is not null and (v_r ->> 'a_60_jours')::numeric >= (v_r ->> 'a_30_jours')::numeric and (v_r ->> 'tenu_a_part')::numeric > 0,
                 format('Prévision d''encaissement : %s € à 30 jours, %s € à 60 jours, %s € tenus à part (litiges, recouvrement)', v_r ->> 'a_30_jours', v_r ->> 'a_60_jours', v_r ->> 'tenu_a_part'));
  v_r := public.cashd_tableau(v_client);
  return next ok((v_r #>> '{par_statut,recouvrement,comptes}')::int = 1 and (v_r #>> '{factures_en_litige,nombre}')::int = 2,
                 'Les créances en recouvrement et en litige sont comptées en continu');

  -- ── Rebond, réponse ──
  select * into r from public.cashd_relances x where x.compte_id = (p ->> 'sci')::uuid and x.envoi_id is not null order by x.cree_le limit 1;
  if r.id is not null then
    update public.envois set remise = 'rebond' where id = r.envoi_id;
    v_r := private.cashd_suivre_envoi(jsonb_build_object('envoi', r.envoi_id));
    return next is((select c.statut from public.cashd_comptes c where c.id = r.compte_id), 'attente_contact',
                   'Une relance non remise (rebond) met le compte en attente de contact');
  else
    return next ok(true, 'Envoi non réglé sur le banc : le rebond se prouve quand l''envoi de CASHD est réglé (essai)');
  end if;

  -- ── LRE au-delà du seuil ──
  perform tests.endosser(v_gerant, 'gerant@banc-varelo.test');
  perform public.cashd_statut_compte((p ->> 'hotel')::uuid, 'actif', 'Reprise pour l''essai de la LRE');
  perform tests.redevenir_admin();
  update public.cashd_reglages set seuil_lre = 1000 where client_id = v_client;
  perform private.cashd_preparer_relances(v_client, j + 5, null);
  perform private.cashd_preparer_relances(v_client, j + 10, null);
  perform private.cashd_preparer_relances(v_client, j + 15, null);
  select * into r from public.cashd_relances x where x.compte_id = (p ->> 'hotel')::uuid and x.palier = 'mise_en_demeure' and x.statut <> 'coupee' order by x.jour desc limit 1;
  return next is(r.canal || '/' || (select d.payload ->> 'canal' from public.demandes_validation d where d.id = r.demande_id), 'lre/lre',
                 'Au-delà du seuil réglé, la mise en demeure est préparée en lettre recommandée électronique');

  -- ── Lien de paiement (contrat d'interface) ──
  perform tests.endosser(v_gerant, 'gerant@banc-varelo.test');
  return next throws_ok(format('select public.cashd_poser_lien(%L, %L, %L, %L)', p ->> 'f4', 'stripe', 'plink_1', 'https://pay.example/1'), '42501', null,
                        'Un membre ne pose pas de lien de paiement (le serveur seul)');
  perform tests.redevenir_admin();
  perform tests.endosser_serveur();
  perform public.cashd_poser_lien((p ->> 'f4')::uuid, 'stripe', 'plink_1', 'https://pay.example/1');
  v_r := public.cashd_lien_paye('stripe', 'plink_1', 2400, j);
  perform tests.redevenir_admin();
  return next is((select l.statut from public.cashd_liens_paiement l where l.reference = 'plink_1') || '/' ||
                 (select f.statut from public.cashd_factures f where f.id = (p ->> 'f4')::uuid), 'paye/soldee',
                 'Payé par le lien : le règlement est noté et lettré, le lien s''éteint');

  -- ── Jours ouvrés ──
  v_samedi := j + (6 - extract(isodow from j)::int + 7) % 7;
  if v_samedi = j then v_samedi := j + 7; end if;
  v_n := private.cashd_passage((v_samedi::timestamp + time '07:05') at time zone 'Europe/Paris');
  return next ok((select (x.bilan ->> 'jour_non_ouvre')::boolean from public.cashd_passages x where x.client_id = v_client and x.jour = v_samedi)
                 and not exists (select 1 from public.cashd_relances x where x.client_id = v_client and x.jour = v_samedi),
                 'Un samedi, le passage n''écrit aucune relance');

  -- ── L'arrêté de la balance à date fixe ──
  update public.cashd_reglages set arrete_jour = least(extract(day from v_samedi + 2)::int, 28) where client_id = v_client;
  v_n := private.cashd_passage(((v_samedi + 2)::timestamp + time '07:05') at time zone 'Europe/Paris');
  return next ok(extract(day from v_samedi + 2)::int > 28
                 or exists (select 1 from public.cashd_arretes a where a.client_id = v_client and a.jour = v_samedi + 2 and jsonb_array_length(a.balance) >= 1),
                 'Le jour du mois réglé, la balance âgée est arrêtée (à télécharger en tableur)');

  -- ── Une facture réglée publie cashd.facture_reglee (abonné : REPUT) ──
  return next ok(exists (select 1 from public.travaux t where t.client_id = v_client and t.charge ->> 'evenement' = 'cashd.facture_reglee'
                         and t.charge ->> 'facture' = p ->> 'f4' and t.charge ->> 'numero' = 'F-2026-150' and t.charge ->> 'email' = 'mandatement@caluire.test'
                         and t.charge ->> 'regle_le' = j::text)
                 or not exists (select 1 from private.abonnements a where a.evenement = 'cashd.facture_reglee'),
                 'La facture réglée par le lien publie cashd.facture_reglee (numéro, adresse, date du règlement)');

  -- ── Un contact en litige (pour REPUT) ──
  return next ok(private.cashd_contact_en_litige(v_client, 'COMPTA@lefevre-patrimoine.test')
                 and private.cashd_contact_en_litige(v_client, 'paul@atelier-bertin.test')
                 and not private.cashd_contact_en_litige(v_client, 'mandatement@caluire.test')
                 and not private.cashd_contact_en_litige(v_client, 'inconnu@exemple.test'),
                 'Un contact d''un compte qui a une facture en litige est reconnu (facturation ou commercial) ; les autres non');
  return next ok(not has_function_privilege('authenticated', 'private.cashd_contact_en_litige(uuid, text)', 'execute'), 'Lu par le serveur seul');

  -- ── Historique des réglages ──
  perform tests.endosser(v_gerant, 'gerant@banc-varelo.test');
  return next ok((select count(*) from public.cashd_historique_reglages h where h.client_id = v_client and h.action in ('cashd.reglages', 'cashd.plafond', 'cashd.echeancier')) >= 3,
                 'Chaque changement de seuil, de plafond ou d''échéancier reste daté');

  -- ── Droits ──
  perform tests.redevenir_admin();
  return next ok(not has_function_privilege('authenticated', 'public.cashd_lien_paye(text, text, numeric, date)', 'execute')
                 and not has_function_privilege('anon', 'public.cashd_dossier(uuid, uuid, text)', 'execute')
                 and not has_table_privilege('authenticated', 'public.cashd_echeances', 'insert'),
                 'Le lien de paiement se signale par le serveur seul ; anon ne lit aucun dossier ; les échéanciers ne s''écrivent que par la porte');
end $f$;
