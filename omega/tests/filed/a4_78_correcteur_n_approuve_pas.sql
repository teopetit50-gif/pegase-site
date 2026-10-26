-- Tests A4 — lot 83 (a4_91) : TMOD-02, qui corrige une facture pour sa reprise ne l'approuve pas s'il existe un autre
-- décideur ; seul décideur, il le peut, marqué « [seul décideur] ». Données d'exemple.
-- pgTAP, schéma « tests » d'A5 ; utilise tests.a4_organisation (a4_10_facture_electronique.sql), tests.a4_comme
-- (a4_26_sortie_envois.sql), tests.a4_facture_refusee (a4_74_reprise_apres_refus.sql) et tests.a4_decider
-- (a4_77_refus_ferme_liees.sql), à poser avant. Ce fichier ne supprime rien.

-- Refusée par le valideur, corrigée par p_correcteur, reprise proposée par le cron. Rend la demande de reprise.
create or replace function tests.a4_reprise_corrigee_par(p_org jsonb, p_numero text, p_correcteur uuid)
returns public.demandes_validation language plpgsql as $$
declare d uuid; f uuid; v_rep public.demandes_validation;
begin
  d := tests.a4_facture_refusee(p_org, p_numero, 'Le montant TTC est faux.');
  select objet_id::uuid into f from public.demandes_validation where id = d;
  perform tests.a4_comme(p_correcteur);
  perform public.filed_corriger_facture(f, '{"montant_ht": 1050, "montant_tva": 210, "montant_ttc": 1260}', 'Facture rectificative.');
  reset role;
  perform set_config('request.jwt.claims', '', true);
  perform private.filed_traiter_reprises();
  select * into v_rep from public.demandes_validation where payload ->> 'reprise_de' = d::text;
  return v_rep;
end $$;

create or replace function tests.test_a4_91_01_valideur_correcteur() returns setof text
language plpgsql as $f$
declare o jsonb := tests.a4_organisation(); v_rep public.demandes_validation;
begin
  -- Le valideur refuse, corrige lui-même, puis veut approuver sa correction : refusé ; le gérant approuve.
  v_rep := tests.a4_reprise_corrigee_par(o, 'SEP-001', (o ->> 'valideur')::uuid);
  return next ok(v_rep.id is not null and v_rep.payload -> 'corrige_par' ? (o ->> 'valideur')
                 and v_rep.payload -> 'saisi_par' ? (o ->> 'valideur') and not (v_rep.payload ->> 'seul_decideur')::boolean,
                 'La demande de reprise nomme le valideur comme correcteur et saisisseur');
  return next throws_ok(format($$select tests.a4_decider(%L, %L, 'approuve', 'Ma correction.', false)$$, o ->> 'valideur', v_rep.id),
                        '42501', null, 'Le valideur qui a corrigé n''approuve pas sa correction');
  perform tests.a4_decider((o ->> 'gerant')::uuid, v_rep.id, 'approuve', null, true);
  return next is((select statut from public.filed_factures where id = v_rep.objet_id::uuid), 'validee',
                 'Une autre personne (le gérant) approuve : la facture est validée');
end $f$;

create or replace function tests.test_a4_91_02_gerant_correcteur() returns setof text
language plpgsql as $f$
declare o jsonb := tests.a4_organisation(); v_rep public.demandes_validation;
begin
  -- Le gérant corrige : un autre décideur (le valideur) existe, le gérant n'approuve pas sa correction.
  v_rep := tests.a4_reprise_corrigee_par(o, 'SEP-002', (o ->> 'gerant')::uuid);
  return next throws_ok(format($$select tests.a4_decider(%L, %L, 'approuve', null, false)$$, o ->> 'gerant', v_rep.id),
                        '42501', 'Vous avez corrigé cette facture pour sa reprise : une autre personne l''approuve.',
                        'Le gérant qui a corrigé n''approuve pas, puisqu''un valideur peut décider');
  -- Rejeter sa propre correction reste possible.
  return next lives_ok(format($$select tests.a4_decider(%L, %L, 'rejete', 'Finalement non.', false)$$, o ->> 'gerant', v_rep.id),
                       'Le correcteur peut rejeter');
end $f$;

create or replace function tests.test_a4_91_03_seul_decideur() returns setof text
language plpgsql as $f$
declare o jsonb := tests.a4_organisation(); d uuid; f uuid; v_rep public.demandes_validation;
begin
  -- Refusée par le valideur, qui quitte ensuite la décision (lecteur) : le gérant est seul décideur.
  d := tests.a4_facture_refusee(o, 'SEP-003', 'Le montant TTC est faux.');
  select objet_id::uuid into f from public.demandes_validation where id = d;
  update public.comptes set role = 'lecteur' where client_id = (o ->> 'client')::uuid and user_id = (o ->> 'valideur')::uuid;
  perform tests.a4_comme((o ->> 'gerant')::uuid);
  perform public.filed_corriger_facture(f, '{"montant_ht": 1050, "montant_tva": 210, "montant_ttc": 1260}', 'Facture rectificative.');
  reset role;
  perform set_config('request.jwt.claims', '', true);
  perform private.filed_traiter_reprises();
  select * into v_rep from public.demandes_validation where payload ->> 'reprise_de' = d::text;
  return next ok((v_rep.payload ->> 'seul_decideur')::boolean, 'Sans autre décideur : la demande le dit');
  perform tests.a4_decider((o ->> 'gerant')::uuid, v_rep.id, 'approuve', 'Vu.', true);
  return next ok((select commentaire from public.approbations where demande_id = v_rep.id) like '[seul décideur]%'
                 and (select statut from public.filed_factures where id = f) = 'validee',
                 'Seul décideur : il approuve sa correction, marqué « [seul décideur] »');
end $f$;
