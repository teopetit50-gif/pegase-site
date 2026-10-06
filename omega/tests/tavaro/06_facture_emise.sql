-- 06 — Le référent approuve : la décision est appliquée par l'ouvrier, deux factures sont émises (étape 9) ;
-- une facture sans demande approuvée est refusée ; une facture émise et ses lignes ne se modifient pas.

create or replace function tests.test_b2_06_facture_emise() returns setof text
language plpgsql as $f$
declare
  jeu jsonb; v_client uuid; p public.loc_propositions; d public.demandes_validation; f public.loc_factures; f2 public.loc_factures; nb bigint;
begin
  jeu := tests.tavaro_jeu_facture();
  v_client := (jeu ->> 'client')::uuid;
  select * into d from public.demandes_validation where id = (jeu ->> 'demande')::uuid;
  select * into p from public.loc_propositions where id = (jeu ->> 'proposition')::uuid;

  return next ok(d.statut in ('approuvee', 'executee'), format('L''approbation du référent décide la demande (%s)', d.statut));
  return next is(jsonb_array_length(tests.tavaro_travaux(v_client, 'tavaro.decision')), 1, format('Le socle a déposé le travail tavaro.decision (%s)', tests.tavaro_travaux(v_client, 'tavaro.decision')));
  return next is((jeu -> 'ouvrier_decision' ->> 'faits')::int, 1, format('L''ouvrier a appliqué la décision (%s)', jeu -> 'ouvrier_decision'));
  return next is(p.statut, 'facturee', format('La proposition est facturée (factures : %s)', jeu -> 'factures'));
  return next is(jsonb_array_length(jeu -> 'factures'), 2, 'Deux factures : les frais, les dommages');

  select * into f from public.loc_factures where client_id = v_client and nature = 'frais';
  select * into f2 from public.loc_factures where client_id = v_client and nature = 'dommages';
  return next is(f.reference, 'FA-2026-000001', 'La première facture est FA-2026-000001');
  return next is(f2.reference, 'FA-2026-000002', 'La seconde FA-2026-000002');
  return next is(f.total_ttc, 238.20::numeric, 'Frais : 238,20 € TTC');
  return next is(f.total_tva, 39.70::numeric, 'Frais : TVA 39,70 €');
  return next is(f2.total_ttc, 180.00::numeric, 'Dommages : 180,00 €');
  return next is(f2.total_tva, 0::numeric, 'Dommages : sans TVA');
  return next ok(f2.mentions ->> 'tva' like 'Indemnité hors du champ%', 'La facture de dommages porte la mention hors champ');
  return next is(f.statut, 'emise', 'Émise');
  return next is(f.entite_emettrice_id, (jeu ->> 'siege')::uuid, 'Émise par la société principale');
  return next is(f.emetteur ->> 'nom', 'Loueur Essai B2', 'L''émetteur est le loueur');
  return next is(f.emetteur ->> 'adresse', '12 rue de la Gare, 75010 Paris', 'Avec l''adresse des réglages');
  return next is(f.destinataire ->> 'nom', 'Marie Durand', 'Le destinataire est le locataire');
  return next is(f.destinataire ->> 'email', 'marie.durand@essai.invalid', 'Avec son courriel');
  return next is(f.echeance_le, f.date_facture, 'Particulier : à régler à réception');
  return next is(f.a_debiter_avant, date '2026-10-15', 'À débiter avant le 15 octobre (retour + 10 jours)');
  return next ok(f.mentions ->> 'mandat' like 'Facture établie par Omega au nom et pour le compte de Loueur Essai B2%', 'La mention de mandat est posée');
  return next ok(f.mentions ->> 'restitution' like '05/10/2026 à 11:30%', format('La restitution est datée à l''heure de Paris (%s)', f.mentions ->> 'restitution'));
  return next is(tests.compter('public', 'loc_facture_lignes', format('facture_id = %L', f.id)), 4::bigint, 'Quatre lignes de frais');
  return next is(tests.compter('public', 'loc_facture_lignes', format('facture_id = %L and jsonb_array_length(preuves) > 0', f.id)), 3::bigint, 'Carburant, kilomètres et nettoyage gardent leurs photos (le retard n''en a pas : ce sont les heures du contrat)');
  return next is(tests.compter('public', 'loc_facture_lignes', format('facture_id = %L', f2.id)), 1::bigint, 'Une ligne de dommage');
  return next ok(tests.tavaro_journal(v_client, 'tavaro.proposition_validee') >= 1, 'Le journal opposable porte tavaro.proposition_validee');
  return next is(tests.tavaro_journal(v_client, 'tavaro.facture_emise'), 2::bigint, 'Le journal opposable porte deux tavaro.facture_emise');

  -- Le numéro est continu par société émettrice et par an.
  return next is((select s.dernier from public.loc_series_factures s where s.client_id = v_client and s.prefixe = 'FA' and s.annee = f.annee), 2, 'La série FA est à 2');

  -- Une facture ne naît pas sans demande approuvée (même pour le propriétaire de la base).
  return next throws_ok(format($q$insert into public.loc_factures (client_id, entite_id, entite_emettrice_id, contrat_id, contrat_numero, proposition_id, demande_id, nature, annee, numero, reference, date_facture, echeance_le, total_ht, total_tva, total_ttc, emetteur, destinataire)
    values (%L, %L, %L, %L, 'C-2026-0001', %L, %L, 'frais', 2026, 99, 'FA-2026-000099', current_date, current_date, 1, 0, 1, '{}', '{}')$q$,
    v_client, jeu ->> 'siege', jeu ->> 'siege', jeu ->> 'contrat', p.id, gen_random_uuid()), '23514', null, 'Aucune facture sans demande approuvée sur sa proposition');
  -- Une facture émise ne se modifie pas ; ses lignes non plus.
  return next throws_ok(format('update public.loc_factures set total_ttc = 1 where id = %L', f.id), '42501', null, 'Une facture émise ne se modifie pas (42501)');
  return next throws_ok(format('update public.loc_facture_lignes set montant_ttc = 1 where facture_id = %L', f.id), '42501', null, 'Une ligne de facture émise ne se modifie pas (42501)');
  select count(*) into nb from pg_trigger t where t.tgrelid = 'public.loc_factures'::regclass and not t.tgisinternal
    and t.tgfoid = 'private.loc_garder_facture'::regproc and (t.tgtype & 2) = 2 and (t.tgtype & 8) = 8;
  return next ok(nb > 0, 'Un déclencheur BEFORE (loc_garder_facture) protège la facture de l''effacement');
  -- Les membres ne peuvent pas écrire les factures directement (grants).
  return next ok(not has_table_privilege('authenticated', 'public.loc_factures', 'INSERT') and not has_table_privilege('authenticated', 'public.loc_factures', 'UPDATE'), 'authenticated n''a ni INSERT ni UPDATE sur loc_factures');
  return next ok(not has_table_privilege('authenticated', 'public.loc_propositions', 'INSERT') and not has_table_privilege('authenticated', 'public.loc_propositions', 'UPDATE'), 'authenticated n''a ni INSERT ni UPDATE sur loc_propositions');
  return next ok(not has_table_privilege('authenticated', 'public.loc_avoirs', 'INSERT') and not has_table_privilege('authenticated', 'public.loc_avoirs', 'UPDATE'), 'authenticated n''a ni INSERT ni UPDATE sur loc_avoirs');
  return next ok(not has_table_privilege('authenticated', 'public.loc_contrats', 'INSERT') and not has_table_privilege('authenticated', 'public.loc_contrats', 'UPDATE'), 'authenticated n''a ni INSERT ni UPDATE sur loc_contrats');

  -- Le contrat facturé ne se rechiffre plus : une correction passe par un avoir.
  perform tests.endosser((jeu ->> 'collab')::uuid, 'b2-collab@essai.invalid');
  return next throws_ok(format('select public.loc_chiffrer_retour(%L::uuid, tests.tavaro_retour())', jeu ->> 'contrat'), '55000', null, 'Un contrat facturé ne se rechiffre pas : une correction passe par un avoir');
  perform tests.redevenir_admin();

  -- Le refus : la proposition est refusée, rien n'est émis.
  jeu := tests.tavaro_chiffrer(tests.tavaro_jeu_contrat(), 'collab');
  perform tests.tavaro_decider(jeu, (jeu ->> 'demande')::uuid, 'daf', 'rejete', 'Le client a signalé la rayure au départ.');
  perform private.loc_ouvrier(50);
  return next is((select x.statut from public.loc_propositions x where x.id = (jeu ->> 'proposition')::uuid), 'refusee', 'Un refus laisse la proposition refusée');
  return next is(tests.compter('public', 'loc_factures', format('client_id = %L', jeu ->> 'client')), 0::bigint, 'Et n''émet rien');
  return next ok(tests.tavaro_journal((jeu ->> 'client')::uuid, 'tavaro.proposition_refusee') >= 1, 'Le journal opposable porte tavaro.proposition_refusee');
end $f$;

select * from runtests('tests'::name, '^test_b2_06_');
