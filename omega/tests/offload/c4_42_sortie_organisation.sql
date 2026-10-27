-- c4_42 — OFFLOAD : « si vous arrêtez, tout vous est restitué puis effacé » (ligne 58 de l'audit ; session C4, 27/10/2026).
-- Sur une organisation créée pour le test (jamais le banc partagé), transaction annulée par runtests(). Après c4_00, c4_03
-- (aides) et les migrations c4_01 à c4_42.

create or replace function tests.test_c4_42_sortie_organisation() returns setof text
language plpgsql as $f$
declare
  v_org uuid;
  v_entite uuid;
  v_nom constant text := 'Organisation sortante (test C4)';
  v_gerant uuid;
  v_collab uuid;
  v_compte uuid;
  r public.offload_reprises;
  s jsonb;
  t text;
  v_reste bigint := 0;
  v_n bigint;
  v_effacement jsonb;
begin
  perform tests.redevenir_admin();
  insert into public.clients (nom) values (v_nom) returning id into v_org;
  select e.id into v_entite from public.entites e where e.client_id = v_org and e.principale;
  if v_entite is null then
    insert into public.entites (client_id, nom, principale) values (v_org, 'Siège', true) returning id into v_entite;
  end if;
  v_gerant := tests.c4_compte(v_org, 'gerant', 'c4-sortie-gerant-' || left(v_org::text, 8) || '@banc-varelo.test');
  v_collab := tests.c4_compte(v_org, 'collaborateur', 'c4-sortie-collab-' || left(v_org::text, 8) || '@banc-varelo.test');
  perform public.offload_installer(v_org, null);
  insert into public.reglages_envois (client_id, module, mode, essai_adresse)
  values (v_org, 'offload', 'essai', 'essais-c4-sortie@banc-varelo.test')
  on conflict (client_id, module) do update set mode = 'essai', essai_adresse = excluded.essai_adresse;

  -- Des données OFFLOAD : un compte, ses achats, une reprise dont le message attend une validation.
  v_compte := public.offload_saisir_compte(v_org, null, 'S1', 'Client Sortant SARL',
    '{"email": "achats@client-sortant.test", "contact": "Mme Leroy", "secteur": "BTP"}'::jsonb);
  insert into public.offload_achats (client_id, entite_id, compte_id, date_achat, montant_ht, reference, nature, source)
  select v_org, v_entite, v_compte, current_date - (70 + 30 * k), 650, 'S1-' || k, 'facture', 'saisie' from generate_series(0, 5) k;
  perform private.offload_ouvrir(v_compte, 'manuel');
  r := (select x from public.offload_reprises x where x.compte_id = v_compte);
  return next ok(r.id is not null and exists (select 1 from public.demandes_validation d where d.client_id = v_org and d.module = 'offload' and d.statut = 'en_attente'),
                 'Avant la sortie : un compte, ses achats, un message qui attend une validation');

  -- Seuls le gérant et l'administrateur font sortir l'organisation, et toujours avec un motif.
  perform tests.endosser(v_collab, 'c4-sortie-collab-' || left(v_org::text, 8) || '@banc-varelo.test');
  return next throws_ok(format('select public.offload_sortie(%L::uuid, %L)', v_org, 'Fin de contrat'), '42501', null,
                        'Un collaborateur ne fait pas sortir l''organisation');
  perform tests.endosser(v_gerant, 'c4-sortie-gerant-' || left(v_org::text, 8) || '@banc-varelo.test');
  return next throws_ok(format('select public.offload_sortie(%L::uuid, %L)', v_org, ' '), '22023', null, 'Une sortie dit pourquoi');

  -- La sortie : l'arrêt, rien en suspens, tout restitué.
  s := public.offload_sortie(v_org, 'Fin de contrat au 31/10');
  perform tests.redevenir_admin();
  return next ok(private.offload_suspendu(v_org) and (s ->> 'arrete')::boolean,
                 'OFFLOAD s''arrête : plus aucune vague, plus aucun message');
  return next ok(not exists (select 1 from public.demandes_validation d where d.client_id = v_org and d.module = 'offload' and d.statut = 'en_attente')
                 and not exists (select 1 from public.envois e where e.client_id = v_org and e.module = 'offload' and e.statut in ('a_valider', 'pret', 'differe'))
                 and (select x.statut from public.offload_reprises x where x.id = r.id) = 'close',
                 'Rien ne reste en suspens : reprise close, message et demande annulés');
  return next ok((s #>> '{restitution,resume,comptes}')::int = 1 and (s #>> '{restitution,resume,achats}')::int = 6
                 and jsonb_array_length(s #> '{restitution,donnees,journal}') >= 1,
                 'Tout est restitué en JSON : comptes, achats, et le journal du module');
  t := s #>> '{tableur,fichiers,offload-comptes.csv}';
  return next ok(t like '%Client Sortant SARL%' and (s #>> '{tableur,fichiers,offload-achats.csv}') like '%S1-0%'
                 and char_length(s ->> 'empreinte_sha256') = 64,
                 'Et en fichiers pour un tableur, avec l''empreinte de l''export');
  return next ok(exists (select 1 from public.journal_opposable j where j.client_id = v_org and j.action = 'offload.sortie'
                           and j.donnees ->> 'empreinte_sha256' = s ->> 'empreinte_sha256')
                 and s #>> '{effacement,porte}' = 'public.effacer_donnees_client' and s #>> '{effacement,confirmation}' = v_nom,
                 'La sortie est au journal, et la réponse dit comment effacer');

  -- L'effacement, par la porte du socle : confirmé par le nom, il ne laisse rien d'OFFLOAD.
  return next throws_ok(format('select private.effacer_client(%L::uuid, %L, %L)', v_org, 'un autre nom', 'test c4_42'), '22023', null,
                        'L''effacement exige le nom exact de l''organisation');
  v_effacement := private.effacer_client(v_org, v_nom, 'test c4_42');
  for t in select c.relname from pg_class c join pg_namespace n on n.oid = c.relnamespace
           where n.nspname = 'public' and c.relkind = 'r' and c.relname like 'offload\_%' loop
    execute format('select count(*) from public.%I where client_id = $1', t) into v_n using v_org;
    v_reste := v_reste + v_n;
  end loop;
  return next is(v_reste, 0::bigint, 'Après l''effacement, aucune ligne OFFLOAD ne reste, dans aucune des tables du module');
  return next ok(not exists (select 1 from public.clients c where c.id = v_org)
                 and exists (select 1 from public.effacements x where x.client_efface = v_org and (x.lignes ->> 'offload_comptes')::int = 1),
                 'L''organisation est effacée, et l''effacement est noté (dont les comptes OFFLOAD)');
end $f$;

select * from runtests('tests'::name, '^test_c4_42_');
