-- Diagnostic A4 du test a4_44 (lot 36) — à jouer À LA MAIN sur la recette, après a4_10, a4_19 et a4_32 : il crée une
-- organisation d'exemple (données fictives), contrôle une facture allemande à 19 %, affiche par NOTICE le régime, le
-- territoire, les taux connus, les lignes de TVA et les contrôles tva / montant / lecture, puis lève une erreur voulue :
-- tout est annulé, rien ne reste. Aucune suppression, aucun envoi.

do $diag$
declare o jsonb := tests.a4_organisation(); de jsonb; v_f uuid; r record;
begin
  de := tests.a4_facture_etrangere(o, 'DE-44-DIAG', 'DE', 'DE136695976'); v_f := (de ->> 'facture')::uuid;
  update public.filed_factures set regime_tva = null, montant_ht = 100, montant_tva = 19, montant_ttc = 119 where id = v_f;
  insert into public.filed_factures_tva (client_id, facture_id, document_id, categorie, taux, base, montant, source)
  values ((o ->> 'client')::uuid, v_f, (de ->> 'document')::uuid, 'S', 19, 100, 19, 'xml');
  perform private.filed_controler_facture(v_f);
  for r in
    select 'facture' k, concat_ws(' | ', statut, regime_tva, montant_ht, montant_tva, montant_ttc) v from public.filed_factures where id = v_f
    union all select 'territoire', coalesce(private.filed_regime_territorial((o ->> 'client')::uuid, (o ->> 'entite')::uuid), '(null)')
    union all select 'taux_fr', (select string_agg(distinct regime || ':' || taux, ', ') from public.filed_taux_tva)
    union all select 'lignes_tva', coalesce((select string_agg(concat_ws('/', categorie, taux, base, montant, source), ', ') from public.filed_factures_tva where facture_id = v_f), '(aucune)')
    union all select 'controle', concat_ws(' | ', code, gravite, resultat, left(message, 110)) from public.filed_controles
      where facture_id = v_f and (code like 'tva.%' or code like 'montant.%' or code like 'lecture.%')
  loop raise notice '% : %', r.k, r.v; end loop;
  raise exception 'diagnostic a4_44 : fin, tout est annulé';
end $diag$;
