-- Tests A4 — lot 63 (a4_71) : TFILED-03, un taux de TVA inhabituel mais cohérent n'arrête plus la facture.
-- Doublures : organisation et factures d'exemple (le cas F3 : HT 780, TVA 148,20, TTC 928,20, 19 %).
-- pgTAP, schéma « tests » d'A5 ; utilise tests.a4_organisation et tests.a4_facture (a4_10_facture_electronique.sql),
-- à poser avant. Ce fichier ne supprime rien.

create or replace function tests.a4_facture_taux(p_org jsonb, p_numero text, p_ht numeric, p_tva numeric, p_ventilation jsonb) returns uuid
language plpgsql as $$
declare a jsonb := tests.a4_facture(p_org, 'ia', p_numero, p_ht + p_tva); v_f uuid := (a ->> 'facture')::uuid;
begin
  update public.filed_factures set montant_ht = p_ht, montant_tva = p_tva, montant_ttc = p_ht + p_tva where id = v_f;
  insert into public.filed_factures_tva (client_id, facture_id, document_id, categorie, taux, base, montant, source)
  select (p_org ->> 'client')::uuid, v_f, (a ->> 'document')::uuid, 'S', (t ->> 'taux')::numeric, (t ->> 'base')::numeric, (t ->> 'montant')::numeric, 'ia'
  from jsonb_array_elements(p_ventilation) t;
  perform private.filed_controler_facture(v_f);
  return v_f;
end $$;

create or replace function tests.test_a4_71_01_taux_inhabituel_coherent() returns setof text
language plpgsql as $f$
declare o jsonb := tests.a4_organisation(); f1 uuid; f2 uuid; f3 uuid; c public.filed_controles;
begin
  -- F3 : 19 %, 780 × 19 % = 148,20 : cohérent → attention qui explique, la facture n'est pas arrêtée par ce taux.
  f1 := tests.a4_facture_taux(o, 'MCD-2026-1003', 780, 148.20, '[{"taux": 19, "base": 780, "montant": 148.20}]');
  select * into c from public.filed_controles where facture_id = f1 and code = 'tva.taux';
  return next ok(c.resultat = 'anomalie' and c.gravite = 'attention' and c.message like '%cohérent avec les montants%',
                 'F3 (19 % cohérent) : tva.taux en attention, avec l''explication');
  return next ok((select statut from public.filed_factures where id = f1) <> 'bloquee'
                 or exists (select 1 from public.filed_controles where facture_id = f1 and resultat = 'anomalie' and gravite = 'bloquant' and code <> 'tva.taux'),
                 'F3 n''est plus bloquée par tva.taux');
  -- 19 % incohérent (780 × 19 % ≠ 150) : bloquant.
  f2 := tests.a4_facture_taux(o, 'MCD-2026-1003-B', 780, 150, '[{"taux": 19, "base": 780, "montant": 150}]');
  return next ok((select gravite = 'bloquant' and message like '%ne redonne pas la TVA facturée%' from public.filed_controles where facture_id = f2 and code = 'tva.taux'),
                 'Le même taux, incohérent avec les montants : bloquant');
  -- Sans base ni montant dans la ventilation : HT × taux = TVA suffit.
  f3 := tests.a4_facture_taux(o, 'MCD-2026-1003-C', 780, 148.20, '[{"taux": 19}]');
  return next is((select gravite from public.filed_controles where facture_id = f3 and code = 'tva.taux'), 'attention',
                 'Taux seul, HT × taux = TVA : attention');
end $f$;
