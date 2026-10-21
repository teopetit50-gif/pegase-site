-- c3_31 — REPUT, correctif TREPUT-06 : le point du matin compte les validations qui attendent vraiment dans la file, même
-- quand les demandes sont bloquées à l'envoi. Exécutable tel quel par execute_sql sur la RECETTE, après c3_00 à c3_30 (aides
-- tests.c3_*, dont tests.c3_15_demande de c3_15) et les migrations c3_01 à c3_31. runtests() annule tout.

create or replace function tests.test_c3_31_point_matin_file() returns setof text
language plpgsql as $f$
declare
  banc jsonb;
  v_client uuid; v_a uuid; v_b uuid; v_items jsonb; v_attendu int; v_texte text;
begin
  banc := tests.c3_banc();
  v_client := (banc ->> 'client')::uuid;
  perform tests.redevenir_admin();
  insert into public.reglages_envois (client_id, module, mode, essai_adresse, canaux)
  select v_client, 'reput', 'essai', 'essais@omegaai.fr', array['email']
  where not exists (select 1 from public.reglages_envois r where r.client_id = v_client and r.module = 'reput');
  perform public.reput_installer(v_client);
  -- deux réponses préparées, dont l'envoi est bloqué (comme sur le banc sans réglage d'envoi) : leur validation attend
  v_a := tests.c3_15_demande(v_client, 'email', 'c3-31a@exemple.test', 'Fictif A', 'Ouvert samedi ?', now() - interval '2 hours');
  perform public.reput_deposer_reponse(v_a, jsonb_build_object('sujet', 'horaires', 'langue', 'fr', 'couverte', false, 'corps', 'Nous vérifions.'));
  v_b := tests.c3_15_demande(v_client, 'email', 'c3-31b@exemple.test', 'Fictif B', 'Un devis ?', now() - interval '1 hour');
  perform public.reput_deposer_reponse(v_b, jsonb_build_object('sujet', 'devis', 'langue', 'fr', 'couverte', false, 'corps', 'Nous vérifions.'));
  update public.reput_reponses set statut = 'bloquee' where demande_id in (v_a, v_b);
  update public.reput_demandes set statut = 'bloquee' where id in (v_a, v_b);

  select count(*)::int into v_attendu from public.demandes_validation v
  where v.client_id = v_client and v.module = 'reput' and v.statut = 'en_attente' and v.echeance > now();
  v_items := private.reput_point_matin_lignes(v_client, (now() at time zone private.reput_fuseau(v_client, null))::date + 1);
  v_texte := v_items -> 0 ->> 'texte';
  return next ok(v_attendu >= 2, 'Au moins deux validations REPUT attendent dans la file');
  return next ok(v_texte like format('%%En attente de votre validation : %s.%%', v_attendu),
                 'L''entête compte ce qui attend dans la file — ' || coalesce(v_texte, ''));
  return next ok(v_texte not like '%En attente de votre validation : 0.%', 'Plus de « 0 » quand des validations attendent');
  return next ok(v_texte like '%Bloquées à l''envoi (réglage d''envoi à vérifier) : %', 'Les demandes bloquées à l''envoi sont dites à part');
  return next is(v_items -> 0 ->> 'gravite', 'attention', 'Gravité : attention');
end $f$;

select * from runtests('tests'::name, '^test_c3_31_');
