-- CASHD — c2_05 : les textes de l'organisation (gabarits, variantes, ton, moyens de règlement, métier), le seuil par
-- entité et les soldes décidés, l'accord oral sur un devis, la facture qui attend un bon de commande.
-- Sur le banc (client cccccccc-0000-4000-8000-00000000000c), dans une transaction annulée.

create or replace function tests.test_c2_05_textes() returns setof text
language plpgsql as $f$
declare
  banc jsonb; v_client uuid; v_gerant uuid; v_collab uuid; v_entite uuid; p jsonb; j date := tests.c2_jour();
  v_r jsonb; r1 public.cashd_relances; r2 public.cashd_relances; r3 public.cashd_relances; v_fbc uuid; v_n integer; v_t text;
begin
  banc := tests.c2_banc();
  v_client := (banc ->> 'client')::uuid; v_gerant := (banc ->> 'gerant')::uuid; v_entite := (banc ->> 'entite')::uuid;
  perform tests.redevenir_admin();
  perform public.cashd_installer(v_client);
  v_collab := tests.c2_compte(v_client, 'collaborateur', 'c2-textes-collab@banc-varelo.test');
  perform tests.endosser(v_gerant, 'gerant@banc-varelo.test');
  p := tests.c2_portefeuille();

  -- ── Les gardes ──
  return next throws_ok(format('select public.cashd_ecrire_gabarit(%L, %L, %L, 1, %L, %L)', v_client, 'rappel', 'fr', 'Objet', 'Corps {lignes} {inconnue}'),
                        '22023', null, 'Une variable inconnue est refusée');
  return next throws_ok(format('select public.cashd_ecrire_gabarit(%L, %L, %L, 1, %L, %L)', v_client, 'relance', 'fr', 'Objet', 'Corps {lignes}'),
                        '22023', null, 'Une relance sans {total} est refusée');
  return next throws_ok(format('select public.cashd_ecrire_gabarit(%L, %L, %L, 2, %L, %L)', v_client, 'mise_en_demeure', 'fr', 'Objet', '{lignes} {total} {limite}'),
                        '22023', null, 'La mise en demeure garde un texte unique (pas de variante 2)');
  perform tests.endosser(v_collab, 'c2-textes-collab@banc-varelo.test');
  return next throws_ok(format('select public.cashd_ecrire_gabarit(%L, %L, %L, 1, %L, %L)', v_client, 'rappel', 'fr', 'Objet', '{lignes}'),
                        '42501', null, 'Un collaborateur n''écrit pas les textes de l''organisation');
  v_r := public.cashd_gabarits(v_client);
  return next ok(jsonb_array_length(v_r -> 'gabarits') = 22 and not exists (select 1 from jsonb_array_elements(v_r -> 'gabarits') x where (x ->> 'personnalise')::boolean)
                 and (v_r -> 'variables') ? 'lignes',
                 'Il lit les textes par défaut : 11 par langue (deux variantes par palier, jour d''échéance compris depuis c2_14 ; une pour la mise en demeure), et leurs variables');
  perform tests.endosser(v_gerant, 'gerant@banc-varelo.test');
  perform tests.redevenir_admin();
  return next ok(not has_function_privilege('authenticated', 'private.cashd_relancer_commandes(uuid, date)', 'execute')
                 and not has_function_privilege('authenticated', 'private.cashd_gabarit_defaut(text, text, integer)', 'execute')
                 and has_function_privilege('authenticated', 'public.cashd_ecrire_gabarit(uuid, text, text, integer, text, text, boolean)', 'execute'),
                 'Les fonctions privées restent fermées ; les portes s''ouvrent aux membres');

  -- ── Les réglages : métier, seuil de l'entité, bon de commande attendu ──
  perform tests.endosser(v_gerant, 'gerant@banc-varelo.test');
  perform public.cashd_regler_relances(v_client, '{"metier": "btp"}');
  return next throws_ok(format('select public.cashd_regler_relances(%L, %L)', v_client, '{"metier": "boulangerie"}'), '23514', null, 'Un métier inconnu est refusé');
  perform public.cashd_regler_entite(v_entite, 5000);
  v_fbc := public.cashd_ecrire_facture(null, v_client, jsonb_build_object('compte_id', p ->> 'mairie', 'numero', 'F-2026-BC', 'date_emission', j - 40,
             'echeance', j - 10, 'montant_ttc', 2400));
  return next throws_ok(format('select public.cashd_attendre_commande(%L, %L, %L, %L)', v_fbc, 'pas-une-adresse', 'Achats', 'bon attendu'), '22023', null,
                        'L''adresse du service qui émet le bon se vérifie');
  return next throws_ok(format('select public.cashd_attendre_commande(%L, %L, %L, %L)', v_fbc, 'achats@caluire.test', 'Achats', ' '), '22023', null,
                        'Le motif de blocage se consigne');
  perform public.cashd_attendre_commande(v_fbc, 'achats@caluire.test', 'Service des achats', 'bon de commande n° à émettre par le service des achats');
  return next ok(exists (select 1 from jsonb_array_elements(public.cashd_fiche_compte((p ->> 'mairie')::uuid) -> 'pieces') x
                         where x ->> 'numero' = 'F-2026-BC' and x ->> 'attente_commande_email' = 'achats@caluire.test' and x ->> 'attente_commande_le' is not null),
                 'La fiche du compte montre la facture qui attend son bon, et à qui il est demandé');

  -- ── Premier passage (j+1) ──
  perform tests.redevenir_admin();
  perform private.cashd_preparer_relances(v_client, j + 1, null);
  select * into r1 from public.cashd_relances x where x.compte_id = (p ->> 'sci')::uuid and x.jour = j + 1 and x.nature = 'facture';
  return next ok(r1.gabarit = 'rappel' and r1.variante = 1 and r1.corps like '%Sauf erreur de notre part%' and r1.corps not like '%{%',
                 'Le premier rappel de la SCI prend la variante 1 du texte par défaut, toutes variables remplies');
  return next ok(not exists (select 1 from public.cashd_relances x where x.compte_id = (p ->> 'hotel')::uuid and x.jour = j + 1),
                 'Le seuil de l''entité (5 000 €) laisse l''hôtel (3 000 € après avoir) hors relance');
  return next ok(not exists (select 1 from public.cashd_relances_pieces x join public.cashd_relances y on y.id = x.relance_id where x.facture_id = v_fbc),
                 'La facture qui attend un bon de commande sort de la relance adressée à la comptabilité de la mairie');
  select * into r3 from public.cashd_relances x where x.compte_id = (p ->> 'sci')::uuid and x.jour = j + 1 and x.nature = 'devis';
  return next ok(r3.corps like '%date d''intervention%' and r3.corps not ilike '%relance%' and r3.sujet not ilike '%relance%',
                 'Au métier du bâtiment, la relance de devis parle chantier et date d''intervention, sans jamais le mot « relance »');

  -- ── La relance du bon de commande ──
  v_n := private.cashd_relancer_commandes(v_client, j + 1);
  return next ok(v_n = 1 and exists (select 1 from public.cashd_relances_commande x join public.demandes_validation d on d.id = x.demande_id
                                     where x.facture_id = v_fbc and x.destinataire_adresse = 'achats@caluire.test' and d.type_action = 'cashd.bon_commande'
                                       and d.statut = 'en_attente' and x.sujet like '%bon de commande attendu pour la facture F-2026-BC%'),
                 'Le service des achats reçoit sa relance, par la file de validation');
  return next ok(private.cashd_relancer_commandes(v_client, j + 3) = 0 and private.cashd_relancer_commandes(v_client, j + 9) = 1,
                 'Elle revient tous les sept jours, pas avant');
  return next ok(tests.c2_plat((select string_agg(x ->> 'texte', ' | ') from jsonb_array_elements(private.cashd_point_lignes(v_client, j + 9)) x))
                 like '%Facture F-2026-BC de Mairie de Caluire : attend un bon de commande depuis le%Service des achats%jours de retard%',
                 'Le point du matin dit la facture qui attend son bon, et son retard qui court');
  perform tests.endosser(v_gerant, 'gerant@banc-varelo.test');
  v_r := public.cashd_attendre_commande(v_fbc, null, null, null);
  perform tests.redevenir_admin();
  return next ok((v_r ->> 'relances_coupees')::int = 2
                 and not exists (select 1 from public.cashd_relances_commande x where x.facture_id = v_fbc and x.statut <> 'coupee')
                 and (select f.attente_commande_le from public.cashd_factures f where f.id = v_fbc) is null,
                 'Le bon reçu : les deux relances du service encore en attente tombent, la facture reprend son cycle');

  -- ── Les variantes ──
  perform private.cashd_couper(v_client, (p ->> 'sci')::uuid, null, 'essai des variantes', true, 'facture');
  perform private.cashd_preparer_relances(v_client, j + 2, null);
  select * into r2 from public.cashd_relances x where x.compte_id = (p ->> 'sci')::uuid and x.jour = j + 2 and x.nature = 'facture';
  return next ok(r2.gabarit = 'rappel' and r2.variante = 2 and r2.corps like '%Nous revenons vers vous%' and r2.corps <> r1.corps and r2.sujet <> r1.sujet,
                 'Le rappel suivant du même compte prend l''autre variante : jamais deux fois le même texte');

  -- ── Le gabarit de l'organisation ──
  perform tests.endosser(v_gerant, 'gerant@banc-varelo.test');
  perform public.cashd_ecrire_gabarit(v_client, 'rappel', 'fr', 1, '{emetteur} : {objet} ({total})',
    E'{bonjour}\n\nPetit mot de l''atelier : {dues} sur le compte {compte}.\n{lignes}\nMerci d''avance,\n{reglement}');
  perform tests.redevenir_admin();
  perform private.cashd_couper(v_client, (p ->> 'sci')::uuid, null, 'essai du gabarit', true, 'facture');
  perform private.cashd_preparer_relances(v_client, j + 3, null);
  select * into r3 from public.cashd_relances x where x.compte_id = (p ->> 'sci')::uuid and x.jour = j + 3 and x.nature = 'facture';
  v_t := tests.c2_plat(r3.sujet || ' / ' || r3.corps);
  return next ok(r3.variante = 1 and v_t like '%Petit mot de l''atelier : la somme suivante reste due sur le compte C-LEFEVRE%'
                 and v_t like '%F-2026-101%' and v_t like '%: facture F-2026-101 échue (12 000,00 €)%' and v_t not like '%{%',
                 'Le texte de l''organisation remplace celui par défaut, ses variables remplies');
  return next ok(exists (select 1 from public.cashd_historique_reglages h where h.client_id = v_client and h.action = 'cashd.gabarit')
                 and exists (select 1 from public.cashd_historique_reglages h where h.client_id = v_client and h.action = 'cashd.reglages_entite'),
                 'Chaque changement de texte et de seuil reste daté');

  -- ── Le ton suit le montant ; les moyens de règlement, l'échelonnement ──
  perform tests.endosser(v_gerant, 'gerant@banc-varelo.test');
  perform public.cashd_ecrire_gabarit(v_client, 'rappel', 'fr', 1, 'x', 'x', false);
  perform public.cashd_regler_relances(v_client, '{"seuil_ton": 10000, "moyens_reglement": "par virement sur le compte FR76 3000 4000 0300 0000 0000 000", "echelonnement_des": 5000}');
  perform tests.redevenir_admin();
  perform private.cashd_couper(v_client, (p ->> 'sci')::uuid, null, 'essai du ton', true, 'facture');
  perform private.cashd_preparer_relances(v_client, j + 4, null);
  select * into r3 from public.cashd_relances x where x.compte_id = (p ->> 'sci')::uuid and x.jour = j + 4 and x.nature = 'facture';
  return next ok(r3.corps like '%Compte tenu du montant en jeu%' and r3.corps not like '%simple oubli%'
                 and r3.corps like '%Vous pouvez régler par virement sur le compte FR76%' and r3.corps like '%en plusieurs fois%',
                 'Au-delà de 10 000 €, la relance demande la date de règlement ; elle donne les moyens de régler et propose un échéancier');

  -- ── Une autre langue : l'organisation écrit ses textes en allemand pour un compte allemand ──
  perform tests.endosser(v_gerant, 'gerant@banc-varelo.test');
  v_r := jsonb_build_object('compte', public.cashd_ecrire_compte(null, v_client, jsonb_build_object('reference', 'C-BERLIN', 'nom', 'Holzbau Berlin GmbH',
           'langue', 'de', 'contact_facturation_email', 'buchhaltung@holzbau.test')));
  perform public.cashd_ecrire_facture(null, v_client, jsonb_build_object('compte_id', v_r ->> 'compte', 'numero', 'F-2026-DE1', 'date_emission', j - 50,
             'echeance', j - 20, 'montant_ttc', 9000));
  perform public.cashd_ecrire_gabarit(v_client, 'rappel', 'de', 1, '{emetteur} — Zahlungserinnerung: {numero}',
    E'Sehr geehrte Damen und Herren,\n\nfolgender Betrag ist noch offen ({compte}):\n{lignes}\nGesamt: {total}.\n');
  perform tests.redevenir_admin();
  perform private.cashd_preparer_relances(v_client, j + 4, null);
  select * into r3 from public.cashd_relances x where x.compte_id = (v_r ->> 'compte')::uuid and x.jour = j + 4;
  return next ok(r3.sujet like '%Zahlungserinnerung: F-2026-DE1%' and r3.corps like '%folgender Betrag ist noch offen (C-BERLIN)%' and r3.corps like '%F-2026-DE1%',
                 'Un compte allemand reçoit le texte que l''organisation a écrit en allemand');

  -- ── Les petits soldes décidés ──
  perform tests.endosser(v_gerant, 'gerant@banc-varelo.test');
  return next throws_ok(format('select public.cashd_decider_solde(%L, %L, %L)', p ->> 'f3', 'reclame', ''), '22023', null, 'Une décision sur un solde se motive');
  perform public.cashd_decider_solde((p ->> 'f3')::uuid, 'reclame', 'Le client nous doit cette somme depuis quatre mois');
  perform tests.redevenir_admin();
  perform private.cashd_preparer_relances(v_client, j + 5, null);
  return next ok(exists (select 1 from public.cashd_relances x where x.compte_id = (p ->> 'hotel')::uuid and x.jour = j + 5 and x.statut <> 'coupee'),
                 'Réclamé, le solde sous le seuil est relancé');
  perform tests.endosser(v_gerant, 'gerant@banc-varelo.test');
  v_r := public.cashd_decider_solde((p ->> 'f3')::uuid, 'abandonne', 'Montant trop faible pour le poursuivre');
  perform tests.redevenir_admin();
  perform private.cashd_preparer_relances(v_client, j + 6, null);
  return next ok((v_r ->> 'relances_coupees')::int = 1
                 and not exists (select 1 from public.cashd_relances x where x.compte_id = (p ->> 'hotel')::uuid and x.statut not in ('coupee'))
                 and exists (select 1 from public.cashd_factures_etat e where e.id = (p ->> 'f3')::uuid and e.reste_du > 0),
                 'Abandonné, il sort de toute relance et reste lisible dans l''encours');

  -- ── L'accord oral sur un devis ──
  perform tests.endosser(v_gerant, 'gerant@banc-varelo.test');
  return next throws_ok(format('select public.cashd_consigner_accord(%L, %L, %L)', p ->> 'd1', 'Accord au téléphone', j - 30), '22023', null,
                        'Un accord ne peut pas précéder l''envoi du devis');
  v_r := public.cashd_consigner_accord((p ->> 'd1')::uuid, 'Accord de M. Lefèvre au téléphone, chantier en novembre', j - 2);
  perform tests.redevenir_admin();
  return next ok(v_r ->> 'statut' = 'accepte' and (v_r ->> 'relances_coupees')::int >= 1
                 and not exists (select 1 from public.cashd_relances x where x.compte_id = (p ->> 'sci')::uuid and x.nature = 'devis'
                                 and x.statut in ('a_valider', 'non_reglee', 'preparee')),
                 'L''accord consigné arrête la cadence du devis, y compris la relance déjà rédigée');
  return next ok(tests.c2_plat((select string_agg(x ->> 'texte', ' | ') from jsonb_array_elements(private.cashd_point_lignes(v_client, j + 20)) x))
                 like '%Devis D-2026-033 de SCI Lefèvre Patrimoine%accepté de vive voix le%rien n''est encore facturé%',
                 'Quinze jours après, le point du matin signale l''accord qui n''a donné aucune facture');
  perform tests.endosser(v_gerant, 'gerant@banc-varelo.test');
  perform public.cashd_ecrire_facture(null, v_client, jsonb_build_object('compte_id', p ->> 'sci', 'numero', 'F-2026-200', 'date_emission', j, 'montant_ttc', 4800));
  perform tests.redevenir_admin();
  return next ok(coalesce(tests.c2_plat((select string_agg(x ->> 'texte', ' | ') from jsonb_array_elements(private.cashd_point_lignes(v_client, j + 20)) x)), '')
                 not like '%vive voix%',
                 'La facture émise, le signal tombe');
end $f$;
