-- Tests A1 — a1_02 : la reprise après refus de FILED relit la facture avec la consigne du refus. pgTAP, schéma
-- « tests » ; utilise tests.a4_organisation, tests.a4_facture_refusee (a4_74) et tests.a1_code (a1_01). Aucune
-- suppression. À jouer : select * from runtests('tests', '^test_a1_02_');

create or replace function tests.test_a1_02_01_relecture_puis_reprise() returns setof text
language plpgsql as $f$
declare
  o jsonb := tests.a4_organisation(); d1 uuid; f uuid; p uuid; t public.travaux; v_rep public.demandes_validation;
  v_resultat jsonb;
begin
  d1 := tests.a4_facture_refusee(o, 'REL-001', 'Le TTC est 1 260 € sur la pièce, pas 1 200 €.');
  select (objet_id)::uuid into f from public.demandes_validation where id = d1;
  select d.piece_id into p from public.filed_factures x join public.filed_documents d on d.id = x.document_id where x.id = f;

  -- Rien n'a changé : le cron demande la relecture, une seule fois.
  perform private.filed_traiter_reprises();
  select * into t from public.travaux where genre = 'lecteur.lire' and cle = 'relire:' || p::text || ':1';
  return next ok(t.id is not null and t.charge ->> 'consigne' like '%Commentaire du valideur : Le TTC est 1 260 € sur la pièce, pas 1 200 €.%',
                 'Refus sans correction : la pièce est relue avec le commentaire du refus');
  return next is((select origine from private.relectures where piece_id = p), 'reprise:' || d1::text, 'La relecture est liée à la demande refusée');
  perform private.filed_traiter_reprises();
  return next is((select count(*)::int from private.relectures where piece_id = p), 1, 'Une seule relecture par reprise');
  return next is((select statut from private.reprises where demande_id = d1), 'a_faire', 'La reprise attend la relecture');

  -- Le lecteur rend la relecture (essai 1) : le TTC lu est 1 260 €. FILED l'intègre malgré « refusee ».
  perform private.commencer_lecture(p);
  v_resultat := jsonb_build_object('statut', 'lue', 'type_piece', 'facture', 'methode', 'natif', 'nb_pages', 1,
    'pages', jsonb_build_array(jsonb_build_object('n', 1, 'methode', 'natif', 'texte', 'FACTURE REL-001 du 28/09/2026 - Total HT 1 050,00 - TVA 210,00 - TTC 1 260,00')),
    'valeurs', jsonb_build_array(
      jsonb_build_object('champ', 'numero', 'valeur', 'REL-001', 'texte', 'REL-001', 'page', 1, 'source', 'ia', 'verifiee', true),
      jsonb_build_object('champ', 'date', 'valeur', '2026-09-28', 'texte', '28/09/2026', 'page', 1, 'source', 'ia', 'verifiee', true),
      jsonb_build_object('champ', 'montant_ht', 'valeur', 1050, 'texte', '1 050,00', 'page', 1, 'source', 'ia', 'verifiee', true),
      jsonb_build_object('champ', 'montant_tva', 'valeur', 210, 'texte', '210,00', 'page', 1, 'source', 'ia', 'verifiee', true),
      jsonb_build_object('champ', 'montant_ttc', 'valeur', 1260, 'texte', '1 260,00', 'page', 1, 'source', 'ia', 'verifiee', true),
      jsonb_build_object('champ', 'fournisseur.nom', 'valeur', 'Fournisseur structuré d''exemple', 'texte', 'Fournisseur structuré d''exemple', 'page', 1, 'source', 'ia', 'verifiee', true),
      jsonb_build_object('champ', 'fournisseur.siren', 'valeur', '123456782', 'texte', '123456782', 'page', 1, 'source', 'ia', 'verifiee', true)));
  perform private.enregistrer_lecture(p, v_resultat, 'lecteur/10-25.essai/sonnet-5-5+c1');
  perform private.filed_integrer_piece(p);
  return next ok((select montant_ttc = 1260 and statut = 'refusee' from public.filed_factures where id = f),
                 'La relecture entre dans la facture refusée ; le statut reste « refusee » jusqu''à la nouvelle validation');

  -- Le cron suivant propose la reprise, avec la correction du TTC.
  perform private.filed_traiter_reprises();
  select * into v_rep from public.demandes_validation where payload ->> 'reprise_de' = d1::text;
  return next ok(v_rep.id is not null and v_rep.statut = 'en_attente', 'Une demande de reprise, en attente d''une nouvelle validation');
  return next ok(exists (select 1 from jsonb_array_elements(v_rep.payload -> 'corrections') c
                          where c ->> 'champ' = 'montant_ttc' and (c ->> 'avant')::numeric = 1200 and (c ->> 'apres')::numeric = 1260),
                 'avec la correction lue sur la pièce (TTC 1 200 → 1 260)');
end $f$;

create or replace function tests.test_a1_02_02_sans_reprise_rien_ne_change() returns setof text
language plpgsql as $f$
declare o jsonb := tests.a4_organisation(); fa jsonb := tests.a4_facture(o, 'ia', 'REL-002', 1200); f uuid := (fa ->> 'facture')::uuid; p uuid := (fa ->> 'piece')::uuid;
begin
  -- Une facture refusée sans reprise à faire : une relecture ne la change pas (« déjà décidée »).
  update public.filed_factures set statut = 'refusee' where id = f;
  update public.pieces_valeurs set valeur = '1260'::jsonb where piece_id = p and champ = 'montant_ttc';
  perform private.filed_integrer_facture((fa ->> 'document')::uuid);
  return next is((select montant_ttc from public.filed_factures where id = f), 1200::numeric, 'Hors reprise, une facture décidée ne change plus');
  return next is(private.filed_relire_pour_reprise(gen_random_uuid(), null, '{}'::jsonb), false, 'Sans document, pas de relecture');
end $f$;
