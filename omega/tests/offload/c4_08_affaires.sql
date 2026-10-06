-- c4_08 — OFFLOAD : les affaires restées en plan (session C4, 06/10/2026). Après c4_00, c4_02, c4_03 (aides) et les
-- migrations c4_01 à c4_08. runtests() annule tout. Dates relatives au jour du test.

-- Une affaire saisie par le gérant du banc.
create or replace function tests.c4_affaire(p_compte uuid, p_reference text, p_depuis integer, p_champs jsonb default '{}'::jsonb)
returns uuid language plpgsql as $$
declare
  banc jsonb := tests.c4_banc();
  v uuid;
begin
  perform tests.endosser((banc ->> 'gerant')::uuid, 'gerant@banc-varelo.test');
  v := public.offload_saisir_affaire(p_compte, p_reference, current_date - p_depuis, p_champs);
  perform tests.redevenir_admin();
  return v;
end $$;

create or replace function tests.c4_affaire_lue(p_affaire uuid) returns public.offload_affaires
language sql stable as $$ select * from public.offload_affaires a where a.id = p_affaire $$;

create or replace function tests.test_c4_08_cycle() returns setof text
language plpgsql as $f$
declare
  banc jsonb := tests.c4_banc();
  v_client uuid := (banc ->> 'client')::uuid;
  v_a uuid; v_b uuid; v_aff uuid; v_jeune uuid; v_vieille uuid;
  a public.offload_affaires;
  e public.envois;
  l jsonb;
  n integer;
begin
  perform tests.c4_reprises_pretes();
  v_a := tests.c4_compte_courriel('AF1', 'Transports Lebrun SARL', 'atelier@lebrun.test', 10);
  v_b := tests.c4_compte_courriel('AF2', 'Boulangerie Morel', 'contact@morel.test', 10);
  v_aff := tests.c4_affaire(v_a, 'CMD-4471', 10, '{"libelle": "4 pneus hiver 315/70", "valeur_ht": 480}');
  v_jeune := tests.c4_affaire(v_b, 'CMD-4502', 3, '{"libelle": "Batterie 12 V", "valeur_ht": 95}');
  v_vieille := tests.c4_affaire(v_b, 'CMD-4390', 40, '{"valeur_ht": 1200}');

  -- La liste : ce qui dort, depuis combien de temps, et ce que ça immobilise.
  l := public.offload_affaires_liste(v_client);
  return next ok((l -> 'affaires' -> 0 ->> 'reference') = 'CMD-4390' and (l -> 'affaires' -> 1 ->> 'reference') = 'CMD-4471'
                 and (l -> 'affaires' -> 2 ->> 'reference') = 'CMD-4502',
                 'Le magasin voit en une liste ce qui dort, la plus ancienne en tête');
  return next ok((l -> 'affaires' -> 1 ->> 'jours')::integer = 10 and (l -> 'affaires' -> 1 ->> 'valeur_ht')::numeric = 480
                 and (l -> 'affaires' -> 1 ->> 'compte_nom') = 'Transports Lebrun SARL',
                 'Chaque commande arrivée dit depuis combien de jours elle attend, sa valeur et son compte');
  return next is((l -> 'total' ->> 'valeur_ht')::numeric, 1775::numeric, 'Le stock immobilisé par les commandes non reprises est chiffré');

  -- Le délai passé (7 jours), un message de retrait, en validation.
  perform private.offload_affaires_cycle(v_client, null);
  a := tests.c4_affaire_lue(v_aff);
  return next ok(a.statut = 'relancee_1' and a.envoi1_id is not null, 'Le délai de retrait passé, le client est relancé');
  return next is((tests.c4_affaire_lue(v_jeune)).statut, 'en_attente', 'Avant le délai, rien ne part');
  select * into e from public.envois x where x.id = a.envoi1_id;
  return next ok(e.objet_type = 'offload_affaires' and e.mode = 'essai'
                 and exists (select 1 from public.demandes_validation d where d.id = e.demande_id and d.statut = 'en_attente'),
                 'Le message de retrait passe par la validation, comme tout envoi');
  return next ok(e.corps like '%Votre commande « 4 pneus hiver 315/70 » (réf. CMD-4471) est arrivée le %'
                 and e.sujet like '%votre commande est arrivée',
                 'Le message dit ce qui attend et depuis quand : ' || coalesce(left(e.corps, 160), ''));
  return next ok(e.corps !~* '(paiement|payer|prix|montant|€|eur\M|factur|r[èe]glement|solde|480)'
                 and e.sujet !~* '(paiement|prix|montant|€|factur)',
                 'Le message ne porte aucune mention de paiement ni de montant (cela relève de CASHD)');

  -- Le lendemain : pas de doublon.
  perform private.offload_affaires_cycle(v_client, current_date + 1);
  return next is((select count(*)::integer from public.envois x where x.objet_type = 'offload_affaires' and x.objet_id = v_aff::text), 1,
                 'Une seule relance tant que le délai de relance n''est pas passé');

  -- Sept jours plus tard : une seule autre.
  perform private.offload_affaires_cycle(v_client, current_date + 7);
  a := tests.c4_affaire_lue(v_aff);
  return next ok(a.statut = 'relancee_2' and a.envoi2_id is not null and a.envoi2_id <> a.envoi1_id, 'Puis une seule autre relance');
  return next ok((select x.sujet like 'Rappel : %' and x.corps like '%vous attend toujours%' from public.envois x where x.id = a.envoi2_id),
                 'La seconde dit qu''il s''agit d''un rappel');

  -- Sans réponse : décision manuelle, montant immobilisé en regard ; plus aucun message.
  perform private.offload_affaires_cycle(v_client, current_date + 14);
  perform private.offload_affaires_cycle(v_client, current_date + 40);
  a := tests.c4_affaire_lue(v_aff);
  return next ok(a.statut = 'decision' and a.motif like 'Relancé deux fois sans réponse : à décider (480 € immobilisés depuis le %',
                 'Deux relances sans réponse : décision manuelle, avec le montant immobilisé en regard (' || coalesce(a.motif, '') || ')');
  return next is((select count(*)::integer from public.envois x where x.objet_type = 'offload_affaires' and x.objet_id = v_aff::text), 2,
                 'Jamais de troisième message');
  return next ok(exists (select 1 from jsonb_array_elements(private.offload_point_lignes(v_client, current_date)) i
                         where i ->> 'texte' like 'Transports Lebrun SARL : commande CMD-4471 relancée deux fois%à décider.'),
                 'La décision à prendre remonte au point du matin');
  return next ok(exists (select 1 from jsonb_array_elements(private.offload_point_lignes(v_client, current_date)) i
                         where i ->> 'texte' like '3 affaires attendent leur retrait : 1 775 € de stock immobilisé.'
                            or i ->> 'texte' like '3 affaires attendent leur retrait : 1%775 € de stock immobilisé.'),
                 'Le stock immobilisé remonte au point du matin');

  -- La décision : clore sans suite, distinct de ce qui attend encore.
  perform tests.endosser((banc ->> 'gerant')::uuid, 'gerant@banc-varelo.test');
  return next throws_ok(format('select public.offload_decider_affaire(%L::uuid, %L, null)', v_aff, 'sans_suite'), '22023', null,
                        'Une décision dit pourquoi');
  return next throws_ok(format('select public.offload_decider_affaire(%L::uuid, %L, %L)', v_aff, 'oublier', 'x'), '22023', null,
                        'Une décision inconnue est refusée');
  perform public.offload_decider_affaire(v_aff, 'sans_suite', 'Le client a annulé par téléphone ; pneus remis en rayon.');
  return next throws_ok(format('select public.offload_decider_affaire(%L::uuid, %L, %L)', v_aff, 'garder', 'x'), '55000', null,
                        'Une affaire close ne se décide plus');
  return next throws_ok(format('select public.offload_saisir_affaire(%L::uuid, %L, current_date + 1)', v_a, 'CMD-9'), '22023', null,
                        'Une affaire est disponible à une date passée');
  return next throws_ok(format('select public.offload_saisir_affaire(%L::uuid, %L, current_date, %L)', v_a, 'CMD-9', '{"prix": 3}'), '22023', null,
                        'Un champ d''affaire inconnu est refusé');
  perform tests.redevenir_admin();
  l := public.offload_affaires_liste(v_client);
  return next ok((tests.c4_affaire_lue(v_aff)).statut = 'close_sans_suite' and (l -> 'total' ->> 'closes_sans_suite')::integer = 1
                 and not exists (select 1 from jsonb_array_elements(l -> 'affaires') x where x ->> 'id' = v_aff::text)
                 and exists (select 1 from jsonb_array_elements(l -> 'affaires') x where x ->> 'id' = v_jeune::text and x ->> 'statut' = 'decision'),
                 'Les affaires closes sans suite sont distinguées de celles qui attendent encore');
  return next ok(exists (select 1 from public.journal_opposable j where j.client_id = v_client and j.action = 'offload.affaire_decidee'),
                 'La décision est au journal');

  -- « Relancer » : une personne reprend le cycle ; le message repart au passage suivant.
  update public.offload_affaires set statut = 'decision' where id = v_vieille;
  perform tests.endosser((banc ->> 'gerant')::uuid, 'gerant@banc-varelo.test');
  perform public.offload_decider_affaire(v_vieille, 'relancer', 'Le client a promis de passer, on le relance une fois.');
  perform public.offload_retirer_affaire(v_jeune, current_date);
  perform tests.redevenir_admin();
  a := tests.c4_affaire_lue(v_vieille);
  return next ok(a.statut = 'en_attente' and a.disponible_le = current_date - 40 and a.relance1_le is null,
                 '« Relancer » remet l''affaire au cycle sans toucher à sa date de disponibilité');
  return next is((tests.c4_affaire_lue(v_jeune)).statut, 'retiree', 'Le retrait noté sort l''affaire de la liste');
  select count(*) into n from jsonb_array_elements((public.offload_affaires_liste(v_client)) -> 'affaires') x where x ->> 'id' = v_jeune::text;
  return next is(n, 0, 'Une affaire retirée n''est plus dans ce qui dort');
end $f$;

create or replace function tests.test_c4_08_inactif_et_reponse() returns setof text
language plpgsql as $f$
declare
  banc jsonb := tests.c4_banc();
  v_client uuid := (banc ->> 'client')::uuid;
  v_i uuid; v_r uuid; v_sans uuid; v_exclu uuid;
  v_ai uuid; v_ar uuid; v_as uuid; v_ax uuid;
  a public.offload_affaires;
  f jsonb;
begin
  perform tests.c4_reprises_pretes();
  -- Un compte qui n'achète plus depuis plus d'un an, dont un appareil réparé attend à l'atelier.
  v_i := tests.c4_compte_courriel('IN1', 'Espaces Verts Garnier', 'garnier@verts.test', 400);
  perform private.offload_detecter(v_client, null);
  v_ai := tests.c4_affaire(v_i, 'OR-2291', 9, '{"type": "intervention", "libelle": "tondeuse autoportée", "valeur_ht": 310}');
  v_r := tests.c4_compte_courriel('RP1', 'Menuiserie Caron', 'caron@menuiserie.test', 10);
  v_ar := tests.c4_affaire(v_r, 'CMD-77', 8, '{"libelle": "Lames de scie"}');
  v_sans := tests.c4_compte_courriel('SC1', 'Ferme du Moulin', 'moulin@ferme.test', 10);
  update public.offload_comptes set email = null where id = v_sans;
  v_as := tests.c4_affaire(v_sans, 'CMD-78', 8);
  v_exclu := tests.c4_compte_courriel('EX1', 'Groupe Hamon', 'achats@hamon.test', 10);
  update public.offload_comptes set statut = 'exclu', statut_motif = 'Compte suivi par Paul' where id = v_exclu;
  v_ax := tests.c4_affaire(v_exclu, 'CMD-79', 8);

  perform private.offload_affaires_cycle(v_client, null);
  a := tests.c4_affaire_lue(v_ai);
  return next ok(a.statut = 'relancee_1' and a.envoi1_id is not null, 'Un compte inactif est prévenu quand même : un rappel de retrait n''est pas une sollicitation');
  return next ok((select x.corps like '%L''intervention sur votre tondeuse autoportée (réf. OR-2291) est terminée depuis le %' and x.sujet like '%votre appareil est prêt'
                  from public.envois x where x.id = a.envoi1_id),
                 'Une intervention terminée est dite prête, pas « arrivée »');
  f := public.offload_affaires_compte(v_i);
  return next ok(jsonb_array_length(f) = 1 and f -> 0 ->> 'reference' = 'OR-2291' and (f -> 0 ->> 'jours')::integer = 9
                 and (select s.niveau from public.offload_signaux s where s.compte_id = v_i) is not null,
                 'La pièce commandée pour un compte inactif est rattachée à sa fiche, à côté de son signal');
  return next ok((tests.c4_affaire_lue(v_as)).envoi1_id is null
                 and exists (select 1 from public.offload_taches t where t.compte_id = v_sans and t.type = 'appel'
                             and t.titre like 'Prévenir Ferme du Moulin : commande CMD-78 en attente de retrait' and t.detail like '%(pas de courriel)%'),
                 'Sans courriel, une tâche d''appel');
  return next ok((tests.c4_affaire_lue(v_ax)).envoi1_id is null and (tests.c4_affaire_lue(v_ax)).statut = 'relancee_1'
                 and exists (select 1 from public.offload_taches t where t.compte_id = v_exclu and t.type = 'appel' and t.detail like '%Suivi en direct%'),
                 'Un compte suivi en direct est prévenu par une personne, jamais par un message automatique');

  -- La réponse du client arrête les relances de retrait.
  a := tests.c4_affaire_lue(v_ar);
  perform tests.c4_evenement_envoi(a.envoi1_id, 'envoye');
  perform public.deposer_reception(v_client, 'email', 'contact@sogexal.test', 'msg-c4-af1', 'caron@menuiserie.test', 'Caron',
    'Re : votre commande est arrivée', E'Je passe samedi matin.\n\n> Bonjour', null, '[]'::jsonb,
    jsonb_build_object('envoi_id', a.envoi1_id), now());
  perform private.offload_traiter_travaux(50);
  a := tests.c4_affaire_lue(v_ar);
  return next ok(a.statut = 'repondue' and a.motif like 'Le client a répondu le %',
                 'La réponse du client arrête les relances de retrait : ' || coalesce(a.statut, ''));
  return next ok(exists (select 1 from public.offload_taches t where t.compte_id = v_r and t.type = 'repondre' and t.titre like '%retrait CMD-77%'),
                 'La conversation revient au magasin');
  perform private.offload_affaires_cycle(v_client, current_date + 8);
  return next is((select count(*)::integer from public.envois x where x.objet_type = 'offload_affaires' and x.objet_id = v_ar::text), 1,
                 'Après une réponse, aucune relance de retrait');
  return next ok(exists (select 1 from jsonb_array_elements((public.offload_affaires_liste(v_client)) -> 'affaires') x
                         where x ->> 'id' = v_ar::text and x ->> 'statut' = 'repondue'),
                 'L''affaire reste dans la liste tant qu''elle n''est pas retirée');

  -- Un message refusé en validation : la décision revient au magasin.
  a := tests.c4_affaire_lue(v_ai);
  perform tests.c4_evenement_envoi(a.envoi2_id, 'refuse');
  return next ok((tests.c4_affaire_lue(v_ai)).statut = 'decision', 'Une relance de retrait refusée en validation renvoie à la décision');
end $f$;

create or replace function tests.test_c4_08_import() returns setof text
language plpgsql as $f$
declare
  banc jsonb := tests.c4_banc();
  v_client uuid := (banc ->> 'client')::uuid;
  a public.offload_affaires;
  o public.offload_affaires;
  l jsonb;
begin
  perform tests.c4_reprises_pretes();
  perform tests.c4_deposer('clients', jsonb_build_array(jsonb_build_object('compte_ref', 'P200', 'nom', 'Agri Service Lamballe')), 'af-clients');
  perform tests.c4_deposer('affaires', jsonb_build_array(
    jsonb_build_object('compte_ref', 'P200', 'reference', 'CMD-1', 'type', 'Commande', 'libelle', 'Kit courroies',
                       'disponible_le', to_char(current_date - 12, 'DD/MM/YYYY'), 'valeur', '1 250,00'),
    jsonb_build_object('compte_ref', 'P200', 'reference', 'OR-7', 'type', 'Réparation atelier', 'libelle', 'débroussailleuse',
                       'disponible_le', to_char(current_date - 2, 'DD/MM/YYYY')),
    jsonb_build_object('compte_ref', 'P201', 'reference', 'CMD-2', 'disponible_le', to_char(current_date - 1, 'DD/MM/YYYY'))), 'af-1');
  select x.* into a from public.offload_affaires x join public.offload_comptes c on c.id = x.compte_id
  where c.client_id = v_client and c.ref = 'P200' and x.reference = 'CMD-1';
  select x.* into o from public.offload_affaires x join public.offload_comptes c on c.id = x.compte_id
  where c.client_id = v_client and c.ref = 'P200' and x.reference = 'OR-7';
  return next ok(a.id is not null and a.valeur_ht = 1250 and a.type = 'commande' and a.source = 'import' and a.disponible_le = current_date - 12,
                 'L''export « affaires » est lu : référence, date de disponibilité, valeur « 1 250,00 »');
  return next is(o.type, 'intervention', '« Réparation atelier » est lu comme une intervention');
  return next ok(exists (select 1 from public.offload_affaires x join public.offload_comptes c on c.id = x.compte_id
                         where c.client_id = v_client and c.ref = 'P201' and x.reference = 'CMD-2'),
                 'Un compte cité et inconnu est créé, l''affaire rattachée');
  return next ok(a.statut = 'relancee_1' and exists (select 1 from public.offload_taches t where t.compte_id = a.compte_id and t.type = 'appel'
                                                     and t.titre like '%CMD-1%'),
                 'Après l''import, le cycle passe : la commande en attente depuis douze jours est relancée (ici par un appel)');

  -- L'export suivant : OR-7 retirée, CMD-1 absente.
  update public.offload_affaires set vu_le = current_date - 1 where client_id = v_client;
  perform tests.c4_deposer('affaires', jsonb_build_array(
    jsonb_build_object('compte_ref', 'P200', 'reference', 'OR-7', 'disponible_le', to_char(current_date - 2, 'DD/MM/YYYY'),
                       'retire_le', to_char(current_date, 'DD/MM/YYYY')),
    jsonb_build_object('compte_ref', 'P201', 'reference', 'CMD-2', 'disponible_le', to_char(current_date - 1, 'DD/MM/YYYY'))), 'af-2');
  l := public.offload_affaires_liste(v_client);
  return next is((tests.c4_affaire_lue(o.id)).statut, 'retiree', 'Une date de retrait dans l''export clôt l''affaire');
  return next ok(exists (select 1 from jsonb_array_elements(l -> 'affaires') x where x ->> 'id' = a.id::text and (x ->> 'plus_vue')::boolean)
                 and (tests.c4_affaire_lue(a.id)).statut = 'relancee_1',
                 'Une affaire absente du dernier export est signalée « plus vue », jamais close d''office');
  return next ok(exists (select 1 from public.journal_opposable j where j.client_id = v_client and j.action = 'offload.import_applique'
                         and j.donnees -> 'jeux' ? 'affaires'),
                 'L''import des affaires est au journal');
end $f$;

select * from runtests('tests'::name, '^test_c4_08_');
