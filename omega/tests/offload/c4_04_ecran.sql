-- c4_04 — OFFLOAD, palier 4 : les lectures de l'écran (session C4, 06/10/2026). Après c4_00, c4_02 et c4_03
-- (aides) et les migrations c4_01 à c4_04. runtests() annule tout.

create or replace function tests.test_c4_04_lectures() returns setof text
language plpgsql as $f$
declare
  banc jsonb := tests.c4_banc();
  v_client uuid := (banc ->> 'client')::uuid;
  v_d uuid; v_r uuid; v_lecteur uuid;
  t jsonb;
  f jsonb;
begin
  perform tests.c4_reprises_pretes();
  v_lecteur := tests.c4_compte(v_client, 'lecteur', 'lecteur-c4@banc-varelo.test');
  v_d := tests.c4_compte_courriel('ED1', 'Écran Décroche', 'achats@ecran.test', 70);
  v_r := tests.c4_compte_courriel('ER1', 'Écran Régulier', 'achats@regulier.test', 5);
  perform private.offload_detecter(v_client, null);
  perform private.offload_cycle(v_client, null);

  perform tests.endosser(v_lecteur, 'lecteur-c4@banc-varelo.test');
  t := public.offload_tableau(v_client);
  return next is(t -> 'comptes' -> 0 ->> 'id', v_d::text, 'Le compte qui décroche vient en tête de liste');
  return next ok((t -> 'comptes' -> 0 -> 'signal' -> 'raisons' -> 0 ->> 'phrase') like 'Il achetait en moyenne tous les 30 jours%',
                 'La raison du signal est servie en phrase');
  return next is((t -> 'compteurs' ->> 'decroche')::integer, 1, 'Compteur : un compte décroche');
  return next is((t -> 'compteurs' ->> 'a_valider')::integer, 1, 'Compteur : un message attend sa validation');
  return next ok((t -> 'a_valider' -> 0 ->> 'corps') like 'Bonjour Martin,%', 'Le message à valider est lisible depuis l''écran');
  return next is(jsonb_array_length(t -> 'taches'), 1, 'La tâche d''appel est servie');
  f := public.offload_fiche(v_d);
  return next is(jsonb_array_length(f -> 'mois'), 24, 'La courbe porte 24 mois');
  return next ok((select sum((m ->> 'montant')::numeric) from jsonb_array_elements(f -> 'mois') m) > 0, 'La courbe a des montants');
  return next ok(jsonb_array_length(f -> 'reprises') = 1 and f -> 'reprises' -> 0 -> 'envoi1' ->> 'statut' = 'a_valider',
                 'La fiche montre la reprise et l''état de son message');

  -- Une personne d'une autre organisation ne voit rien.
  perform tests.redevenir_admin();
  insert into public.clients (id, nom) values ('cccccccc-0000-4000-8000-0000000000f4', 'Autre organisation (C4)');
  perform tests.endosser(tests.c4_compte('cccccccc-0000-4000-8000-0000000000f4', 'gerant', 'autre-c4@banc-varelo.test'), 'autre-c4@banc-varelo.test');
  return next is(public.offload_fiche(v_d), null::jsonb, 'Une autre organisation ne lit pas la fiche');
  return next is(jsonb_array_length(public.offload_tableau(v_client) -> 'comptes'), 0, 'Ni la liste');
end $f$;

select * from runtests('tests'::name, '^test_c4_04_');
