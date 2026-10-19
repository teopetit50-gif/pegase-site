-- c3_18 — REPUT : l'accusé de réception nomme le service qui reprend la demande.
-- Exécutable tel quel par execute_sql sur la RECETTE, après c3_00 à c3_17 (aides tests.c3_*, dont tests.c3_repondre de
-- c3_03) et les migrations c3_01 à c3_18. Banc en essai : rien ne part pour de vrai. runtests() annule tout.

create or replace function tests.test_c3_18_accuse_transfert() returns setof text
language plpgsql as $f$
declare
  banc jsonb;
  v_client uuid; v_gerant uuid; v_eq uuid; v_site uuid; v_dem uuid; v_j jsonb; v_corps text;
begin
  banc := tests.c3_banc();
  v_client := (banc ->> 'client')::uuid; v_gerant := (banc ->> 'gerant')::uuid;
  perform tests.redevenir_admin();
  insert into public.reglages_envois (client_id, module, mode, essai_adresse, canaux)
  select v_client, 'reput', 'essai', 'essais@omegaai.fr', array['email']
  where not exists (select 1 from public.reglages_envois r where r.client_id = v_client and r.module = 'reput');
  perform public.reput_installer(v_client);
  insert into public.equipes (client_id, cle, nom) values (v_client, 'c3_18_commercial', 'commercial (C3-18)') returning id into v_eq;
  perform tests.endosser(v_gerant, 'gerant@banc-varelo.test');
  perform public.reput_router_sujet(v_client, 'tarifs', v_eq);
  perform public.reput_regler(v_client, null, jsonb_build_object('accuse', true));
  perform tests.redevenir_admin();

  return next is((select r.phrase_transfert from public.reput_reglages r where r.client_id = v_client and r.entite_id is null),
                 'Votre demande est transmise au service {service}, qui revient vers vous.', 'La phrase de transfert par défaut');

  -- ── Sujet routé : l'accusé nomme le service ──
  v_dem := (tests.c3_repondre(v_client, 'c3-18a@exemple.test', 'Fictif A', 'Quel prix pour une pose ?', 'tarifs', false, null,
                              'Nous vérifions et revenons vers vous.') ->> 'demande')::uuid;
  v_j := private.reput_accuser(v_dem);
  select e.corps into v_corps from public.envois e where e.id = (v_j ->> 'envoi')::uuid;
  return next ok(v_corps like '%Votre demande est transmise au service commercial (C3-18), qui revient vers vous.%',
                 'Sujet routé : l''accusé dit à quel service la demande est transmise');
  return next ok(position('Nous avons bien reçu votre message' in v_corps) > 0, 'Le texte de l''accusé reste là, la phrase s''y ajoute');
  return next ok((tests.c3_journal(v_client, 'reput.accuse_prepare', v_dem::text) -> 'donnees' ->> 'service_nomme')::boolean,
                 'Journal : l''accusé a nommé le service');

  -- ── Sujet non routé : rien de plus ──
  v_dem := (tests.c3_repondre(v_client, 'c3-18b@exemple.test', 'Fictif B', 'Ouvert le 1er novembre ?', 'horaires', false, null,
                              'Nous vérifions et revenons vers vous.') ->> 'demande')::uuid;
  v_j := private.reput_accuser(v_dem);
  select e.corps into v_corps from public.envois e where e.id = (v_j ->> 'envoi')::uuid;
  return next ok(v_corps is not null and position('transmise au service' in v_corps) = 0, 'Sujet non routé : l''accusé ne nomme aucun service');

  -- ── Réglable : sa propre phrase, ou aucune ──
  perform tests.endosser(v_gerant, 'gerant@banc-varelo.test');
  perform public.reput_regler(v_client, null, jsonb_build_object('phrase_transfert', 'Le pôle {service} reprend votre demande.'));
  return next throws_ok(format('select public.reput_regler(%L, null, %L::jsonb)', v_client, '{"phrase_transfert": "Transmis au bon service."}'),
                        '23514', null, 'Une phrase sans {service} est refusée');
  perform tests.redevenir_admin();
  v_dem := (tests.c3_repondre(v_client, 'c3-18c@exemple.test', 'Fictif C', 'Votre tarif horaire ?', 'tarifs', false, null,
                              'Nous vérifions et revenons vers vous.') ->> 'demande')::uuid;
  v_j := private.reput_accuser(v_dem);
  select e.corps into v_corps from public.envois e where e.id = (v_j ->> 'envoi')::uuid;
  return next ok(v_corps like '%Le pôle commercial (C3-18) reprend votre demande.%', 'La phrase de l''organisation est employée');
  perform tests.endosser(v_gerant, 'gerant@banc-varelo.test');
  perform public.reput_regler(v_client, null, jsonb_build_object('phrase_transfert', ''));
  perform tests.redevenir_admin();
  v_dem := (tests.c3_repondre(v_client, 'c3-18d@exemple.test', 'Fictif D', 'Combien la porte ?', 'tarifs', false, null,
                              'Nous vérifions et revenons vers vous.') ->> 'demande')::uuid;
  v_j := private.reput_accuser(v_dem);
  select e.corps into v_corps from public.envois e where e.id = (v_j ->> 'envoi')::uuid;
  return next ok(v_corps is not null and position('reprend votre demande' in v_corps) = 0, 'Phrase vide : l''accusé ne nomme pas le service');

  -- ── Les sites héritent de la phrase ──
  perform tests.endosser(v_gerant, 'gerant@banc-varelo.test');
  perform public.reput_regler(v_client, null, jsonb_build_object('phrase_transfert', 'Le service {service} vous recontacte.'));
  perform tests.redevenir_admin();
  insert into public.entites (client_id, nom, type) values (v_client, 'Agence de Rennes (C3-18)', 'site') returning id into v_site;
  perform private.reput_installer(v_client, v_site);
  return next is((select r.phrase_transfert from public.reput_reglages r where r.client_id = v_client and r.entite_id = v_site),
                 'Le service {service} vous recontacte.', 'Un site qui suit l''organisation en reprend la phrase');
end $f$;

select * from runtests('tests'::name, '^test_c3_18_');
