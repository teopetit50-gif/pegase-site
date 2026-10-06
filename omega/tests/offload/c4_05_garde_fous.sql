-- c4_05 — OFFLOAD, palier 5 : garde-fous commerciaux et doublons (session C4, 06/10/2026). Après c4_00, c4_02,
-- c4_03 (aides) et les migrations c4_01 à c4_05. runtests() annule tout.

create or replace function tests.test_c4_05_reprise_en_main() returns setof text
language plpgsql as $f$
declare
  banc jsonb := tests.c4_banc();
  v_client uuid := (banc ->> 'client')::uuid;
  v_c uuid; v_lecteur uuid;
  r public.offload_reprises;
begin
  perform tests.c4_reprises_pretes();
  v_lecteur := tests.c4_compte(v_client, 'lecteur', 'lecteur-c4@banc-varelo.test');
  v_c := tests.c4_compte_courriel('GM1', 'Reprise en Main', 'achats@main-reprise.test', 70);
  perform private.offload_detecter(v_client, null);
  perform private.offload_cycle(v_client, null);
  r := tests.c4_reprise(v_c);
  return next is(r.statut, 'a_valider', 'Une reprise est en cours, son message en validation');

  perform tests.endosser((banc ->> 'gerant')::uuid, 'gerant@banc-varelo.test');
  return next throws_ok(format('select public.offload_changer_statut(%L::uuid, %L, null)', v_c, 'exclu'), '22023', 'Reprendre la main dit pourquoi');
  perform public.offload_changer_statut(v_c, 'exclu', 'Sophie le suit en direct : rendez-vous prévu.');
  perform tests.redevenir_admin();
  r := tests.c4_reprise(v_c);
  return next ok(r.statut = 'close' and r.issue = 'reprise_en_main', 'D''un seul geste, la reprise en cours est close : « reprise en main »');
  return next is((select e.statut from public.envois e where e.id = r.envoi1_id), 'annule', 'Le message en attente est annulé au socle');
  return next is((select c.statut from public.offload_comptes c where c.id = v_c), 'exclu', 'Le compte est suivi en direct');
  return next ok(private.offload_ecarte(v_c) like 'Suivi en direct par un commercial%', 'Il est écarté du cycle automatique, avec la raison');

  -- Un compte retiré à sa demande : seul le gérant le remet dans le circuit.
  update public.offload_comptes set statut = 'arrete', statut_motif = 'stop' where id = v_c;
  perform tests.endosser(tests.c4_compte(v_client, 'collaborateur', 'commercial-c4@banc-varelo.test'), 'commercial-c4@banc-varelo.test');
  return next throws_ok(format('select public.offload_changer_statut(%L::uuid, %L, %L)', v_c, 'suivi', 'Il a rappelé'), '42501',
                        'Un commercial ne remet pas dans le circuit un compte retiré à sa demande');
  perform tests.endosser((banc ->> 'gerant')::uuid, 'gerant@banc-varelo.test');
  perform public.offload_changer_statut(v_c, 'suivi', 'Le client a redemandé nos offres par écrit le 06/10.');
  return next is((select c.statut from public.offload_comptes c where c.id = v_c), 'suivi', 'Le gérant le remet dans le circuit, motif écrit');
  perform tests.endosser(v_lecteur, 'lecteur-c4@banc-varelo.test');
  return next throws_ok(format('select public.offload_changer_statut(%L::uuid, %L, %L)', v_c, 'exclu', 'x'), '42501', 'Un lecteur ne change rien');
end $f$;

create or replace function tests.test_c4_05_exclusions() returns setof text
language plpgsql as $f$
declare
  banc jsonb := tests.c4_banc();
  v_client uuid := (banc ->> 'client')::uuid;
  v_sect uuid; v_com uuid; v_contact uuid; v_g1 uuid; v_g2 uuid; v_libre uuid; v_ex uuid;
  b jsonb;
begin
  perform tests.c4_reprises_pretes();
  v_sect := tests.c4_compte_courriel('XS1', 'Secteur Exclu', 'a@sect.test', 70);
  update public.offload_comptes set secteur = 'Collectivités' where id = v_sect;
  v_com := tests.c4_compte_courriel('XC1', 'Commercial Exclu', 'a@com.test', 70);
  update public.offload_comptes set commercial = 'Karim' where id = v_com;
  v_contact := tests.c4_compte_courriel('XK1', 'Déjà Appelé', 'a@contact.test', 70);
  v_g1 := tests.c4_compte_courriel('XG1', 'Dubreuil Nord', 'a@g1.test', 80);
  v_g2 := tests.c4_compte_courriel('XG2', 'Dubreuil Sud', 'a@g2.test', 70);
  update public.offload_comptes set groupe = 'Groupe Dubreuil' where id in (v_g1, v_g2);
  v_libre := tests.c4_compte_courriel('XL1', 'Libre', 'a@libre.test', 70);

  perform tests.endosser((banc ->> 'gerant')::uuid, 'gerant@banc-varelo.test');
  v_ex := public.offload_exclure(v_client, 'secteur', 'Collectivités', 'Marchés publics : pas de démarchage.');
  perform public.offload_exclure(v_client, 'commercial', 'karim', 'Portefeuille de Karim suivi en direct.');
  perform public.offload_noter_contact(v_contact, current_date - 5, 'visite', 'Sophie', 'Passée en clientèle la semaine dernière.');
  return next throws_ok(format('select public.offload_exclure(%L::uuid, %L, %L, %L)', v_client, 'pays', 'x', 'y'), '22023', 'Type d''exclusion inconnu refusé');
  return next throws_ok(format('select public.offload_noter_contact(%L::uuid, current_date + 1, %L)', v_contact, 'appel'), '22023', 'Un contact futur est refusé');
  perform tests.redevenir_admin();

  perform private.offload_detecter(v_client, null);
  b := private.offload_cycle(v_client, null);
  return next ok((tests.c4_reprise(v_sect)).id is null and private.offload_ecarte(v_sect) like 'Exclu par la liste (secteur « Collectivités »)%',
                 'Liste d''exclusion par secteur');
  return next ok((tests.c4_reprise(v_com)).id is null and private.offload_ecarte(v_com) like 'Exclu par la liste (commercial%', 'Liste d''exclusion par commercial, sans souci de casse');
  return next ok((tests.c4_reprise(v_contact)).id is null and private.offload_ecarte(v_contact) like 'Déjà contacté le % par Sophie : écarté de la vague en cours.',
                 'Un compte déjà contacté par un commercial est écarté de la vague');
  return next is((select c.dernier_contact from public.offload_comptes c where c.id = v_contact), current_date - 5, 'La date du dernier contact est gardée');
  return next is(((tests.c4_reprise(v_g1)).id is not null)::int + ((tests.c4_reprise(v_g2)).id is not null)::int, 1,
                 'Deux entités d''un même groupe : une seule reprise, le plafond vaut pour le groupe');
  return next ok((tests.c4_reprise(v_libre)).id is not null, 'Un compte sans exclusion reçoit sa reprise');
  return next is((b ->> 'ecartes')::integer, 4, 'Le bilan du cycle compte les écartés');

  perform tests.endosser((banc ->> 'gerant')::uuid, 'gerant@banc-varelo.test');
  perform public.offload_lever_exclusion(v_ex);
  perform tests.redevenir_admin();
  return next ok(private.offload_ecarte(v_sect) is null, 'Une exclusion levée ne joue plus (et reste au registre)');
  return next ok((select e.levee_le is not null from public.offload_exclusions e where e.id = v_ex), 'Levée, pas effacée');
end $f$;

create or replace function tests.test_c4_05_doublons() returns setof text
language plpgsql as $f$
declare
  banc jsonb := tests.c4_banc();
  v_client uuid := (banc ->> 'client')::uuid;
  v_a uuid; v_b uuid; v_c uuid; v_d uuid;
  x uuid; n integer;
begin
  perform tests.c4_reprises_pretes();
  v_a := tests.c4_compte_courriel('DA1', 'Garage Martin SARL', 'atelier@martin.test', 70);
  v_b := tests.c4_compte_courriel('DB1', 'GARAGE MARTIN', 'compta@martin.test', 400);
  v_c := tests.c4_compte_courriel('DC1', 'Transports Rival', 'achats@rival.test', 10);
  v_d := tests.c4_compte_courriel('DD1', 'Rival Logistique', 'achats@rival.test', 10);
  -- L'aide pose le même téléphone partout : on le retire ici, sinon tout se rapproche (à raison).
  update public.offload_comptes set telephone = null where id in (v_a, v_b, v_c, v_d);
  n := private.offload_proposer_rapprochements(v_client);
  return next is(n, 2, 'Deux rapprochements proposés');
  select r.id into x from public.offload_rapprochements r where r.compte_a = least(v_a, v_b) and r.compte_b = greatest(v_a, v_b);
  return next ok((select r.raisons ->> 0 from public.offload_rapprochements r where r.id = x) like 'Même raison sociale une fois les formes juridiques retirées%',
                 'Le rapprochement dit ce qui le fonde');
  return next ok(exists (select 1 from public.offload_rapprochements r where r.compte_a = least(v_c, v_d) and r.raisons ? 'Même courriel : achats@rival.test.'),
                 'Même courriel : proposé aussi');
  return next is(private.offload_proposer_rapprochements(v_client), 0, 'Reproposer ne double rien');
  return next is((select count(*)::integer from public.offload_comptes c where c.fusionne_dans is not null), 0, 'Rien n''est fusionné sans accord');

  perform tests.endosser(tests.c4_compte(v_client, 'collaborateur', 'commercial-c4@banc-varelo.test'), 'commercial-c4@banc-varelo.test');
  return next throws_ok(format('select public.offload_trancher_rapprochement(%L::uuid, true)', x), '42501', 'Un commercial ne fusionne pas');
  perform tests.endosser((banc ->> 'gerant')::uuid, 'gerant@banc-varelo.test');
  n := (select count(*)::integer from public.offload_achats a where a.compte_id in (v_a, v_b));
  perform public.offload_trancher_rapprochement(x, true);
  perform tests.redevenir_admin();
  return next is((select count(*)::integer from public.offload_achats a where a.compte_id = least(v_a, v_b)), n, 'Accepté : toutes les pièces passent sur la fiche gardée');
  return next is((select c.fusionne_dans from public.offload_comptes c where c.id = greatest(v_a, v_b)), least(v_a, v_b), 'L''autre fiche est marquée fusionnée');
  return next ok(private.offload_ecarte(greatest(v_a, v_b)) = 'Fiche fusionnée dans une autre.', 'La fiche fusionnée ne sort plus');
  return next ok(not exists (select 1 from jsonb_array_elements(public.offload_tableau(v_client) -> 'comptes') c where c ->> 'id' = greatest(v_a, v_b)::text),
                 'Elle disparaît de la liste');
  select r.id into x from public.offload_rapprochements r where r.compte_a = least(v_c, v_d);
  perform tests.endosser((banc ->> 'gerant')::uuid, 'gerant@banc-varelo.test');
  perform public.offload_trancher_rapprochement(x, false);
  perform tests.redevenir_admin();
  perform private.offload_proposer_rapprochements(v_client);
  return next is((select r.statut from public.offload_rapprochements r where r.id = x), 'refuse', 'Refusé, il n''est plus proposé');
  return next ok(exists (select 1 from public.journal_opposable j where j.client_id = v_client and j.action = 'offload.rapprochement_accepte'),
                 'La fusion est au journal');
end $f$;

select * from runtests('tests'::name, '^test_c4_05_');
