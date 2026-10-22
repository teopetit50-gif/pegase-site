-- 20260929034413 tiroma_releve
-- Source : statements de la recette.
-- Assemblé par omega/prod/assembler.mjs pour la production (noepmkkplxshjbmqqxft). Transformations : aucune.
-- ═══════════════════════════════════════════════════════════════════════════
-- Tiroma, lot T3 — M0 RELEVÉ : le contrat de relevé v1, sur la brique B1
--
-- Le plan : OMEGA/moteurs/dentaire.md, M0 (entrées, traitement pas à pas,
-- gardes R9, écarts d'agenda, faits dérivés, vocabulaire, matrice des
-- capacités, journal, battement). La brique : B1 (BRIQUES.md §5.6,
-- brique-releve.md, lot 13 en production) : elle reçoit les exports, les lit
-- en lignes typées, compare à l'état, refuse l'export douteux, et passe à
-- Tiroma les écarts à appliquer, un export après l'autre.
--
-- Ce lot pose :
--   · le contrat de relevé v1 de Logos_w : dix jeux d'export déclarés à B1
--     (agenda, patients, types de rendez-vous, devis, lignes de devis, actes,
--     fiches de laboratoire, stock, ententes d'orthodontie, liste d'attente).
--     Les en-têtes et les statuts sont des HYPOTHÈSES, à confirmer sur les
--     exports du cabinet pilote ; chaque cabinet les ajuste par
--     public.declarer_jeu sans migration ;
--   · le branchement d'un cabinet (opérateur seul), qui l'active ;
--   · l'application des écarts au miroir tiroma_*, jeu par jeu, dans une seule
--     transaction avec le verdict rendu à B1 (public.acquitter_instantane) ;
--   · les gardes propres au dentaire (R9) : un jour ouvré vidé, trop de
--     disparitions, trop d'annulations en un seul relevé ;
--   · les événements d'agenda (création, annulation, report, déplacement,
--     absence, honoré, réapparition, fusion, présumé honoré), idempotents (R8),
--     datés de la réception de l'export ;
--   · les faits dérivés des patients, le rattachement des rendez-vous aux
--     plans (explicite, sinon prudent), le vocabulaire par règles (aucune IA),
--     la matrice des capacités (tiroma_capacites et B1) ;
--   · le relevé en retard, dit au cabinet sans nom de patient ;
--   · la file : Tiroma prend ses travaux dans la file du socle chaque minute
--     et les exécute en SQL, sans ouvrier.
--
-- Aucune écriture du miroir n'entre au journal (R11, lot T1b) ; le journal
-- ne porte que des compteurs. Vide n'est pas zéro (R3). Un patient effacé ne
-- revient pas (R12, tiroma_effaces). Tout se construit sur des patients
-- fictifs. Preuves : supabase/tests/database/tiroma_releve.test.sql
-- ═══════════════════════════════════════════════════════════════════════════

-- ── 1. Le contrat de relevé v1 : les jeux d'export de Logos_w ────────────
-- Chaque jeu dit comment reconnaître le fichier et comment ses colonnes
-- deviennent les codes de Tiroma. Les colonnes sensibles (noms, dates de
-- naissance, motifs) ne survivent chez B1 que le temps de l'application ;
-- le miroir les garde là où il les garde, et nulle part ailleurs.

select private.declarer_modele($j${
  "module": "tiroma", "logiciel": "logosw", "code": "agenda", "libelle": "Agenda",
  "motif_fichier": "^(agenda|rdv|rendez)", "entetes": ["N° RDV", "Début"],
  "colonnes": {
    "ref":               {"type": "texte", "entetes": ["N° RDV", "N° rendez-vous", "Id RDV"], "obligatoire": true, "libelle": "Numéro du rendez-vous"},
    "patient_ref":       {"type": "texte", "entetes": ["N° patient", "N° dossier", "Patient"], "libelle": "Numéro du patient"},
    "patient_nom":       {"type": "texte", "entetes": ["Nom patient", "Nom"], "sensible": true, "facultative": true},
    "patient_naissance": {"type": "date", "entetes": ["Naissance", "Date de naissance"], "sensible": true, "facultative": true},
    "praticien":         {"type": "texte", "entetes": ["Praticien", "Code praticien"]},
    "salle":             {"type": "texte", "entetes": ["Salle", "Fauteuil", "Agenda"]},
    "type":              {"type": "texte", "entetes": ["Type", "Type de RDV", "Motif RDV"]},
    "debut":             {"type": "dateheure", "entetes": ["Début", "Date début", "Date"], "obligatoire": true},
    "duree_min":         {"type": "entier", "entetes": ["Durée", "Durée (min)"]},
    "fin":               {"type": "dateheure", "entetes": ["Fin", "Date fin"], "facultative": true},
    "statut":            {"type": "texte", "entetes": ["Statut", "État"]},
    "motif":             {"type": "texte", "entetes": ["Motif", "Motif annulation"], "sensible": true, "facultative": true},
    "cree_le":           {"type": "dateheure", "entetes": ["Créé le", "Date de création"], "facultative": true},
    "devis_ref":         {"type": "texte", "entetes": ["N° devis", "Devis"], "facultative": true},
    "seance":            {"type": "entier", "entetes": ["Séance", "N° séance"], "facultative": true}
  },
  "cle": ["ref"], "complet": true, "confirmer_disparition": 1,
  "fenetre": {"colonne": "debut", "du": -30, "au": 120},
  "attendu": [{"jours": [1, 2, 3, 4, 5], "avant": "07:30", "alerter": false}],
  "source": "OMEGA/moteurs/dentaire.md, M0 (contrat de relevé v1, agenda) ; en-têtes et statuts : hypothèses à confirmer sur les exports du pilote"
}$j$::jsonb);

select private.declarer_modele($j${
  "module": "tiroma", "logiciel": "logosw", "code": "patients", "libelle": "Patients actifs",
  "motif_fichier": "^(patients?|liste)", "entetes": ["N° patient", "Nom"],
  "colonnes": {
    "ref":              {"type": "texte", "entetes": ["N° patient", "N° dossier"], "obligatoire": true},
    "nom":              {"type": "texte", "entetes": ["Nom"], "obligatoire": true, "sensible": true},
    "prenom":           {"type": "texte", "entetes": ["Prénom"], "sensible": true},
    "naissance":        {"type": "date", "entetes": ["Naissance", "Date de naissance"], "sensible": true},
    "praticien":        {"type": "texte", "entetes": ["Praticien", "Praticien habituel"]},
    "famille_ref":      {"type": "texte", "entetes": ["Famille", "N° famille", "Lien familial"], "facultative": true},
    "ne_pas_contacter": {"type": "booleen", "entetes": ["Ne pas contacter", "Refus contact"], "facultative": true},
    "questionnaire_le": {"type": "date", "entetes": ["Questionnaire", "Date questionnaire médical"], "facultative": true},
    "dernier_bilan_le": {"type": "date", "entetes": ["Dernier bilan", "Bilan de santé"], "facultative": true},
    "dernier_rdv_le":   {"type": "date", "entetes": ["Dernier RDV", "Dernière visite"], "facultative": true}
  },
  "cle": ["ref"], "complet": true, "confirmer_disparition": 2,
  "attendu": [{"jours": [1, 2, 3, 4, 5], "avant": "07:30", "alerter": false}],
  "source": "OMEGA/moteurs/dentaire.md, M0 (patients actifs) ; aucun téléphone, aucune note, aucune adresse ; hypothèses d'en-têtes"
}$j$::jsonb);

select private.declarer_modele($j${
  "module": "tiroma", "logiciel": "logosw", "code": "types_rdv", "libelle": "Types de rendez-vous",
  "motif_fichier": "^types?", "entetes": ["Libellé", "Durée"],
  "colonnes": {
    "libelle":   {"type": "texte", "entetes": ["Libellé", "Type de RDV"], "obligatoire": true},
    "code":      {"type": "texte", "entetes": ["Code"], "facultative": true},
    "couleur":   {"type": "texte", "entetes": ["Couleur"], "facultative": true},
    "categorie": {"type": "texte", "entetes": ["Catégorie"], "facultative": true},
    "duree_min": {"type": "entier", "entetes": ["Durée", "Durée par défaut"]},
    "salle":     {"type": "texte", "entetes": ["Salle", "Salle associée"], "facultative": true}
  },
  "cle": ["libelle"], "complet": true, "confirmer_disparition": 2,
  "source": "OMEGA/moteurs/dentaire.md, M0 (types de rendez-vous, vocabulaire) ; hypothèses d'en-têtes"
}$j$::jsonb);

select private.declarer_modele($j${
  "module": "tiroma", "logiciel": "logosw", "code": "devis", "libelle": "Devis et plans de traitement",
  "motif_fichier": "^devis(?![_ -]?lignes)", "entetes": ["N° devis", "Date"],
  "colonnes": {
    "numero":                {"type": "texte", "entetes": ["N° devis", "Numéro"], "obligatoire": true},
    "patient_ref":           {"type": "texte", "entetes": ["N° patient", "N° dossier", "Patient"], "obligatoire": true},
    "praticien":             {"type": "texte", "entetes": ["Praticien"]},
    "date":                  {"type": "date", "entetes": ["Date", "Date du devis"], "obligatoire": true},
    "statut":                {"type": "texte", "entetes": ["Statut", "État"]},
    "accepte_le":            {"type": "date", "entetes": ["Accepté le", "Date d'acceptation", "Signé le"], "facultative": true},
    "valide_jusqu_au":       {"type": "date", "entetes": ["Valide jusqu'au", "Validité"], "facultative": true},
    "type":                  {"type": "texte", "entetes": ["Type"], "facultative": true},
    "montant":               {"type": "decimal", "entetes": ["Montant", "Total"]},
    "part_amo":              {"type": "decimal", "entetes": ["Part AMO", "Sécurité sociale"], "facultative": true},
    "part_amc":              {"type": "decimal", "entetes": ["Part AMC", "Mutuelle"], "facultative": true},
    "reste_a_charge":        {"type": "decimal", "entetes": ["Reste à charge", "RAC"], "facultative": true},
    "panier":                {"type": "texte", "entetes": ["Panier"], "facultative": true},
    "alternative_100_sante": {"type": "booleen", "entetes": ["Alternative 100 % Santé", "Alternative 100% santé"], "facultative": true}
  },
  "cle": ["numero"], "complet": true, "confirmer_disparition": 2,
  "fenetre": {"colonne": "date", "du": -365, "au": 1},
  "attendu": [{"jours": [1, 2, 3, 4, 5], "avant": "07:30", "alerter": false}],
  "source": "OMEGA/moteurs/dentaire.md, M0 (devis et plans) et §7.2 (date d'acceptation dans Logos_w) ; hypothèses d'en-têtes"
}$j$::jsonb);

select private.declarer_modele($j${
  "module": "tiroma", "logiciel": "logosw", "code": "devis_lignes", "libelle": "Lignes des devis",
  "motif_fichier": "^(devis[_ -]?lignes|lignes)", "entetes": ["N° devis", "Rang"],
  "colonnes": {
    "numero":          {"type": "texte", "entetes": ["N° devis", "Numéro"], "obligatoire": true},
    "rang":            {"type": "entier", "entetes": ["Rang", "N° ligne", "Ligne"], "obligatoire": true},
    "devis_date":      {"type": "date", "entetes": ["Date du devis", "Date"], "obligatoire": true},
    "code":            {"type": "texte", "entetes": ["Code", "Code CCAM", "Acte"], "facultative": true},
    "libelle":         {"type": "texte", "entetes": ["Libellé"]},
    "dents":           {"type": "texte", "entetes": ["Dents", "Dent"], "facultative": true},
    "montant":         {"type": "decimal", "entetes": ["Montant", "Honoraires"]},
    "reste_a_charge":  {"type": "decimal", "entetes": ["Reste à charge", "RAC"], "facultative": true},
    "rdv_ref":         {"type": "texte", "entetes": ["Rdv", "N° RDV"], "facultative": true},
    "seance":          {"type": "entier", "entetes": ["Séance"], "facultative": true},
    "duree_min":       {"type": "entier", "entetes": ["Durée"], "facultative": true},
    "delai_min_jours": {"type": "entier", "entetes": ["Délai", "Délai avant le suivant"], "facultative": true},
    "fait_le":         {"type": "date", "entetes": ["Fait le", "Réalisé le"], "facultative": true}
  },
  "cle": ["numero", "rang"], "complet": true, "confirmer_disparition": 2,
  "fenetre": {"colonne": "devis_date", "du": -365, "au": 1},
  "attendu": [{"jours": [1, 2, 3, 4, 5], "avant": "07:30", "alerter": false}],
  "source": "OMEGA/moteurs/dentaire.md, M0 ; manuel Logos_w p. 62 (Rdv, Durée, Délai) ; hypothèses d'en-têtes"
}$j$::jsonb);

select private.declarer_modele($j${
  "module": "tiroma", "logiciel": "logosw", "code": "actes", "libelle": "Actes réalisés",
  "motif_fichier": "^(actes?|feuille|fse)", "entetes": ["N° acte", "Date"],
  "colonnes": {
    "ref":          {"type": "texte", "entetes": ["N° acte", "Id acte"], "obligatoire": true},
    "patient_ref":  {"type": "texte", "entetes": ["N° patient", "N° dossier", "Patient"], "obligatoire": true},
    "date":         {"type": "date", "entetes": ["Date", "Date de l'acte"], "obligatoire": true},
    "code":         {"type": "texte", "entetes": ["Code", "Code CCAM", "Acte"]},
    "libelle":      {"type": "texte", "entetes": ["Libellé"], "facultative": true},
    "dents":        {"type": "texte", "entetes": ["Dents", "Dent"], "facultative": true},
    "praticien":    {"type": "texte", "entetes": ["Praticien"]},
    "montant":      {"type": "decimal", "entetes": ["Montant", "Honoraires"]},
    "devis_numero": {"type": "texte", "entetes": ["N° devis", "Devis"], "facultative": true},
    "rdv_ref":      {"type": "texte", "entetes": ["N° RDV", "Rdv"], "facultative": true}
  },
  "cle": ["ref"], "complet": true, "confirmer_disparition": 2,
  "fenetre": {"colonne": "date", "du": -45, "au": 1},
  "attendu": [{"jours": [1, 2, 3, 4, 5], "avant": "07:30", "alerter": false}],
  "source": "OMEGA/moteurs/dentaire.md, M0 (actes réalisés) ; la reprise initiale de 36 mois passe par une fenêtre explicite du fichier ; hypothèses d'en-têtes"
}$j$::jsonb);

select private.declarer_modele($j${
  "module": "tiroma", "logiciel": "logosw", "code": "labo", "libelle": "Fiches de laboratoire",
  "motif_fichier": "^(labo|fiches?)", "entetes": ["N° fiche", "Laboratoire"],
  "colonnes": {
    "ref":               {"type": "texte", "entetes": ["N° fiche", "Id fiche"], "obligatoire": true},
    "patient_ref":       {"type": "texte", "entetes": ["N° patient", "N° dossier", "Patient"], "obligatoire": true},
    "laboratoire":       {"type": "texte", "entetes": ["Laboratoire", "Labo"]},
    "type_travail":      {"type": "texte", "entetes": ["Type de travail", "Travail"], "facultative": true},
    "envoye_le":         {"type": "date", "entetes": ["Envoyé le", "Date d'envoi"]},
    "retour_attendu_le": {"type": "date", "entetes": ["Retour attendu", "Date de retour prévue"], "facultative": true},
    "revenu_le":         {"type": "date", "entetes": ["Revenu le", "Date de retour"], "facultative": true},
    "statut":            {"type": "texte", "entetes": ["Statut", "État"], "facultative": true},
    "rdv_pose_ref":      {"type": "texte", "entetes": ["RDV de pose", "N° RDV pose"], "facultative": true},
    "rdv_empreinte_ref": {"type": "texte", "entetes": ["RDV d'empreinte", "N° RDV empreinte"], "facultative": true}
  },
  "cle": ["ref"], "complet": true, "confirmer_disparition": 2,
  "fenetre": {"colonne": "envoye_le", "du": -180, "au": 30},
  "source": "OMEGA/moteurs/dentaire.md, M0 (fiches de laboratoire, P18) ; manuel Logos_w p. 70-71 ; hypothèses d'en-têtes"
}$j$::jsonb);

select private.declarer_modele($j${
  "module": "tiroma", "logiciel": "logosw", "code": "stock", "libelle": "Stock",
  "motif_fichier": "^stock", "entetes": ["Référence", "Quantité"],
  "colonnes": {
    "reference":   {"type": "texte", "entetes": ["Référence", "Réf."], "obligatoire": true},
    "lot":         {"type": "texte", "entetes": ["Lot", "N° de lot"]},
    "famille":     {"type": "texte", "entetes": ["Famille", "Catégorie"], "facultative": true},
    "marque":      {"type": "texte", "entetes": ["Marque", "Fabricant"], "facultative": true},
    "diametre_mm": {"type": "decimal", "entetes": ["Diamètre", "Ø"], "facultative": true},
    "longueur_mm": {"type": "decimal", "entetes": ["Longueur"], "facultative": true},
    "quantite":    {"type": "entier", "entetes": ["Quantité", "Qté"], "obligatoire": true},
    "seuil":       {"type": "entier", "entetes": ["Seuil", "Seuil d'alerte"], "facultative": true},
    "peremption":  {"type": "date", "entetes": ["Péremption", "Date de péremption"], "facultative": true}
  },
  "cle": ["reference", "lot"], "complet": true, "confirmer_disparition": 2,
  "source": "OMEGA/moteurs/dentaire.md, M0 (stock, P22) ; manuel Logos_w p. 126-131 ; hypothèses d'en-têtes"
}$j$::jsonb);

select private.declarer_modele($j${
  "module": "tiroma", "logiciel": "logosw", "code": "odf", "libelle": "Ententes d'orthodontie",
  "motif_fichier": "^(odf|ententes?|ortho)", "entetes": ["N° entente", "Demande"],
  "colonnes": {
    "ref":         {"type": "texte", "entetes": ["N° entente", "Id"], "obligatoire": true},
    "patient_ref": {"type": "texte", "entetes": ["N° patient", "N° dossier", "Patient"], "obligatoire": true},
    "demande_le":  {"type": "date", "entetes": ["Demande", "Date de demande"]},
    "accord_le":   {"type": "date", "entetes": ["Accord", "Date d'accord"], "facultative": true},
    "debut_le":    {"type": "date", "entetes": ["Début", "Début du traitement"], "facultative": true},
    "semestre":    {"type": "entier", "entetes": ["Semestre", "Semestre en cours"], "facultative": true},
    "fin_le":      {"type": "date", "entetes": ["Fin", "Fin du traitement"], "facultative": true},
    "statut":      {"type": "texte", "entetes": ["Statut", "État"], "facultative": true}
  },
  "cle": ["ref"], "complet": true, "confirmer_disparition": 2,
  "source": "OMEGA/moteurs/dentaire.md, M0 (ententes d'orthodontie, P25) ; manuel Logos_w p. 45, 71-72 ; hypothèses d'en-têtes"
}$j$::jsonb);

select private.declarer_modele($j${
  "module": "tiroma", "logiciel": "logosw", "code": "attente", "libelle": "Liste d'attente",
  "motif_fichier": "^(attente|liste[_ -]?attente)", "entetes": ["N° attente", "Depuis"],
  "colonnes": {
    "ref":         {"type": "texte", "entetes": ["N° attente", "Id"], "obligatoire": true},
    "patient_ref": {"type": "texte", "entetes": ["N° patient", "N° dossier", "Patient"], "obligatoire": true},
    "depuis":      {"type": "date", "entetes": ["Depuis", "Date d'inscription"]},
    "praticien":   {"type": "texte", "entetes": ["Praticien"], "facultative": true},
    "type":        {"type": "texte", "entetes": ["Type", "Type de RDV"], "facultative": true},
    "duree_min":   {"type": "entier", "entetes": ["Durée"], "facultative": true}
  },
  "cle": ["ref"], "complet": true, "confirmer_disparition": 2,
  "source": "OMEGA/moteurs/dentaire.md, M0 (liste d'attente, P12) ; manuel Logos_w p. 166 ; hypothèses d'en-têtes"
}$j$::jsonb);

-- ── 2. Les abonnements, et le branchement d'un cabinet ───────────────────

insert into private.abonnements (evenement, module, genre) values
  ('releve.pret.tiroma', 'tiroma', 'tiroma.appliquer_releve'),
  ('releve.en_retard.tiroma', 'tiroma', 'tiroma.releve_en_retard')
on conflict do nothing;

-- Les jeux de Tiroma, dans l'ordre où ils s'appliquent : le vocabulaire et
-- les patients avant l'agenda, les devis avant leurs lignes, l'agenda avant
-- ce qui s'y rattache.
create function private.tiroma_ordre_jeu(p_code text) returns integer
language sql immutable set search_path = '' as $$
  select case p_code
    when 'types_rdv' then 1 when 'patients' then 2 when 'agenda' then 3 when 'devis' then 4 when 'devis_lignes' then 5
    when 'actes' then 6 when 'labo' then 7 when 'stock' then 8 when 'odf' then 9 when 'attente' then 10 end
$$;
revoke all on function private.tiroma_ordre_jeu(text) from public;

-- Brancher le logiciel d'un cabinet installé : un geste de l'opérateur Omega,
-- après la signature du contrat de sous-traitance (plan M0, accords humains).
-- Il crée le branchement B1 et ses jeux, active le cabinet, et le journalise.
create function private.tiroma_brancher_cabinet(p_client uuid, p_entite uuid, p_voie text default 'exports', p_libelle text default null)
returns uuid
language plpgsql volatile security definer set search_path = '' as $$
declare
  k public.tiroma_cabinets;
  e public.entites;
  v_id uuid;
  v_jeux text[];
  v_nom text;
begin
  select * into k from public.tiroma_cabinets where client_id = p_client and entite_id = p_entite;
  if not found then
    raise exception 'Cabinet introuvable : installez-le d''abord (tiroma_installer_cabinet).' using errcode = 'P0002';
  end if;
  if k.statut = 'clos' then
    raise exception 'Ce cabinet est clos.' using errcode = '55000';
  end if;
  select * into e from public.entites where client_id = p_client and id = p_entite;
  if not exists (select 1 from public.modeles_jeux m where m.module = 'tiroma' and m.logiciel = k.logiciel) then
    raise exception 'Aucun modèle d''export pour le logiciel « % » : Tiroma ne lit pour l''instant que Logos_w.', k.logiciel
      using errcode = 'P0002';
  end if;
  v_nom := coalesce(p_libelle, case k.logiciel when 'logosw' then 'Logos_w' when 'julie' then 'Julie' when 'veasy' then 'Veasy'
                                               else initcap(k.logiciel) end || ' — ' || e.nom);
  v_id := private.brancher(p_client, 'tiroma', k.logiciel, p_voie, left(v_nom, 120), p_entite, e.fuseau, null);
  select array_agg(j.code order by private.tiroma_ordre_jeu(j.code)) into v_jeux
  from public.branchements_jeux j where j.branchement_id = v_id;
  update public.tiroma_cabinets set statut = 'actif' where id = k.id and statut in ('installation', 'coupe');
  perform private.journaliser_module(p_client, 'tiroma', 'tiroma.connecteur_active', 'tiroma_cabinets', k.id::text,
    jsonb_build_object('branchement', v_id, 'voie', p_voie, 'logiciel', k.logiciel, 'jeux', to_jsonb(v_jeux)), p_entite);
  perform private.battre(p_client, 'tiroma_releve', jsonb_build_object('branchement', v_id, 'etat', 'branche'), interval '3 days');
  return v_id;
end $$;
revoke all on function private.tiroma_brancher_cabinet(uuid, uuid, text, text) from public;
grant execute on function private.tiroma_brancher_cabinet(uuid, uuid, text, text) to service_role;
comment on function private.tiroma_brancher_cabinet(uuid, uuid, text, text) is
  'Branche le logiciel d''un cabinet sur B1 (tous les jeux de son logiciel), l''active, journalise connecteur_active. Opérateur seul.';

create function public.tiroma_brancher_cabinet(p_client uuid, p_entite uuid, p_voie text default 'exports', p_libelle text default null)
returns uuid
language sql volatile security invoker set search_path = '' as $$
  select private.tiroma_brancher_cabinet(p_client, p_entite, p_voie, p_libelle)
$$;
revoke all on function public.tiroma_brancher_cabinet(uuid, uuid, text, text) from public, anon, authenticated;
grant execute on function public.tiroma_brancher_cabinet(uuid, uuid, text, text) to service_role;

-- ── 3. Les aides : lire une valeur typée, normaliser, classer, résoudre ──
-- B1 rend des valeurs typées : texte nettoyé, entier, décimal canonique
-- (« 12.4 »), date « 2026-10-12 », date-heure ISO avec décalage, booléen.

create function private.tiroma_v(p jsonb, p_cle text) returns text
language sql immutable set search_path = '' as $$
  select case
    when p is null or not (p ? p_cle) or jsonb_typeof(p -> p_cle) = 'null' then null
    when jsonb_typeof(p -> p_cle) = 'string' then nullif(btrim(p ->> p_cle), '')
    else p ->> p_cle end
$$;

create function private.tiroma_v_date(p jsonb, p_cle text) returns date
language sql immutable set search_path = '' as $$
  select case when private.tiroma_v(p, p_cle) ~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}' then left(private.tiroma_v(p, p_cle), 10)::date end
$$;

-- Une date-heure ISO ; une date seule dans une colonne date-heure vaut minuit
-- au fuseau du cabinet.
create function private.tiroma_v_instant(p jsonb, p_cle text, p_fuseau text) returns timestamptz
language sql stable set search_path = '' as $$
  select case
    when private.tiroma_v(p, p_cle) ~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}[T ][0-9]{2}:[0-9]{2}' then private.tiroma_v(p, p_cle)::timestamptz
    when private.tiroma_v(p, p_cle) ~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}$' then (private.tiroma_v(p, p_cle)::date::timestamp) at time zone p_fuseau
  end
$$;

create function private.tiroma_v_entier(p jsonb, p_cle text) returns integer
language sql immutable set search_path = '' as $$
  select case when private.tiroma_v(p, p_cle) ~ '^-?[0-9]{1,9}([.,]0+)?$'
              then split_part(replace(private.tiroma_v(p, p_cle), ',', '.'), '.', 1)::integer end
$$;

create function private.tiroma_v_decimal(p jsonb, p_cle text) returns numeric
language sql immutable set search_path = '' as $$
  select case when private.tiroma_v(p, p_cle) ~ '^-?[0-9]{1,12}(\.[0-9]{1,6})?$' then private.tiroma_v(p, p_cle)::numeric end
$$;

create function private.tiroma_v_bool(p jsonb, p_cle text) returns boolean
language sql immutable set search_path = '' as $$
  select case
    when p is not null and jsonb_typeof(p -> p_cle) = 'boolean' then (p ->> p_cle)::boolean
    when lower(private.tiroma_v(p, p_cle)) in ('true', 'oui', 'vrai', '1', 'x', 'yes', 'o') then true
    when lower(private.tiroma_v(p, p_cle)) in ('false', 'non', 'faux', '0', 'no', 'n') then false end
$$;

create function private.tiroma_dents_fdi() returns smallint[]
language sql immutable set search_path = '' as $$
  select array[11, 12, 13, 14, 15, 16, 17, 18, 21, 22, 23, 24, 25, 26, 27, 28,
               31, 32, 33, 34, 35, 36, 37, 38, 41, 42, 43, 44, 45, 46, 47, 48,
               51, 52, 53, 54, 55, 61, 62, 63, 64, 65, 71, 72, 73, 74, 75, 81, 82, 83, 84, 85]::smallint[]
$$;

-- « 11 12 », « 11,12 », « 11-12 » : les dents en numérotation FDI, rien d'autre.
create function private.tiroma_v_dents(p jsonb, p_cle text) returns smallint[]
language sql immutable set search_path = '' as $$
  select nullif(array(
    select distinct x::smallint as d
    from regexp_split_to_table(coalesce(private.tiroma_v(p, p_cle), ''), '[^0-9]+') x
    where x ~ '^[1-8][1-8]$' and x::smallint = any (private.tiroma_dents_fdi())
    order by d), '{}'::smallint[])
$$;

-- Minuscules, sans accents, espaces resserrés : pour comparer des libellés.
-- Sans extension : les accents du français, et rien d'autre à installer.
create function private.tiroma_normaliser(p text) returns text
language sql immutable set search_path = '' as $$
  select nullif(regexp_replace(
           translate(replace(replace(lower(btrim(p)), 'œ', 'oe'), 'æ', 'ae'),
                     'àâäáãåéèêëíìîïóòôöõúùûüýÿçñ', 'aaaaaaeeeeiiiiooooouuuuyycn'),
           '\s+', ' ', 'g'), '')
$$;

-- Le statut d'un rendez-vous tel que le logiciel l'écrit → celui de Tiroma.
-- Nul : inconnu, à classer (le relevé ne bloque pas).
create function private.tiroma_statut_rdv(p text) returns text
language plpgsql stable set search_path = '' as $$
declare n text := private.tiroma_normaliser(p);
begin
  return case
    when n is null then 'prevu'
    when n ~ '(manqu|absent|absence|lapin|non venu|pas venu|no.?show|^nv$)' then 'manque'
    when n ~ '(supprim|efface)' then 'supprime'
    when n ~ '(report|deplac)' then 'reporte'
    when n ~ 'annul' then 'annule'
    when n ~ '(honor|venu|present|realis|termin|fait|effectu|arriv|en cours|fini)' then 'honore'
    when n ~ '(prevu|confirm|attente|a venir|planifi|pris|valid|^ok$|rappel|programm)' then 'prevu'
    else null end;
end $$;

create function private.tiroma_statut_devis(p text) returns text
language plpgsql stable set search_path = '' as $$
declare n text := private.tiroma_normaliser(p);
begin
  return case
    when n is null then 'presente'
    when n ~ '(refus|rejet)' then 'refuse'
    when n ~ '(abandon|annul|caduc)' then 'abandonne'
    when n ~ '(expir|perim)' then 'expire'
    when n ~ '(termin|achev|fini|realis|solde)' then 'termine'
    when n ~ '(commenc|en cours|debut)' then 'commence'
    when n ~ '(accept|sign|valid)' and n !~ '(non|pas)' then 'signe'
    when n ~ '(attente|propos|present|emis|edit|envoy|imprim|nouveau|ouvert)' then 'presente'
    else null end;
end $$;

create function private.tiroma_type_devis(p text) returns text
language sql stable set search_path = '' as $$
  select case
    when private.tiroma_normaliser(p) ~ '(odf|ortho)' then 'odf'
    when private.tiroma_normaliser(p) ~ '(hors|^hn)' then 'hors_nomenclature'
    else 'conventionnel' end
$$;

create function private.tiroma_panier(p text) returns text
language sql stable set search_path = '' as $$
  select case
    when private.tiroma_normaliser(p) ~ '100' then '100_sante'
    when private.tiroma_normaliser(p) ~ '(maitris|moder)' then 'maitrise'
    when private.tiroma_normaliser(p) ~ 'mixte' then 'mixte'
    when private.tiroma_normaliser(p) ~ 'libre' then 'libre'
    else null end
$$;

-- Le vocabulaire du cabinet, rangé par règles dans une famille fermée ; ce
-- qui reste attend la main du titulaire (le plan prévoit l'IA sur les
-- libellés seuls, plus tard, sur Bedrock : aucune ici).
create function private.tiroma_famille_par_regle(p_libelle text,
  out famille text, out necessite_labo boolean, out chirurgie boolean, out capacite text, out confiance text)
language plpgsql stable set search_path = '' as $$
declare
  n text := private.tiroma_normaliser(p_libelle);
  r record;
  v_matches integer := 0;
begin
  famille := null; necessite_labo := false; chirurgie := false; capacite := null; confiance := null;
  if n is null then
    return;
  end if;
  for r in
    select * from (values
      (1,  '(reunion|pause|formation|conge|vacance|ferm|perso|admin|bloqu|indispo|repas|dejeuner|absent)', 'personnel', false, false, null::text),
      (2,  '(urgence|urg\.|^urg |douleur|sos)', 'urgence', false, false, 'soins'),
      (3,  '(premiere|1ere|1 ere|nouveau patient|nouv\.? ?pat|premier rdv|1er rdv)', 'premiere_consultation', false, false, 'soins'),
      (4,  '(ortho|odf|bague|aligneur|multi.?attache|gouttiere)', 'orthodontie', false, false, 'orthodontie'),
      (5,  'implant', 'implant', false, true, 'chirurgie'),
      (6,  '(extraction|extrac|avulsion|chir|sagesse|dds|kyste|greffe|sinus|frein|biopsie)', 'chirurgie', false, true, 'chirurgie'),
      (7,  '(paro|surfacage|curetage|lambeau)', 'parodontie', false, false, 'soins'),
      (8,  '(endo|devital|canal|pulp|radiculaire|racine)', 'endodontie', false, false, 'soins'),
      (9,  '(couronne|bridge|inlay|onlay|proth|appareil|stellite|facette|empreinte|essayage|scell|pose|dentier|chape|armature)', 'prothese', true, false, 'prothese'),
      (10, '(detart|prophy|hygien|polissage|nettoyage)', 'detartrage', false, false, 'prevention'),
      (11, '(controle|bilan|visite|check|suivi|revision|ctrl|examen|consultation)', 'controle', false, false, 'prevention'),
      (12, '(soin|carie|composite|obturation|plombage|amalgame|scellement|fluor|pansement|cvi|reconstitution)', 'soin_conservateur', false, false, 'soins')
    ) as t(ordre, motif, fam, labo, chir, cap)
    order by t.ordre
  loop
    if n ~ r.motif then
      v_matches := v_matches + 1;
      if famille is null then
        famille := r.fam; necessite_labo := r.labo; chirurgie := r.chir; capacite := r.cap;
      end if;
    end if;
  end loop;
  if famille = 'orthodontie' then
    famille := case when n ~ '(pose|debut|collage)' then 'orthodontie_pose' else 'orthodontie_controle' end;
  elsif famille = 'implant' then
    if n ~ '(proth|pilier|couronne|cicatri|empreinte)' then
      famille := 'implant_prothese'; necessite_labo := true; chirurgie := false;
    else
      famille := 'implant_chirurgie';
    end if;
  elsif famille = 'prothese' then
    famille := case when n ~ 'empreinte' then 'prothese_empreinte'
                    when n ~ '(pose|scell|collage|livraison)' then 'prothese_pose'
                    else 'prothese_preparation' end;
  end if;
  if famille is not null then
    confiance := case when v_matches = 1 then 'haute' else 'moyenne' end;
  end if;
end $$;

-- Un praticien que le logiciel nomme par un code : le nôtre s'il le porte
-- déjà (ou porte ce nom), sinon créé à la volée, à renommer dans les réglages.
create function private.tiroma_praticien_par_ref(p_client uuid, p_entite uuid, p_ref text, p_quand timestamptz) returns uuid
language plpgsql volatile security definer set search_path = '' as $$
declare v_id uuid; v_sans_ref boolean;
begin
  if p_ref is null then
    return null;
  end if;
  select p.id, p.source_ref is null into v_id, v_sans_ref from public.tiroma_praticiens p
  where p.client_id = p_client and p.entite_id = p_entite
    and (p.source_ref = left(p_ref, 200) or (p.source_ref is null and lower(p.nom_affiche) = lower(p_ref)))
  order by (p.source_ref = left(p_ref, 200)) desc, p.cree_le
  limit 1;
  if v_id is null then
    insert into public.tiroma_praticiens (client_id, entite_id, source_ref, nom_affiche, metier, cree_le)
    values (p_client, p_entite, left(p_ref, 200), left(p_ref, 120), 'collaborateur', p_quand)
    returning id into v_id;
  elsif v_sans_ref then
    update public.tiroma_praticiens set source_ref = left(p_ref, 200) where id = v_id;
  end if;
  return v_id;
end $$;

create function private.tiroma_fauteuil_par_ref(p_client uuid, p_entite uuid, p_ref text, p_quand timestamptz) returns uuid
language plpgsql volatile security definer set search_path = '' as $$
declare v_id uuid; v_sans_ref boolean;
begin
  if p_ref is null then
    return null;
  end if;
  select f.id, f.source_ref is null into v_id, v_sans_ref from public.tiroma_fauteuils f
  where f.client_id = p_client and f.entite_id = p_entite
    and (f.source_ref = left(p_ref, 200) or (f.source_ref is null and lower(f.nom) = lower(p_ref)))
  order by (f.source_ref = left(p_ref, 200)) desc, f.cree_le
  limit 1;
  if v_id is null then
    insert into public.tiroma_fauteuils (client_id, entite_id, source_ref, nom, cree_le)
    values (p_client, p_entite, left(p_ref, 200), left(p_ref, 80), p_quand)
    returning id into v_id;
  elsif v_sans_ref then
    update public.tiroma_fauteuils set source_ref = left(p_ref, 200) where id = v_id;
  end if;
  return v_id;
end $$;

-- Un type de rendez-vous par son libellé : connu, il est revu ; nouveau, il
-- est classé par règles (proposé) ou laissé à classer. Une durée ou une
-- catégorie du logiciel ne touche pas un type que le titulaire a validé.
create function private.tiroma_type_par_libelle(p_client uuid, p_entite uuid, p_libelle text, p_categorie text, p_duree integer, p_quand timestamptz)
returns uuid
language plpgsql volatile security definer set search_path = '' as $$
declare
  v public.tiroma_types_rdv;
  f record;
begin
  if p_libelle is null then
    return null;
  end if;
  select * into v from public.tiroma_types_rdv
  where client_id = p_client and entite_id = p_entite and libelle_source = left(p_libelle, 200);
  if found then
    update public.tiroma_types_rdv
       set vu_dernier_le = p_quand,
           categorie_source = case when statut <> 'valide' then coalesce(left(p_categorie, 120), categorie_source) else categorie_source end,
           duree_defaut_min = case when statut <> 'valide' and p_duree between 5 and 600 then p_duree else duree_defaut_min end
     where id = v.id
       and (vu_dernier_le is distinct from p_quand
            or (statut <> 'valide' and (p_categorie is not null or p_duree between 5 and 600)));
    return v.id;
  end if;
  select * into f from private.tiroma_famille_par_regle(p_libelle);
  insert into public.tiroma_types_rdv (client_id, entite_id, libelle_source, categorie_source, duree_defaut_min, famille,
                                       necessite_labo, chirurgie, capacite_requise, classe_par, confiance, statut,
                                       vu_dernier_le, cree_le)
  values (p_client, p_entite, left(p_libelle, 200), left(p_categorie, 120), case when p_duree between 5 and 600 then p_duree end,
          f.famille, coalesce(f.necessite_labo, false), coalesce(f.chirurgie, false), f.capacite,
          case when f.famille is not null then 'regle' end, case when f.famille is not null then f.confiance end,
          case when f.famille is not null then 'propose' else 'a_classer' end, p_quand, p_quand)
  returning id into v.id;
  return v.id;
end $$;

-- Un patient par sa référence dans le logiciel : connu ; ou créé (un
-- rendez-vous peut précéder la liste des patients) ; ou refusé s'il a été
-- effacé à sa demande (R12 : il ne revient pas).
create function private.tiroma_patient_par_ref(p_client uuid, p_entite uuid, p_ref text, p_nom text, p_prenom text, p_naissance date, p_quand timestamptz)
returns uuid
language plpgsql volatile security definer set search_path = '' as $$
declare v_id uuid;
begin
  if p_ref is null then
    return null;
  end if;
  select id into v_id from public.tiroma_patients
  where client_id = p_client and entite_id = p_entite and source_ref = left(p_ref, 200);
  if found then
    return v_id;
  end if;
  if exists (select 1 from public.tiroma_effaces x
             where x.client_id = p_client and x.entite_id = p_entite
               and x.empreinte_ref = private.tiroma_empreinte_ref(p_client, p_entite, left(p_ref, 200))) then
    return null;
  end if;
  insert into public.tiroma_patients (client_id, entite_id, source_ref, nom, prenom, naissance, vu_premier_le, vu_dernier_le)
  values (p_client, p_entite, left(p_ref, 200),
          left(coalesce(nullif(btrim(p_nom), ''), '(patient ' || left(p_ref, 60) || ')'), 120),
          left(nullif(btrim(p_prenom), ''), 120), case when p_naissance >= date '1900-01-01' then p_naissance end,
          p_quand, p_quand)
  returning id into v_id;
  return v_id;
end $$;

-- Ce qu'un événement d'agenda garde d'un rendez-vous : des heures, un
-- fauteuil, un praticien, un statut. Jamais un nom.
create function private.tiroma_rdv_json(r public.tiroma_rendez_vous) returns jsonb
language sql immutable set search_path = '' as $$
  select jsonb_build_object('debut', r.debut, 'fin', r.fin, 'fauteuil_id', r.fauteuil_id, 'praticien_id', r.praticien_id, 'statut', r.statut)
$$;

-- Un événement d'agenda, une seule fois (R8) : rend 1 s'il est nouveau.
create function private.tiroma_evenement(p_client uuid, p_entite uuid, p_rdv uuid, p_patient uuid, p_type text,
                                         p_avant jsonb, p_apres jsonb, p_detecte timestamptz, p_releve uuid, p_cle text)
returns integer
language plpgsql volatile security definer set search_path = '' as $$
declare n integer;
begin
  insert into public.tiroma_evenements_agenda (client_id, entite_id, rendez_vous_id, patient_id, type, avant, apres, detecte_le, releve_id, cle_idempotence)
  values (p_client, p_entite, p_rdv, p_patient, p_type, p_avant, p_apres, p_detecte, p_releve, left(p_cle, 200))
  on conflict (client_id, cle_idempotence) do nothing;
  get diagnostics n = row_count;
  return n;
end $$;

revoke all on function private.tiroma_v(jsonb, text), private.tiroma_v_date(jsonb, text), private.tiroma_v_instant(jsonb, text, text),
  private.tiroma_v_entier(jsonb, text), private.tiroma_v_decimal(jsonb, text), private.tiroma_v_bool(jsonb, text),
  private.tiroma_dents_fdi(), private.tiroma_v_dents(jsonb, text), private.tiroma_normaliser(text),
  private.tiroma_statut_rdv(text), private.tiroma_statut_devis(text), private.tiroma_type_devis(text), private.tiroma_panier(text),
  private.tiroma_famille_par_regle(text), private.tiroma_praticien_par_ref(uuid, uuid, text, timestamptz),
  private.tiroma_fauteuil_par_ref(uuid, uuid, text, timestamptz), private.tiroma_type_par_libelle(uuid, uuid, text, text, integer, timestamptz),
  private.tiroma_patient_par_ref(uuid, uuid, text, text, text, date, timestamptz), private.tiroma_rdv_json(public.tiroma_rendez_vous),
  private.tiroma_evenement(uuid, uuid, uuid, uuid, text, jsonb, jsonb, timestamptz, uuid, text)
  from public;

-- ── 4. L'application des écarts au miroir, jeu par jeu ───────────────────
-- Chaque fonction lit les écarts d'un export (public.instantanes_ecarts :
-- ajout, modification, disparition), les applique, et rend ses compteurs.
-- p_reprise : premier export du jeu (aucun état avant) : le miroir se
-- remplit, aucun événement ne part. p_detecte : la réception de l'export,
-- qui date tout (vu, disparu, détecté).

-- Le vocabulaire : un type nouveau est classé par règles ou laissé à classer ;
-- un type qui disparaît de la liste reste connu (ses rendez-vous le portent).
create function private.tiroma_appliquer_types(p_client uuid, p_entite uuid, p_instantane uuid, p_reprise boolean,
                                               p_detecte timestamptz, p_fuseau text, p_releve uuid) returns jsonb
language plpgsql volatile security definer set search_path = '' as $$
declare
  e record;
  v_lib text;
  n_aj integer := 0; n_mod integer := 0; n_disp integer := 0; n_ign integer := 0;
begin
  for e in select x.nature, x.avant, x.apres from public.instantanes_ecarts x where x.instantane_id = p_instantane order by x.n nulls last, x.id loop
    if e.nature = 'disparition' then
      n_disp := n_disp + 1;
      continue;
    end if;
    v_lib := private.tiroma_v(e.apres, 'libelle');
    if v_lib is null then
      n_ign := n_ign + 1;
      continue;
    end if;
    perform private.tiroma_type_par_libelle(p_client, p_entite, v_lib, private.tiroma_v(e.apres, 'categorie'),
                                            private.tiroma_v_entier(e.apres, 'duree_min'), p_detecte);
    if e.nature = 'ajout' then n_aj := n_aj + 1; else n_mod := n_mod + 1; end if;
  end loop;
  return jsonb_build_object('ajouts', n_aj, 'modifications', n_mod, 'disparitions', n_disp, 'ignores', n_ign,
    'a_classer', (select count(*) from public.tiroma_types_rdv t
                  where t.client_id = p_client and t.entite_id = p_entite and t.statut = 'a_classer'));
end $$;

-- Les patients : la copie minimale ; un patient disparu de la liste des
-- actifs est inactif, et fusionné s'il réapparaît sous une autre référence
-- (même nom, même prénom, même naissance) : une fusion, pas des annulations.
create function private.tiroma_appliquer_patients(p_client uuid, p_entite uuid, p_instantane uuid, p_reprise boolean,
                                                  p_detecte timestamptz, p_fuseau text, p_releve uuid) returns jsonb
language plpgsql volatile security definer set search_path = '' as $$
declare
  e record;
  r public.tiroma_patients;
  v jsonb;
  v_ref text;
  v_cible uuid;
  v_prat uuid;
  v_naissance date;
  n_aj integer := 0; n_mod integer := 0; n_disp integer := 0; n_ev integer := 0; n_ign integer := 0; n_effaces integer := 0;
begin
  for e in select x.nature, x.avant, x.apres from public.instantanes_ecarts x where x.instantane_id = p_instantane order by x.n nulls last, x.id loop
    if e.nature = 'disparition' then
      v_ref := private.tiroma_v(e.avant, 'ref');
      select * into r from public.tiroma_patients where client_id = p_client and entite_id = p_entite and source_ref = v_ref;
      if v_ref is null or not found then
        n_ign := n_ign + 1;
        continue;
      end if;
      n_disp := n_disp + 1;
      if r.actif then
        select p.id into v_cible from public.tiroma_patients p
        where p.client_id = p_client and p.entite_id = p_entite and p.id <> r.id and p.actif and p.fusionne_dans_id is null
          and p.naissance is not null and p.naissance = r.naissance
          and lower(p.nom) = lower(r.nom) and lower(coalesce(p.prenom, '')) = lower(coalesce(r.prenom, ''))
        order by p.vu_premier_le desc
        limit 1;
        update public.tiroma_patients
           set actif = false, disparu_le = p_detecte, fusionne_dans_id = v_cible, vu_dernier_le = p_detecte
         where id = r.id;
        if v_cible is not null and not p_reprise then
          n_ev := n_ev + private.tiroma_evenement(p_client, p_entite, null, r.id, 'fusion', null,
                    jsonb_build_object('patient_id', v_cible), p_detecte, p_releve, 'fusion:' || r.source_ref || ':' || p_instantane);
        end if;
      end if;
      continue;
    end if;

    v := e.apres;
    v_ref := private.tiroma_v(v, 'ref');
    if v_ref is null then
      n_ign := n_ign + 1;
      continue;
    end if;
    if exists (select 1 from public.tiroma_effaces x
               where x.client_id = p_client and x.entite_id = p_entite
                 and x.empreinte_ref = private.tiroma_empreinte_ref(p_client, p_entite, left(v_ref, 200))) then
      n_effaces := n_effaces + 1;
      continue;
    end if;
    v_prat := private.tiroma_praticien_par_ref(p_client, p_entite, private.tiroma_v(v, 'praticien'), p_detecte);
    v_naissance := private.tiroma_v_date(v, 'naissance');
    v_naissance := case when v_naissance >= date '1900-01-01' then v_naissance end;
    select * into r from public.tiroma_patients where client_id = p_client and entite_id = p_entite and source_ref = left(v_ref, 200);
    if not found then
      insert into public.tiroma_patients (client_id, entite_id, source_ref, nom, prenom, naissance, praticien_habituel_id, famille_ref,
                                          ne_pas_contacter, questionnaire_le, dernier_rdv_le, dernier_controle_le, empreinte,
                                          vu_premier_le, vu_dernier_le)
      values (p_client, p_entite, left(v_ref, 200),
              left(coalesce(private.tiroma_v(v, 'nom'), '(patient ' || left(v_ref, 60) || ')'), 120),
              left(private.tiroma_v(v, 'prenom'), 120), v_naissance, v_prat, left(private.tiroma_v(v, 'famille_ref'), 200),
              coalesce(private.tiroma_v_bool(v, 'ne_pas_contacter'), false), private.tiroma_v_date(v, 'questionnaire_le'),
              private.tiroma_v_date(v, 'dernier_rdv_le'), private.tiroma_v_date(v, 'dernier_bilan_le'),
              encode(sha256(convert_to(v::text, 'UTF8')), 'hex'), p_detecte, p_detecte);
      n_aj := n_aj + 1;
    else
      update public.tiroma_patients
         set nom = left(coalesce(private.tiroma_v(v, 'nom'), nom), 120),
             prenom = left(coalesce(private.tiroma_v(v, 'prenom'), prenom), 120),
             naissance = coalesce(v_naissance, naissance),
             praticien_habituel_id = coalesce(v_prat, praticien_habituel_id),
             famille_ref = left(private.tiroma_v(v, 'famille_ref'), 200),
             ne_pas_contacter = coalesce(private.tiroma_v_bool(v, 'ne_pas_contacter'), false),
             questionnaire_le = coalesce(private.tiroma_v_date(v, 'questionnaire_le'), questionnaire_le),
             dernier_rdv_le = greatest(private.tiroma_v_date(v, 'dernier_rdv_le'), dernier_rdv_le),
             dernier_controle_le = greatest(private.tiroma_v_date(v, 'dernier_bilan_le'), dernier_controle_le),
             actif = true, disparu_le = null, fusionne_dans_id = null,
             empreinte = encode(sha256(convert_to(v::text, 'UTF8')), 'hex'), vu_dernier_le = p_detecte
       where id = r.id;
      n_mod := n_mod + 1;
    end if;
  end loop;
  return jsonb_build_object('ajouts', n_aj, 'modifications', n_mod, 'disparitions', n_disp, 'evenements', n_ev,
                            'ignores', n_ign, 'effaces_ignores', n_effaces);
end $$;

-- L'agenda : le miroir des rendez-vous et les événements (plan M0, étape 5).
-- Un créneau libéré (annulé, supprimé, reporté, disparu, déplacé) n'est un
-- événement que s'il est à venir : c'est ce que M1 peut sauver. Les
-- libérations se jugent quand tout l'export est appliqué : un nouveau
-- rendez-vous du même patient dans ce même relevé fait un report, sinon une
-- annulation.
create function private.tiroma_appliquer_agenda(p_client uuid, p_entite uuid, p_instantane uuid, p_reprise boolean,
                                                p_detecte timestamptz, p_fuseau text, p_releve uuid) returns jsonb
language plpgsql volatile security definer set search_path = '' as $$
declare
  e record;
  r public.tiroma_rendez_vous;
  v_nouveau public.tiroma_rendez_vous;
  v jsonb;
  l jsonb;
  v_lib jsonb[] := '{}'::jsonb[];
  v_ref text; v_patient_ref text; v_motif text; v_statut text;
  v_patient uuid; v_prat uuid; v_faut uuid; v_type uuid; v_plan uuid;
  v_debut timestamptz; v_fin timestamptz; v_duree integer;
  v_avant jsonb; v_apres jsonb;
  n_aj integer := 0; n_mod integer := 0; n_disp integer := 0; n_ev integer := 0; n_classer integer := 0; n_ign integer := 0;
begin
  for e in select x.nature, x.avant, x.apres from public.instantanes_ecarts x where x.instantane_id = p_instantane order by x.n nulls last, x.id loop
    if e.nature = 'disparition' then
      v_ref := private.tiroma_v(e.avant, 'ref');
      select * into r from public.tiroma_rendez_vous where client_id = p_client and entite_id = p_entite and source_ref = v_ref;
      if v_ref is null or not found then
        n_ign := n_ign + 1;
        continue;
      end if;
      n_disp := n_disp + 1;
      if r.statut not in ('annule', 'supprime') then
        if not p_reprise and r.statut in ('prevu', 'honore') and r.debut > p_detecte then
          v_lib := v_lib || jsonb_build_object('rdv', r.id, 'patient', r.patient_id, 'avant', private.tiroma_rdv_json(r),
                                               'nature', 'annulation', 'ref', r.source_ref);
        end if;
        update public.tiroma_rendez_vous
           set statut = 'supprime', presume = null, disparu_le = p_detecte, vu_dernier_le = p_detecte
         where id = r.id;
      else
        update public.tiroma_rendez_vous set disparu_le = coalesce(disparu_le, p_detecte), vu_dernier_le = p_detecte where id = r.id;
      end if;
      continue;
    end if;

    v := e.apres;
    v_ref := private.tiroma_v(v, 'ref');
    v_debut := private.tiroma_v_instant(v, 'debut', p_fuseau);
    if v_ref is null or v_debut is null then
      n_ign := n_ign + 1;
      continue;
    end if;
    v_type := private.tiroma_type_par_libelle(p_client, p_entite, private.tiroma_v(v, 'type'), null, null, p_detecte);
    v_duree := private.tiroma_v_entier(v, 'duree_min');
    v_fin := private.tiroma_v_instant(v, 'fin', p_fuseau);
    if v_fin is null then
      if v_duree is null or v_duree < 1 then
        select t.duree_defaut_min into v_duree from public.tiroma_types_rdv t where t.id = v_type;
      end if;
      v_fin := v_debut + make_interval(mins => coalesce(v_duree, 30));
    end if;
    if v_fin <= v_debut then
      v_fin := v_debut + interval '30 minutes';
    end if;
    if v_fin - v_debut > interval '12 hours' then
      v_fin := v_debut + interval '12 hours';
    end if;
    v_statut := private.tiroma_statut_rdv(private.tiroma_v(v, 'statut'));
    if v_statut is null then
      v_statut := 'prevu';
      n_classer := n_classer + 1;
    end if;
    v_patient_ref := private.tiroma_v(v, 'patient_ref');
    v_patient := private.tiroma_patient_par_ref(p_client, p_entite, v_patient_ref, private.tiroma_v(v, 'patient_nom'), null,
                                                private.tiroma_v_date(v, 'patient_naissance'), p_detecte);
    v_prat := private.tiroma_praticien_par_ref(p_client, p_entite, private.tiroma_v(v, 'praticien'), p_detecte);
    v_faut := private.tiroma_fauteuil_par_ref(p_client, p_entite, private.tiroma_v(v, 'salle'), p_detecte);
    v_plan := null;
    select p.id into v_plan from public.tiroma_plans p
    where p.client_id = p_client and p.entite_id = p_entite and p.source_ref = private.tiroma_v(v, 'devis_ref');
    -- Le motif n'est gardé que sous forme de code : un mot, jamais un texte.
    v_motif := private.tiroma_v(v, 'motif');
    v_motif := case when v_motif ~ '^[[:alnum:]_.-]{1,40}$' then v_motif end;

    select * into r from public.tiroma_rendez_vous where client_id = p_client and entite_id = p_entite and source_ref = left(v_ref, 200);
    if not found then
      insert into public.tiroma_rendez_vous (client_id, entite_id, source_ref, patient_id, praticien_id, fauteuil_id, type_rdv_id,
                                             debut, fin, statut, motif_code, plan_id, seance_rang, cree_source_le, empreinte,
                                             vu_premier_le, vu_dernier_le)
      values (p_client, p_entite, left(v_ref, 200), v_patient, v_prat, v_faut, v_type, v_debut, v_fin, v_statut, v_motif, v_plan,
              nullif(greatest(private.tiroma_v_entier(v, 'seance'), 0), 0), private.tiroma_v_instant(v, 'cree_le', p_fuseau),
              encode(sha256(convert_to(v::text, 'UTF8')), 'hex'), p_detecte, p_detecte)
      returning * into r;
      n_aj := n_aj + 1;
      if not p_reprise and r.statut = 'prevu' and r.debut > p_detecte then
        n_ev := n_ev + private.tiroma_evenement(p_client, p_entite, r.id, r.patient_id, 'creation', null, private.tiroma_rdv_json(r),
                                                p_detecte, p_releve, 'creation:' || r.source_ref || ':' || p_instantane);
      end if;
      continue;
    end if;

    n_mod := n_mod + 1;
    v_avant := private.tiroma_rdv_json(r);
    if v_patient_ref is null then
      v_patient := r.patient_id;
    end if;
    update public.tiroma_rendez_vous
       set patient_id = v_patient, praticien_id = v_prat, fauteuil_id = v_faut, type_rdv_id = v_type,
           debut = v_debut, fin = v_fin, statut = v_statut,
           motif_code = coalesce(v_motif, case when v_statut = r.statut then motif_code end),
           plan_id = coalesce(v_plan, plan_id),
           seance_rang = coalesce(nullif(greatest(private.tiroma_v_entier(v, 'seance'), 0), 0), seance_rang),
           cree_source_le = coalesce(private.tiroma_v_instant(v, 'cree_le', p_fuseau), cree_source_le),
           presume = case when v_statut = 'prevu' then presume end,
           empreinte = encode(sha256(convert_to(v::text, 'UTF8')), 'hex'),
           vu_dernier_le = p_detecte, disparu_le = null
     where id = r.id
     returning * into v_nouveau;
    if p_reprise then
      continue;
    end if;
    v_apres := private.tiroma_rdv_json(v_nouveau);
    if r.statut not in ('annule', 'supprime', 'reporte') and v_statut in ('annule', 'supprime', 'reporte') then
      if r.debut > p_detecte then
        v_lib := v_lib || jsonb_build_object('rdv', r.id, 'patient', r.patient_id, 'avant', v_avant,
                                             'nature', case when v_statut = 'reporte' then 'report' else 'annulation' end, 'ref', r.source_ref);
      end if;
    elsif v_statut = 'manque' and r.statut <> 'manque' then
      n_ev := n_ev + private.tiroma_evenement(p_client, p_entite, r.id, v_nouveau.patient_id, 'absence', v_avant, v_apres,
                                              p_detecte, p_releve, 'absence:' || r.source_ref);
    elsif v_statut = 'honore' and r.statut <> 'honore' then
      n_ev := n_ev + private.tiroma_evenement(p_client, p_entite, r.id, v_nouveau.patient_id, 'honore', v_avant, v_apres,
                                              p_detecte, p_releve, 'honore:' || r.source_ref);
    elsif r.statut in ('annule', 'supprime', 'reporte') and v_statut = 'prevu' then
      n_ev := n_ev + private.tiroma_evenement(p_client, p_entite, r.id, v_nouveau.patient_id, 'reapparition', v_avant, v_apres,
                                              p_detecte, p_releve, 'reapparition:' || r.source_ref || ':' || p_instantane);
    elsif v_statut = 'prevu' and r.statut = 'prevu'
          and (r.debut, r.fin, r.fauteuil_id, r.praticien_id) is distinct from (v_nouveau.debut, v_nouveau.fin, v_nouveau.fauteuil_id, v_nouveau.praticien_id) then
      if r.debut > p_detecte then
        n_ev := n_ev + private.tiroma_evenement(p_client, p_entite, r.id, v_nouveau.patient_id, 'deplacement', v_avant, v_apres,
                                                p_detecte, p_releve, 'deplacement:' || r.source_ref || ':' || p_instantane);
      end if;
    elsif (r.type_rdv_id, r.plan_id) is distinct from (v_nouveau.type_rdv_id, v_nouveau.plan_id)
          or (r.patient_id is distinct from v_nouveau.patient_id
              and not exists (select 1 from public.tiroma_patients p where p.id = r.patient_id and p.fusionne_dans_id = v_nouveau.patient_id)) then
      n_ev := n_ev + private.tiroma_evenement(p_client, p_entite, r.id, v_nouveau.patient_id, 'modification', v_avant, v_apres,
                                              p_detecte, p_releve, 'modification:' || r.source_ref || ':' || p_instantane);
    end if;
  end loop;

  foreach l in array v_lib loop
    v_nouveau := null;
    if (l ->> 'patient') is not null then
      select * into v_nouveau from public.tiroma_rendez_vous n
      where n.client_id = p_client and n.entite_id = p_entite and n.patient_id = (l ->> 'patient')::uuid
        and n.id <> (l ->> 'rdv')::uuid and n.vu_premier_le = p_detecte and n.statut = 'prevu' and n.debut > p_detecte
      order by n.debut
      limit 1;
    end if;
    if v_nouveau.id is not null or l ->> 'nature' = 'report' then
      n_ev := n_ev + private.tiroma_evenement(p_client, p_entite, (l ->> 'rdv')::uuid, (l ->> 'patient')::uuid, 'report', l -> 'avant',
                case when v_nouveau.id is not null
                     then private.tiroma_rdv_json(v_nouveau) || jsonb_build_object('rendez_vous_id', v_nouveau.id) end,
                p_detecte, p_releve, 'report:' || (l ->> 'ref') || ':' || p_instantane);
    else
      n_ev := n_ev + private.tiroma_evenement(p_client, p_entite, (l ->> 'rdv')::uuid, (l ->> 'patient')::uuid, 'annulation', l -> 'avant', null,
                p_detecte, p_releve, 'annulation:' || (l ->> 'ref') || ':' || p_instantane);
    end if;
  end loop;
  return jsonb_build_object('ajouts', n_aj, 'modifications', n_mod, 'disparitions', n_disp, 'evenements', n_ev,
                            'a_classer', n_classer, 'ignores', n_ign);
end $$;

-- ── 5. La garde propre au dentaire, sur l'agenda (R9) ────────────────────
-- Avant d'appliquer un export d'agenda (hors premier export), trois cas le
-- rendent douteux, aux seuils réglés du cabinet : un jour ouvré d'au moins
-- garde_min_rdv_jour rendez-vous entièrement vidé ; plus de
-- garde_part_disparus des rendez-vous de la fenêtre disparus ; plus de
-- garde_max_annulations rendez-vous à venir libérés. L'export n'écrit alors
-- rien et B1 lève l'alerte. Rend la raison, ou nul.
create function private.tiroma_garde_agenda(p_client uuid, p_entite uuid, p_instantane uuid, p_fuseau text, p_detecte timestamptz)
returns text
language plpgsql stable security definer set search_path = '' as $$
declare
  g public.tiroma_regles;
  i public.instantanes;
  v_du date;
  v_au date;
  n_liberes integer;
  n_base integer;
  n_disp integer;
  v_jours text;
begin
  select * into g from public.tiroma_regles where client_id = p_client and entite_id = p_entite;
  select * into i from public.instantanes where id = p_instantane;
  v_du := (i.garde #>> '{fenetre,du}')::date;
  v_au := (i.garde #>> '{fenetre,au}')::date;
  with ecarts as (
    select x.nature, coalesce(private.tiroma_v(x.apres, 'ref'), private.tiroma_v(x.avant, 'ref')) as ref,
           private.tiroma_statut_rdv(private.tiroma_v(x.apres, 'statut')) as statut_apres
    from public.instantanes_ecarts x where x.instantane_id = p_instantane
  ),
  touches as (
    select r.id, (r.debut at time zone p_fuseau)::date as jour, r.debut, r.statut,
           e.nature = 'disparition' as disparu,
           (e.nature = 'disparition' or e.statut_apres in ('annule', 'supprime')) as vide,
           (e.nature = 'disparition' or e.statut_apres in ('annule', 'supprime', 'reporte')) as libere
    from ecarts e
    join public.tiroma_rendez_vous r on r.client_id = p_client and r.entite_id = p_entite and r.source_ref = e.ref
    where r.statut in ('prevu', 'honore', 'manque')
  ),
  base as (
    select r.id, (r.debut at time zone p_fuseau)::date as jour
    from public.tiroma_rendez_vous r
    where r.client_id = p_client and r.entite_id = p_entite and r.statut in ('prevu', 'honore', 'manque')
      and (v_du is null or (r.debut at time zone p_fuseau)::date between v_du and v_au)
  )
  select (select count(*) from touches t where t.libere and t.statut in ('prevu', 'honore') and t.debut > p_detecte),
         (select count(*) from base),
         (select count(*) from touches t where t.disparu),
         (select string_agg(b.jour::text || ' (' || b.n || ' rendez-vous)', ', ' order by b.jour)
          from (select jour, count(*) as n from base group by jour having count(*) >= g.garde_min_rdv_jour) b
          join (select jour, count(*) as n from touches where vide group by jour) t on t.jour = b.jour and t.n >= b.n)
    into n_liberes, n_base, n_disp, v_jours;
  if v_jours is not null then
    return format('un jour d''au moins %s rendez-vous entièrement vidé en un seul relevé : %s', g.garde_min_rdv_jour, v_jours);
  end if;
  if n_liberes > g.garde_max_annulations then
    return format('%s rendez-vous à venir libérés en un seul relevé (plus de %s)', n_liberes, g.garde_max_annulations);
  end if;
  if n_base >= g.garde_min_rdv_jour and n_disp > g.garde_part_disparus * n_base then
    return format('%s rendez-vous sur %s disparus en un seul relevé (plus de %s %%)', n_disp, n_base, round(g.garde_part_disparus * 100));
  end if;
  return null;
end $$;

revoke all on function private.tiroma_appliquer_types(uuid, uuid, uuid, boolean, timestamptz, text, uuid),
  private.tiroma_appliquer_patients(uuid, uuid, uuid, boolean, timestamptz, text, uuid),
  private.tiroma_appliquer_agenda(uuid, uuid, uuid, boolean, timestamptz, text, uuid),
  private.tiroma_garde_agenda(uuid, uuid, uuid, text, timestamptz)
  from public;

-- Les devis et plans : montants, reste à charge et panier lus, jamais
-- calculés (P16) ; une date d'acceptation vaut signature (§7.2). Un devis
-- disparu de sa fenêtre est marqué disparu, jamais effacé (conservation).
create function private.tiroma_appliquer_devis(p_client uuid, p_entite uuid, p_instantane uuid, p_reprise boolean,
                                               p_detecte timestamptz, p_fuseau text, p_releve uuid) returns jsonb
language plpgsql volatile security definer set search_path = '' as $$
declare
  e record;
  r public.tiroma_plans;
  g public.tiroma_regles;
  v jsonb;
  v_num text; v_statut text;
  v_patient uuid; v_prat uuid;
  v_date date; v_accepte date;
  n_aj integer := 0; n_mod integer := 0; n_disp integer := 0; n_classer integer := 0; n_ign integer := 0; n_sans integer := 0;
begin
  select * into g from public.tiroma_regles where client_id = p_client and entite_id = p_entite;
  for e in select x.nature, x.avant, x.apres from public.instantanes_ecarts x where x.instantane_id = p_instantane order by x.n nulls last, x.id loop
    if e.nature = 'disparition' then
      update public.tiroma_plans set disparu_le = coalesce(disparu_le, p_detecte), vu_dernier_le = p_detecte
       where client_id = p_client and entite_id = p_entite and source_ref = private.tiroma_v(e.avant, 'numero');
      if found then n_disp := n_disp + 1; else n_ign := n_ign + 1; end if;
      continue;
    end if;
    v := e.apres;
    v_num := private.tiroma_v(v, 'numero');
    if v_num is null then
      n_ign := n_ign + 1;
      continue;
    end if;
    v_patient := private.tiroma_patient_par_ref(p_client, p_entite, private.tiroma_v(v, 'patient_ref'), null, null, null, p_detecte);
    if v_patient is null then
      n_sans := n_sans + 1;
      continue;
    end if;
    v_prat := private.tiroma_praticien_par_ref(p_client, p_entite, private.tiroma_v(v, 'praticien'), p_detecte);
    v_date := private.tiroma_v_date(v, 'date');
    v_accepte := private.tiroma_v_date(v, 'accepte_le');
    v_statut := private.tiroma_statut_devis(private.tiroma_v(v, 'statut'));
    if v_statut is null then
      v_statut := 'presente';
      n_classer := n_classer + 1;
    end if;
    if v_statut = 'presente' and v_accepte is not null then
      v_statut := 'signe';
    end if;
    select * into r from public.tiroma_plans where client_id = p_client and entite_id = p_entite and source_ref = left(v_num, 200);
    if not found then
      insert into public.tiroma_plans (client_id, entite_id, source_ref, patient_id, praticien_id, devis_numero, type, statut, presente_le,
                                       signe_le, signature_source, valide_jusqu_au, montant, reste_a_charge, part_amo, part_amc, panier,
                                       alternative_100_sante, clos_le, empreinte, vu_premier_le, vu_dernier_le)
      values (p_client, p_entite, left(v_num, 200), v_patient, v_prat, left(v_num, 60), private.tiroma_type_devis(private.tiroma_v(v, 'type')),
              v_statut, v_date,
              case when v_statut in ('signe', 'commence', 'termine') then v_accepte end,
              case when v_accepte is not null then 'logiciel' end,
              coalesce(private.tiroma_v_date(v, 'valide_jusqu_au'),
                       case when g.validite_devis_jours is not null and v_date is not null then v_date + g.validite_devis_jours end),
              case when private.tiroma_v_decimal(v, 'montant') >= 0 then private.tiroma_v_decimal(v, 'montant') end,
              case when private.tiroma_v_decimal(v, 'reste_a_charge') >= 0 then private.tiroma_v_decimal(v, 'reste_a_charge') end,
              case when private.tiroma_v_decimal(v, 'part_amo') >= 0 then private.tiroma_v_decimal(v, 'part_amo') end,
              case when private.tiroma_v_decimal(v, 'part_amc') >= 0 then private.tiroma_v_decimal(v, 'part_amc') end,
              private.tiroma_panier(private.tiroma_v(v, 'panier')), private.tiroma_v_bool(v, 'alternative_100_sante'),
              case when v_statut in ('termine', 'abandonne', 'expire', 'refuse') then p_detecte end,
              encode(sha256(convert_to(v::text, 'UTF8')), 'hex'), p_detecte, p_detecte);
      n_aj := n_aj + 1;
    else
      update public.tiroma_plans
         set patient_id = v_patient, praticien_id = coalesce(v_prat, praticien_id),
             type = private.tiroma_type_devis(private.tiroma_v(v, 'type')), statut = v_statut,
             presente_le = coalesce(v_date, presente_le),
             signe_le = case when v_statut in ('signe', 'commence', 'termine') then coalesce(v_accepte, signe_le) end,
             signature_source = case when v_accepte is not null then 'logiciel'
                                     when v_statut in ('signe', 'commence', 'termine') then signature_source end,
             valide_jusqu_au = coalesce(private.tiroma_v_date(v, 'valide_jusqu_au'), valide_jusqu_au),
             montant = case when private.tiroma_v_decimal(v, 'montant') >= 0 then private.tiroma_v_decimal(v, 'montant') else montant end,
             reste_a_charge = case when private.tiroma_v_decimal(v, 'reste_a_charge') >= 0 then private.tiroma_v_decimal(v, 'reste_a_charge') else reste_a_charge end,
             part_amo = case when private.tiroma_v_decimal(v, 'part_amo') >= 0 then private.tiroma_v_decimal(v, 'part_amo') else part_amo end,
             part_amc = case when private.tiroma_v_decimal(v, 'part_amc') >= 0 then private.tiroma_v_decimal(v, 'part_amc') else part_amc end,
             panier = coalesce(private.tiroma_panier(private.tiroma_v(v, 'panier')), panier),
             alternative_100_sante = coalesce(private.tiroma_v_bool(v, 'alternative_100_sante'), alternative_100_sante),
             clos_le = case when v_statut in ('termine', 'abandonne', 'expire', 'refuse') then coalesce(clos_le, p_detecte) end,
             empreinte = encode(sha256(convert_to(v::text, 'UTF8')), 'hex'), vu_dernier_le = p_detecte, disparu_le = null
       where id = r.id;
      n_mod := n_mod + 1;
    end if;
  end loop;
  return jsonb_build_object('ajouts', n_aj, 'modifications', n_mod, 'disparitions', n_disp, 'a_classer', n_classer,
                            'ignores', n_ign, 'sans_patient', n_sans);
end $$;

-- Une ligne de devis, telle que B1 la rend : appliquée si son devis est
-- connu (le rattrapage repasse les orphelines quand le devis arrive).
create function private.tiroma_ligne_devis(p_client uuid, p_entite uuid, v jsonb, p_detecte timestamptz) returns text
language plpgsql volatile security definer set search_path = '' as $$
declare
  p public.tiroma_plans;
  f record;
  v_num text; v_rang integer; v_rdv uuid; v_fait date; v_insere boolean;
begin
  v_num := private.tiroma_v(v, 'numero');
  v_rang := private.tiroma_v_entier(v, 'rang');
  if v_num is null or v_rang is null or v_rang < 1 or v_rang > 32000 then
    return 'ignore';
  end if;
  select * into p from public.tiroma_plans where client_id = p_client and entite_id = p_entite and source_ref = left(v_num, 200);
  if not found then
    return 'orphelin';
  end if;
  v_rdv := null;
  select r.id into v_rdv from public.tiroma_rendez_vous r
  where r.client_id = p_client and r.entite_id = p_entite and r.source_ref = private.tiroma_v(v, 'rdv_ref');
  select * into f from private.tiroma_famille_par_regle(private.tiroma_v(v, 'libelle'));
  v_fait := private.tiroma_v_date(v, 'fait_le');
  insert into public.tiroma_plan_actes as a (client_id, entite_id, plan_id, patient_id, rang, code, libelle, dents, famille, seance, rdv_ref,
                                             duree_min, delai_min_jours, montant, reste_a_charge, statut, fait_le, rendez_vous_id, empreinte)
  values (p_client, p_entite, p.id, p.patient_id, v_rang, left(private.tiroma_v(v, 'code'), 20), left(private.tiroma_v(v, 'libelle'), 200),
          private.tiroma_v_dents(v, 'dents'), f.famille,
          case when private.tiroma_v_entier(v, 'seance') >= 1 then private.tiroma_v_entier(v, 'seance') end,
          left(private.tiroma_v(v, 'rdv_ref'), 60),
          case when private.tiroma_v_entier(v, 'duree_min') between 5 and 600 then private.tiroma_v_entier(v, 'duree_min') end,
          case when private.tiroma_v_entier(v, 'delai_min_jours') between 0 and 365 then private.tiroma_v_entier(v, 'delai_min_jours') end,
          case when private.tiroma_v_decimal(v, 'montant') >= 0 then private.tiroma_v_decimal(v, 'montant') end,
          case when private.tiroma_v_decimal(v, 'reste_a_charge') >= 0 then private.tiroma_v_decimal(v, 'reste_a_charge') end,
          case when v_fait is not null then 'fait' when v_rdv is not null then 'planifie' else 'a_faire' end,
          v_fait, v_rdv, encode(sha256(convert_to(v::text, 'UTF8')), 'hex'))
  on conflict (plan_id, rang) do update
    set code = excluded.code, libelle = excluded.libelle, dents = excluded.dents,
        famille = coalesce(excluded.famille, a.famille), seance = coalesce(excluded.seance, a.seance),
        rdv_ref = coalesce(excluded.rdv_ref, a.rdv_ref), duree_min = coalesce(excluded.duree_min, a.duree_min),
        delai_min_jours = coalesce(excluded.delai_min_jours, a.delai_min_jours),
        montant = coalesce(excluded.montant, a.montant), reste_a_charge = coalesce(excluded.reste_a_charge, a.reste_a_charge),
        rendez_vous_id = coalesce(excluded.rendez_vous_id, a.rendez_vous_id),
        fait_le = coalesce(excluded.fait_le, a.fait_le),
        statut = case when coalesce(excluded.fait_le, a.fait_le) is not null then 'fait'
                      when coalesce(excluded.rendez_vous_id, a.rendez_vous_id) is not null then 'planifie'
                      else 'a_faire' end,
        empreinte = excluded.empreinte
  returning (xmax::text = '0') into v_insere;
  if v_rdv is not null then
    update public.tiroma_rendez_vous
       set plan_id = p.id, seance_rang = coalesce(seance_rang, case when private.tiroma_v_entier(v, 'seance') >= 1 then private.tiroma_v_entier(v, 'seance') end)
     where id = v_rdv and plan_id is null;
  end if;
  return case when v_insere then 'ajout' else 'modification' end;
end $$;

create function private.tiroma_appliquer_devis_lignes(p_client uuid, p_entite uuid, p_instantane uuid, p_reprise boolean,
                                                      p_detecte timestamptz, p_fuseau text, p_releve uuid) returns jsonb
language plpgsql volatile security definer set search_path = '' as $$
declare
  e record;
  v_res text;
  n_aj integer := 0; n_mod integer := 0; n_disp integer := 0; n_orph integer := 0; n_ign integer := 0;
begin
  for e in select x.nature, x.avant, x.apres from public.instantanes_ecarts x where x.instantane_id = p_instantane order by x.n nulls last, x.id loop
    if e.nature = 'disparition' then
      delete from public.tiroma_plan_actes a using public.tiroma_plans p
       where a.plan_id = p.id and p.client_id = p_client and p.entite_id = p_entite
         and p.source_ref = private.tiroma_v(e.avant, 'numero') and a.rang = private.tiroma_v_entier(e.avant, 'rang');
      if found then n_disp := n_disp + 1; else n_ign := n_ign + 1; end if;
      continue;
    end if;
    v_res := private.tiroma_ligne_devis(p_client, p_entite, e.apres, p_detecte);
    case v_res
      when 'ajout' then n_aj := n_aj + 1;
      when 'modification' then n_mod := n_mod + 1;
      when 'orphelin' then n_orph := n_orph + 1;
      else n_ign := n_ign + 1;
    end case;
  end loop;
  return jsonb_build_object('ajouts', n_aj, 'modifications', n_mod, 'disparitions', n_disp, 'orphelines', n_orph, 'ignores', n_ign);
end $$;

-- Un acte facturé : rattaché à son devis et à son rendez-vous quand le
-- logiciel les nomme, sinon au rendez-vous du patient ce jour-là.
create function private.tiroma_ligne_acte(p_client uuid, p_entite uuid, v jsonb, p_fuseau text, p_detecte timestamptz) returns text
language plpgsql volatile security definer set search_path = '' as $$
declare
  v_ref text; v_date date; v_patient uuid; v_prat uuid; v_plan uuid; v_rdv uuid; v_insere boolean;
begin
  v_ref := private.tiroma_v(v, 'ref');
  v_date := private.tiroma_v_date(v, 'date');
  if v_ref is null or v_date is null then
    return 'ignore';
  end if;
  v_patient := private.tiroma_patient_par_ref(p_client, p_entite, private.tiroma_v(v, 'patient_ref'), null, null, null, p_detecte);
  if v_patient is null then
    return 'sans_patient';
  end if;
  v_prat := private.tiroma_praticien_par_ref(p_client, p_entite, private.tiroma_v(v, 'praticien'), p_detecte);
  v_plan := null; v_rdv := null;
  select p.id into v_plan from public.tiroma_plans p
  where p.client_id = p_client and p.entite_id = p_entite and p.source_ref = private.tiroma_v(v, 'devis_numero');
  select r.id into v_rdv from public.tiroma_rendez_vous r
  where r.client_id = p_client and r.entite_id = p_entite and r.source_ref = private.tiroma_v(v, 'rdv_ref');
  if v_rdv is null then
    select r.id into v_rdv from public.tiroma_rendez_vous r
    where r.client_id = p_client and r.entite_id = p_entite and r.patient_id = v_patient
      and (r.debut at time zone p_fuseau)::date = v_date and r.statut in ('prevu', 'honore')
    order by (r.praticien_id = v_prat) desc nulls last, r.debut
    limit 1;
  end if;
  insert into public.tiroma_actes_realises as a (client_id, entite_id, source_ref, patient_id, date, code, libelle, dents, praticien_id,
                                                 montant, plan_id, rendez_vous_id, empreinte, vu_premier_le, vu_dernier_le)
  values (p_client, p_entite, left(v_ref, 200), v_patient, v_date, left(private.tiroma_v(v, 'code'), 20),
          left(private.tiroma_v(v, 'libelle'), 200), private.tiroma_v_dents(v, 'dents'), v_prat,
          case when private.tiroma_v_decimal(v, 'montant') >= 0 then private.tiroma_v_decimal(v, 'montant') end,
          v_plan, v_rdv, encode(sha256(convert_to(v::text, 'UTF8')), 'hex'), p_detecte, p_detecte)
  on conflict (client_id, entite_id, source_ref) do update
    set patient_id = excluded.patient_id, date = excluded.date, code = excluded.code, libelle = excluded.libelle, dents = excluded.dents,
        praticien_id = coalesce(excluded.praticien_id, a.praticien_id), montant = coalesce(excluded.montant, a.montant),
        plan_id = coalesce(excluded.plan_id, a.plan_id), rendez_vous_id = coalesce(excluded.rendez_vous_id, a.rendez_vous_id),
        empreinte = excluded.empreinte, vu_dernier_le = excluded.vu_dernier_le
  returning (xmax::text = '0') into v_insere;
  return case when v_insere then 'ajout' else 'modification' end;
end $$;

create function private.tiroma_appliquer_actes(p_client uuid, p_entite uuid, p_instantane uuid, p_reprise boolean,
                                               p_detecte timestamptz, p_fuseau text, p_releve uuid) returns jsonb
language plpgsql volatile security definer set search_path = '' as $$
declare
  e record;
  v_res text;
  n_aj integer := 0; n_mod integer := 0; n_disp integer := 0; n_sans integer := 0; n_ign integer := 0;
begin
  for e in select x.nature, x.avant, x.apres from public.instantanes_ecarts x where x.instantane_id = p_instantane order by x.n nulls last, x.id loop
    if e.nature = 'disparition' then
      -- Un acte retiré du logiciel (erreur de saisie) n'a jamais été facturé.
      delete from public.tiroma_actes_realises
       where client_id = p_client and entite_id = p_entite and source_ref = private.tiroma_v(e.avant, 'ref');
      if found then n_disp := n_disp + 1; else n_ign := n_ign + 1; end if;
      continue;
    end if;
    v_res := private.tiroma_ligne_acte(p_client, p_entite, e.apres, p_fuseau, p_detecte);
    case v_res
      when 'ajout' then n_aj := n_aj + 1;
      when 'modification' then n_mod := n_mod + 1;
      when 'sans_patient' then n_sans := n_sans + 1;
      else n_ign := n_ign + 1;
    end case;
  end loop;
  return jsonb_build_object('ajouts', n_aj, 'modifications', n_mod, 'disparitions', n_disp, 'sans_patient', n_sans, 'ignores', n_ign);
end $$;

-- Une fiche de laboratoire : aucune date n'est inventée ; « revenu » exige sa
-- date, sinon le travail reste en fabrication.
create function private.tiroma_ligne_labo(p_client uuid, p_entite uuid, v jsonb, p_detecte timestamptz) returns text
language plpgsql volatile security definer set search_path = '' as $$
declare
  v_ref text; v_patient uuid; v_statut text; n text;
  v_envoye date; v_revenu date; v_pose uuid; v_empreinte uuid; v_insere boolean;
begin
  v_ref := private.tiroma_v(v, 'ref');
  if v_ref is null then
    return 'ignore';
  end if;
  v_patient := private.tiroma_patient_par_ref(p_client, p_entite, private.tiroma_v(v, 'patient_ref'), null, null, null, p_detecte);
  if v_patient is null then
    return 'sans_patient';
  end if;
  v_envoye := private.tiroma_v_date(v, 'envoye_le');
  v_revenu := private.tiroma_v_date(v, 'revenu_le');
  n := private.tiroma_normaliser(private.tiroma_v(v, 'statut'));
  v_statut := case
    when v_revenu is not null then 'revenu'
    when n ~ 'annul' then 'annule'
    when v_envoye is not null or n ~ '(fabric|envoy|labo|revenu|recu|retour|livr)' then 'en_fabrication'
    else 'attendu' end;
  v_pose := null; v_empreinte := null;
  select r.id into v_pose from public.tiroma_rendez_vous r
  where r.client_id = p_client and r.entite_id = p_entite and r.source_ref = private.tiroma_v(v, 'rdv_pose_ref');
  select r.id into v_empreinte from public.tiroma_rendez_vous r
  where r.client_id = p_client and r.entite_id = p_entite and r.source_ref = private.tiroma_v(v, 'rdv_empreinte_ref');
  insert into public.tiroma_travaux_labo as w (client_id, entite_id, source_ref, patient_id, rendez_vous_pose_id, rendez_vous_empreinte_id,
                                               laboratoire, type_travail, envoye_le, retour_attendu_le, revenu_le, statut, source, empreinte,
                                               maj_le, vu_dernier_le)
  values (p_client, p_entite, left(v_ref, 200), v_patient, v_pose, v_empreinte, left(private.tiroma_v(v, 'laboratoire'), 120),
          left(private.tiroma_v(v, 'type_travail'), 120), v_envoye, private.tiroma_v_date(v, 'retour_attendu_le'), v_revenu, v_statut,
          'logiciel', encode(sha256(convert_to(v::text, 'UTF8')), 'hex'), now(), p_detecte)
  on conflict (client_id, entite_id, source_ref) do update
    set patient_id = excluded.patient_id,
        rendez_vous_pose_id = coalesce(excluded.rendez_vous_pose_id, w.rendez_vous_pose_id),
        rendez_vous_empreinte_id = coalesce(excluded.rendez_vous_empreinte_id, w.rendez_vous_empreinte_id),
        laboratoire = coalesce(excluded.laboratoire, w.laboratoire), type_travail = coalesce(excluded.type_travail, w.type_travail),
        envoye_le = coalesce(excluded.envoye_le, w.envoye_le), retour_attendu_le = coalesce(excluded.retour_attendu_le, w.retour_attendu_le),
        revenu_le = coalesce(excluded.revenu_le, w.revenu_le),
        statut = case when coalesce(excluded.revenu_le, w.revenu_le) is not null then 'revenu' else excluded.statut end,
        empreinte = excluded.empreinte, maj_le = now(), vu_dernier_le = excluded.vu_dernier_le
  returning (xmax::text = '0') into v_insere;
  return case when v_insere then 'ajout' else 'modification' end;
end $$;

create function private.tiroma_appliquer_labo(p_client uuid, p_entite uuid, p_instantane uuid, p_reprise boolean,
                                              p_detecte timestamptz, p_fuseau text, p_releve uuid) returns jsonb
language plpgsql volatile security definer set search_path = '' as $$
declare
  e record;
  v_res text;
  n_aj integer := 0; n_mod integer := 0; n_disp integer := 0; n_sans integer := 0; n_ign integer := 0;
begin
  for e in select x.nature, x.avant, x.apres from public.instantanes_ecarts x where x.instantane_id = p_instantane order by x.n nulls last, x.id loop
    if e.nature = 'disparition' then
      update public.tiroma_travaux_labo
         set statut = case when statut = 'revenu' then statut else 'annule' end, maj_le = now(), vu_dernier_le = p_detecte
       where client_id = p_client and entite_id = p_entite and source_ref = private.tiroma_v(e.avant, 'ref');
      if found then n_disp := n_disp + 1; else n_ign := n_ign + 1; end if;
      continue;
    end if;
    v_res := private.tiroma_ligne_labo(p_client, p_entite, e.apres, p_detecte);
    case v_res
      when 'ajout' then n_aj := n_aj + 1;
      when 'modification' then n_mod := n_mod + 1;
      when 'sans_patient' then n_sans := n_sans + 1;
      else n_ign := n_ign + 1;
    end case;
  end loop;
  return jsonb_build_object('ajouts', n_aj, 'modifications', n_mod, 'disparitions', n_disp, 'sans_patient', n_sans, 'ignores', n_ign);
end $$;

-- Le stock : par référence et lot ; « implant » quand le logiciel ou la
-- marque le dit. Une référence retirée du logiciel sort du miroir.
create function private.tiroma_ligne_stock(p_client uuid, p_entite uuid, v jsonb, p_detecte timestamptz) returns text
language plpgsql volatile security definer set search_path = '' as $$
declare
  v_ref text; v_famille text; v_insere boolean;
begin
  if private.tiroma_v(v, 'reference') is null then
    return 'ignore';
  end if;
  v_ref := left(private.tiroma_v(v, 'reference') || coalesce('#' || private.tiroma_v(v, 'lot'), ''), 200);
  v_famille := case
    when private.tiroma_normaliser(private.tiroma_v(v, 'famille')) ~ 'implant'
      or private.tiroma_normaliser(private.tiroma_v(v, 'marque')) ~ '(nobel|straumann|zimmer|biomet|astra|dentsply|anthogyr|biotech|tekka|euroteknika|global d|camlog|bego|osstem|megagen|\mmis\M|neodent|biohorizons|thommen|dentium)'
      or private.tiroma_normaliser(private.tiroma_v(v, 'reference')) ~ 'implant'
    then 'implant' else 'autre' end;
  insert into public.tiroma_stock as s (client_id, entite_id, source_ref, famille, marque, reference, diametre_mm, longueur_mm, quantite,
                                        seuil, lot, peremption, source, maj_le, vu_dernier_le)
  values (p_client, p_entite, v_ref, v_famille, left(private.tiroma_v(v, 'marque'), 80), left(private.tiroma_v(v, 'reference'), 80),
          case when private.tiroma_v_decimal(v, 'diametre_mm') > 0 and private.tiroma_v_decimal(v, 'diametre_mm') < 100 then private.tiroma_v_decimal(v, 'diametre_mm') end,
          case when private.tiroma_v_decimal(v, 'longueur_mm') > 0 and private.tiroma_v_decimal(v, 'longueur_mm') < 1000 then private.tiroma_v_decimal(v, 'longueur_mm') end,
          greatest(coalesce(private.tiroma_v_entier(v, 'quantite'), 0), 0),
          case when private.tiroma_v_entier(v, 'seuil') >= 0 then private.tiroma_v_entier(v, 'seuil') end,
          left(private.tiroma_v(v, 'lot'), 60), private.tiroma_v_date(v, 'peremption'), 'logiciel', now(), p_detecte)
  on conflict (client_id, entite_id, source_ref) do update
    set famille = excluded.famille, marque = coalesce(excluded.marque, s.marque), reference = excluded.reference,
        diametre_mm = coalesce(excluded.diametre_mm, s.diametre_mm), longueur_mm = coalesce(excluded.longueur_mm, s.longueur_mm),
        quantite = excluded.quantite, seuil = coalesce(excluded.seuil, s.seuil), lot = excluded.lot,
        peremption = coalesce(excluded.peremption, s.peremption), source = 'logiciel', maj_le = now(), vu_dernier_le = excluded.vu_dernier_le
  returning (xmax::text = '0') into v_insere;
  return case when v_insere then 'ajout' else 'modification' end;
end $$;

create function private.tiroma_appliquer_stock(p_client uuid, p_entite uuid, p_instantane uuid, p_reprise boolean,
                                               p_detecte timestamptz, p_fuseau text, p_releve uuid) returns jsonb
language plpgsql volatile security definer set search_path = '' as $$
declare
  e record;
  v_res text;
  n_aj integer := 0; n_mod integer := 0; n_disp integer := 0; n_ign integer := 0;
begin
  for e in select x.nature, x.avant, x.apres from public.instantanes_ecarts x where x.instantane_id = p_instantane order by x.n nulls last, x.id loop
    if e.nature = 'disparition' then
      delete from public.tiroma_stock
       where client_id = p_client and entite_id = p_entite and source = 'logiciel'
         and source_ref = left(private.tiroma_v(e.avant, 'reference') || coalesce('#' || private.tiroma_v(e.avant, 'lot'), ''), 200);
      if found then n_disp := n_disp + 1; else n_ign := n_ign + 1; end if;
      continue;
    end if;
    v_res := private.tiroma_ligne_stock(p_client, p_entite, e.apres, p_detecte);
    case v_res
      when 'ajout' then n_aj := n_aj + 1;
      when 'modification' then n_mod := n_mod + 1;
      else n_ign := n_ign + 1;
    end case;
  end loop;
  return jsonb_build_object('ajouts', n_aj, 'modifications', n_mod, 'disparitions', n_disp, 'ignores', n_ign);
end $$;

-- Les ententes d'orthodontie : le statut se lit d'abord dans les dates.
-- Hypothèse : une entente commencée qui disparaît de la liste est terminée
-- à cette date ; une entente demandée ou accordée qui disparaît est abandonnée.
create function private.tiroma_ligne_odf(p_client uuid, p_entite uuid, v jsonb, p_detecte timestamptz) returns text
language plpgsql volatile security definer set search_path = '' as $$
declare
  v_ref text; v_patient uuid; n text; v_statut text;
  v_demande date; v_accord date; v_debut date; v_fin date; v_insere boolean;
begin
  v_ref := private.tiroma_v(v, 'ref');
  if v_ref is null then
    return 'ignore';
  end if;
  v_patient := private.tiroma_patient_par_ref(p_client, p_entite, private.tiroma_v(v, 'patient_ref'), null, null, null, p_detecte);
  if v_patient is null then
    return 'sans_patient';
  end if;
  v_demande := private.tiroma_v_date(v, 'demande_le');
  v_accord := private.tiroma_v_date(v, 'accord_le');
  v_debut := private.tiroma_v_date(v, 'debut_le');
  v_fin := private.tiroma_v_date(v, 'fin_le');
  n := private.tiroma_normaliser(private.tiroma_v(v, 'statut'));
  v_statut := case
    when n ~ '(refus|rejet)' then 'refusee'
    when n ~ '(abandon|arret|interromp)' then 'abandonnee'
    when v_fin is not null or n ~ '(termin|fini|achev)' then 'terminee'
    when v_debut is not null or n ~ '(commenc|en cours)' then 'commencee'
    when v_accord is not null or n ~ 'accord' then 'accordee'
    else 'demandee' end;
  insert into public.tiroma_ententes_odf as o (client_id, entite_id, source_ref, patient_id, demande_le, accord_le, debut_le, semestre_courant,
                                               fin_le, statut, empreinte, vu_dernier_le, maj_le)
  values (p_client, p_entite, left(v_ref, 200), v_patient, v_demande, v_accord, v_debut,
          case when private.tiroma_v_entier(v, 'semestre') between 0 and 12 then private.tiroma_v_entier(v, 'semestre') end,
          v_fin, v_statut, encode(sha256(convert_to(v::text, 'UTF8')), 'hex'), p_detecte, now())
  on conflict (client_id, entite_id, source_ref) do update
    set patient_id = excluded.patient_id, demande_le = coalesce(excluded.demande_le, o.demande_le),
        accord_le = coalesce(excluded.accord_le, o.accord_le), debut_le = coalesce(excluded.debut_le, o.debut_le),
        semestre_courant = coalesce(excluded.semestre_courant, o.semestre_courant), fin_le = coalesce(excluded.fin_le, o.fin_le),
        statut = excluded.statut, empreinte = excluded.empreinte, vu_dernier_le = excluded.vu_dernier_le, maj_le = now()
  returning (xmax::text = '0') into v_insere;
  return case when v_insere then 'ajout' else 'modification' end;
end $$;

create function private.tiroma_appliquer_odf(p_client uuid, p_entite uuid, p_instantane uuid, p_reprise boolean,
                                             p_detecte timestamptz, p_fuseau text, p_releve uuid) returns jsonb
language plpgsql volatile security definer set search_path = '' as $$
declare
  e record;
  v_res text;
  n_aj integer := 0; n_mod integer := 0; n_disp integer := 0; n_sans integer := 0; n_ign integer := 0;
begin
  for e in select x.nature, x.avant, x.apres from public.instantanes_ecarts x where x.instantane_id = p_instantane order by x.n nulls last, x.id loop
    if e.nature = 'disparition' then
      update public.tiroma_ententes_odf
         set statut = case when statut = 'commencee' then 'terminee' when statut in ('demandee', 'accordee') then 'abandonnee' else statut end,
             fin_le = case when statut = 'commencee' then coalesce(fin_le, (p_detecte at time zone p_fuseau)::date) else fin_le end,
             vu_dernier_le = p_detecte, maj_le = now()
       where client_id = p_client and entite_id = p_entite and source_ref = private.tiroma_v(e.avant, 'ref');
      if found then n_disp := n_disp + 1; else n_ign := n_ign + 1; end if;
      continue;
    end if;
    v_res := private.tiroma_ligne_odf(p_client, p_entite, e.apres, p_detecte);
    case v_res
      when 'ajout' then n_aj := n_aj + 1;
      when 'modification' then n_mod := n_mod + 1;
      when 'sans_patient' then n_sans := n_sans + 1;
      else n_ign := n_ign + 1;
    end case;
  end loop;
  return jsonb_build_object('ajouts', n_aj, 'modifications', n_mod, 'disparitions', n_disp, 'sans_patient', n_sans, 'ignores', n_ign);
end $$;

-- La liste d'attente du logiciel : une entrée ouverte par patient ; une
-- entrée retirée du logiciel est retirée ici, sans motif connu.
create function private.tiroma_ligne_attente(p_client uuid, p_entite uuid, v jsonb, p_fuseau text, p_detecte timestamptz) returns text
language plpgsql volatile security definer set search_path = '' as $$
declare
  v_ref text; v_patient uuid; v_prat uuid; v_type uuid; v_famille text; v_insere boolean;
begin
  v_ref := private.tiroma_v(v, 'ref');
  if v_ref is null then
    return 'ignore';
  end if;
  v_patient := private.tiroma_patient_par_ref(p_client, p_entite, private.tiroma_v(v, 'patient_ref'), null, null, null, p_detecte);
  if v_patient is null then
    return 'sans_patient';
  end if;
  v_prat := private.tiroma_praticien_par_ref(p_client, p_entite, private.tiroma_v(v, 'praticien'), p_detecte);
  v_type := private.tiroma_type_par_libelle(p_client, p_entite, private.tiroma_v(v, 'type'), null, null, p_detecte);
  select t.famille into v_famille from public.tiroma_types_rdv t where t.id = v_type;
  -- Une seule entrée ouverte par patient : celle du logiciel prime.
  update public.tiroma_liste_attente
     set retire_le = p_detecte, motif_retrait = 'doublon', maj_le = now()
   where client_id = p_client and entite_id = p_entite and patient_id = v_patient and retire_le is null
     and source_ref is distinct from left(v_ref, 200);
  insert into public.tiroma_liste_attente as l (client_id, entite_id, source_ref, patient_id, type_rdv_id, famille, duree_min, praticien_id,
                                                source, ajoute_le, vu_dernier_le, maj_le)
  values (p_client, p_entite, left(v_ref, 200), v_patient, v_type, v_famille,
          case when private.tiroma_v_entier(v, 'duree_min') between 5 and 600 then private.tiroma_v_entier(v, 'duree_min') end,
          v_prat, 'logiciel', coalesce(private.tiroma_v_instant(v, 'depuis', p_fuseau), p_detecte), p_detecte, now())
  on conflict (client_id, entite_id, source_ref) do update
    set patient_id = excluded.patient_id, type_rdv_id = coalesce(excluded.type_rdv_id, l.type_rdv_id),
        famille = coalesce(excluded.famille, l.famille), duree_min = coalesce(excluded.duree_min, l.duree_min),
        praticien_id = coalesce(excluded.praticien_id, l.praticien_id), ajoute_le = least(excluded.ajoute_le, l.ajoute_le),
        retire_le = null, motif_retrait = null, vu_dernier_le = excluded.vu_dernier_le, maj_le = now()
  returning (xmax::text = '0') into v_insere;
  return case when v_insere then 'ajout' else 'modification' end;
end $$;

create function private.tiroma_appliquer_attente(p_client uuid, p_entite uuid, p_instantane uuid, p_reprise boolean,
                                                 p_detecte timestamptz, p_fuseau text, p_releve uuid) returns jsonb
language plpgsql volatile security definer set search_path = '' as $$
declare
  e record;
  v_res text;
  n_aj integer := 0; n_mod integer := 0; n_disp integer := 0; n_sans integer := 0; n_ign integer := 0;
begin
  for e in select x.nature, x.avant, x.apres from public.instantanes_ecarts x where x.instantane_id = p_instantane order by x.n nulls last, x.id loop
    if e.nature = 'disparition' then
      update public.tiroma_liste_attente
         set retire_le = p_detecte, motif_retrait = 'autre', vu_dernier_le = p_detecte, maj_le = now()
       where client_id = p_client and entite_id = p_entite and source_ref = private.tiroma_v(e.avant, 'ref') and retire_le is null;
      if found then n_disp := n_disp + 1; else n_ign := n_ign + 1; end if;
      continue;
    end if;
    v_res := private.tiroma_ligne_attente(p_client, p_entite, e.apres, p_fuseau, p_detecte);
    case v_res
      when 'ajout' then n_aj := n_aj + 1;
      when 'modification' then n_mod := n_mod + 1;
      when 'sans_patient' then n_sans := n_sans + 1;
      else n_ign := n_ign + 1;
    end case;
  end loop;
  return jsonb_build_object('ajouts', n_aj, 'modifications', n_mod, 'disparitions', n_disp, 'sans_patient', n_sans, 'ignores', n_ign);
end $$;

-- ── 6. Le rattrapage, les faits dérivés, les présumés, le rattachement ──

-- B1 ne rend un écart qu'une fois. Une ligne qui attendait son devis ou son
-- patient est reprise plus tard depuis l'état de B1 (public.jeux_lignes),
-- qui ne porte pas de nom : le rattrapage ne s'en sert que pour les
-- références et les liens.
create function private.tiroma_rattraper(p_client uuid, p_entite uuid, p_branchement uuid, p_fuseau text, p_detecte timestamptz,
                                         p_lignes boolean, p_patients boolean, p_liens boolean) returns jsonb
language plpgsql volatile security definer set search_path = '' as $$
declare
  s record;
  n_lignes integer := 0; n_actes integer := 0; n_labo integer := 0; n_odf integer := 0; n_attente integer := 0; n_liens integer := 0;
  n integer;
begin
  if p_lignes then
    for s in
      select x.valeurs from public.jeux_lignes x join public.branchements_jeux j on j.id = x.jeu_id
      where j.branchement_id = p_branchement and j.code = 'devis_lignes'
        and exists (select 1 from public.tiroma_plans p where p.client_id = p_client and p.entite_id = p_entite
                    and p.source_ref = private.tiroma_v(x.valeurs, 'numero'))
        and not exists (select 1 from public.tiroma_plan_actes a join public.tiroma_plans p on p.id = a.plan_id
                        where p.client_id = p_client and p.entite_id = p_entite
                          and p.source_ref = private.tiroma_v(x.valeurs, 'numero') and a.rang = private.tiroma_v_entier(x.valeurs, 'rang'))
    loop
      if private.tiroma_ligne_devis(p_client, p_entite, s.valeurs, p_detecte) in ('ajout', 'modification') then
        n_lignes := n_lignes + 1;
      end if;
    end loop;
  end if;

  if p_patients then
    for s in
      select j.code, x.valeurs from public.jeux_lignes x join public.branchements_jeux j on j.id = x.jeu_id
      where j.branchement_id = p_branchement and j.code in ('actes', 'labo', 'odf', 'attente')
        and exists (select 1 from public.tiroma_patients p where p.client_id = p_client and p.entite_id = p_entite
                    and p.source_ref = private.tiroma_v(x.valeurs, 'patient_ref'))
        and not exists (
          select 1 from public.tiroma_actes_realises a where j.code = 'actes' and a.client_id = p_client and a.entite_id = p_entite and a.source_ref = private.tiroma_v(x.valeurs, 'ref')
          union all
          select 1 from public.tiroma_travaux_labo w where j.code = 'labo' and w.client_id = p_client and w.entite_id = p_entite and w.source_ref = private.tiroma_v(x.valeurs, 'ref')
          union all
          select 1 from public.tiroma_ententes_odf o where j.code = 'odf' and o.client_id = p_client and o.entite_id = p_entite and o.source_ref = private.tiroma_v(x.valeurs, 'ref')
          union all
          select 1 from public.tiroma_liste_attente l where j.code = 'attente' and l.client_id = p_client and l.entite_id = p_entite and l.source_ref = private.tiroma_v(x.valeurs, 'ref'))
    loop
      case s.code
        when 'actes' then
          if private.tiroma_ligne_acte(p_client, p_entite, s.valeurs, p_fuseau, p_detecte) = 'ajout' then n_actes := n_actes + 1; end if;
        when 'labo' then
          if private.tiroma_ligne_labo(p_client, p_entite, s.valeurs, p_detecte) = 'ajout' then n_labo := n_labo + 1; end if;
        when 'odf' then
          if private.tiroma_ligne_odf(p_client, p_entite, s.valeurs, p_detecte) = 'ajout' then n_odf := n_odf + 1; end if;
        when 'attente' then
          if private.tiroma_ligne_attente(p_client, p_entite, s.valeurs, p_fuseau, p_detecte) = 'ajout' then n_attente := n_attente + 1; end if;
      end case;
    end loop;
  end if;

  if p_liens then
    -- Les rendez-vous qui nomment un devis arrivé depuis.
    update public.tiroma_rendez_vous r set plan_id = p.id
    from public.jeux_lignes x join public.branchements_jeux j on j.id = x.jeu_id, public.tiroma_plans p
    where j.branchement_id = p_branchement and j.code = 'agenda' and r.client_id = p_client and r.entite_id = p_entite
      and r.plan_id is null and r.source_ref = private.tiroma_v(x.valeurs, 'ref')
      and p.client_id = p_client and p.entite_id = p_entite and p.source_ref = private.tiroma_v(x.valeurs, 'devis_ref');
    get diagnostics n = row_count; n_liens := n_liens + n;
    -- Les lignes de devis qui nomment un rendez-vous arrivé depuis.
    update public.tiroma_plan_actes a
       set rendez_vous_id = r.id, statut = case when a.statut = 'fait' then 'fait' else 'planifie' end
    from public.tiroma_rendez_vous r
    where a.client_id = p_client and a.entite_id = p_entite and a.rendez_vous_id is null and a.rdv_ref is not null
      and r.client_id = p_client and r.entite_id = p_entite and r.source_ref = a.rdv_ref;
    get diagnostics n = row_count; n_liens := n_liens + n;
    update public.tiroma_rendez_vous r set plan_id = a.plan_id
    from public.tiroma_plan_actes a
    where r.client_id = p_client and r.entite_id = p_entite and r.plan_id is null and a.rendez_vous_id = r.id;
    -- Les fiches de laboratoire et les actes qui nomment un rendez-vous ou un devis arrivé depuis.
    update public.tiroma_travaux_labo w
       set rendez_vous_pose_id = coalesce(w.rendez_vous_pose_id, rp.id), rendez_vous_empreinte_id = coalesce(w.rendez_vous_empreinte_id, re.id)
    from public.jeux_lignes x join public.branchements_jeux j on j.id = x.jeu_id
    left join public.tiroma_rendez_vous rp on rp.client_id = p_client and rp.entite_id = p_entite and rp.source_ref = private.tiroma_v(x.valeurs, 'rdv_pose_ref')
    left join public.tiroma_rendez_vous re on re.client_id = p_client and re.entite_id = p_entite and re.source_ref = private.tiroma_v(x.valeurs, 'rdv_empreinte_ref')
    where j.branchement_id = p_branchement and j.code = 'labo' and w.client_id = p_client and w.entite_id = p_entite
      and w.source_ref = private.tiroma_v(x.valeurs, 'ref')
      and ((w.rendez_vous_pose_id is null and rp.id is not null) or (w.rendez_vous_empreinte_id is null and re.id is not null));
    get diagnostics n = row_count; n_liens := n_liens + n;
    update public.tiroma_actes_realises a
       set plan_id = coalesce(a.plan_id, p.id), rendez_vous_id = coalesce(a.rendez_vous_id, r.id)
    from public.jeux_lignes x join public.branchements_jeux j on j.id = x.jeu_id
    left join public.tiroma_plans p on p.client_id = p_client and p.entite_id = p_entite and p.source_ref = private.tiroma_v(x.valeurs, 'devis_numero')
    left join public.tiroma_rendez_vous r on r.client_id = p_client and r.entite_id = p_entite and r.source_ref = private.tiroma_v(x.valeurs, 'rdv_ref')
    where j.branchement_id = p_branchement and j.code = 'actes' and a.client_id = p_client and a.entite_id = p_entite
      and a.source_ref = private.tiroma_v(x.valeurs, 'ref')
      and ((a.plan_id is null and p.id is not null) or (a.rendez_vous_id is null and r.id is not null));
    get diagnostics n = row_count; n_liens := n_liens + n;
  end if;
  return jsonb_strip_nulls(jsonb_build_object('lignes_devis', nullif(n_lignes, 0), 'actes', nullif(n_actes, 0), 'labo', nullif(n_labo, 0),
                                              'odf', nullif(n_odf, 0), 'attente', nullif(n_attente, 0), 'liens', nullif(n_liens, 0)));
end $$;

-- Les faits dérivés de chaque patient actif (plan M0, étape 6) : dernier
-- rendez-vous honoré, prochain prévu, dernier acte, dernier contrôle (acte
-- qui vaut contrôle, ou rendez-vous de contrôle ou de détartrage honoré).
create function private.tiroma_faits_patients(p_client uuid, p_entite uuid, p_fuseau text, p_detecte timestamptz) returns integer
language plpgsql volatile security definer set search_path = '' as $$
declare g public.tiroma_regles; n integer;
begin
  select * into g from public.tiroma_regles where client_id = p_client and entite_id = p_entite;
  update public.tiroma_patients p
     set dernier_rdv_le = greatest(p.dernier_rdv_le, x.dernier_rdv), prochain_rdv_le = x.prochain,
         dernier_acte_le = greatest(p.dernier_acte_le, x.dernier_acte), dernier_controle_le = greatest(p.dernier_controle_le, x.dernier_controle)
  from (
    select pa.id,
      (select max((r.debut at time zone p_fuseau)::date) from public.tiroma_rendez_vous r
       where r.client_id = p_client and r.entite_id = p_entite and r.patient_id = pa.id and r.debut <= p_detecte
         and (r.statut = 'honore' or (r.statut = 'prevu' and r.presume = 'honore'))) as dernier_rdv,
      (select min(r.debut) from public.tiroma_rendez_vous r
       where r.client_id = p_client and r.entite_id = p_entite and r.patient_id = pa.id and r.statut = 'prevu' and r.debut > p_detecte) as prochain,
      (select max(a.date) from public.tiroma_actes_realises a
       where a.client_id = p_client and a.entite_id = p_entite and a.patient_id = pa.id) as dernier_acte,
      greatest(
        (select max(a.date) from public.tiroma_actes_realises a
         where a.client_id = p_client and a.entite_id = p_entite and a.patient_id = pa.id and a.code = any (g.actes_controle)),
        (select max((r.debut at time zone p_fuseau)::date) from public.tiroma_rendez_vous r
         join public.tiroma_types_rdv t on t.id = r.type_rdv_id
         where r.client_id = p_client and r.entite_id = p_entite and r.patient_id = pa.id and r.debut <= p_detecte
           and t.famille in ('controle', 'detartrage')
           and (r.statut = 'honore' or (r.statut = 'prevu' and r.presume = 'honore')))) as dernier_controle
    from public.tiroma_patients pa
    where pa.client_id = p_client and pa.entite_id = p_entite and pa.actif) x
  where p.id = x.id
    and (p.dernier_rdv_le, p.prochain_rdv_le, p.dernier_acte_le, p.dernier_controle_le) is distinct from
        (greatest(p.dernier_rdv_le, x.dernier_rdv), x.prochain, greatest(p.dernier_acte_le, x.dernier_acte), greatest(p.dernier_controle_le, x.dernier_controle));
  get diagnostics n = row_count;
  return n;
end $$;

-- Un rendez-vous passé resté « prévu », dont le patient a un acte facturé ce
-- jour-là, est présumé honoré (l'absence présumée, P39, viendra avec M6).
create function private.tiroma_presumer_honores(p_client uuid, p_entite uuid, p_fuseau text, p_detecte timestamptz, p_releve uuid) returns integer
language plpgsql volatile security definer set search_path = '' as $$
declare n integer;
begin
  with maj as (
    update public.tiroma_rendez_vous r set presume = 'honore'
    where r.client_id = p_client and r.entite_id = p_entite and r.statut = 'prevu' and r.presume is null
      and r.fin < p_detecte and r.patient_id is not null
      and exists (select 1 from public.tiroma_actes_realises a
                  where a.client_id = p_client and a.entite_id = p_entite and a.patient_id = r.patient_id
                    and a.date = (r.debut at time zone p_fuseau)::date)
    returning r.id, r.patient_id, r.source_ref, r.debut, r.fin, r.fauteuil_id, r.praticien_id, r.statut)
  insert into public.tiroma_evenements_agenda (client_id, entite_id, rendez_vous_id, patient_id, type, avant, apres, detecte_le, releve_id, cle_idempotence)
  select p_client, p_entite, m.id, m.patient_id, 'presume_honore', null,
         jsonb_build_object('debut', m.debut, 'fin', m.fin, 'fauteuil_id', m.fauteuil_id, 'praticien_id', m.praticien_id, 'statut', m.statut),
         p_detecte, p_releve, left('presume_honore:' || m.source_ref, 200)
  from maj m
  on conflict (client_id, cle_idempotence) do nothing;
  get diagnostics n = row_count;
  return n;
end $$;

-- Le rattachement prudent d'un rendez-vous à venir à un plan signé (plan
-- M0, étape 6) : même patient, praticien du plan, une ligne à faire de la
-- famille du rendez-vous, date dans la validité. Un seul candidat : le lien
-- se pose. Plusieurs : rien n'est rattaché, les plans passent « à vérifier ».
create function private.tiroma_rattacher_plans(p_client uuid, p_entite uuid, p_fuseau text, p_detecte timestamptz) returns jsonb
language plpgsql volatile security definer set search_path = '' as $$
declare
  c record;
  n_lies integer := 0;
  n_verif integer := 0;
begin
  for c in
    with rdv as (
      select r.id, r.patient_id, r.praticien_id, (r.debut at time zone p_fuseau)::date as jour, t.famille
      from public.tiroma_rendez_vous r join public.tiroma_types_rdv t on t.id = r.type_rdv_id
      where r.client_id = p_client and r.entite_id = p_entite and r.plan_id is null and r.statut = 'prevu' and r.debut > p_detecte
        and r.patient_id is not null and t.famille is not null
        and t.famille not in ('personnel', 'urgence', 'controle', 'detartrage', 'premiere_consultation', 'autre')
    ),
    cand as (
      select v.id as rdv_id, v.famille, p.id as plan_id
      from rdv v
      join public.tiroma_plans p on p.client_id = p_client and p.entite_id = p_entite and p.patient_id = v.patient_id
        and p.statut in ('signe', 'commence') and p.disparu_le is null
        and (p.praticien_id is null or v.praticien_id is null or p.praticien_id = v.praticien_id)
        and v.jour >= coalesce(p.signe_le, p.presente_le, v.jour)
        and v.jour <= coalesce(p.valide_jusqu_au, coalesce(p.presente_le, v.jour) + 365)
      where exists (select 1 from public.tiroma_plan_actes a
                    where a.plan_id = p.id and a.famille = v.famille and a.statut <> 'fait' and a.rendez_vous_id is null)
    )
    select rdv_id, famille, min(plan_id::text)::uuid as plan_id, count(distinct plan_id) as n, array_agg(distinct plan_id) as plans
    from cand group by rdv_id, famille
  loop
    if c.n = 1 then
      update public.tiroma_rendez_vous set plan_id = c.plan_id where id = c.rdv_id;
      update public.tiroma_plan_actes a
         set rendez_vous_id = c.rdv_id, statut = 'planifie'
       where a.id = (select a2.id from public.tiroma_plan_actes a2
                     where a2.plan_id = c.plan_id and a2.famille = c.famille and a2.statut <> 'fait' and a2.rendez_vous_id is null
                     order by a2.rang limit 1);
      n_lies := n_lies + 1;
    else
      update public.tiroma_plans set a_verifier = true where id = any (c.plans) and not a_verifier;
      n_verif := n_verif + 1;
    end if;
  end loop;
  return jsonb_build_object('lies', n_lies, 'a_verifier', n_verif);
end $$;

revoke all on function private.tiroma_appliquer_devis(uuid, uuid, uuid, boolean, timestamptz, text, uuid),
  private.tiroma_ligne_devis(uuid, uuid, jsonb, timestamptz),
  private.tiroma_appliquer_devis_lignes(uuid, uuid, uuid, boolean, timestamptz, text, uuid),
  private.tiroma_ligne_acte(uuid, uuid, jsonb, text, timestamptz),
  private.tiroma_appliquer_actes(uuid, uuid, uuid, boolean, timestamptz, text, uuid),
  private.tiroma_ligne_labo(uuid, uuid, jsonb, timestamptz),
  private.tiroma_appliquer_labo(uuid, uuid, uuid, boolean, timestamptz, text, uuid),
  private.tiroma_ligne_stock(uuid, uuid, jsonb, timestamptz),
  private.tiroma_appliquer_stock(uuid, uuid, uuid, boolean, timestamptz, text, uuid),
  private.tiroma_ligne_odf(uuid, uuid, jsonb, timestamptz),
  private.tiroma_appliquer_odf(uuid, uuid, uuid, boolean, timestamptz, text, uuid),
  private.tiroma_ligne_attente(uuid, uuid, jsonb, text, timestamptz),
  private.tiroma_appliquer_attente(uuid, uuid, uuid, boolean, timestamptz, text, uuid),
  private.tiroma_rattraper(uuid, uuid, uuid, text, timestamptz, boolean, boolean, boolean),
  private.tiroma_faits_patients(uuid, uuid, text, timestamptz),
  private.tiroma_presumer_honores(uuid, uuid, text, timestamptz, uuid),
  private.tiroma_rattacher_plans(uuid, uuid, text, timestamptz)
  from public;

-- ── 7. La matrice des capacités (plan M0, étape 8) ───────────────────────
-- Ce que le logiciel du cabinet renseigne vraiment, mesuré sur trente jours
-- autour du relevé, dans tiroma_capacites et chez B1 (public.capacite_de).
-- « Non tenu » s'affiche au lieu de zéro (R3), et le contrôle de M3 reste
-- éteint.

create function private.tiroma_etat_capacite(p_n bigint, p_k bigint, p_seuil numeric) returns text
language sql immutable set search_path = '' as $$
  select case when coalesce(p_n, 0) = 0 then 'inconnu'
              when p_k::numeric / p_n >= p_seuil then 'tenu'
              when p_k > 0 then 'partiel'
              else 'non_tenu' end
$$;

create function private.tiroma_noter_capacite(p_client uuid, p_entite uuid, p_branchement uuid, p_domaine text, p_etat text,
                                              p_mesure jsonb, p_quand timestamptz) returns void
language plpgsql volatile security definer set search_path = '' as $$
begin
  insert into public.tiroma_capacites (client_id, entite_id, domaine, etat, mesure, calcule_le)
  values (p_client, p_entite, p_domaine, p_etat, p_mesure, p_quand)
  on conflict (client_id, entite_id, domaine) do update
    set etat = excluded.etat, mesure = excluded.mesure, calcule_le = excluded.calcule_le;
  perform private.noter_capacite(p_branchement, p_domaine, jsonb_build_object('lecture', true, 'tenue', p_etat, 'mesure', p_mesure));
end $$;

create function private.tiroma_mesurer_capacites(p_client uuid, p_entite uuid, p_branchement uuid, p_fuseau text, p_detecte timestamptz)
returns jsonb
language plpgsql volatile security definer set search_path = '' as $$
declare
  j date := (p_detecte at time zone p_fuseau)::date;
  n bigint; k bigint; v_etat text;
  v_res jsonb := '{}'::jsonb;
begin
  -- Les fiches de laboratoire : part des rendez-vous de pose (trente jours
  -- autour du relevé) qui ont une fiche, par le lien ou par le patient.
  select count(*), count(*) filter (where exists (
           select 1 from public.tiroma_travaux_labo w
           where w.client_id = p_client and w.entite_id = p_entite
             and (w.rendez_vous_pose_id = r.id
                  or (w.patient_id = r.patient_id
                      and w.envoye_le between (r.debut at time zone p_fuseau)::date - 90 and (r.debut at time zone p_fuseau)::date))))
    into n, k
  from public.tiroma_rendez_vous r join public.tiroma_types_rdv t on t.id = r.type_rdv_id
  where r.client_id = p_client and r.entite_id = p_entite and t.famille = 'prothese_pose' and r.statut in ('prevu', 'honore')
    and (r.debut at time zone p_fuseau)::date between j - 30 and j + 30;
  v_etat := private.tiroma_etat_capacite(n, k, 0.8);
  perform private.tiroma_noter_capacite(p_client, p_entite, p_branchement, 'laboratoire', v_etat,
    jsonb_build_object('poses', n, 'avec_fiche', k, 'jours', 30), p_detecte);
  v_res := v_res || jsonb_build_object('laboratoire', v_etat);

  -- Les statuts « manqué » : au moins un en soixante jours.
  select count(*), count(*) filter (where r.statut = 'manque') into n, k
  from public.tiroma_rendez_vous r
  where r.client_id = p_client and r.entite_id = p_entite and r.debut < p_detecte
    and (r.debut at time zone p_fuseau)::date >= j - 60 and r.statut in ('prevu', 'honore', 'manque');
  v_etat := case when n = 0 then 'inconnu' when k > 0 then 'tenu' else 'non_tenu' end;
  perform private.tiroma_noter_capacite(p_client, p_entite, p_branchement, 'statuts_manques', v_etat,
    jsonb_build_object('rendez_vous', n, 'manques', k, 'jours', 60), p_detecte);
  v_res := v_res || jsonb_build_object('statuts_manques', v_etat);

  -- La date de signature des devis : part des devis signés (présentés dans
  -- les quatre-vingt-dix jours) qui la portent.
  select count(*), count(*) filter (where p.signe_le is not null) into n, k
  from public.tiroma_plans p
  where p.client_id = p_client and p.entite_id = p_entite and p.statut in ('signe', 'commence', 'termine')
    and p.presente_le between j - 90 and j;
  v_etat := private.tiroma_etat_capacite(n, k, 0.8);
  perform private.tiroma_noter_capacite(p_client, p_entite, p_branchement, 'signature_devis', v_etat,
    jsonb_build_object('signes', n, 'dates', k, 'jours', 90), p_detecte);
  v_res := v_res || jsonb_build_object('signature_devis', v_etat);

  -- Les liens familiaux : part des patients actifs qui en portent un.
  select count(*), count(*) filter (where p.famille_ref is not null) into n, k
  from public.tiroma_patients p where p.client_id = p_client and p.entite_id = p_entite and p.actif;
  v_etat := private.tiroma_etat_capacite(n, k, 0.1);
  perform private.tiroma_noter_capacite(p_client, p_entite, p_branchement, 'liens_familiaux', v_etat,
    jsonb_build_object('patients', n, 'avec_lien', k), p_detecte);
  v_res := v_res || jsonb_build_object('liens_familiaux', v_etat);

  -- Le stock : tenu s'il en vient des lignes ; non tenu si un export de stock
  -- est appliqué et vide ; inconnu sans export.
  select count(*) into k from public.tiroma_stock s where s.client_id = p_client and s.entite_id = p_entite and s.source = 'logiciel';
  v_etat := case when k > 0 then 'tenu'
                 when exists (select 1 from public.branchements_jeux x where x.branchement_id = p_branchement and x.code = 'stock' and x.courant_id is not null) then 'non_tenu'
                 else 'inconnu' end;
  perform private.tiroma_noter_capacite(p_client, p_entite, p_branchement, 'stock', v_etat, jsonb_build_object('references', k), p_detecte);
  v_res := v_res || jsonb_build_object('stock', v_etat);

  -- La date de création des rendez-vous (sert à la mesure de réinscription).
  select count(*), count(*) filter (where r.cree_source_le is not null) into n, k
  from public.tiroma_rendez_vous r
  where r.client_id = p_client and r.entite_id = p_entite and (r.debut at time zone p_fuseau)::date between j - 30 and j + 30;
  v_etat := private.tiroma_etat_capacite(n, k, 0.8);
  perform private.tiroma_noter_capacite(p_client, p_entite, p_branchement, 'dates_creation', v_etat,
    jsonb_build_object('rendez_vous', n, 'avec_date', k, 'jours', 30), p_detecte);
  v_res := v_res || jsonb_build_object('dates_creation', v_etat);
  return v_res;
end $$;

-- ── 8. Le relevé : de l'événement de B1 au verdict ───────────────────────

-- L'alerte « export en retard » d'un jeu se ferme quand un export arrive.
create function private.tiroma_fermer_alertes_retard(p_client uuid, p_jeu uuid) returns void
language sql volatile security definer set search_path = '' as $$
  update public.alertes
     set acquittee_le = now(), detail = detail || jsonb_build_object('resolution', 'un export est arrivé')
   where client_id = p_client and acquittee_le is null
     and cle_regroupement like 'tiroma:releve:retard:' || p_jeu::text || ':%'
$$;

-- Applique un relevé prêt (événement releve.pret.tiroma) : chaque export à
-- appliquer, dans l'ordre des jeux, passe la garde puis le miroir, et reçoit
-- son verdict dans la même transaction ; puis le rattrapage, les faits
-- dérivés, les présumés, les rattachements, les capacités ; enfin la ligne
-- tiroma_releves, la fraîcheur du cabinet, le journal (compteurs seuls) et le
-- battement. Rejouer le même relevé ne refait rien (R8).
create function private.tiroma_appliquer_releve(p_charge jsonb) returns jsonb
language plpgsql volatile security definer set search_path = '' as $$
declare
  b public.branchements;
  k public.tiroma_cabinets;
  rl public.releves;
  i record;
  v_rel uuid;
  v_recu timestamptz;
  v_reprise boolean;
  v_tout_reprise boolean;
  v_douteux boolean := false;
  v_raison text;
  v_jeux jsonb := '{}'::jsonb;
  c jsonb;
  v_res jsonb;
  v_appliques integer := 0;
  v_identiques integer := 0;
  v_lignes boolean := false;
  v_patients boolean := false;
  v_liens boolean := false;
  v_agenda boolean := false;
  v_statut text;
begin
  select * into b from public.branchements where id = (p_charge ->> 'branchement')::uuid;
  if not found or b.module <> 'tiroma' then
    raise exception 'Branchement introuvable ou étranger à Tiroma.' using errcode = 'P0002';
  end if;
  select * into k from public.tiroma_cabinets where client_id = b.client_id and entite_id = b.entite_id;
  if not found then
    raise exception 'Aucun cabinet Tiroma pour ce branchement.' using errcode = 'P0002';
  end if;
  select * into rl from public.releves where id = (p_charge ->> 'releve')::uuid and branchement_id = b.id;
  if not found then
    raise exception 'Relevé introuvable.' using errcode = 'P0002';
  end if;
  v_recu := rl.recu_le;
  perform set_config('omega.tiroma_moteur', 'releve', true);

  select x.id into v_rel from public.tiroma_releves x where x.client_id = b.client_id and x.releve_source_id = rl.id;
  if found then
    if not exists (select 1 from public.instantanes x where x.releve_id = rl.id and x.statut = 'a_appliquer') then
      return jsonb_build_object('releve', v_rel, 'deja_applique', true);
    end if;
  else
    v_tout_reprise := not exists (select 1 from public.instantanes x
                                  where x.releve_id = rl.id and x.statut in ('a_appliquer', 'applique', 'identique') and x.base_id is not null);
    insert into public.tiroma_releves (client_id, entite_id, releve_source_id, contrat, voie, mode, version_connecteur, recu_le, statut)
    values (b.client_id, b.entite_id, rl.id, 'tiroma.releve.v1', b.voie, case when v_tout_reprise then 'reprise' else 'complet' end,
            (select left(x.version_releve, 60) from public.instantanes x where x.releve_id = rl.id and x.version_releve is not null limit 1),
            rl.recu_le, 'en_cours')
    returning id into v_rel;
  end if;

  for i in
    select x.id, x.base_id, x.lignes, x.statut, j.code, j.id as jeu_id
    from public.instantanes x join public.branchements_jeux j on j.id = x.jeu_id
    where x.releve_id = rl.id and x.statut in ('a_appliquer', 'identique') and private.tiroma_ordre_jeu(j.code) is not null
    order by private.tiroma_ordre_jeu(j.code), x.recu_le
  loop
    perform private.tiroma_fermer_alertes_retard(b.client_id, i.jeu_id);
    if i.statut = 'identique' then
      v_identiques := v_identiques + 1;
      continue;
    end if;
    v_reprise := i.base_id is null;
    if i.code = 'agenda' and not v_reprise then
      v_raison := private.tiroma_garde_agenda(b.client_id, b.entite_id, i.id, b.fuseau, v_recu);
      if v_raison is not null then
        perform private.acquitter_instantane(i.id, 'douteux', v_raison);
        v_douteux := true;
        v_jeux := v_jeux || jsonb_build_object(i.code, jsonb_build_object('douteux', v_raison, 'lignes', i.lignes));
        perform private.journaliser_module(b.client_id, 'tiroma', 'tiroma.releve_douteux', 'tiroma_releves', v_rel::text,
          jsonb_build_object('releve', v_rel, 'jeu', i.code, 'raison', v_raison), b.entite_id);
        continue;
      end if;
    end if;
    c := case i.code
      when 'types_rdv'    then private.tiroma_appliquer_types(b.client_id, b.entite_id, i.id, v_reprise, v_recu, b.fuseau, v_rel)
      when 'patients'     then private.tiroma_appliquer_patients(b.client_id, b.entite_id, i.id, v_reprise, v_recu, b.fuseau, v_rel)
      when 'agenda'       then private.tiroma_appliquer_agenda(b.client_id, b.entite_id, i.id, v_reprise, v_recu, b.fuseau, v_rel)
      when 'devis'        then private.tiroma_appliquer_devis(b.client_id, b.entite_id, i.id, v_reprise, v_recu, b.fuseau, v_rel)
      when 'devis_lignes' then private.tiroma_appliquer_devis_lignes(b.client_id, b.entite_id, i.id, v_reprise, v_recu, b.fuseau, v_rel)
      when 'actes'        then private.tiroma_appliquer_actes(b.client_id, b.entite_id, i.id, v_reprise, v_recu, b.fuseau, v_rel)
      when 'labo'         then private.tiroma_appliquer_labo(b.client_id, b.entite_id, i.id, v_reprise, v_recu, b.fuseau, v_rel)
      when 'stock'        then private.tiroma_appliquer_stock(b.client_id, b.entite_id, i.id, v_reprise, v_recu, b.fuseau, v_rel)
      when 'odf'          then private.tiroma_appliquer_odf(b.client_id, b.entite_id, i.id, v_reprise, v_recu, b.fuseau, v_rel)
      when 'attente'      then private.tiroma_appliquer_attente(b.client_id, b.entite_id, i.id, v_reprise, v_recu, b.fuseau, v_rel)
    end;
    perform private.acquitter_instantane(i.id, 'applique');
    v_appliques := v_appliques + 1;
    if v_reprise then
      c := c || jsonb_build_object('reprise', true);
      perform private.journaliser_module(b.client_id, 'tiroma', 'tiroma.reprise_initiale', 'tiroma_releves', v_rel::text,
        jsonb_build_object('releve', v_rel, 'jeu', i.code, 'lignes', i.lignes), b.entite_id);
    end if;
    v_jeux := v_jeux || jsonb_build_object(i.code, c);
    v_lignes := v_lignes or i.code = 'devis' or (i.code = 'devis_lignes' and coalesce((c ->> 'orphelines')::integer, 0) > 0);
    v_patients := v_patients or (i.code = 'patients' and coalesce((c ->> 'ajouts')::integer, 0) > 0);
    v_liens := v_liens or i.code in ('agenda', 'devis', 'devis_lignes');
    v_agenda := v_agenda or i.code in ('agenda', 'actes', 'types_rdv');
  end loop;

  if v_appliques > 0 then
    v_res := private.tiroma_rattraper(b.client_id, b.entite_id, b.id, b.fuseau, v_recu, v_lignes, v_patients, v_liens);
    if v_res <> '{}'::jsonb then
      v_jeux := v_jeux || jsonb_build_object('rattrapage', v_res);
    end if;
    v_jeux := v_jeux || jsonb_build_object('presumes_honores', private.tiroma_presumer_honores(b.client_id, b.entite_id, b.fuseau, v_recu, v_rel));
    v_jeux := v_jeux || jsonb_build_object('patients_maj', private.tiroma_faits_patients(b.client_id, b.entite_id, b.fuseau, v_recu));
    if v_liens or v_agenda then
      v_jeux := v_jeux || jsonb_build_object('rattachements', private.tiroma_rattacher_plans(b.client_id, b.entite_id, b.fuseau, v_recu));
    end if;
    v_jeux := v_jeux || jsonb_build_object('capacites', private.tiroma_mesurer_capacites(b.client_id, b.entite_id, b.id, b.fuseau, v_recu));
  end if;
  v_jeux := v_jeux || jsonb_strip_nulls(jsonb_build_object(
    'identiques', nullif(v_identiques, 0),
    'patients_crees', nullif((select count(*) from public.tiroma_patients p where p.client_id = b.client_id and p.entite_id = b.entite_id and p.vu_premier_le = v_recu), 0),
    'praticiens_crees', nullif((select count(*) from public.tiroma_praticiens p where p.client_id = b.client_id and p.entite_id = b.entite_id and p.cree_le = v_recu), 0),
    'fauteuils_crees', nullif((select count(*) from public.tiroma_fauteuils f where f.client_id = b.client_id and f.entite_id = b.entite_id and f.cree_le = v_recu), 0),
    'types_crees', nullif((select count(*) from public.tiroma_types_rdv t where t.client_id = b.client_id and t.entite_id = b.entite_id and t.cree_le = v_recu), 0)));

  v_statut := case when v_douteux then 'douteux' else 'ok' end;
  update public.tiroma_releves
     set statut = v_statut, fini_le = now(), compteurs = v_jeux,
         raison = case when v_douteux then left((select string_agg(e.value ->> 'douteux', ' ; ') from jsonb_each(v_jeux) e where e.value ? 'douteux'), 500) end
   where id = v_rel;
  update public.tiroma_cabinets
     set dernier_releve_le = greatest(coalesce(dernier_releve_le, v_recu), v_recu),
         dernier_releve_ok_le = case when v_douteux then dernier_releve_ok_le else greatest(coalesce(dernier_releve_ok_le, v_recu), v_recu) end,
         releves_douteux_suite = case when v_douteux then releves_douteux_suite + 1 else 0 end
   where id = k.id;
  perform private.journaliser_module(b.client_id, 'tiroma', 'tiroma.releve_termine', 'tiroma_releves', v_rel::text,
    jsonb_build_object('releve', v_rel, 'statut', v_statut, 'appliques', v_appliques, 'compteurs', v_jeux), b.entite_id);
  if not v_douteux then
    perform private.battre(b.client_id, 'tiroma_releve', jsonb_build_object('releve', v_rel, 'appliques', v_appliques), interval '3 days');
  end if;
  return jsonb_build_object('releve', v_rel, 'statut', v_statut, 'appliques', v_appliques, 'compteurs', v_jeux);
end $$;

-- ── 9. Le relevé en retard : dit au cabinet, sans nom de patient ─────────
-- B1 publie releve.en_retard.tiroma quand le fichier du matin manque ; les
-- jeux de Tiroma sont réglés « alerter: false » pour que ce soit Tiroma qui
-- écrive sa phrase (plan M0, battement et alerte).
create function private.tiroma_releve_en_retard(p_charge jsonb) returns jsonb
language plpgsql volatile security definer set search_path = '' as $$
declare
  j public.branchements_jeux;
  b public.branchements;
  k public.tiroma_cabinets;
  v_avant timestamptz;
  v_id uuid;
begin
  select * into j from public.branchements_jeux where id = (p_charge ->> 'jeu')::uuid;
  if not found then
    return jsonb_build_object('ignore', 'jeu inconnu');
  end if;
  select * into b from public.branchements where id = j.branchement_id;
  select * into k from public.tiroma_cabinets where client_id = b.client_id and entite_id = b.entite_id;
  if not found or k.statut <> 'actif' then
    return jsonb_build_object('ignore', 'cabinet non actif');
  end if;
  v_avant := coalesce((p_charge ->> 'avant')::timestamptz, now());
  v_id := private.lever_alerte_module(b.client_id, 'tiroma', 'attention',
    left(format('Tiroma n''a pas reçu l''export « %s » de votre logiciel ce matin (attendu avant %s) : le point du matin sera incomplet.',
                j.libelle, to_char(v_avant at time zone b.fuseau, 'HH24"h"MI')), 200),
    jsonb_build_object('jeu', j.code, 'attendu_avant', v_avant, 'dernier_recu_le', p_charge -> 'dernier_recu_le', 'donnees_du', p_charge -> 'etat_le'),
    'releve:retard:' || j.id::text || ':' || to_char(v_avant at time zone b.fuseau, 'YYYYMMDD'), true, null);
  return jsonb_strip_nulls(jsonb_build_object('alerte', v_id));
end $$;

-- ── 10. La file : Tiroma prend ses travaux et les fait en SQL ────────────
-- Chaque minute, sous bail, avec la reprise du socle en cas d'échec (délai
-- croissant, puis alerte critique interne) : aucun ouvrier à héberger.
create function private.tiroma_traiter_travaux(p_nombre integer default 20) returns jsonb
language plpgsql volatile security definer set search_path = '' as $$
declare
  t public.travaux;
  r jsonb;
  n_ok integer := 0;
  n_ko integer := 0;
begin
  perform set_config('omega.tiroma_moteur', 'releve', true);
  for t in
    select * from private.prendre_travaux(array['tiroma.appliquer_releve', 'tiroma.releve_en_retard'], p_nombre, interval '10 minutes', 'tiroma-sql')
  loop
    begin
      r := case t.genre
             when 'tiroma.appliquer_releve' then private.tiroma_appliquer_releve(t.charge)
             else private.tiroma_releve_en_retard(t.charge) end;
      perform private.finir_travail(t.id, r);
      n_ok := n_ok + 1;
    exception when others then
      perform private.echouer_travail(t.id, left(sqlerrm, 2000), true);
      n_ko := n_ko + 1;
    end;
  end loop;
  return jsonb_build_object('faits', n_ok, 'echecs', n_ko);
end $$;
comment on function private.tiroma_traiter_travaux(integer) is
  'La file de Tiroma : prend ses travaux (relevé prêt, relevé en retard) dans la file du socle et les fait en SQL, chaque minute.';

select cron.schedule('tiroma-releves', '* * * * *', $$select private.tiroma_traiter_travaux()$$);

-- ── 11. Droits ───────────────────────────────────────────────────────────
revoke all on function private.tiroma_etat_capacite(bigint, bigint, numeric),
  private.tiroma_noter_capacite(uuid, uuid, uuid, text, text, jsonb, timestamptz),
  private.tiroma_mesurer_capacites(uuid, uuid, uuid, text, timestamptz),
  private.tiroma_fermer_alertes_retard(uuid, uuid),
  private.tiroma_appliquer_releve(jsonb), private.tiroma_releve_en_retard(jsonb), private.tiroma_traiter_travaux(integer)
  from public;
grant execute on function private.tiroma_traiter_travaux(integer) to service_role;
