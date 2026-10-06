/* ══════════════════════════════════════════════════════════════════════
   Le monde d'EXEMPLE de l'écran TIROMA (05/10/2026, session B3)

   Un cabinet fictif, « Cabinet dentaire des Flamboyants » (Pointe-à-Pitre,
   trois fauteuils, deux praticiens, une assistante), branché sur Logos_w.
   Tout ce qui est affiché quand l'interrupteur de source est sur « Données
   d'exemple ». Les identifiants commencent par 0000… : rien ici ne peut
   être confondu avec une ligne de la base, et rien n'est jamais écrit en
   base. Aucun patient réel : noms inventés.

   Les dates sont RELATIVES au jour de la visite (dans / ilYa) pour que
   les créneaux restent « à venir » et les plans « anciens ».
   ══════════════════════════════════════════════════════════════════════ */

import { EXEMPLE_CLIENT_ID, aujourdHui, dans, ilYa } from "../exemples/socle";
import type { Cabinet, Dossier, Fauteuil, Horaire, Praticien, Regles, Releve, TypeRdv } from "./types";

const C = EXEMPLE_CLIENT_ID;
export const ENTITE_CABINET = "00000000-0000-4000-8000-0000000000e3";
export const ENTITE_CABINET_NOM = "Cabinet dentaire des Flamboyants (exemple)";

const F1 = "00000000-0000-4000-8000-0000000000f1";
const F2 = "00000000-0000-4000-8000-0000000000f2";
const F3 = "00000000-0000-4000-8000-0000000000f3";
const P1 = "00000000-0000-4000-8000-0000000000d1";
const P2 = "00000000-0000-4000-8000-0000000000d2";

/** Une heure du jour (décalé de n jours) en ISO, heure locale du navigateur. */
function a(jours: number, heure: number, minute = 0): string {
  const d = new Date();
  d.setDate(d.getDate() + jours);
  d.setHours(heure, minute, 0, 0);
  return d.toISOString();
}

const cabinet: Cabinet = {
  id: "00000000-0000-4000-8000-0000000000c0",
  client_id: C,
  entite_id: ENTITE_CABINET,
  logiciel: "logosw",
  logiciel_version: "2026.1",
  heure_point: "07:00:00",
  perimetre_partage: "cabinet",
  mode: "reel",
  mode_depuis: ilYa(21, 9),
  statut: "actif",
  dernier_releve_le: a(0, 7, 42),
  dernier_releve_ok_le: a(0, 7, 42),
  releves_douteux_suite: 0,
  cree_le: ilYa(40, 10),
  entite_nom: ENTITE_CABINET_NOM,
};

const fauteuils: Fauteuil[] = [
  { id: F1, entite_id: ENTITE_CABINET, nom: "Fauteuil 1", capacites: ["soins", "prevention"], objectif_occupation: 0.85, actif: true },
  { id: F2, entite_id: ENTITE_CABINET, nom: "Fauteuil 2", capacites: ["soins", "prothese", "chirurgie"], objectif_occupation: 0.8, actif: true },
  { id: F3, entite_id: ENTITE_CABINET, nom: "Fauteuil 3", capacites: ["orthodontie", "soins"], objectif_occupation: 0.7, actif: true },
];

const praticiens: Praticien[] = [
  { id: P1, entite_id: ENTITE_CABINET, nom_affiche: "Dr Ambre Lacour", metier: "titulaire", actif: true },
  { id: P2, entite_id: ENTITE_CABINET, nom_affiche: "Dr Mathis Rousseau", metier: "collaborateur", actif: true },
];

const horaires: Horaire[] = [1, 2, 3, 4, 5].flatMap((jour) => [
  { id: `h-${jour}-m`, entite_id: ENTITE_CABINET, praticien_id: null, fauteuil_id: null, jour, debut: "08:00:00", fin: "12:00:00", valide_du: null, valide_au: null, exceptionnel: false, source: "saisie" as const },
  { id: `h-${jour}-a`, entite_id: ENTITE_CABINET, praticien_id: null, fauteuil_id: null, jour, debut: "14:00:00", fin: "19:00:00", valide_du: null, valide_au: null, exceptionnel: false, source: "saisie" as const },
]).concat([{ id: "h-6-m", entite_id: ENTITE_CABINET, praticien_id: null, fauteuil_id: null, jour: 6, debut: "08:00:00", fin: "12:00:00", valide_du: null, valide_au: null, exceptionnel: false, source: "saisie" }]);

const regles: Regles = {
  id: "00000000-0000-4000-8000-0000000000a0",
  entite_id: ENTITE_CABINET,
  ordre_priorite: ["plan", "attente", "controle"],
  tenir_duree: true,
  tenir_preferences: true,
  creneau_min_minutes: 20,
  delai_min_appel_minutes: 90,
  horizon_creneaux_jours: 2,
  nb_propositions: 3,
  seuil_controle_mois: 12,
  quota_controles_demi_journee: 2,
  delai_interruption_jours: 21,
  alerte_devis_expire_jours: 30,
  labo_verif_jours: 2,
  seuil_demi_journee_vide: 0.2,
  objectif_production_semaine: 18000,
};

const releves: Releve[] = [
  { id: "r-0", entite_id: ENTITE_CABINET, voie: "exports", mode: "courant", recu_le: a(0, 7, 40), fini_le: a(0, 7, 42), statut: "ok", raison: null, compteurs: { agenda: { ajouts: 3, modifications: 11, evenements: 2 }, patients: { ajouts: 1, modifications: 4 } } },
  { id: "r-1", entite_id: ENTITE_CABINET, voie: "exports", mode: "courant", recu_le: a(-1, 19, 5), fini_le: a(-1, 19, 6), statut: "ok", raison: null, compteurs: { agenda: { ajouts: 6, modifications: 9 }, devis: { ajouts: 2 } } },
  { id: "r-2", entite_id: ENTITE_CABINET, voie: "exports", mode: "courant", recu_le: a(-2, 12, 31), fini_le: a(-2, 12, 32), statut: "douteux", raison: "un jour d'au moins 10 rendez-vous entièrement vidé en un seul relevé : " + aujourdHui(3) + " (14 rendez-vous)", compteurs: {} },
  { id: "r-3", entite_id: ENTITE_CABINET, voie: "exports", mode: "reprise", recu_le: ilYa(21, 9), fini_le: ilYa(21, 9), statut: "ok", raison: null, compteurs: { patients: { ajouts: 1842 }, agenda: { ajouts: 3127 }, devis: { ajouts: 214 } } },
];

const types: TypeRdv[] = [
  { id: "t-1", entite_id: ENTITE_CABINET, libelle_source: "Contrôle annuel", categorie_source: "Prévention", duree_defaut_min: 20, famille: "controle", necessite_labo: false, chirurgie: false, exige_assistante: false, capacite_requise: "prevention", classe_par: "humain", confiance: null, statut: "valide" },
  { id: "t-2", entite_id: ENTITE_CABINET, libelle_source: "Détartrage", categorie_source: "Prévention", duree_defaut_min: 30, famille: "detartrage", necessite_labo: false, chirurgie: false, exige_assistante: true, capacite_requise: "prevention", classe_par: "regle", confiance: "haute", statut: "propose" },
  { id: "t-3", entite_id: ENTITE_CABINET, libelle_source: "Couronne — pose", categorie_source: "Prothèse", duree_defaut_min: 45, famille: "prothese_pose", necessite_labo: true, chirurgie: false, exige_assistante: true, capacite_requise: "prothese", classe_par: "regle", confiance: "haute", statut: "propose" },
  { id: "t-4", entite_id: ENTITE_CABINET, libelle_source: "Implant — chirurgie", categorie_source: "Chirurgie", duree_defaut_min: 90, famille: "implant_chirurgie", necessite_labo: false, chirurgie: true, exige_assistante: true, capacite_requise: "chirurgie", classe_par: "regle", confiance: "haute", statut: "valide" },
  { id: "t-5", entite_id: ENTITE_CABINET, libelle_source: "RDV LV", categorie_source: null, duree_defaut_min: 30, famille: null, necessite_labo: false, chirurgie: false, exige_assistante: true, capacite_requise: null, classe_par: null, confiance: null, statut: "a_classer" },
  { id: "t-6", entite_id: ENTITE_CABINET, libelle_source: "Réunion d'équipe", categorie_source: null, duree_defaut_min: 60, famille: "personnel", necessite_labo: false, chirurgie: false, exige_assistante: false, capacite_requise: null, classe_par: "regle", confiance: "haute", statut: "propose" },
];

export const DOSSIER_EXEMPLE: Dossier = {
  cabinet,
  profil: "titulaire",
  fauteuils,
  praticiens,
  membres: [
    { id: "m-1", entite_id: ENTITE_CABINET, prenom: "Élodie", fauteuil_habituel_id: F1, actif: true },
    { id: "m-2", entite_id: ENTITE_CABINET, prenom: "Karine", fauteuil_habituel_id: F2, actif: true },
  ],
  horaires,
  fermetures: [
    { id: "fe-1", entite_id: ENTITE_CABINET, praticien_id: P2, fauteuil_id: null, debut: dans(8, 0), fin: dans(13, 0), nature: "conge", source: "saisie" },
    { id: "fe-2", entite_id: ENTITE_CABINET, praticien_id: null, fauteuil_id: null, debut: dans(20, 0), fin: dans(21, 0), nature: "formation", source: "saisie" },
  ],
  regles,
  releves,
  capacites: [
    { id: "k-1", domaine: "laboratoire", etat: "tenu", mesure: { poses: 12, avec_fiche: 11, jours: 30 }, calcule_le: a(0, 7, 42) },
    { id: "k-2", domaine: "statuts_manques", etat: "tenu", mesure: { rendez_vous: 418, manques: 9, jours: 60 }, calcule_le: a(0, 7, 42) },
    { id: "k-3", domaine: "signature_devis", etat: "partiel", mesure: { signes: 31, dates: 19, jours: 90 }, calcule_le: a(0, 7, 42) },
    { id: "k-4", domaine: "liens_familiaux", etat: "tenu", mesure: { patients: 1842, avec_lien: 612 }, calcule_le: a(0, 7, 42) },
    { id: "k-5", domaine: "stock", etat: "tenu", mesure: { references: 14 }, calcule_le: a(0, 7, 42) },
    { id: "k-6", domaine: "dates_creation", etat: "non_tenu", mesure: { rendez_vous: 212, avec_date: 0, jours: 30 }, calcule_le: a(0, 7, 42) },
  ],
  types,
  attente: [
    { id: "at-1", entite_id: ENTITE_CABINET, patient_id: "pa-2", famille: "soin_conservateur", duree_min: 30, praticien_id: null, preavis_minutes: 60, drapeau_gene: true, source: "logiciel", ajoute_le: ilYa(9), retire_le: null, motif_retrait: null, patient_nom: "Kévin Bazile" },
    { id: "at-2", entite_id: ENTITE_CABINET, patient_id: "pa-4", famille: "detartrage", duree_min: 30, praticien_id: null, preavis_minutes: null, drapeau_gene: false, source: "logiciel", ajoute_le: ilYa(16), retire_le: null, motif_retrait: null, patient_nom: "Jean-Luc Nabajoth" },
    { id: "at-3", entite_id: ENTITE_CABINET, patient_id: "pa-14", famille: "controle", duree_min: 20, praticien_id: P2, preavis_minutes: 120, drapeau_gene: false, source: "tiroma", ajoute_le: ilYa(3), retire_le: null, motif_retrait: null, patient_nom: "Aurélie Cornélie" },
  ],
  creneaux: [
    {
      evenement_id: 9101, type: "annulation", detecte_le: a(0, 7, 42), rendez_vous_id: "rdv-1", debut: a(1, 9, 0), fin: a(1, 9, 45), minutes: 45,
      fauteuil_id: F2, fauteuil_nom: "Fauteuil 2", praticien_id: P1, praticien_nom: "Dr Ambre Lacour", famille: "prothese_preparation", libre: true,
      candidats: [
        { rang: 1, origine: "plan", patient_id: "pa-1", patient_nom: "Marguerite Delannoy", motif: "plan signé le " + new Date(ilYa(42)).toLocaleDateString("fr-FR") + " : Couronne céramique 26 (séance 1)", duree_min: 45, plan_id: "pl-1", attente_id: null, depuis: aujourdHui(-42), preferences_ok: true, ne_pas_contacter: false },
        { rang: 2, origine: "attente", patient_id: "pa-2", patient_nom: "Kévin Bazile", motif: "en liste d'attente depuis le " + new Date(ilYa(9)).toLocaleDateString("fr-FR") + " : Soin composite (patient gêné)", duree_min: 30, plan_id: null, attente_id: "at-1", depuis: aujourdHui(-9), preferences_ok: true, ne_pas_contacter: false },
        { rang: 3, origine: "controle", patient_id: "pa-3", patient_nom: "Rosalie Nestor", motif: "dernier contrôle le " + new Date(ilYa(430)).toLocaleDateString("fr-FR"), duree_min: 20, plan_id: null, attente_id: null, depuis: aujourdHui(-430), preferences_ok: false, ne_pas_contacter: false },
      ],
    },
    {
      evenement_id: 9102, type: "report", detecte_le: a(-1, 18, 30), rendez_vous_id: "rdv-2", debut: a(1, 15, 0), fin: a(1, 15, 30), minutes: 30,
      fauteuil_id: F1, fauteuil_nom: "Fauteuil 1", praticien_id: P2, praticien_nom: "Dr Mathis Rousseau", famille: "controle", libre: true,
      candidats: [
        { rang: 1, origine: "attente", patient_id: "pa-4", patient_nom: "Jean-Luc Nabajoth", motif: "en liste d'attente depuis le " + new Date(ilYa(16)).toLocaleDateString("fr-FR") + " : Détartrage", duree_min: 30, plan_id: null, attente_id: "at-2", depuis: aujourdHui(-16), preferences_ok: true, ne_pas_contacter: false },
        { rang: 2, origine: "controle", patient_id: "pa-5", patient_nom: "Sylvie Rigoulet", motif: "dernier contrôle le " + new Date(ilYa(395)).toLocaleDateString("fr-FR"), duree_min: 20, plan_id: null, attente_id: null, depuis: aujourdHui(-395), preferences_ok: true, ne_pas_contacter: false },
      ],
    },
    {
      evenement_id: 9103, type: "deplacement", detecte_le: a(0, 7, 42), rendez_vous_id: "rdv-3", debut: a(2, 10, 30), fin: a(2, 11, 0), minutes: 30,
      fauteuil_id: F3, fauteuil_nom: "Fauteuil 3", praticien_id: P2, praticien_nom: "Dr Mathis Rousseau", famille: "orthodontie_controle", libre: false, candidats: [],
    },
  ],
  plans: [
    { plan_id: "pl-1", devis_numero: "D-2026-0412", type: "conventionnel", statut: "signe", patient_id: "pa-1", patient_nom: "Marguerite Delannoy", praticien_id: P1, praticien_nom: "Dr Ambre Lacour", signe_le: aujourdHui(-42), depuis: aujourdHui(-42), jours_depuis: 42, montant: 1180, reste_a_charge: 420, mutuelle_statut: "accord", mutuelle_reponse_le: aujourdHui(-21), mutuelle_accord_sans_rdv: true, valide_jusqu_au: aujourdHui(138), jours_avant_expiration: 138, a_verifier: false, lignes_a_faire: 2, lignes_faites: 0, prochaine: { rang: 1, libelle: "Couronne céramique 26 — préparation", famille: "prothese_preparation", duree_min: 45, seance: 1 }, proches_a_planifier: 1, ne_pas_contacter: false },
    { plan_id: "pl-2", devis_numero: "D-2026-0458", type: "conventionnel", statut: "commence", patient_id: "pa-6", patient_nom: "Patrice Zami", praticien_id: P2, praticien_nom: "Dr Mathis Rousseau", signe_le: aujourdHui(-35), depuis: aujourdHui(-35), jours_depuis: 35, montant: 640, reste_a_charge: 0, mutuelle_statut: "non_requise", mutuelle_reponse_le: null, mutuelle_accord_sans_rdv: false, valide_jusqu_au: aujourdHui(145), jours_avant_expiration: 145, a_verifier: false, lignes_a_faire: 1, lignes_faites: 1, prochaine: { rang: 2, libelle: "Traitement de racine 36 — séance 2", famille: "endodontie", duree_min: 60, seance: 2 }, proches_a_planifier: 0, ne_pas_contacter: false },
    { plan_id: "pl-3", devis_numero: "D-2026-0501", type: "conventionnel", statut: "signe", patient_id: "pa-7", patient_nom: "Nadège Hilaire", praticien_id: P1, praticien_nom: "Dr Ambre Lacour", signe_le: aujourdHui(-12), depuis: aujourdHui(-12), jours_depuis: 12, montant: 2950, reste_a_charge: 1300, mutuelle_statut: "demandee", mutuelle_reponse_le: null, mutuelle_accord_sans_rdv: false, valide_jusqu_au: aujourdHui(22), jours_avant_expiration: 22, a_verifier: true, lignes_a_faire: 3, lignes_faites: 0, prochaine: { rang: 1, libelle: "Bridge 44-46 — préparation", famille: "prothese_preparation", duree_min: 60, seance: 1 }, proches_a_planifier: 0, ne_pas_contacter: false },
    { plan_id: "pl-4", devis_numero: "D-2026-0509", type: "conventionnel", statut: "signe", patient_id: "pa-8", patient_nom: "Lucas Mondésir", praticien_id: null, praticien_nom: null, signe_le: aujourdHui(-5), depuis: aujourdHui(-5), jours_depuis: 5, montant: 95, reste_a_charge: 28, mutuelle_statut: "non_requise", mutuelle_reponse_le: null, mutuelle_accord_sans_rdv: false, valide_jusqu_au: null, jours_avant_expiration: null, a_verifier: false, lignes_a_faire: 1, lignes_faites: 0, prochaine: { rang: 1, libelle: "Scellement de sillons", famille: "soin_conservateur", duree_min: 30, seance: 1 }, proches_a_planifier: 2, ne_pas_contacter: true },
  ],
  verifications: [
    { nature: "labo", gravite: "critique", quand: aujourdHui(2), rendez_vous_id: "rdv-10", patient_id: "pa-9", patient_nom: "Michel Dorville", texte: "Couronne — pose : le travail n'est pas revenu du laboratoire, attendu le " + new Date(ilYa(1)).toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit" }) + " (pose le " + new Date(dans(2)).toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit" }) + ").", objet_type: "tiroma_travaux_labo", objet_id: "w-1" },
    { nature: "implant", gravite: "attention", quand: aujourdHui(1), rendez_vous_id: "rdv-11", patient_id: "pa-10", patient_nom: "Christiane Laurent", texte: "Implant — chirurgie le " + new Date(dans(1)).toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit" }) + " : 1 référence d'implant sous le seuil (NB-4.3-10).", objet_type: "tiroma_stock", objet_id: null },
    { nature: "devis_expire", gravite: "attention", quand: aujourdHui(22), rendez_vous_id: null, patient_id: "pa-7", patient_nom: "Nadège Hilaire", texte: "Le devis D-2026-0501 (2950 €) expire le " + new Date(dans(22)).toLocaleDateString("fr-FR") + " : passé la date, il faudra le refaire et redemander l'accord de la mutuelle.", objet_type: "tiroma_plans", objet_id: "pl-3" },
    { nature: "mutuelle_accord", gravite: "attention", quand: aujourdHui(-21), rendez_vous_id: null, patient_id: "pa-1", patient_nom: "Marguerite Delannoy", texte: "La mutuelle a donné son accord le " + new Date(ilYa(21)).toLocaleDateString("fr-FR") + " pour le devis D-2026-0412 : aucun rendez-vous n'a suivi.", objet_type: "tiroma_plans", objet_id: "pl-1" },
    { nature: "odf_accord", gravite: "attention", quand: aujourdHui(38), rendez_vous_id: null, patient_id: "pa-12", patient_nom: "Inès Bertrand", texte: "Orthodontie : l'accord de l'Assurance maladie du " + new Date(ilYa(145)).toLocaleDateString("fr-FR") + " n'a pas été suivi d'un début de traitement ; il expire le " + new Date(dans(38)).toLocaleDateString("fr-FR") + ".", objet_type: "tiroma_ententes_odf", objet_id: "o-1" },
    { nature: "interruption", gravite: "attention", quand: aujourdHui(-35), rendez_vous_id: null, patient_id: "pa-6", patient_nom: "Patrice Zami", texte: "Traitement interrompu : la séance 1 de « Traitement de racine 36 » est faite depuis le " + new Date(ilYa(35)).toLocaleDateString("fr-FR") + ", la suivante n'est pas posée (35 jours).", objet_type: "tiroma_plans", objet_id: "pl-2" },
    { nature: "labo", gravite: "info", quand: aujourdHui(1), rendez_vous_id: "rdv-12", patient_id: "pa-13", patient_nom: "Georges Pétro", texte: "Couronne — pose : le travail est revenu du laboratoire (couronne céramo-métallique 16).", objet_type: "tiroma_travaux_labo", objet_id: "w-2" },
  ],
  charge: {
    jour: aujourdHui(0),
    seuil_demi_journee_vide: 0.2,
    fauteuils: [
      { fauteuil_id: F1, nom: "Fauteuil 1", capacites: ["soins", "prevention"], objectif_occupation: 0.85, assistante_habituelle: "Élodie", matin: { ouvert_min: 240, prevu_min: 210, taux: 0.875, vide: false }, apres_midi: { ouvert_min: 300, prevu_min: 240, taux: 0.8, vide: false }, journee: { ouvert_min: 540, prevu_min: 450, taux: 0.833, vide: false }, rendez_vous: 14, sans_assistante_exigee: 0 },
      { fauteuil_id: F2, nom: "Fauteuil 2", capacites: ["soins", "prothese", "chirurgie"], objectif_occupation: 0.8, assistante_habituelle: null, matin: { ouvert_min: 240, prevu_min: 195, taux: 0.813, vide: false }, apres_midi: { ouvert_min: 300, prevu_min: 45, taux: 0.15, vide: true }, journee: { ouvert_min: 540, prevu_min: 240, taux: 0.444, vide: false }, rendez_vous: 6, sans_assistante_exigee: 4 },
      { fauteuil_id: F3, nom: "Fauteuil 3", capacites: ["orthodontie", "soins"], objectif_occupation: 0.7, assistante_habituelle: null, matin: { ouvert_min: 240, prevu_min: 0, taux: 0, vide: true }, apres_midi: { ouvert_min: 300, prevu_min: 180, taux: 0.6, vide: false }, journee: { ouvert_min: 540, prevu_min: 180, taux: 0.333, vide: false }, rendez_vous: 5, sans_assistante_exigee: 3 },
    ],
    total: { ouvert_min: 1620, prevu_min: 870, taux: 0.537 },
    demi_journees_vides: 2,
  },
  /* b3_12 : trente jours d'appels du cabinet d'exemple */
  appels: {
    jour: aujourdHui(0),
    a_reprendre: [
      { patient_id: "pa-6", patient_nom: "Patrice Zami", motif: "plan", plan_id: "pl-2", issue: "message", appele_le: a(-1, 16, 10), rappeler_le: null, par: "Élodie", tentatives: 1, du: true },
      { patient_id: "pa-5", patient_nom: "Sylvie Rigoulet", motif: "controle", plan_id: null, issue: "rappeler", appele_le: a(-3, 11, 5), rappeler_le: aujourdHui(0), par: "Élodie", tentatives: 2, du: true },
      { patient_id: "pa-7", patient_nom: "Nadège Hilaire", motif: "plan", plan_id: "pl-3", issue: "rappeler", appele_le: a(0, 8, 40), rappeler_le: aujourdHui(3), par: "Élodie", tentatives: 1, du: false },
    ],
    derniers: {
      "pa-6": { motif: "plan", issue: "message", appele_le: a(-1, 16, 10), rappeler_le: null, par: "Élodie" },
      "pa-5": { motif: "controle", issue: "rappeler", appele_le: a(-3, 11, 5), rappeler_le: aujourdHui(0), par: "Élodie" },
      "pa-7": { motif: "plan", issue: "rappeler", appele_le: a(0, 8, 40), rappeler_le: aujourdHui(3), par: "Élodie" },
    },
    bilan: { jours: 30, appels: 64, patients: 41, rdv_pris: 19, confirmes: 17, refus: 6, ne_plus_contacter: 1, a_reporter_logiciel: 1, valeur_plans: 8740, minutes_creneaux: 495 },
  },
  /* b3_13 : trente jours de pilotage du cabinet d'exemple */
  pilotage: {
    periode: { du: aujourdHui(-29), au: aujourdHui(0), jours: 30 },
    devis: {
      presentes: 38, signes: 24, taux: 0.632, montant_presente: 61840, montant_signe: 39210,
      par_panier: [
        { panier: "100_sante", presentes: 11, signes: 9, montant_signe: 4120 },
        { panier: "libre", presentes: 12, signes: 6, montant_signe: 21950 },
        { panier: "maitrise", presentes: 15, signes: 9, montant_signe: 13140 },
      ],
      precedent: { presentes: 34, signes: 19, taux: 0.559 },
    },
    en_attente: {
      devis: 9, montant: 18460, expirent_30j: 2, a_relancer: 3,
      a_relancer_liste: [
        { plan_id: "pl-9", patient_id: "pa-15", patient_nom: "Joëlle Céleste", devis_numero: "D-2026-0488", montant: 4280, reste_a_charge: 1960, presente_le: aujourdHui(-19), valide_jusqu_au: aujourdHui(161), panier: "libre" },
        { plan_id: "pl-10", patient_id: "pa-16", patient_nom: "Firmin Bellance", devis_numero: "D-2026-0497", montant: 1350, reste_a_charge: 410, presente_le: aujourdHui(-12), valide_jusqu_au: aujourdHui(18), panier: "maitrise" },
        { plan_id: "pl-11", patient_id: "pa-17", patient_nom: "Rose-Aimée Ternel", devis_numero: "D-2026-0503", montant: 690, reste_a_charge: 0, presente_le: aujourdHui(-9), valide_jusqu_au: aujourdHui(171), panier: "100_sante" },
      ],
    },
    plans_sans_rdv: { nombre: 4, montant: 4865, reste_a_charge: 1748 },
    rendez_vous: {
      passes: 612, honores: 583, manques: 21, annules: 47, taux_manques: 0.034,
      par_praticien: [
        { praticien_id: P1, nom: "Dr Ambre Lacour", passes: 344, manques: 14, taux: 0.041 },
        { praticien_id: P2, nom: "Dr Mathis Rousseau", passes: 268, manques: 7, taux: 0.026 },
      ],
      precedent: { passes: 590, manques: 26, taux_manques: 0.044 },
    },
    appels: { appels: 64, rdv_pris: 19 },
  },
  /* b3_14 : les rappels du cabinet d'exemple, en essai (patients fictifs) */
  rappels: {
    reglage: { mode: "essai", essai: true, canaux: ["email"] },
    contacts: [
      { id: "ct-1", patient_id: "pa-9", patient_nom: "Michel Dorville", canal: "email", adresse: "michel.dorville@exemple.test", rappels: true, relances: true, source: "oral", cree_le: ilYa(12) },
      { id: "ct-2", patient_id: "pa-1", patient_nom: "Marguerite Delannoy", canal: "email", adresse: "m.delannoy@exemple.test", rappels: false, relances: true, source: "ecrit", cree_le: ilYa(30) },
      { id: "ct-3", patient_id: "pa-6", patient_nom: "Patrice Zami", canal: "email", adresse: "patrice.zami@exemple.test", rappels: true, relances: false, source: "formulaire", cree_le: ilYa(4) },
    ],
    envois: [
      { id: "en-1", type: "j2", canal: "email", mode: "essai", statut: "bloque", verrou: "SANTE_HORS_CANAL_AGREE", cree_le: a(0, 7, 7), envoye_le: null, patient_nom: "Michel Dorville" },
      { id: "en-2", type: "plan", canal: "email", mode: "essai", statut: "bloque", verrou: "SANTE_HORS_CANAL_AGREE", cree_le: a(0, 7, 7), envoye_le: null, patient_nom: "Marguerite Delannoy" },
      { id: "en-3", type: "devis", canal: "email", mode: "essai", statut: "bloque", verrou: "SANTE_HORS_CANAL_AGREE", cree_le: a(-1, 7, 7), envoye_le: null, patient_nom: "Michel Dorville" },
    ],
    reponses: [
      { id: "rp-1", reponse: "confirme", recue_le: a(-1, 18, 2), rendez_vous_id: "rdv-11", debut: a(1, 14, 30), patient_nom: "Christiane Laurent" },
      { id: "rp-2", reponse: "annule", recue_le: a(0, 7, 55), rendez_vous_id: "rdv-12", debut: a(2, 9, 0), patient_nom: "Georges Pétro" },
    ],
  },
  /* b3_15 : la semaine dernière, deux centres de la même direction */
  synthese: {
    semaine: { du: aujourdHui(-((new Date().getDay() + 6) % 7) - 7), au: aujourdHui(-((new Date().getDay() + 6) % 7) - 1) },
    cabinets: [
      {
        entite_id: ENTITE_CABINET, nom: "Cabinet des Abymes",
        rdv: { passes: 148, honores: 141, manques: 7, annules: 12, taux_manques: 0.047 }, creneaux: { liberes: 12 },
        devis: { presentes: 9, signes: 6, taux: 0.667, montant_signe: 9860 }, plans_sans_rdv: { nombre: 4, montant: 4865 },
        appels: { appels: 17, rdv_pris: 6, confirmes: 5 }, rappels: { prepares: 61, envoyes: 0, retenus: 61 },
        reinscription: { visites: 131, reinscrits: 98, taux: 0.748 },
        precedent: { taux_manques: 0.061, devis_signes: 4, devis_taux: 0.5, passes: 152, reinscription_taux: 0.712 },
      },
      {
        entite_id: "00000000-0000-4000-8000-0000000000e2", nom: "Centre de Jarry",
        rdv: { passes: 212, honores: 204, manques: 8, annules: 15, taux_manques: 0.038 }, creneaux: { liberes: 15 },
        devis: { presentes: 14, signes: 8, taux: 0.571, montant_signe: 13420 }, plans_sans_rdv: { nombre: 7, montant: 9310 },
        appels: { appels: 23, rdv_pris: 9, confirmes: 8 }, rappels: { prepares: 88, envoyes: 0, retenus: 88 },
        reinscription: { visites: 190, reinscrits: 151, taux: 0.795 },
        precedent: { taux_manques: 0.042, devis_signes: 9, devis_taux: 0.6, passes: 205, reinscription_taux: 0.781 },
      },
    ],
    total: { passes: 360, manques: 15, taux_manques: 0.042, creneaux_liberes: 27, devis_presentes: 23, devis_signes: 14, montant_signe: 23280,
             plans_sans_rdv: 11, montant_plans_sans_rdv: 14175, appels: 40, rdv_confirmes: 13, visites: 321, reinscrits: 249, reinscription_taux: 0.776 },
  },
  /* b3_16 : trente jours de réinscription */
  reinscription: {
    periode: { du: aujourdHui(-29), au: aujourdHui(0), jours: 30 },
    visites: 548, reinscrits: 409, taux: 0.746,
    precedent: { taux: 0.718, visites: 531 },
    par_praticien: [
      { praticien_id: P1, nom: "Dr Ambre Lacour", visites: 302, reinscrits: 236, taux: 0.781 },
      { praticien_id: P2, nom: "Dr Mathis Rousseau", visites: 246, reinscrits: 173, taux: 0.703 },
    ],
    sans_suite: [
      { patient_id: "pa-18", patient_nom: "Firmin Bellance", derniere_visite: aujourdHui(-21), praticien: "Dr Ambre Lacour" },
      { patient_id: "pa-19", patient_nom: "Joëlle Céleste", derniere_visite: aujourdHui(-14), praticien: "Dr Mathis Rousseau" },
      { patient_id: "pa-20", patient_nom: "Hugo Ternel", derniere_visite: aujourdHui(-6), praticien: "Dr Mathis Rousseau" },
    ],
  },
  /* b3_17 : les absences probables des trois prochains jours */
  absences: [
    { rendez_vous_id: "rdv-12", debut: a(2, 9, 0), patient_id: "pa-13", patient_nom: "Georges Pétro", praticien_nom: "Dr Ambre Lacour", fauteuil_nom: "Fauteuil 2", score: 0, niveau: "annonce", raisons: ["a répondu NON au rappel : créneau à libérer"], annonce: true },
    { rendez_vous_id: "rdv-21", debut: a(1, 16, 30), patient_id: "pa-21", patient_nom: "Dimitri Saint-Ange", praticien_nom: "Dr Mathis Rousseau", fauteuil_nom: "Fauteuil 1", score: 4, niveau: "fort", raisons: ["2 rendez-vous manqués en 18 mois", "créneau où les absences sont fréquentes au cabinet"], annonce: false },
    { rendez_vous_id: "rdv-22", debut: a(1, 8, 30), patient_id: "pa-22", patient_nom: "Maëlys Darius", praticien_nom: "Dr Ambre Lacour", fauteuil_nom: "Fauteuil 3", score: 2, niveau: "moyen", raisons: ["nouveau patient", "pris il y a 74 jours"], annonce: false },
  ],
  /* b3_18 : Élodie, l'assistante du Fauteuil 1, est en formation demain et après-demain */
  equipe: [
    {
      absence_id: "ab-1", membre_id: "m-1", membre: "Élodie", motif: "formation", debut: a(1, 0, 0), fin: a(3, 0, 0), fauteuil_id: F1, fauteuil_nom: "Fauteuil 1",
      soins: [
        { rendez_vous_id: "rdv-31", debut: a(1, 10, 0), fin: a(1, 11, 0), patient_nom: "Sylvie Marlin", soin: "Couronne — préparation", vers: [{ fauteuil_id: F2, fauteuil_nom: "Fauteuil 2", assistante: "Karine" }] },
        { rendez_vous_id: "rdv-32", debut: a(2, 14, 0), fin: a(2, 15, 30), patient_nom: "Thierry Bellay", soin: "Implant — chirurgie", vers: [] },
      ],
    },
  ],
};
