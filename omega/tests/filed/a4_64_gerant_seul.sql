-- Tests A4 — lot 68 (a4_76) : un gérant décide seul, sauf au-delà du seuil réglé par l'organisation. Données d'exemple.
-- pgTAP, schéma « tests » d'A5 ; utilise tests.a4_organisation, tests.a4_facture (a4_10_facture_electronique.sql) et
-- tests.a4_comme (a4_26_sortie_envois.sql), à poser avant. Ce fichier ne supprime rien.

-- Un fournisseur « à confirmer », né d'une pièce déposée par p_depose_par, avec sa facture de p_ttc.
create or replace function tests.a4_fournisseur_ne_de(p_org jsonb, p_depose_par uuid, p_numero text, p_ttc numeric) returns uuid
language plpgsql as $$
-- (le registre des pièces reçues est figé : le déposant est posé à la création, par la doublure de l'organisation)
declare fa jsonb := tests.a4_facture(p_org || jsonb_build_object('gerant', p_depose_par), 'ia', p_numero, p_ttc); v_four uuid;
begin
  insert into public.filed_fournisseurs (client_id, code, nom, nom_normalise, pays, statut, source, document_origine)
  values ((p_org ->> 'client')::uuid, 'N' || upper(substr(md5(p_numero), 1, 8)), 'Fournisseur nouveau ' || p_numero,
          'fournisseur nouveau ' || lower(p_numero), 'FR', 'a_confirmer', 'facture', (fa ->> 'document')::uuid)
  returning id into v_four;
  update public.filed_factures set fournisseur_id = v_four where id = (fa ->> 'facture')::uuid;
  return v_four;
end $$;

create or replace function tests.test_a4_76_01_gerant_seul() returns setof text
language plpgsql as $f$
declare o jsonb := tests.a4_organisation(); g uuid := (o ->> 'gerant')::uuid; v uuid := (o ->> 'valideur')::uuid;
        v_four uuid; fa jsonb; t uuid; v_le date := date_trunc('month', current_date)::date;
begin
  -- Le fournisseur né d'une pièce que le gérant a déposée : il le confirme seul.
  v_four := tests.a4_fournisseur_ne_de(o, g, 'SEUL-001', 1200);
  reset role; perform tests.a4_comme(g);
  return next lives_ok(format('select public.filed_confirmer_fournisseur(%L)', v_four), 'Un gérant confirme seul le fournisseur de sa propre pièce');
  reset role;
  -- Le valideur, lui, ne confirme pas celui de sa pièce : la règle reste pour les autres rôles.
  v_four := tests.a4_fournisseur_ne_de(o, v, 'SEUL-002', 1200);
  reset role; perform tests.a4_comme(v);
  return next throws_ok(format('select public.filed_confirmer_fournisseur(%L)', v_four), '42501', null, 'Le valideur, non : une autre personne décide');
  reset role;

  -- La facture saisie par le gérant : la demande ne le nomme pas comme saisisseur, il l'approuve seul.
  fa := tests.a4_facture(o, 'ia', 'SEUL-003', 1200);
  perform private.filed_controler_facture((fa ->> 'facture')::uuid);
  return next ok(not ((select d.payload -> 'saisi_par' from public.filed_validations x join public.demandes_validation d on d.id = x.demande_id
                        where x.facture_id = (fa ->> 'facture')::uuid and x.issue is null) ? g::text),
                 'La demande de validation ne nomme pas le gérant parmi ceux qui ne l''approuvent pas');

  -- Son propre trajet : il le décide seul ; la valideuse, non.
  reset role; perform tests.a4_comme(g);
  t := public.filed_declarer_trajet((o ->> 'client')::uuid, (o ->> 'entite')::uuid, v_le, 120, 'voiture', 5, 'Chantier (exemple)');
  return next lives_ok(format('select public.filed_decider_trajet(%L, true)', t), 'Un gérant décide seul de son propre trajet');
  reset role; perform tests.a4_comme(v);
  t := public.filed_declarer_trajet((o ->> 'client')::uuid, (o ->> 'entite')::uuid, v_le, 80, 'voiture', 5, 'Chantier (exemple)');
  return next throws_ok(format('select public.filed_decider_trajet(%L, true)', t), '42501', null, 'La valideuse, non');
  reset role;
end $f$;

create or replace function tests.test_a4_76_02_seuil_de_l_organisation() returns setof text
language plpgsql as $f$
declare o jsonb := tests.a4_organisation(); g uuid := (o ->> 'gerant')::uuid; v uuid := (o ->> 'valideur')::uuid; v_four uuid; fa jsonb;
begin
  -- Seul un gérant ou un admin règle le seuil.
  reset role; perform tests.a4_comme(v);
  return next throws_ok(format('select public.filed_regler_seconde_personne(%L, 1000::numeric)', o ->> 'client'), '42501', null, 'Le valideur ne règle pas le seuil');
  reset role; perform tests.a4_comme(g);
  return next is((public.filed_regler_seconde_personne((o ->> 'client')::uuid, 1000::numeric) ->> 'seconde_personne_des_ttc')::numeric, 1000::numeric,
                 'Le gérant règle le seuil : 1 000 € TTC');
  reset role;
  -- Au-delà, une seconde personne redevient nécessaire, même pour un gérant.
  v_four := tests.a4_fournisseur_ne_de(o, g, 'SEUIL-001', 1200);
  reset role; perform tests.a4_comme(g);
  return next throws_ok(format('select public.filed_confirmer_fournisseur(%L)', v_four), '42501', null, 'Au-delà du seuil : le gérant ne confirme plus seul');
  reset role;
  fa := tests.a4_facture(o, 'ia', 'SEUIL-002', 1200);
  perform private.filed_controler_facture((fa ->> 'facture')::uuid);
  return next ok((select d.payload -> 'saisi_par' from public.filed_validations x join public.demandes_validation d on d.id = x.demande_id
                   where x.facture_id = (fa ->> 'facture')::uuid and x.issue is null) ? g::text,
                 'et la demande d''une facture au-delà le nomme parmi ceux qui ne l''approuvent pas');
  -- En dessous, il décide toujours seul.
  v_four := tests.a4_fournisseur_ne_de(o, g, 'SEUIL-003', 600);
  reset role; perform tests.a4_comme(g);
  return next lives_ok(format('select public.filed_confirmer_fournisseur(%L)', v_four), 'Sous le seuil : seul');
  reset role;
  return next ok(exists (select 1 from public.journal_opposable j where j.client_id = (o ->> 'client')::uuid and j.action = 'filed.reglage.seconde_personne'),
                 'Le réglage est noté au journal');
end $f$;
