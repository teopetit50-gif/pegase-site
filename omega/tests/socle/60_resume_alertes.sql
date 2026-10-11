-- 60 — lot 19ap : le résumé quotidien des alertes (alertes internes, ouvriers silencieux, sauvegarde) et ses portes.
-- Exécutable tel quel par execute_sql sur la RECETTE, après 00_installation.sql et le lot 19ap.
-- runtests() annule tout ce que le test écrit (alertes, battements d'essai).

create or replace function tests.test_60_resume_alertes() returns setof text
language plpgsql as $f$
declare
  jeu jsonb; client_a uuid; r jsonb; v_id text; v_client_id text; n integer;
begin
  if to_regprocedure('private.resume_alertes(timestamp with time zone)') is null then
    return next ok(true, 'lot 19ap absent de cet environnement : sans objet');
    return;
  end if;
  jeu := tests.jeu();
  client_a := (jeu ->> 'client_a')::uuid;

  -- ── Droits : tout est réservé au service ──
  return next ok(not has_function_privilege('authenticated', 'public.resume_alertes_du_jour()', 'execute')
                 and not has_function_privilege('anon', 'public.resume_alertes_du_jour()', 'execute')
                 and not has_function_privilege('authenticated', 'public.marquer_alertes_envoyees(text[])', 'execute')
                 and not has_function_privilege('authenticated', 'private.resume_alertes(timestamp with time zone)', 'execute'),
                 'ni anon ni authenticated ne lisent le résumé ni ne marquent les alertes');
  return next ok(has_function_privilege('service_role', 'public.resume_alertes_du_jour()', 'execute'),
                 'le service lit le résumé');

  -- ── Une alerte interne critique, une alerte client, un ouvrier silencieux ──
  insert into public.alertes (client_id, interne, niveau, source, titre)
  values (null, true, 'critique', 'essai60', 'Alerte interne d''essai 60') returning id::text into v_id;
  insert into public.alertes (client_id, interne, niveau, source, titre)
  values (client_a, false, 'critique', 'essai60', 'Alerte client d''essai 60') returning id::text into v_client_id;
  perform tests.inserer_minimal('public', 'battements', jsonb_build_object('client_id', client_a, 'module', 'essaisoixante',
          'dernier_le', now() - interval '3 days', 'attendu_toutes', '1 day', 'actif', true));

  r := public.resume_alertes_du_jour();
  return next ok((r ->> 'a_signaler')::boolean, 'il y a quelque chose à signaler');
  return next ok(r -> 'alertes' @> jsonb_build_array(jsonb_build_object('titre', 'Alerte interne d''essai 60')),
                 'l''alerte interne critique est dans le résumé');
  return next ok(not (r -> 'alertes' @> jsonb_build_array(jsonb_build_object('titre', 'Alerte client d''essai 60'))),
                 'une alerte destinée au client n''y est pas (elle lui appartient)');
  return next ok(r -> 'battements_en_retard' @> jsonb_build_array(jsonb_build_object('module', 'essaisoixante')),
                 'l''ouvrier silencieux depuis trois jours y est');

  -- ── Marquer : une seule fois, et seulement les alertes internes ──
  n := public.marquer_alertes_envoyees(array[v_id, v_client_id]);
  return next is(n, 1, 'seule l''alerte interne est marquée envoyée');
  n := public.marquer_alertes_envoyees(array[v_id]);
  return next is(n, 0, 'une alerte déjà envoyée ne se remarque pas');
  r := public.resume_alertes_du_jour();
  return next ok(not (r -> 'alertes' @> jsonb_build_array(jsonb_build_object('titre', 'Alerte interne d''essai 60'))),
                 'une alerte envoyée ne revient pas le lendemain');
end $f$;

select * from runtests('tests'::name, '^test_60_');
