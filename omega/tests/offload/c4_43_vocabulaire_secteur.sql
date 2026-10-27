-- c4_43 — OFFLOAD : les relances dans le vocabulaire du secteur (ligne 55 de l'audit ; session C4, 27/10/2026).
-- Après c4_00, c4_02, c4_03 (aides) et les migrations c4_01 à c4_43. runtests() annule tout.

create or replace function tests.test_c4_43_vocabulaire_secteur() returns setof text
language plpgsql as $f$
declare
  banc jsonb := tests.c4_banc();
  v_client uuid := (banc ->> 'client')::uuid;
  v_gerant uuid := (banc ->> 'gerant')::uuid;
  v_collab uuid;
  v uuid;
  m jsonb; m2 jsonb;
  v_autre uuid;
begin
  perform tests.c4_reprises_pretes();
  v := tests.c4_compte_courriel('VS43', 'Transports Vocabulaire', 'atelier@vocabulaire.test', 70);
  perform tests.endosser(v_gerant, 'gerant@banc-varelo.test');
  perform public.offload_regler_secteur(v_client, 'general');
  perform tests.redevenir_admin();

  -- Le texte général ne change pas.
  m := private.offload_message(v, 1, null, null);
  return next ok((m ->> 'corps') like '%Je reprends votre dossier : votre dernière commande chez % date du %'
                 and (m ->> 'corps') like '%Avez-vous de nouveaux besoins pour lesquels nous pourrions vous être utiles ? Un simple retour%'
                 and (m ->> 'sujet') like '% — votre commande du %',
                 'Secteur général : le message reste celui d''avant');

  -- Après-vente : l'atelier, l'entretien.
  perform tests.endosser(v_gerant, 'gerant@banc-varelo.test');
  perform public.offload_regler_secteur(v_client, 'apres_vente');
  perform tests.redevenir_admin();
  m := private.offload_message(v, 1, null, null);
  m2 := private.offload_message(v, 2, now() - interval '8 days', null);
  return next ok((m ->> 'corps') like '%Je reprends votre dossier : votre dernier passage à l''atelier date du %'
                 and (m ->> 'corps') like '%Souhaitez-vous que nous prévoyions votre prochain entretien ou une révision ?%'
                 and (m ->> 'sujet') like '% — votre passage à l''atelier du %'
                 and (m ->> 'corps') not like '%commande%',
                 'Après-vente : le message parle du passage à l''atelier et du prochain entretien : ' || left(m ->> 'corps', 200));
  return next ok((m2 ->> 'corps') like '%au sujet de votre passage à l''atelier du %' and (m2 ->> 'sujet') like 'Re : % — votre passage à l''atelier du %',
                 'Le rappel aussi');

  -- Immobilier, conseil : leurs mots.
  perform tests.endosser(v_gerant, 'gerant@banc-varelo.test');
  perform public.offload_regler_secteur(v_client, 'immobilier');
  m := private.offload_message(v, 1, null, null);
  perform public.offload_regler_secteur(v_client, 'conseil');
  m2 := private.offload_message(v, 1, null, null);
  perform tests.redevenir_admin();
  return next ok((m ->> 'corps') like '%notre dernier dossier ensemble date du %' and (m ->> 'corps') like '%nouveau projet immobilier, achat, vente ou location%'
                 and (m2 ->> 'corps') like '%notre dernière mission pour vous date du %' and (m2 ->> 'corps') like '%un nouveau sujet sur lequel%',
                 'Immobilier et conseil ont chacun leurs mots');
  return next ok(exists (select 1 from public.journal_opposable j where j.client_id = v_client and j.action = 'offload.reglages'
                           and j.donnees #>> '{demande,secteur}' = 'conseil'),
                 'Chaque réglage du secteur est au journal');

  -- Sans réglage, le secteur se déduit de l'organisation.
  insert into public.clients (nom, secteur) values ('Garage du test C4', 'Garage, entretien automobile') returning id into v_autre;
  return next is(private.offload_secteur(v_autre), 'apres_vente', 'Un garage parle la langue de l''atelier sans rien régler');
  update public.clients set secteur = 'Cabinet d''architecture' where id = v_autre;
  return next is(private.offload_secteur(v_autre), 'conseil', 'Un cabinet d''architecte, celle de la mission');
  update public.clients set secteur = null where id = v_autre;
  return next is(private.offload_secteur(v_autre), 'general', 'Sans secteur connu, le texte général');

  -- Le réglage : gérant ou administrateur, secteurs connus seulement.
  perform tests.endosser(v_gerant, 'gerant@banc-varelo.test');
  return next throws_ok(format('select public.offload_regler_secteur(%L::uuid, %L)', v_client, 'boulangerie'), '22023', null,
                        'Un secteur inconnu est refusé, avec la liste');
  perform tests.redevenir_admin();
  v_collab := tests.c4_compte(v_client, 'collaborateur', 'collab-c4-vocab@banc-varelo.test');
  perform tests.endosser(v_collab, 'collab-c4-vocab@banc-varelo.test');
  return next throws_ok(format('select public.offload_regler_secteur(%L::uuid, %L)', v_client, 'negoce'), '42501', null,
                        'Un collaborateur ne règle pas le secteur');
  return next ok((public.offload_vocabulaire(v_client) ->> 'secteur') = 'conseil', 'Mais il le lit');
  perform tests.redevenir_admin();
end $f$;

select * from runtests('tests'::name, '^test_c4_43_');
