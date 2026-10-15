-- 27 — Le parking de chaque agence au point du matin (migration b2_18) : dès 5 h à l'heure de l'agence, la remise en
-- location ouverte et le péage à payer du siège arrivent dans leurs sections ; l'agence sans rien à dire n'en reçoit pas.

create or replace function tests.test_b2_27_point_du_matin() returns setof text
language plpgsql as $f$
declare
  jeu jsonb; c uuid; v_siege uuid; v_nord uuid; v_vehicule uuid; n integer;
  j date := (now() at time zone 'Europe/Paris')::date;
begin
  if to_regprocedure('private.loc_b2_deposer_points(timestamp with time zone)') is null then
    return next fail('La migration b2_18 (point du matin) n''est pas posée : private.loc_b2_deposer_points manque');
    return;
  end if;
  jeu := tests.tavaro_jeu_contrat();
  c := (jeu ->> 'client')::uuid; v_siege := (jeu ->> 'siege')::uuid; v_nord := (jeu ->> 'nord')::uuid;
  select x.vehicule_id into v_vehicule from public.loc_contrats x where x.id = (jeu ->> 'contrat')::uuid;
  jeu := tests.tavaro_chiffrer(jeu, 'collab', tests.tavaro_retour() || jsonb_build_object('retour_reel_le', to_char(now() - interval '1 hour', 'YYYY-MM-DD"T"HH24:MI:SSOF')));
  perform tests.redevenir_admin();
  insert into public.loc_passages_peage (client_id, entite_id, operateur, passe_le, immatriculation, vehicule_id, montant_eur, reference, payer_avant)
  values (c, v_siege, 'Sanef', now() - interval '80 hours', 'GA-123-BC', v_vehicule, 3.60, 'B2-27-1', now() - interval '8 hours');

  return next is(private.loc_b2_deposer_points((j + time '04:00') at time zone 'Europe/Paris'), 0, 'Avant 5 h, rien n''est déposé');
  n := private.loc_b2_deposer_points((j + time '07:00') at time zone 'Europe/Paris');
  return next ok(n >= 2, format('À 7 h, les agences du loueur sont servies (%s au total)', n));
  return next ok(exists (select 1 from public.points_sections s where s.client_id = c and s.module = 'tavaro' and s.jour = j and s.role = 'valideur'
                          and s.entite_id = v_siege and s.titre = 'Remises en location' and s.nb_items = 1),
                 'Au siège : « Remises en location », la remise ouverte');
  return next ok(exists (select 1 from public.points_sections s where s.client_id = c and s.module = 'tavaro' and s.jour = j and s.role = 'valideur'
                          and s.entite_id = v_siege and s.titre = 'Péages à payer' and s.nb_items = 1),
                 'Au siège : « Péages à payer », le passage hors délai');
  return next ok(not exists (select 1 from public.points_sections s where s.client_id = c and s.module = 'tavaro' and s.jour = j
                              and s.entite_id = v_nord and s.titre in ('Remises en location', 'Péages à payer')),
                 'À NORD, rien à dire : pas de section');
end $f$;

select * from runtests('tests'::name, '^test_b2_27_');
