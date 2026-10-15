-- c3_08 — REPUT : une réponse hors base écrite par une personne devient une fiche proposée (migration c3_08).
-- Exécutable tel quel par execute_sql sur la RECETTE, après c3_00 à c3_07 (aides tests.c3_*) et les migrations c3_01 à c3_08.
-- runtests() annule tout.

create or replace function tests.test_c3_08_fiches() returns setof text
language plpgsql as $f$
declare
  banc jsonb;
  v_client uuid; v_daf uuid; v_rec bigint; v_dem uuid; v_r jsonb; v_new uuid; v_env uuid; v_fiche uuid; v_statut text;
begin
  banc := tests.c3_banc();
  v_client := (banc ->> 'client')::uuid; v_daf := (banc ->> 'daf')::uuid;
  perform tests.redevenir_admin();
  insert into public.reglages_envois (client_id, module, mode, essai_adresse, canaux)
  select v_client, 'reput', 'essai', 'essais@omegaai.fr', array['email']
  where not exists (select 1 from public.reglages_envois r where r.client_id = v_client and r.module = 'reput');
  perform public.reput_installer(v_client);

  -- Une question hors de la base ; une personne écrit la réponse ; elle part.
  v_rec := tests.c3_reception_detail(v_client, 'email', 'garantie@exemple.test', 'Client', 'Quelle est la durée de garantie de vos poses ?');
  v_dem := (public.reput_commencer(v_rec) ->> 'demande')::uuid;
  v_r := public.reput_deposer_reponse(v_dem, '{"sujet":"information","langue":"fr","couverte":false,"corps":"Nous vérifions et revenons vers vous."}'::jsonb);
  perform tests.endosser(v_daf, 'daf@banc-varelo.test');
  v_new := (public.reput_corriger((v_r ->> 'reponse')::uuid, 'Nos poses sont garanties deux ans, pièces et main-d''œuvre.') ->> 'reponse')::uuid;
  perform tests.redevenir_admin();
  perform private.reput_ouvrier(20);
  perform tests.endosser(v_daf, 'daf@banc-varelo.test');
  perform public.reput_decider(v_new, 'valider');
  perform tests.redevenir_admin();
  select p.envoi_id into v_env from public.reput_reponses p where p.id = v_new;
  v_statut := tests.c3_remettre(v_env);
  perform private.reput_synchroniser(v_client);
  return next is((select p.statut from public.reput_reponses p where p.id = v_new), 'envoyee', 'La réponse écrite par la personne est partie (' || coalesce(v_statut, '?') || ')');

  perform private.reput_ouvrier(20);
  select p.fiche_proposee into v_fiche from public.reput_reponses p where p.id = v_new;
  return next ok(v_fiche is not null, 'Une fiche est proposée à partir de cette réponse');
  return next is((select c.statut from public.reput_connaissances c where c.id = v_fiche), 'brouillon', 'en brouillon : à relire avant d''entrer dans la base');
  return next is((select c.contenu from public.reput_connaissances c where c.id = v_fiche), 'Nos poses sont garanties deux ans, pièces et main-d''œuvre.',
                 'Son contenu est la réponse écrite par la personne');
  return next is((select c.titre from public.reput_connaissances c where c.id = v_fiche), 'Quelle est la durée de garantie de vos poses ?', 'Sa question est celle du client');
  return next is((select c.cree_par from public.reput_connaissances c where c.id = v_fiche), v_daf, 'rédigée au nom de la personne');
  return next is((select c.sujet from public.reput_connaissances c where c.id = v_fiche), 'information', 'sur le sujet de la demande');
  return next ok(not (private.reput_base(v_client) -> 'fiches') @> jsonb_build_array(jsonb_build_object('id', v_fiche)), 'Pas encore dans la base en vigueur');
  perform private.reput_ouvrier(20);
  return next is((select count(*)::int from public.reput_connaissances c where c.client_id = v_client and c.contenu = 'Nos poses sont garanties deux ans, pièces et main-d''œuvre.'), 1,
                 'Une seule fiche par réponse');
  perform tests.endosser(v_daf, 'daf@banc-varelo.test');
  perform public.reput_valider_connaissance(v_fiche);
  perform tests.redevenir_admin();
  return next ok((private.reput_base(v_client) -> 'fiches') @> jsonb_build_array(jsonb_build_object('id', v_fiche)),
                 'Validée, elle entre dans la base : la prochaine question sur la garantie partira tirée de la base');
  return next ok(tests.c3_journal(v_client, 'reput.fiche_proposee', v_fiche::text) is not null, 'Journal : reput.fiche_proposee');
end $f$;

select * from runtests('tests'::name, '^test_c3_08_');
