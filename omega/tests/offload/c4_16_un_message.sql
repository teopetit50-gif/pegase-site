-- c4_16 — OFFLOAD : un message par compte et par trimestre (décision de Teo, 17/10/2026, session C4).
-- Après c4_00, c4_02, c4_03 (aides) et les migrations c4_01 à c4_16. runtests() annule tout.

create or replace function tests.test_c4_16_un_message() returns setof text
language plpgsql as $f$
declare
  banc jsonb := tests.c4_banc();
  v_client uuid := (banc ->> 'client')::uuid;
  v uuid;
  r public.offload_reprises;
begin
  perform tests.c4_reprises_pretes();
  -- Depuis c4_29 (décision du bureau du 21/10), la relance est allumée par défaut ; ce test éprouve la relance ÉTEINTE.
  perform tests.endosser((banc ->> 'gerant')::uuid, 'gerant@banc-varelo.test');
  perform public.offload_regler(v_client, '{"relance_ecrite": false}');
  perform tests.redevenir_admin();
  return next is((select g.relance_ecrite from public.offload_reglages g where g.client_id = v_client), false,
                 'La relance écrite s''éteint par un réglage');
  v := tests.c4_compte_courriel('UM16', 'Garage Lemaire', 'atelier@lemaire.test', 70);
  perform private.offload_detecter(v_client, null);
  perform private.offload_cycle(v_client, null);
  r := tests.c4_reprise(v);
  perform tests.c4_evenement_envoi(r.envoi1_id, 'envoye');
  update public.offload_reprises set envoye1_le = now() - interval '8 days' where id = r.id;
  perform private.offload_cycle(v_client, null);
  r := tests.c4_reprise(v);
  return next ok(r.statut = 'close' and r.issue = 'sans_reponse' and r.envoi2_id is null,
                 'Un message sans réponse : pas de relance écrite, le compte sort du cycle');
  return next is((select count(*)::integer from public.envois x where x.objet_type = 'offload_reprises' and x.objet_id = r.id::text), 1,
                 'Un seul message écrit par reprise');
  perform private.offload_cycle(v_client, null);
  return next is((select count(*)::integer from public.offload_reprises x where x.compte_id = v), 1,
                 'La quarantaine de 90 jours garde un message par trimestre');
  perform tests.endosser((banc ->> 'gerant')::uuid, 'gerant@banc-varelo.test');
  perform public.offload_regler(v_client, '{"relance_ecrite": true}');
  perform tests.redevenir_admin();
  return next is((select g.relance_ecrite from public.offload_reglages g where g.client_id = v_client), true,
                 'La relance écrite se rallume par un réglage');
end $f$;

select * from runtests('tests'::name, '^test_c4_16_');
