-- Tests A4 — lot 75 (a4_83) : TFILED-17, un second avis de la même personne sur une demande FILED est refusé en clair.
-- pgTAP, schéma « tests » d'A5 ; utilise tests.a4_organisation, tests.a4_facture (a4_10_facture_electronique.sql) et
-- tests.a4_comme (a4_26_sortie_envois.sql), à poser avant. Données d'exemple ; ce fichier ne supprime rien.

create or replace function tests.test_a4_83_01_avis_deja_donne() returns setof text
language plpgsql as $f$
declare o jsonb := tests.a4_organisation(); v uuid := (o ->> 'valideur')::uuid; fa jsonb; v_d uuid;
begin
  -- Un circuit à deux approbations : la demande reste en attente après le premier avis.
  reset role; perform tests.a4_comme((o ->> 'gerant')::uuid);
  perform public.filed_regler_circuit((o ->> 'client')::uuid, null, null, 1000, null, 2, array['gerant', 'admin', 'valideur']);
  reset role;
  fa := tests.a4_facture(o, 'ia', 'AVIS-001', 1200);
  perform private.filed_controler_facture((fa ->> 'facture')::uuid);
  select x.demande_id into v_d from public.filed_validations x where x.facture_id = (fa ->> 'facture')::uuid and x.issue is null;
  reset role; perform tests.a4_comme(v);
  insert into public.approbations (demande_id, decision) values (v_d, 'approuve');
  return next throws_like(format('insert into public.approbations (demande_id, decision) values (%L, %L)', v_d, 'approuve'),
                          'Vous avez déjà donné votre avis sur cette demande (approuvée le %) : il compte déjà.',
                          'Un second avis de la même personne : refus clair, pas la contrainte');
  reset role;
  return next is((select count(*) from public.approbations where demande_id = v_d), 1::bigint, 'un seul avis reste');
end $f$;
