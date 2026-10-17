-- c3_10 — REPUT : les lignes du point du matin mènent à la demande dans /espace2 (migration c3_10).
-- Exécutable tel quel par execute_sql sur la RECETTE, après c3_00 à c3_09 (aides tests.c3_*, dont tests.c3_repondre
-- de c3_03) et les migrations c3_01 à c3_10. runtests() annule tout.

create or replace function tests.test_c3_10_liens() returns setof text
language plpgsql as $f$
declare
  banc jsonb;
  v_client uuid; v_r jsonb; v_dem uuid; v_items jsonb;
begin
  banc := tests.c3_banc();
  v_client := (banc ->> 'client')::uuid;
  perform tests.redevenir_admin();
  insert into public.reglages_envois (client_id, module, mode, essai_adresse, canaux)
  select v_client, 'reput', 'essai', 'essais@omegaai.fr', array['email']
  where not exists (select 1 from public.reglages_envois r where r.client_id = v_client and r.module = 'reput');
  perform public.reput_installer(v_client);
  v_r := tests.c3_repondre(v_client, 'c3-10@exemple.test', 'Client C3-10', 'Vous faites les chaudières ?', 'autre', false, null,
                           'Nous transmettons votre question à l''équipe.');
  v_dem := (select d.id from public.reput_demandes d join public.receptions r on r.id = d.reception_id
            where d.client_id = v_client and r.de_adresse = 'c3-10@exemple.test' order by d.cree_le desc limit 1);

  v_items := private.reput_point_matin_lignes(v_client, ((now() at time zone 'Europe/Paris')::date + 1));
  return next ok(exists (select 1 from jsonb_array_elements(v_items) x where x ->> 'objet_id' = v_dem::text
                         and x ->> 'lien' = '/espace2/reput?demande=' || v_dem::text),
                 'La ligne d''une demande mène à cette demande, ouverte, dans /espace2/reput');
  return next ok(not exists (select 1 from jsonb_array_elements(v_items) x where x ->> 'lien' like '/espace/%'),
                 'Aucune ligne ne mène à l''ancien dessin (/espace sans le 2)');
  return next ok(not exists (select 1 from jsonb_array_elements(v_items) x where x ->> 'lien' not like '/espace2/reput%'),
                 'Toutes les lignes mènent à l''écran REPUT du nouvel espace');
  return next ok(not has_function_privilege('authenticated', 'private.reput_point_matin_lignes(uuid, date)', 'execute'),
                 'Les lignes restent fermées aux utilisateurs');
end $f$;

select * from runtests('tests'::name, '^test_c3_10_');
