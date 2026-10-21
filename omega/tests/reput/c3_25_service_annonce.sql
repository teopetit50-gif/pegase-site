-- c3_25 — REPUT, correctif TREPUT-04 (R11) : le service annoncé au client est celui qui tient la demande (sujet principal).
-- Reproduit le cas de la série 1 : sujet principal rendez_vous sans service, second sujet routé vers « Comptabilité », un
-- brouillon qui annonçait « transmise au service Comptabilité ». Exécutable tel quel par execute_sql sur la RECETTE, après
-- c3_00 à c3_24 (aides tests.c3_*, dont tests.c3_15_demande de c3_15) et les migrations c3_01 à c3_25. runtests() annule tout.

create or replace function tests.test_c3_25_service_annonce() returns setof text
language plpgsql as $f$
declare
  banc jsonb;
  v_client uuid; v_gerant uuid; v_compta uuid; v_planning uuid; v_dem uuid; v_j jsonb; p public.reput_reponses; v_payload text; v_envoi text;
begin
  banc := tests.c3_banc();
  v_client := (banc ->> 'client')::uuid; v_gerant := (banc ->> 'gerant')::uuid;
  perform tests.redevenir_admin();
  insert into public.reglages_envois (client_id, module, mode, essai_adresse, canaux)
  select v_client, 'reput', 'essai', 'essais@omegaai.fr', array['email']
  where not exists (select 1 from public.reglages_envois r where r.client_id = v_client and r.module = 'reput');
  perform public.reput_installer(v_client);
  insert into public.equipes (client_id, cle, nom) values (v_client, 'c3_25_compta', 'Comptabilité (C3-25)') returning id into v_compta;
  insert into public.equipes (client_id, cle, nom) values (v_client, 'c3_25_planning', 'Planning (C3-25)') returning id into v_planning;
  perform tests.endosser(v_gerant, 'gerant@banc-varelo.test');
  perform public.reput_router_sujet(v_client, 'tarifs', v_compta);
  perform public.reput_router_sujet(v_client, 'rendez_vous', null);
  perform tests.redevenir_admin();

  -- ── Le cas R11 : principal sans service, le brouillon nomme le service du second sujet ──
  v_dem := tests.c3_15_demande(v_client, 'email', 'c3-25a@exemple.test', 'Fictif Lacour', 'Je voudrais un rendez-vous, et ma facture est fausse.');
  perform public.reput_noter_sujet_secondaire(v_dem, 'tarifs');
  v_j := public.reput_deposer_reponse(v_dem, jsonb_build_object('sujet', 'rendez_vous', 'langue', 'fr', 'couverte', false,
           'corps', 'Votre demande est transmise au service Comptabilité (C3-25), qui revient vers vous rapidement.'));
  select * into p from public.reput_reponses x where x.id = (v_j ->> 'reponse')::uuid;
  return next ok(position('Comptabilité' in p.corps) = 0 and p.corps like '%transmise à notre équipe, qui revient vers vous%',
                 'R11 : le service du second sujet n''est plus annoncé ; « notre équipe » à sa place');
  return next ok(position('Comptabilité' in p.brouillon) = 0, 'Le brouillon aussi');
  select d.payload ->> 'corps' into v_payload from public.demandes_validation d where d.id = (v_j ->> 'demande_validation')::uuid;
  select e.corps into v_envoi from public.envois e where e.id = (v_j ->> 'envoi')::uuid;
  return next ok(v_payload = p.corps and v_envoi = p.corps, 'La réponse, la file de validation et l''envoi portent le même texte');
  return next is((select d.equipe_id from public.demandes_validation d where d.id = (v_j ->> 'demande_validation')::uuid), null::uuid,
                 'La validation reste celle du sujet principal (sans équipe) : message et file disent la même chose');

  -- ── Le principal a un service : c'est lui qui est annoncé ──
  perform tests.endosser(v_gerant, 'gerant@banc-varelo.test');
  perform public.reput_router_sujet(v_client, 'rendez_vous', v_planning);
  perform tests.redevenir_admin();
  v_dem := tests.c3_15_demande(v_client, 'email', 'c3-25b@exemple.test', 'Fictif B', 'Un rendez-vous, et une question de facture.');
  v_j := public.reput_deposer_reponse(v_dem, jsonb_build_object('sujet', 'rendez_vous', 'langue', 'fr', 'couverte', false,
           'corps', 'Votre demande est transmise au service Comptabilité (C3-25).'));
  select * into p from public.reput_reponses x where x.id = (v_j ->> 'reponse')::uuid;
  return next ok(p.corps like '%transmise au service Planning (C3-25).%' and position('Comptabilité' in p.corps) = 0,
                 'Principal routé : le service annoncé devient celui qui tient la demande');

  -- ── Ce qui ne change pas ──
  return next is(private.reput_ramener_service(v_client, 'rendez_vous', 'Le service Planning (C3-25) vous rappelle.'),
                 'Le service Planning (C3-25) vous rappelle.', 'Le service du sujet principal reste nommé');
  return next is(private.reput_ramener_service(v_client, 'rendez_vous', 'Nous revenons vers vous.'), 'Nous revenons vers vous.',
                 'Un texte qui ne nomme aucun service ne change pas');
  return next is(private.reput_ramener_service(v_client, 'horaires', 'Voyez avec l''équipe Comptabilité (C3-25) : elle vous écrira.'),
                 'Voyez avec notre équipe : elle vous écrira.', '« l''équipe X » est aussi ramenée');
end $f$;

select * from runtests('tests'::name, '^test_c3_25_');
