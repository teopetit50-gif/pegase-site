-- Tests A4 — lot 46 (a4_54) : la durée d'historique consultable par palier. Données fictives.
-- pgTAP, schéma « tests » d'A5 ; utilise tests.a4_organisation, tests.a4_facture (a4_10_facture_electronique.sql) et
-- tests.a4_comme (a4_26_sortie_envois.sql), à poser avant. Ce fichier ne supprime rien.

create or replace function tests.test_a4_54_01_fenetre() returns setof text
language plpgsql as $f$
declare o jsonb := tests.a4_organisation(); v_cl uuid := (o ->> 'client')::uuid; f jsonb; v_s uuid;
begin
  return next ok((select bool_and(historique_mois is null) from public.filed_paliers where code in ('DECOUVERTE', 'STANDARD', 'ENTREPRISE')),
                 'Les trois paliers : historique complet (décision du 17/10)');
  perform tests.a4_facture(o, 'ia', 'HIS-001', 50);
  reset role; perform tests.a4_comme((o ->> 'gerant')::uuid);
  f := public.filed_fenetre_historique(v_cl);
  return next ok((f ->> 'complet')::boolean and f ->> 'depuis' is null, 'Sans abonnement : complet');
  perform public.filed_changer_palier(v_cl, 'STANDARD');
  reset role;

  -- L'opérateur règle Standard à douze mois.
  set local role service_role;
  perform public.filed_regler_palier('STANDARD', 100, 2, 12, 80, 'prevenir');
  reset role;
  reset role; perform tests.a4_comme((o ->> 'valideur')::uuid);
  f := public.filed_fenetre_historique(v_cl);
  reset role;
  return next is((f ->> 'depuis')::date, (date_trunc('month', now() at time zone 'Europe/Paris') - interval '11 months')::date,
                 'Douze mois : depuis le 1er du onzième mois passé');
  return next ok(f ->> 'texte' like '%tout reste conservé et exportable%', 'La phrase dit que tout reste conservé');

  -- Rien n'est masqué en base : la facture reste lisible, le dossier de sortie reste complet.
  update public.filed_factures set date_emission = current_date - 1100 where client_id = v_cl;   -- une facture de trois ans
  reset role; perform tests.a4_comme((o ->> 'gerant')::uuid);
  return next is((select count(*) from public.filed_factures where client_id = v_cl), 1::bigint, 'La facture ancienne reste en base, lisible');
  v_s := public.filed_preparer_sortie(v_cl);
  reset role;
  return next is((select nb_pieces from public.filed_sorties where id = v_s), 1, 'Le dossier de sortie la contient toujours');
end $f$;
