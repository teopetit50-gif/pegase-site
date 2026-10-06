-- B3-15 — Les rappels aux patients (b3_14) : le moyen de contact et l'accord du patient, la préparation des rappels
-- J-2, des relances de plan et des rappels de devis, le verrou santé qui les tient (aucun fournisseur agréé HDS), et
-- la lecture des réponses OUI / NON. Après 00, 00b, b3_01 à b3_14. runtests() annule tout : aucun envoi ne part.
-- Le banc (00b) : R011, Michel Dorville (P008), à J+2 9 h ; D001 (Delannoy, signé J-42, sans rendez-vous) ; D005
-- (Dorville, présenté J-20, 780 €, valable J+160) ; Lucas Mondésir (P007) ne veut pas être contacté.

create or replace function tests.test_b3_15_rappels_patients() returns setof text
language plpgsql as $f$
declare
  banc uuid := tests.b3_banc();
  entite uuid := tests.b3_entite();
  r jsonb;
  res jsonb;
  t jsonb;
  v_dorville uuid;
  v_delannoy uuid;
  v_mondesir uuid;
  v_rdv uuid;
  v_contact uuid;
  v_bis uuid;
  v_j2 uuid;
  v_r1 bigint;
  v_r2 bigint;
  v_r3 bigint;
begin
  r := tests.b3_cabinet_releve('initial');
  select id into v_dorville from public.tiroma_patients where entite_id = entite and source_ref = 'P008';
  select id into v_delannoy from public.tiroma_patients where entite_id = entite and source_ref = 'P001';
  select id into v_mondesir from public.tiroma_patients where entite_id = entite and source_ref = 'P007';
  select id into v_rdv from public.tiroma_rendez_vous where entite_id = entite and source_ref = 'R011';

  -- Le module tiroma du banc, en essai (remise à l'adresse d'essai, jamais au patient).
  perform tests.redevenir_admin();
  insert into public.reglages_envois (client_id, module, mode, essai_adresse, canaux)
  select banc, 'tiroma', 'essai',
         coalesce((select x.essai_adresse from public.reglages_envois x where x.client_id = banc and x.module is null),
                  (select x.essai_adresse from public.reglages_envois x where x.client_id = banc and x.essai_adresse is not null limit 1),
                  'essais@omegaai.fr'),
         array['email', 'sms']
  where not exists (select 1 from public.reglages_envois x where x.client_id = banc and x.module = 'tiroma');

  -- 1. Le moyen de contact et l'accord.
  perform tests.b3_endosser('referent');
  return next throws_ok(format('select public.tiroma_noter_contact(%L, %L, %L, ''email'', ''lucas@b3-patients.test'')', banc, entite, v_mondesir),
                        '22023', null, 'un patient « ne pas contacter » : aucun moyen de contact ne se note (22023)');
  return next throws_ok(format('select public.tiroma_noter_contact(%L, %L, %L, ''whatsapp'', ''+590690000001'')', banc, entite, v_dorville),
                        '22023', null, 'WhatsApp n''est pas proposé (22023)');
  return next throws_ok(format('select public.tiroma_noter_contact(%L, %L, %L, ''email'', ''pas-une-adresse'')', banc, entite, v_dorville),
                        '22023', null, 'une adresse invalide est refusée (22023)');
  return next throws_ok(format('select public.tiroma_noter_contact(%L, %L, %L, ''email'', ''michel@b3-patients.test'', false, false)', banc, entite, v_dorville),
                        '22023', null, 'ni rappels ni relances : rien à noter (22023)');
  v_contact := public.tiroma_noter_contact(banc, entite, v_dorville, 'email', 'Michel@B3-Patients.test', true, true, 'oral', null);
  return next ok(v_contact is not null, 'l''assistante note le courriel de Michel Dorville (rappels et relances, accord oral)');
  return next ok((select c.adresse = 'michel@b3-patients.test' and c.consentement_id is not null from public.tiroma_contacts c where c.id = v_contact),
                 'adresse normalisée, accord rattaché');
  return next ok(exists (select 1 from public.consentements k where k.client_id = banc and k.module = 'tiroma' and k.canal = 'email'
                          and k.adresse = 'michel@b3-patients.test' and k.retire_le is null and k.source = 'oral' and k.preuve is not null),
                 'l''accord est au registre commun des consentements, avec sa preuve');
  v_bis := public.tiroma_noter_contact(banc, entite, v_dorville, 'email', 'michel@b3-patients.test', true, true, 'oral', null);
  return next is(v_bis, v_contact, 'une seconde saisie met à jour le même moyen de contact');
  perform public.tiroma_noter_contact(banc, entite, v_delannoy, 'sms', '+590 690 12 34 56', false, true, 'ecrit', 'Fiche de consentement signée le 06/10.');
  perform tests.b3_endosser('daf2');
  return next throws_ok(format('select public.tiroma_noter_contact(%L, %L, %L, ''email'', ''x@b3-patients.test'')', banc, entite, v_dorville),
                        '42501', null, 'daf2, sans profil, ne note rien (42501)');
  return next is((select count(*) from public.tiroma_contacts), 0::bigint, 'ni ne voit une ligne de contact');

  -- 2. La préparation des rappels.
  perform tests.redevenir_admin();
  res := private.tiroma_preparer_rappels(now(), banc);
  return next ok((res ->> 'j2')::integer >= 1 and (res ->> 'erreurs')::integer = 0, format('rappels préparés : %s', res));
  select e.id into v_j2 from public.envois e
  where e.client_id = banc and e.module = 'tiroma' and e.objet_type = 'tiroma_rendez_vous' and e.objet_id = v_rdv::text and e.canal = 'email';
  return next ok(v_j2 is not null, 'le rappel J-2 du rendez-vous de Michel Dorville (R011) est préparé');
  return next ok((select e.donnees_sante and e.mode = 'essai' and e.transactionnel from public.envois e where e.id = v_j2),
                 'il porte des données de santé, en essai, transactionnel');
  -- Le verrou du socle tient : aucun fournisseur n'est agréé HDS.
  return next is((select e.statut || ':' || coalesce(e.verrou, '') from public.envois e where e.id = v_j2), 'bloque:SANTE_HORS_CANAL_AGREE',
                 'le verrou santé du socle le bloque (aucun fournisseur agréé HDS)');
  return next ok(exists (select 1 from public.envois e where e.client_id = banc and e.module = 'tiroma' and e.cle_idempotence = 'tiroma:devis:'
                          || (select id from public.tiroma_plans where entite_id = entite and source_ref = 'D005')::text),
                 'le rappel du devis D005 (présenté il y a 20 jours) est préparé');
  return next ok(exists (select 1 from public.envois e where e.client_id = banc and e.module = 'tiroma' and e.canal = 'sms'
                          and e.cle_idempotence like 'tiroma:plan:' || (select id from public.tiroma_plans where entite_id = entite and source_ref = 'D001')::text || ':%'),
                 'la relance du plan D001 de Marguerite Delannoy (signé il y a 42 jours) est préparée, par SMS');
  return next ok(not exists (select 1 from public.envois e where e.client_id = banc and e.module = 'tiroma' and e.objet_type = 'tiroma_rendez_vous'
                              and e.objet_id in (select id::text from public.tiroma_rendez_vous where patient_id = v_delannoy)),
                 'Marguerite Delannoy n''accepte que les relances : aucun rappel de rendez-vous pour elle');
  res := private.tiroma_preparer_rappels(now(), banc);
  return next is((select count(*) from public.envois e where e.client_id = banc and e.module = 'tiroma' and e.objet_id = v_rdv::text), 1::bigint,
                 'rejouer la préparation ne double rien (clé d''idempotence)');

  -- 3. Les réponses OUI / NON.
  return next is(private.tiroma_lire_oui_non(E'Oui merci\n\n> Votre rendez-vous'), 'confirme', 'lecture : « Oui merci » = confirmé');
  return next is(private.tiroma_lire_oui_non('Je ne pourrai pas venir'), 'annule', 'lecture : « Je ne pourrai pas venir » = annulé');
  return next ok(private.tiroma_lire_oui_non('Oui mais plutôt jeudi') is null, 'lecture : « Oui mais plutôt jeudi » n''est pas lu');
  v_r1 := (private.deposer_reception(banc, 'email', 'essais@omegaai.fr', 'b3-rep-1', 'michel@b3-patients.test', 'Michel Dorville',
             'Re: Votre rendez-vous', E'OUI\n\n> Votre rendez-vous', null, '[]'::jsonb,
             jsonb_build_object('module', 'tiroma', 'envoi_id', v_j2)) ->> 'id')::bigint;
  v_r2 := (private.deposer_reception(banc, 'email', 'essais@omegaai.fr', 'b3-rep-2', 'michel@b3-patients.test', 'Michel Dorville',
             'Re: Votre rendez-vous', 'Non désolé, je ne pourrai pas venir', null, '[]'::jsonb,
             jsonb_build_object('module', 'tiroma', 'envoi_id', v_j2)) ->> 'id')::bigint;
  v_r3 := (private.deposer_reception(banc, 'email', 'essais@omegaai.fr', 'b3-rep-3', 'michel@b3-patients.test', 'Michel Dorville',
             'Re: Votre rendez-vous', 'Est-ce que je peux venir plus tôt ?', null, '[]'::jsonb,
             jsonb_build_object('module', 'tiroma', 'envoi_id', v_j2)) ->> 'id')::bigint;
  return next is((select count(*)::int from public.travaux x where x.genre = 'tiroma.reception' and x.etat = 'a_faire'
                  and (x.charge ->> 'reception')::bigint in (v_r1, v_r2, v_r3)), 3, 'chaque réponse dépose un travail tiroma.reception');
  perform private.tiroma_ouvrier_reponses(50);
  return next is((select q.reponse from public.tiroma_reponses_rappels q where q.reception_id = v_r1), 'confirme', '« OUI » : confirmé');
  return next is((select q.reponse from public.tiroma_reponses_rappels q where q.reception_id = v_r2), 'annule', '« Non désolé, je ne pourrai pas venir » : annulé');
  return next is((select q.reponse from public.tiroma_reponses_rappels q where q.reception_id = v_r3), 'a_lire', 'une question : à lire');
  return next ok(exists (select 1 from public.alertes a where a.client_id = banc and a.titre like 'Un patient annonce qu''il ne viendra pas%libérez le créneau%'),
                 'NON : une alerte demande de libérer le créneau dans le logiciel (sans nom dans le titre)');
  return next is((select x.statut from public.receptions x where x.id = v_r1), 'traitee', 'la réponse lue passe « traitée »');
  return next is((select x.statut from public.receptions x where x.id = v_r3), 'nouvelle', 'la question reste « nouvelle » pour le cabinet');

  -- 4. Le tableau des rappels, sous le jeton de l'assistante.
  perform tests.b3_endosser('referent');
  t := public.tiroma_rappels(banc, entite);
  return next is(t #>> '{reglage,mode}', 'essai', 'le tableau dit le mode du module (essai)');
  return next is(jsonb_array_length(t -> 'contacts'), 2, 'deux moyens de contact');
  return next ok(exists (select 1 from jsonb_array_elements(t -> 'envois') x where x ->> 'type' = 'j2' and x ->> 'verrou' = 'SANTE_HORS_CANAL_AGREE'
                          and x ->> 'patient_nom' = 'Michel Dorville'), 'le rappel J-2 bloqué y figure, avec son verrou');
  return next is(jsonb_array_length(t -> 'reponses'), 3, 'les trois réponses y figurent');

  -- 5. Retirer un moyen de contact : plus rien ne se prépare pour lui.
  perform public.tiroma_retirer_contact(v_contact, 'Le patient préfère être appelé.');
  return next ok((select c.retire_le is not null from public.tiroma_contacts c where c.id = v_contact), 'le courriel de Michel Dorville est retiré');
  return next is(jsonb_array_length(public.tiroma_rappels(banc, entite) -> 'contacts'), 1, 'il ne reste qu''un moyen de contact');
  perform tests.b3_endosser('gerant');
  return next ok(exists (select 1 from public.journal_opposable where client_id = banc and action = 'tiroma.contact_note'
                          and donnees::text not ilike '%b3-patients%'), 'journal : « tiroma.contact_note », sans adresse');
  perform tests.redevenir_admin();
end $f$;

select * from runtests('tests'::name, '^test_b3_15_');
