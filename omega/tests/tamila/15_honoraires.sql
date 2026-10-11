-- 15 — Les honoraires du dossier (migration b4_06) : convention, temps passé, provisions, facture, compte
-- détaillé définitif. Après 00_jeu_tamila.sql et b4_01 à b4_06. runtests() annule tout.

create or replace function tests.test_b4_15_honoraires() returns setof text
language plpgsql as $f$
declare
  jeu jsonb; v_client uuid; v_dossier uuid; v_conv uuid; v_conv2 uuid; v_piece uuid; v_prov uuid; v_t1 uuid; v_t2 uuid; v_t3 uuid;
  r jsonb; v_f public.tamila_factures; v_annee text := extract(year from (now() at time zone 'Europe/Paris'))::text;
  v_auj date := (now() at time zone 'Europe/Paris')::date; n bigint;
begin
  jeu := tests.tamila_scene();
  v_client := (jeu ->> 'client')::uuid;
  v_dossier := (jeu ->> 'dossier')::uuid;
  v_piece := tests.tamila_piece(jeu, 'convention-signee.pdf');

  -- ── 1. Sans convention ──
  perform tests.endosser((jeu ->> 'gerant')::uuid, 'b4-delorme@essai.invalid');
  return next throws_ok(format('select public.tamila_emettre_facture(%L::uuid)', v_dossier), '55000', null,
                        'pas de facture sans convention d''honoraires (loi 1971 art. 10) (55000)');
  r := public.tamila_honoraires(v_dossier);
  return next ok(not (r ->> 'sans_convention')::boolean, 'un dossier ouvert du jour n''est pas encore signalé sans convention');
  perform tests.redevenir_admin();
  update public.tamila_dossiers set ouvert_le = now() - interval '20 days' where id = v_dossier;
  perform tests.endosser((jeu ->> 'gerant')::uuid, 'b4-delorme@essai.invalid');
  return next ok((public.tamila_honoraires(v_dossier) ->> 'sans_convention')::boolean, 'ouvert depuis vingt jours sans convention : signalé');
  perform tests.redevenir_admin();

  -- ── 2. La convention ──
  perform tests.endosser((jeu ->> 'assistante')::uuid, 'b4-assistante@essai.invalid');
  return next throws_ok(format('select public.tamila_poser_convention(%L::uuid, ''temps_passe'', 25000)', v_dossier), '42501', null,
                        'l''assistante ne pose pas la convention (42501)');
  perform tests.redevenir_admin();
  perform tests.endosser((jeu ->> 'avocat')::uuid, 'b4-rousseau@essai.invalid');
  return next throws_ok(format('select public.tamila_poser_convention(%L::uuid, ''temps_passe'', 25000)', v_dossier), '42501', null,
                        'un avocat intervenant qui ne gère pas le dossier non plus (42501)');
  perform tests.redevenir_admin();
  perform tests.endosser((jeu ->> 'gerant')::uuid, 'b4-delorme@essai.invalid');
  return next throws_ok(format('select public.tamila_poser_convention(%L::uuid, ''forfait'', 25000, 300000)', v_dossier), '22023', null,
                        'un forfait sans taux horaire (22023)');
  return next throws_ok(format('select public.tamila_poser_convention(%L::uuid, ''temps_passe'', 500)', v_dossier), '22023', null,
                        'un taux horaire de 5 € est refusé (22023)');
  v_conv := public.tamila_poser_convention(v_dossier, 'forfait', null, 300000);
  v_conv2 := public.tamila_poser_convention(v_dossier, 'temps_passe', 25000, null, 10, 20);
  perform tests.redevenir_admin();
  return next is((select statut from public.tamila_conventions where id = v_conv), 'resiliee', 'une nouvelle convention résilie la précédente');
  return next is((select count(*) from public.tamila_conventions where dossier_id = v_dossier and statut in ('proposee', 'signee')), 1::bigint,
                 'une seule convention vivante');
  perform tests.endosser((jeu ->> 'gerant')::uuid, 'b4-delorme@essai.invalid');
  return next throws_ok(format('select public.tamila_emettre_facture(%L::uuid)', v_dossier), '55000', null,
                        'une convention seulement proposée ne suffit pas à facturer (55000)');
  perform tests.redevenir_admin();

  -- ── 3. Le temps passé ──
  perform tests.endosser((jeu ->> 'stagiaire')::uuid, 'b4-stagiaire@essai.invalid');
  return next throws_ok(format('select public.tamila_saisir_temps(%L::uuid, %L::date, 30, ''recherche'')', v_dossier, v_auj), '42501', null,
                        'le stagiaire (lecteur) ne saisit pas de temps (42501)');
  perform tests.redevenir_admin();
  perform tests.endosser((jeu ->> 'assistante')::uuid, 'b4-assistante@essai.invalid');
  v_t1 := public.tamila_saisir_temps(v_dossier, v_auj - 2, 90, 'redaction', tests.tamila_chiffre('Conclusions d''appelant ' || tests.tamila_sentinelle()));
  return next ok(v_t1 is not null, 'l''assistante saisit 1 h 30 de rédaction, description chiffrée');
  return next throws_ok(format('select public.tamila_saisir_temps(%L::uuid, %L::date, 30, ''redaction'', convert_to(''en clair'', ''UTF8''))', v_dossier, v_auj),
                        '22023', null, 'une description en clair est refusée (22023)');
  return next throws_ok(format('select public.tamila_saisir_temps(%L::uuid, %L::date, 30, ''redaction'')', v_dossier, v_auj + 1), '22023', null,
                        'pas de temps dans le futur (22023)');
  return next throws_ok(format('select public.tamila_saisir_temps(%L::uuid, %L::date, 0, ''redaction'')', v_dossier, v_auj), '22023', null,
                        'pas de durée nulle (22023)');
  return next throws_ok(format('select public.tamila_saisir_temps(%L::uuid, %L::date, 30, ''pause_cafe'')', v_dossier, v_auj), '22023', null,
                        'une nature inconnue est refusée (22023)');
  perform tests.redevenir_admin();
  perform tests.endosser((jeu ->> 'avocat')::uuid, 'b4-rousseau@essai.invalid');
  v_t2 := public.tamila_saisir_temps(v_dossier, v_auj - 1, 30, 'audience');
  v_t3 := public.tamila_saisir_temps(v_dossier, v_auj, 15, 'correspondance', null, false);
  return next throws_ok(format('select public.tamila_annuler_temps(%L::uuid)', v_t1), '42501', null,
                        'l''avocat n''annule pas le temps de l''assistante (42501)');
  perform tests.redevenir_admin();
  return next is((select user_id from public.tamila_temps where id = v_t1), (jeu ->> 'assistante')::uuid, 'le temps est à la personne qui l''a saisi');
  perform tests.endosser((jeu ->> 'gerant')::uuid, 'b4-delorme@essai.invalid');
  r := public.tamila_honoraires(v_dossier);
  return next is((r ->> 'minutes_a_facturer')::int, 120, 'deux heures facturables (le quart d''heure non facturable n''y est pas)');
  return next is((r ->> 'a_facturer_ht_cents')::bigint, 50000::bigint, 'à facturer : 2 h × 250 € = 500 € HT');
  perform tests.redevenir_admin();

  -- ── 4. La signature ──
  perform tests.endosser((jeu ->> 'assistante')::uuid, 'b4-assistante@essai.invalid');
  return next throws_ok(format('select public.tamila_signer_convention(%L::uuid, %L::date, %L::uuid)', v_conv2, v_auj, v_piece), '42501', null,
                        'l''assistante ne signe pas (42501)');
  perform tests.redevenir_admin();
  perform tests.endosser((jeu ->> 'gerant')::uuid, 'b4-delorme@essai.invalid');
  return next throws_ok(format('select public.tamila_signer_convention(%L::uuid, %L::date, %L::uuid)', v_conv2, v_auj, gen_random_uuid()), '22023', null,
                        'la convention signée doit être une pièce du dossier (22023)');
  return next throws_ok(format('select public.tamila_signer_convention(%L::uuid, %L::date)', v_conv2, v_auj + 3), '22023', null,
                        'pas de signature datée dans le futur (22023)');
  perform public.tamila_signer_convention(v_conv2, v_auj, v_piece);
  return next ok(not (public.tamila_honoraires(v_dossier) ->> 'sans_convention')::boolean, 'signée : le dossier n''est plus signalé');
  return next throws_ok(format('select public.tamila_signer_convention(%L::uuid, %L::date)', v_conv2, v_auj), '55000', null,
                        'une convention signée ne se re-signe pas (55000)');
  perform tests.redevenir_admin();

  -- ── 5. Les provisions ──
  perform tests.endosser((jeu ->> 'gerant')::uuid, 'b4-delorme@essai.invalid');
  v_prov := public.tamila_demander_provision(v_dossier, 60000);
  perform tests.redevenir_admin();
  perform tests.endosser((jeu ->> 'avocat')::uuid, 'b4-rousseau@essai.invalid');
  return next throws_ok(format('select public.tamila_provision_recue(%L::uuid, %L::date, ''cheque'')', v_prov, v_auj), '42501', null,
                        'un avocat intervenant ne note pas un encaissement (42501)');
  perform tests.redevenir_admin();
  perform tests.endosser((jeu ->> 'admin')::uuid, 'b4-haddad@essai.invalid');
  return next throws_ok(format('select public.tamila_provision_recue(%L::uuid, %L::date, ''bitcoin'')', v_prov, v_auj), '22023', null,
                        'un mode de règlement hors RIN art. 11.6 est refusé (22023)');
  perform public.tamila_provision_recue(v_prov, v_auj, 'cheque');
  return next is((select statut from public.tamila_provisions where id = v_prov), 'recue', 'l''associé note la provision reçue par chèque');
  perform tests.redevenir_admin();

  -- ── 6. La facture ──
  perform tests.endosser((jeu ->> 'gerant')::uuid, 'b4-delorme@essai.invalid');
  r := public.tamila_emettre_facture(v_dossier, v_auj, 3500);
  return next is(r ->> 'numero', 'H-' || v_annee || '-000001', 'la première facture de l''année : H-' || v_annee || '-000001');
  return next is((r ->> 'total_ht_cents')::bigint, 50000::bigint, '500 € HT');
  return next is((r ->> 'tva_cents')::bigint, 10000::bigint, 'TVA 20 % : 100 €');
  return next is((r ->> 'total_ttc_cents')::bigint, 63500::bigint, 'TTC 635 € (600 € + 35 € de déboursés hors TVA)');
  return next is((r ->> 'reste_du_cents')::bigint, 3500::bigint, 'provision de 600 € imputée : reste dû 35 €');
  return next throws_ok(format('select public.tamila_emettre_facture(%L::uuid)', v_dossier), '22023', null,
                        'plus rien à facturer (22023)');
  perform tests.redevenir_admin();
  select * into v_f from public.tamila_factures where id = (r ->> 'facture')::uuid;
  return next is((select count(*) from public.tamila_temps where facture_id = v_f.id), 2::bigint, 'les deux temps facturables portent la facture');
  return next is((select statut from public.tamila_temps where id = v_t3), 'saisi', 'le temps non facturable reste hors facture');
  return next is((select facture_id from public.tamila_provisions where id = v_prov), v_f.id, 'la provision est imputée sur la facture');
  return next ok(exists (select 1 from public.journal_opposable j where j.client_id = v_client and j.action = 'tamila.facture.emise'
                           and j.objet_id = v_dossier::text), 'la facture est au journal opposable');

  -- ── 7. L'annulation, la suite sans trou, le paiement ──
  perform tests.endosser((jeu ->> 'gerant')::uuid, 'b4-delorme@essai.invalid');
  return next throws_ok(format('select public.tamila_annuler_facture(%L::uuid, ''Le client a contesté'')', v_f.id), '22023', null,
                        'le motif d''une annulation est un code (22023)');
  perform public.tamila_annuler_facture(v_f.id, 'erreur_montant');
  perform tests.redevenir_admin();
  return next is((select count(*) from public.tamila_temps where id in (v_t1, v_t2) and statut = 'saisi'), 2::bigint,
                 'annulée : ses temps redeviennent à facturer');
  perform tests.endosser((jeu ->> 'gerant')::uuid, 'b4-delorme@essai.invalid');
  r := public.tamila_emettre_facture(v_dossier);
  return next is(r ->> 'numero', 'H-' || v_annee || '-000002', 'la facture suivante prend le numéro suivant : pas de trou, pas de réemploi');
  perform tests.redevenir_admin();
  perform tests.endosser((jeu ->> 'admin')::uuid, 'b4-haddad@essai.invalid');
  return next throws_ok(format('select public.tamila_facture_payee(%L::uuid, %L::date, ''virement'')', r ->> 'facture', v_auj - 400), '22023', null,
                        'un paiement daté avant l''émission est refusé (22023)');
  perform public.tamila_facture_payee((r ->> 'facture')::uuid, v_auj, 'virement');
  return next throws_ok(format('select public.tamila_facture_payee(%L::uuid, %L::date, ''virement'')', r ->> 'facture', v_auj), '55000', null,
                        'une facture payée ne se repaie pas (55000)');
  return next throws_ok(format('select public.tamila_annuler_facture(%L::uuid, ''doublon'')', r ->> 'facture'), '55000', null,
                        'une facture payée ne s''annule pas (55000)');
  perform tests.redevenir_admin();
  perform tests.endosser((jeu ->> 'gerant')::uuid, 'b4-delorme@essai.invalid');
  r := public.tamila_emettre_facture(v_dossier, null, 0, true);
  return next is((select nature from public.tamila_factures where id = (r ->> 'facture')::uuid), 'compte_definitif',
                 'le compte détaillé définitif (RIN art. 11.7) s''émet même à zéro');
  perform tests.redevenir_admin();

  -- ── 8. Lecture, écriture directe, clair ──
  perform tests.endosser((jeu ->> 'stagiaire')::uuid, 'b4-stagiaire@essai.invalid');
  select count(*) into n from public.tamila_factures where dossier_id = v_dossier;
  return next is(n, 3::bigint, 'le stagiaire membre lit les factures du dossier (RLS)');
  perform tests.redevenir_admin();
  perform tests.endosser((jeu ->> 'autre_gerant')::uuid, 'b4-voisin@essai.invalid');
  return next is((select count(*) from public.tamila_factures) + (select count(*) from public.tamila_temps) + (select count(*) from public.tamila_conventions),
                 0::bigint, 'le cabinet voisin ne voit rien');
  return next throws_ok(format('select public.tamila_honoraires(%L::uuid)', v_dossier), '42501', null, 'ni le résumé (42501)');
  perform tests.redevenir_admin();
  perform tests.endosser((jeu ->> 'gerant')::uuid, 'b4-delorme@essai.invalid');
  return next throws_ok(format('insert into public.tamila_temps (client_id, dossier_id, user_id, jour, minutes, nature) values (%L, %L, %L, current_date, 600, ''autre'')',
                               v_client, v_dossier, jeu ->> 'gerant'), '42501', null, 'aucune écriture directe dans tamila_temps (42501)');
  return next throws_ok(format('update public.tamila_factures set total_ttc_cents = 1 where dossier_id = %L::uuid', v_dossier), '42501', null,
                        'ni de retouche d''une facture (42501)');
  perform tests.redevenir_admin();
  return next is(tests.tamila_clair_dans('tamila_temps', tests.tamila_sentinelle()) + tests.tamila_clair_dans('journal_opposable', tests.tamila_sentinelle()),
                 0::bigint, 'la description du temps n''apparaît en clair nulle part');
end $f$;

select * from runtests('tests'::name, '^test_b4_15_');
