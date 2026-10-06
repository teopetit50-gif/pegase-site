-- banc_01 — Le parcours RÉEL sur le client du banc (cccccccc-0000-4000-8000-00000000000c), session B2.
-- PAS un test : rien n'est annulé. À jouer par le coordinateur, en plusieurs appels, dans l'ordre, en
-- laissant le cron tavaro-ouvrier (chaque minute) passer entre les étapes B et C, puis C et D.
-- Prérequis : b2_01 et b2_02 posés ; reglages_envois tavaro en mode essai pour le banc (adresse d'essai de Teo).
-- Tout ce qui est du module passe par ses portes, sous la personne qui le ferait (tests.endosser du schéma tests d'A5).
-- Rien n'y est effacé ni détruit. Rejouable : chaque étape vérifie si elle est déjà faite.

-- ═══ A. La direction règle l'agence, le module, publie le barème (gérant du banc)
do $$
declare
  v_client uuid := 'cccccccc-0000-4000-8000-00000000000c';
  v_gerant uuid := (select id from auth.users where email = 'gerant@banc-varelo.test');
  v_siege uuid := (select id from public.entites where client_id = v_client and principale);
  v_bareme uuid;
  -- lu AVANT d'endosser : authenticated n'exécute pas les fonctions de private (a5_01)
  v_sans_bareme boolean := private.loc_bareme_en_vigueur(v_client, date '2026-10-01') is null;
begin
  perform tests.endosser(v_gerant, 'gerant@banc-varelo.test');
  -- l'agence du siège : TVA 20 (le siège n'a pas de territoire ; la base le demanderait)
  if not exists (select 1 from public.loc_agences where client_id = v_client and entite_id = v_siege) then
    insert into public.loc_agences (client_id, entite_id, code, taux_tva) values (v_client, v_siege, 'SIEGE', 20);
  end if;
  if not exists (select 1 from public.loc_reglages where client_id = v_client) then
    insert into public.loc_reglages (client_id, tolerance_retard_min, emetteur)
    values (v_client, 59, jsonb_build_object('adresse', '1 rue du Banc, 97110 Pointe-à-Pitre', 'email', 'essais@omegaai.fr'));
  end if;
  if v_sans_bareme then
    v_bareme := public.loc_publier_bareme('Barème banc 2026', date '2026-01-01', jsonb_build_array(
      jsonb_build_object('code', 'CARBURANT_8E', 'libelle', 'Carburant manquant, au huitième', 'famille', 'carburant', 'unite', 'huitieme', 'prix_eur', 12, 'regime_tva', 'taxable', 'taux_tva', 20),
      jsonb_build_object('code', 'KM_SUP', 'libelle', 'Kilomètre au-delà du forfait', 'famille', 'kilometres', 'unite', 'km', 'prix_eur', 0.25, 'regime_tva', 'taxable', 'taux_tva', 20),
      jsonb_build_object('code', 'RETARD_JOUR', 'libelle', 'Jour de retard entamé', 'famille', 'retard', 'unite', 'jour_entame', 'regime_tva', 'taxable', 'taux_tva', 20),
      jsonb_build_object('code', 'RAYURE_PORTIERE', 'libelle', 'Rayure de portière', 'famille', 'dommage', 'unite', 'forfait', 'prix_eur', 180, 'regime_tva', 'hors_champ'),
      jsonb_build_object('code', 'NETTOYAGE', 'libelle', 'Nettoyage approfondi', 'famille', 'nettoyage', 'unite', 'forfait', 'prix_eur', 60, 'regime_tva', 'taxable', 'taux_tva', 20)));
    raise notice 'barème publié : %', v_bareme;
  end if;
  perform tests.redevenir_admin();
end $$;
select b.id, b.libelle, b.statut, (select count(*) from public.loc_bareme_lignes l where l.bareme_id = b.id) as lignes
from public.loc_baremes b where b.client_id = 'cccccccc-0000-4000-8000-00000000000c';

-- ═══ B. Le contrat arrive par l'export (service_role / postgres), le référent complète et chiffre le retour
select public.loc_appliquer_releve('cccccccc-0000-4000-8000-00000000000c', 'contrats',
  jsonb_build_array(jsonb_build_object('n', 1, 'nature', 'ajout', 'valeurs', jsonb_build_object(
    'numero', 'BANC-2026-0001', 'agence', 'SIEGE', 'depart_le', '2026-10-01T09:00:00', 'retour_prevu_le', '2026-10-04T09:00:00',
    'immatriculation', 'GA-123-BC', 'categorie', 'B', 'km_depart', 12000, 'tarif_jour', 45, 'franchise', 800, 'depot', 500, 'statut', 'ouvert',
    'locataire_nom', 'Durand', 'locataire_prenom', 'Marie', 'locataire_email', 'client-essai@banc-varelo.test',
    'locataire_adresse', '3 rue des Lilas, 75011 Paris', 'locataire_type', 'particulier'))),
  jsonb_build_object('cle', 'banc:b2:contrat:1', 'source', 'export', 'lu_le', now()));
do $$
declare
  v_client uuid := 'cccccccc-0000-4000-8000-00000000000c';
  v_referent uuid := (select id from auth.users where email = 'referent@banc-varelo.test');
  v_contrat uuid := (select id from public.loc_contrats where client_id = v_client and numero = 'BANC-2026-0001');
  v_prop uuid;
begin
  perform tests.endosser(v_referent, 'referent@banc-varelo.test');
  if (select km_inclus from public.loc_contrats where id = v_contrat) is null then
    perform public.loc_completer_contrat(v_contrat, '{"km_inclus": 600, "politique_carburant": "plein_contre_plein", "franchise_eur": 800, "rachat_franchise": false}'::jsonb);
  end if;
  if not exists (select 1 from public.loc_propositions p where p.contrat_id = v_contrat and p.statut in ('a_valider', 'validee', 'facturee')) then
    v_prop := public.loc_chiffrer_retour(v_contrat, jsonb_build_object(
      'retour_reel_le', '2026-10-05T11:30:00+02:00', 'km_retour', 12650, 'carburant_depart_8', 8, 'carburant_retour_8', 5,
      'dommages', jsonb_build_array(jsonb_build_object('code', 'RAYURE_PORTIERE', 'preuves', jsonb_build_array(jsonb_build_object('photo', 'banc/portiere.jpg')))),
      'postes', jsonb_build_array(jsonb_build_object('code', 'NETTOYAGE', 'preuves', jsonb_build_array(jsonb_build_object('photo', 'banc/habitacle.jpg')))),
      'preuves', jsonb_build_object('carburant', jsonb_build_array(jsonb_build_object('photo', 'banc/jauge.jpg')))));
    raise notice 'proposition : %', v_prop;
  end if;
  perform tests.redevenir_admin();
end $$;
select p.id, p.version, p.statut, p.total_ttc, p.demande_id, p.avertissements
from public.loc_propositions p join public.loc_contrats c on c.id = p.contrat_id
where c.client_id = 'cccccccc-0000-4000-8000-00000000000c' and c.numero = 'BANC-2026-0001' order by p.version;
-- → attendu : statut calculee, total 418.20, puis a_valider avec demande_id après le passage du cron (≤ 1 min).
-- Pour ne pas attendre : select private.loc_ouvrier(20);

-- ═══ C. La DAF approuve (le référent, qui a chiffré, serait refusé : b2_01) ; le cron émet les factures et prépare le courriel
do $$
declare
  v_client uuid := 'cccccccc-0000-4000-8000-00000000000c';
  v_daf uuid := (select id from auth.users where email = 'daf@banc-varelo.test');
  v_demande uuid := (select p.demande_id from public.loc_propositions p join public.loc_contrats c on c.id = p.contrat_id
                     where c.client_id = v_client and c.numero = 'BANC-2026-0001' and p.statut = 'a_valider');
begin
  if v_demande is null then
    raise notice 'aucune demande à valider (le cron n''est pas encore passé, ou la proposition est déjà décidée)';
    return;
  end if;
  perform tests.endosser(v_daf, 'daf@banc-varelo.test');
  insert into public.approbations (demande_id, client_id, user_id, decision, commentaire)
  values (v_demande, v_client, v_daf, 'approuve', 'Vérifié avec les photos du retour (banc B2).');
  perform tests.redevenir_admin();
end $$;
-- Après le cron (≤ 1 min), ou : select private.loc_ouvrier(20);
select f.reference, f.nature, f.total_ttc, f.statut, f.envoi_id, e.statut as envoi_statut, e.verrou, e.fournisseur, e.programme_le
from public.loc_factures f left join public.envois e on e.id = f.envoi_id
where f.client_id = 'cccccccc-0000-4000-8000-00000000000c' order by f.numero;
-- → attendu : FA-2026-000001 (frais, 238.20) et FA-2026-000002 (dommages, 180.00), emise ; un envoi 'pret' (mode essai → adresse de Teo),
--   puis, une fois l'expéditeur passé : envois.statut = envoye, loc_factures.statut = envoyee (travail tavaro.envoi).

-- ═══ D. La relance à la main par la DAF (b2_02) : un second courriel part, la facture compte sa relance
do $$
declare
  v_client uuid := 'cccccccc-0000-4000-8000-00000000000c';
  v_daf uuid := (select id from auth.users where email = 'daf@banc-varelo.test');
  v_facture uuid := (select id from public.loc_factures where client_id = v_client and nature = 'frais' and contrat_numero = 'BANC-2026-0001');
  v_res jsonb;
begin
  perform tests.endosser(v_daf, 'daf@banc-varelo.test');
  v_res := public.loc_relancer_facture(v_facture);
  raise notice 'relance : %', v_res;
  perform tests.redevenir_admin();
end $$;
select f.reference, f.relances, f.relance_le, e.statut as envoi_statut, e.cle
from public.loc_factures f join public.envois e on e.client_id = f.client_id and e.cle = 'tavaro:relance:' || f.id::text || ':' || f.relances
where f.client_id = 'cccccccc-0000-4000-8000-00000000000c' and f.contrat_numero = 'BANC-2026-0001';

-- ═══ E. Le journal opposable du banc pour ce contrat
select j.* from public.journal_opposable j
where j.client_id = 'cccccccc-0000-4000-8000-00000000000c' and j.action like 'tavaro.%'
order by j.survenu_le desc limit 30;
