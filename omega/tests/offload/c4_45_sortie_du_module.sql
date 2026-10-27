-- c4_45 — OFFLOAD : la sortie ne concerne qu'OFFLOAD (TNUIT-02), ne laisse rien en suspens et arrête la saisie (TNUIT-03) ;
-- la relance des prospects est éteinte par défaut (TNUIT-04). Session C4, 27/10/2026. Sur une organisation créée pour le
-- test, qui a aussi CASHD ; transaction annulée par runtests(). Après c4_00, c4_03 (aides) et les migrations c4_01 à c4_45.

create or replace function tests.test_c4_45_sortie_du_module() returns setof text
language plpgsql as $f$
declare
  v_org uuid;
  v_entite uuid;
  v_nom constant text := 'Organisation qui garde CASHD (test C4)';
  v_gerant uuid;
  v_collab uuid;
  v_mail_gerant text;
  v_compte uuid;
  v_aff1 uuid; v_aff2 uuid;
  s jsonb;
  t text;
  v_reste bigint := 0;
  v_n bigint;
begin
  perform tests.redevenir_admin();
  insert into public.clients (nom) values (v_nom) returning id into v_org;
  select e.id into v_entite from public.entites e where e.client_id = v_org and e.principale;
  if v_entite is null then
    insert into public.entites (client_id, nom, principale) values (v_org, 'Siège', true) returning id into v_entite;
  end if;
  v_mail_gerant := 'c4-45-gerant-' || left(v_org::text, 8) || '@banc-varelo.test';
  v_gerant := tests.c4_compte(v_org, 'gerant', v_mail_gerant);
  v_collab := tests.c4_compte(v_org, 'collaborateur', 'c4-45-collab-' || left(v_org::text, 8) || '@banc-varelo.test');
  perform public.offload_installer(v_org, null);
  perform public.cashd_installer(v_org);
  insert into public.reglages_envois (client_id, module, mode, essai_adresse)
  values (v_org, 'offload', 'essai', 'essais-c4-45@banc-varelo.test')
  on conflict (client_id, module) do update set mode = 'essai', essai_adresse = excluded.essai_adresse;

  -- TNUIT-04 : à l'installation, la relance des prospects est éteinte.
  return next ok(not (select g.prospects_actifs from public.offload_reglages g where g.client_id = v_org)
                 and (select c.column_default from information_schema.columns c where c.table_schema = 'public'
                        and c.table_name = 'offload_reglages' and c.column_name = 'prospects_actifs') = 'false',
                 'La relance des prospects est éteinte par défaut : le gérant l''allume lui-même');

  -- Des données OFFLOAD et CASHD ; des choses en suspens dans OFFLOAD.
  perform tests.endosser(v_gerant, v_mail_gerant);
  perform public.cashd_ecrire_compte(null, v_org, jsonb_build_object('reference', 'C-1', 'nom', 'Client CASHD qui reste', 'contact_facturation_email', 'compta@reste.test'));
  v_compte := public.offload_saisir_compte(v_org, null, 'S1', 'Client Sortant SARL',
    '{"email": "achats@client-sortant.test", "contact": "Mme Leroy"}'::jsonb);
  v_aff1 := public.offload_saisir_affaire(v_compte, 'CMD-1', current_date - 20, '{"valeur_ht": 300}'::jsonb);
  v_aff2 := public.offload_saisir_affaire(v_compte, 'CMD-2', current_date - 2, '{"valeur_ht": 90}'::jsonb);
  perform tests.redevenir_admin();
  insert into public.offload_achats (client_id, entite_id, compte_id, date_achat, montant_ht, reference, nature, source)
  select v_org, v_entite, v_compte, current_date - (70 + 30 * k), 650, 'S1-' || k, 'facture', 'saisie' from generate_series(0, 5) k;
  update public.offload_affaires set statut = 'decision', motif = 'À décider' where id = v_aff1;
  insert into public.offload_taches (client_id, entite_id, compte_id, type, titre, detail, echeance)
  values (v_org, v_entite, v_compte, 'appel', 'Proposer le renouvellement du contrat CT-1', 'Contrat qui s''éteint.', current_date);
  perform private.offload_ouvrir(v_compte, 'manuel');

  -- L'effacement d'OFFLOAD vient après la sortie, jamais avant.
  perform tests.endosser(v_gerant, v_mail_gerant);
  return next throws_ok(format('select public.offload_effacer_module(%L::uuid, %L)', v_org, v_nom), '55000', null,
                        'Pas d''effacement avant la sortie : la restitution d''abord');

  -- TNUIT-03 : la sortie ne laisse rien en suspens.
  s := public.offload_sortie(v_org, 'Fin de contrat au 31/10');
  perform tests.redevenir_admin();
  return next ok(not exists (select 1 from public.offload_taches x where x.client_id = v_org and x.statut = 'a_faire')
                 and exists (select 1 from public.offload_taches x where x.client_id = v_org and x.titre like 'Proposer le renouvellement%'
                               and x.statut = 'abandonnee' and x.compte_rendu like 'Sortie d''OFFLOAD : Fin de contrat%'),
                 'Toutes les tâches à faire sont fermées, échéances comprises, avec la trace de la sortie');
  return next ok(not exists (select 1 from public.offload_affaires a where a.client_id = v_org and a.statut <> 'close_sans_suite')
                 and (select a.motif from public.offload_affaires a where a.id = v_aff1) like 'Sortie d''OFFLOAD : %',
                 'Les affaires à décider ou en attente se closent, avec la trace');
  return next ok(not exists (select 1 from public.demandes_validation d where d.client_id = v_org and d.module = 'offload' and d.statut = 'en_attente')
                 and not exists (select 1 from public.offload_reprises p where p.client_id = v_org and p.statut <> 'close'),
                 'Plus aucune validation ni reprise en cours');

  -- TNUIT-03 : la saisie s'arrête.
  perform tests.endosser(v_gerant, v_mail_gerant);
  return next throws_ok(format('select public.offload_saisir_compte(%L::uuid, null, %L, %L)', v_org, 'S9', 'Saisi après la sortie'), '55000', null,
                        'Un nouveau compte est refusé après la sortie');
  return next throws_ok(format('select public.offload_saisir_affaire(%L::uuid, %L, current_date)', v_compte, 'CMD-9'), '55000', null,
                        'Une nouvelle affaire aussi');
  return next throws_ok(format('select public.offload_regler(%L::uuid, %L)', v_org, '{"montant_min": 10}'), '55000', null,
                        'Et un réglage');
  return next throws_ok(format('select public.offload_sortie(%L::uuid, %L)', v_org, 'encore'), '55000', null,
                        'Une seconde sortie dit qu''OFFLOAD est déjà arrêté');

  -- TNUIT-02 : l'effacement ne concerne qu'OFFLOAD.
  return next ok(s #>> '{effacement,porte}' = 'public.offload_effacer_module' and s #>> '{effacement,phrase}' like '%vos autres modules continuent%',
                 'La sortie renvoie à l''effacement du seul OFFLOAD, et le dit');
  perform tests.endosser(v_collab, 'c4-45-collab-' || left(v_org::text, 8) || '@banc-varelo.test');
  return next throws_ok(format('select public.offload_effacer_module(%L::uuid, %L)', v_org, v_nom), '42501', null,
                        'Un collaborateur n''efface pas OFFLOAD');
  perform tests.endosser(v_gerant, v_mail_gerant);
  return next throws_ok(format('select public.offload_effacer_module(%L::uuid, %L)', v_org, 'un autre nom'), '22023', null,
                        'L''effacement se confirme par le nom exact de l''organisation');
  s := public.offload_effacer_module(v_org, v_nom);
  perform tests.redevenir_admin();
  for t in select c.relname from pg_class c join pg_namespace n on n.oid = c.relnamespace
           where n.nspname = 'public' and c.relkind = 'r' and c.relname like 'offload\_%' loop
    execute format('select count(*) from public.%I where client_id = $1', t) into v_n using v_org;
    v_reste := v_reste + v_n;
  end loop;
  return next is(v_reste, 0::bigint, 'Plus aucune ligne OFFLOAD pour l''organisation, réglages compris');
  return next ok(not exists (select 1 from public.envois e where e.client_id = v_org and e.module = 'offload')
                 and not exists (select 1 from public.demandes_validation d where d.client_id = v_org and d.module = 'offload'),
                 'Ni message ni demande d''OFFLOAD');
  return next ok(exists (select 1 from public.clients c where c.id = v_org)
                 and (select count(*) from public.cashd_comptes k where k.client_id = v_org) = 1
                 and exists (select 1 from public.cashd_reglages k where k.client_id = v_org),
                 'L''organisation et CASHD continuent : ses comptes et ses réglages sont intacts');
  return next ok(exists (select 1 from public.journal_opposable j where j.client_id = v_org and j.action = 'offload.effacement'),
                 'L''effacement d''OFFLOAD est au journal');
  perform tests.endosser(v_gerant, v_mail_gerant);
  return next throws_ok(format('select public.offload_saisir_compte(%L::uuid, null, %L, %L)', v_org, 'S10', 'Après effacement'), 'P0002', null,
                        'Après l''effacement, OFFLOAD n''est plus installé : rien ne se saisit');
  perform tests.redevenir_admin();
end $f$;

select * from runtests('tests'::name, '^test_c4_45_');
