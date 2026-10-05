-- b1_03 — VARELO, étapes 7, 8 et 14 : Omega rapproche, forme les lots, marque l'intragroupe
-- Exécutable tel quel par execute_sql sur la RECETTE, après 00_installation.sql (A5) et b1_00_aides.sql.
-- runtests() annule tout ce que le test écrit.

create or replace function tests.test_b1_03_rapprochement() returns setof text
language plpgsql as $f$
declare
  b jsonb;
  v_client uuid; v_soc_a uuid; v_soc_b uuid;
  r jsonb;
  f0123 public.grp_ref_codes; f0200 public.grp_ref_codes; f0400 public.grp_ref_codes; f0300 public.grp_ref_codes; f0600 public.grp_ref_codes;
  trcar public.grp_ref_codes; sodim public.grp_ref_codes; sogex public.grp_ref_codes; impda public.grp_ref_codes;
  p public.grp_ref_propositions;
  d public.demandes_validation;
  o public.grp_ref_objets;
  etat jsonb;
begin
  b := tests.b1_preparer(7);
  v_client := (b ->> 'client')::uuid;
  v_soc_a := (b ->> 'soc_a')::uuid;
  v_soc_b := (b ->> 'soc_b')::uuid;
  r := b -> 'rapprochement';
  return next diag('rapprochement : ' || r::text);

  -- 7. le compte rendu du passage
  return next cmp_ok((r ->> 'codes_examines')::integer, '>=', 9, 'au moins les neuf codes de l''essai sont examinés');
  return next cmp_ok((r ->> 'objets_crees')::integer, '>=', 6, 'au moins six objets du groupe sont créés');
  return next cmp_ok((r ->> 'places_d_office')::integer, '>=', 3, 'au moins trois codes sont placés d''office sur une preuve sûre');
  return next cmp_ok((r ->> 'demandes')::integer, '>=', 1, 'au moins un lot est formé');
  return next is((r ->> 'complet')::boolean, false, 'un passage ordinaire n''est pas complet');

  f0123 := tests.b1_code(v_client, v_soc_a, 'F0123'); f0200 := tests.b1_code(v_client, v_soc_a, 'F0200');
  f0400 := tests.b1_code(v_client, v_soc_a, 'F0400'); f0300 := tests.b1_code(v_client, v_soc_a, 'F0300');
  f0600 := tests.b1_code(v_client, v_soc_a, 'F0600');
  trcar := tests.b1_code(v_client, v_soc_b, 'TRCAR'); sodim := tests.b1_code(v_client, v_soc_b, 'SODIM');
  sogex := tests.b1_code(v_client, v_soc_b, 'SOGEX'); impda := tests.b1_code(v_client, v_soc_b, 'IMPDA');

  -- les premiers codes de chaque tiers ouvrent un objet du groupe
  return next is(f0123.etat, 'nouveau', 'F0123 (société A) ouvre un objet du groupe : état nouveau');
  return next is(f0123.methode, 'nouveau', '… méthode nouveau');
  return next ok(f0123.objet_id is not null, '… avec un objet');
  select * into o from public.grp_ref_objets k where k.id = f0123.objet_id;
  return next matches(o.code_groupe, '^F-[0-9]{5,}$', format('le code du groupe est de la forme F-00001 (%s)', o.code_groupe));
  return next is(o.nom_groupe, 'Transports Caraibes', 'le nom du groupe est le libellé sans la forme juridique, en capitales initiales');
  return next is(o.nom_origine, 'auto', '… posé automatiquement');
  return next is(o.statut, 'actif', '… objet actif');

  -- 8. le même transporteur de la société B est placé d'office, preuve SIREN, et attend le référent
  return next is(trcar.etat, 'propose', 'TRCAR (société B) est proposé…');
  return next is(trcar.objet_id, f0123.objet_id, '… sur l''objet du transporteur de A');
  return next is(trcar.methode, 'siren', '… par la règle SIREN');
  return next is(trcar.score, 1.000, '… score 1');
  return next is(trcar.a_rapprocher, false, '… et n''est plus à rapprocher');
  select * into p from public.grp_ref_propositions k where k.code_id = trcar.id and k.statut = 'a_valider';
  return next ok(p.id is not null, 'une proposition à valider porte TRCAR');
  return next is(p.genre, 'placer', '… genre placer');
  return next is(p.preuve, 'sure', '… preuve sûre');
  return next is(p.type_action, 'rattacher_codes', '… type rattacher_codes');
  return next is(p.regle, 'siren', '… règle siren');
  return next ok(p.raisons @> '[{"critere": "siren", "valeur": "849300124"}]', '… la raison cite le SIREN commun');
  return next ok(p.preuves @> array[f0123.id], '… et le code de A comme preuve');
  return next ok(p.demande_id is not null, '… la proposition est dans un lot');
  select * into d from public.demandes_validation k where k.id = p.demande_id;
  return next is(d.module, 'varelo', 'le lot est une demande du module varelo');
  return next is(d.type_action, 'rattacher_codes', '… de type rattacher_codes');
  return next is(d.statut, 'en_attente', '… en attente');
  return next matches(d.resume, '^Référentiel : rattacher [0-9]+ codes fournisseurs, un identifiant commun le prouve\.$', format('… résumé : %s', d.resume));
  return next ok(d.payload -> 'propositions' @> to_jsonb(array[p.id]), '… la charge liste la proposition');
  return next is(d.approbations_requises::integer, 1, '… une approbation requise');
  return next is((select e.cle from public.equipes e where e.id = d.equipe_id), 'referent_donnees', '… réservée à l''équipe du référent données');

  -- SODIMAT : même SIREN, autre IBAN → coordonnées bancaires différentes, direction financière, deux approbations
  return next is(sodim.etat, 'propose', 'SODIM est proposé sur l''objet de SODIMAT…');
  return next is(sodim.objet_id, f0200.objet_id, '… celui de F0200');
  select * into p from public.grp_ref_propositions k where k.code_id = sodim.id and k.statut = 'a_valider';
  return next is(p.type_action, 'rattacher_iban_different', '… en « coordonnées bancaires différentes »');
  select * into d from public.demandes_validation k where k.id = p.demande_id;
  return next is(d.type_action, 'rattacher_iban_different', 'le lot IBAN différent est une demande à part');
  return next is(d.approbations_requises::integer, 2, '… qui exige deux approbations');
  return next is((select e.cle from public.equipes e where e.id = d.equipe_id), 'direction_financiere', '… de la direction financière');

  -- 14. intragroupe : le fournisseur qui porte le SIREN de la société B
  return next is(sogex.etat, 'propose', 'SOGEX est proposé sur l''objet de F0400 (même SIREN)');
  return next is(sogex.objet_id, f0400.objet_id, '… le même objet');
  select * into o from public.grp_ref_objets k where k.id = f0400.objet_id;
  return next is(o.intragroupe, true, 'l''objet « Sogexal Logistique » est marqué intragroupe…');
  return next is(o.intragroupe_entite_id, v_soc_b, '… rattaché à la société B du groupe');
  select * into o from public.grp_ref_objets k where k.id = f0123.objet_id;
  return next is(o.intragroupe, false, 'le transporteur n''est pas intragroupe');

  -- les codes sans identifiant commun restent seuls
  return next is(f0300.etat, 'nouveau', 'F0300 (sans identifiant) ouvre son objet');
  return next is(f0600.etat, 'nouveau', 'F0600 (SIREN faux, non retenu) ouvre son objet');
  return next is(impda.etat, 'nouveau', 'IMPDA ouvre son objet');
  return next diag(format('IMPDA ↔ F0300 (proche de nom, sans identifiant) : %s proposition(s) probable(s)',
    (select count(*) from public.grp_ref_propositions k where k.client_id = v_client and k.preuve = 'probable'
       and (k.code_id in (impda.id, f0300.id) or k.objet_source in (impda.objet_id, f0300.objet_id) or k.objet_cible in (impda.objet_id, f0300.objet_id)))));

  -- l'état du référentiel, lu par le gérant
  perform tests.endosser((b ->> 'gerant')::uuid, 'gerant@banc-varelo.test');
  etat := public.grp_etat_referentiel(v_client) -> 'fournisseur';
  return next cmp_ok((etat ->> 'codes')::integer, '>=', 9, 'grp_etat_referentiel compte les codes fournisseurs');
  return next is((etat ->> 'a_traiter')::integer, 0, 'plus aucun code à traiter après le passage');
  return next cmp_ok((etat ->> 'proposes')::integer, '>=', 3, 'au moins trois codes proposés');
  return next cmp_ok((etat ->> 'propositions_ouvertes')::integer, '>=', 3, 'au moins trois propositions ouvertes');
  return next is((etat ->> 'taux_rattachement')::numeric, 1.000, 'taux de rattachement 1 : chaque code a son objet');
  -- la vue du référentiel, lue par le gérant
  return next is((select count(*) from public.grp_referentiel_codes v where v.client_id = v_client and v.objet_id = f0123.objet_id), 2::bigint,
                 'la vue grp_referentiel_codes montre les deux codes du transporteur sous un même objet');
  return next is((select v.societe from public.grp_referentiel_codes v where v.code_id = trcar.id), 'Sogexal Logistique (essai B1)', '… avec le nom de la société de chaque code');
  perform tests.redevenir_admin();

  -- un collaborateur ne lance pas de passage ; un valideur le demande
  perform tests.endosser((b ->> 'collab')::uuid, 'b1-collaborateur@essai.invalid');
  return next throws_ok(format('select public.grp_rapprocher(%L)', v_client), '42501', null, 'un collaborateur ne lance pas de passage (42501)');
  return next throws_ok(format('select public.grp_demander_rapprochement(%L)', v_client), '42501', null, 'un collaborateur ne demande pas de passage (42501)');
  perform tests.redevenir_admin();
  perform tests.endosser((b ->> 'daf')::uuid, 'daf@banc-varelo.test');
  return next lives_ok(format('select public.grp_demander_rapprochement(%L, true)', v_client), 'un valideur demande un passage complet');
  perform tests.redevenir_admin();
  return next ok(exists (select 1 from public.travaux t where t.client_id = v_client and t.genre = 'varelo.referentiel.rapprocher'
                            and t.cle = 'rapprocher-complet:' || v_client::text and t.etat in ('a_faire', 'en_cours')),
                 'le travail « rapprocher-complet » est déposé pour le banc');
end $f$;

select * from runtests('tests'::name, '^test_b1_03_');
