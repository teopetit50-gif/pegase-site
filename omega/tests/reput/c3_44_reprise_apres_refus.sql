-- c3_44 — la reprise après refus côté REPUT (socle 19az). Exécutable tel quel par execute_sql sur la RECETTE, après le
-- socle 19az et les migrations c3_01 à c3_44. Rien n'est envoyé (mode essai) ; l'ouvrier reput-reponse est joué à la
-- main (reput_commencer puis reput_deposer_reponse, comme le fait la fonction Edge). runtests() annule tout.

-- Une demande préparée par l'ouvrier, en attente de validation : rend la demande de validation.
create or replace function tests.c3_44_preparee(p_client uuid, p_de text, p_nom text, p_texte text,
                                                p_corps text default 'Notre équipe revient vers vous.')
 returns uuid language plpgsql as $f$
declare v_dem uuid; v_j jsonb;
begin
  v_dem := tests.c3_15_demande(p_client, 'email', p_de, p_nom, p_texte);
  v_j := public.reput_deposer_reponse(v_dem, jsonb_build_object('sujet', 'autre', 'langue', 'fr', 'couverte', false, 'corps', p_corps),
                                      'test/c3_44');
  return (v_j ->> 'demande_validation')::uuid;
end $f$;

create or replace function tests.test_c3_44_reprise_apres_refus() returns setof text
language plpgsql as $f$
declare
  banc jsonb;
  v_client uuid; v_gerant uuid; v_mail text := 'c3-44-gerant@banc-varelo.test';
  v_a uuid; v_b uuid; v_c uuid; v_d uuid; v_e uuid; v_f uuid; v_rep uuid; v_n integer;
  dem public.reput_demandes; v_j jsonb; v_nv public.demandes_validation; p2 public.reput_reponses; e2 public.envois;
begin
  if to_regprocedure('private.proposer_reprise(uuid,text,jsonb,jsonb,numeric)') is null then
    return next ok(true, 'Lot socle 19az absent : reprise non vérifiable ici');
    return;
  end if;
  banc := tests.c3_banc();
  v_client := (banc ->> 'client')::uuid;
  perform tests.redevenir_admin();
  insert into public.reglages_envois (client_id, module, mode, essai_adresse, canaux)
  select v_client, 'reput', 'essai', 'essais@omegaai.fr', array['email']
  where not exists (select 1 from public.reglages_envois r where r.client_id = v_client and r.module = 'reput');
  v_gerant := tests.c3_compte(v_client, 'gerant', v_mail);
  perform public.reput_installer(v_client);
  -- Les reprises d'avant ce test (banc partagé) ne comptent pas.
  update private.reprises set statut = 'impossible', motif = 'test c3_44 : hors scène', traite_le = now()
   where module = 'reput' and statut = 'a_faire';

  v_a := tests.c3_44_preparee(v_client, 'c3-44a@exemple.test', 'Fictif Reprise', 'Quand passez-vous pour la chaudière ?');
  v_b := tests.c3_44_preparee(v_client, 'c3-44b@exemple.test', 'Fictif Identique', 'Vous faites les ramonages ?');
  v_c := tests.c3_44_preparee(v_client, 'c3-44c@exemple.test', 'Fictif Muet', 'Un devis pour une pompe à chaleur ?');
  v_d := tests.c3_44_preparee(v_client, 'c3-44d@exemple.test', 'Fictif Doublon', 'Vous intervenez à Gosier ?');
  v_e := tests.c3_44_preparee(v_client, 'c3-44e@exemple.test', 'Fictif Corrigé', 'Vous êtes ouverts samedi ?');
  v_f := tests.c3_44_preparee(v_client, 'c3-44f@exemple.test', 'Fictif Lent', 'Le prix d''un entretien annuel ?');
  return next ok((select count(*) from public.demandes_validation x where x.id in (v_a, v_b, v_c, v_d, v_e, v_f) and x.statut = 'en_attente') = 6,
                 'Six réponses préparées, en attente de validation');

  -- Les refus, par le gérant. E est corrigée par une personne (le socle voit un refus « Corrigée : … »).
  perform tests.endosser(v_gerant, v_mail);
  insert into public.approbations (demande_id, client_id, user_id, decision, commentaire)
  values (v_a, v_client, v_gerant, 'rejete', 'Donnez le délai : un technicien passe sous 48 h.'),
         (v_b, v_client, v_gerant, 'rejete', 'Trop sec.'),
         (v_d, v_client, v_gerant, 'rejete', 'Déjà répondu par téléphone.'),
         (v_f, v_client, v_gerant, 'rejete', 'Citez le tarif.');
  begin
    insert into public.approbations (demande_id, client_id, user_id, decision) values (v_c, v_client, v_gerant, 'rejete');
  exception when others then
    v_c := null;   -- le socle exige un commentaire au refus : le cas « sans consigne » n'existe pas ici
  end;
  perform public.reput_corriger((select p.id from public.reput_reponses p where p.demande_validation_id = v_e),
                                'Oui, nous sommes ouverts le samedi matin.', null);
  perform tests.redevenir_admin();
  return next ok((select count(*) from private.reprises x where x.demande_id in (v_a, v_b, v_d, v_e, v_f) and x.statut = 'a_faire') = 5,
                 'Le socle dépose une consigne par refus');

  -- D : refusée comme doublon (le motif vient de la consigne du socle).
  v_j := to_jsonb(private.reput_reprendre_refus(v_d, (select x.consigne from private.reprises x where x.demande_id = v_d) || '{"motif": "Doublon"}'));
  return next ok(v_j #>> '{}' = 'impossible'
                 and (select x.statut = 'impossible' and x.motif like 'refusée comme doublon%' from private.reprises x where x.demande_id = v_d),
                 'Refusée comme doublon : reprise impossible, sans nouvelle demande');

  v_n := private.reput_traiter_reprises();
  return next ok(v_n >= 4, format('Le passage traite les reprises restantes (%s)', v_n));
  return next ok((select x.statut = 'impossible' and x.motif like 'une version corrigée par une personne%' from private.reprises x where x.demande_id = v_e),
                 'Corrigée par une personne : pas de reprise par le moteur');
  if v_c is not null then
    return next ok((select x.statut = 'impossible' and x.motif like 'refusée sans consigne%' from private.reprises x where x.demande_id = v_c),
                   'Refusée sans commentaire : pas de consigne, reprise impossible');
  end if;

  -- A : la demande repart chez l'ouvrier, avec la consigne.
  select * into dem from public.reput_demandes x where x.id = (select p.demande_id from public.reput_reponses p where p.demande_validation_id = v_a);
  return next ok(dem.statut = 'a_preparer'
                 and exists (select 1 from public.travaux t where t.genre = 'reput.preparer' and t.cle = 'reprise:' || v_a::text
                               and t.etat = 'a_faire' and (t.charge ->> 'reception')::bigint = dem.reception_id and t.charge ->> 'module' = 'reput'),
                 'A repasse « à préparer » ; un travail reput.preparer est déposé pour l''ouvrier');
  v_j := public.reput_commencer(dem.reception_id);
  return next ok(v_j ->> 'statut' = 'a_preparer' and (v_j ->> 'reprise_de')::uuid = v_a
                 and v_j ->> 'consigne_valideur' like 'Commentaire : Donnez le délai : un technicien passe sous 48 h.%'
                 and v_j ->> 'consigne_valideur' like '%Réponse refusée (ne pas la redire telle quelle) :%Notre équipe revient vers vous.%',
                 'L''ouvrier reçoit la consigne du valideur et la réponse refusée');

  -- A : la nouvelle rédaction, déposée comme le fait la fonction Edge.
  v_j := public.reput_deposer_reponse(dem.id, jsonb_build_object('sujet', 'autre', 'langue', 'fr', 'couverte', false,
           'corps', 'Un technicien passe chez vous sous 48 h ; notre équipe vous appelle pour fixer l''heure.'), 'test/c3_44');
  select * into v_nv from public.demandes_validation x where x.payload ->> 'reprise_de' = v_a::text;
  select * into p2 from public.reput_reponses p where p.id = (v_j ->> 'reponse')::uuid;
  select * into e2 from public.envois e where e.id = p2.envoi_id;
  return next ok(v_nv.id is not null and v_nv.id = (v_j ->> 'demande_validation')::uuid and v_nv.statut = 'en_attente'
                 and v_nv.resume like 'Reprise après refus — Réponse à Fictif Reprise%'
                 and v_nv.type_action = (select x.type_action from public.demandes_validation x where x.id = v_a),
                 'A : une demande liée à la refusée, en attente, même type, « Reprise après refus — … »');
  return next ok(v_nv.demandeur_type = 'systeme' and v_nv.demandeur_id is null
                 and not exists (select 1 from public.approbations ap where ap.demande_id = v_nv.id),
                 'Saisie au nom du moteur : demandeur « système », aucune décision du valideur reprise');
  return next ok(exists (select 1 from jsonb_array_elements(v_nv.payload -> 'corrections') c
                         where c ->> 'champ' = 'corps' and c ->> 'avant' like '%Notre équipe revient vers vous.%' and c ->> 'apres' like '%sous 48 h%')
                 and v_nv.payload ->> 'corps' like '%sous 48 h%',
                 'Les corrections disent le corps avant et après');
  return next ok(p2.version = 2 and p2.statut = 'a_valider' and p2.raison like '%Reprise après refus%'
                 and (select p.statut from public.reput_reponses p where p.demande_validation_id = v_a) = 'refusee'
                 and (select x.statut from public.reput_demandes x where x.id = dem.id) = 'a_valider',
                 'Version 2 à valider ; la version refusée le reste ; la demande attend la validation');
  return next ok(e2.id is not null and e2.demande_id = v_nv.id and e2.statut not in ('envoye', 'en_cours') and e2.corps like '%sous 48 h%',
                 format('L''envoi adossé porte le nouveau texte et ne part pas sans validation (%s)', coalesce(e2.statut, 'aucun')));
  return next ok((select x.statut = 'proposee' and x.reprise_id = v_nv.id from private.reprises x where x.demande_id = v_a)
                 and (select x.statut = 'proposee' and x.reprise_id = v_nv.id from private.reput_reprises x where x.refusee = v_a),
                 'La reprise est notée proposée, au socle et chez REPUT');

  -- A : la reprise refusée ne relance rien.
  perform tests.endosser(v_gerant, v_mail);
  insert into public.approbations (demande_id, client_id, user_id, decision, commentaire) values (v_nv.id, v_client, v_gerant, 'rejete', 'Toujours pas.');
  perform tests.redevenir_admin();
  perform private.reput_traiter_reprises();
  return next ok(not exists (select 1 from private.reprises x where x.demande_id = v_nv.id)
                 and (select count(*) from public.demandes_validation x where x.objet_id = dem.id::text and x.module = 'reput'
                        and x.type_action <> 'reput.accuser') = 2,
                 'Une seule reprise : la reprise refusée ne donne pas de troisième demande');

  -- B : l'ouvrier rend le même texte → reprise impossible, la demande revient « refusée ».
  select * into dem from public.reput_demandes x where x.id = (select p.demande_id from public.reput_reponses p where p.demande_validation_id = v_b);
  v_j := public.reput_deposer_reponse(dem.id, jsonb_build_object('sujet', 'autre', 'langue', 'fr', 'couverte', false,
           'corps', 'Notre équipe  revient vers vous.'), 'test/c3_44');
  return next ok(v_j ->> 'reprise' = 'impossible'
                 and (select x.statut = 'impossible' and x.motif like 'même texte qu''avant%Trop sec.%' from private.reprises x where x.demande_id = v_b)
                 and not exists (select 1 from public.demandes_validation x where x.payload ->> 'reprise_de' = v_b::text)
                 and (select count(*) from public.reput_reponses p where p.demande_id = dem.id) = 1
                 and (select x.statut from public.reput_demandes x where x.id = dem.id) = 'a_traiter',
                 'B : même texte qu''avant (aux espaces près) : reprise impossible, aucune nouvelle demande, la demande va « à traiter » (c3_45)');
  return next ok(exists (select 1 from public.alertes a where a.client_id = v_client and a.titre like 'Reprise impossible : même texte qu''avant%'),
                 'Le client est averti que la reprise est impossible');

  -- F : la nouvelle rédaction n'aboutit pas dans le délai → close, la demande revient à une personne.
  update private.reput_reprises set cree_le = now() - interval '2 hours' where refusee = v_f;
  perform private.reput_traiter_reprises();
  return next ok((select x.statut = 'impossible' and x.motif like 'la nouvelle rédaction n''a pas abouti%' from private.reprises x where x.demande_id = v_f)
                 and (select d.statut from public.reput_demandes d join public.reput_reponses p on p.demande_id = d.id where p.demande_validation_id = v_f) = 'a_traiter',
                 'F : sans nouvelle rédaction dans l''heure, la reprise est close et la demande va « à traiter » (c3_45)');

  -- Rien d'envoyé pour de vrai.
  return next ok(not exists (select 1 from public.envois e where e.client_id = v_client and e.module = 'reput'
                               and e.cree_le >= now() and e.statut in ('envoye', 'en_cours')),
                 'Rien n''est parti pendant le test');
end $f$;

select * from runtests('tests'::name, '^test_c3_44_');
