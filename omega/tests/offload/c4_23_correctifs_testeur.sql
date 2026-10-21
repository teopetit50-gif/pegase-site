-- c4_23 — OFFLOAD : correctifs du testeur T-OFFLOAD (session C4, 21/10/2026). Après c4_00, c4_03, c4_11 (aides) et les
-- migrations c4_01 à c4_23. Données fictives. runtests() annule tout.

create or replace function tests.test_c4_23_correctifs_testeur() returns setof text
language plpgsql as $f$
declare
  banc jsonb := tests.c4_banc();
  v_client uuid := (banc ->> 'client')::uuid;
  v_t uuid; v_l uuid;
  v_reprise uuid;
  e public.envois;
begin
  perform tests.c4_reprises_pretes();
  v_t := tests.c4_compte_courriel('TO1', 'Garage Essai', 'atelier@garage-essai.test', 70);
  v_l := tests.c4_compte_courriel('TO2', 'Garage Litige', 'atelier@garage-litige.test', 70);
  perform private.offload_detecter(v_client, null);

  -- TOFFLOAD-01 : OFFLOAD en essai, aucun réglage d'envoi en essai pour le module (ni pour l'organisation).
  update public.reglages_envois set mode = null where client_id = v_client and (module = 'offload' or module is null);
  return next ok(private.offload_essai_contre_reel(v_client),
                 'OFFLOAD en essai sans réglage d''envoi en essai : rien ne se prépare (réglage effectif : '
                 || coalesce(private.reglages_envois_effectifs(v_client, 'offload') ->> 'mode', 'absent') || ')');
  perform tests.endosser((banc ->> 'gerant')::uuid, 'gerant@banc-varelo.test');
  return next throws_ok(format('select public.offload_ouvrir_reprise(%L::uuid)', v_t), '55000', null,
                        'Ouverte à la main, la reprise est refusée tant que les envois ne sont pas réglés en essai');
  perform tests.redevenir_admin();
  perform private.offload_cycle(v_client, null);
  return next ok(not exists (select 1 from public.envois x where x.client_id = v_client and x.module = 'offload'
                               and x.mode is distinct from 'essai' and x.cree_le >= now()),
                 'Aucun envoi d''OFFLOAD ne naît hors essai, ni par la porte, ni par le cycle');

  -- Réglé en essai : la même porte prépare un message en essai.
  update public.reglages_envois set mode = 'essai' where client_id = v_client and module = 'offload';
  perform tests.endosser((banc ->> 'gerant')::uuid, 'gerant@banc-varelo.test');
  v_reprise := public.offload_ouvrir_reprise(v_t);
  perform tests.redevenir_admin();
  select * into e from public.envois where id = (select r.envoi1_id from public.offload_reprises r where r.id = v_reprise);
  return next ok(e.id is null or e.mode = 'essai', 'Réglé en essai, le message naît en essai (' || coalesce(e.mode, 'aucun message') || ')');

  -- TOFFLOAD-02 : un compte en litige chez CASHD ne reçoit aucune reprise, même ouverte à la main.
  perform tests.c4_cashd_compte('TO2', 'litige');
  perform tests.endosser((banc ->> 'gerant')::uuid, 'gerant@banc-varelo.test');
  return next throws_ok(format('select public.offload_ouvrir_reprise(%L::uuid)', v_l), '55000', null,
                        'Un compte en litige CASHD est refusé à l''ouverture manuelle');
  perform tests.redevenir_admin();
  return next ok(not exists (select 1 from public.offload_reprises r where r.compte_id = v_l),
                 'Aucune reprise, aucun message pour le compte en litige');
end $f$;

select * from runtests('tests'::name, '^test_c4_23_');
