-- c3_09 — REPUT : la base en vigueur nomme le service d'un sujet routé (migration c3_09).
-- Exécutable tel quel par execute_sql sur la RECETTE, après c3_00 à c3_08 (aides tests.c3_*) et les migrations c3_01 à c3_09.
-- runtests() annule tout.

create or replace function tests.test_c3_09_service() returns setof text
language plpgsql as $f$
declare
  banc jsonb;
  v_client uuid; v_gerant uuid; v_equipe uuid; v_base jsonb;
begin
  banc := tests.c3_banc();
  v_client := (banc ->> 'client')::uuid; v_gerant := (banc ->> 'gerant')::uuid;
  perform tests.redevenir_admin();
  perform public.reput_installer(v_client);
  insert into public.equipes (client_id, cle, nom) values (v_client, 'c3_09_atelier', 'Atelier (C3)') returning id into v_equipe;
  perform tests.endosser(v_gerant, 'gerant@banc-varelo.test');
  perform public.reput_router_sujet(v_client, 'tarifs', v_equipe);
  perform tests.redevenir_admin();

  v_base := private.reput_base(v_client);
  return next is((select s ->> 'service' from jsonb_array_elements(v_base -> 'sujets') s where s ->> 'code' = 'tarifs'),
                 'Atelier (C3)', 'Un sujet routé porte le nom de son service dans la base en vigueur');
  return next ok((select (s -> 'service') = 'null'::jsonb from jsonb_array_elements(v_base -> 'sujets') s where s ->> 'code' = 'horaires'),
                 'Un sujet sans service n''en porte pas');
  return next ok(not has_function_privilege('authenticated', 'private.reput_base(uuid, uuid, timestamptz)', 'execute'),
                 'La base en vigueur reste fermée aux utilisateurs');

  perform tests.endosser(v_gerant, 'gerant@banc-varelo.test');
  perform public.reput_router_sujet(v_client, 'tarifs', null);
  perform tests.redevenir_admin();
  return next ok((select (s -> 'service') = 'null'::jsonb from jsonb_array_elements(private.reput_base(v_client) -> 'sujets') s
                  where s ->> 'code' = 'tarifs'), 'Le routage retiré, le service disparaît');
end $f$;

select * from runtests('tests'::name, '^test_c3_09_');
