-- c4_17 — OFFLOAD : la restitution complète des données d'une organisation (session C4, 18/10/2026).
-- Après c4_00, c4_02, c4_03, c4_07, c4_08 (aides) et les migrations c4_01 à c4_17. Données du banc et fictives
-- seulement. runtests() annule tout.

create or replace function tests.test_c4_17_restitution() returns setof text
language plpgsql as $f$
declare
  banc jsonb := tests.c4_banc();
  v_client uuid := (banc ->> 'client')::uuid;
  v uuid;
  r jsonb;
  v_collab uuid;
  n_avant integer;
begin
  perform tests.c4_reprises_pretes();
  v := tests.c4_compte_courriel('RS17', 'Garage Fictif Restitution', 'atelier@restitution.test', 70);
  perform tests.c4_affaire(v, 'CMD-RS17', 9, '{"valeur_ht": 120}');
  perform tests.c4_equipement(v, 'RS-EQ1', 'Compresseur', 30);
  perform private.offload_detecter(v_client, null);
  perform private.offload_cycle(v_client, null);
  select count(*) into n_avant from public.offload_comptes c where c.client_id = v_client;

  perform tests.endosser((banc ->> 'gerant')::uuid, 'gerant@banc-varelo.test');
  r := public.offload_restitution(v_client);
  perform tests.redevenir_admin();

  return next ok((r -> 'resume' ->> 'comptes')::integer = n_avant
                 and jsonb_array_length(r -> 'donnees' -> 'comptes') = n_avant,
                 'Tous les comptes de l''organisation sont restitués (' || n_avant || ')');
  return next ok(exists (select 1 from jsonb_array_elements(r -> 'donnees' -> 'comptes') x where x ->> 'ref' = 'RS17')
                 and exists (select 1 from jsonb_array_elements(r -> 'donnees' -> 'affaires') x where x ->> 'reference' = 'CMD-RS17')
                 and exists (select 1 from jsonb_array_elements(r -> 'donnees' -> 'equipements') x where x ->> 'ref' = 'RS-EQ1')
                 and jsonb_array_length(r -> 'donnees' -> 'achats') > 0 and jsonb_array_length(r -> 'donnees' -> 'reprises') > 0,
                 'Comptes, achats, reprises, parc et affaires sont restitués ensemble');
  return next ok(r ? 'resume' and (r -> 'donnees') ? 'regles' and (r -> 'donnees') ? 'arretes' and (r -> 'donnees') ? 'journal'
                 and not ((r -> 'donnees' -> 'comptes' -> 0) ? 'client_id'),
                 'Le document porte un résumé, toutes les familles, le journal, et pas l''identifiant de l''organisation');
  return next ok(exists (select 1 from public.journal_opposable j where j.client_id = v_client and j.action = 'offload.restitution'),
                 'Chaque restitution est au journal');
  return next is((select count(*)::integer from public.offload_comptes c where c.client_id = v_client), n_avant,
                 'La restitution ne modifie rien');

  v_collab := tests.c4_compte(v_client, 'collaborateur', 'collab-c4-restitution@banc-varelo.test');
  perform tests.endosser(v_collab, 'collab-c4-restitution@banc-varelo.test');
  return next throws_ok(format('select public.offload_restitution(%L::uuid)', v_client), '42501', null,
                        'Seuls le gérant et l''admin restituent les données');
  perform tests.redevenir_admin();
end $f$;

select * from runtests('tests'::name, '^test_c4_17_');
