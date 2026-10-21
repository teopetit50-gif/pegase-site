-- c4_26 — OFFLOAD : l'effacement d'une personne, jusqu'au bout (testeur T-OFFLOAD, TOFFLOAD-04 ; C4, 21/10/2026).
-- Après c4_00, c4_03 (aides) et les migrations c4_01 à c4_26. Données fictives. runtests() annule tout.

create or replace function tests.test_c4_26_effacement_complet() returns setof text
language plpgsql as $f$
declare
  banc jsonb := tests.c4_banc();
  v_client uuid := (banc ->> 'client')::uuid;
  v_gerant uuid := (banc ->> 'gerant')::uuid;
  v_x uuid;
  r public.offload_reprises;
  d jsonb;
begin
  perform tests.c4_reprises_pretes();
  v_x := tests.c4_compte_courriel('EC1', 'Cabinet Fictif Effacement', 'cabinet@fictif-effacement.test', 70);
  perform tests.endosser(v_gerant, 'gerant@banc-varelo.test');
  perform public.offload_saisir_compte(v_client, null, 'EC1', 'Cabinet Fictif Effacement',
    jsonb_build_object('contact', 'Contact Fictif EC1', 'email', 'cabinet@fictif-effacement.test'));
  perform tests.redevenir_admin();
  return next ok(not exists (select 1 from public.journal_opposable j where j.client_id = v_client and j.objet_id = v_x::text
                               and j.action in ('offload.compte_saisi', 'offload.compte_modifie')
                               and position('fictif-effacement' in j.donnees::text) > 0
                               and j.survenu_le >= now()),
                 'Au journal, la saisie d''un compte garde le nom des champs, pas leurs valeurs');
  perform private.offload_detecter(v_client, null);
  perform private.offload_cycle(v_client, null);
  r := tests.c4_reprise(v_x);

  perform tests.endosser(v_gerant, 'gerant@banc-varelo.test');
  perform public.offload_effacer_compte(v_x, 'Courrier de demande d''effacement (fictif)');
  perform tests.redevenir_admin();
  r := tests.c4_reprise(v_x);
  return next ok(r.id is null or (r.statut = 'close' and r.issue = 'abandon'),
                 'Effacé, le compte n''a plus de reprise ouverte (' || coalesce(r.statut || ', ' || r.issue, 'aucune') || ')');
  return next ok(not exists (select 1 from public.offload_taches t where t.compte_id = v_x and t.statut = 'a_faire'),
                 'Aucune tâche ne reste à faire sur un compte effacé');
  return next ok(r.envoi1_id is null or (select e.statut from public.envois e where e.id = r.envoi1_id) not in ('a_valider', 'pret'),
                 'Le message qui attendait est annulé');

  perform tests.endosser(v_gerant, 'gerant@banc-varelo.test');
  d := public.offload_restitution(v_client);
  return next ok(position('fictif-effacement' in (d -> 'donnees' -> 'journal')::text) = 0
                 and position('Contact Fictif EC1' in (d -> 'donnees' -> 'journal')::text) = 0,
                 'La restitution ne montre plus les données de la personne effacée, journal compris');
  return next throws_ok(format('select public.offload_saisir_compte(%L::uuid, null, %L, %L, %L::jsonb)', v_client, 'EC1', 'Cabinet Fictif Effacement',
                               '{"email": "cabinet@fictif-effacement.test"}'), '55000', null,
                        'Une ressaisie du compte effacé est refusée, avec la raison');
  return next throws_ok(format('select public.offload_saisir_achat(%L::uuid, current_date - 1, 100, %L, null, %L)', v_x, 'F-EC1', 'facture'), '55000', null,
                        'Aucun achat ne se rattache plus au compte effacé');
  perform tests.redevenir_admin();
end $f$;

select * from runtests('tests'::name, '^test_c4_26_');
