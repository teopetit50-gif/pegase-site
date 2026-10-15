-- b6_22 — DALIRO : le travail repéré, comparé au marché et chiffré sur les prix validés (session B6, 11/10/2026), b6_26.
-- Exécutable tel quel par execute_sql sur la RECETTE, après b6_00_jeu.sql et les migrations b6_01 à b6_26.
-- runtests() annule tout. Le lecteur n'est pas appelé : sa lecture est rendue à public.daliro_media_lu comme il le
-- ferait, avec les droits du serveur. Désignations rares (ragréage, tadelakt, calepinage) : le banc n'en porte pas.
-- Un seul prix validé par désignation et unité (index du socle) : l'ambiguïté se joue entre deux désignations.

create or replace function tests.b6_chiffrage_ranger(p_reception bigint) returns jsonb
language sql security definer set search_path to '' as $$ select private.btp_ranger_reception(p_reception) $$;
create or replace function tests.b6_chiffrage_demander(p_message uuid) returns bigint
language sql security definer set search_path to '' as $$ select private.btp_demander_lecture(p_message) $$;

create or replace function tests.test_b6_22_chiffrage_lu() returns setof text
language plpgsql as $f$
declare
  banc jsonb; v_client uuid; v_gerant uuid;
  v_mo uuid; v_ch uuid; v_lot uuid; v_m uuid; v_l uuid; v_eq uuid;
  v_tel text := '7' || lpad((floor(random() * 90000000) + 10000000)::bigint::text, 8, '0');
  v_j date := (now() at time zone 'Europe/Paris')::date;
  v_r bigint; v_msg uuid; v_res jsonb; v_a1 uuid; v_a2 uuid; v_a3 uuid;
begin
  banc := tests.b6_banc();
  v_client := (banc ->> 'client')::uuid; v_gerant := (banc ->> 'gerant')::uuid;
  perform tests.redevenir_admin();
  perform public.btp_installer(v_client, 'chantiers');

  -- ── Le chantier, son marché vérifié (une ligne de ragréage à 48 € HT le m²) ──
  perform tests.endosser(v_gerant, 'gerant@banc-varelo.test');
  insert into public.btp_tiers (client_id, roles, nom) values (v_client, array['maitre_ouvrage'], 'MO du chiffrage') returning id into v_mo;
  insert into public.btp_chantiers (client_id, nom, code_postal, commune, maitre_ouvrage_type, place_client, maitre_ouvrage_id, statut)
  values (v_client, 'Chantier du chiffrage', '69100', 'Villeurbanne', 'professionnel', 'titulaire', v_mo, 'ouvert') returning id into v_ch;
  insert into public.btp_lots (client_id, chantier_id, code, libelle, execution) values (v_client, v_ch, '02', 'Sols', 'client') returning id into v_lot;
  v_m := public.btp_ecrire_marche(null, v_ch, jsonb_build_object('reference', 'CHF-1', 'mode_prix', 'unitaire', 'montant_ht_declare', 4800, 'retenue_taux', 0));
  v_l := public.btp_ecrire_ligne(null, v_m, jsonb_build_object('designation', 'Ragréage autolissant sur dalle', 'unite_lue', 'm2', 'quantite', 100,
                                                               'prix_unitaire_ht', 48, 'montant_ht', 4800, 'lot_id', v_lot));
  perform public.btp_verifier_marche(v_m);
  insert into public.btp_equipes (client_id, nom) values (v_client, 'Équipe du chiffrage') returning id into v_eq;
  insert into public.btp_intervenants (client_id, nom, equipe_id, telephone) values (v_client, 'Chef du chiffrage', v_eq, '+33' || v_tel);
  insert into public.btp_passages (client_id, chantier_id, lot_id, equipe_id, tache, debut, fin)
  values (v_client, v_ch, v_lot, v_eq, 'Sols du chiffrage', v_j - 1, v_j + 1);

  -- ── La bibliothèque : le prix du marché validé ; deux tadelakts validés, désignations voisines, prix différents ──
  perform tests.redevenir_admin();
  update public.btp_bibliotheque_prix set statut = 'valide', valide_le = now() where client_id = v_client and ligne_marche_id = v_l;
  insert into public.btp_bibliotheque_prix (client_id, designation, unite, prix_unitaire_ht, origine, statut, valide_le) values
    (v_client, 'Tadelakt mural', 'm2', 95, 'saisie', 'valide', now()),
    (v_client, 'Tadelakt plafond', 'm2', 110, 'saisie', 'valide', now());

  -- ── Les droits ──
  return next ok(not has_function_privilege('authenticated', 'private.btp_prix_pour(uuid, uuid, text, text)', 'execute')
                 and not has_function_privilege('authenticated', 'private.btp_mots_cles(text)', 'execute'), 'La recherche de prix reste au serveur');

  -- ── Le message et sa lecture demandée : le contexte porte le marché ──
  insert into public.receptions (client_id, module, canal, boite, identifiant_externe, de_adresse, de_nom, corps, pieces, detail)
  values (v_client, 'daliro', 'whatsapp', 'b6-chiffrage', 'wamid.chiffrage.1', '33' || v_tel, 'Chef', null,
          jsonb_build_array(jsonb_build_object('nom', 'vocal.ogg', 'mime', 'audio/ogg', 'taille', 12000, 'chemin', v_client || '/receptions/wamid.chiffrage.1/vocal.ogg')),
          '{"media": {"vocal": true}}')
  returning id into v_r;
  v_msg := (tests.b6_chiffrage_ranger(v_r) ->> 'message')::uuid;
  perform tests.b6_chiffrage_demander(v_msg);
  return next ok((select t.charge ->> 'contexte' like '%au marché : Ragréage autolissant sur dalle (m2)%' from public.travaux t where t.cle = 'media:' || v_r::text),
                 'Le lecteur reçoit les lignes du marché vérifié (désignation, unité ; pas les prix)');

  -- ── La lecture rendue : trois travaux en plus ──
  v_res := public.daliro_media_lu(v_r, jsonb_build_object('reception', v_r, 'resume', 'Trois travaux en plus.',
    'medias', jsonb_build_array(jsonb_build_object('n', 1, 'nature', 'vocal', 'statut', 'lu')),
    'demandes', jsonb_build_array(
      jsonb_build_object('nature', 'travail_supplementaire', 'texte', 'Reprise du ragréage autolissant', 'quantite', 12, 'unite', 'm²', 'lot_code', '02',
                         'source', jsonb_build_object('media', 1, 'extrait', 'le ragréage est à reprendre sur douze mètres carrés'), 'verifiee', true),
      jsonb_build_object('nature', 'travail_supplementaire', 'texte', 'Tadelakt de la douche', 'quantite', 6, 'unite', 'm2',
                         'source', jsonb_build_object('media', 1, 'extrait', 'du tadelakt dans la douche'), 'verifiee', true),
      jsonb_build_object('nature', 'travail_supplementaire', 'texte', 'Calepinage mosaïque', 'quantite', 4, 'unite', 'm2',
                         'source', jsonb_build_object('media', 1, 'extrait', 'une mosaïque'), 'verifiee', true))));
  v_a1 := (v_res -> 'avenants' ->> 0)::uuid; v_a2 := (v_res -> 'avenants' ->> 1)::uuid; v_a3 := (v_res -> 'avenants' ->> 2)::uuid;
  return next is((v_res ->> 'chiffrees')::int || '/' || jsonb_array_length(v_res -> 'avenants'), '1/3', 'Trois avenants brouillons, un seul chiffré');
  return next is((select l.designation || '/' || l.quantite || '/' || l.unite || '/' || l.prix_unitaire_ht || '/' || l.origine_prix || '/' || (l.lot_id = v_lot)
                  from public.btp_avenants_lignes l where l.avenant_id = v_a1),
                 'Ragréage autolissant sur dalle/12.000/m2/48.0000/bibliotheque/true', 'Le ragréage : 12 m² au prix validé du marché (48 €), lot 02 lu');
  return next is((select a.statut || '/' || (a.origine -> 'chiffrage' ->> 'etat') || '/' || (a.origine -> 'chiffrage' -> 'proche_du_marche' ->> 'designation')
                  from public.btp_avenants a where a.id = v_a1), 'brouillon/trouve/Ragréage autolissant sur dalle',
                 'Il reste un brouillon ; la ligne du marché proche est signalée (déjà au marché ?)');
  return next is((select (a.origine -> 'chiffrage' ->> 'etat') || '/' || jsonb_array_length(a.origine -> 'chiffrage' -> 'candidats')
                         || '/' || (select count(*) from public.btp_avenants_lignes l where l.avenant_id = a.id)
                  from public.btp_avenants a where a.id = v_a2), 'ambigu/2/0', 'Tadelakt mural (95 €) ou plafond (110 €) : ambigu, rien n''est chiffré, les candidats sont gardés');
  return next is((select (a.origine -> 'chiffrage' ->> 'etat') || '/' || (select count(*) from public.btp_avenants_lignes l where l.avenant_id = a.id)
                  from public.btp_avenants a where a.id = v_a3), 'sans_prix/0', 'Aucun prix validé pour la mosaïque : à chiffrer à la main');
  return next ok(jsonb_array_length(v_res -> 'refus') = 0, 'Aucun refus');
  return next is((tests.b6_journal(v_client, 'daliro.media_lu', v_msg::text) -> 'donnees' ->> 'chiffrees')::int, 1, 'Le journal compte la ligne chiffrée');
end $f$;

select * from runtests('tests'::name, '^test_b6_22_');
