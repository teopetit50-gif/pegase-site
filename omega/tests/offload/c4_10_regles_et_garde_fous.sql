-- c4_10 — OFFLOAD : règles en français, coupe-circuit, réponses automatiques, raison sociale mère (session C4, 11/10/2026).
-- Après c4_00, c4_02, c4_03, c4_07, c4_08, c4_09 (aides) et les migrations c4_01 à c4_10. runtests() annule tout.

create or replace function tests.c4_regle(p_texte text) returns jsonb
language plpgsql as $$
declare
  banc jsonb := tests.c4_banc();
  r jsonb;
begin
  perform tests.endosser((banc ->> 'gerant')::uuid, 'gerant@banc-varelo.test');
  r := public.offload_ecrire_regle((banc ->> 'client')::uuid, p_texte);
  perform tests.redevenir_admin();
  return r;
end $$;

create or replace function tests.test_c4_10_lecture_des_regles() returns setof text
language plpgsql as $f$
declare
  i jsonb;
begin
  i := private.offload_interpreter_regle('N''utilise jamais le mot « dossier ».');
  return next ok(i ->> 'famille' = 'interdit' and i -> 'parametres' ->> 'mot' = 'dossier' and i ->> 'statut' = 'appliquee',
                 'Une phrase « jamais le mot … » est lue comme un mot interdit : ' || (i ->> 'reponse'));
  i := private.offload_interpreter_regle('Ne propose aucune remise aux anciens clients.');
  return next ok(i ->> 'famille' = 'interdit' and i -> 'parametres' ->> 'mot' = 'remise', 'Ne propose aucune remise : la remise est interdite (' || (i -> 'parametres' ->> 'mot') || ')');
  i := private.offload_interpreter_regle('Ne relance jamais un compte en litige.');
  return next ok(i ->> 'famille' = 'litige' and i ->> 'statut' in ('en_attente', 'appliquee') and i ->> 'reponse' like '%CASHD%',
                 'Le litige est compris, et le système dit d''où vient l''information (CASHD) : ' || (i ->> 'reponse'));
  i := private.offload_interpreter_regle('Ne relance jamais le secteur BTP.');
  return next ok(i ->> 'famille' = 'exclusion' and i -> 'parametres' ->> 'type' = 'secteur' and i -> 'parametres' ->> 'valeur' = 'BTP',
                 'Une exclusion de secteur est lue');
  i := private.offload_interpreter_regle('Pas plus de 40 mots par message.');
  return next ok(i ->> 'famille' = 'longueur' and (i -> 'parametres' ->> 'mots')::integer = 40, 'Une longueur maximale est lue');
  i := private.offload_interpreter_regle('Commence toujours par « Madame, Monsieur, »');
  return next ok(i ->> 'famille' = 'salutation' and i -> 'parametres' ->> 'texte' = 'Madame, Monsieur,', 'Une formule d''appel est lue');
  i := private.offload_interpreter_regle('Ne mentionne jamais de montant.');
  return next is(i ->> 'famille', 'montant', 'Le montant interdit est lu');
  i := private.offload_interpreter_regle('Ne tutoie jamais personne.');
  return next is(i ->> 'famille', 'tutoiement', 'Le tutoiement est lu');
  i := private.offload_interpreter_regle('Sois créatif et chaleureux.');
  return next ok(i ->> 'statut' = 'non_comprise' and i ->> 'reponse' like 'Je n''ai pas compris%',
                 'Une phrase hors des familles connues n''est pas devinée : le système dit qu''il ne l''a pas comprise');
end $f$;

create or replace function tests.test_c4_10_regles_appliquees() returns setof text
language plpgsql as $f$
declare
  banc jsonb := tests.c4_banc();
  v_client uuid := (banc ->> 'client')::uuid;
  v_a uuid; v_b uuid; v_c uuid;
  r public.offload_reprises;
  e public.envois;
  i jsonb;
  v_collab uuid;
begin
  perform tests.c4_reprises_pretes();
  -- Formes : formule d'appel, signature, aucun montant.
  perform tests.c4_regle('Commence toujours par « Madame, Monsieur, »');
  perform tests.c4_regle('Signe « Le service client Sogexal »');
  perform tests.c4_regle('Ne mentionne jamais de montant.');
  v_a := tests.c4_compte_courriel('RG1', 'Garage Lemoine', 'atelier@lemoine.test', 70);
  perform private.offload_detecter(v_client, null);
  perform private.offload_cycle(v_client, null);
  r := tests.c4_reprise(v_a);
  select * into e from public.envois where id = r.envoi1_id;
  return next ok(e.corps like 'Madame, Monsieur,%' and e.corps like '%Bien cordialement,' || E'\n' || 'Le service client Sogexal%'
                 and e.corps !~ '€',
                 'Les règles de forme s''appliquent au message : ' || coalesce(left(e.corps, 220), ''));

  -- Un mot interdit que le gabarit contient : le message est retenu, la reprise passe par l'appel.
  i := tests.c4_regle('N''utilise jamais le mot « dossier ».');
  v_b := tests.c4_compte_courriel('RG2', 'Menuiserie Paquet', 'bureau@paquet.test', 70);
  perform private.offload_detecter(v_client, null);
  perform private.offload_cycle(v_client, null);
  r := tests.c4_reprise(v_b);
  return next ok(r.statut = 'appel' and r.envoi1_id is null and r.motif like 'Message retenu par votre règle « N''utilise jamais le mot « dossier ». »%',
                 'Un message qui enfreint une règle est retenu, et la reprise passe par l''appel : ' || coalesce(r.motif, r.statut));
  return next ok(exists (select 1 from public.journal_opposable j where j.client_id = v_client and j.action = 'offload.message_retenu'),
                 'Le message retenu est au journal');

  -- Une exclusion écrite en français devient une liste d'exclusion.
  perform tests.c4_regle('Ne relance jamais le secteur Santé.');
  v_c := tests.c4_compte_courriel('RG3', 'Cabinet Vasseur', 'cabinet@vasseur.test', 70);
  update public.offload_comptes set secteur = 'Santé' where id = v_c;
  return next ok(private.offload_ecarte(v_c) like 'Exclu par la liste (secteur « Santé »)%',
                 'Une exclusion écrite en français écarte le secteur : ' || coalesce(private.offload_ecarte(v_c), 'rien'));

  -- Retirer la règle lève l'exclusion.
  perform tests.endosser((banc ->> 'gerant')::uuid, 'gerant@banc-varelo.test');
  perform public.offload_retirer_regle((select g.id from public.offload_regles g where g.client_id = v_client and g.famille = 'exclusion'));
  perform tests.redevenir_admin();
  return next is(private.offload_ecarte(v_c), null, 'Retirer la règle lève l''exclusion qu''elle avait posée');

  -- L'écran lit les règles avec la réponse du système.
  perform tests.endosser((banc ->> 'gerant')::uuid, 'gerant@banc-varelo.test');
  i := public.offload_garde_fous(v_client);
  perform tests.redevenir_admin();
  return next ok(jsonb_array_length(i -> 'regles') = 4 and exists (select 1 from jsonb_array_elements(i -> 'regles') x where x ->> 'reponse' like 'Compris :%'),
                 'Les règles en vigueur se lisent avec la réponse du système, sans case à cocher');

  -- Droits.
  v_collab := tests.c4_compte(v_client, 'collaborateur', 'collab-c4-regles@banc-varelo.test');
  perform tests.endosser(v_collab, 'collab-c4-regles@banc-varelo.test');
  return next throws_ok(format('select public.offload_ecrire_regle(%L::uuid, %L)', v_client, 'Pas plus de 50 mots.'), '42501', null,
                        'Un collaborateur n''écrit pas les règles');
  perform tests.redevenir_admin();
end $f$;

create or replace function tests.test_c4_10_coupe_circuit() returns setof text
language plpgsql as $f$
declare
  banc jsonb := tests.c4_banc();
  v_client uuid := (banc ->> 'client')::uuid;
  v uuid[] := '{}';
  k integer;
  r public.offload_reprises;
  v_motif text;
  v_attente uuid;
  v_collab uuid;
  v_rebonds uuid[];
  v_fournisseurs text[];
begin
  perform tests.c4_reprises_pretes();
  for k in 1 .. 6 loop
    v := v || tests.c4_compte_courriel('CC' || k, 'Compte coupe-circuit ' || k, 'cc' || k || '@coupe.test', 70);
  end loop;
  perform private.offload_detecter(v_client, null);
  perform private.offload_cycle(v_client, null);
  -- Cinq messages remis par l'ouvrier, puis deux reviennent non remis.
  for k in 1 .. 5 loop
    r := tests.c4_reprise(v[k]);
    perform tests.c4_remettre(r.envoi1_id, (banc ->> 'gerant')::uuid, 'gerant@banc-varelo.test');
  end loop;
  v_attente := (tests.c4_reprise(v[6])).envoi1_id;
  return next is(private.offload_surveiller(v_client), null, 'Tout va bien : la surveillance ne dit rien');
  -- Deux messages reviennent en rebond : l'ouvrier le note par la voie du socle (noter_remise), qui publie
  -- envoi.non_remis.offload ; le module le lit à son passage.
  -- Les envois et leur fournisseur sont lus avant d'endosser l'ouvrier : le rôle de service n'exécute pas les aides de test.
  select array_agg(e.id order by e.id), array_agg(e.fournisseur order by e.id) into v_rebonds, v_fournisseurs
  from public.envois e where e.id in ((tests.c4_reprise(v[1])).envoi1_id, (tests.c4_reprise(v[2])).envoi1_id);
  if to_regprocedure('tests.endosser_serveur()') is not null then
    execute 'select tests.endosser_serveur()';
  end if;
  for k in 1 .. 2 loop
    perform private.noter_remise(v_fournisseurs[k], 'essai:c4:' || v_rebonds[k]::text, 'rebond', '{"code": "550", "raison": "boîte inexistante"}'::jsonb);
  end loop;
  perform tests.redevenir_admin();
  perform private.offload_traiter_travaux(50);
  return next ok((select c.verification = 'echec' and c.verification_motif like '%n''a pas été remis%' from public.offload_comptes c where c.id = v[1]),
                 'Un message non remis met le compte « à vérifier »');
  return next ok(private.offload_ecarte(v[1]) like 'À vérifier :%', 'Il ne repart dans aucune vague tant que son état n''est pas tranché');
  -- Deux sur cinq non remis : au-delà de 20 %, OFFLOAD s'arrête.
  return next ok(private.offload_suspendu(v_client), 'Au premier doute (2 messages non remis sur 5), OFFLOAD s''arrête de lui-même');
  select g.suspendu_motif into v_motif from public.offload_reglages g where g.client_id = v_client;
  return next ok(v_motif like '2 messages sur 5 n''ont pas été remis%', 'Le motif de l''arrêt est écrit : ' || coalesce(v_motif, ''));
  return next is((select e.statut from public.envois e where e.id = v_attente), 'annule', 'Le message qui attendait sa validation est annulé');
  return next ok(exists (select 1 from public.alertes a where a.client_id = v_client and a.niveau = 'critique' and a.titre like 'OFFLOAD s''est arrêté%'),
                 'Et vous le signale : alerte critique');
  return next is(private.offload_cycle(v_client, null) ->> 'bloque', 'suspendu', 'Suspendu, le cycle ne prépare rien');
  v := v || tests.c4_compte_courriel('CC7', 'Compte coupe-circuit 7', 'cc7@coupe.test', 70);
  perform private.offload_detecter(v_client, null);
  return next throws_ok(format('select private.offload_ouvrir(%L::uuid, %L)', v[7], 'manuel'), '55000', null,
                        'Suspendu, aucune reprise ne s''ouvre, même à la main');

  -- Seul un gérant ou un admin relance, en disant ce qui a été vérifié.
  v_collab := tests.c4_compte(v_client, 'valideur', 'valideur-c4-cc@banc-varelo.test');
  perform tests.endosser(v_collab, 'valideur-c4-cc@banc-varelo.test');
  return next throws_ok(format('select public.offload_reprendre(%L::uuid, %L)', v_client, 'vu'), '42501', null,
                        'Un valideur ne relance pas OFFLOAD');
  perform tests.endosser((banc ->> 'gerant')::uuid, 'gerant@banc-varelo.test');
  return next throws_ok(format('select public.offload_reprendre(%L::uuid, null)', v_client), '22023', null,
                        'Relancer se justifie');
  perform public.offload_reprendre(v_client, 'Adresses vérifiées avec le commercial.');
  perform public.offload_lever_verification(v[1], 'Nouvelle adresse notée.');
  perform tests.redevenir_admin();
  return next ok(not private.offload_suspendu(v_client)
                 and exists (select 1 from public.journal_opposable j where j.client_id = v_client and j.action = 'offload.repris'),
                 'Le gérant relance OFFLOAD ; c''est au journal');
  return next ok((select c.verification is null from public.offload_comptes c where c.id = v[1]), 'La vérification se lève par une personne');

  -- Suspension à la main.
  perform tests.endosser((banc ->> 'gerant')::uuid, 'gerant@banc-varelo.test');
  perform public.offload_suspendre(v_client, 'Salon cette semaine, on coupe.');
  perform tests.redevenir_admin();
  return next ok(private.offload_suspendu(v_client), 'OFFLOAD se suspend aussi à la main');
end $f$;

create or replace function tests.test_c4_10_reponses_automatiques() returns setof text
language plpgsql as $f$
declare
  banc jsonb := tests.c4_banc();
  v_client uuid := (banc ->> 'client')::uuid;
  v_abs uuid; v_dep uuid;
  r public.offload_reprises;
begin
  perform tests.c4_reprises_pretes();
  v_abs := tests.c4_compte_courriel('AU1', 'Transports Moreau', 'achats@moreau.test', 70);
  v_dep := tests.c4_compte_courriel('AU2', 'Imprimerie Collet', 'f.collet@collet.test', 70);
  perform private.offload_detecter(v_client, null);
  perform private.offload_cycle(v_client, null);
  r := tests.c4_reprise(v_abs);
  perform tests.c4_evenement_envoi(r.envoi1_id, 'envoye');
  perform public.deposer_reception(v_client, 'email', 'contact@sogexal.test', 'msg-c4-auto1', 'achats@moreau.test', null,
    'Réponse automatique : absent', E'Bonjour,\nJe suis absent jusqu''au 20 octobre. De retour le lundi 21.\n', null, '[]'::jsonb,
    jsonb_build_object('envoi_id', r.envoi1_id), now());
  perform private.offload_traiter_travaux(50);
  r := tests.c4_reprise(v_abs);
  return next ok(r.statut = 'envoyee' and r.repondu_le is null, 'Une réponse d''absence n''arrête pas la séquence (statut ' || r.statut || ')');
  return next ok(exists (select 1 from public.journal_opposable j where j.client_id = v_client and j.action = 'offload.reponse_auto'),
                 'Elle est notée au journal');

  r := tests.c4_reprise(v_dep);
  perform tests.c4_evenement_envoi(r.envoi1_id, 'envoye');
  perform public.deposer_reception(v_client, 'email', 'contact@sogexal.test', 'msg-c4-auto2', 'f.collet@collet.test', null,
    'Réponse automatique', E'Bonjour,\nFrançois Collet ne fait plus partie de l''entreprise. Ce message n''est plus consulté.\n', null, '[]'::jsonb,
    jsonb_build_object('envoi_id', r.envoi1_id), now());
  perform private.offload_traiter_travaux(50);
  r := tests.c4_reprise(v_dep);
  return next ok((select c.verification = 'reattribuer' from public.offload_comptes c where c.id = v_dep),
                 'Un départ est reconnu : le compte est signalé comme à réattribuer');
  return next ok(r.statut = 'close' and r.issue = 'abandon', 'La reprise est close, sans compter le départ comme une réponse');
  return next ok(exists (select 1 from public.offload_taches t where t.compte_id = v_dep and t.titre like 'Trouver le nouvel interlocuteur%'
                         and t.detail like '%ne devine pas le successeur%'),
                 'Le système ne devine pas le successeur : une personne cherche le nouvel interlocuteur');
  return next ok(private.offload_ecarte(v_dep) like 'À vérifier :%', 'Le compte sort des vagues jusqu''à sa réattribution');
  return next ok(private.offload_reponse_auto(null, E'Oui, rappelez-moi.\n\n> Je suis absent') is null,
                 'Une vraie réponse qui cite une absence n''est pas prise pour une réponse automatique');
end $f$;

create or replace function tests.test_c4_10_groupes() returns setof text
language plpgsql as $f$
declare
  banc jsonb := tests.c4_banc();
  v_client uuid := (banc ->> 'client')::uuid;
  v1 uuid; v2 uuid; v3 uuid;
  g jsonb;
  x jsonb;
begin
  perform tests.c4_reprises_pretes();
  v1 := tests.c4_compte_courriel('GM1', 'Dubreuil Nord SAS', 'nord@dubreuil-groupe.test', 70);
  v2 := tests.c4_compte_courriel('GM2', 'Dubreuil Sud SAS', 'sud@dubreuil-groupe.test', 10);
  v3 := tests.c4_compte_courriel('GM3', 'Dubreuil Services', 'services@dubreuil-groupe.test', 10);
  update public.offload_achats set montant_ht = 1000 where compte_id = v2;
  perform private.offload_detecter(v_client, null);

  perform tests.endosser((banc ->> 'gerant')::uuid, 'gerant@banc-varelo.test');
  g := public.offload_groupes(v_client);
  return next ok(exists (select 1 from jsonb_array_elements(g -> 'a_rattacher') d where d ->> 'domaine' = 'dubreuil-groupe.test'
                         and jsonb_array_length(d -> 'comptes') = 3),
                 'Trois raisons sociales sur le même domaine de courriel sont proposées au rattachement');
  perform public.offload_rattacher_groupe(array[v1, v2, v3], 'Groupe Dubreuil');
  g := public.offload_groupes(v_client);
  perform tests.redevenir_admin();
  x := (select y from jsonb_array_elements(g -> 'groupes') y where y ->> 'nom' = 'Groupe Dubreuil');
  return next ok((x ->> 'nb')::integer = 3 and jsonb_array_length(x -> 'comptes') = 3
                 and (x ->> 'ca_12m')::numeric = (select sum(s.ca_12m) from public.offload_signaux s where s.compte_id in (v1, v2, v3)),
                 'Les entités du groupe sont regroupées sous la raison sociale mère, chiffre consolidé : ' || coalesce(x::text, 'rien'));
  return next ok(x ->> 'pire_niveau' in ('eteint', 'decroche', 'ralentit', 'saison'), 'Le groupe porte le pire signal de ses entités');
  return next ok(not exists (select 1 from jsonb_array_elements(g -> 'a_rattacher') d where d ->> 'domaine' = 'dubreuil-groupe.test'),
                 'Rattachées, elles ne sont plus proposées');
  return next ok(exists (select 1 from public.journal_opposable j where j.client_id = v_client and j.action = 'offload.groupe'),
                 'Le rattachement est au journal');
end $f$;

select * from runtests('tests'::name, '^test_c4_10_');
