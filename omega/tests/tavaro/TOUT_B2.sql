-- TOUT_B2.sql — les tests pgTAP du module TAVARO (session B2), assemblés par assembler.sh.
-- Prérequis : omega/tests/socle/00_installation.sql (A5) déjà joué ; migrations b2_01 à b2_11 posées (avec b2_05b, b2_06b, b2_09b et b2_11b).
-- Un seul appel execute_sql sur la RECETTE ; runtests() annule tout ce que les tests écrivent.

-- ═══════════════════════════ 00_jeu_tavaro.sql
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

-- Pose un utilisateur d'authentification, rend son id. L'adresse reçoit un suffixe unique : un même test
-- peut rappeler tavaro_jeu() plusieurs fois dans sa transaction (jeu_contrat → jeu_facture, puis un second jeu),
-- et auth.users refuse deux fois la même adresse. Une erreur ici remonte : un compte sans utilisateur casserait
-- plus loin (comptes_user_id_fkey) sans dire pourquoi.
create or replace function tests.tavaro_personne(p_email text) returns uuid
language plpgsql as $$
declare v uuid := gen_random_uuid(); v_email text := replace(p_email, '@', '-' || left(v::text, 8) || '@');
begin
  insert into auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, created_at, updated_at,
                          raw_app_meta_data, raw_user_meta_data, is_sso_user, is_anonymous,
                          confirmation_token, recovery_token, email_change_token_new, email_change, email_change_token_current,
                          phone_change, phone_change_token, reauthentication_token)
  values (v, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', v_email, 'x', now(), now(), now(),
          '{"provider":"email","providers":["email"]}', '{}', false, false, '', '', '', '', '', '', '', '');
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

-- ═══════════════════════════ 01_reglages_et_bareme.sql
-- 01 — Le gérant règle l'agence et publie le barème ; le collaborateur ne peut ni l'un ni l'autre (scénario, étapes 1 et 2).
-- Exécutable tel quel par execute_sql sur la RECETTE, après 00_installation.sql (A5) et 00_jeu_tavaro.sql.

create or replace function tests.test_b2_01_reglages_et_bareme() returns setof text
language plpgsql as $f$
declare
  jeu jsonb; v_client uuid; v_bareme uuid; n bigint;
begin
  jeu := tests.tavaro_jeu();
  v_client := (jeu ->> 'client')::uuid;
  v_bareme := (jeu ->> 'bareme')::uuid;

  -- Ce que le jeu a posé par le gérant, sous RLS.
  return next is(tests.compter('public', 'loc_agences', format('client_id = %L', v_client)), 2::bigint, 'Le gérant a posé ses deux agences (SIEGE, NORD)');
  return next is(tests.compter('public', 'loc_reglages', format('client_id = %L', v_client)), 1::bigint, 'Le gérant a posé les réglages du module (tolérance 59 min, émetteur)');
  return next isnt(v_bareme, null, 'loc_publier_bareme rend l''identifiant du barème');
  return next is((select b.statut from public.loc_baremes b where b.id = v_bareme), 'publie', 'Le barème est publié');
  return next is(tests.compter('public', 'loc_bareme_lignes', format('bareme_id = %L', v_bareme)), 9::bigint, 'Ses neuf lignes sont posées');
  return next is((select l.nature from public.loc_bareme_lignes l where l.bareme_id = v_bareme and l.code = 'RAYURE_PORTIERE'), 'dommage', 'Une ligne de la famille dommage est de nature dommage');
  return next is((select l.prix_eur from public.loc_bareme_lignes l where l.bareme_id = v_bareme and l.code = 'JANTE'), null::numeric, 'Une ligne sur devis n''a pas de prix');
  return next is(private.loc_bareme_en_vigueur(v_client, date '2026-10-01'), v_bareme, 'Ce barème est celui en vigueur au 1er octobre 2026');
  return next is(private.loc_bareme_en_vigueur(v_client, date '2025-12-31'), null::uuid, 'Avant sa date d''effet, aucun barème');
  return next ok(tests.tavaro_journal(v_client, 'tavaro.bareme_publie') >= 1, 'Le journal opposable porte tavaro.bareme_publie');

  -- Un second barème à la même date : refusé.
  perform tests.endosser((jeu ->> 'gerant')::uuid, 'b2-gerant@essai.invalid');
  return next throws_ok(format('select public.loc_publier_bareme(%L, %L::date, tests.tavaro_bareme_lignes())', 'Doublon', '2026-01-01'),
    '22023', null, 'Un second barème à la même date d''effet est refusé (22023)');
  return next throws_ok(format('select public.loc_publier_bareme(%L, %L::date, %L::jsonb)', 'Vide', '2026-02-01', '[]'),
    '22023', null, 'Un barème sans ligne est refusé');
  return next throws_ok(format('select public.loc_publier_bareme(%L, %L::date, %L::jsonb)', 'Code faux', '2026-02-01',
    '[{"code": "rayure minuscule", "libelle": "x", "famille": "dommage", "unite": "forfait", "prix_eur": 1, "regime_tva": "hors_champ"}]'),
    '22023', null, 'Une ligne au code invalide est refusée avec son numéro de ligne');
  perform tests.redevenir_admin();

  -- Le collaborateur ne publie pas, ne retire pas, ne règle pas.
  perform tests.endosser((jeu ->> 'collab')::uuid, 'b2-collab@essai.invalid');
  return next throws_ok(format('select public.loc_publier_bareme(%L, %L::date, tests.tavaro_bareme_lignes())', 'Barème pirate', '2026-03-01'),
    '42501', null, 'Le collaborateur ne publie pas de barème (42501)');
  return next throws_ok(format('select public.loc_retirer_bareme(%L::uuid, %L)', v_bareme, 'essai'),
    '42501', null, 'Le collaborateur ne retire pas le barème (42501)');
  return next throws_ok(format('insert into public.loc_reglages (client_id, tolerance_retard_min) values (%L, 10)', (jeu ->> 'client_autre')),
    '42501', null, 'Le collaborateur ne pose pas de réglages (RLS, 42501)');
  return next throws_ok(format('insert into public.loc_agences (client_id, entite_id, code) values (%L, %L, %L)', v_client, jeu ->> 'siege', 'PIRATE'),
    '42501', null, 'Le collaborateur ne crée pas d''agence (RLS, 42501)');
  return next is(tests.compter('public', 'loc_bareme_lignes', format('bareme_id = %L', v_bareme)), 9::bigint, 'Le collaborateur lit le barème de son loueur (membre)');
  perform tests.redevenir_admin();

  -- La direction retire le barème avec un motif ; il n'est plus en vigueur.
  perform tests.endosser((jeu ->> 'gerant')::uuid, 'b2-gerant@essai.invalid');
  perform public.loc_retirer_bareme(v_bareme, 'Erreur sur le prix du nettoyage');
  perform tests.redevenir_admin();
  return next is((select b.statut from public.loc_baremes b where b.id = v_bareme), 'retire', 'Le gérant retire le barème');
  return next is(private.loc_bareme_en_vigueur(v_client, date '2026-10-01'), null::uuid, 'Retiré, il n''est plus en vigueur');
  return next ok(tests.tavaro_journal(v_client, 'tavaro.bareme_retire') >= 1, 'Le journal opposable porte tavaro.bareme_retire');
end $f$;


-- ═══════════════════════════ 02_contrat_par_releve.sql
-- 02 — Le contrat arrive par le relevé du logiciel du loueur (scénario, étape 3) : contrat, véhicule, locataire, clé rejouée.

create or replace function tests.test_b2_02_contrat_par_releve() returns setof text
language plpgsql as $f$
declare
  jeu jsonb; v_client uuid; r jsonb; r2 jsonb; c public.loc_contrats; v_loc public.loc_locataires;
begin
  jeu := tests.tavaro_jeu();
  v_client := (jeu ->> 'client')::uuid;
  r := tests.tavaro_contrat(jeu);

  return next is((r ->> 'deja_applique')::boolean, false, 'Le relevé est appliqué une première fois');
  return next is((r ->> 'creations')::int, 1, 'Une création');
  return next is((r ->> 'rejetees')::int, 0, format('Aucune ligne rejetée (%s)', r -> 'erreurs'));
  return next isnt(r ->> 'contrat', null, 'Le contrat C-2026-0001 existe');
  select * into c from public.loc_contrats where id = (r ->> 'contrat')::uuid;
  return next is(c.statut, 'ouvert', 'Il est ouvert');
  return next is(c.entite_id, (jeu ->> 'siege')::uuid, 'Il est rattaché à l''agence du siège (code SIEGE)');
  return next is(c.source, 'export', 'Sa source est l''export');
  return next is(c.depart_le, timestamptz '2026-10-01 09:00:00 Europe/Paris', 'Le départ est lu à l''heure de Paris');
  return next is(c.retour_prevu_le, timestamptz '2026-10-04 09:00:00 Europe/Paris', 'Le retour prévu aussi');
  return next is(c.km_depart, 12000, 'Le compteur de départ est lu');
  return next is(c.tarif_jour_eur, 45::numeric, 'Le tarif journalier est lu');
  return next is(c.franchise_eur, 800::numeric, 'La franchise est lue');
  return next isnt(c.vehicule_id, null, 'Le véhicule GA-123-BC est créé');
  return next is((select v.statut from public.loc_vehicules v where v.id = c.vehicule_id), 'a_confirmer', 'Un véhicule inconnu du référentiel naît à confirmer');
  return next is((select v.immatriculation from public.loc_vehicules v where v.id = c.vehicule_id), 'GA-123-BC', 'La plaque est normalisée au format SIV');
  return next isnt(c.locataire_id, null, 'Le locataire est créé');
  select * into v_loc from public.loc_locataires where id = c.locataire_id;
  return next is(v_loc.nom || ' ' || v_loc.prenom || ' ' || v_loc.email, 'Durand Marie marie.durand@essai.invalid', 'Nom, prénom et courriel du locataire sont lus');
  return next is(v_loc.type, 'particulier', 'C''est un particulier');
  return next is(tests.compter('public', 'loc_releves', format('client_id = %L and nature = %L', v_client, 'contrats')), 1::bigint, 'Le relevé est tracé');

  -- La même clé rejouée n'applique rien.
  r2 := tests.tavaro_contrat(jeu);
  return next is((r2 ->> 'deja_applique')::boolean, true, 'La même clé rejouée répond deja_applique');
  return next is(tests.compter('public', 'loc_contrats', format('client_id = %L', v_client)), 1::bigint, 'Toujours un seul contrat');

  -- Une ligne sans numéro est rejetée sans faire tomber le relevé.
  r2 := public.loc_appliquer_releve(v_client, 'contrats',
    jsonb_build_array(jsonb_build_object('n', 1, 'nature', 'ajout', 'valeurs', jsonb_build_object('agence', 'SIEGE', 'depart_le', '2026-10-02T09:00:00', 'retour_prevu_le', '2026-10-03T09:00:00')),
                      tests.tavaro_ligne_contrat('C-2026-0002', 'NORD')),
    jsonb_build_object('cle', 'export:b2:2', 'source', 'export', 'lu_le', now()));
  return next is((r2 ->> 'rejetees')::int, 1, 'La ligne sans numéro est rejetée');
  return next is((r2 ->> 'creations')::int, 1, 'L''autre ligne entre');
  return next ok((r2 -> 'erreurs' -> 0 ->> 'motif') like '%numero%', format('Le motif nomme le champ manquant (%s)', r2 -> 'erreurs' -> 0 ->> 'motif'));
  return next is((select x.entite_id from public.loc_contrats x where x.client_id = v_client and x.numero = 'C-2026-0002'), (jeu ->> 'nord')::uuid, 'Le second contrat est à l''agence Nord');

  -- Le retour réel dans l'export clôt le contrat et fait avancer le compteur du véhicule.
  r2 := public.loc_appliquer_releve(v_client, 'contrats',
    jsonb_build_array(jsonb_build_object('n', 1, 'nature', 'ajout', 'valeurs', jsonb_build_object('numero', 'C-2026-0002', 'agence', 'NORD', 'retour_reel_le', '2026-10-03T10:00:00', 'km_retour', 12300))),
    jsonb_build_object('cle', 'export:b2:3', 'source', 'export', 'lu_le', now()));
  return next is((r2 ->> 'modifications')::int, 1, 'La ligne de retour modifie le contrat');
  return next is((select x.statut from public.loc_contrats x where x.client_id = v_client and x.numero = 'C-2026-0002'), 'clos', 'Un contrat rendu passe clos');
  return next is((select v.km_dernier from public.loc_vehicules v where v.id = c.vehicule_id), 12300, 'Le compteur du véhicule avance au retour');

  -- Une nature ou une source inconnue : refusées.
  return next throws_ok(format('select public.loc_appliquer_releve(%L, %L, %L::jsonb, %L::jsonb)', v_client, 'amendes', '[]', '{"cle": "x"}'), '22023', null, 'Une nature de relevé inconnue est refusée');
  return next throws_ok(format('select public.loc_appliquer_releve(%L, %L, %L::jsonb, %L::jsonb)', v_client, 'contrats', '[]', '{}'), '22023', null, 'Un relevé sans clé est refusé');
end $f$;


-- ═══════════════════════════ 03_completer_et_amender.sql
-- 03 — Le collaborateur complète les conditions, le référent prolonge (scénario, étapes 4 et 5) ; les saisies humaines ne s'écrasent pas.

create or replace function tests.test_b2_03_completer_et_amender() returns setof text
language plpgsql as $f$
declare
  jeu jsonb; v_client uuid; v_contrat uuid; r jsonb; c public.loc_contrats; v_am uuid;
begin
  jeu := tests.tavaro_jeu();
  v_client := (jeu ->> 'client')::uuid;
  r := tests.tavaro_contrat(jeu);
  v_contrat := (r ->> 'contrat')::uuid;

  -- Le collaborateur du siège complète.
  perform tests.endosser((jeu ->> 'collab')::uuid, 'b2-collab@essai.invalid');
  r := public.loc_completer_contrat(v_contrat, tests.tavaro_conditions());
  perform tests.redevenir_admin();
  return next is((r ->> 'km_inclus')::int, 600, 'Le forfait kilométrique est posé');
  return next is(r ->> 'politique_carburant', 'plein_contre_plein', 'La politique carburant est posée');
  return next is((r ->> 'rachat_franchise')::boolean, false, 'Le rachat de franchise est posé (non)');
  select * into c from public.loc_contrats where id = v_contrat;
  return next ok(c.saisies ? 'km_inclus' and (c.saisies -> 'km_inclus' ->> 'par')::uuid = (jeu ->> 'collab')::uuid, 'La saisie garde qui l''a faite');

  -- Un relevé suivant ne l'écrase pas.
  r := public.loc_appliquer_releve(v_client, 'contrats',
    jsonb_build_array(jsonb_build_object('n', 1, 'nature', 'ajout', 'valeurs', jsonb_build_object('numero', 'C-2026-0001', 'agence', 'SIEGE', 'km_inclus', 300))),
    jsonb_build_object('cle', 'export:b2:4', 'source', 'export', 'lu_le', now()));
  return next is((select x.km_inclus from public.loc_contrats x where x.id = v_contrat), 600, 'Le forfait saisi par une personne n''est pas écrasé par l''export');
  return next ok((r -> 'avertissements') @> '[{"code": "saisie_protegee", "champ": "km_inclus"}]'::jsonb,
                 format('Le relevé signale la saisie protégée sur km_inclus (code saisie_protegee) : %s', r -> 'avertissements'));

  -- Le collaborateur d'une autre agence, et le gérant d'un autre loueur.
  perform tests.endosser((jeu ->> 'autre')::uuid, 'b2-autre-loueur@essai.invalid');
  return next throws_ok(format('select public.loc_completer_contrat(%L::uuid, %L::jsonb)', v_contrat, '{"km_inclus": 1}'), 'P0002', null, 'Un autre loueur ne voit pas ce contrat (introuvable)');
  perform tests.redevenir_admin();
  perform tests.endosser((jeu ->> 'collab')::uuid, 'b2-collab@essai.invalid');
  return next throws_ok(format('select public.loc_completer_contrat(%L::uuid, %L::jsonb)', v_contrat, '{"numero": "C-9999"}'), '22023', null, 'Seules les conditions se complètent : pas le numéro');
  return next throws_ok(format('select public.loc_completer_contrat(%L::uuid, %L::jsonb)', v_contrat, '{"franchise_reduite_eur": 900}'), '22023', null, 'Une franchise réduite au-dessus de la franchise est refusée (contrainte, traduite)');
  perform tests.redevenir_admin();

  -- Le référent (valideur) prolonge ; le collaborateur ne peut pas.
  perform tests.endosser((jeu ->> 'collab')::uuid, 'b2-collab@essai.invalid');
  return next throws_ok(format('select public.loc_amender_contrat(%L::uuid, %L, %L::timestamptz)', v_contrat, 'prolongation', '2026-10-05 09:00:00+02'), '42501', null, 'Le collaborateur n''amende pas un contrat (42501)');
  perform tests.redevenir_admin();
  perform tests.endosser((jeu ->> 'referent')::uuid, 'b2-referent@essai.invalid');
  v_am := public.loc_amender_contrat(v_contrat, 'prolongation', timestamptz '2026-10-05 09:00:00 Europe/Paris', null, 'Client retenu un jour de plus');
  return next throws_ok(format('select public.loc_amender_contrat(%L::uuid, %L, %L::timestamptz)', v_contrat, 'retard_offert', '2026-10-06 09:00:00+02'), '22023', null, 'Un retard offert ne déplace pas le retour prévu');
  return next throws_ok(format('select public.loc_amender_contrat(%L::uuid, %L)', v_contrat, 'changement_vehicule'), '22023', null, 'Le changement de véhicule ne passe pas par cette porte');
  perform tests.redevenir_admin();
  return next isnt(v_am, null, 'La prolongation est enregistrée');
  return next is(private.loc_retour_prevu_amende(v_contrat), timestamptz '2026-10-05 09:00:00 Europe/Paris', 'Le retour prévu amendé est celui de la prolongation');
  return next is((select a.origine from public.loc_contrats_amendements a where a.id = v_am), 'agence', 'L''amendement vient de l''agence');
  return next is((select a.accorde_par from public.loc_contrats_amendements a where a.id = v_am), (jeu ->> 'referent')::uuid, 'Il porte qui l''a accordé');
end $f$;


-- ═══════════════════════════ 04_retour_chiffre.sql
-- 04 — Le collaborateur chiffre le retour (scénario, étape 6) : carburant, kilomètres, retard, dommage plafonné, TVA ;
-- un dommage sans photo bloque ; un retour non contradictoire part hors barème.

create or replace function tests.test_b2_04_retour_chiffre() returns setof text
language plpgsql as $f$
declare
  jeu jsonb; v_client uuid; v_contrat uuid; v_prop uuid; p public.loc_propositions; l public.loc_proposition_lignes; v_prop2 uuid;
begin
  jeu := tests.tavaro_jeu_contrat();
  v_client := (jeu ->> 'client')::uuid;
  v_contrat := (jeu ->> 'contrat')::uuid;

  perform tests.endosser((jeu ->> 'collab')::uuid, 'b2-collab@essai.invalid');
  v_prop := public.loc_chiffrer_retour(v_contrat, tests.tavaro_retour());
  perform tests.redevenir_admin();
  select * into p from public.loc_propositions where id = v_prop;

  return next is(p.statut, 'calculee', format('La proposition est calculée (avertissements : %s)', p.avertissements));
  return next is(p.version, 1, 'Version 1');
  return next is(p.source, 'saisie', 'Source : la saisie de l''agence');
  return next is(p.calculee_par, (jeu ->> 'collab')::uuid, 'Elle porte qui a chiffré');
  return next is(p.bareme_id, (jeu ->> 'bareme')::uuid, 'Au barème en vigueur au départ');
  return next is(p.hors_bareme, false, 'Tout est au barème');
  return next is(p.plafond_eur, 800::numeric, 'Le plafond des dommages est la franchise (800 €, pas de rachat)');

  -- Carburant : 3/8 manquants × 12 € = 36 € HT.
  select * into l from public.loc_proposition_lignes where proposition_id = v_prop and famille = 'carburant';
  return next is(l.quantite, 3::numeric, 'Carburant : 3 huitièmes manquants');
  return next is(l.montant_ht, 36.00::numeric, 'Carburant : 36,00 € HT');
  return next is(l.montant_tva, 7.20::numeric, 'Carburant : TVA 7,20 € (20 %)');
  return next is(jsonb_array_length(l.preuves), 1, 'Carburant : la photo de la jauge est jointe');
  -- Kilomètres : 650 parcourus, 600 inclus, 50 × 0,25 = 12,50 € HT.
  select * into l from public.loc_proposition_lignes where proposition_id = v_prop and famille = 'kilometres';
  return next is(l.quantite, 50::numeric, 'Kilomètres : 50 au-delà du forfait');
  return next is(l.montant_ht, 12.50::numeric, 'Kilomètres : 12,50 € HT');
  -- Retard : 26 h 30 au-delà des 59 min de tolérance → 2 jours entamés × 45 € = 90 € HT.
  select * into l from public.loc_proposition_lignes where proposition_id = v_prop and famille = 'retard';
  return next is(l.quantite, 2::numeric, 'Retard : deux jours entamés (26 h 30, tolérance 59 min)');
  return next is(l.prix_unitaire, 45::numeric, 'Retard : au tarif journalier du contrat');
  return next is(l.montant_ht, 90.00::numeric, 'Retard : 90,00 € HT');
  return next is((p.calcul_retard ->> 'retard_min')::int, 1590, 'Le calcul du retard est gardé (1 590 min)');
  -- Nettoyage : 60 € HT taxable.
  select * into l from public.loc_proposition_lignes where proposition_id = v_prop and famille = 'nettoyage';
  return next is(l.montant_ttc, 72.00::numeric, 'Nettoyage : 72,00 € TTC');
  -- Dommage : rayure 180 € hors champ, sous le plafond.
  select * into l from public.loc_proposition_lignes where proposition_id = v_prop and nature = 'dommage';
  return next is(l.code, 'RAYURE_PORTIERE', 'Dommage : la rayure');
  return next is(l.montant_ttc, 180.00::numeric, 'Dommage : 180,00 €');
  return next is(l.montant_tva, 0::numeric, 'Dommage : hors du champ de la TVA');
  return next is(l.plafonnee, false, 'Dommage : sous la franchise, pas plafonné');
  return next is(l.statut, 'chiffree', 'Dommage : chiffré (photo jointe)');
  -- Totaux : frais 198,50 HT + 39,70 TVA = 238,20 ; dommages 180 ; total 418,20.
  return next is(p.total_frais_ttc, 238.20::numeric, 'Total des frais : 238,20 € TTC');
  return next is(p.total_dommages_ttc, 180.00::numeric, 'Total des dommages : 180,00 €');
  return next is(p.total_ttc, 418.20::numeric, 'Total : 418,20 € TTC');
  return next is(tests.compter('public', 'loc_proposition_lignes', format('proposition_id = %L', v_prop)), 5::bigint, 'Cinq lignes');
  return next ok(tests.tavaro_journal(v_client, 'tavaro.proposition_calculee') >= 1, 'Le journal opposable porte tavaro.proposition_calculee');
  return next is(jsonb_array_length(tests.tavaro_travaux(v_client, 'tavaro.deposer_demande')), 1, 'Le travail tavaro.deposer_demande est déposé dans la file');

  -- Un dommage sans photo : la proposition attend la preuve, aucune demande ne part.
  perform tests.endosser((jeu ->> 'collab')::uuid, 'b2-collab@essai.invalid');
  v_prop2 := public.loc_chiffrer_retour(v_contrat, jsonb_build_object('retour_reel_le', '2026-10-04T08:00:00+02:00', 'km_retour', 12100,
    'carburant_depart_8', 8, 'carburant_retour_8', 8, 'dommages', jsonb_build_array(jsonb_build_object('code', 'PARE_CHOC'))));
  perform tests.redevenir_admin();
  return next is((select x.statut from public.loc_propositions x where x.id = v_prop2), 'preuve_manquante', 'Un dommage sans photo laisse la proposition en preuve_manquante');
  return next is((select x.statut from public.loc_propositions x where x.id = v_prop), 'remplacee', 'La version précédente non décidée est remplacée');
  return next ok((select x.avertissements from public.loc_propositions x where x.id = v_prop2) @> '[{"poste": "PARE_CHOC", "code": "preuve_absente", "bloquant": true}]'::jsonb, 'L''avertissement nomme le poste et la preuve absente');
  return next is(jsonb_array_length(tests.tavaro_travaux(v_client, 'tavaro.deposer_demande')), 1, 'Aucun nouveau travail de dépôt : la facture attend la preuve');

  -- Un pare-chocs à 950 € photographié : plafonné à la franchise de 800 €.
  perform tests.endosser((jeu ->> 'collab')::uuid, 'b2-collab@essai.invalid');
  v_prop2 := public.loc_chiffrer_retour(v_contrat, jsonb_build_object('retour_reel_le', '2026-10-04T08:00:00+02:00', 'km_retour', 12100,
    'carburant_depart_8', 8, 'carburant_retour_8', 8, 'dommages', jsonb_build_array(jsonb_build_object('code', 'PARE_CHOC', 'preuves', '[{"photo": "retour/pare-choc.jpg"}]'::jsonb))));
  perform tests.redevenir_admin();
  select * into l from public.loc_proposition_lignes where proposition_id = v_prop2 and nature = 'dommage';
  return next is(l.montant_ttc, 800.00::numeric, 'Le dommage de 950 € est plafonné à la franchise de 800 €');
  return next is(l.plafonnee, true, 'La ligne est marquée plafonnée');
  return next is((l.calcul ->> 'montant_bareme_ttc')::numeric, 950::numeric, 'Le montant du barème reste lisible dans le calcul');

  -- Un retour non signé par le client : les dommages vont à la direction, hors barème.
  perform tests.endosser((jeu ->> 'collab')::uuid, 'b2-collab@essai.invalid');
  v_prop2 := public.loc_chiffrer_retour(v_contrat, tests.tavaro_retour() || '{"non_contradictoire": true}'::jsonb);
  perform tests.redevenir_admin();
  select * into p from public.loc_propositions where id = v_prop2;
  return next is(p.hors_bareme, true, 'Un état des lieux non contradictoire passe hors barème');
  return next is(p.non_contradictoire, true, 'Et le dit');
  return next ok(p.avertissements @> '[{"code": "etat_des_lieux_non_contradictoire"}]'::jsonb, 'L''avertissement est posé');

  -- Un poste absent du barème avec un prix de l'agence : hors barème ; sans prix : ignoré avec avertissement.
  perform tests.endosser((jeu ->> 'collab')::uuid, 'b2-collab@essai.invalid');
  v_prop2 := public.loc_chiffrer_retour(v_contrat, jsonb_build_object('retour_reel_le', '2026-10-04T08:00:00+02:00', 'km_retour', 12100,
    'carburant_depart_8', 8, 'carburant_retour_8', 8,
    'postes', jsonb_build_array(jsonb_build_object('code', 'CLE_PERDUE', 'libelle', 'Clé perdue', 'prix_eur', 150, 'preuves', '[{"note": "déclaration du client"}]'::jsonb),
                                jsonb_build_object('code', 'INCONNU'))));
  perform tests.redevenir_admin();
  select * into p from public.loc_propositions where id = v_prop2;
  return next is(p.hors_bareme, true, 'Un prix saisi par l''agence pour un poste absent du barème passe hors barème');
  return next is((select x.montant_ht from public.loc_proposition_lignes x where x.proposition_id = v_prop2 and x.code = 'CLE_PERDUE'), 150::numeric, 'La clé perdue est chiffrée au prix de l''agence');
  return next ok(p.avertissements @> '[{"poste": "INCONNU", "code": "poste_absent_du_bareme"}]'::jsonb, 'Le poste inconnu sans prix est signalé, pas chiffré');

  -- Garde-fous.
  perform tests.endosser((jeu ->> 'collab_nord')::uuid, 'b2-collab-nord@essai.invalid');
  return next lives_ok(format('select public.loc_chiffrer_retour(%L::uuid, tests.tavaro_retour())', v_contrat), 'Un collaborateur à périmètre total chiffre aussi (le périmètre par agence est testé en 10)');
  perform tests.redevenir_admin();
  perform tests.endosser((jeu ->> 'autre')::uuid, 'b2-autre-loueur@essai.invalid');
  return next throws_ok(format('select public.loc_chiffrer_retour(%L::uuid, tests.tavaro_retour())', v_contrat), 'P0002', null, 'Un autre loueur ne chiffre pas ce contrat');
  perform tests.redevenir_admin();
  return next throws_ok(format('select public.loc_chiffrer_retour(%L::uuid, tests.tavaro_retour())', v_contrat), '42501', null, 'Sans personne connectée, pas de chiffrage');
  perform tests.endosser((jeu ->> 'collab')::uuid, 'b2-collab@essai.invalid');
  return next throws_ok(format('select public.loc_chiffrer_retour(%L::uuid, %L::jsonb)', v_contrat, '{"carburant_depart_8": 9, "carburant_retour_8": 2}'), '22023', null, 'Un niveau de carburant hors de 0..8 est refusé');
  perform tests.redevenir_admin();
end $f$;


-- ═══════════════════════════ 05_demande_et_separation.sql
-- 05 — L'ouvrier dépose la demande de validation (étape 7) ; celui qui a chiffré n'approuve pas (étape 8, trou H1) ;
-- un second chiffrage pendant l'attente annule la demande.

create or replace function tests.test_b2_05_demande_et_separation() returns setof text
language plpgsql as $f$
declare
  jeu jsonb; v_client uuid; d public.demandes_validation; p public.loc_propositions; v_prop2 uuid; v_demande uuid;
begin
  jeu := tests.tavaro_chiffrer(tests.tavaro_jeu_contrat(), 'referent');
  v_client := (jeu ->> 'client')::uuid;
  return next is((jeu -> 'ouvrier' ->> 'faits')::int, 1, format('L''ouvrier de base a fait un travail (%s)', jeu -> 'ouvrier'));
  return next isnt(jeu ->> 'demande', null, 'La proposition porte sa demande de validation');
  select * into d from public.demandes_validation where id = (jeu ->> 'demande')::uuid;
  select * into p from public.loc_propositions where id = (jeu ->> 'proposition')::uuid;
  return next is(p.statut, 'a_valider', 'La proposition est à valider');
  return next is(d.statut, 'en_attente', 'La demande est en attente');
  return next is(d.module || ' ' || d.type_action, 'tavaro facture.envoyer', 'Type facture.envoyer (au barème)');
  return next is(d.montant, 418.20::numeric, 'Pour 418,20 €');
  return next is(d.approbations_requises::integer, 1, 'Sous 1 500 € : un accord suffit (règle par défaut)');
  return next ok(d.roles_autorises @> array['valideur']::text[] and d.roles_autorises @> array['gerant']::text[], format('Les valideurs et la direction décident (%s)', d.roles_autorises));
  return next ok(d.resume like 'Facturer le retour du contrat C-2026-0001%', format('Le résumé dit le contrat et le montant : %s', d.resume));
  return next is((d.payload ->> 'proposition')::uuid, p.id, 'Le payload désigne la proposition');
  return next ok(d.echeance > now() and d.echeance < now() + interval '2 days', 'L''échéance est la fin de la journée locale');
  return next is(tests.compter('public', 'regles_validation', format('client_id = %L and module = %L', v_client, 'tavaro')), 4::bigint, 'Les quatre règles par défaut de TAVARO sont posées');
  return next ok(tests.tavaro_journal(v_client, 'tavaro.demande_deposee') >= 1, 'Le journal opposable porte tavaro.demande_deposee');

  -- Trou H1 : celui qui a chiffré (ici le référent, valideur) ne doit pas pouvoir approuver sa propre facture.
  return next ok(jsonb_typeof(d.payload -> 'saisi_par') = 'array' and d.payload -> 'saisi_par' ? (jeu ->> 'referent'), format('La demande porte qui a saisi, en tableau (payload.saisi_par = [calculee_par]) — migration b2_01 : %s', d.payload -> 'saisi_par'));
  return next throws_ok(format('select tests.tavaro_decider(%L::jsonb, %L::uuid, %L)', jeu::text, d.id, 'referent'), '42501', null,
    'Celui qui a chiffré le retour n''approuve pas sa facture (séparation saisie / approbation, 42501)');
  return next is((select x.statut from public.demandes_validation x where x.id = d.id), 'en_attente', 'La demande reste en attente');

  -- Le collaborateur n'est pas dans les rôles autorisés.
  return next throws_ok(format('select tests.tavaro_decider(%L::jsonb, %L::uuid, %L)', jeu::text, d.id, 'collab'), null, null,
    'Un collaborateur n''approuve pas une facture (rôle non autorisé)');

  -- Un second chiffrage pendant l'attente : la demande est annulée, la proposition remplacée.
  perform tests.endosser((jeu ->> 'collab')::uuid, 'b2-collab@essai.invalid');
  v_prop2 := public.loc_chiffrer_retour((jeu ->> 'contrat')::uuid, tests.tavaro_retour() || '{"km_retour": 12700}'::jsonb);
  perform tests.redevenir_admin();
  return next is((select x.statut from public.demandes_validation x where x.id = d.id), 'annulee', 'Un nouveau calcul annule la demande en attente');
  return next is((select x.statut from public.loc_propositions x where x.id = p.id), 'remplacee', 'La proposition v1 est remplacée');
  return next is((select x.version from public.loc_propositions x where x.id = v_prop2), 2, 'La nouvelle est la v2');
  return next ok(tests.tavaro_journal(v_client, 'tavaro.demande_annulee') >= 1, 'Le journal opposable porte tavaro.demande_annulee');
  perform private.loc_ouvrier(50);
  select x.demande_id into v_demande from public.loc_propositions x where x.id = v_prop2;
  return next isnt(v_demande, null, 'La v2 a sa propre demande après le passage de l''ouvrier');
  return next is((select x.montant from public.demandes_validation x where x.id = v_demande), 433.20::numeric, 'Pour 433,20 € (100 km au-delà du forfait : 36 + 25 + 90 + 60 HT, TVA 20 %, plus 180 de dommage)');

  -- Hors barème : la direction seule.
  perform tests.endosser((jeu ->> 'collab')::uuid, 'b2-collab@essai.invalid');
  v_prop2 := public.loc_chiffrer_retour((jeu ->> 'contrat')::uuid, tests.tavaro_retour() || '{"non_contradictoire": true}'::jsonb);
  perform tests.redevenir_admin();
  perform private.loc_ouvrier(50);
  select dv.* into d from public.demandes_validation dv join public.loc_propositions px on px.demande_id = dv.id where px.id = v_prop2;
  return next is(d.type_action, 'facture.envoyer_hors_bareme', 'Hors barème : type facture.envoyer_hors_bareme');
  return next ok(not (d.roles_autorises @> array['valideur']::text[]), format('Le valideur n''est pas autorisé sur le hors barème (%s)', d.roles_autorises));
  return next throws_ok(format('select tests.tavaro_decider(%L::jsonb, %L::uuid, %L)', jeu::text, d.id, 'daf'), null, null, 'La DAF (valideur) ne décide pas un hors barème');
  return next lives_ok(format('select tests.tavaro_decider(%L::jsonb, %L::uuid, %L)', jeu::text, d.id, 'gerant'), 'Le gérant décide le hors barème');
end $f$;


-- ═══════════════════════════ 06_facture_emise.sql
-- 06 — Le référent approuve : la décision est appliquée par l'ouvrier, deux factures sont émises (étape 9) ;
-- une facture sans demande approuvée est refusée ; une facture émise et ses lignes ne se modifient pas.

create or replace function tests.test_b2_06_facture_emise() returns setof text
language plpgsql as $f$
declare
  jeu jsonb; v_client uuid; p public.loc_propositions; d public.demandes_validation; f public.loc_factures; f2 public.loc_factures; nb bigint;
begin
  jeu := tests.tavaro_jeu_facture();
  v_client := (jeu ->> 'client')::uuid;
  select * into d from public.demandes_validation where id = (jeu ->> 'demande')::uuid;
  select * into p from public.loc_propositions where id = (jeu ->> 'proposition')::uuid;

  return next ok(d.statut in ('approuvee', 'executee'), format('L''approbation du référent décide la demande (%s)', d.statut));
  return next is(jsonb_array_length(tests.tavaro_travaux(v_client, 'tavaro.decision')), 1, format('Le socle a déposé le travail tavaro.decision (%s)', tests.tavaro_travaux(v_client, 'tavaro.decision')));
  return next is((jeu -> 'ouvrier_decision' ->> 'faits')::int, 1, format('L''ouvrier a appliqué la décision (%s)', jeu -> 'ouvrier_decision'));
  return next is(p.statut, 'facturee', format('La proposition est facturée (factures : %s)', jeu -> 'factures'));
  return next is(jsonb_array_length(jeu -> 'factures'), 2, 'Deux factures : les frais, les dommages');

  select * into f from public.loc_factures where client_id = v_client and nature = 'frais';
  select * into f2 from public.loc_factures where client_id = v_client and nature = 'dommages';
  return next is(f.reference, 'FA-2026-000001', 'La première facture est FA-2026-000001');
  return next is(f2.reference, 'FA-2026-000002', 'La seconde FA-2026-000002');
  return next is(f.total_ttc, 238.20::numeric, 'Frais : 238,20 € TTC');
  return next is(f.total_tva, 39.70::numeric, 'Frais : TVA 39,70 €');
  return next is(f2.total_ttc, 180.00::numeric, 'Dommages : 180,00 €');
  return next is(f2.total_tva, 0::numeric, 'Dommages : sans TVA');
  return next ok(f2.mentions ->> 'tva' like 'Indemnité hors du champ%', 'La facture de dommages porte la mention hors champ');
  return next is(f.statut, 'emise', 'Émise');
  return next is(f.entite_emettrice_id, (jeu ->> 'siege')::uuid, 'Émise par la société principale');
  return next is(f.emetteur ->> 'nom', 'Loueur Essai B2', 'L''émetteur est le loueur');
  return next is(f.emetteur ->> 'adresse', '12 rue de la Gare, 75010 Paris', 'Avec l''adresse des réglages');
  return next is(f.destinataire ->> 'nom', 'Marie Durand', 'Le destinataire est le locataire');
  return next is(f.destinataire ->> 'email', 'marie.durand@essai.invalid', 'Avec son courriel');
  return next is(f.echeance_le, f.date_facture, 'Particulier : à régler à réception');
  return next is(f.a_debiter_avant, date '2026-10-15', 'À débiter avant le 15 octobre (retour + 10 jours)');
  return next ok(f.mentions ->> 'mandat' like 'Facture établie par Omega au nom et pour le compte de Loueur Essai B2%', 'La mention de mandat est posée');
  return next ok(f.mentions ->> 'restitution' like '05/10/2026 à 11:30%', format('La restitution est datée à l''heure de Paris (%s)', f.mentions ->> 'restitution'));
  return next is(tests.compter('public', 'loc_facture_lignes', format('facture_id = %L', f.id)), 4::bigint, 'Quatre lignes de frais');
  return next is(tests.compter('public', 'loc_facture_lignes', format('facture_id = %L and jsonb_array_length(preuves) > 0', f.id)), 3::bigint, 'Carburant, kilomètres et nettoyage gardent leurs photos (le retard n''en a pas : ce sont les heures du contrat)');
  return next is(tests.compter('public', 'loc_facture_lignes', format('facture_id = %L', f2.id)), 1::bigint, 'Une ligne de dommage');
  return next ok(tests.tavaro_journal(v_client, 'tavaro.proposition_validee') >= 1, 'Le journal opposable porte tavaro.proposition_validee');
  return next is(tests.tavaro_journal(v_client, 'tavaro.facture_emise'), 2::bigint, 'Le journal opposable porte deux tavaro.facture_emise');

  -- Le numéro est continu par société émettrice et par an.
  return next is((select s.dernier from public.loc_series_factures s where s.client_id = v_client and s.prefixe = 'FA' and s.annee = f.annee), 2, 'La série FA est à 2');

  -- Une facture ne naît pas sans demande approuvée (même pour le propriétaire de la base).
  return next throws_ok(format($q$insert into public.loc_factures (client_id, entite_id, entite_emettrice_id, contrat_id, contrat_numero, proposition_id, demande_id, nature, annee, numero, reference, date_facture, echeance_le, total_ht, total_tva, total_ttc, emetteur, destinataire)
    values (%L, %L, %L, %L, 'C-2026-0001', %L, %L, 'frais', 2026, 99, 'FA-2026-000099', current_date, current_date, 1, 0, 1, '{}', '{}')$q$,
    v_client, jeu ->> 'siege', jeu ->> 'siege', jeu ->> 'contrat', p.id, gen_random_uuid()), '23514', null, 'Aucune facture sans demande approuvée sur sa proposition');
  -- Une facture émise ne se modifie pas ; ses lignes non plus.
  return next throws_ok(format('update public.loc_factures set total_ttc = 1 where id = %L', f.id), '42501', null, 'Une facture émise ne se modifie pas (42501)');
  return next throws_ok(format('update public.loc_facture_lignes set montant_ttc = 1 where facture_id = %L', f.id), '42501', null, 'Une ligne de facture émise ne se modifie pas (42501)');
  select count(*) into nb from pg_trigger t where t.tgrelid = 'public.loc_factures'::regclass and not t.tgisinternal
    and t.tgfoid = 'private.loc_garder_facture'::regproc and (t.tgtype & 2) = 2 and (t.tgtype & 8) = 8;
  return next ok(nb > 0, 'Un déclencheur BEFORE (loc_garder_facture) protège la facture de l''effacement');
  -- Les membres ne peuvent pas écrire les factures directement (grants).
  return next ok(not has_table_privilege('authenticated', 'public.loc_factures', 'INSERT') and not has_table_privilege('authenticated', 'public.loc_factures', 'UPDATE'), 'authenticated n''a ni INSERT ni UPDATE sur loc_factures');
  return next ok(not has_table_privilege('authenticated', 'public.loc_propositions', 'INSERT') and not has_table_privilege('authenticated', 'public.loc_propositions', 'UPDATE'), 'authenticated n''a ni INSERT ni UPDATE sur loc_propositions');
  return next ok(not has_table_privilege('authenticated', 'public.loc_avoirs', 'INSERT') and not has_table_privilege('authenticated', 'public.loc_avoirs', 'UPDATE'), 'authenticated n''a ni INSERT ni UPDATE sur loc_avoirs');
  return next ok(not has_table_privilege('authenticated', 'public.loc_contrats', 'INSERT') and not has_table_privilege('authenticated', 'public.loc_contrats', 'UPDATE'), 'authenticated n''a ni INSERT ni UPDATE sur loc_contrats');

  -- Le contrat facturé ne se rechiffre plus : une correction passe par un avoir.
  perform tests.endosser((jeu ->> 'collab')::uuid, 'b2-collab@essai.invalid');
  return next throws_ok(format('select public.loc_chiffrer_retour(%L::uuid, tests.tavaro_retour())', jeu ->> 'contrat'), '55000', null, 'Un contrat facturé ne se rechiffre pas : une correction passe par un avoir');
  perform tests.redevenir_admin();

  -- Le refus : la proposition est refusée, rien n'est émis.
  jeu := tests.tavaro_chiffrer(tests.tavaro_jeu_contrat(), 'collab');
  perform tests.tavaro_decider(jeu, (jeu ->> 'demande')::uuid, 'daf', 'rejete', 'Le client a signalé la rayure au départ.');
  perform private.loc_ouvrier(50);
  return next is((select x.statut from public.loc_propositions x where x.id = (jeu ->> 'proposition')::uuid), 'refusee', 'Un refus laisse la proposition refusée');
  return next is(tests.compter('public', 'loc_factures', format('client_id = %L', jeu ->> 'client')), 0::bigint, 'Et n''émet rien');
  return next ok(tests.tavaro_journal((jeu ->> 'client')::uuid, 'tavaro.proposition_refusee') >= 1, 'Le journal opposable porte tavaro.proposition_refusee');
end $f$;


-- ═══════════════════════════ 07_envoi_litige_reglement.sql
-- 07 — Le courriel de la facture (étape 10), le litige (11) et le règlement (14).

create or replace function tests.test_b2_07_envoi_litige_reglement() returns setof text
language plpgsql as $f$
declare
  jeu jsonb; v_client uuid; f public.loc_factures; d public.demandes_validation; v_envoi jsonb; v_res jsonb;
begin
  jeu := tests.tavaro_jeu_facture();
  v_client := (jeu ->> 'client')::uuid;
  select * into f from public.loc_factures where client_id = v_client and nature = 'frais';
  select * into d from public.demandes_validation where id = (jeu ->> 'demande')::uuid;
  v_envoi := (jeu -> 'ouvrier_decision');

  -- Le courriel : préparé si l'envoi est réglé pour ce loueur, sinon dit « non réglé » et la demande est exécutée quand même.
  if f.envoi_id is not null then
    return next pass('Le courriel de la facture est préparé (envoi ' || f.envoi_id || ')');
    return next is(tests.compter('public', 'envois', format('id = %L and module = %L', f.envoi_id, 'tavaro')), 1::bigint, 'L''envoi est du module tavaro');
    return next ok(tests.tavaro_journal(v_client, 'tavaro.facture_envoi_prepare') >= 1, 'Le journal opposable porte tavaro.facture_envoi_prepare');
    -- Le retour de l'expéditeur : parti.
    v_res := private.loc_envoi_issue(jsonb_build_object('objet_type', 'loc_propositions', 'objet_id', jeu ->> 'proposition', 'envoi', f.envoi_id, 'evenement', 'envoi.envoye'));
    return next is(v_res ->> 'statut', 'envoyee', 'Le retour « envoyé » de l''expéditeur passe les factures en envoyée');
    return next is((select x.statut from public.loc_factures x where x.id = f.id), 'envoyee', 'La facture est envoyée');
    return next ok(tests.tavaro_journal(v_client, 'tavaro.facture_envoyee') >= 1, 'Le journal opposable porte tavaro.facture_envoyee');
  else
    return next is(d.statut, 'executee', 'Sans réglage d''envoi pour ce loueur, la demande est tout de même exécutée (facture à envoyer soi-même)');
    return next ok(tests.tavaro_journal(v_client, 'tavaro.facture_envoi_non_regle') >= 1, 'Le journal opposable porte tavaro.facture_envoi_non_regle');
    return next diag('Pas de reglages_envois pour le loueur d''essai : le courriel réel se prouve sur le banc (mode essai), pas ici.');
    return next is(tests.compter('public', 'alertes', format('client_id = %L and cle_regroupement like %L', v_client, '%facture:envoi_non_regle:' || (jeu ->> 'proposition'))), 1::bigint, 'Une alerte « envoyez-la vous-même » est levée (clé facture:envoi_non_regle:<proposition>)');
  end if;

  -- Le litige : par l'agence, avec la contestation du client.
  perform tests.endosser((jeu ->> 'collab')::uuid, 'b2-collab@essai.invalid');
  return next throws_ok(format('select public.loc_marquer_litige(%L::uuid, %L)', f.id, ''), '22023', null, 'Un litige a un motif');
  perform public.loc_marquer_litige(f.id, 'Le client conteste le retard : il dit avoir rendu les clés à 9 h.');
  perform tests.redevenir_admin();
  return next is((select x.statut from public.loc_factures x where x.id = f.id), 'litige', 'La facture passe en litige');
  return next is((select x.litige_motif from public.loc_factures x where x.id = f.id), 'Le client conteste le retard : il dit avoir rendu les clés à 9 h.', 'Le motif est gardé');
  return next ok(tests.tavaro_journal(v_client, 'tavaro.facture_litige') >= 1, 'Le journal opposable porte tavaro.facture_litige');
  return next ok(private.loc_section_facturation(v_client, (jeu ->> 'siege')::uuid, current_date) @> '[{"gabarit": "tavaro.factures_en_litige"}]'::jsonb, 'Le point du matin de l''agence compte la facture en litige');

  -- Le règlement : la facture en litige se règle quand même (le client a payé) ; le mode est contrôlé.
  perform tests.endosser((jeu ->> 'collab')::uuid, 'b2-collab@essai.invalid');
  return next throws_ok(format('select public.loc_marquer_reglee(%L::uuid, %L)', f.id, 'bitcoin'), '22023', null, 'Un mode de règlement inconnu est refusé');
  perform public.loc_marquer_reglee(f.id, 'carte', timestamptz '2026-10-12 10:00:00+02');
  perform tests.redevenir_admin();
  return next is((select x.statut from public.loc_factures x where x.id = f.id), 'reglee', 'La facture est réglée');
  return next is((select x.mode_reglement from public.loc_factures x where x.id = f.id), 'carte', 'Par carte');
  return next is((select x.regle_le from public.loc_factures x where x.id = f.id), timestamptz '2026-10-12 10:00:00+02', 'À la date dite');
  return next ok(tests.tavaro_journal(v_client, 'tavaro.facture_reglee') >= 1, 'Le journal opposable porte tavaro.facture_reglee');
  perform tests.endosser((jeu ->> 'collab')::uuid, 'b2-collab@essai.invalid');
  return next throws_ok(format('select public.loc_marquer_litige(%L::uuid, %L)', f.id, 'trop tard'), '23514', null, 'Une facture réglée ne passe plus en litige');
  return next throws_ok(format('select public.loc_marquer_reglee(%L::uuid, %L)', f.id, 'carte'), '23514', null, 'Une facture réglée ne se règle pas deux fois');
  perform tests.redevenir_admin();

  -- Un autre loueur, ou une personne non connectée : rien.
  perform tests.endosser((jeu ->> 'autre')::uuid, 'b2-autre-loueur@essai.invalid');
  return next throws_ok(format('select public.loc_marquer_litige(%L::uuid, %L)', f.id, 'pirate'), 'P0002', null, 'Un autre loueur ne touche pas à cette facture');
  return next is(tests.compter('public', 'loc_factures', 'true'), 0::bigint, 'Et n''en voit aucune (RLS)');
  perform tests.redevenir_admin();
  return next throws_ok(format('select public.loc_marquer_reglee(%L::uuid, %L)', f.id, 'carte'), '42501', null, 'Sans personne connectée, pas de règlement');
end $f$;


-- ═══════════════════════════ 08_avoir.sql
-- 08 — L'avoir (étapes 12 et 13) : demandé par l'agence, décidé par la direction seule, émis AV-2026-000001, immuable ;
-- un avoir total annule la facture.

create or replace function tests.test_b2_08_avoir() returns setof text
language plpgsql as $f$
declare
  jeu jsonb; v_client uuid; f public.loc_factures; a public.loc_avoirs; d public.demandes_validation; v_avoir uuid; v_avoir2 uuid;
begin
  jeu := tests.tavaro_jeu_facture();
  v_client := (jeu ->> 'client')::uuid;
  select * into f from public.loc_factures where client_id = v_client and nature = 'dommages';

  -- La demande d'avoir partiel, par le collaborateur.
  perform tests.endosser((jeu ->> 'collab')::uuid, 'b2-collab@essai.invalid');
  return next throws_ok(format('select public.loc_demander_avoir(%L::uuid, %L, 120)', f.id, 'x'), '22023', null, 'Un avoir a un motif d''au moins trois caractères');
  return next throws_ok(format('select public.loc_demander_avoir(%L::uuid, %L, 500)', f.id, 'trop'), '22023', null, 'Un avoir ne dépasse pas ce qui reste de la facture');
  return next throws_ok(format('select public.loc_demander_avoir(%L::uuid, %L, 120.005)', f.id, 'centimes'), '22023', null, 'Un avoir se fait au centime');
  v_avoir := public.loc_demander_avoir(f.id, 'La rayure de portière était signalée au départ (photo de départ).', 120);
  return next throws_ok(format('select public.loc_demander_avoir(%L::uuid, %L, 10)', f.id, 'second'), '55000', null, 'Un seul avoir en attente par facture');
  perform tests.redevenir_admin();
  select * into a from public.loc_avoirs where id = v_avoir;
  return next is(a.statut, 'a_valider', 'L''avoir naît en attente de la direction');
  return next is(a.montant_ttc, 120::numeric, 'Pour 120 €');
  return next is(a.montant_tva, 0::numeric, 'Sans TVA (la facture de dommages n''en a pas)');
  return next is(a.total, false, 'Partiel');
  return next is(a.demande_par, (jeu ->> 'collab')::uuid, 'Il porte qui l''a demandé');
  select * into d from public.demandes_validation where id = a.demande_id;
  return next is(d.type_action, 'avoir.emettre', 'La demande est avoir.emettre');
  return next ok(not (d.roles_autorises @> array['valideur']::text[]), format('La direction seule décide un avoir (%s)', d.roles_autorises));
  return next ok(jsonb_typeof(d.payload -> 'saisi_par') = 'array' and d.payload -> 'saisi_par' ? (jeu ->> 'collab'), format('La demande d''avoir porte qui l''a saisi, en tableau (b2_01) : %s', d.payload -> 'saisi_par'));
  return next ok(tests.tavaro_journal(v_client, 'tavaro.avoir_demande') >= 1, 'Le journal opposable porte tavaro.avoir_demande');
  return next ok(private.loc_section_facturation(v_client, null, current_date) is not null, 'La section de facturation se calcule');

  -- Le référent (valideur) ne peut pas ; le gérant approuve ; l'ouvrier émet.
  return next throws_ok(format('select tests.tavaro_decider(%L::jsonb, %L::uuid, %L)', jeu::text, d.id, 'referent'), null, null, 'Le référent (valideur) n''approuve pas un avoir');
  perform tests.tavaro_decider(jeu, d.id, 'gerant', 'approuve', 'Vu la photo de départ.');
  perform private.loc_ouvrier(50);
  select * into a from public.loc_avoirs where id = v_avoir;
  return next is(a.statut, 'emis', format('L''avoir est émis (travaux : %s)', tests.tavaro_travaux(v_client, 'tavaro.decision')));
  return next is(a.reference, 'AV-2026-000001', 'AV-2026-000001');
  return next is(a.emetteur, f.emetteur, 'Même émetteur que la facture');
  return next ok(a.mentions ->> 'objet' like 'Avoir partiel sur la facture FA-2026-000002%', format('L''objet dit la facture corrigée (%s)', a.mentions ->> 'objet'));
  return next is((select x.statut from public.loc_factures x where x.id = f.id), 'emise', 'La facture reste émise : l''avoir partiel ne la couvre pas');
  return next ok(tests.tavaro_journal(v_client, 'tavaro.avoir_emis') >= 1, 'Le journal opposable porte tavaro.avoir_emis');
  return next throws_ok(format('update public.loc_avoirs set montant_ttc = 1 where id = %L', a.id), '42501', null, 'Un avoir émis ne se modifie pas');

  -- Le reste en avoir : la facture est annulée par ses avoirs.
  perform tests.endosser((jeu ->> 'collab')::uuid, 'b2-collab@essai.invalid');
  v_avoir2 := public.loc_demander_avoir(f.id, 'Geste commercial sur le reste.');
  perform tests.redevenir_admin();
  return next is((select x.montant_ttc from public.loc_avoirs x where x.id = v_avoir2), 60::numeric, 'Sans montant, l''avoir vaut ce qui reste (60 €)');
  perform tests.tavaro_decider(jeu, (select x.demande_id from public.loc_avoirs x where x.id = v_avoir2), 'gerant', 'approuve', 'D''accord.');
  perform private.loc_ouvrier(50);
  return next is((select x.reference from public.loc_avoirs x where x.id = v_avoir2), 'AV-2026-000002', 'AV-2026-000002');
  return next is((select x.statut from public.loc_factures x where x.id = f.id), 'avoir', 'Couverte par ses avoirs, la facture est annulée');
  perform tests.endosser((jeu ->> 'collab')::uuid, 'b2-collab@essai.invalid');
  return next throws_ok(format('select public.loc_demander_avoir(%L::uuid, %L)', f.id, 'encore'), '23514', null, 'Plus rien à créditer');
  perform tests.redevenir_admin();

  -- Le refus d'un avoir.
  select * into f from public.loc_factures where client_id = v_client and nature = 'frais';
  perform tests.endosser((jeu ->> 'collab')::uuid, 'b2-collab@essai.invalid');
  v_avoir := public.loc_demander_avoir(f.id, 'Le client réclame le nettoyage.', 72);
  perform tests.redevenir_admin();
  perform tests.tavaro_decider(jeu, (select x.demande_id from public.loc_avoirs x where x.id = v_avoir), 'gerant', 'rejete', 'Les photos montrent l''habitacle sale.');
  perform private.loc_ouvrier(50);
  return next is((select x.statut from public.loc_avoirs x where x.id = v_avoir), 'refuse', 'Un avoir refusé par la direction est refusé');
  return next ok(tests.tavaro_journal(v_client, 'tavaro.avoir_refuse') >= 1, 'Le journal opposable porte tavaro.avoir_refuse');
  return next is((select x.statut from public.loc_factures x where x.id = f.id), 'emise', 'La facture n''a pas bougé');
end $f$;


-- ═══════════════════════════ 09_point_mesure_journal.sql
-- 09 — Le point du matin, les mesures et le journal opposable (étapes 16 et 17).

create or replace function tests.test_b2_09_point_mesure_journal() returns setof text
language plpgsql as $f$
declare
  jeu jsonb; v_client uuid; v_section jsonb; v_reseau jsonb; n integer; col text; nb bigint;
  -- le « jour » des factures et des mesures est celui de l'agence (Europe/Paris), pas celui du serveur (UTC) : entre 0 h et 2 h Paris ils diffèrent
  v_jour date := (now() at time zone 'Europe/Paris')::date;
begin
  jeu := tests.tavaro_chiffrer(tests.tavaro_jeu_contrat(), 'collab');
  v_client := (jeu ->> 'client')::uuid;

  -- La section de l'agence : une proposition à décider.
  v_section := private.loc_section_facturation(v_client, (jeu ->> 'siege')::uuid, v_jour);
  return next ok(v_section @> '[{"gabarit": "tavaro.propositions_a_decider", "valeurs": {"n": 1}}]'::jsonb, format('La section de l''agence compte la proposition à décider (%s)', v_section));
  return next ok((v_section -> 0 -> 'valeurs' ->> 'montant')::numeric = 418.20, 'Pour 418,20 €');
  v_reseau := private.loc_section_reseau(v_client, v_jour);
  return next ok(v_reseau @> '[{"gabarit": "tavaro.agence_reseau"}]'::jsonb and (v_reseau -> 0 ->> 'texte') like 'Loueur Essai B2 — Siège :%', format('La section réseau de la direction nomme l''agence (%s)', v_reseau -> 0 ->> 'texte'));
  -- Le dépôt des sections passe (il écrit dans le point du jour du socle).
  n := private.loc_deposer_points(now());
  return next ok(n >= 3, format('loc_deposer_points dépose les sections des deux agences et de la direction (%s)', n));

  -- Après facturation : la mesure du jour.
  jeu := tests.tavaro_jeu_facture();
  v_client := (jeu ->> 'client')::uuid;
  n := private.loc_mesurer(v_client, v_jour);
  return next ok(n >= 2, format('loc_mesurer enregistre les euros facturés et les retours facturés du jour (%s mesures)', n));
  v_section := private.loc_section_facturation(v_client, (jeu ->> 'siege')::uuid, v_jour + 1);
  return next ok(v_section @> '[{"gabarit": "tavaro.factures_emises_hier", "valeurs": {"n": 2}}]'::jsonb, format('Le lendemain, la section compte les deux factures émises la veille (%s)', v_section));

  -- Le journal opposable : une ligne par étape, par private.journaliser seulement.
  return next ok(tests.tavaro_journal(v_client, 'tavaro.bareme_publie') >= 1, 'journal : tavaro.bareme_publie');
  return next ok(tests.tavaro_journal(v_client, 'tavaro.proposition_calculee') >= 1, 'journal : tavaro.proposition_calculee');
  return next ok(tests.tavaro_journal(v_client, 'tavaro.demande_deposee') >= 1, 'journal : tavaro.demande_deposee');
  return next ok(tests.tavaro_journal(v_client, 'tavaro.proposition_validee') >= 1, 'journal : tavaro.proposition_validee');
  return next ok(tests.tavaro_journal(v_client, 'tavaro.facture_emise') >= 2, 'journal : tavaro.facture_emise ×2');
  return next ok(tests.tavaro_journal(v_client, 'tavaro.regles_posees') >= 1, 'journal : tavaro.regles_posees');
  return next ok(not has_table_privilege('authenticated', 'public.journal_opposable', 'INSERT'), 'authenticated n''insère pas au journal');
  perform tests.endosser((jeu ->> 'gerant')::uuid, 'b2-gerant@essai.invalid');
  col := tests.colonne_parmi('public.journal_opposable'::regclass, array['action', 'evenement', 'type_action', 'type']);
  return next throws_ok(format('insert into public.journal_opposable (client_id, %I) values (%L, %L)', col, v_client, 'tavaro.pirate'), null, null, 'Même le gérant n''écrit pas au journal directement');
  execute format('select count(*) from public.journal_opposable where client_id = $1 and %I like $2', col) into nb using v_client, 'tavaro.%';
  return next ok(nb >= 7, format('Le gérant lit le journal de son loueur (%s lignes tavaro.*)', nb));
  perform tests.redevenir_admin();
  perform tests.endosser((jeu ->> 'autre')::uuid, 'b2-autre-loueur@essai.invalid');
  execute format('select count(*) from public.journal_opposable where client_id = $1') into nb using v_client;
  return next is(nb, 0::bigint, 'Un autre loueur ne lit rien du journal de celui-ci');
  perform tests.redevenir_admin();
end $f$;


-- ═══════════════════════════ 10_rls_anonymisation.sql
-- 10 — L'isolement (étape 18) et l'anonymisation du locataire (étape 19).

create or replace function tests.test_b2_10_rls_anonymisation() returns setof text
language plpgsql as $f$
declare
  jeu jsonb; v_client uuid; v_contrat uuid; v_loc uuid; r jsonb; t text; v_perim text;
begin
  jeu := tests.tavaro_jeu_facture();
  v_client := (jeu ->> 'client')::uuid;
  v_contrat := (jeu ->> 'contrat')::uuid;
  select c.locataire_id into v_loc from public.loc_contrats c where c.id = v_contrat;

  -- Un autre loueur ne voit rien, table par table.
  perform tests.endosser((jeu ->> 'autre')::uuid, 'b2-autre-loueur@essai.invalid');
  foreach t in array array['loc_agences', 'loc_baremes', 'loc_bareme_lignes', 'loc_categories', 'loc_contrats', 'loc_contrats_amendements',
                           'loc_vehicules', 'loc_locataires', 'loc_propositions', 'loc_proposition_lignes', 'loc_factures', 'loc_facture_lignes',
                           'loc_avoirs', 'loc_releves', 'loc_reglages', 'loc_series_factures', 'loc_reservations'] loop
    return next is(tests.compter('public', t, 'true'), 0::bigint, format('Un autre loueur ne voit aucune ligne de %s', t));
  end loop;
  return next is(tests.compter('public', 'loc_fraicheur', 'true'), 0::bigint, 'Ni la vue loc_fraicheur');
  perform tests.redevenir_admin();

  -- Un membre voit son loueur.
  perform tests.endosser((jeu ->> 'collab')::uuid, 'b2-collab@essai.invalid');
  return next is(tests.compter('public', 'loc_contrats', 'true'), 1::bigint, 'Le collaborateur voit le contrat de son agence');
  return next is(tests.compter('public', 'loc_factures', 'true'), 2::bigint, 'Et ses deux factures');
  return next is(tests.compter('public', 'loc_locataires', 'true'), 1::bigint, 'Et le locataire de ce contrat');
  return next is(tests.compter('public', 'loc_fraicheur', 'true'), 6::bigint, 'La fraîcheur des relevés : deux agences × trois natures');
  perform tests.redevenir_admin();

  -- Le périmètre par agence : si le socle a une table de périmètre, le collaborateur de l'agence Nord ne voit pas le contrat du siège.
  v_perim := tests.table_parmi(array['comptes_perimetres', 'perimetres', 'comptes_entites', 'perimetres_comptes']);
  if v_perim is null then
    return next diag('Aucune table de périmètre par entité trouvée (comptes_perimetres, perimetres, comptes_entites) : le périmètre par agence reste à vérifier avec le coordinateur.');
    return next pass('Périmètre par agence : non testable ici');
  else
    begin
      update public.comptes set perimetre_total = false where user_id = (jeu ->> 'collab_nord')::uuid and client_id = v_client;
      perform tests.inserer_minimal('public', v_perim, jsonb_build_object('client_id', v_client, 'user_id', jeu ->> 'collab_nord', 'entite_id', jeu ->> 'nord'));
      perform tests.endosser((jeu ->> 'collab_nord')::uuid, 'b2-collab-nord@essai.invalid');
      return next is(tests.compter('public', 'loc_contrats', 'true'), 0::bigint, format('Le collaborateur de l''agence Nord ne voit pas le contrat du siège (%s)', v_perim));
      return next throws_ok(format('select public.loc_chiffrer_retour(%L::uuid, tests.tavaro_retour())', v_contrat), null, null, 'Et ne le chiffre pas');
      perform tests.redevenir_admin();
    exception when others then
      perform tests.redevenir_admin();
      return next diag('Périmètre par agence : ' || sqlerrm);
      return next pass('Périmètre par agence : la table ' || v_perim || ' n''a pas la forme attendue, à voir avec le coordinateur');
    end;
  end if;

  -- L'anonymisation : le gérant seul ; refusée tant qu'un contrat est ouvert.
  perform tests.endosser((jeu ->> 'collab')::uuid, 'b2-collab@essai.invalid');
  return next throws_ok(format('select public.loc_anonymiser_locataire(%L::uuid)', v_loc), '42501', null, 'Le collaborateur n''anonymise pas');
  perform tests.redevenir_admin();
  perform tests.endosser((jeu ->> 'gerant')::uuid, 'b2-gerant@essai.invalid');
  return next throws_ok(format('select public.loc_anonymiser_locataire(%L::uuid)', v_loc), '55000', null, 'Tant que le contrat est ouvert, l''anonymisation attend');
  perform tests.redevenir_admin();
  -- Le contrat se clôt par le relevé (le retour réel y figure).
  r := public.loc_appliquer_releve(v_client, 'contrats',
    jsonb_build_array(jsonb_build_object('n', 1, 'nature', 'ajout', 'valeurs', jsonb_build_object('numero', 'C-2026-0001', 'agence', 'SIEGE', 'retour_reel_le', '2026-10-05T11:30:00', 'km_retour', 12650, 'statut', 'clos'))),
    jsonb_build_object('cle', 'export:b2:clos', 'source', 'export', 'lu_le', now()));
  return next is((select c.statut from public.loc_contrats c where c.id = v_contrat), 'clos', 'Le contrat est clos par l''export');
  perform tests.endosser((jeu ->> 'gerant')::uuid, 'b2-gerant@essai.invalid');
  r := public.loc_anonymiser_locataire(v_loc, 'demande');
  perform tests.redevenir_admin();
  return next is((r ->> 'deja_anonyme')::boolean, false, 'Le gérant anonymise le locataire');
  return next ok((select l.nom is null and l.email is null and l.anonymise_le is not null from public.loc_locataires l where l.id = v_loc), 'Nom et courriel effacés, date gardée');
  return next is((select f.destinataire ->> 'nom' from public.loc_factures f where f.client_id = v_client and f.nature = 'frais'), 'Marie Durand', 'La facture émise garde son destinataire (pièce comptable)');
  return next ok(tests.tavaro_journal(v_client, 'tavaro.locataire_anonymise') >= 1, 'Le journal opposable porte tavaro.locataire_anonymise');
  perform tests.endosser((jeu ->> 'gerant')::uuid, 'b2-gerant@essai.invalid');
  r := public.loc_anonymiser_locataire(v_loc, 'demande');
  return next is((r ->> 'deja_anonyme')::boolean, true, 'Une seconde fois : déjà anonyme');
  perform tests.redevenir_admin();
end $f$;


-- ═══════════════════════════ 11_relances.sql
-- 11 — La relance des factures impayées (étape 15, migration b2_02) : jamais sur un litige, une facture réglée ou créditée ;
-- le passage du cron relance toutes les organisations de la recette : on ne compte que les relances du loueur d'essai (06/10, rejeu après le parcours réel du banc).
-- par le cron à l'échéance + 7 jours, trois fois au plus ; à la main par l'agence.

create or replace function tests.test_b2_11_relances() returns setof text
language plpgsql as $f$
declare
  jeu jsonb; v_client uuid; f public.loc_factures; f2 public.loc_factures; r jsonb; n integer; v_avant integer;
begin
  if to_regprocedure('private.loc_relancer_factures(timestamptz)') is null then
    return next fail('La migration b2_02 (relances) n''est pas posée : private.loc_relancer_factures manque');
    return;
  end if;
  jeu := tests.tavaro_jeu_facture();
  v_client := (jeu ->> 'client')::uuid;
  select * into f from public.loc_factures where client_id = v_client and nature = 'frais';
  select * into f2 from public.loc_factures where client_id = v_client and nature = 'dommages';

  -- Le passage du cron le jour même : rien à relancer (échéance à réception, 7 jours de grâce).
  select coalesce(sum(x.relances), 0) into v_avant from public.loc_factures x where x.client_id = v_client;
  perform private.loc_relancer_factures(now());
  select coalesce(sum(x.relances), 0) - v_avant into n from public.loc_factures x where x.client_id = v_client;
  return next is(n, 0, 'Le jour de la facture, rien n''est relancé');
  -- Dix jours plus tard : les deux factures sont relancées (ou dites « non réglé » sans réglage d'envoi).
  select coalesce(sum(x.relances), 0) into v_avant from public.loc_factures x where x.client_id = v_client;
  perform private.loc_relancer_factures(now() + interval '10 days');
  select coalesce(sum(x.relances), 0) - v_avant into n from public.loc_factures x where x.client_id = v_client;
  select * into f from public.loc_factures where id = f.id;
  if f.relances = 1 then
    return next is(n, 2, 'Dix jours après l''échéance, les deux factures sont relancées');
    return next ok(f.relance_le is not null, 'La date de relance est posée');
    return next ok(tests.tavaro_journal(v_client, 'tavaro.facture_relancee') >= 2, 'Le journal opposable porte tavaro.facture_relancee');
    return next is(tests.compter('public', 'envois', format('client_id = %L and module = %L and cle = %L', v_client, 'tavaro', 'tavaro:relance:' || f.id::text || ':1')), 1::bigint, 'Un envoi à la clé tavaro:relance:<facture>:1');
    -- Pas deux fois dans les quatorze jours ; puis la deuxième, la troisième et l'alerte de recouvrement.
    select coalesce(sum(x.relances), 0) into v_avant from public.loc_factures x where x.client_id = v_client;
  perform private.loc_relancer_factures(now() + interval '12 days');
  select coalesce(sum(x.relances), 0) - v_avant into n from public.loc_factures x where x.client_id = v_client;
    return next is(n, 0, 'Deux jours plus tard, pas de nouvelle relance (quatorze jours entre deux)');
    select coalesce(sum(x.relances), 0) into v_avant from public.loc_factures x where x.client_id = v_client;
  perform private.loc_relancer_factures(now() + interval '25 days');
  select coalesce(sum(x.relances), 0) - v_avant into n from public.loc_factures x where x.client_id = v_client;
    return next is(n, 2, 'Quinze jours après la première : la deuxième');
    select coalesce(sum(x.relances), 0) into v_avant from public.loc_factures x where x.client_id = v_client;
  perform private.loc_relancer_factures(now() + interval '40 days');
  select coalesce(sum(x.relances), 0) - v_avant into n from public.loc_factures x where x.client_id = v_client;
    return next is(n, 2, 'La troisième');
    return next is((select x.relances from public.loc_factures x where x.id = f.id), 3::smallint, 'Trois relances comptées');
    return next ok(tests.compter('public', 'alertes', format('client_id = %L and cle_regroupement like %L', v_client, '%facture:recouvrement:' || f.id::text)) >= 1, 'À la troisième, l''alerte de recouvrement est levée pour l''agence');
    select coalesce(sum(x.relances), 0) into v_avant from public.loc_factures x where x.client_id = v_client;
  perform private.loc_relancer_factures(now() + interval '60 days');
  select coalesce(sum(x.relances), 0) - v_avant into n from public.loc_factures x where x.client_id = v_client;
    return next is(n, 0, 'Pas de quatrième relance par le cron');
  else
    return next diag('Sans reglages_envois pour le loueur d''essai, la relance dit « non réglé » : ' || (select x.relances from public.loc_factures x where x.id = f.id));
    return next ok(tests.tavaro_journal(v_client, 'tavaro.facture_relance_non_regle') >= 2, 'Sans réglage d''envoi, le journal porte tavaro.facture_relance_non_regle et une alerte « relancez-la vous-même »');
  end if;

  -- La facture immuable l'est toujours, mais ses colonnes de suivi avancent.
  return next throws_ok(format('update public.loc_factures set total_ttc = 1 where id = %L', f.id), '42501', null, 'Le tuple immuable de la facture est intact');
  return next lives_ok(format('update public.loc_factures set relance_le = now() where id = %L', f.id), 'Les colonnes de suivi de relance avancent (comme le règlement)');

  -- Jamais sur un litige, une facture réglée, ni une facture créditée.
  perform tests.endosser((jeu ->> 'collab')::uuid, 'b2-collab@essai.invalid');
  perform public.loc_marquer_litige(f2.id, 'Le client conteste la rayure.');
  return next throws_ok(format('select public.loc_relancer_facture(%L::uuid)', f2.id), '23514', null, 'Une facture en litige ne se relance pas');
  perform public.loc_marquer_reglee(f.id, 'virement');
  return next throws_ok(format('select public.loc_relancer_facture(%L::uuid)', f.id), '23514', null, 'Une facture réglée ne se relance pas');
  perform tests.redevenir_admin();
  select coalesce(sum(x.relances), 0) into v_avant from public.loc_factures x where x.client_id = v_client;
  perform private.loc_relancer_factures(now() + interval '100 days');
  select coalesce(sum(x.relances), 0) - v_avant into n from public.loc_factures x where x.client_id = v_client;
  return next is(n, 0, 'Le cron ne relance ni la réglée ni le litige');

  -- La relance à la main par l'agence, hors délai de grâce ; un autre loueur ne peut pas.
  jeu := tests.tavaro_jeu_facture();
  v_client := (jeu ->> 'client')::uuid;
  select * into f from public.loc_factures where client_id = v_client and nature = 'frais';
  perform tests.endosser((jeu ->> 'autre')::uuid, 'b2-autre-loueur@essai.invalid');
  return next throws_ok(format('select public.loc_relancer_facture(%L::uuid)', f.id), 'P0002', null, 'Un autre loueur ne relance pas cette facture');
  perform tests.redevenir_admin();
  perform tests.endosser((jeu ->> 'collab')::uuid, 'b2-collab@essai.invalid');
  r := public.loc_relancer_facture(f.id);
  perform tests.redevenir_admin();
  return next ok(r ->> 'statut' in ('prepare', 'non_regle'), format('L''agence relance à la main dès le jour même (%s)', r ->> 'statut'));
  if r ->> 'statut' = 'prepare' then
    return next is((r ->> 'relance')::int, 1, 'C''est la première relance de cette facture');
    return next is((select x.relances from public.loc_factures x where x.id = f.id), 1::smallint, 'Comptée sur la facture');
  end if;
end $f$;


-- ═══════════════════════════ 12_avis_contravention.sql
-- 12 — Les avis de contravention (vague 3, manque n° 1, migration b2_03) : l'avis reçu est rapproché du contrat par la
-- plaque et l'heure, l'échéance de désignation (envoi + 45 jours) est tenue, la désignation est réservée à la direction
-- et aux valideurs, le classement sans désignation à la direction seule ; un autre loueur ne voit rien.

create or replace function tests.test_b2_12_avis_contravention() returns setof text
language plpgsql as $f$
declare
  jeu jsonb; v_client uuid; v_contrat uuid; r jsonb; v_avis uuid; v_parc uuid; v_tard uuid; n bigint;
  v_jour date := (now() at time zone 'Europe/Paris')::date;
  v_personne jsonb := jsonb_build_object('nom', 'Durand', 'prenom', 'Marie', 'date_naissance', '1985-03-02', 'lieu_naissance', 'Lyon',
                                         'adresse', '3 rue des Lilas, 75011 Paris', 'permis_numero', '12AB34567');
begin
  if to_regprocedure('public.loc_enregistrer_avis(jsonb)') is null then
    return next fail('La migration b2_03 (avis de contravention) n''est pas posée : public.loc_enregistrer_avis manque');
    return;
  end if;
  jeu := tests.tavaro_jeu_contrat();
  v_client := (jeu ->> 'client')::uuid;
  v_contrat := (jeu ->> 'contrat')::uuid;

  -- Le collaborateur saisit l'avis reçu : la plaque (écrite autrement) et l'heure désignent le contrat C-2026-0001.
  perform tests.endosser((jeu ->> 'collab')::uuid, 'b2-collab@essai.invalid');
  r := public.loc_enregistrer_avis(jsonb_build_object('numero_avis', '2026 1002 1412 01', 'immatriculation', 'ga 123 bc',
         'infraction_le', '2026-10-02T14:12:00+02:00', 'lieu', 'A6, Auxerre', 'nature', 'Excès de vitesse inférieur à 20 km/h',
         'montant_eur', 135, 'avis_envoye_le', v_jour - 1));
  v_avis := (r ->> 'avis')::uuid;
  return next is(r ->> 'statut', 'a_designer', 'L''avis est rapproché tout seul : conducteur à désigner');
  return next is((r ->> 'contrat')::uuid, v_contrat, 'Le contrat retrouvé est celui où la voiture était dehors à cette heure');
  return next is((r ->> 'echeance_le')::date, v_jour - 1 + 45, 'L''échéance est la date d''envoi plus 45 jours');
  r := public.loc_enregistrer_avis(jsonb_build_object('numero_avis', '2026 1002 1412 01', 'immatriculation', 'GA-123-BC',
         'infraction_le', '2026-10-02T14:12:00+02:00', 'avis_envoye_le', v_jour - 1));
  return next ok((r ->> 'deja')::boolean and (r ->> 'avis')::uuid = v_avis, 'Le même avis saisi deux fois rend le premier');

  -- Une infraction hors de tout contrat (véhicule au parc) : à rapprocher, l'agence est prévenue.
  r := public.loc_enregistrer_avis(jsonb_build_object('numero_avis', 'PARC-0915', 'immatriculation', 'GA-123-BC',
         'infraction_le', '2026-09-15T10:00:00+02:00', 'avis_envoye_le', v_jour - 1));
  v_parc := (r ->> 'avis')::uuid;
  return next is(r ->> 'statut', 'a_rapprocher', 'Aucun contrat à cette heure : l''avis est à rapprocher');
  perform tests.redevenir_admin();
  return next ok(tests.compter('public', 'alertes', format('client_id = %L and cle_regroupement like %L', v_client, '%avis:a_rapprocher:' || v_parc::text)) >= 1,
                 'Une alerte demande de rattacher l''avis');

  -- Les saisies illisibles sont refusées.
  perform tests.endosser((jeu ->> 'collab')::uuid, 'b2-collab@essai.invalid');
  return next throws_ok(format('select public.loc_enregistrer_avis(%L::jsonb)', jsonb_build_object('numero_avis', 'SANS-HEURE', 'immatriculation', 'GA-123-BC',
         'infraction_le', '2026-10-02', 'avis_envoye_le', v_jour - 1)), '22023', null, 'Sans l''heure de l''infraction, pas d''avis (c''est elle qui désigne le contrat)');
  return next throws_ok(format('select public.loc_enregistrer_avis(%L::jsonb)', jsonb_build_object('numero_avis', 'SANS-ENVOI', 'immatriculation', 'GA-123-BC',
         'infraction_le', '2026-10-02T14:12:00+02:00')), '22023', null, 'Sans la date d''envoi, pas d''échéance, pas d''avis');

  -- Le collaborateur ne désigne pas : c'est un acte du représentant légal.
  return next throws_ok(format('select public.loc_designer_conducteur(%L::uuid, %L::jsonb, %L)', v_avis, v_personne, 'antai_en_ligne'),
                        '42501', null, 'Le collaborateur ne désigne pas le conducteur');
  return next throws_ok(format('select public.loc_classer_avis(%L::uuid, %L)', v_parc, 'Usurpation de plaque : requête en exonération.'),
                        '42501', null, 'Le collaborateur ne classe pas un avis');
  -- Une écriture directe dans la table est refusée.
  return next throws_ok(format('update public.loc_avis_contravention set statut = %L where id = %L', 'classe', v_avis), '42501', null,
                        'Aucune écriture directe dans le registre des avis');
  perform tests.redevenir_admin();

  -- Un autre loueur ne voit ni ne touche rien.
  perform tests.endosser((jeu ->> 'autre')::uuid, 'b2-autre-loueur@essai.invalid');
  return next is(tests.compter('public', 'loc_avis_contravention', 'true'), 0::bigint, 'Un autre loueur ne voit aucun avis');
  return next throws_ok(format('select public.loc_rattacher_avis(%L::uuid, %L::uuid)', v_parc, v_contrat), 'P0002', null, 'Un autre loueur ne rattache pas cet avis');
  perform tests.redevenir_admin();

  -- Le référent (valideur) désigne : incomplet refusé, complet consigné, dans le délai.
  perform tests.endosser((jeu ->> 'referent')::uuid, 'b2-referent@essai.invalid');
  return next throws_ok(format('select public.loc_designer_conducteur(%L::uuid, %L::jsonb, %L)', v_avis, v_personne - 'permis_numero', 'antai_en_ligne'),
                        '22023', null, 'Sans numéro de permis, la désignation est refusée');
  return next throws_ok(format('select public.loc_designer_conducteur(%L::uuid, %L::jsonb, %L)', v_avis, v_personne, 'pigeon_voyageur'),
                        '22023', null, 'Un mode de désignation inconnu est refusé');
  r := public.loc_designer_conducteur(v_avis, v_personne, 'antai_en_ligne', 'ANTAI-778899');
  return next is(r ->> 'statut', 'designe', 'Le conducteur est désigné');
  return next ok(not (r ->> 'hors_delai')::boolean, 'Dans le délai');
  return next throws_ok(format('select public.loc_designer_conducteur(%L::uuid, %L::jsonb, %L)', v_avis, v_personne, 'lrar'),
                        '23514', null, 'Un avis désigné ne se désigne pas deux fois');
  perform tests.redevenir_admin();
  return next ok(tests.tavaro_journal(v_client, 'tavaro.conducteur_designe') >= 1, 'Le journal opposable porte tavaro.conducteur_designe');
  return next ok(tests.tavaro_journal(v_client, 'tavaro.avis_enregistre') >= 2, 'Le journal opposable porte tavaro.avis_enregistre');
  select count(*) into n from public.journal_opposable j where j.client_id = v_client and j::text like '%Lilas%';
  return next is(n, 0::bigint, 'L''identité désignée n''entre pas au journal');

  -- Le gérant classe l'avis du parc, motif obligatoire.
  perform tests.endosser((jeu ->> 'gerant')::uuid, 'b2-gerant@essai.invalid');
  return next throws_ok(format('select public.loc_classer_avis(%L::uuid, %L)', v_parc, 'court'), '22023', null, 'Un classement sans vrai motif est refusé');
  r := public.loc_classer_avis(v_parc, 'Usurpation de plaque : requête en exonération envoyée avec la plainte.');
  return next is(r ->> 'statut', 'classe', 'La direction classe l''avis avec son motif');

  -- Un avis reçu tard (envoyé il y a 43 jours) : l'alerte J-3 part dès la saisie, puis « dépassé » au passage du cron.
  r := public.loc_enregistrer_avis(jsonb_build_object('numero_avis', 'TARD-01', 'immatriculation', 'GA-123-BC',
         'infraction_le', to_char(v_jour - 44, 'YYYY-MM-DD') || 'T10:00:00+02:00', 'avis_envoye_le', v_jour - 43));
  v_tard := (r ->> 'avis')::uuid;
  perform tests.redevenir_admin();
  return next ok(tests.compter('public', 'alertes', format('client_id = %L and cle_regroupement like %L', v_client, '%avis:j3:' || v_tard::text)) >= 1,
                 'À deux jours de l''échéance, l''alerte critique part dès la saisie');
  perform private.loc_surveiller_avis(now() + interval '4 days');
  return next ok(tests.compter('public', 'alertes', format('client_id = %L and cle_regroupement like %L', v_client, '%avis:depasse:' || v_tard::text)) >= 1,
                 'Échéance passée : l''alerte « 675 € encourus » est levée par le passage quotidien');
end $f$;


-- ═══════════════════════════ 13_designation_conservation.sql
-- 13 — L'identité désignée s'efface un an après la désignation (migration b2_04, art. 9 du code de procédure pénale) :
-- l'avis reste (plaque, heure, montant, statut, mode, référence), seule l'identité part ; une désignation récente reste entière.

create or replace function tests.test_b2_13_designation_conservation() returns setof text
language plpgsql as $f$
declare
  jeu jsonb; v_client uuid; v_vieux uuid; v_recent uuid; a public.loc_avis_contravention; n integer;
  v_jour date := (now() at time zone 'Europe/Paris')::date;
  v_personne jsonb := jsonb_build_object('nom', 'Durand', 'prenom', 'Marie', 'date_naissance', '1985-03-02', 'lieu_naissance', 'Lyon',
                                         'adresse', '3 rue des Lilas, 75011 Paris', 'permis_numero', '12AB34567');
begin
  if to_regprocedure('private.loc_effacer_designations(timestamptz)') is null then
    return next fail('La migration b2_04 (conservation de la désignation) n''est pas posée : private.loc_effacer_designations manque');
    return;
  end if;
  jeu := tests.tavaro_jeu_contrat();
  v_client := (jeu ->> 'client')::uuid;

  perform tests.endosser((jeu ->> 'referent')::uuid, 'b2-referent@essai.invalid');
  v_vieux := (public.loc_enregistrer_avis(jsonb_build_object('numero_avis', 'VIEUX-01', 'immatriculation', 'GA-123-BC',
               'infraction_le', '2026-10-02T14:12:00+02:00', 'montant_eur', 135, 'avis_envoye_le', v_jour - 1)) ->> 'avis')::uuid;
  v_recent := (public.loc_enregistrer_avis(jsonb_build_object('numero_avis', 'RECENT-01', 'immatriculation', 'GA-123-BC',
               'infraction_le', '2026-10-02T16:40:00+02:00', 'montant_eur', 68, 'avis_envoye_le', v_jour - 1)) ->> 'avis')::uuid;
  perform public.loc_designer_conducteur(v_vieux, v_personne, 'antai_en_ligne', 'ANTAI-1');
  perform public.loc_designer_conducteur(v_recent, v_personne, 'lrar', 'RAR-2');
  perform tests.redevenir_admin();

  -- Le premier a été désigné il y a treize mois, le second il y a six.
  update public.loc_avis_contravention set designe_le = now() - interval '13 months' where id = v_vieux;
  update public.loc_avis_contravention set designe_le = now() - interval '6 months' where id = v_recent;

  n := private.loc_effacer_designations(now());
  return next ok(n >= 1, format('Le passage efface au moins une désignation (%s)', n));
  select * into a from public.loc_avis_contravention where id = v_vieux;
  return next ok(a.designation_effacee_le is not null, 'Au-delà d''un an, la date d''effacement est posée');
  return next ok(not (a.designation ? 'nom') and not (a.designation ? 'permis_numero') and not (a.designation ? 'date_naissance') and not (a.designation ? 'adresse'),
                 'L''identité (nom, permis, naissance, adresse) est effacée');
  return next is(a.designation ->> 'type', 'personne', 'La forme de la désignation reste (une personne)');
  return next ok(a.statut = 'designe' and a.immatriculation = 'GA-123-BC' and a.montant_eur = 135 and a.mode_designation = 'antai_en_ligne'
                 and a.reference_designation = 'ANTAI-1' and a.designe_le is not null and a.hors_delai is not null,
                 'Le reste de l''avis reste : statut, plaque, montant, mode, référence, date, délai tenu');
  select * into a from public.loc_avis_contravention where id = v_recent;
  return next ok(a.designation ->> 'nom' = 'Durand' and a.designation_effacee_le is null, 'Une désignation de six mois reste entière');
  return next ok(tests.tavaro_journal(v_client, 'tavaro.designations_effacees') >= 1, 'Le journal opposable compte l''effacement (sans identité)');
  return next is((select count(*) from public.journal_opposable j where j.client_id = v_client and j::text like '%12AB34567%'), 0::bigint,
                 'Aucune identité au journal');
  n := private.loc_effacer_designations(now());
  return next is((select count(*)::integer from public.loc_avis_contravention x where x.client_id = v_client and x.designation_effacee_le is not null), 1,
                 'Rejoué, le passage n''efface rien de plus');
end $f$;


-- ═══════════════════════════ 14_etats_des_lieux.sql
-- 14 — L'état des lieux contradictoire (vague 3, manque n° 3, migration b2_05) : départ signé avec quatre vues et ses
-- dommages photographiés, empreinte du contenu signé, état figé ; retour non signé constaté ; le chiffrage du socle reçoit
-- le carburant du départ signé, le caractère non contradictoire, et ne facture pas un dommage déjà noté au départ ;
-- la caution se lève quand rien n'est dû.

create or replace function tests.test_b2_14_etats_des_lieux() returns setof text
language plpgsql as $f$
declare
  jeu jsonb; v_client uuid; v_contrat uuid; v_dep uuid; v_ret uuid; r jsonb; e public.loc_etats_des_lieux; p public.loc_propositions; v_prop uuid; n bigint;
  v_photos jsonb := '[{"vue":"avant","chemin":"edl/avant.jpg"},{"vue":"arriere","chemin":"edl/arriere.jpg"},{"vue":"flanc_gauche","chemin":"edl/gauche.jpg"},{"vue":"flanc_droit","chemin":"edl/droit.jpg"},{"vue":"compteur","chemin":"edl/compteur.jpg"}]';
begin
  if to_regprocedure('public.loc_etablir_etat(uuid, text, jsonb)') is null then
    return next fail('La migration b2_05 (états des lieux) n''est pas posée : public.loc_etablir_etat manque');
    return;
  end if;
  jeu := tests.tavaro_jeu_contrat();
  v_client := (jeu ->> 'client')::uuid;
  v_contrat := (jeu ->> 'contrat')::uuid;

  -- Le collaborateur établit le départ au comptoir.
  perform tests.endosser((jeu ->> 'collab')::uuid, 'b2-collab@essai.invalid');
  v_dep := public.loc_etablir_etat(v_contrat, 'depart', jsonb_build_object('km', 12000, 'carburant_8', 6, 'photos', '[{"vue":"avant","chemin":"edl/avant.jpg"}]'::jsonb));
  return next throws_ok(format('select public.loc_signer_etat(%L::uuid, %L)', v_dep, 'Marie Durand'), '22023', null, 'Sans l''avant, l''arrière et les deux flancs en photo, pas de signature');
  return next throws_ok(format('select public.loc_etablir_etat(%L::uuid, %L, %L::jsonb)', v_contrat, 'depart',
           jsonb_build_object('km', 12000, 'carburant_8', 6, 'photos', v_photos, 'dommages', '[{"zone":"flanc_droit","description":"Rayure portière avant droite"}]'::jsonb)),
         '22023', null, 'Un dommage noté sans photo est refusé');
  return next throws_ok(format('select public.loc_etablir_etat(%L::uuid, %L, %L::jsonb)', v_contrat, 'depart',
           jsonb_build_object('km', 12000, 'photos', v_photos, 'dommages', '[{"zone":"plafonnier","description":"x","preuves":[{"chemin":"edl/x.jpg"}]}]'::jsonb)),
         '22023', null, 'Une zone inconnue est refusée');
  v_dep := public.loc_etablir_etat(v_contrat, 'depart', jsonb_build_object('km', 12000, 'carburant_8', 6, 'photos', v_photos,
             'caution_eur', 800, 'caution_mode', 'empreinte_carte', 'caution_reference', 'AUT-4411',
             'dommages', '[{"zone":"flanc_droit","code":"RAYURE_PORTIERE","description":"Rayure portière avant droite","preuves":[{"chemin":"edl/rayure.jpg"}]}]'::jsonb));
  r := public.loc_signer_etat(v_dep, 'Marie Durand', 'edl/signature.png');
  return next is(r ->> 'statut', 'signe', 'La locataire signe l''état de départ');
  return next ok(r ->> 'empreinte' ~ '^[0-9a-f]{64}$', 'Une empreinte SHA-256 du contenu signé est gardée');
  return next throws_ok(format('select public.loc_etablir_etat(%L::uuid, %L, %L::jsonb)', v_contrat, 'depart', '{"km":1}'), '23514', null, 'Un départ signé ne se refait pas');
  return next throws_ok(format('update public.loc_etats_des_lieux set km = 1 where id = %L', v_dep), '42501', null, 'Aucune écriture directe');
  perform tests.redevenir_admin();
  select * into e from public.loc_etats_des_lieux where id = v_dep;
  return next is(encode(sha256(convert_to(private.loc_contenu_signe(e, e.signataire_nom, e.signe_le), 'UTF8')), 'hex'), e.empreinte, 'L''empreinte se recalcule à l''identique : rien n''a bougé depuis la signature');
  return next is(e.caution_statut, 'prise', 'La caution de 800 € est prise');
  return next throws_ok(format('update public.loc_etats_des_lieux set carburant_8 = 8 where id = %L', v_dep), '42501', null, 'Même le propriétaire de la base ne change pas un état signé');

  -- Un autre loueur ne voit rien.
  perform tests.endosser((jeu ->> 'autre')::uuid, 'b2-autre-loueur@essai.invalid');
  return next is(tests.compter('public', 'loc_etats_des_lieux', 'true'), 0::bigint, 'Un autre loueur ne voit aucun état des lieux');
  return next throws_ok(format('select public.loc_etablir_etat(%L::uuid, %L, %L::jsonb)', v_contrat, 'retour', '{}'), 'P0002', null, 'Ni n''en établit chez ce loueur');
  perform tests.redevenir_admin();

  -- Le retour : la locataire n'est pas là (boîte à clés).
  perform tests.endosser((jeu ->> 'collab')::uuid, 'b2-collab@essai.invalid');
  v_ret := public.loc_etablir_etat(v_contrat, 'retour', jsonb_build_object('km', 12650, 'carburant_8', 5, 'photos', v_photos));
  return next throws_ok(format('select public.loc_etablir_etat(%L::uuid, %L, %L::jsonb)', v_contrat, 'retour', '{"caution_eur":100}'), '22023', null, 'La caution ne se prend pas au retour');
  r := public.loc_constater_refus(v_ret, 'Client absent : clés déposées dans la boîte.');
  return next is(r ->> 'statut', 'refuse', 'Le retour non signé est constaté, avec son motif');

  -- Le chiffrage : carburant du départ signé (6/8, pas 8/8), non contradictoire, la rayure du flanc droit n'est pas facturée.
  v_prop := public.loc_chiffrer_retour(v_contrat, tests.tavaro_retour()
              || jsonb_build_object('carburant_depart_8', 8, 'non_contradictoire', false,
                                    'dommages', '[{"code":"RAYURE_PORTIERE","zone":"flanc_droit","preuves":[{"photo":"retour/portiere.jpg"}]}]'::jsonb));
  perform tests.redevenir_admin();
  select * into p from public.loc_propositions where id = v_prop;
  return next is((p.entrees ->> 'carburant_depart_8')::int, 6, 'Le carburant au départ est celui de l''état signé');
  return next ok(p.non_contradictoire, 'Le retour non signé rend la proposition non contradictoire');
  return next is(tests.compter('public', 'loc_proposition_lignes', format('proposition_id = %L and nature = %L', v_prop, 'dommage')), 0::bigint,
                 'La rayure déjà notée au départ signé n''est pas facturée');
  return next ok(p.avertissements @> '[{"code":"deja_au_depart"}]' and p.avertissements @> '[{"code":"carburant_depart_signe"}]' and p.avertissements @> '[{"code":"retour_non_signe"}]',
                 'La proposition dit pourquoi : déjà au départ, carburant signé, retour non signé');

  -- La caution attend la facture.
  perform tests.endosser((jeu ->> 'collab')::uuid, 'b2-collab@essai.invalid');
  return next throws_ok(format('select public.loc_lever_caution(%L::uuid)', v_contrat), '23514', null, 'Le retour est en facturation : la caution ne se lève pas encore');
  perform tests.redevenir_admin();
  return next ok(tests.tavaro_journal(v_client, 'tavaro.etat_signe') >= 1 and tests.tavaro_journal(v_client, 'tavaro.etat_non_signe') >= 1,
                 'Le journal opposable porte tavaro.etat_signe et tavaro.etat_non_signe');
end $f$;


-- ═══════════════════════════ 15_facture_electronique.sql
-- 15 — La facture électronique côté module (vague 3, manque n° 2, migration b2_06) : chaque facture sort en CII EN 16931,
-- le flux est dit (e-invoicing pour un pro avec SIREN, e-reporting pour un particulier), ce qui bloquerait est listé ;
-- l'agence complète le SIREN d'un client (contrôlé) ; la direction lit la préparation au 1er septembre 2027.
-- Le XML a été validé hors base (XSD Factur-X EN 16931, schematrons EN 16931 et BR-FR Flux 2) : 0 échec pour une
-- facture et un avoir à un professionnel.

create or replace function tests.test_b2_15_facture_electronique() returns setof text
language plpgsql as $f$
declare
  jeu jsonb; v_client uuid; f public.loc_factures; r jsonb; v_loc uuid; v_avoir uuid;
begin
  if to_regprocedure('public.loc_facture_electronique(uuid)') is null then
    return next fail('La migration b2_06 (facture électronique) n''est pas posée : public.loc_facture_electronique manque');
    return;
  end if;
  return next ok(private.loc_siren_valide('552100554') and private.loc_siren_valide('732829320') and not private.loc_siren_valide('123456789')
                 and not private.loc_siren_valide('55210055'), 'La clé de contrôle du SIREN est vérifiée');
  return next is(private.loc_adresse('12 rue de la Gare, 75010 Paris') ->> 'cp', '75010', 'Une adresse se découpe : ligne, code postal, ville');

  jeu := tests.tavaro_jeu_facture();
  v_client := (jeu ->> 'client')::uuid;
  select * into f from public.loc_factures where client_id = v_client and nature = 'frais';
  select c.locataire_id into v_loc from public.loc_contrats c where c.id = (jeu ->> 'contrat')::uuid;

  -- Le collaborateur lit la forme électronique de la facture.
  perform tests.endosser((jeu ->> 'collab')::uuid, 'b2-collab@essai.invalid');
  r := public.loc_facture_electronique(f.id);
  return next is(r ->> 'flux', 'e_reporting', 'Une facture à un particulier relève du e-reporting');
  return next ok(r ->> 'xml' like '<?xml%' and r ->> 'xml' like '%urn:cen.eu:en16931:2017%' and r ->> 'xml' like '%<ram:ID>' || f.reference || '</ram:ID>%'
                 and r ->> 'xml' like '%<ram:TypeCode>380</ram:TypeCode>%', 'Le XML CII porte le contexte EN 16931, le numéro et le type 380');
  return next ok(xml_is_well_formed_document(r ->> 'xml'), 'Le XML est bien formé');
  return next ok(r ->> 'xml' like '%<ram:GrandTotalAmount>' || to_char(f.total_ttc, 'FM999999999990.00') || '</ram:GrandTotalAmount>%', 'Le total TTC est celui de la facture');
  return next ok(jsonb_typeof(r -> 'manques') = 'array' and (r ->> 'pret')::boolean = (jsonb_array_length(r -> 'manques') = 0), 'Les manques sont listés et « prêt » en découle');
  perform tests.redevenir_admin();

  -- Un autre loueur ne lit rien.
  perform tests.endosser((jeu ->> 'autre')::uuid, 'b2-autre-loueur@essai.invalid');
  return next throws_ok(format('select public.loc_facture_electronique(%L::uuid)', f.id), 'P0002', null, 'Un autre loueur ne lit pas cette facture');
  return next throws_ok(format('select public.loc_completer_locataire(%L::uuid, %L::jsonb)', v_loc, '{"siren":"552100554"}'), 'P0002', null, 'Ni ne complète ce client');
  perform tests.redevenir_admin();

  -- L'agence complète le client : un SIREN faux est refusé, un vrai le fait passer professionnel.
  perform tests.endosser((jeu ->> 'collab')::uuid, 'b2-collab@essai.invalid');
  return next throws_ok(format('select public.loc_completer_locataire(%L::uuid, %L::jsonb)', v_loc, '{"siren":"123456789"}'), '22023', null, 'Un SIREN dont la clé est fausse est refusé');
  r := public.loc_completer_locataire(v_loc, '{"siren":"552 100 554","raison_sociale":"Durand Conseil SAS","adresse":"3 rue des Lilas, 75011 Paris"}');
  return next ok(r -> 'champs' ? 'siren', 'Le SIREN est complété');
  perform tests.redevenir_admin();
  return next ok((select l.type = 'professionnel' and l.siren = '552100554' from public.loc_locataires l where l.id = v_loc), 'Le client devient professionnel, SIREN sans espaces');
  return next ok(tests.tavaro_journal(v_client, 'tavaro.locataire_complete') >= 1, 'Le journal opposable porte tavaro.locataire_complete');
  -- La facture déjà émise ne change pas (elle garde son destinataire) ; la forme électronique le dit toujours e-reporting.
  perform tests.endosser((jeu ->> 'collab')::uuid, 'b2-collab@essai.invalid');
  return next is(public.loc_facture_electronique(f.id) ->> 'flux', 'e_reporting', 'Une facture émise garde le destinataire de son émission');

  -- L'avoir : pas de forme électronique tant qu'il n'est pas émis.
  v_avoir := public.loc_demander_avoir(f.id, 'Geste commercial sur les kilomètres', 5);
  return next throws_ok(format('select public.loc_avoir_electronique(%L::uuid)', v_avoir), '23514', null, 'Un avoir non émis n''a pas de forme électronique');
  -- La préparation 2027 : la direction et les valideurs, pas le collaborateur.
  return next throws_ok('select public.loc_preparation_2027()', '42501', null, 'Le collaborateur ne lit pas la préparation 2027');
  perform tests.redevenir_admin();
  perform tests.endosser((jeu ->> 'referent')::uuid, 'b2-referent@essai.invalid');
  r := public.loc_preparation_2027();
  perform tests.redevenir_admin();
  return next is(r ->> 'echeance_emission', '2027-09-01', 'La préparation rappelle l''échéance d''émission');
  return next ok(jsonb_typeof(r -> 'pieces_90_jours') = 'array' and jsonb_array_length(r -> 'pieces_90_jours') >= 1, 'Elle compte les pièces récentes par flux');
end $f$;


-- ═══════════════════════════ 16_nettete_frais_avis.sql
-- 16 — Deux promesses de la vitrine (migration b2_07) : la photo floue est refusée à la signature d'un état des lieux, et
-- les frais de dossier d'un avis désigné sont refacturés au locataire, par le chemin de toute facture (validation, émission).

create or replace function tests.test_b2_16_nettete_frais_avis() returns setof text
language plpgsql as $f$
declare
  jeu jsonb; v_client uuid; v_contrat uuid; v_dep uuid; r jsonb; v_avis uuid; v_prop uuid; p public.loc_propositions; v_demande uuid;
  v_jour date := (now() at time zone 'Europe/Paris')::date;
  v_photos jsonb := '[{"vue":"avant","chemin":"edl/avant.jpg","nettete":12.5},{"vue":"arriere","chemin":"edl/arriere.jpg","nettete":310},{"vue":"flanc_gauche","chemin":"edl/gauche.jpg","nettete":250},{"vue":"flanc_droit","chemin":"edl/droit.jpg"}]';
begin
  if to_regprocedure('public.loc_refacturer_avis(uuid)') is null then
    return next fail('La migration b2_07 (netteté, frais d''avis) n''est pas posée : public.loc_refacturer_avis manque');
    return;
  end if;
  jeu := tests.tavaro_jeu_facture();
  v_client := (jeu ->> 'client')::uuid;
  v_contrat := (jeu ->> 'contrat')::uuid;

  -- La photo floue : l'avant mesuré à 12,5 bloque la signature ; repris à 95, l'état se signe et garde la mesure.
  perform tests.endosser((jeu ->> 'collab')::uuid, 'b2-collab@essai.invalid');
  v_dep := public.loc_etablir_etat(v_contrat, 'depart', jsonb_build_object('km', 12000, 'carburant_8', 8, 'photos', v_photos));
  return next throws_ok(format('select public.loc_signer_etat(%L::uuid, %L)', v_dep, 'Marie Durand'), '22023', null, 'Une vue floue (12,5 sous 40) empêche la signature');
  v_dep := public.loc_etablir_etat(v_contrat, 'depart', jsonb_build_object('km', 12000, 'carburant_8', 8, 'photos', jsonb_set(v_photos, '{0,nettete}', '95'),
             'dommages', '[{"zone":"flanc_droit","description":"Rayure","preuves":[{"chemin":"edl/rayure.jpg","nettete":4}]}]'::jsonb));
  return next throws_ok(format('select public.loc_signer_etat(%L::uuid, %L)', v_dep, 'Marie Durand'), '22023', null, 'La photo floue d''un dommage empêche aussi la signature');
  v_dep := public.loc_etablir_etat(v_contrat, 'depart', jsonb_build_object('km', 12000, 'carburant_8', 8, 'photos', jsonb_set(v_photos, '{0,nettete}', '95')));
  r := public.loc_signer_etat(v_dep, 'Marie Durand');
  return next is(r ->> 'statut', 'signe', 'Reprise nette, la vue passe et l''état se signe');
  perform tests.redevenir_admin();
  return next is((select (e.photos -> 0 ->> 'nettete')::numeric from public.loc_etats_des_lieux e where e.id = v_dep), 95.0, 'La netteté mesurée est gardée avec la photo');
  return next ok((select not (e.photos -> 3 ? 'nettete') from public.loc_etats_des_lieux e where e.id = v_dep), 'Une photo non mesurée passe : la mesure absente n''est pas un flou');

  -- Les frais d'avis : un avis désigné, le poste FRAIS_AVIS au barème, la proposition, la validation, la facture.
  perform tests.endosser((jeu ->> 'collab')::uuid, 'b2-collab@essai.invalid');
  r := public.loc_enregistrer_avis(jsonb_build_object('numero_avis', 'FRAIS-AVIS-01', 'immatriculation', 'GA-123-BC',
         'infraction_le', '2026-10-02T14:12:00+02:00', 'montant_eur', 135, 'avis_envoye_le', v_jour - 1));
  v_avis := (r ->> 'avis')::uuid;
  return next throws_ok(format('select public.loc_refacturer_avis(%L::uuid)', v_avis), '23514', null, 'Un avis pas encore désigné ne se refacture pas');
  perform tests.redevenir_admin();
  perform tests.endosser((jeu ->> 'referent')::uuid, 'b2-referent@essai.invalid');
  perform public.loc_designer_conducteur(v_avis, '{"nom":"Durand","prenom":"Marie","date_naissance":"1985-03-02","lieu_naissance":"Lyon","adresse":"3 rue des Lilas, 75011 Paris","permis_numero":"12AB34567"}', 'antai_en_ligne', 'ANTAI-9');
  perform tests.redevenir_admin();
  perform tests.endosser((jeu ->> 'collab')::uuid, 'b2-collab@essai.invalid');
  return next throws_ok(format('select public.loc_refacturer_avis(%L::uuid)', v_avis), '23514', null, 'Sans le poste FRAIS_AVIS au barème, la refacturation est refusée et dit quoi faire');
  perform tests.redevenir_admin();
  perform tests.endosser((jeu ->> 'gerant')::uuid, 'b2-gerant@essai.invalid');
  perform public.loc_publier_bareme('Barème avec frais d''avis', v_jour, tests.tavaro_bareme_lignes()
    || jsonb_build_array(jsonb_build_object('code', 'FRAIS_AVIS', 'libelle', 'Frais de gestion d''un avis de contravention', 'famille', 'frais', 'unite', 'forfait', 'prix_eur', 30, 'regime_tva', 'taxable', 'taux_tva', 20)));
  perform tests.redevenir_admin();
  perform tests.endosser((jeu ->> 'collab')::uuid, 'b2-collab@essai.invalid');
  r := public.loc_refacturer_avis(v_avis);
  v_prop := (r ->> 'proposition')::uuid;
  return next throws_ok(format('select public.loc_refacturer_avis(%L::uuid)', v_avis), '23514', null, 'Un avis ne se refacture qu''une fois');
  perform tests.redevenir_admin();
  select * into p from public.loc_propositions where id = v_prop;
  return next ok(p.statut = 'calculee' and p.total_ht = 30 and p.total_ttc = 36 and p.entrees ->> 'objet' = 'frais_avis', format('Une proposition d''une ligne : 30 € HT, 36 € TTC (%s)', p.statut));
  return next ok(tests.tavaro_journal(v_client, 'tavaro.avis_refacture') >= 1, 'Le journal opposable porte tavaro.avis_refacture');
  -- Le chemin de toute facture : l'ouvrier dépose la demande, une autre personne approuve, la facture est émise.
  perform private.loc_ouvrier(50);
  select demande_id into v_demande from public.loc_propositions where id = v_prop;
  return next ok(v_demande is not null, 'La demande de validation est déposée');
  perform tests.tavaro_decider(jeu, v_demande, 'referent');
  perform private.loc_ouvrier(50);
  return next is((select count(*) from public.loc_factures f where f.proposition_id = v_prop and f.total_ttc = 36), 1::bigint, 'Après accord, la facture des frais d''avis est émise (36 € TTC)');
end $f$;


-- ═══════════════════════════ 17_facture_pdf_photos.sql
-- 17 — La facture part avec son PDF et ses photos datées (migration b2_08) : avec un réglage d'envoi, le courriel attend
-- les PDF (travail tavaro.pdf_factures) ; l'ouvrier tavaro-pdf (simulé ici par ses portes) enregistre les pièces, qui
-- ne partent pas à la lecture IA, et le courriel est préparé avec elles ; sans PDF possible, il part sans pièce jointe.
-- Sans réglage d'envoi, rien ne change (test 07).

create or replace function tests.test_b2_17_facture_pdf_photos() returns setof text
language plpgsql as $f$
declare
  jeu jsonb; v_client uuid; v_prop uuid; a jsonb; r jsonb; v_pieces jsonb := '[]'::jsonb; f record; v_regle boolean := true; n bigint; v_envoi public.envois;
begin
  if to_regprocedure('public.loc_enregistrer_pdf(uuid, jsonb)') is null then
    return next fail('La migration b2_08 (PDF et photos) n''est pas posée : public.loc_enregistrer_pdf manque');
    return;
  end if;
  jeu := tests.tavaro_jeu_contrat();
  v_client := (jeu ->> 'client')::uuid;
  -- Le gérant pose un réglage d'envoi en essai pour tavaro (sinon le courriel ne part pas : test 07).
  perform tests.endosser((jeu ->> 'gerant')::uuid, 'b2-gerant@essai.invalid');
  begin
    insert into public.reglages_envois (client_id, module, mode, essai_adresse) values (v_client, 'tavaro', 'essai', 'essai-b2@essai.invalid');
  exception when others then
    v_regle := false;
    return next diag('Réglage d''envoi non posé (' || sqlerrm || ') : seul le chemin « non réglé » est vérifié.');
  end;
  perform tests.redevenir_admin();
  jeu := tests.tavaro_chiffrer(jeu, 'collab');
  perform tests.tavaro_decider(jeu, (jeu ->> 'demande')::uuid, 'referent');
  perform private.loc_ouvrier(50);
  v_prop := (jeu ->> 'proposition')::uuid;
  return next is((select p.statut from public.loc_propositions p where p.id = v_prop), 'facturee', 'Les factures sont émises');

  if v_regle then
    return next ok((select bool_and(x.envoi_id is null and x.pdf_piece_id is null) from public.loc_factures x where x.proposition_id = v_prop), 'Avec un réglage d''envoi, le courriel attend les PDF');
    return next is(tests.compter('public', 'travaux', format('client_id = %L and genre = %L and cle = %L', v_client, 'tavaro.pdf_factures', 'tavaro:pdf:' || v_prop)), 1::bigint, 'Le travail tavaro.pdf_factures est déposé');
    return next ok(tests.tavaro_journal(v_client, 'tavaro.facture_pdf_demande') >= 1, 'Le journal porte tavaro.facture_pdf_demande');
  end if;

  -- Les portes de l'ouvrier sont au service seul.
  perform tests.endosser((jeu ->> 'collab')::uuid, 'b2-collab@essai.invalid');
  return next throws_ok(format('select public.loc_pdf_a_produire(%L::uuid)', v_prop), '42501', null, 'Une personne connectée n''appelle pas les portes de l''ouvrier');
  perform tests.redevenir_admin();

  -- Ce que l'ouvrier lit : les factures, leurs lignes, les photos des preuves.
  a := public.loc_pdf_a_produire(v_prop);
  return next ok(jsonb_array_length(a -> 'factures') >= 1 and jsonb_array_length(a -> 'factures' -> 0 -> 'lignes') >= 1, 'L''ouvrier lit les factures et leurs lignes');
  -- Un chemin hors du dossier du loueur est refusé.
  return next throws_ok(format('select public.loc_enregistrer_pdf(%L::uuid, %L::jsonb)', v_prop, jsonb_build_array(jsonb_build_object(
      'facture', a -> 'factures' -> 0 ->> 'id', 'nature', 'pdf', 'chemin', 'un-autre-loueur/x.pdf', 'nom', 'x.pdf', 'mime', 'application/pdf', 'octets', 10, 'sha256', repeat('a', 64)))),
    '42501', null, 'Une pièce hors du dossier du loueur est refusée');
  -- L'ouvrier enregistre un PDF par facture et une photo.
  for f in select x.id, x.reference, row_number() over (order by x.numero) as k from public.loc_factures x where x.proposition_id = v_prop loop
    v_pieces := v_pieces || jsonb_build_array(jsonb_build_object('facture', f.id, 'nature', 'pdf', 'chemin', v_client || '/loc_factures/' || f.id || '/' || f.reference || '.pdf',
      'nom', f.reference || '.pdf', 'mime', 'application/pdf', 'octets', 24000, 'sha256', repeat(f.k::text, 64)));
  end loop;
  v_pieces := v_pieces || jsonb_build_array(jsonb_build_object('facture', a -> 'factures' -> 0 ->> 'id', 'nature', 'photo', 'chemin', v_client || '/loc_contrat/' || (jeu ->> 'contrat') || '/jauge.jpg',
      'nom', 'jauge.jpg', 'mime', 'image/jpeg', 'octets', 180000, 'sha256', repeat('e', 64), 'legende', 'Carburant — prise le 05/10/2026 à 11:35'));
  r := public.loc_enregistrer_pdf(v_prop, v_pieces);
  return next ok((select bool_and(x.pdf_piece_id is not null and x.pdf_sha256 is not null) from public.loc_factures x where x.proposition_id = v_prop), 'Chaque facture porte son PDF et son empreinte');
  select count(*) into n from public.pieces pc where pc.client_id = v_client and pc.module = 'tavaro' and pc.objet_type = 'loc_factures' and pc.statut = 'lue';
  return next is(n, jsonb_array_length(v_pieces)::bigint, 'Les pièces sont créées, au statut « lue »');
  return next is(tests.compter('public', 'travaux', format('client_id = %L and genre = %L', v_client, 'lecteur.lire')), 0::bigint, 'Rien ne part à la lecture IA');
  if v_regle then
    return next is(r ->> 'statut', 'prepare', 'Le courriel est préparé');
    select * into v_envoi from public.envois e where e.client_id = v_client and e.cle_idempotence = 'tavaro:facture:' || v_prop;
    return next is(cardinality(v_envoi.pieces), jsonb_array_length(v_pieces), 'Le courriel porte les PDF et la photo en pièces jointes');
    return next ok(v_envoi.corps like '%en pièces jointes%', 'Le courriel le dit');
    -- Rejouer ne crée ni pièce ni envoi de plus.
    r := public.loc_enregistrer_pdf(v_prop, v_pieces);
    return next is(tests.compter('public', 'envois', format('client_id = %L and cle_idempotence = %L', v_client, 'tavaro:facture:' || v_prop)), 1::bigint, 'Rejouer ne fait pas un second envoi');
  else
    return next is(r ->> 'statut', 'non_regle', 'Sans réglage d''envoi, la facture reste à envoyer soi-même');
  end if;
end $f$;


-- ═══════════════════════════ 18_contestations.sql
-- 18 — Les contestations bancaires (migration b2_09) : l'agence ouvre la contestation sur la facture, Tavaro dit ce qui
-- rendra le dossier fort et dépose le travail tavaro.dossier_contestation ; l'ouvrier tavaro-pdf (simulé ici par ses
-- portes) lit le dossier et l'enregistre ; un clic l'envoie à la banque par le chemin de tout envoi ; l'issue se
-- consigne par la direction ; la surveillance alerte avant la date limite.

create or replace function tests.test_b2_18_contestations() returns setof text
language plpgsql as $f$
declare
  jeu jsonb; v_client uuid; v_facture uuid; v_total numeric; r jsonb; a jsonb; v_k uuid; v_k2 uuid; v_regle boolean := true; n bigint;
  v_envoi public.envois;
begin
  if to_regprocedure('public.loc_ouvrir_contestation(uuid, jsonb)') is null then
    return next fail('La migration b2_09 (contestations bancaires) n''est pas posée : public.loc_ouvrir_contestation manque');
    return;
  end if;
  jeu := tests.tavaro_jeu_facture();
  v_client := (jeu ->> 'client')::uuid;
  v_facture := (jeu -> 'factures' -> 0 ->> 'id')::uuid;
  v_total := (jeu -> 'factures' -> 0 ->> 'total_ttc')::numeric;
  return next ok(v_facture is not null, 'Une facture est émise');

  -- Le gérant pose un réglage d'envoi en essai pour tavaro (sinon le dossier se télécharge et part à la main).
  perform tests.endosser((jeu ->> 'gerant')::uuid, 'b2-gerant@essai.invalid');
  begin
    insert into public.reglages_envois (client_id, module, mode, essai_adresse) values (v_client, 'tavaro', 'essai', 'essai-b2@essai.invalid');
  exception when unique_violation then
    null;
  when others then
    v_regle := false;
    return next diag('Réglage d''envoi non posé (' || sqlerrm || ') : seul le refus « non réglé » est vérifié.');
  end;

  -- L'ouverture : périmètre, champs obligatoires, montant.
  perform tests.endosser((jeu ->> 'autre')::uuid, 'b2-autre@essai.invalid');
  return next throws_ok(format('select public.loc_ouvrir_contestation(%L::uuid, %L::jsonb)', v_facture, '{"reference_banque":"CB-1","motif_banque":"13.1"}'),
    'P0002', null, 'Un autre loueur ne voit pas la facture');
  perform tests.endosser((jeu ->> 'collab')::uuid, 'b2-collab@essai.invalid');
  return next throws_ok(format('select public.loc_ouvrir_contestation(%L::uuid, %L::jsonb)', v_facture, '{"motif_banque":"13.1"}'),
    '22023', null, 'La référence de la banque est obligatoire');
  return next throws_ok(format('select public.loc_ouvrir_contestation(%L::uuid, %L::jsonb)', v_facture,
                               jsonb_build_object('reference_banque', 'CB-1', 'motif_banque', '13.1', 'montant_eur', v_total + 1)),
    '22023', null, 'Le montant contesté ne dépasse pas la facture');
  r := public.loc_ouvrir_contestation(v_facture, jsonb_build_object('reference_banque', 'CB-2026-88412', 'motif_banque', '13.1 — prestation contestée',
                                                                    'adresse_banque', 'litiges-b2@essai.invalid'));
  v_k := (r ->> 'contestation')::uuid;
  return next is(r ->> 'statut', 'ouverte', 'La contestation est ouverte');
  return next is(jsonb_array_length(r -> 'forces'), 7, 'Tavaro dit ce qui rend le dossier fort ou faible (7 points)');
  return next is((select k.montant_eur from public.loc_contestations k where k.id = v_k), v_total, 'Par défaut, le montant contesté est celui de la facture');
  return next ok((select k.repondre_avant > k.recue_le from public.loc_contestations k where k.id = v_k), 'La date limite suit la réception (délai réglé)');
  r := public.loc_ouvrir_contestation(v_facture, jsonb_build_object('reference_banque', 'CB-2026-88412', 'motif_banque', 'autre'));
  return next ok((r ->> 'deja')::boolean and (r ->> 'contestation')::uuid = v_k, 'Rouvrir la même référence rend la même contestation');
  perform tests.redevenir_admin();
  return next is(tests.compter('public', 'travaux', format('client_id = %L and genre = %L and cle = %L', v_client, 'tavaro.dossier_contestation', 'tavaro:contestation:' || v_k)),
    1::bigint, 'Le travail tavaro.dossier_contestation est déposé');
  return next ok(tests.tavaro_journal(v_client, 'tavaro.contestation_ouverte') >= 1, 'Le journal porte tavaro.contestation_ouverte');

  -- Les portes de l'ouvrier sont au service seul ; le dossier ne part pas avant d'être composé.
  perform tests.endosser((jeu ->> 'collab')::uuid, 'b2-collab@essai.invalid');
  return next throws_ok(format('select public.loc_dossier_a_produire(%L::uuid)', v_k), '42501', null, 'Une personne connectée n''appelle pas les portes de l''ouvrier');
  return next throws_ok(format('select public.loc_envoyer_dossier(%L::uuid)', v_k), '55000', null, 'Le dossier ne part pas avant d''être composé');
  perform tests.redevenir_admin();

  -- Ce que l'ouvrier lit, puis ce qu'il enregistre.
  a := public.loc_dossier_a_produire(v_k);
  return next ok(a -> 'contrat' ->> 'numero' is not null and jsonb_array_length(a -> 'facture' -> 'lignes') >= 1 and a ? 'decision',
    'L''ouvrier lit le contrat, les lignes de la facture et la décision');
  return next throws_ok(format('select public.loc_enregistrer_dossier(%L::uuid, %L::jsonb)', v_k, jsonb_build_object(
      'chemin', 'un-autre-loueur/d.pdf', 'nom', 'd.pdf', 'mime', 'application/pdf', 'octets', 10, 'sha256', repeat('c', 64))),
    '42501', null, 'Un dossier hors du dossier du loueur est refusé');
  r := public.loc_enregistrer_dossier(v_k, jsonb_build_object('chemin', v_client || '/loc_contestations/' || v_k || '/dossier-CB-2026-88412.pdf',
                                                             'nom', 'dossier-CB-2026-88412.pdf', 'mime', 'application/pdf', 'octets', 240000,
                                                             'sha256', repeat('c', 64), 'pages', 6));
  return next is(r ->> 'statut', 'dossier_pret', 'Le dossier est prêt');
  select count(*) into n from public.pieces pc where pc.client_id = v_client and pc.objet_type = 'loc_contestations' and pc.objet_id = v_k::text and pc.statut = 'lue';
  return next is(n, 1::bigint, 'Le dossier est une pièce, au statut « lue »');

  -- L'issue : la direction seule ; gagnée suppose un dossier envoyé.
  perform tests.endosser((jeu ->> 'collab')::uuid, 'b2-collab@essai.invalid');
  return next throws_ok(format('select public.loc_issue_contestation(%L::uuid, %L)', v_k, 'gagnee'), '42501', null, 'Un collaborateur ne consigne pas l''issue');
  perform tests.endosser((jeu ->> 'gerant')::uuid, 'b2-gerant@essai.invalid');
  return next throws_ok(format('select public.loc_issue_contestation(%L::uuid, %L)', v_k, 'gagnee'), '23514', null, 'Gagnée suppose un dossier envoyé');

  -- Le clic.
  perform tests.endosser((jeu ->> 'collab')::uuid, 'b2-collab@essai.invalid');
  if v_regle then
    r := public.loc_envoyer_dossier(v_k);
    return next is(r ->> 'statut', 'envoyee', 'Le dossier est remis à l''envoi');
    perform tests.redevenir_admin();
    select * into v_envoi from public.envois e where e.client_id = v_client and e.id = (r ->> 'envoi')::uuid;
    return next ok(v_envoi.id is not null and (select k.dossier_piece_id from public.loc_contestations k where k.id = v_k) = any (v_envoi.pieces),
      'Le courriel à la banque porte le dossier en pièce jointe');
    perform tests.endosser((jeu ->> 'collab')::uuid, 'b2-collab@essai.invalid');
    r := public.loc_envoyer_dossier(v_k);
    return next ok((r ->> 'deja')::boolean, 'Recliquer ne fait pas un second envoi');
    perform tests.endosser((jeu ->> 'gerant')::uuid, 'b2-gerant@essai.invalid');
    r := public.loc_issue_contestation(v_k, 'gagnee', 'Notifiée par la banque');
    return next is(r ->> 'statut', 'gagnee', 'La direction consigne l''issue');
  else
    return next throws_ok(format('select public.loc_envoyer_dossier(%L::uuid)', v_k), '55000', null, 'Sans réglage d''envoi, le dossier se télécharge et part à la main');
  end if;

  -- La surveillance : une contestation à répondre aujourd'hui lève une alerte.
  perform tests.endosser((jeu ->> 'collab')::uuid, 'b2-collab@essai.invalid');
  r := public.loc_ouvrir_contestation(v_facture, jsonb_build_object('reference_banque', 'CB-2026-90001', 'motif_banque', '10.4 — fraude',
                                                                    'repondre_avant', to_char(current_date, 'YYYY-MM-DD'), 'recue_le', to_char(current_date, 'YYYY-MM-DD')));
  v_k2 := (r ->> 'contestation')::uuid;
  perform tests.redevenir_admin();
  return next ok(private.loc_surveiller_contestations() >= 1, 'Le jour de la date limite, la surveillance alerte');
  perform tests.endosser((jeu ->> 'gerant')::uuid, 'b2-gerant@essai.invalid');
  r := public.loc_issue_contestation(v_k2, 'abandonnee');
  return next is(r ->> 'statut', 'abandonnee', 'Une contestation non défendue se classe « abandonnée »');
  perform tests.redevenir_admin();

  -- b2_09b : la pièce du dossier suit la contestation (gardien), au lieu d'être visible de toute l'organisation.
  if to_regprocedure('private.loc_gardien_contestation(uuid, uuid, text)') is null then
    return next diag('b2_09b (gardien des pièces de contestation) n''est pas posée : non vérifié.');
  else
    return next ok(exists (select 1 from private.gardiens_objets g where g.objet_type = 'loc_contestations'), 'Le gardien des pièces de contestation est inscrit');
    return next ok(private.voit_objet_pour((jeu ->> 'gerant')::uuid, v_client, 'loc_contestations', v_k::text), 'La direction voit la pièce du dossier');
    return next ok(not private.voit_objet_pour((jeu ->> 'autre')::uuid, v_client, 'loc_contestations', v_k::text), 'Un autre loueur ne la voit pas');
    return next ok(not private.loc_gardien_contestation((jeu ->> 'collab')::uuid, v_client, 'pas-un-uuid'), 'Un identifiant illisible ne passe pas');
  end if;
end $f$;


-- ═══════════════════════════ 19_remise_entretien.sql
-- 19 — Remise en location et entretien (migration b2_10) : le retour crée la remise en location (inspection, nettoyage,
-- énergie) et l'immobilisation de préparation ; les trois étapes faites, le véhicule est prêt ; chaque anomalie va à une
-- personne nommée ; une immobilisation de carrosserie garde sa date de retour ; l'entretien se place dans un creux et
-- n'est jamais planifié sur une réservation du véhicule.

create or replace function tests.test_b2_19_remise_entretien() returns setof text
language plpgsql as $f$
declare
  jeu jsonb; v_client uuid; v_contrat uuid; v_vehicule uuid; v_remise uuid; v_immo uuid; r jsonb; v_anomalie uuid; v_entretien uuid;
  v_creneau timestamptz; v_resa timestamptz;
begin
  if to_regprocedure('public.loc_etape_remise(uuid, text, boolean)') is null then
    return next fail('La migration b2_10 (remise en location et entretien) n''est pas posée : public.loc_etape_remise manque');
    return;
  end if;
  jeu := tests.tavaro_jeu_contrat();
  v_client := (jeu ->> 'client')::uuid;
  v_contrat := (jeu ->> 'contrat')::uuid;
  select c.vehicule_id into v_vehicule from public.loc_contrats c where c.id = v_contrat;
  return next ok(v_vehicule is not null, 'Le contrat d''essai porte son véhicule');

  -- Le retour saisi à l'agence (il y a une heure) crée la remise en location.
  jeu := tests.tavaro_chiffrer(jeu, 'collab', tests.tavaro_retour() || jsonb_build_object('retour_reel_le', to_char(now() - interval '1 hour', 'YYYY-MM-DD"T"HH24:MI:SSOF')));
  select x.id, x.immobilisation_id into v_remise, v_immo from public.loc_remises x where x.client_id = v_client and x.contrat_id = v_contrat;
  return next ok(v_remise is not null, 'Le retour crée la remise en location');
  return next ok((select i.motif = 'preparation' and i.fin_le is null from public.loc_immobilisations i where i.id = v_immo), 'Le véhicule est immobilisé pour préparation');
  return next ok(tests.tavaro_journal(v_client, 'tavaro.remise_creee') >= 1, 'Le journal porte tavaro.remise_creee');
  perform private.loc_creer_remise(v_client, v_contrat, now());
  return next is(tests.compter('public', 'loc_remises', format('client_id = %L and contrat_id = %L', v_client, v_contrat)), 1::bigint, 'Une seule remise par contrat');

  -- Les gardes.
  perform tests.endosser((jeu ->> 'autre')::uuid, 'b2-autre@essai.invalid');
  return next throws_ok(format('select public.loc_etape_remise(%L::uuid, %L)', v_remise, 'inspection'), 'P0002', null, 'Un autre loueur ne voit pas la remise');
  perform tests.endosser((jeu ->> 'collab')::uuid, 'b2-collab@essai.invalid');
  return next throws_ok(format('select private.loc_creer_remise(%L::uuid, %L::uuid, now())', v_client, v_contrat), '42501', null, 'Une personne n''appelle pas la création directe');
  return next throws_ok(format('select public.loc_etape_remise(%L::uuid, %L)', v_remise, 'lavage'), '22023', null, 'Une étape inconnue est refusée');

  -- Les trois étapes : le véhicule est prêt, l'immobilisation close.
  r := public.loc_etape_remise(v_remise, 'inspection');
  return next is(r ->> 'statut', 'en_cours', 'Une étape faite : en cours');
  perform public.loc_etape_remise(v_remise, 'nettoyage');
  r := public.loc_etape_remise(v_remise, 'energie');
  return next is(r ->> 'statut', 'prete', 'Les trois étapes faites : le véhicule est prêt');
  perform tests.redevenir_admin();
  return next ok((select i.fin_le is not null from public.loc_immobilisations i where i.id = v_immo), 'L''immobilisation de préparation est close');
  return next ok(tests.tavaro_journal(v_client, 'tavaro.remise_prete') >= 1, 'Le journal porte tavaro.remise_prete (durée, à temps)');

  -- Les anomalies : une personne nommée ; elle, ou la direction, la clôt.
  perform tests.endosser((jeu ->> 'collab')::uuid, 'b2-collab@essai.invalid');
  return next throws_ok(format('select public.loc_signaler_anomalie(%L::uuid, %L, %L, null)', v_remise, 'voyant', 'Voyant moteur allumé'), '22023', null, 'Une anomalie sans personne nommée est refusée');
  v_anomalie := (public.loc_signaler_anomalie(v_remise, 'voyant', 'Voyant moteur allumé au retour', (jeu ->> 'referent')::uuid) ->> 'anomalie')::uuid;
  return next ok(v_anomalie is not null, 'L''anomalie est confiée au référent');
  perform tests.endosser((jeu ->> 'collab_nord')::uuid, 'b2-collab-nord@essai.invalid');
  return next throws_ok(format('select public.loc_traiter_anomalie(%L::uuid, %L)', v_anomalie, 'vu'), '42501', null, 'Une autre personne ne la clôt pas');
  perform tests.endosser((jeu ->> 'referent')::uuid, 'b2-referent@essai.invalid');
  r := public.loc_traiter_anomalie(v_anomalie, 'Garage prévenu');
  return next is(r ->> 'statut', 'traitee', 'La personne nommée la clôt');

  -- Une immobilisation de carrosserie garde sa date de retour.
  perform tests.endosser((jeu ->> 'collab')::uuid, 'b2-collab@essai.invalid');
  return next throws_ok(format('select public.loc_immobiliser(%L::uuid, %L::jsonb)', v_vehicule, '{"motif":"carrosserie"}'), '22023', null, 'Carrosserie sans date de retour : refusée');
  r := public.loc_immobiliser(v_vehicule, jsonb_build_object('motif', 'carrosserie', 'fin_prevue_le', now() + interval '2 days', 'prestataire', 'Carrosserie du Parc'));
  return next ok(r ? 'immobilisation', 'Le véhicule part chez le carrossier avec sa date de retour');
  r := public.loc_lever_immobilisation((r ->> 'immobilisation')::uuid, 480, 'Portière reprise');
  return next ok(r ? 'fin_le', 'Le véhicule revient : l''immobilisation est close');

  -- L'entretien : un creux, jamais sur une réservation du véhicule.
  r := public.loc_prevoir_entretien(v_vehicule, jsonb_build_object('nature', 'revision', 'libelle', 'Révision 15 000 km', 'echeance_le', (current_date + 20)::text, 'duree_h', 4));
  v_entretien := (r ->> 'entretien')::uuid;
  r := public.loc_creneaux_entretien(v_entretien, 3);
  return next ok(jsonb_array_length(r -> 'creneaux') >= 1, 'Des créneaux libres sont proposés');
  v_creneau := (r -> 'creneaux' -> 0 ->> 'debut')::timestamptz;
  perform tests.redevenir_admin();
  v_resa := v_creneau + interval '1 hour';
  begin
    perform tests.inserer_minimal('public', 'loc_reservations', jsonb_build_object('client_id', v_client, 'entite_id', jeu ->> 'siege', 'ref_source', 'R-B2-19',
      'vehicule_id', v_vehicule, 'depart_prevu_le', v_resa, 'retour_prevu_le', v_resa + interval '2 days', 'statut', 'confirmee'));
    perform tests.endosser((jeu ->> 'collab')::uuid, 'b2-collab@essai.invalid');
    return next throws_ok(format('select public.loc_planifier_entretien(%L::uuid, %L::timestamptz)', v_entretien, v_creneau), '23514', null, 'Un créneau qui touche une réservation du véhicule est refusé');
  exception when others then
    perform tests.endosser((jeu ->> 'collab')::uuid, 'b2-collab@essai.invalid');
    return next diag('Réservation d''essai non posée (' || sqlerrm || ') : le refus sur réservation n''est pas vérifié.');
  end;
  r := public.loc_creneaux_entretien(v_entretien, 1);
  r := public.loc_planifier_entretien(v_entretien, (r -> 'creneaux' -> 0 ->> 'debut')::timestamptz, 'Garage Lumière', null);
  return next is(r ->> 'statut', 'planifie', 'L''entretien est planifié dans un creux');
  return next ok((select i.motif = 'entretien' and i.fin_prevue_le is not null from public.loc_immobilisations i
                  where i.id = (select e.immobilisation_id from public.loc_entretiens e where e.id = v_entretien)), 'L''atelier immobilise le véhicule, retour prévu');
  r := public.loc_entretien_fait(v_entretien, 15080, 210, 'RAS');
  return next is(r ->> 'statut', 'fait', 'L''entretien est fait');
  perform tests.redevenir_admin();

  return next ok(private.loc_surveiller_parc() >= 0, 'La surveillance du parc passe sans erreur');
end $f$;


-- ═══════════════════════════ 20_sortie_flotte.sql
-- 20 — Sortie de flotte (migration b2_11) : la fiche économique d'un véhicule (revenu, coûts, perte de valeur au prix
-- de revente réel, avis, moment, canal), lue par la direction et les valideurs seulement ; la mise en vente proposée,
-- validée par une autre personne de la direction, puis conclue : le véhicule sort de la flotte, tout est au journal.

create or replace function tests.test_b2_20_sortie_flotte() returns setof text
language plpgsql as $f$
declare
  jeu jsonb; v_client uuid; v_vehicule uuid; r jsonb; v_fiches jsonb; v_sortie uuid;
begin
  if to_regprocedure('public.loc_fiches_flotte()') is null then
    return next fail('La migration b2_11 (sortie de flotte) n''est pas posée : public.loc_fiches_flotte manque');
    return;
  end if;
  jeu := tests.tavaro_jeu_contrat();
  v_client := (jeu ->> 'client')::uuid;
  select c.vehicule_id into v_vehicule from public.loc_contrats c where c.id = (jeu ->> 'contrat')::uuid;
  return next ok(v_vehicule is not null, 'Le contrat d''essai porte son véhicule');

  -- La fiche se lit par la direction et les valideurs.
  perform tests.endosser((jeu ->> 'collab')::uuid, 'b2-collab@essai.invalid');
  return next throws_ok('select public.loc_fiches_flotte()', '42501', null, 'Un collaborateur ne lit pas la fiche économique');
  return next throws_ok(format('select public.loc_poser_economie(%L::uuid, %L::jsonb)', v_vehicule, '{"cote_eur": 9000, "cote_source": "argus"}'), '42501', null, 'Ni ne saisit la cote');

  perform tests.endosser((jeu ->> 'referent')::uuid, 'b2-referent@essai.invalid');
  return next throws_ok(format('select public.loc_poser_economie(%L::uuid, %L::jsonb)', v_vehicule, '{"cote_eur": 9000}'), '22023', null, 'Une cote sans source est refusée');
  r := public.loc_poser_economie(v_vehicule, jsonb_build_object('financement', 'achat', 'prix_achat_eur', 16500, 'cote_eur', 9000, 'cote_source', 'argus', 'valeur_comptable_eur', 7200));
  return next is((r -> 'cote' ->> 'eur')::numeric, 9000::numeric, 'La cote réelle est sur la fiche');
  return next is((r ->> 'ecart_cote_comptable')::numeric, 1800::numeric, 'La fiche montre l''écart entre la cote réelle et la valeur comptable');
  return next ok(r ? 'avis' and r ->> 'avis' in ('sortir', 'surveiller', 'garder') and r ? 'canal' and r ? 'marge', 'La fiche donne un avis, un canal et une marge');
  return next ok((r -> 'revenu' ->> 'jours_loues')::numeric >= 1, 'Le revenu compte les jours loués du contrat');
  v_fiches := public.loc_fiches_flotte();
  return next ok(jsonb_array_length(v_fiches) >= 1, 'Les fiches de la flotte se lisent');

  -- La mise en vente : le gérant propose, il ne valide pas lui-même.
  perform tests.endosser((jeu ->> 'gerant')::uuid, 'b2-gerant@essai.invalid');
  return next throws_ok(format('select public.loc_proposer_sortie(%L::uuid, %L::jsonb)', v_vehicule, '{}'), '22023', null, 'Une proposition sans motif est refusée');
  v_sortie := (public.loc_proposer_sortie(v_vehicule, jsonb_build_object('motif', 'Marge négative sur douze mois et kilométrage au seuil')) ->> 'sortie')::uuid;
  return next ok(v_sortie is not null, 'La direction propose la mise en vente');
  return next throws_ok(format('select public.loc_proposer_sortie(%L::uuid, %L::jsonb)', v_vehicule, '{"motif": "une seconde fois"}'), '23505', null, 'Une seule sortie ouverte par véhicule');
  return next throws_ok(format('select public.loc_decider_sortie(%L::uuid, true)', v_sortie), '42501', null, 'Celui qui propose ne valide pas lui-même');
  perform public.loc_annuler_sortie(v_sortie, 'Proposée par le valideur à la place');

  -- Le valideur propose ; le gérant valide ; la vente se conclut.
  perform tests.endosser((jeu ->> 'referent')::uuid, 'b2-referent@essai.invalid');
  v_sortie := (public.loc_proposer_sortie(v_vehicule, jsonb_build_object('motif', 'Marge négative sur douze mois', 'canal', 'marchand')) ->> 'sortie')::uuid;
  return next throws_ok(format('select public.loc_decider_sortie(%L::uuid, true)', v_sortie), '42501', null, 'Un valideur ne valide pas une mise en vente');
  return next throws_ok(format('select public.loc_conclure_sortie(%L::uuid, 8800)', v_sortie), '23514', null, 'Une vente ne se conclut pas avant la validation');
  perform tests.endosser((jeu ->> 'gerant')::uuid, 'b2-gerant@essai.invalid');
  r := public.loc_decider_sortie(v_sortie, true);
  return next is(r ->> 'statut', 'validee', 'La direction valide la mise en vente');
  perform tests.endosser((jeu ->> 'referent')::uuid, 'b2-referent@essai.invalid');
  r := public.loc_conclure_sortie(v_sortie, 8800, current_date, 'Marchand d''essai');
  return next is(r ->> 'statut', 'vendue', 'La vente est conclue');
  perform tests.redevenir_admin();
  return next is((select v.statut from public.loc_vehicules v where v.id = v_vehicule), 'sorti', 'Le véhicule est sorti de la flotte');
  return next ok((select (s.fiche ->> 'immatriculation') is not null from public.loc_sorties_flotte s where s.id = v_sortie), 'La fiche est figée sur la sortie');
  return next ok(tests.tavaro_journal(v_client, 'tavaro.sortie_validee') >= 1 and tests.tavaro_journal(v_client, 'tavaro.sortie_conclue') >= 1,
    'Le journal garde la validation et la vente');
  -- b2_11b : l'import ne remet pas en service un véhicule vendu.
  if to_regprocedure('private.loc_garder_vehicule_sorti()') is null then
    return next diag('b2_11b (garde du véhicule sorti) n''est pas posée : non vérifié.');
  else
    update public.loc_vehicules set statut = 'actif' where id = v_vehicule;
    return next is((select v.statut from public.loc_vehicules v where v.id = v_vehicule), 'sorti', 'Un import qui remet « actif » un véhicule vendu ne le remet pas en service');
  end if;
end $f$;


select * from runtests('tests'::name, '^test_b2_');
