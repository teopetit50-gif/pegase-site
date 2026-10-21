-- c4_29 — OFFLOAD : un cycle par compte et par trimestre, un rappel, la reprise forcée (décision du bureau du 21/10 ;
-- TOFFLOAD-03 ; session C4). Après c4_00, c4_03, c4_11 (aides) et les migrations c4_01 à c4_29. runtests() annule tout.

create or replace function tests.test_c4_29_un_cycle_par_trimestre() returns setof text
language plpgsql as $f$
declare
  banc jsonb := tests.c4_banc();
  v_client uuid := (banc ->> 'client')::uuid;
  v_gerant uuid := (banc ->> 'gerant')::uuid;
  v_collab uuid;
  v_r uuid; v_c uuid; v_q uuid; v_l uuid;
  r public.offload_reprises;
  v_id uuid;
begin
  perform tests.c4_reprises_pretes();
  return next ok((select g.relance_ecrite from public.offload_reglages g where g.client_id = v_client)
                 and (select c.column_default from information_schema.columns c where c.table_schema = 'public'
                        and c.table_name = 'offload_reglages' and c.column_name = 'relance_ecrite') = 'true',
                 'Un rappel par cycle : la relance écrite est allumée par défaut');

  -- Deux messages en tout dans un cycle : le premier, puis un seul rappel.
  v_r := tests.c4_compte_courriel('TR1', 'Garage Rappel', 'atelier@garage-rappel.test', 70);
  perform private.offload_detecter(v_client, null);
  perform private.offload_cycle(v_client, null);
  r := tests.c4_reprise(v_r);
  perform tests.c4_evenement_envoi(r.envoi1_id, 'envoye');
  update public.offload_reprises set envoye1_le = now() - interval '8 days' where id = r.id;
  perform private.offload_cycle(v_client, null);
  r := tests.c4_reprise(v_r);
  return next ok(r.envoi2_id is not null, 'Sans réponse, un rappel est préparé (' || r.statut || ')');
  perform tests.c4_evenement_envoi(r.envoi2_id, 'envoye');
  update public.offload_reprises set envoye2_le = now() - interval '30 days' where id = r.id;
  perform private.offload_cycle(v_client, null);
  return next is((select count(*)::integer from public.envois x where x.objet_type = 'offload_reprises' and x.objet_id = r.id::text), 2,
                 'Jamais plus de deux messages dans un cycle');

  -- O6 : un contact noté ce trimestre ; à la main, la même règle que la vague.
  v_c := tests.c4_compte_courriel('TR2', 'Garage Contact', 'atelier@garage-contact.test', 70);
  perform tests.endosser(v_gerant, 'gerant@banc-varelo.test');
  perform public.offload_noter_contact(v_c, current_date - 40, 'courriel', 'Sophie', 'Relance faite à la main');
  return next throws_ok(format('select public.offload_ouvrir_reprise(%L::uuid)', v_c), '55000', null,
                        'À la main, un compte contacté ce trimestre est refusé, avec la raison');
  return next throws_ok(format('select public.offload_forcer_reprise(%L::uuid, %L)', v_c, ' '), '22023', null,
                        'Forcer demande un motif');
  v_id := public.offload_forcer_reprise(v_c, 'Le client a demandé à être rappelé');
  perform tests.redevenir_admin();
  return next ok(v_id is not null and exists (select 1 from public.journal_opposable j where j.client_id = v_client
                                               and j.action = 'offload.reprise_forcee' and j.objet_id = v_id::text),
                 'Le gérant force la reprise avec un motif, au journal');
  v_collab := tests.c4_compte(v_client, 'collaborateur', 'collab-c4-forcer@banc-varelo.test');
  perform tests.endosser(v_collab, 'collab-c4-forcer@banc-varelo.test');
  return next throws_ok(format('select public.offload_forcer_reprise(%L::uuid, %L)', v_c, 'essai'), '42501', null,
                        'Un collaborateur ne force pas une reprise');
  perform tests.redevenir_admin();

  -- Une commande clôt le cycle sans rouvrir le droit avant le trimestre suivant.
  v_q := tests.c4_compte_courriel('TR3', 'Garage Trimestre', 'atelier@garage-trimestre.test', 70);
  perform private.offload_detecter(v_client, null);
  perform tests.endosser(v_gerant, 'gerant@banc-varelo.test');
  -- Ouverte à la main : sur la recette, le plafond de la vague du jour peut être déjà pris par les comptes du banc.
  perform public.offload_ouvrir_reprise(v_q);
  return next ok((tests.c4_reprise(v_q)).id is not null, 'Le cycle du compte est ouvert');
  perform public.offload_saisir_achat(v_q, current_date, 300, 'F-TR3', 'Entretien', 'facture');
  return next is((tests.c4_reprise(v_q)).issue, 'commande', 'La commande clôt le cycle');
  return next throws_ok(format('select public.offload_ouvrir_reprise(%L::uuid)', v_q), '55000', null,
                        'Le droit ne se rouvre pas avant le trimestre suivant');
  perform tests.redevenir_admin();

  -- Jamais sur un compte en litige CASHD, même forcé.
  v_l := tests.c4_compte_courriel('TR4', 'Garage Litige Forcé', 'atelier@garage-litige-force.test', 70);
  perform tests.c4_cashd_compte('TR4', 'litige');
  perform tests.endosser(v_gerant, 'gerant@banc-varelo.test');
  return next throws_ok(format('select public.offload_forcer_reprise(%L::uuid, %L)', v_l, 'Le client a appelé'), '55000', null,
                        'Forcer ne passe jamais un compte en litige CASHD');
  perform tests.redevenir_admin();
end $f$;

select * from runtests('tests'::name, '^test_c4_29_');
