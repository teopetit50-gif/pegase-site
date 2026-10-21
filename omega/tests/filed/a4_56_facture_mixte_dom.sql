-- Tests A4 — lot 60 (sans migration) : une facture mixte d'un client des DOM, une part exonérée et une part à 8,5 %.
-- Cas réel (LEADER MAT, facture 217815), en doublure : codes de TVA par ligne, « 53,55 | 1 | Exo », « 26,78 | 2 | 8,50 | 2,28 »,
-- « | 3 | 2,10 » ; 80,33 HT, 2,28 TVA, 82,61 TTC. Lue sans ventilation, A1 la corrige : FILED doit alors l'accepter, sans
-- tva.taux faux ni tva.sans_mention. pgTAP, schéma « tests » d'A5 ; utilise tests.a4_organisation et tests.a4_facture
-- (a4_10_facture_electronique.sql), à poser avant. Ce fichier ne supprime rien.

-- La facture telle que FILED l'intègre une fois la ventilation lue (p_ventilation : null = lue sans ventilation).
create or replace function tests.a4_facture_mixte_dom(p_org jsonb, p_numero text, p_ventilation jsonb) returns uuid
language plpgsql as $$
declare a jsonb := tests.a4_facture(p_org, 'ia', p_numero, 82.61); v_f uuid := (a ->> 'facture')::uuid; v_cl uuid := (p_org ->> 'client')::uuid;
begin
  update public.entites set territoire = 'GP', fuseau = 'America/Guadeloupe' where id = (p_org ->> 'entite')::uuid;
  update public.filed_factures set montant_ht = 80.33, montant_tva = 2.28, montant_ttc = 82.61 where id = v_f;
  insert into public.filed_factures_lignes (client_id, facture_id, document_id, rang, designation, quantite, prix_unitaire, montant_ht, taux_tva, categorie_tva, source)
  values (v_cl, v_f, (a ->> 'document')::uuid, 1, 'Article exonéré (code 1)', 1, 53.55, 53.55, 0, 'E', 'ia'),
         (v_cl, v_f, (a ->> 'document')::uuid, 2, 'Article à 8,5 % (code 2)', 1, 26.78, 26.78, 8.5, 'S', 'ia');
  if p_ventilation is not null then
    insert into public.filed_factures_tva (client_id, facture_id, document_id, categorie, taux, base, montant, source)
    select v_cl, v_f, (a ->> 'document')::uuid, t ->> 'categorie', (t ->> 'taux')::numeric, (t ->> 'base')::numeric, (t ->> 'montant')::numeric, 'ia'
    from jsonb_array_elements(p_ventilation) t;
  end if;
  perform private.filed_controler_facture(v_f);
  return v_f;
end $$;

create or replace function tests.test_a4_68_01_facture_mixte_dom() returns setof text
language plpgsql as $f$
declare o jsonb := tests.a4_organisation(); f1 uuid; f2 uuid; f3 uuid;
begin
  -- Ventilation lue : la part exonérée (code 1) et la part à 8,5 % (code 2).
  f1 := tests.a4_facture_mixte_dom(o, '217815',
    '[{"categorie": "E", "taux": 0, "base": 53.55, "montant": 0}, {"categorie": "S", "taux": 8.5, "base": 26.78, "montant": 2.28}]');
  return next ok(not exists (select 1 from public.filed_controles where facture_id = f1 and code = 'tva.taux' and resultat = 'anomalie'),
                 'Ventilation lue : pas de tva.taux faux (8,5 % est le taux normal des DOM)');
  return next ok(not exists (select 1 from public.filed_controles where facture_id = f1 and code = 'tva.sans_mention'), 'ni tva.sans_mention');
  return next ok(not exists (select 1 from public.filed_controles where facture_id = f1 and resultat = 'anomalie'
                              and code in ('tva.ventilation', 'montant.coherence', 'montant.lignes')),
                 'La ventilation, les lignes et le total tombent juste (80,33 + 2,28 = 82,61)');
  return next ok((select regime_tva from public.filed_factures where id = f1) in ('normal', 'mixte'), 'Régime : TVA facturée, une part exonérée');

  -- Le code 3 (2,10 %) porté au tableau sans base : rien de faux non plus.
  f2 := tests.a4_facture_mixte_dom(o, '217815-B',
    '[{"categorie": "E", "taux": 0, "base": 53.55, "montant": 0}, {"categorie": "S", "taux": 8.5, "base": 26.78, "montant": 2.28}, {"categorie": "S", "taux": 2.1}]');
  return next ok(not exists (select 1 from public.filed_controles where facture_id = f2 and resultat = 'anomalie'
                              and code in ('tva.taux', 'tva.sans_mention', 'tva.ventilation')),
                 'Avec le code 3 à 2,10 % sans base : pas d''anomalie de TVA');

  -- Lue sans ventilation (la lecture d'avant) : le taux moyen (2,84 %) n'est aucun taux légal, la facture est arrêtée.
  f3 := tests.a4_facture_mixte_dom(o, '217815-C', null);
  return next ok(exists (select 1 from public.filed_controles where facture_id = f3 and code = 'tva.taux' and resultat = 'anomalie'),
                 'Sans ventilation : tva.taux le signale (ce que la lecture d''A1 corrige)');
end $f$;
