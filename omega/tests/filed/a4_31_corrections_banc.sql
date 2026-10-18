-- Tests A4 — lot 35 (a4_43) : les trois défauts vus au banc (chantier 3, exemples de la norme Factur-X / ZUGFeRD 2).
-- pgTAP, schéma « tests » d'A5 ; utilise tests.a4_organisation, tests.a4_facture (a4_10_facture_electronique.sql) et
-- tests.a4_facture_etrangere (a4_19_registres_hors_union.sql), à poser avant. `select * from runtests('tests', '^test_a4_')`.
-- Ce fichier ne supprime rien.

-- 1. Un fournisseur allemand sans SIREN : le contrôle passe ; un fournisseur français sans SIREN reste signalé.
create or replace function tests.test_a4_43_01_siren_hors_france() returns setof text
language plpgsql as $f$
declare o jsonb := tests.a4_organisation(); fa jsonb; fr jsonb; v_f uuid;
begin
  fa := tests.a4_facture_etrangere(o, 'DE-43-001', 'DE', 'DE136695976');
  v_f := (fa ->> 'facture')::uuid;
  update public.filed_factures set regime_tva = null where id = v_f;
  perform private.filed_controler_facture(v_f);
  return next ok(exists (select 1 from public.filed_controles where facture_id = v_f and code = 'identite.siren' and resultat <> 'anomalie'
                           and message like 'Fournisseur établi hors de France%'), 'Fournisseur allemand : aucun SIREN attendu');

  fr := tests.a4_facture(o, 'ia', 'FR-43-001', 120);
  update public.filed_fournisseurs set siren = null where id = (o ->> 'fournisseur')::uuid;
  update public.filed_factures set fournisseur_lu = '{}' where id = (fr ->> 'facture')::uuid;
  perform private.filed_controler_facture((fr ->> 'facture')::uuid);
  return next ok(exists (select 1 from public.filed_controles where facture_id = (fr ->> 'facture')::uuid and code = 'identite.siren'
                           and resultat = 'anomalie'), 'Fournisseur français sans SIREN : toujours signalé');
end $f$;

-- 2. Trois pièces du même numéro : la troisième, même date et même montant que la deuxième, est son doublon exact.
create or replace function tests.test_a4_43_02_doublon_exact() returns setof text
language plpgsql as $f$
declare o jsonb := tests.a4_organisation(); x jsonb; a uuid; b uuid; c uuid;
begin
  -- Le registre est figé : l'ordre de réception est celui que le registre donne ; la plus ancienne prend l'autre montant.
  x := tests.a4_facture(o, 'ia', '471102', 529.87); x := tests.a4_facture(o, 'ia', '471102', 529.87); x := tests.a4_facture(o, 'ia', '471102', 529.87);
  select (array_agg(f.id order by d.annee_reception, d.numero_reception))[1], (array_agg(f.id order by d.annee_reception, d.numero_reception))[2],
         (array_agg(f.id order by d.annee_reception, d.numero_reception))[3]
    into a, b, c
    from public.filed_factures f join public.filed_documents d on d.id = f.document_id
   where f.client_id = (o ->> 'client')::uuid and f.numero = '471102';
  update public.filed_factures set montant_ttc = 235.62, montant_ht = 196.35, montant_tva = 39.27 where id = a;
  perform private.filed_controler_facture(c);
  return next is((select statut from public.filed_factures where id = c), 'ecartee',
                 'Doublon exact de la deuxième pièce : écartée, même si la première porte le même numéro');
  return next ok(exists (select 1 from public.filed_controles where facture_id = c and code = 'doublon.exact'
                           and preuve ->> 'facture' = b::text), 'et c''est la deuxième qui est citée');
  perform private.filed_controler_facture(b);
  return next is((select statut from public.filed_factures where id = b), 'bloquee',
                 'La deuxième, même numéro que la première à un autre montant : bloquée');
end $f$;

-- 3. Le nom du fournisseur créé d'une pièce a ses blancs repliés.
create or replace function tests.test_a4_43_03_nom_replie() returns setof text
language plpgsql as $f$
declare o jsonb := tests.a4_organisation(); v public.filed_fournisseurs;
begin
  v := private.filed_creer_fournisseur((o ->> 'client')::uuid,
         jsonb_build_object('nom', E'MVM Musterhafter\nVersicherungsverein  AG ', 'tva', 'DE234567891'), 'piece', null);
  return next is(v.nom, 'MVM Musterhafter Versicherungsverein AG', 'Saut de ligne et blancs doubles repliés');
  return next ok(pg_get_functiondef('private.filed_creer_fournisseur(uuid, jsonb, text, uuid)'::regprocedure) like '%a4_43%', 'Le corps porte la correction');
end $f$;
