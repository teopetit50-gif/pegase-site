-- c4_22 — OFFLOAD : la branche Gmail (session C4, 19/10/2026). Après c4_00, c4_03 (aides) et les migrations c4_01 à
-- c4_22. Données fictives, mode essai. runtests() annule tout.

create or replace function tests.test_c4_22_gmail() returns setof text
language plpgsql as $f$
declare
  banc jsonb := tests.c4_banc();
  v_client uuid := (banc ->> 'client')::uuid;
  v_x uuid;
  v_collab uuid;
  r public.offload_reprises;
  m jsonb;
begin
  perform tests.c4_reprises_pretes();
  return next ok(exists (select 1 from private.abonnements a where a.evenement = 'envoi.brouillon_depose.offload' and a.module = 'offload'
                         and a.genre = 'offload.envoi'),
                 'OFFLOAD suit les brouillons déposés dans la boîte connectée');

  v_x := tests.c4_compte_courriel('GM1', 'Atelier Bernard', 'atelier@atelier-bernard.test', 70);
  perform private.offload_detecter(v_client, null);
  perform private.offload_cycle(v_client, null);
  r := tests.c4_reprise(v_x);
  perform tests.c4_evenement_envoi(r.envoi1_id, 'brouillon_depose');
  r := tests.c4_reprise(v_x);
  return next ok(r.statut = 'envoyee' and r.envoye1_le is not null,
                 'Un brouillon déposé compte comme parti : la reprise attend la réponse (' || r.statut || ')');
  return next ok(exists (select 1 from public.journal_opposable j where j.client_id = v_client and j.action = 'offload.brouillon_depose'
                         and j.objet_id = r.id::text),
                 'Le dépôt du brouillon est au journal');

  perform tests.endosser((banc ->> 'gerant')::uuid, 'gerant@banc-varelo.test');
  m := public.offload_messagerie(v_client);
  perform tests.redevenir_admin();
  return next ok(m ? 'mode' and jsonb_typeof(m -> 'boites') = 'array' and m ->> 'phrase' is not null,
                 'Le gérant lit par où partent les messages : ' || coalesce(m ->> 'phrase', '?'));
  return next diag('messagerie du banc : ' || coalesce(m::text, 'null'));
  v_collab := tests.c4_compte(v_client, 'collaborateur', 'collab-c4-gmail@banc-varelo.test');
  perform tests.endosser(v_collab, 'collab-c4-gmail@banc-varelo.test');
  return next throws_ok(format('select public.offload_messagerie(%L::uuid)', v_client), '42501', null,
                        'Un collaborateur ne lit pas la messagerie');
  perform tests.redevenir_admin();
end $f$;

select * from runtests('tests'::name, '^test_c4_22_');
