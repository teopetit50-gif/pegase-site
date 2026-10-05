-- 00 — Aides des tests TIROMA (session B3), posées dans le schéma `tests` d'A5 (omega/tests/socle/00_installation.sql
-- doit être passé avant : tests.endosser, tests.redevenir_admin, tests.compter, tests.jeu, tests.appeler_privee).
-- Jouable tel quel par execute_sql sur la RECETTE. Rien ici n'écrit dans le socle ; les tests écrivent sous runtests(),
-- qui annule tout à la fin de chaque test.

-- Le client du banc et son entité principale.
create or replace function tests.b3_banc() returns uuid language sql immutable as $$
  select 'cccccccc-0000-4000-8000-00000000000c'::uuid
$$;

create or replace function tests.b3_entite() returns uuid language sql stable as $$
  select e.id from public.entites e where e.client_id = tests.b3_banc() order by e.principale desc, e.id limit 1
$$;

-- Un compte du banc par son préfixe : gerant | referent | daf | daf2 (adresses <prefixe>@banc-varelo.test).
create or replace function tests.b3_compte(p_prefixe text) returns uuid language plpgsql stable as $$
declare v uuid;
begin
  select u.id into v from auth.users u where lower(u.email) = lower(p_prefixe || '@banc-varelo.test') limit 1;
  if v is null then
    raise exception 'tests.b3_compte : aucun compte % sur le banc', p_prefixe;
  end if;
  return v;
end $$;

-- Endosser un compte du banc par son préfixe.
create or replace function tests.b3_endosser(p_prefixe text) returns void language plpgsql as $$
begin
  perform tests.endosser(tests.b3_compte(p_prefixe), p_prefixe || '@banc-varelo.test');
end $$;

-- Installer le cabinet du banc comme le ferait le gérant depuis l'espace (porte publique, sous son jeton),
-- puis lui donner le profil de titulaire. Rend l'identifiant du cabinet. Le test qui l'appelle est annulé par runtests().
create or replace function tests.b3_installer(p_logiciel text default 'logosw') returns uuid language plpgsql as $$
declare v_cabinet uuid;
begin
  perform tests.b3_endosser('gerant');
  v_cabinet := public.tiroma_installer_cabinet(tests.b3_banc(), tests.b3_entite(), p_logiciel, 'cabinet', null);
  insert into public.tiroma_profils (client_id, user_id, entite_id, profil)
  values (tests.b3_banc(), tests.b3_compte('gerant'), tests.b3_entite(), 'titulaire');
  return v_cabinet;
end $$;

-- L'équipe type du scénario : un praticien pour daf (collaborateur), un membre pour referent (assistante),
-- et trois fauteuils. À appeler sous le jeton du gérant titulaire (après b3_installer). Rend les identifiants.
create or replace function tests.b3_equipe() returns jsonb language plpgsql as $$
declare v_prat uuid; v_prat2 uuid; v_membre uuid; f1 uuid; f2 uuid; f3 uuid;
begin
  insert into public.tiroma_praticiens (client_id, entite_id, nom_affiche, metier)
  values (tests.b3_banc(), tests.b3_entite(), 'Dr Titulaire (banc)', 'titulaire') returning id into v_prat;
  insert into public.tiroma_praticiens (client_id, entite_id, nom_affiche, metier)
  values (tests.b3_banc(), tests.b3_entite(), 'Dr Collaborateur (banc)', 'collaborateur') returning id into v_prat2;
  insert into public.tiroma_fauteuils (client_id, entite_id, nom, capacites)
  values (tests.b3_banc(), tests.b3_entite(), 'Fauteuil 1', array['soins', 'prevention']) returning id into f1;
  insert into public.tiroma_fauteuils (client_id, entite_id, nom, capacites)
  values (tests.b3_banc(), tests.b3_entite(), 'Fauteuil 2', array['soins', 'prothese', 'chirurgie']) returning id into f2;
  insert into public.tiroma_fauteuils (client_id, entite_id, nom, capacites)
  values (tests.b3_banc(), tests.b3_entite(), 'Fauteuil 3', array['orthodontie', 'soins']) returning id into f3;
  insert into public.tiroma_membres (client_id, entite_id, prenom, fauteuil_habituel_id)
  values (tests.b3_banc(), tests.b3_entite(), 'Assistante (banc)', f1) returning id into v_membre;
  insert into public.tiroma_profils (client_id, user_id, entite_id, profil, praticien_id)
  values (tests.b3_banc(), tests.b3_compte('daf'), tests.b3_entite(), 'collaborateur', v_prat2);
  insert into public.tiroma_profils (client_id, user_id, entite_id, profil, membre_id)
  values (tests.b3_banc(), tests.b3_compte('referent'), tests.b3_entite(), 'assistante', v_membre);
  return jsonb_build_object('praticien', v_prat, 'collaborateur', v_prat2, 'membre', v_membre, 'f1', f1, 'f2', f2, 'f3', f3);
end $$;

-- Les horaires du scénario : lundi–vendredi 8 h–12 h et 14 h–19 h, samedi 8 h–12 h (horaires du cabinet, sans praticien
-- ni fauteuil). Sous le jeton du titulaire.
create or replace function tests.b3_horaires() returns integer language plpgsql as $$
declare j integer; n integer := 0;
begin
  for j in 1..5 loop
    insert into public.tiroma_horaires (client_id, entite_id, jour, debut, fin) values (tests.b3_banc(), tests.b3_entite(), j, '08:00', '12:00');
    insert into public.tiroma_horaires (client_id, entite_id, jour, debut, fin) values (tests.b3_banc(), tests.b3_entite(), j, '14:00', '19:00');
    n := n + 2;
  end loop;
  insert into public.tiroma_horaires (client_id, entite_id, jour, debut, fin) values (tests.b3_banc(), tests.b3_entite(), 6, '08:00', '12:00');
  return n + 1;
end $$;

-- Le prochain jour de la semaine demandé (isodow 1..7) après aujourd'hui, plus p_apres semaines.
create or replace function tests.b3_prochain(p_isodow integer, p_apres integer default 1) returns date language sql stable as $$
  select (current_date + ((p_isodow - extract(isodow from current_date)::integer + 7) % 7 + 7 * p_apres))::date
$$;

-- Minutes ouvertes d'un fauteuil un jour donné, d'après private.tiroma_ouvert (à appeler en admin).
create or replace function tests.b3_minutes_ouvertes(p_fauteuil uuid, p_jour date) returns numeric language sql stable as $$
  select private.tiroma_minutes(private.tiroma_ouvert(tests.b3_banc(), tests.b3_entite(), p_fauteuil, p_jour))
$$;

-- Le premier jour férié du territoire de l'entité du banc dans l'année qui vient (null si aucun).
create or replace function tests.b3_ferie() returns date language plpgsql stable as $$
declare t text; d date;
begin
  t := private.territoire_de_entite(tests.b3_banc(), tests.b3_entite());
  if t is null then return null; end if;
  for d in select generate_series(current_date + 1, current_date + 400, interval '1 day')::date loop
    if public.jour_ferie(d, t) and extract(isodow from d) between 1 and 5 then return d; end if;
  end loop;
  return null;
end $$;

grant execute on all functions in schema tests to authenticated;
select 'aides B3 posées' as resultat;
