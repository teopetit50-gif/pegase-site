-- Tests B7 — les portes de l'ouvrier taux-bce (lot b7_07), en pgTAP, schéma « tests » d'A5.
-- Exécutable tel quel par execute_sql sur la RECETTE, après a4_22 (filed_taux_change) et b7_07_taux_bce.sql.
-- Devise d'essai XTS (code ISO 4217 réservé aux essais) et dates de 2999 : jamais en conflit avec de vrais taux.
-- runtests() annule tout.

create or replace function tests.test_b7_14_taux_bce() returns setof text
language plpgsql as $f$
declare
  b jsonb; e jsonb; n_alertes int; v_id bigint; p public.taux_bce_passages;
  v_aujourdhui text := to_char((now() at time zone 'Europe/Berlin')::date, 'YYYY-MM-DD');
begin
  -- 1. Un lot neuf : tout est posé, source bce.
  b := public.taux_bce_poser_lot('[{"devise":"XTS","jour":"2999-01-04","taux":"1.1269"},
                                   {"devise":"xts","jour":"2999-01-05","taux":"1.1300"}]'::jsonb);
  return next is(b ->> 'poses', '2', 'Deux taux neufs posés');
  return next is((select taux from public.filed_taux_change where devise = 'XTS' and jour = '2999-01-04'), 1.1269::numeric, 'le taux est en base');
  return next is((select source from public.filed_taux_change where devise = 'XTS' and jour = '2999-01-05'), 'bce', 'source bce, devise en majuscules');

  -- 2. Rejouer : rien de réécrit ; un taux corrigé par la BCE est réécrit.
  b := public.taux_bce_poser_lot('[{"devise":"XTS","jour":"2999-01-04","taux":"1.12690"},{"devise":"XTS","jour":"2999-01-05","taux":"1.1311"}]'::jsonb);
  return next is(b ->> 'inchanges', '1', 'Un taux identique n''est pas réécrit');
  return next is(b ->> 'poses', '1', 'un taux corrigé l''est');
  return next is((select count(*) from public.filed_taux_change where devise = 'XTS'), 2::bigint, 'aucun doublon');

  -- 3. Une saisie humaine n'est jamais écrasée.
  perform public.filed_poser_taux_change('XTS', '2999-01-06', 2.0, 'saisie');
  b := public.taux_bce_poser_lot('[{"devise":"XTS","jour":"2999-01-06","taux":"1.5"}]'::jsonb);
  return next is(b ->> 'saisies_gardees', '1', 'La saisie est gardée');
  return next is((select taux from public.filed_taux_change where devise = 'XTS' and jour = '2999-01-06'), 2.0::numeric, 'et son taux aussi');

  -- 4. Les lignes fausses sont refusées une à une, sans empêcher les autres.
  b := public.taux_bce_poser_lot('[{"devise":"EUR","jour":"2999-01-07","taux":"1"},{"devise":"XTS","jour":"pas une date","taux":"1"},
                                   {"devise":"XTS","jour":"2999-01-07","taux":"-1"},{"devise":"XTS","jour":"2999-01-07","taux":"1.2"}]'::jsonb);
  return next is(b, '{"recus": 4, "poses": 1, "refuses": 3, "inchanges": 0, "saisies_gardees": 0}'::jsonb, 'EUR, date fausse, taux négatif refusés ; le bon passe');
  return next throws_ok($$select public.taux_bce_poser_lot('{"devise":"XTS"}'::jsonb)$$, '22023', null, 'Un lot qui n''est pas un tableau est refusé');

  -- 5. L'état : le dernier jour BCE et ses devises (la saisie ne compte pas).
  e := public.taux_bce_etat();
  return next is(e ->> 'dernier_jour', '2999-01-07', 'État : le dernier jour BCE');
  return next is((e ->> 'devises')::int, 1, 'État : une devise ce jour-là');

  -- 6. Le passage et l'alerte : une seule alerte par jour, refermée quand les taux du jour arrivent.
  select count(*) into n_alertes from public.alertes where cle_regroupement = 'taux_bce:' || v_aujourdhui and acquittee_le is null;
  v_id := public.taux_bce_noter_passage('{"jour_bce":"2999-01-05","poses":0}'::jsonb, 'Aucun taux BCE pour aujourd''hui (essai).');
  select * into p from public.taux_bce_passages where id = v_id;
  return next ok(p.id is not null and p.jour_bce = '2999-01-05' and p.alerte is not null, 'Le passage est noté avec son alerte');
  perform public.taux_bce_noter_passage('{"jour_bce":"2999-01-05","poses":0}'::jsonb, 'Aucun taux BCE pour aujourd''hui (essai, bis).');
  return next is((select count(*)::int from public.alertes where cle_regroupement = 'taux_bce:' || v_aujourdhui and acquittee_le is null),
                 greatest(n_alertes, 1), 'Une seule alerte ouverte par jour, même après deux passages');
  return next ok((select interne and client_id is null and niveau = 'attention' from public.alertes
                   where cle_regroupement = 'taux_bce:' || v_aujourdhui and acquittee_le is null limit 1), 'alerte interne, sans client, niveau attention');
  perform public.taux_bce_noter_passage(jsonb_build_object('jour_bce', v_aujourdhui, 'poses', 29), null);
  return next is((select count(*)::int from public.alertes where cle_regroupement = 'taux_bce:' || v_aujourdhui and acquittee_le is null), 0,
                 'Les taux du jour posés : l''alerte du jour se referme');

  -- 7. La veille ne casse pas (son résultat dépend de l'heure).
  return next ok(public.taux_bce_veiller() is not null, 'taux_bce_veiller répond');

  -- 8. Droits : service seul.
  return next ok(not has_function_privilege('authenticated', 'public.taux_bce_poser_lot(jsonb)', 'execute'), 'authenticated ne pose pas de taux');
  return next ok(not has_function_privilege('anon', 'public.taux_bce_etat()', 'execute'), 'anon ne lit pas l''état');
  return next ok(has_function_privilege('service_role', 'public.taux_bce_noter_passage(jsonb,text)', 'execute'), 'service_role note un passage');
  return next ok(not has_table_privilege('authenticated', 'public.taux_bce_passages', 'select'), 'authenticated ne lit pas les passages');
end $f$;

select * from runtests('tests'::name, '^test_b7_14');
