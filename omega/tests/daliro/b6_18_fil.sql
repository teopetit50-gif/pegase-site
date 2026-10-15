-- b6_18 — DALIRO : le fil du chantier — messages, photos et vocaux du terrain rangés (session B6, 06/10/2026), b6_24.
-- Exécutable tel quel par execute_sql sur la RECETTE, après b6_00_jeu.sql et les migrations b6_01 à b6_24.
-- runtests() annule tout. Les réceptions sont posées comme la fonction reception d'A2 les dépose ; le rangement est
-- appelé directement (en vrai, par le travail daliro.reception de l'ouvrier).

create or replace function tests.b6_ranger(p_reception bigint) returns jsonb
language sql security definer set search_path to '' as $$ select private.btp_ranger_reception(p_reception) $$;

create or replace function tests.test_b6_18_fil() returns setof text
language plpgsql as $f$
declare
  banc jsonb; v_client uuid; v_gerant uuid;
  v_mo uuid; v_a uuid; v_b uuid; v_lot uuid; v_m uuid; v_eq uuid; v_ali uuid;
  v_tel text := '6' || lpad((floor(random() * 90000000) + 10000000)::bigint::text, 8, '0');
  v_j date := (now() at time zone 'Europe/Paris')::date;
  v_r1 bigint; v_r2 bigint; v_r3 bigint; v_r4 bigint;
  v_m1 uuid; v_m2 uuid; v_m3 uuid; v_av uuid; v_res jsonb;
begin
  banc := tests.b6_banc();
  v_client := (banc ->> 'client')::uuid; v_gerant := (banc ->> 'gerant')::uuid;
  perform tests.redevenir_admin();
  perform public.btp_installer(v_client, 'chantiers');

  perform tests.endosser(v_gerant, 'gerant@banc-varelo.test');
  insert into public.btp_tiers (client_id, roles, nom) values (v_client, array['maitre_ouvrage'], 'MO du fil') returning id into v_mo;
  insert into public.btp_chantiers (client_id, nom, code_postal, commune, maitre_ouvrage_type, place_client, maitre_ouvrage_id, statut, alias)
  values (v_client, 'Chantier Fil Alpha', '69100', 'Villeurbanne', 'professionnel', 'titulaire', v_mo, 'ouvert', array['Résidence Alpha']) returning id into v_a;
  insert into public.btp_chantiers (client_id, nom, code_postal, commune, maitre_ouvrage_type, place_client, maitre_ouvrage_id, statut)
  values (v_client, 'Chantier Fil Bravo', '69100', 'Villeurbanne', 'professionnel', 'titulaire', v_mo, 'ouvert') returning id into v_b;
  insert into public.btp_lots (client_id, chantier_id, code, libelle, execution) values (v_client, v_b, '01', 'Lot du fil', 'client') returning id into v_lot;
  v_m := public.btp_ecrire_marche(null, v_b, jsonb_build_object('reference', 'FIL-1', 'mode_prix', 'forfait', 'montant_ht_declare', 1000, 'retenue_taux', 0));
  perform public.btp_ecrire_ligne(null, v_m, jsonb_build_object('designation', 'Travaux', 'unite_lue', 'forfait', 'nature', 'forfait', 'montant_ht', 1000, 'lot_id', v_lot));
  perform public.btp_verifier_marche(v_m);
  insert into public.btp_equipes (client_id, nom) values (v_client, 'Équipe du fil') returning id into v_eq;
  insert into public.btp_intervenants (client_id, nom, equipe_id, telephone) values (v_client, 'Ali du fil', v_eq, '+33' || v_tel) returning id into v_ali;
  insert into public.btp_passages (client_id, chantier_id, lot_id, equipe_id, tache, debut, fin)
  values (v_client, v_b, v_lot, v_eq, 'Pose du fil', v_j - 1, v_j + 1);

  -- Les réceptions, comme A2 les dépose.
  perform tests.redevenir_admin();
  insert into public.receptions (client_id, module, canal, boite, identifiant_externe, de_adresse, de_nom, corps, pieces, detail)
  values (v_client, 'daliro', 'whatsapp', 'b6-fil', 'wamid.fil.1', '33' || v_tel, 'Ali', 'Résidence Alpha : le client veut une prise de plus dans le garage', '[]', '{}')
  returning id into v_r1;
  insert into public.receptions (client_id, module, canal, boite, identifiant_externe, de_adresse, de_nom, corps, pieces, detail)
  values (v_client, 'daliro', 'whatsapp', 'b6-fil', 'wamid.fil.2', '33' || v_tel, 'Ali', null,
          jsonb_build_array(jsonb_build_object('nom', 'vocal.ogg', 'mime', 'audio/ogg', 'taille', 12000, 'chemin', v_client || '/receptions/wamid.fil.2/vocal.ogg')),
          '{"media": {"vocal": true}}')
  returning id into v_r2;
  insert into public.receptions (client_id, module, canal, boite, identifiant_externe, de_adresse, de_nom, corps, pieces, detail)
  values (v_client, 'daliro', 'whatsapp', 'b6-fil', 'wamid.fil.3', '33700000000', 'Inconnu', 'photo',
          jsonb_build_array(jsonb_build_object('nom', 'image.jpg', 'mime', 'image/jpeg', 'taille', 80000, 'chemin', v_client || '/receptions/wamid.fil.3/image.jpg')), '{}')
  returning id into v_r3;
  insert into public.receptions (client_id, module, canal, boite, identifiant_externe, de_adresse, de_nom, corps)
  values (v_client, null, 'email', 'b6-fil-autre', 'msg.fil.4', 'pub@exemple.test', 'Pub', 'Offre')
  returning id into v_r4;

  -- ── Les droits ──
  return next ok(not has_function_privilege('authenticated', 'private.btp_ranger_reception(bigint)', 'execute'), 'Le rangement est réservé au serveur');
  return next ok(not has_table_privilege('authenticated', 'public.btp_messages', 'insert'), 'Les messages ne s''écrivent que par le serveur et les portes');

  -- ── Le rangement ──
  v_res := tests.b6_ranger(v_r1);
  return next is(v_res ->> 'rangement' || '/' || (v_res ->> 'chantier'), 'nom/' || v_a::text, 'Le chantier nommé dans le message (alias « Résidence Alpha »)');
  v_res := tests.b6_ranger(v_r2);
  return next is(v_res ->> 'rangement' || '/' || (v_res ->> 'chantier') || '/' || (v_res ->> 'vocal'), 'passage/' || v_b::text || '/true',
                 'Le vocal d''Ali, sans nom de chantier : celui de son passage en cours ; vocal reconnu');
  v_res := tests.b6_ranger(v_r3);
  return next is(v_res ->> 'rangement', 'a_ranger', 'Un numéro inconnu sur la boîte de Daliro : à ranger');
  return next is(tests.b6_ranger(v_r4) ->> 'ignore', 'expéditeur inconnu de l''annuaire', 'Un inconnu hors de la boîte de Daliro : ignoré');
  return next is(tests.b6_ranger(v_r1) ->> 'ignore', 'déjà rangée', 'Rejouer ne double rien');
  select m.id into v_m1 from public.btp_messages m where m.reception_id = v_r1;
  select m.id into v_m2 from public.btp_messages m where m.reception_id = v_r2;
  select m.id into v_m3 from public.btp_messages m where m.reception_id = v_r3;
  return next is((select m.de_nom || '/' || (m.pieces -> 0 ->> 'chemin') from public.btp_messages m where m.id = v_m2),
                 'Ali du fil/' || v_client || '/receptions/wamid.fil.2/vocal.ogg', 'Le message porte l''expéditeur de l''annuaire et le chemin du vocal');

  -- ── Le bureau ──
  perform tests.endosser(v_gerant, 'gerant@banc-varelo.test');
  return next is(jsonb_array_length(public.btp_messages_a_ranger(v_client)), 1, 'Un message à ranger');
  perform public.btp_ranger_message(v_m3, v_a);
  return next is((select m.statut || '/' || m.rangement from public.btp_messages m where m.id = v_m3), 'range/manuel', 'Rangé à la main');
  return next is(jsonb_array_length(public.btp_fil_chantier(v_a)), 2, 'Le fil d''Alpha : deux messages');
  v_av := public.btp_avenant_depuis_message(v_m2, 'Prise supplémentaire dans le garage');
  return next is((select a.statut || '/' || (a.origine ->> 'canal') || '/' || (a.origine ->> 'message') from public.btp_avenants a where a.id = v_av),
                 'brouillon/vocal/' || v_m2::text, 'Un avenant brouillon naît du vocal, le message pour origine');
  return next throws_ok(format('select public.btp_avenant_depuis_message(%L, ''x'')', v_m2), '23514', null, 'Un message n''ouvre qu''un avenant');
  perform public.btp_ecarter_message(v_m1, 'Doublon');
  return next is((select m.statut from public.btp_messages m where m.id = v_m1), 'ecarte', 'Écarté');
  return next is(jsonb_array_length(public.btp_fil_chantier(v_a)), 1, 'Un message écarté sort du fil');
end $f$;

select * from runtests('tests'::name, '^test_b6_18_');
