-- Tests A4 — lot 38 (a4_46) : l'historique FILED est chaîné, vérifiable, scellable. Données fictives.
-- pgTAP, schéma « tests » d'A5 ; utilise tests.a4_organisation (a4_10_facture_electronique.sql) et tests.a4_comme
-- (a4_26_sortie_envois.sql), à poser avant. Ce fichier ne supprime ni ne modifie aucune ligne de l'historique : la
-- falsification est simulée sur une copie de la ligne, en mémoire.

create or replace function tests.test_a4_46_01_chaine() returns setof text
language plpgsql as $f$
declare o jsonb := tests.a4_organisation(); v_cl uuid := (o ->> 'client')::uuid; v jsonb; r public.filed_historique; s jsonb; n0 bigint;
begin
  select count(*) into n0 from public.filed_historique where client_id = v_cl and rang is not null;
  perform private.filed_historiser(v_cl, null, 'filed_document', 'test-1', 'recu', 'Pièce d''exemple reçue.', '{"n": 1}');
  perform private.filed_historiser(v_cl, null, 'filed_document', 'test-1', 'lu', 'Pièce d''exemple lue.', '{"n": 2, "vide": null}');
  perform private.filed_historiser(v_cl, null, 'filed_document', 'test-1', 'classe', 'Pièce d''exemple classée.', '{}');

  return next is((select count(*) from public.filed_historique where client_id = v_cl and rang is not null), n0 + 3,
                 'Chaque ligne nouvelle reçoit un rang');
  return next is((select array_agg(rang order by rang) from public.filed_historique where client_id = v_cl and rang > n0),
                 array[n0 + 1, n0 + 2, n0 + 3], 'Les rangs se suivent dans l''organisation');
  return next ok((select bool_and(h.empreinte_precedente = p.empreinte) from public.filed_historique h
                    join public.filed_historique p on p.client_id = h.client_id and p.rang = h.rang - 1
                   where h.client_id = v_cl and h.rang > n0 + 1), 'Chaque ligne porte l''empreinte de la précédente');

  reset role; perform tests.a4_comme((o ->> 'gerant')::uuid);
  v := public.filed_verifier_historique(v_cl);
  s := public.filed_sceau_historique(v_cl);
  reset role;
  return next ok((v ->> 'intacte')::boolean, 'La chaîne vérifiée est intacte : ' || v::text);
  return next is((v ->> 'dernier_rang')::bigint, n0 + 3, 'jusqu''au dernier rang');
  return next is(s ->> 'empreinte', v ->> 'empreinte', 'Le sceau rend la dernière empreinte');

  -- Une ligne réécrite (simulée sur une copie) ne redonne plus son empreinte.
  select * into r from public.filed_historique where client_id = v_cl and rang = n0 + 2;
  return next is(private.filed_empreinte_historique(r), r.empreinte, 'L''empreinte se recalcule à l''identique');
  r.message := 'Pièce d''exemple lue (réécrite).';
  return next isnt(private.filed_empreinte_historique(r), r.empreinte, 'Un message réécrit change l''empreinte');
  select * into r from public.filed_historique where client_id = v_cl and rang = n0 + 2;
  r.survenu_le := r.survenu_le + interval '1 second';
  return next isnt(private.filed_empreinte_historique(r), r.empreinte, 'une date réécrite aussi');

  reset role; perform tests.a4_comme((o ->> 'valideur')::uuid);
  return next throws_ok(format('select public.filed_verifier_historique(%L)', v_cl), '42501', null, 'La vérification est pour le gérant ou l''admin');
  reset role;
  return next ok(exists (select 1 from pg_trigger where tgrelid = 'public.filed_historique'::regclass and tgname = 'zz_filed_historique_chainer'),
                 'Le déclencheur de chaînage est posé');
end $f$;
