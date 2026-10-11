-- 23 — Péages en flux libre (migration b2_14) : les passages du compte flotte, rapprochés du contrat par la plaque et
-- l'heure ; rejouer n'ajoute rien ; payés chez l'opérateur dans les 72 heures (alerte sinon) ; refacturés au locataire
-- par le chemin de toute facture (ligne PEAGE au montant réel, ramené hors taxes, plus FRAIS_PEAGE) ; ou gardés à la
-- charge du loueur, motif écrit.

create or replace function tests.test_b2_23_peages() returns setof text
language plpgsql as $f$
declare
  jeu jsonb; v_client uuid; v_contrat uuid; v_jour date; r jsonb; p1 uuid; p2 uuid; v_prop uuid; p public.loc_propositions;
begin
  if to_regprocedure('public.loc_enregistrer_passages(jsonb, text)') is null then
    return next fail('La migration b2_14 (péages) n''est pas posée : public.loc_enregistrer_passages manque');
    return;
  end if;
  jeu := tests.tavaro_jeu_contrat();
  v_client := (jeu ->> 'client')::uuid;
  v_contrat := (jeu ->> 'contrat')::uuid;
  v_jour := (now() at time zone 'Europe/Paris')::date;

  perform tests.endosser((jeu ->> 'collab')::uuid, 'b2-collab@essai.invalid');
  r := public.loc_enregistrer_passages(jsonb_build_array(
    jsonb_build_object('operateur', 'Sanef', 'reference', 'B2-S-1', 'passe_le', '2026-10-02T12:00:00+02:00', 'immatriculation', 'ga123bc', 'montant_eur', 3.60, 'portique', 'A13 Boulay'),
    jsonb_build_object('operateur', 'Sanef', 'reference', 'B2-S-2', 'passe_le', now() - interval '80 hours', 'immatriculation', 'ZZ-999-ZZ', 'montant_eur', 2.40)), 'import');
  return next is(r, '{"deja": 0, "nouveaux": 2, "rapproches": 1}'::jsonb, 'Deux passages reçus, celui du véhicule loué rapproché de son contrat');
  r := public.loc_enregistrer_passages('[{"operateur":"Sanef","reference":"B2-S-1","passe_le":"2026-10-02T12:00:00+02:00","immatriculation":"GA-123-BC","montant_eur":3.60}]');
  return next is((r ->> 'deja')::int, 1, 'Rejouer l''export n''ajoute rien');
  return next throws_ok(format('select public.loc_enregistrer_passages(%L::jsonb)', jsonb_build_array(jsonb_build_object('operateur', 'Sanef', 'reference', 'B2-S-9',
                        'passe_le', now() + interval '1 day', 'immatriculation', 'GA-123-BC', 'montant_eur', 1))), '22023', null, 'Un passage daté dans le futur est refusé');
  select x.id into p1 from public.loc_passages_peage x where x.client_id = v_client and x.reference = 'B2-S-1';
  select x.id into p2 from public.loc_passages_peage x where x.client_id = v_client and x.reference = 'B2-S-2';
  return next ok((select x.contrat_id = v_contrat and x.payer_avant = x.passe_le + interval '72 hours' from public.loc_passages_peage x where x.id = p1), 'Le passage porte son contrat et son échéance de 72 heures');

  -- Les 72 heures : l'alerte.
  perform tests.redevenir_admin();
  return next ok(private.loc_surveiller_peages() >= 1, 'Des passages à payer hors délai lèvent une alerte');

  -- Refacturer : il faut un passage payé, puis la ligne PEAGE au barème.
  perform tests.endosser((jeu ->> 'collab')::uuid, 'b2-collab@essai.invalid');
  return next throws_ok(format('select public.loc_refacturer_peages(%L::uuid)', v_contrat), '55000', null, 'Un passage non payé ne se refacture pas');
  return next throws_ok(format('select public.loc_payer_passage(%L::uuid, %L)', p1, ' '), '22023', null, 'Le paiement porte sa référence chez l''opérateur');
  r := public.loc_payer_passage(p1, 'PAY-B2-1');
  return next is(r ->> 'statut', 'paye', 'Le passage est payé');
  return next throws_ok(format('select public.loc_payer_passage(%L::uuid, %L)', p1, 'PAY-B2-1'), '23514', null, 'Un passage payé ne se repaie pas');
  return next throws_ok(format('select public.loc_refacturer_peages(%L::uuid)', v_contrat), '23514', null, 'Sans la ligne PEAGE au barème, la refacturation dit quoi faire');
  perform tests.endosser((jeu ->> 'gerant')::uuid, 'b2-gerant@essai.invalid');
  perform public.loc_publier_bareme('Barème avec péages', v_jour, tests.tavaro_bareme_lignes() || jsonb_build_array(
    jsonb_build_object('code', 'PEAGE', 'libelle', 'Péage en flux libre, au montant réel', 'famille', 'frais', 'unite', 'devis', 'regime_tva', 'taxable', 'taux_tva', 20),
    jsonb_build_object('code', 'FRAIS_PEAGE', 'libelle', 'Frais de gestion du péage', 'famille', 'frais', 'unite', 'forfait', 'prix_eur', 5, 'regime_tva', 'taxable', 'taux_tva', 20)));
  perform tests.endosser((jeu ->> 'collab')::uuid, 'b2-collab@essai.invalid');
  r := public.loc_refacturer_peages(v_contrat);
  v_prop := (r ->> 'proposition')::uuid;
  return next is((r ->> 'passages')::int, 1, 'Le passage payé est refacturé');
  perform tests.redevenir_admin();
  select * into p from public.loc_propositions where id = v_prop;
  return next ok(p.statut = 'calculee' and p.entrees ->> 'objet' = 'peages', 'Une proposition de péages, au chemin de toute facture');
  return next is((select l.montant_ttc from public.loc_proposition_lignes l where l.proposition_id = v_prop and l.code = 'PEAGE'), 3.60::numeric, 'Le péage est refacturé à son montant réel TTC');
  return next is((select l.montant_ht from public.loc_proposition_lignes l where l.proposition_id = v_prop and l.code = 'PEAGE'), 3.00::numeric, 'Ramené hors taxes sur la ligne');
  return next is((select l.montant_ht from public.loc_proposition_lignes l where l.proposition_id = v_prop and l.code = 'FRAIS_PEAGE'), 5::numeric, 'Les frais de gestion suivent');
  return next ok(exists (select 1 from public.travaux t where t.cle = 'tavaro:deposer:' || v_prop::text), 'La demande de validation est déposée');
  return next ok(tests.tavaro_journal(v_client, 'tavaro.peages_refactures') >= 1, 'Le journal porte tavaro.peages_refactures');

  -- À la charge du loueur : payé d'abord, motif écrit, direction pour un passage sans agence.
  perform tests.endosser((jeu ->> 'gerant')::uuid, 'b2-gerant@essai.invalid');
  return next throws_ok(format('select public.loc_passage_a_la_charge(%L::uuid, %L)', p2, 'Convoyage'), '55000', null, 'À la charge du loueur ne veut pas dire impayé');
  perform public.loc_payer_passage(p2, 'PAY-B2-2');
  return next throws_ok(format('select public.loc_passage_a_la_charge(%L::uuid, %L)', p2, 'non'), '22023', null, 'Le motif est écrit');
  r := public.loc_passage_a_la_charge(p2, 'Convoyage vers l''agence Nord');
  return next is(r ->> 'statut', 'a_la_charge_du_loueur', 'Le passage reste à la charge du loueur');
  perform tests.endosser((jeu ->> 'autre')::uuid, 'b2-autre@essai.invalid');
  return next throws_ok(format('select public.loc_payer_passage(%L::uuid, %L)', p1, 'X'), 'P0002', null, 'Un autre loueur ne voit pas les passages');
end $f$;

select * from runtests('tests'::name, '^test_b2_23_');
