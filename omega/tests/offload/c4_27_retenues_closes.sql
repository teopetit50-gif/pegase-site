-- c4_27 — OFFLOAD : une demande de retenue ne survit pas à sa reprise (testeur T-OFFLOAD, TOFFLOAD-07 ; C4, 21/10/2026).
-- Après c4_00, c4_03 (aides) et les migrations c4_01 à c4_27. Données fictives. runtests() annule tout.

create or replace function tests.test_c4_27_retenues_closes() returns setof text
language plpgsql as $f$
declare
  banc jsonb := tests.c4_banc();
  v_client uuid := (banc ->> 'client')::uuid;
  v_gerant uuid := (banc ->> 'gerant')::uuid;
  v_x uuid;
  r public.offload_reprises;
  d public.demandes_validation;
  v_avant integer;
begin
  perform tests.c4_reprises_pretes();
  -- Une adresse générique : le message est retenu pour une personne (c4_18).
  v_x := tests.c4_compte_courriel('RC1', 'Pressing Retenu', 'contact@pressing-retenu.test', 70);
  perform private.offload_detecter(v_client, null);
  perform private.offload_cycle(v_client, null);
  r := tests.c4_reprise(v_x);
  select * into d from public.demandes_validation x where x.id = (select e.demande_id from public.envois e where e.id = r.envoi1_id);
  perform tests.endosser(v_gerant, 'gerant@banc-varelo.test');
  v_avant := (public.offload_envoi_auto(v_client) ->> 'retenus_en_attente')::integer;
  perform tests.redevenir_admin();
  return next ok(d.type_action = 'offload.message_retenu' and d.statut = 'en_attente' and v_avant >= 1,
                 'Le message est retenu : une demande attend une personne (' || v_avant || ' en attente)');

  -- La commande arrive : la reprise se clôt, le message est annulé, la demande aussi.
  perform tests.endosser(v_gerant, 'gerant@banc-varelo.test');
  perform public.offload_saisir_achat(v_x, current_date, 450, 'F-RC1', 'Pressing', 'facture');
  return next is((public.offload_envoi_auto(v_client) ->> 'retenus_en_attente')::integer, v_avant - 1,
                 'Le compteur ne compte plus la retenue d''une reprise close');
  perform tests.redevenir_admin();
  return next is((select x.statut from public.demandes_validation x where x.id = d.id), 'annulee',
                 'La demande de retenue de la reprise close est annulée');
  return next is((tests.c4_reprise(v_x)).issue, 'commande', 'La reprise est bien close « commande »');
end $f$;

select * from runtests('tests'::name, '^test_c4_27_');
