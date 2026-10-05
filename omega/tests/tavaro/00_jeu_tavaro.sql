-- 00 — Le jeu d'essai TAVARO (session B2) : un loueur fictif, deux agences, quatre personnes, un barème, un contrat.
-- S'appuie sur le schéma « tests » d'A5 (00_installation.sql : tests.jeu, tests.endosser, tests.inserer_minimal, runtests).
-- Exécutable tel quel par execute_sql sur la RECETTE, après le 00 d'A5. Rien ici ne touche aux tables du socle
-- en dehors des tests, que runtests() annule. Jamais en production.
--
-- Tout ce qui est du MODULE passe par ses portes publiques (loc_publier_bareme, loc_appliquer_releve,
-- loc_completer_contrat, loc_chiffrer_retour…) sous le rôle de la personne qui le ferait. Seul le décor du
-- socle (clients, entites, auth.users, comptes) est posé en direct, comme le ferait Omega à l'ouverture d'un compte.

create or replace function tests.tavaro_bareme_lignes() returns jsonb
language sql immutable as $$
  select jsonb_build_array(
    jsonb_build_object('code', 'CARBURANT_8E', 'libelle', 'Carburant manquant, au huitième', 'famille', 'carburant', 'unite', 'huitieme', 'prix_eur', 12, 'regime_tva', 'taxable', 'taux_tva', 20),
    jsonb_build_object('code', 'CARBURANT_SERVICE', 'libelle', 'Frais de service carburant', 'famille', 'carburant', 'unite', 'forfait', 'prix_eur', 15, 'regime_tva', 'taxable', 'taux_tva', 20),
    jsonb_build_object('code', 'KM_SUP', 'libelle', 'Kilomètre au-delà du forfait', 'famille', 'kilometres', 'unite', 'km', 'prix_eur', 0.25, 'regime_tva', 'taxable', 'taux_tva', 20),
    jsonb_build_object('code', 'RETARD_JOUR', 'libelle', 'Jour de retard entamé', 'famille', 'retard', 'unite', 'jour_entame', 'regime_tva', 'taxable', 'taux_tva', 20),
    jsonb_build_object('code', 'RAYURE_PORTIERE', 'libelle', 'Rayure de portière', 'famille', 'dommage', 'unite', 'forfait', 'prix_eur', 180, 'regime_tva', 'hors_champ'),
    jsonb_build_object('code', 'PARE_CHOC', 'libelle', 'Pare-chocs enfoncé', 'famille', 'dommage', 'unite', 'forfait', 'prix_eur', 950, 'regime_tva', 'hors_champ'),
    jsonb_build_object('code', 'JANTE', 'libelle', 'Jante, sur devis', 'famille', 'dommage', 'unite', 'devis', 'regime_tva', 'hors_champ'),
    jsonb_build_object('code', 'NETTOYAGE', 'libelle', 'Nettoyage approfondi', 'famille', 'nettoyage', 'unite', 'forfait', 'prix_eur', 60, 'regime_tva', 'taxable', 'taux_tva', 20),
    jsonb_build_object('code', 'FRAIS_DOSSIER', 'libelle', 'Frais de dossier', 'famille', 'frais', 'unite', 'forfait', 'prix_eur', 25, 'regime_tva', 'taxable', 'taux_tva', 20)
  )
$$;

-- Pose un utilisateur d'authentification (si la table est accessible), rend son id.
create or replace function tests.tavaro_personne(p_email text) returns uuid
language plpgsql as $$
declare v uuid := gen_random_uuid();
begin
  begin
    insert into auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, created_at, updated_at,
                            raw_app_meta_data, raw_user_meta_data, is_sso_user, is_anonymous,
                            confirmation_token, recovery_token, email_change_token_new, email_change, email_change_token_current,
                            phone_change, phone_change_token, reauthentication_token)
    values (v, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', p_email, 'x', now(), now(), now(),
            '{"provider":"email","providers":["email"]}', '{}', false, false, '', '', '', '', '', '', '', '');
  exception when others then
    raise notice 'tests.tavaro_personne : auth.users non alimentée (%), uuid libre', sqlerrm;
  end;
  return v;
end $$;

-- Le loueur fictif « Loueur Essai B2 » : siège + agence Nord, gérant, référent (valideur), DAF (valideur),
-- collaborateur du siège, collaborateur de l'agence Nord ; agences et réglages posés par le gérant (RLS) ;
-- barème publié par le gérant par la porte. Rend tous les identifiants.
create or replace function tests.tavaro_jeu() returns jsonb
language plpgsql as $$
declare
  v_client uuid; v_siege uuid; v_nord uuid;
  v_gerant uuid; v_referent uuid; v_daf uuid; v_collab uuid; v_collab_nord uuid; v_autre uuid; v_client_autre uuid;
  v_bareme uuid;
  ligne jsonb;
begin
  perform set_config('tests.jeu_actif', 'oui', true);
  ligne := tests.inserer_minimal('public', 'clients', jsonb_build_object('nom', 'Loueur Essai B2'));
  v_client := (ligne ->> 'id')::uuid;
  ligne := tests.inserer_minimal('public', 'clients', jsonb_build_object('nom', 'Autre loueur B2'));
  v_client_autre := (ligne ->> 'id')::uuid;

  -- L'entité principale naît avec le client (fait du socle) ; on lui donne un fuseau et un SIREN.
  select e.id into v_siege from public.entites e where e.client_id = v_client and e.principale limit 1;
  if v_siege is null then
    ligne := tests.inserer_minimal('public', 'entites', jsonb_build_object('client_id', v_client, 'nom', 'Loueur Essai B2 — Siège', 'principale', true, 'fuseau', 'Europe/Paris'));
    v_siege := (ligne ->> 'id')::uuid;
  end if;
  update public.entites set fuseau = 'Europe/Paris', nom = 'Loueur Essai B2 — Siège' where id = v_siege;
  begin
    update public.entites set siren = '123456789' where id = v_siege;
  exception when others then
    raise notice 'entites.siren non posé (%)', sqlerrm;
  end;
  ligne := tests.inserer_minimal('public', 'entites', jsonb_build_object('client_id', v_client, 'nom', 'Loueur Essai B2 — Agence Nord', 'principale', false, 'fuseau', 'Europe/Paris'));
  v_nord := (ligne ->> 'id')::uuid;

  v_gerant := tests.tavaro_personne('b2-gerant@essai.invalid');
  v_referent := tests.tavaro_personne('b2-referent@essai.invalid');
  v_daf := tests.tavaro_personne('b2-daf@essai.invalid');
  v_collab := tests.tavaro_personne('b2-collab@essai.invalid');
  v_collab_nord := tests.tavaro_personne('b2-collab-nord@essai.invalid');
  v_autre := tests.tavaro_personne('b2-autre-loueur@essai.invalid');

  perform tests.inserer_minimal('public', 'comptes', jsonb_build_object('user_id', v_gerant, 'client_id', v_client, 'role', 'gerant', 'perimetre_total', true));
  perform tests.inserer_minimal('public', 'comptes', jsonb_build_object('user_id', v_referent, 'client_id', v_client, 'role', 'valideur', 'perimetre_total', true));
  perform tests.inserer_minimal('public', 'comptes', jsonb_build_object('user_id', v_daf, 'client_id', v_client, 'role', 'valideur', 'perimetre_total', true));
  perform tests.inserer_minimal('public', 'comptes', jsonb_build_object('user_id', v_collab, 'client_id', v_client, 'role', 'collaborateur', 'perimetre_total', true));
  perform tests.inserer_minimal('public', 'comptes', jsonb_build_object('user_id', v_collab_nord, 'client_id', v_client, 'role', 'collaborateur', 'perimetre_total', true));
  perform tests.inserer_minimal('public', 'comptes', jsonb_build_object('user_id', v_autre, 'client_id', v_client_autre, 'role', 'gerant', 'perimetre_total', true));

  -- Le gérant règle ses agences et le module (politiques RLS du gérant).
  perform tests.endosser(v_gerant, 'b2-gerant@essai.invalid');
  insert into public.loc_agences (client_id, entite_id, code, taux_tva) values (v_client, v_siege, 'SIEGE', 20);
  insert into public.loc_agences (client_id, entite_id, code, taux_tva) values (v_client, v_nord, 'NORD', 20);
  insert into public.loc_reglages (client_id, tolerance_retard_min, emetteur)
  values (v_client, 59, jsonb_build_object('adresse', '12 rue de la Gare, 75010 Paris', 'numero_tva', 'FR12123456789', 'email', 'facturation@loueur-essai.invalid'));
  v_bareme := public.loc_publier_bareme('Barème 2026', date '2026-01-01', tests.tavaro_bareme_lignes());
  perform tests.redevenir_admin();

  return jsonb_build_object('client', v_client, 'client_autre', v_client_autre, 'siege', v_siege, 'nord', v_nord,
                            'gerant', v_gerant, 'referent', v_referent, 'daf', v_daf, 'collab', v_collab,
                            'collab_nord', v_collab_nord, 'autre', v_autre, 'bareme', v_bareme);
end $$;

-- La ligne d'export d'un contrat type : C-2026-0001, siège, 3 jours, Marie Durand, 12 000 km au départ.
create or replace function tests.tavaro_ligne_contrat(p_numero text default 'C-2026-0001', p_agence text default 'SIEGE') returns jsonb
language sql immutable as $$
  select jsonb_build_object('n', 1, 'nature', 'ajout', 'valeurs', jsonb_build_object(
    'numero', p_numero, 'agence', p_agence,
    'depart_le', '2026-10-01T09:00:00', 'retour_prevu_le', '2026-10-04T09:00:00',
    'immatriculation', 'GA-123-BC', 'categorie', 'B', 'km_depart', 12000,
    'tarif_jour', 45, 'franchise', 800, 'depot', 500, 'statut', 'ouvert',
    'locataire_nom', 'Durand', 'locataire_prenom', 'Marie', 'locataire_email', 'marie.durand@essai.invalid',
    'locataire_adresse', '3 rue des Lilas, 75011 Paris', 'locataire_type', 'particulier'))
$$;

-- Le contrat arrive par le relevé (export du logiciel du loueur), appliqué par la porte publique.
create or replace function tests.tavaro_contrat(p_jeu jsonb, p_cle text default 'export:b2:1') returns jsonb
language plpgsql as $$
declare v_res jsonb; v_contrat uuid;
begin
  v_res := public.loc_appliquer_releve((p_jeu ->> 'client')::uuid, 'contrats', jsonb_build_array(tests.tavaro_ligne_contrat()),
    jsonb_build_object('cle', p_cle, 'source', 'export', 'lu_le', now(), 'entite', p_jeu ->> 'siege'));
  select c.id into v_contrat from public.loc_contrats c where c.client_id = (p_jeu ->> 'client')::uuid and c.numero = 'C-2026-0001';
  return v_res || jsonb_build_object('contrat', v_contrat);
end $$;

-- Les conditions que l'agence complète au comptoir (ce que l'export ne portait pas).
create or replace function tests.tavaro_conditions() returns jsonb
language sql immutable as $$
  select jsonb_build_object('km_inclus', 600, 'politique_carburant', 'plein_contre_plein', 'franchise_eur', 800, 'rachat_franchise', false)
$$;

-- Le retour type : un jour et deux heures et demie de retard, 650 km, 3/8 de carburant manquants,
-- une rayure photographiée, un nettoyage photographié.
create or replace function tests.tavaro_retour() returns jsonb
language sql immutable as $$
  select jsonb_build_object(
    'retour_reel_le', '2026-10-05T11:30:00+02:00', 'km_retour', 12650,
    'carburant_depart_8', 8, 'carburant_retour_8', 5,
    'dommages', jsonb_build_array(jsonb_build_object('code', 'RAYURE_PORTIERE', 'preuves', jsonb_build_array(jsonb_build_object('photo', 'retour/portiere-avant-droite.jpg', 'prise_le', '2026-10-05T11:35:00+02:00')))),
    'postes', jsonb_build_array(jsonb_build_object('code', 'NETTOYAGE', 'preuves', jsonb_build_array(jsonb_build_object('photo', 'retour/habitacle.jpg')))),
    'preuves', jsonb_build_object('carburant', jsonb_build_array(jsonb_build_object('photo', 'retour/jauge.jpg')),
                                  'km', jsonb_build_array(jsonb_build_object('photo', 'retour/compteur.jpg'))))
$$;

-- Jeu complet jusqu'au contrat complété : le gérant a réglé, le contrat est arrivé, le collaborateur a complété.
create or replace function tests.tavaro_jeu_contrat() returns jsonb
language plpgsql as $$
declare jeu jsonb; r jsonb;
begin
  jeu := tests.tavaro_jeu();
  r := tests.tavaro_contrat(jeu);
  jeu := jeu || jsonb_build_object('contrat', r ->> 'contrat', 'releve', r);
  perform tests.endosser((jeu ->> 'collab')::uuid, 'b2-collab@essai.invalid');
  perform public.loc_completer_contrat((jeu ->> 'contrat')::uuid, tests.tavaro_conditions());
  perform tests.redevenir_admin();
  return jeu;
end $$;

-- Le retour est chiffré par une personne (par la porte), puis l'ouvrier de base passe (dépôt de la demande).
create or replace function tests.tavaro_chiffrer(p_jeu jsonb, p_par text default 'collab', p_retour jsonb default null) returns jsonb
language plpgsql as $$
declare v_prop uuid; v_demande uuid; v_ouvrier jsonb;
begin
  perform tests.endosser((p_jeu ->> p_par)::uuid, 'b2-' || p_par || '@essai.invalid');
  v_prop := public.loc_chiffrer_retour((p_jeu ->> 'contrat')::uuid, coalesce(p_retour, tests.tavaro_retour()));
  perform tests.redevenir_admin();
  v_ouvrier := private.loc_ouvrier(50);
  select p.demande_id into v_demande from public.loc_propositions p where p.id = v_prop;
  return p_jeu || jsonb_build_object('proposition', v_prop, 'demande', v_demande, 'ouvrier', v_ouvrier);
end $$;

-- Une personne approuve (ou rejette) une demande : l'INSERT dans approbations, comme l'écran d'A3.
create or replace function tests.tavaro_decider(p_jeu jsonb, p_demande uuid, p_par text, p_decision text default 'approuve', p_commentaire text default 'Vérifié avec les photos du retour.') returns void
language plpgsql as $$
begin
  perform tests.endosser((p_jeu ->> p_par)::uuid, 'b2-' || p_par || '@essai.invalid');
  insert into public.approbations (demande_id, client_id, user_id, decision, commentaire)
  values (p_demande, (p_jeu ->> 'client')::uuid, (p_jeu ->> p_par)::uuid, p_decision, p_commentaire);
  perform tests.redevenir_admin();
end $$;

-- Jeu complet jusqu'à la facture émise : retour chiffré par le collaborateur, demande approuvée par le référent,
-- ouvrier passé (décision appliquée, factures émises, courriel préparé ou non selon les réglages d'envoi).
create or replace function tests.tavaro_jeu_facture() returns jsonb
language plpgsql as $$
declare jeu jsonb; v_ouvrier jsonb; v_factures jsonb;
begin
  jeu := tests.tavaro_chiffrer(tests.tavaro_jeu_contrat(), 'collab');
  perform tests.tavaro_decider(jeu, (jeu ->> 'demande')::uuid, 'referent');
  v_ouvrier := private.loc_ouvrier(50);
  select coalesce(jsonb_agg(jsonb_build_object('id', f.id, 'reference', f.reference, 'nature', f.nature, 'total_ttc', f.total_ttc, 'statut', f.statut) order by f.numero), '[]'::jsonb)
    into v_factures from public.loc_factures f where f.client_id = (jeu ->> 'client')::uuid;
  return jeu || jsonb_build_object('ouvrier_decision', v_ouvrier, 'factures', v_factures);
end $$;

-- Combien de lignes du journal opposable d'un client portent cette action (nom de colonne lu sur place).
create or replace function tests.tavaro_journal(p_client uuid, p_action text) returns bigint
language plpgsql as $$
declare col text; n bigint;
begin
  col := tests.colonne_parmi('public.journal_opposable'::regclass, array['action', 'evenement', 'type_action', 'type']);
  if col is null then return -1; end if;
  execute format('select count(*) from public.journal_opposable where client_id = $1 and %I = $2', col) into n using p_client, p_action;
  return n;
end $$;

-- Les travaux d'un genre pour un client, tels que la file les porte.
create or replace function tests.tavaro_travaux(p_client uuid, p_genre text) returns jsonb
language sql as $$
  select coalesce(jsonb_agg(jsonb_build_object('id', t.id, 'etat', t.etat, 'charge', t.charge, 'cle', t.cle, 'erreur', t.erreur) order by t.id), '[]'::jsonb)
  from public.travaux t where t.client_id = p_client and t.genre = p_genre
$$;

grant usage on schema tests to authenticated;
grant execute on all functions in schema tests to authenticated;
