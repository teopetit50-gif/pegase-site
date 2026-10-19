-- Tests A4 — lot 50 (a4_58) : l'octroi de mer dans le total ; la mention d'exonération. Données fictives, montants du
-- cas réel NOBAT (HT 715,40 + TVA 0,26 + octroi de mer 32,05 = TTC 747,71).
-- pgTAP, schéma « tests » d'A5 ; utilise tests.a4_organisation et tests.a4_facture (a4_10_facture_electronique.sql),
-- à poser avant. Ce fichier ne supprime rien.

-- Une facture aux montants donnés, avec des valeurs lues en plus.
create or replace function tests.a4_facture_dom(p_org jsonb, p_numero text, p_ht numeric, p_tva numeric, p_ttc numeric, p_valeurs jsonb)
returns jsonb language plpgsql as $$
declare fa jsonb := tests.a4_facture(p_org, 'ia', p_numero, p_ttc); k text;
begin
  update public.filed_factures set montant_ht = p_ht, montant_tva = p_tva, montant_ttc = p_ttc where id = (fa ->> 'facture')::uuid;
  for k in select jsonb_object_keys(p_valeurs) loop
    insert into public.pieces_valeurs (client_id, piece_id, champ, valeur, texte, source, confiance, verifiee)
    values ((p_org ->> 'client')::uuid, (fa ->> 'piece')::uuid, k, p_valeurs -> k, left(p_valeurs ->> k, 200), 'ia', 0.95, true);
  end loop;
  perform private.filed_controler_facture((fa ->> 'facture')::uuid);
  return fa;
end $$;

create or replace function tests.test_a4_58_01_octroi() returns setof text
language plpgsql as $f$
declare o jsonb := tests.a4_organisation(); a jsonb; b jsonb; c jsonb; d jsonb; f public.filed_factures; r record;
begin
  -- Le cas réel : HT 715,40 + TVA 0,26 + octroi de mer 32,05 = TTC 747,71, mention d'exonération relevée.
  a := tests.a4_facture_dom(o, 'NOBAT-001', 715.40, 0.26, 747.71, jsonb_build_object(
         'taxes.autres', jsonb_build_array(jsonb_build_object('code', 'omr', 'libelle', 'Octroi de mer', 'base', 715.40, 'taux', 4.48, 'montant', '32,05')),
         'mention.exoneration', 'Exonération de TVA, article 295 du CGI'));
  select * into f from public.filed_factures where id = (a ->> 'facture')::uuid;
  return next is(f.autres_taxes_montant, 32.05::numeric, 'L''octroi de mer est rangé sur la facture');
  return next is(f.autres_taxes -> 0 ->> 'code', 'OMR', 'avec son code');
  select * into r from public.filed_controles where facture_id = f.id and code = 'montant.coherence';
  return next ok(r.resultat = 'ok' and r.message like 'HT + TVA + Octroi de mer (32,05 €) = TTC.', 'HT + TVA + octroi = TTC : plus d''écart — ' || r.message);
  return next ok(not exists (select 1 from public.filed_controles where facture_id = f.id and code = 'tva.taux' and gravite = 'bloquant' and resultat = 'anomalie'),
                 'En partie exonérée, sans ventilation : le taux moyen n''est plus bloquant');

  -- Sans l'octroi lu : l'écart de 32,05 € reste signalé.
  b := tests.a4_facture_dom(o, 'NOBAT-002', 715.40, 0.26, 747.71, '{}'::jsonb);
  return next is((select resultat from public.filed_controles where facture_id = (b ->> 'facture')::uuid and code = 'montant.coherence'), 'anomalie',
                 'Sans octroi lu, l''écart reste');

  -- Aucune TVA, mention d'exonération relevée : exonérée, plus de tva.sans_mention ; sans la mention : signalé.
  c := tests.a4_facture_dom(o, 'NOBAT-003', 500, 0, 500, jsonb_build_object('mention.exoneration', true));
  return next ok((select regime_tva = 'exonere' from public.filed_factures where id = (c ->> 'facture')::uuid)
                 and not exists (select 1 from public.filed_controles where facture_id = (c ->> 'facture')::uuid and code = 'tva.sans_mention' and resultat = 'anomalie'),
                 'Mention d''exonération relevée : régime exonéré, pas d''alerte « sans mention »');
  d := tests.a4_facture_dom(o, 'NOBAT-004', 500, 0, 500, '{}'::jsonb);
  return next is((select resultat from public.filed_controles where facture_id = (d ->> 'facture')::uuid and code = 'tva.sans_mention'), 'anomalie',
                 'Sans la mention : toujours signalé');

  -- « octroi_mer.montant » seul suffit aussi.
  d := tests.a4_facture_dom(o, 'NOBAT-005', 100, 20, 125, jsonb_build_object('octroi_mer.montant', 5));
  return next is((select resultat from public.filed_controles where facture_id = (d ->> 'facture')::uuid and code = 'montant.coherence'), 'ok',
                 '« octroi_mer.montant » seul : HT + TVA + octroi = TTC');
end $f$;
