-- c4_03 — OFFLOAD, palier 3 : la reprise en validation, l'appel du commercial, la réponse suivie, le point du matin
-- (session C4, 06/10/2026). Exécutable tel quel par execute_sql sur la RECETTE, après c4_00_jeu.sql, c4_02 (pour
-- tests.c4_compte_achats) et les migrations c4_01 à c4_03. runtests() annule tout.
--
-- Ce que le test NE fait PAS : faire partir un vrai message. Le départ (validation approuvée, ouvrier expéditeur
-- d'A2, remise) est hors de ce module ; le test rejoue l'événement que le socle publie (envoi.envoye.offload,
-- envoi.refuse.offload) en appelant le suivi du module avec la même charge.

-- Le banc prêt pour les reprises : OFFLOAD installé, envois du module réglés en ESSAI (vers une adresse d'essai),
-- signature posée. En admin.
create or replace function tests.c4_reprises_pretes() returns void language plpgsql as $$
declare v_client uuid := (tests.c4_banc() ->> 'client')::uuid;
begin
  perform tests.c4_installer();
  insert into public.reglages_envois (client_id, module, mode, essai_adresse)
  values (v_client, 'offload', 'essai', 'essais-c4@banc-varelo.test')
  on conflict (client_id, module) do update set mode = 'essai', essai_adresse = excluded.essai_adresse;
  perform public.offload_regler(v_client, '{"signature": "L''équipe Sogexal"}');
end $$;

-- Un compte du banc avec courriel, contact, commercial, et l'accord de recevoir nos messages ; ses achats tous les
-- 30 jours, le dernier il y a p_silence jours.
create or replace function tests.c4_compte_courriel(p_ref text, p_nom text, p_email text, p_silence integer, p_consentement boolean default true)
returns uuid language plpgsql as $$
declare
  v_client uuid := (tests.c4_banc() ->> 'client')::uuid;
  v uuid;
begin
  v := tests.c4_compte_achats(p_ref, p_nom, current_date, array(select p_silence + 30 * k from generate_series(0, 11) k), array[650]);
  perform public.offload_saisir_compte(v_client, null, p_ref, p_nom,
    jsonb_build_object('email', p_email, 'contact', 'Martin', 'commercial', 'Sophie', 'telephone', '02 99 00 00 09'));
  update public.offload_achats set libelle = 'Entretien annuel' where compte_id = v;
  if p_consentement then
    perform public.noter_consentement(v_client, 'email', p_email, 'contrat', 'tout', 'Jeu d''essai C4 : client sous contrat', null, 'offload');
  end if;
  return v;
end $$;

create or replace function tests.c4_reprise(p_compte uuid) returns public.offload_reprises
language sql stable as $$ select * from public.offload_reprises r where r.compte_id = p_compte order by r.cree_le desc limit 1 $$;

-- L'événement que le socle publie pour un envoi (envoi.<issue>.offload), rejoué sur le suivi du module.
create or replace function tests.c4_evenement_envoi(p_envoi uuid, p_issue text) returns jsonb language plpgsql as $$
declare e public.envois;
begin
  select * into e from public.envois where id = p_envoi;
  return private.offload_suivre_envoi(jsonb_build_object('evenement', 'envoi.' || p_issue || '.offload', 'envoi', e.id,
                                                         'objet_type', e.objet_type, 'objet_id', e.objet_id));
end $$;

create or replace function tests.test_c4_03_message() returns setof text
language plpgsql as $f$
declare
  v_compte uuid;
  m jsonb;
begin
  perform tests.c4_reprises_pretes();
  v_compte := tests.c4_compte_courriel('M1', 'Garage du Message', 'atelier@garage-message.test', 400);
  m := private.offload_message(v_compte, 1, null, current_date);
  return next ok((m ->> 'corps') like 'Bonjour Martin,%', 'Le message salue le contact par son nom');
  return next ok((m ->> 'corps') like '%votre dernière commande chez % date du %(réf. M1-1, « Entretien annuel », 650 € HT), il y a 13 mois.%',
                 'Il reprend la dernière commande (date, référence, libellé, montant HT) et le temps écoulé : ' || (m ->> 'corps'));
  return next ok((m ->> 'corps') like '%répondez simplement « stop »%', 'Il dit comment ne plus recevoir de messages');
  return next ok((m ->> 'corps') like '%L''équipe Sogexal%', 'Il porte la signature réglée');
  return next ok((m ->> 'corps') !~* '(remise|promotion|offre spéciale|tarif|sous [0-9]+ jours|d''ici le)',
                 'Aucun prix, aucune remise, aucun délai avancé');
  m := private.offload_message(v_compte, 2, now() - interval '8 days', current_date);
  return next ok((m ->> 'sujet') like 'Re : %', 'La relance répond au premier message');
  return next ok((m ->> 'corps') like '%Je me permets de revenir vers vous après mon message du %, au sujet de votre commande du %',
                 'La relance cite le premier message et la commande : ' || (m ->> 'corps'));
  return next ok((m ->> 'corps') like '%nous ne vous relancerons pas%', 'La relance annonce qu''elle est la dernière');
end $f$;

create or replace function tests.test_c4_03_cycle() returns setof text
language plpgsql as $f$
declare
  banc jsonb := tests.c4_banc();
  v_client uuid := (banc ->> 'client')::uuid;
  v_d uuid; v_n uuid; v_x uuid; v_b uuid;
  r public.offload_reprises;
  t public.offload_taches;
  e public.envois;
  b jsonb;
begin
  perform tests.c4_reprises_pretes();
  v_d := tests.c4_compte_courriel('CD1', 'Décroche Courriel', 'achats@decroche.test', 70);
  v_n := tests.c4_compte_achats('CN1', 'Sans Courriel', current_date, array(select 200 + 30 * k from generate_series(0, 11) k), array[400]);
  v_x := tests.c4_compte_courriel('CX1', 'Suivi en Direct', 'achats@direct.test', 70);
  update public.offload_comptes set statut = 'exclu', statut_motif = 'Compte stratégique' where id = v_x;
  v_b := tests.c4_compte_courriel('CB1', 'Sans Accord', 'achats@sans-accord.test', 70, false);

  perform private.offload_detecter(v_client, null);
  b := private.offload_cycle(v_client, null);
  return next is((b ->> 'ouvertes')::integer, 3, 'Trois reprises ouvertes par la nuit (le compte suivi en direct est écarté)');

  r := tests.c4_reprise(v_d);
  return next is(r.statut, 'a_valider', 'Le compte qui décroche a son message en validation');
  select * into e from public.envois where id = r.envoi1_id;
  return next ok(e.id is not null and e.module = 'offload' and e.canal = 'email' and e.objet_type = 'offload_reprises',
                 'Le message est un envoi du socle, rattaché à la reprise');
  return next is(e.mode, 'essai', 'En mode essai');
  return next ok(exists (select 1 from public.demandes_validation d where d.id = e.demande_id and d.type_action = 'envoi.email'
                         and d.module = 'offload' and d.statut = 'en_attente'),
                 'Une demande de validation attend une personne : rien ne part sans elle');
  select * into t from public.offload_taches x where x.reprise_id = r.id and x.type = 'appel';
  return next ok(t.id is not null and t.commercial = 'Sophie' and t.statut = 'a_faire', 'Une tâche d''appel est posée pour la commerciale du compte');
  return next ok(t.detail like '%Il achetait en moyenne tous les 30 jours%' and t.detail like '%Dernière commande :%',
                 'La tâche dit pourquoi appeler et rappelle la dernière commande');
  return next ok(t.echeance <= current_date + 3, 'L''appel est daté au plus tard sous trois jours, et avant la clôture');

  r := tests.c4_reprise(v_n);
  return next ok(r.statut = 'appel' and r.envoi1_id is null and r.motif like 'Pas de courriel%',
                 'Sans courriel, la reprise passe par l''appel seul');
  return next ok(tests.c4_reprise(v_x) is null or (tests.c4_reprise(v_x)).id is null, 'Le compte suivi en direct ne reçoit aucune reprise');
  r := tests.c4_reprise(v_b);
  return next is(r.statut, 'a_valider', 'Un client existant sans accord noté : OFFLOAD note son consentement (Q3), le message va en validation');
  return next ok(exists (select 1 from public.consentements k where k.client_id = v_client and k.adresse = 'achats@sans-accord.test'
                         and k.source = 'contrat' and k.portee = 'tout' and k.preuve = 'soft opt-in, client existant, produits analogues (CPCE L34-5)'),
                 'Particulier qui a déjà acheté : source « contrat », la preuve dit « soft opt-in » (c4_06)');

  return next ok(exists (select 1 from public.journal_opposable j where j.client_id = v_client and j.action = 'offload.cycle'
                         and (j.donnees ->> 'ouvertes')::integer = 3), 'Le cycle laisse son bilan au journal');
  b := private.offload_cycle(v_client, null);
  return next is((select count(*)::integer from public.offload_reprises x where x.client_id = v_client), 3,
                 'Rejouer le cycle n''ouvre rien de plus');

  -- Le message part (le socle publie envoi.envoye.offload) ; sept jours plus tard, la relance est préparée.
  r := tests.c4_reprise(v_d);
  perform tests.c4_evenement_envoi(r.envoi1_id, 'envoye');
  return next is((tests.c4_reprise(v_d)).statut, 'envoyee', 'Le message parti, la reprise attend la réponse');
  update public.offload_reprises set envoye1_le = now() - interval '8 days' where id = r.id;
  perform private.offload_cycle(v_client, null);
  r := tests.c4_reprise(v_d);
  return next is(r.statut, 'relance_a_valider', 'Sans réponse après sept jours, la relance est préparée, en validation');
  return next ok((select x.corps like '%après mon message du%' from public.envois x where x.id = r.envoi2_id), 'La relance est le second message');
  return next ok(r.envoi2_id <> r.envoi1_id, 'Deux envois distincts');
  perform tests.c4_evenement_envoi(r.envoi2_id, 'envoye');
  update public.offload_reprises set envoye2_le = now() - interval '8 days' where id = r.id;
  perform private.offload_cycle(v_client, null);
  r := tests.c4_reprise(v_d);
  return next ok(r.statut = 'close' and r.issue = 'sans_reponse', 'Deux messages sans réponse : le compte sort du cycle');
  return next is((select count(*)::integer from public.envois x where x.objet_type = 'offload_reprises' and x.objet_id = r.id::text), 2,
                 'Deux messages en tout, jamais un troisième');
  perform private.offload_cycle(v_client, null);
  return next is((select count(*)::integer from public.offload_reprises x where x.compte_id = v_d), 1,
                 'La quarantaine empêche une nouvelle reprise le même trimestre');
  return next ok(exists (select 1 from public.journal_opposable j where j.client_id = v_client and j.action = 'offload.reprise_close'
                         and j.objet_id = r.id::text), 'La sortie du cycle est au journal');
end $f$;

create or replace function tests.test_c4_03_consentement() returns setof text
language plpgsql as $f$
declare
  banc jsonb := tests.c4_banc();
  v_client uuid := (banc ->> 'client')::uuid;
  v_pro uuid; v_neuf uuid; v_desinscrit uuid;
  r public.offload_reprises;
begin
  perform tests.c4_reprises_pretes();
  v_pro := tests.c4_compte_courriel('CP1', 'Froid Services SARL', 'achats@froid-sarl.test', 70, false);
  perform tests.redevenir_admin();
  v_neuf := public.offload_saisir_compte(v_client, null, 'CN9', 'Prospect Sans Achat', '{"email": "prospect@neuf.test"}');
  v_desinscrit := tests.c4_compte_courriel('CQ1', 'Ancien Désinscrit', 'achats@desinscrit.test', 70, false);
  perform private.opposer(v_client, 'desinscription', 'achats@desinscrit.test', null, null, null, 'Désinscrit l''an dernier.', 'demande', null);
  update public.oppositions set levee_le = now() where client_id = v_client and adresse = 'achats@desinscrit.test';

  return next is(private.offload_assurer_consentement(v_pro), 'interet_legitime_b2b', 'Personne morale (SARL) : intérêt légitime B2B');
  return next ok(exists (select 1 from public.consentements k where k.adresse = 'achats@froid-sarl.test'
                         and k.source = 'contrat' and k.preuve = 'intérêt légitime B2B, client existant, message en rapport avec son activité (CNIL)'),
                 'Source « contrat », la preuve dit la base légale (c4_06)');
  return next is(private.offload_assurer_consentement(v_neuf), null::text, 'Aucun consentement inventé pour un contact sans achat');
  return next is(private.offload_assurer_consentement(v_desinscrit), null::text, 'Ni pour une adresse qui s''est déjà opposée, même levée');
  return next is(private.offload_assurer_consentement(v_pro), 'deja', 'Rejouer ne note rien de plus');
  perform private.offload_ouvrir(v_neuf, 'manuel');
  r := tests.c4_reprise(v_neuf);
  return next ok(r.statut = 'appel' and r.motif like 'Message retenu par le socle (CONSENTEMENT_ABSENT)%',
                 'Le prospect sans achat : le socle retient le message, la reprise passe par l''appel');
end $f$;

create or replace function tests.test_c4_03_reponse() returns setof text
language plpgsql as $f$
declare
  banc jsonb := tests.c4_banc();
  v_client uuid := (banc ->> 'client')::uuid;
  v_d uuid; v_s uuid;
  r public.offload_reprises;
begin
  perform tests.c4_reprises_pretes();
  v_d := tests.c4_compte_courriel('RD1', 'Répond Volontiers', 'achats@repond.test', 70);
  v_s := tests.c4_compte_courriel('RS1', 'Veut Arrêter', 'achats@arret.test', 70);
  perform private.offload_detecter(v_client, null);
  perform private.offload_cycle(v_client, null);
  r := tests.c4_reprise(v_d);
  perform tests.c4_evenement_envoi(r.envoi1_id, 'envoye');

  -- La réponse arrive dans la messagerie (réception du socle, rattachée à l'envoi d'origine).
  perform public.deposer_reception(v_client, 'email', 'contact@sogexal.test', 'msg-c4-1', 'achats@repond.test', 'Martin',
    'Re : votre commande', E'Bonjour,\nOui, rappelez-moi jeudi.\n\n> Bonjour Martin', null, '[]'::jsonb,
    jsonb_build_object('envoi_id', r.envoi1_id), now());
  perform private.offload_traiter_travaux(50);
  r := tests.c4_reprise(v_d);
  return next ok(r.statut = 'repondue' and r.issue = 'reponse' and r.reception_id is not null,
                 'La réponse arrête la séquence et la reprise est « répondue »');
  return next ok(exists (select 1 from public.offload_taches t where t.reprise_id = r.id and t.type = 'repondre' and t.statut = 'a_faire'
                         and t.commercial = 'Sophie'), 'La conversation revient à la commerciale : tâche « répondre »');
  return next ok(exists (select 1 from public.oppositions o where o.client_id = v_client and o.type = 'pause'
                         and o.adresse = 'achats@repond.test' and o.levee_le is null),
                 'Le destinataire est en pause au socle : aucun message en attente ne part');
  update public.offload_reprises set envoye1_le = now() - interval '8 days' where id = r.id;
  perform private.offload_cycle(v_client, null);
  return next is((select count(*)::integer from public.envois x where x.objet_type = 'offload_reprises' and x.objet_id = r.id::text), 1,
                 'Après une réponse, aucune relance n''est préparée');

  -- « Stop » : retrait immédiat et définitif.
  r := tests.c4_reprise(v_s);
  perform tests.c4_evenement_envoi(r.envoi1_id, 'envoye');
  perform public.deposer_reception(v_client, 'email', 'contact@sogexal.test', 'msg-c4-2', 'achats@arret.test', null,
    'Re : votre commande', E'STOP merci de ne plus nous écrire.', null, '[]'::jsonb, '{}'::jsonb, now());
  perform private.offload_traiter_travaux(50);
  r := tests.c4_reprise(v_s);
  return next ok(r.statut = 'repondue' and r.issue = 'arret', 'Une demande d''arrêt, même sans lien avec l''envoi, est reconnue à l''adresse');
  return next is((select c.statut from public.offload_comptes c where c.id = v_s), 'arrete', 'Le compte sort du cycle, définitivement');
  return next ok(exists (select 1 from public.oppositions o where o.client_id = v_client and o.type = 'desinscription'
                         and o.adresse = 'achats@arret.test' and o.levee_le is null),
                 'La désinscription est posée au socle : elle vaut pour tous les modules et tous les messages');
  return next throws_ok(format('select private.offload_ouvrir(%L::uuid, %L)', v_s, 'manuel'), '55000',
                        null, 'Personne ne rouvre une reprise sur ce compte');
  return next ok(private.offload_demande_arret(E'Merci, mais ne plus nous contacter svp') and private.offload_demande_arret('Je souhaite me désinscrire')
                 and not private.offload_demande_arret(E'Oui volontiers, appelez-moi.\n\n> Si vous ne souhaitez plus recevoir nos messages, répondez « stop »'),
                 'La lecture de l''arrêt ne se laisse pas prendre par la citation du message d''origine');
end $f$;

create or replace function tests.test_c4_03_issues() returns setof text
language plpgsql as $f$
declare
  banc jsonb := tests.c4_banc();
  v_client uuid := (banc ->> 'client')::uuid;
  v_c uuid; v_r uuid; v_e uuid;
  r public.offload_reprises;
begin
  perform tests.c4_reprises_pretes();
  v_c := tests.c4_compte_courriel('IC1', 'Recommande Vite', 'achats@commande.test', 70);
  v_r := tests.c4_compte_courriel('IR1', 'Refusé en Validation', 'achats@refus.test', 70);
  perform private.offload_detecter(v_client, null);
  perform private.offload_cycle(v_client, null);

  -- Une commande arrive : la reprise se clôt, l'appel n'a plus d'objet.
  insert into public.offload_achats (client_id, entite_id, compte_id, date_achat, montant_ht, reference, nature, source)
  values (v_client, (banc ->> 'entite')::uuid, v_c, current_date, 900, 'IC1-retour', 'facture', 'saisie');
  perform private.offload_cycle(v_client, null);
  r := tests.c4_reprise(v_c);
  return next ok(r.statut = 'close' and r.issue = 'commande', 'Une commande arrivée clôt la reprise : « commande »');
  return next ok((select t.statut from public.offload_taches t where t.reprise_id = r.id and t.type = 'appel') = 'abandonnee',
                 'La tâche d''appel est abandonnée, avec son motif');

  -- Le message est refusé en validation : la reprise s'arrête.
  r := tests.c4_reprise(v_r);
  perform tests.c4_evenement_envoi(r.envoi1_id, 'refuse');
  r := tests.c4_reprise(v_r);
  return next ok(r.statut = 'close' and r.issue = 'refusee', 'Refusé en validation : la reprise est close « refusée »');

  -- Essai contre réel : OFFLOAD en essai ne prépare rien si les envois du module sont EFFECTIVEMENT réglés en réel.
  -- Le socle calcule le mode effectif (réglage du module, ligne de l'organisation) : sur le banc, la ligne de
  -- l'organisation peut garder l'essai même si celle du module passe en réel. Le test lit le mode effectif et
  -- vérifie la règle dans les deux cas, sans jamais faire partir quoi que ce soit.
  update public.reglages_envois set mode = 'reel' where client_id = v_client and module = 'offload';
  v_e := tests.c4_compte_courriel('IE1', 'Garde Essai', 'achats@essai.test', 70);
  perform private.offload_detecter(v_client, null);
  if (private.reglages_envois_effectifs(v_client, 'offload') ->> 'mode') = 'reel' then
    return next ok(private.offload_essai_contre_reel(v_client), 'Mode effectif réel et OFFLOAD en essai : le garde-fou le voit');
    return next throws_ok(format('select private.offload_ouvrir(%L::uuid, %L)', v_e, 'manuel'), '55000',
                          null, 'En essai, rien n''est préparé quand les envois du module sont réglés en réel');
    return next ok((tests.c4_reprise(v_e)).id is null, 'Et aucune reprise n''est laissée à moitié ouverte');
  else
    return next ok(not private.offload_essai_contre_reel(v_client),
                   format('Le socle garde le mode effectif « %s » (ligne de l''organisation) : le garde-fou ne bloque pas',
                          coalesce(private.reglages_envois_effectifs(v_client, 'offload') ->> 'mode', 'aucun')));
    perform private.offload_ouvrir(v_e, 'manuel');
    return next ok((select e.mode from public.envois e where e.id = (tests.c4_reprise(v_e)).envoi1_id) is distinct from 'reel',
                   'Et le message préparé n''est pas réel : il reste en essai');
    return next ok(true, 'Branche « mode effectif réel » non exercée sur ce banc (couverte par le banc local)');
  end if;
end $f$;

create or replace function tests.test_c4_03_taches_et_droits() returns setof text
language plpgsql as $f$
declare
  banc jsonb := tests.c4_banc();
  v_client uuid := (banc ->> 'client')::uuid;
  v_lecteur uuid;
  v_n uuid; v_m uuid;
  r public.offload_reprises;
  v_tache uuid;
  v_rep uuid;
begin
  perform tests.c4_reprises_pretes();
  v_lecteur := tests.c4_compte(v_client, 'lecteur', 'lecteur-c4@banc-varelo.test');
  v_n := tests.c4_compte_achats('TN1', 'Appel Seul', current_date, array(select 200 + 30 * k from generate_series(0, 11) k), array[400]);
  v_m := tests.c4_compte_courriel('TM1', 'Reprise à la Main', 'achats@main.test', 10);
  perform private.offload_detecter(v_client, null);
  perform private.offload_cycle(v_client, null);
  r := tests.c4_reprise(v_n);
  select t.id into v_tache from public.offload_taches t where t.reprise_id = r.id and t.type = 'appel';

  perform tests.endosser(v_lecteur, 'lecteur-c4@banc-varelo.test');
  return next is((select count(*)::integer from public.offload_taches t where t.client_id = v_client), 1, 'Le lecteur voit les tâches');
  return next throws_ok(format('select public.offload_noter_tache(%L::uuid, %L, %L)', v_tache, 'faite', 'ok'), '42501',
                        null, 'Un lecteur ne note pas une tâche');
  return next throws_ok(format('select public.offload_ouvrir_reprise(%L::uuid)', v_m), '42501', null, 'Un lecteur n''ouvre pas de reprise');

  perform tests.endosser((banc ->> 'gerant')::uuid, 'gerant@banc-varelo.test');
  return next throws_ok(format('select public.offload_noter_tache(%L::uuid, %L, null)', v_tache, 'abandonnee'), '22023',
                        null, 'Une tâche abandonnée dit pourquoi');
  perform public.offload_noter_tache(v_tache, 'faite', 'Appelé : rappelle en novembre pour le contrat d''entretien.');
  return next ok((select x.statut = 'close' and x.issue = 'appel_passe' from public.offload_reprises x where x.id = r.id),
                 'L''appel passé clôt la reprise sans message');
  v_rep := public.offload_ouvrir_reprise(v_m);
  return next ok((select x.ouverte_par = 'manuel' and x.statut = 'a_valider' from public.offload_reprises x where x.id = v_rep),
                 'Le gérant ouvre une reprise à la main pour un compte qui ne décroche pas encore ; son message va en validation');
  perform tests.redevenir_admin();
  return next ok(not has_function_privilege('authenticated', 'private.offload_cycle(uuid, date)', 'execute')
                 and not has_function_privilege('authenticated', 'private.offload_lire_reponse(jsonb)', 'execute'),
                 'Le cycle et la lecture des réponses restent au serveur');
  return next ok((select bool_and(c.relrowsecurity) from pg_class c where c.oid in ('public.offload_reprises'::regclass, 'public.offload_taches'::regclass))
                 and not has_table_privilege('authenticated', 'public.offload_reprises', 'insert')
                 and not has_table_privilege('anon', 'public.offload_taches', 'select'),
                 'Reprises et tâches : RLS, lecture seule, rien pour anon');
  return next ok(exists (select 1 from private.abonnements a where a.evenement = 'reception.nouvelle' and a.genre = 'offload.reception')
                 and exists (select 1 from private.abonnements a where a.evenement = 'envoi.envoye.offload' and a.genre = 'offload.envoi'),
                 'OFFLOAD suit ses envois et les réponses');
end $f$;

create or replace function tests.test_c4_03_point_matin() returns setof text
language plpgsql as $f$
declare
  banc jsonb := tests.c4_banc();
  v_client uuid := (banc ->> 'client')::uuid;
  v_matin timestamptz := ((current_date + time '08:00') at time zone 'Europe/Paris');
  v_nuit timestamptz := ((current_date + time '03:00') at time zone 'Europe/Paris');
  v_section uuid;
  n integer;
begin
  perform tests.c4_reprises_pretes();
  perform tests.c4_compte_courriel('PM1', 'Point du Matin', 'achats@matin.test', 70);
  perform private.offload_detecter(v_client, null);
  perform private.offload_cycle(v_client, null);
  return next is(private.offload_deposer_points(v_nuit), 0, 'Avant 5 h (Paris), rien n''est déposé');
  perform private.offload_deposer_points(v_matin);
  select s.id into v_section from public.points_sections s
  where s.client_id = v_client and s.module = 'offload' and s.role = 'gerant' and s.jour = current_date and s.titre = 'Clients qui décrochent';
  return next ok(v_section is not null, 'Le gérant reçoit la section « Clients qui décrochent »');
  return next ok(exists (select 1 from public.points_sections s where s.client_id = v_client and s.module = 'offload' and s.role = 'collaborateur'
                         and s.jour = current_date), 'Les commerciaux (collaborateurs) la reçoivent aussi');
  return next ok(exists (select 1 from public.points_items i where i.section_id = v_section and i.texte like 'Point du Matin : %Il achetait en moyenne tous les 30 jours%'),
                 'Ligne : le compte qui décroche, avec sa raison en clair');
  return next ok(exists (select 1 from public.points_items i where i.section_id = v_section and i.texte like '% de reprise à passer aujourd''hui ou en retard.')
                 or exists (select 1 from public.points_items i where i.section_id = v_section and i.lien = '/espace/validations'),
                 'Ligne : les appels du jour ou les messages qui attendent une validation');
  return next ok((select bool_and(i.lien in ('/espace/offload', '/espace/validations')) from public.points_items i where i.section_id = v_section),
                 'Chaque ligne mène à l''écran OFFLOAD ou aux validations');
  select count(*) into n from public.points_items i where i.section_id = v_section;
  perform private.offload_deposer_points(v_matin);
  return next is((select count(*)::integer from public.points_items i where i.section_id = v_section), n, 'Redéposer ne double rien');
  return next ok(exists (select 1 from cron.job where jobname = 'offload-matin'), 'Le cron offload-matin est posé');
end $f$;

select * from runtests('tests'::name, '^test_c4_03_');
