-- c4_12 — OFFLOAD : un seul canal à la fois, et la vague de la semaine (session C4, 15/10/2026).
-- Après c4_00, c4_02, c4_03 (aides) et les migrations c4_01 à c4_12. runtests() annule tout.

create or replace function tests.test_c4_12_canal_unique() returns setof text
language plpgsql as $f$
declare
  banc jsonb := tests.c4_banc();
  v_client uuid := (banc ->> 'client')::uuid;
  v_m uuid; v_n uuid;
  r public.offload_reprises;
begin
  perform tests.c4_reprises_pretes();
  v_m := tests.c4_compte_courriel('CU1', 'Message Seul', 'achats@message-seul.test', 70);
  v_n := tests.c4_compte_courriel('CU2', 'Message Bloqué', 'achats@bloque.test', 70);
  perform private.offload_detecter(v_client, null);
  perform private.offload_cycle(v_client, null);

  r := tests.c4_reprise(v_m);
  return next ok(r.envoi1_id is not null and not exists (select 1 from public.offload_taches t where t.reprise_id = r.id),
                 'Un seul canal à la fois : le message part, aucun appel n''est posé en même temps');

  -- Le message ne part pas : l'appel prend le relais, et seulement alors.
  r := tests.c4_reprise(v_n);
  perform tests.c4_evenement_envoi(r.envoi1_id, 'annule');
  r := tests.c4_reprise(v_n);
  return next ok(r.statut = 'appel' and exists (select 1 from public.offload_taches t where t.reprise_id = r.id and t.type = 'appel'
                                                 and t.statut = 'a_faire' and t.detail like 'Le message de reprise n''est pas parti (annule%'),
                 'Le message ne part pas : la reprise bascule sur l''appel, qui est posé à ce moment-là');
end $f$;

create or replace function tests.test_c4_12_vague_de_la_semaine() returns setof text
language plpgsql as $f$
declare
  banc jsonb := tests.c4_banc();
  v_client uuid := (banc ->> 'client')::uuid;
  v uuid;
  v_demain integer := extract(isodow from current_date + 1)::integer;
  v_aujourdhui integer := extract(isodow from current_date)::integer;
  b jsonb;
begin
  perform tests.c4_reprises_pretes();
  v := tests.c4_compte_courriel('VG1', 'Vague Hebdo', 'achats@vague.test', 70);
  perform private.offload_detecter(v_client, null);
  perform tests.endosser((banc ->> 'gerant')::uuid, 'gerant@banc-varelo.test');
  perform public.offload_regler(v_client, jsonb_build_object('vague_jour', v_demain));
  perform tests.redevenir_admin();
  b := private.offload_cycle(v_client, null);
  return next ok(coalesce((b ->> 'ouvertes')::integer, 0) = 0 and (tests.c4_reprise(v)).id is null,
                 'Hors du jour de la vague, aucune nouvelle reprise ne s''ouvre');
  b := private.offload_cycle(v_client, current_date + 1);
  return next ok((tests.c4_reprise(v)).id is not null, 'Le jour de la vague, la vague de la semaine se prépare');
  perform tests.endosser((banc ->> 'gerant')::uuid, 'gerant@banc-varelo.test');
  return next throws_ok(format('select public.offload_regler(%L::uuid, %L)', v_client, '{"vague_jour": 8}'), '23514', null,
                        'Le jour de la vague va de 1 (lundi) à 7 (dimanche)');
  perform public.offload_regler(v_client, '{"vague_jour": null}');
  perform tests.redevenir_admin();
  return next is((select g.vague_jour from public.offload_reglages g where g.client_id = v_client), null::smallint,
                 'Sans jour réglé, la vague passe chaque jour');
end $f$;

select * from runtests('tests'::name, '^test_c4_12_');
