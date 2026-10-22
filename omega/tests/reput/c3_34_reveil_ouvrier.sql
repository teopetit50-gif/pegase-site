-- c3_34 — REPUT, TREPUT-05 : un travail reput.preparer réveille l'ouvrier aussitôt (pg_net, au COMMIT), le cron reste le
-- filet. Exécutable tel quel par execute_sql sur la RECETTE, après c3_00 et les migrations c3_01 à c3_34. Aucun travail
-- n'est inséré ; aucune requête ne part (runtests() annule tout, la file pg_net comprise).

create or replace function tests.test_c3_34_reveil_ouvrier() returns setof text
language plpgsql as $f$
declare
  t public.travaux := jsonb_populate_record(null::public.travaux, '{"id": 34, "genre": "reput.preparer", "etat": "a_faire"}');
begin
  perform tests.redevenir_admin();
  insert into private.reglages (cle, valeur) values ('reput_reponse_url', '') on conflict (cle) do update set valeur = '';
  return next is(private.reput_reveil(t), null::jsonb, 'Adresse de la fonction non réglée : pas de réveil, le cron suffit');

  update private.reglages set valeur = 'https://exemple.test/functions/v1/reput-reponse/' where cle = 'reput_reponse_url';
  return next is(private.reput_reveil(t), '{"url": "https://exemple.test/functions/v1/reput-reponse?nombre=1", "travail": 34}'::jsonb,
                 'Réglée : un réveil pour CE travail (un seul pris)');
  return next is(private.reput_reveil(jsonb_populate_record(t, '{"genre": "lecteur.lire"}')), null::jsonb, 'Un autre genre ne réveille pas REPUT');
  return next is(private.reput_reveil(jsonb_populate_record(t, '{"etat": "fait"}')), null::jsonb, 'Un travail déjà fait non plus');
  update private.reglages set valeur = 'http://exemple.test/x' where cle = 'reput_reponse_url';
  return next is(private.reput_reveil(t), null::jsonb, 'Une adresse sans https est ignorée');

  return next ok(exists (select 1 from pg_trigger g where g.tgname = 'reput_reveil' and g.tgrelid = 'public.travaux'::regclass and not g.tgisinternal),
                 'Le déclencheur est posé sur public.travaux');
  return next ok(not has_function_privilege('authenticated', 'private.reput_reveil(public.travaux)', 'execute'),
                 'La fonction de réveil reste au serveur');
end $f$;

select * from runtests('tests'::name, '^test_c3_34_');
