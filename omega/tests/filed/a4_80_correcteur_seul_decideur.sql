-- Tests A4 — lot 85 (a4_93) : TMOD-11, le seul décideur de l'organisation (socle 19af) approuve la correction qu'il a
-- faite pour une reprise ; l'exception tombe dès qu'un second décideur existe. Données d'exemple.
-- pgTAP, schéma « tests » d'A5 ; utilise tests.a4_organisation (a4_10_facture_electronique.sql), tests.a4_comme
-- (a4_26_sortie_envois.sql), tests.a4_facture_refusee (a4_74_reprise_apres_refus.sql), tests.a4_decider
-- (a4_77_refus_ferme_liees.sql), à poser avant. Ce fichier ne supprime rien.

-- Refusée par le valideur, puis p_avant_correction (SQL) joué, corrigée par le gérant, reprise proposée par le cron.
create or replace function tests.a4_reprise_du_gerant(p_org jsonb, p_numero text, p_avant_correction text)
returns public.demandes_validation language plpgsql as $$
declare d uuid; f uuid; v_rep public.demandes_validation;
begin
  d := tests.a4_facture_refusee(p_org, p_numero, 'Le montant TTC est faux.');
  select objet_id::uuid into f from public.demandes_validation where id = d;
  if p_avant_correction is not null then execute p_avant_correction; end if;
  perform tests.a4_comme((p_org ->> 'gerant')::uuid);
  perform public.filed_corriger_facture(f, '{"montant_ht": 1050, "montant_tva": 210, "montant_ttc": 1260}', 'Facture rectificative.');
  reset role;
  perform set_config('request.jwt.claims', '', true);
  perform private.filed_traiter_reprises();
  select * into v_rep from public.demandes_validation where payload ->> 'reprise_de' = d::text;
  return v_rep;
end $$;

create or replace function tests.test_a4_93_01_seul_decideur_actif() returns setof text
language plpgsql as $f$
declare o jsonb := tests.a4_organisation(); v_rep public.demandes_validation;
begin
  -- Le valideur a refusé, puis son compte est suspendu : le gérant est le seul décideur ACTIF de l'organisation.
  v_rep := tests.a4_reprise_du_gerant(o, 'SEUL-001',
    format('update auth.users set banned_until = now() + interval ''1 year'' where id = %L', o ->> 'valideur'));
  return next ok((v_rep.payload ->> 'seul_decideur')::boolean and not (v_rep.payload -> 'saisi_par' ? (o ->> 'gerant')),
                 'Seul décideur actif : la demande de reprise le dit, le gérant n''est pas tenu pour saisisseur');
  return next lives_ok(format($$select tests.a4_decider(%L, %L, 'approuve', 'Vu.', true)$$, o ->> 'gerant', v_rep.id),
                       'Le seul décideur approuve sa correction');
  return next ok((select commentaire from public.approbations where demande_id = v_rep.id) like '[seul décideur]%'
                 and (select statut from public.filed_factures where id = v_rep.objet_id::uuid) = 'validee',
                 'Tracé « [seul décideur] », la facture est validée');
end $f$;

create or replace function tests.test_a4_93_02_second_decideur() returns setof text
language plpgsql as $f$
declare o jsonb := tests.a4_organisation(); v_rep public.demandes_validation; v_admin uuid := gen_random_uuid();
begin
  -- Le valideur quitte la décision : le gérant est seul quand la reprise est proposée…
  v_rep := tests.a4_reprise_du_gerant(o, 'SEUL-002',
    format('update public.comptes set role = ''lecteur'' where client_id = %L and user_id = %L', o ->> 'client', o ->> 'valideur'));
  return next ok((v_rep.payload ->> 'seul_decideur')::boolean, 'À la proposition, le gérant est seul décideur');
  -- … puis un administrateur arrive avant la décision : l'exception tombe.
  insert into auth.users (id, email, instance_id, aud, role, encrypted_password, created_at, updated_at)
  values (v_admin, v_admin::text || '@exemple.test', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', '', now(), now());
  insert into public.comptes (user_id, client_id, role) values (v_admin, (o ->> 'client')::uuid, 'admin');
  return next throws_ok(format($$select tests.a4_decider(%L, %L, 'approuve', null, false)$$, o ->> 'gerant', v_rep.id),
                        '42501', 'Vous avez corrigé cette facture pour sa reprise : une autre personne l''approuve.',
                        'Un second décideur existe : le gérant qui a corrigé n''approuve plus');
end $f$;
