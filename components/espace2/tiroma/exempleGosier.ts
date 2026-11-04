/* ══════════════════════════════════════════════════════════════════════
   TIROMA — le second cabinet d'exemple (04/11/2026)

   04/11 — « Un point du matin par centre » (promesse TIROMA n° 38) : le
   « Centre dentaire du Gosier (exemple) », que la synthèse de la semaine et
   les règles communes citaient déjà, devient un cabinet complet. Le
   sélecteur de cabinet (Aujourd'hui › Détails, Réglages) l'ouvre en
   exemple ; chaque sous-page lit alors son dossier. Mêmes chiffres que la
   synthèse : 7 plans signés sans rendez-vous pour 9 310 €, règles
   « attente → plan → contrôle » et 5 propositions (les deux écarts des
   règles communes). Patients et praticiens inventés, identifiants 0000…,
   dates relatives au jour de la visite, rien n'est écrit en base.
   ══════════════════════════════════════════════════════════════════════ */

import { EXEMPLE_CLIENT_ID, aujourdHui, dans, ilYa } from "@/components/espace/exemples/socle";
import { DOSSIER_EXEMPLE } from "@/components/espace/tiroma/exemple";
import type { Dossier, Famille, PlanSansRdv, Releve } from "@/components/espace/tiroma/types";
import { annulationsExemple } from "./exemplesPlus";

export const ENTITE_GOSIER = "00000000-0000-4000-8000-0000000000e4";
export const NOM_GOSIER = "Centre dentaire du Gosier (exemple)";
const E = ENTITE_GOSIER;
const FA = "00000000-0000-4000-8000-0000000000f4";
const FB = "00000000-0000-4000-8000-0000000000f5";
const FC = "00000000-0000-4000-8000-0000000000f6";
const FD = "00000000-0000-4000-8000-0000000000f7";
const P3 = "00000000-0000-4000-8000-0000000000d3";
const P4 = "00000000-0000-4000-8000-0000000000d4";
const P5 = "00000000-0000-4000-8000-0000000000d5";
const NOMS: Record<string, string> = { [P3]: "Dr Lina Sainte-Rose", [P4]: "Dr Paul Ezelin", [P5]: "Dr Maud Florimond" };

function a(jours: number, heure: number, minute = 0): string {
  const d = new Date();
  d.setDate(d.getDate() + jours);
  d.setHours(heure, minute, 0, 0);
  return d.toISOString();
}
function lundi(k: number): string {
  const d = new Date();
  d.setHours(12, 0, 0, 0);
  d.setDate(d.getDate() - ((d.getDay() + 6) % 7) + 7 * k);
  return d.toISOString().slice(0, 10);
}
function objectif(fauteuil_id: string, nom: string, cible: number, taux: number[]) {
  const passes = taux.slice(0, 4);
  return {
    fauteuil_id, nom, objectif: cible,
    semaines: taux.map((t, i) => ({ lundi: lundi(i - 4), ouvert_min: 2550, occupe_min: Math.round(2550 * t), taux: t, atteint: t >= cible })),
    moyenne: Math.round((passes.reduce((x, y) => x + y, 0) / passes.length) * 1000) / 1000,
    atteintes: passes.filter((t) => t >= cible).length, comptees: passes.length,
  };
}

type Gabarit = [string, string, string, string, number, number, number, PlanSansRdv["mutuelle_statut"], string, Famille, number, number];
/* identifiant, patient_id, patient, praticien, jours depuis la signature, montant, reste à charge, mutuelle, séance, famille, durée, expire dans (j) */
const GABARITS: Gabarit[] = [
  ["pg-pl-1", "pg-1", "Héloïse Bambuck", P3, 47, 2480, 890, "accord", "Bridge 14-16 — préparation", "prothese_preparation", 60, 135],
  ["pg-pl-2", "pg-2", "Thomas Lubin", P4, 33, 1960, 720, "demandee", "Implant 46 — chirurgie", "implant_chirurgie", 90, 24],
  ["pg-pl-3", "pg-3", "Sandrine Coco", P3, 26, 1540, 0, "non_requise", "Bilan orthodontique et pose de l'appareil", "orthodontie_pose", 60, 154],
  ["pg-pl-4", "pg-4", "Didier Marie-Luce", P5, 18, 1180, 410, "a_demander", "Couronne céramique 21 — préparation", "prothese_preparation", 45, 162],
  ["pg-pl-5", "pg-5", "Yolande Bourgeois-Jean", P4, 12, 920, 0, "non_requise", "Traitement de racine 37 — séance 1", "endodontie", 60, 168],
  ["pg-pl-6", "pg-6", "Kenny Pharaon", P5, 8, 760, 230, "accord", "Inlay 26", "prothese_preparation", 45, 172],
  ["pg-pl-7", "pg-7", "Céline Duféal", P3, 4, 470, 140, "non_requise", "Soins composites 35 et 36", "soin_conservateur", 45, 176],
];

const plans: PlanSansRdv[] = GABARITS.map(([plan_id, patient_id, patient_nom, praticien_id, jours, montant, reste, mutuelle, libelle, famille, duree, expire], i) => ({
  plan_id, devis_numero: `DG-2026-0${212 + i * 7}`, type: famille === "orthodontie_pose" ? "odf" : "conventionnel", statut: "signe",
  patient_id, patient_nom, praticien_id, praticien_nom: NOMS[praticien_id],
  signe_le: aujourdHui(-jours), depuis: aujourdHui(-jours), jours_depuis: jours, montant, reste_a_charge: reste,
  mutuelle_statut: mutuelle, mutuelle_reponse_le: mutuelle === "accord" ? aujourdHui(-Math.max(1, jours - 9)) : null, mutuelle_accord_sans_rdv: mutuelle === "accord",
  valide_jusqu_au: aujourdHui(expire), jours_avant_expiration: expire, a_verifier: expire <= 30, lignes_a_faire: 1 + (i % 2), lignes_faites: 0,
  prochaine: { rang: 1, libelle, famille, duree_min: duree, seance: 1 }, proches_a_planifier: i === 0 ? 1 : 0, ne_pas_contacter: false,
}));
const sansRdv = { nombre: plans.length, montant: plans.reduce((s, p) => s + (p.montant ?? 0), 0), reste_a_charge: plans.reduce((s, p) => s + (p.reste_a_charge ?? 0), 0) };

const releves: Releve[] = [
  { id: "rg-0", entite_id: E, voie: "exports", mode: "courant", recu_le: a(0, 7, 10), fini_le: a(0, 7, 12), statut: "ok", raison: null, compteurs: { agenda: { ajouts: 5, modifications: 14, evenements: 3 }, patients: { ajouts: 2, modifications: 6 } } },
  { id: "rg-1", entite_id: E, voie: "exports", mode: "courant", recu_le: a(-1, 19, 20), fini_le: a(-1, 19, 21), statut: "ok", raison: null, compteurs: { agenda: { ajouts: 8, modifications: 12 }, devis: { ajouts: 3 } } },
  { id: "rg-2", entite_id: E, voie: "exports", mode: "reprise", recu_le: ilYa(60, 9), fini_le: ilYa(60, 9), statut: "ok", raison: null, compteurs: { patients: { ajouts: 2615 }, agenda: { ajouts: 4410 }, devis: { ajouts: 301 } } },
];

const charge = (() => {
  const f = (fauteuil_id: string, nom: string, capacites: ("soins" | "prothese" | "chirurgie" | "orthodontie" | "prevention")[], obj: number, assistante: string | null, matin: number, aprem: number, rdv: number, sans: number) => {
    const m = { ouvert_min: 240, prevu_min: Math.round(240 * matin), taux: matin, vide: matin < 0.2 };
    const p = { ouvert_min: 300, prevu_min: Math.round(300 * aprem), taux: aprem, vide: aprem < 0.2 };
    const j = { ouvert_min: 540, prevu_min: m.prevu_min + p.prevu_min, taux: Math.round(((m.prevu_min + p.prevu_min) / 540) * 1000) / 1000, vide: false };
    return { fauteuil_id, nom, capacites, objectif_occupation: obj, assistante_habituelle: assistante, matin: m, apres_midi: p, journee: j, rendez_vous: rdv, sans_assistante_exigee: sans };
  };
  const fauteuils = [
    f(FA, "Fauteuil A", ["soins", "prevention"], 0.85, "Sabine", 0.9, 0.82, 15, 0),
    f(FB, "Fauteuil B", ["soins", "prothese", "chirurgie"], 0.8, "Nadia", 0.85, 0.74, 9, 0),
    f(FC, "Fauteuil C", ["orthodontie", "soins"], 0.75, null, 0.62, 0.1, 7, 2),
    f(FD, "Fauteuil D", ["soins", "prevention"], 0.8, "Johan", 0.79, 0.88, 13, 0),
  ];
  const ouvert = fauteuils.reduce((s, x) => s + x.journee.ouvert_min, 0);
  const prevu = fauteuils.reduce((s, x) => s + x.journee.prevu_min, 0);
  return {
    jour: aujourdHui(0), seuil_demi_journee_vide: 0.2, fauteuils,
    total: { ouvert_min: ouvert, prevu_min: prevu, taux: Math.round((prevu / ouvert) * 1000) / 1000 },
    demi_journees_vides: fauteuils.reduce((s, x) => s + (x.matin.vide ? 1 : 0) + (x.apres_midi.vide ? 1 : 0), 0),
  };
})();

const base = DOSSIER_EXEMPLE;

export const DOSSIER_EXEMPLE_GOSIER: Dossier = {
  cabinet: {
    ...base.cabinet, id: "00000000-0000-4000-8000-0000000000c1", client_id: EXEMPLE_CLIENT_ID, entite_id: E, entite_nom: NOM_GOSIER,
    logiciel: "julie", logiciel_version: "8.4", heure_point: "07:15:00", mode: "reel", mode_depuis: ilYa(52, 9), statut: "actif",
    dernier_releve_le: a(0, 7, 12), dernier_releve_ok_le: a(0, 7, 12), releves_douteux_suite: 0, cree_le: ilYa(64, 10),
  },
  profil: "titulaire",
  fauteuils: [
    { id: FA, entite_id: E, nom: "Fauteuil A", capacites: ["soins", "prevention"], objectif_occupation: 0.85, actif: true },
    { id: FB, entite_id: E, nom: "Fauteuil B", capacites: ["soins", "prothese", "chirurgie"], objectif_occupation: 0.8, actif: true },
    { id: FC, entite_id: E, nom: "Fauteuil C", capacites: ["orthodontie", "soins"], objectif_occupation: 0.75, actif: true },
    { id: FD, entite_id: E, nom: "Fauteuil D", capacites: ["soins", "prevention"], objectif_occupation: 0.8, actif: true },
  ],
  praticiens: [
    { id: P3, entite_id: E, nom_affiche: NOMS[P3], metier: "titulaire", actif: true },
    { id: P4, entite_id: E, nom_affiche: NOMS[P4], metier: "collaborateur", actif: true },
    { id: P5, entite_id: E, nom_affiche: NOMS[P5], metier: "collaborateur", actif: true },
  ],
  membres: [
    { id: "mg-1", entite_id: E, prenom: "Sabine", fauteuil_habituel_id: FA, actif: true },
    { id: "mg-2", entite_id: E, prenom: "Nadia", fauteuil_habituel_id: FB, actif: true },
    { id: "mg-3", entite_id: E, prenom: "Johan", fauteuil_habituel_id: FD, actif: true },
  ],
  horaires: [1, 2, 3, 4, 5].flatMap((jour) => [
    { id: `hg-${jour}-m`, entite_id: E, praticien_id: null, fauteuil_id: null, jour, debut: "08:00:00", fin: "12:00:00", valide_du: null, valide_au: null, exceptionnel: false, source: "saisie" as const },
    { id: `hg-${jour}-a`, entite_id: E, praticien_id: null, fauteuil_id: null, jour, debut: "13:30:00", fin: "18:30:00", valide_du: null, valide_au: null, exceptionnel: false, source: "saisie" as const },
  ]),
  fermetures: [{ id: "feg-1", entite_id: E, praticien_id: P5, fauteuil_id: null, debut: dans(12, 0), fin: dans(16, 0), nature: "conge", source: "saisie" }],
  regles: base.regles ? { ...base.regles, id: "00000000-0000-4000-8000-0000000000a1", entite_id: E, ordre_priorite: ["attente", "plan", "controle"], nb_propositions: 5, objectif_production_semaine: 24000 } : null,
  releves,
  capacites: base.capacites.map((k) => ({ ...k, id: `g-${k.id}`, calcule_le: a(0, 7, 12) })),
  types: base.types.map((t) => ({ ...t, id: `g-${t.id}`, entite_id: E })),
  attente: [
    { id: "atg-1", entite_id: E, patient_id: "pg-11", famille: "detartrage", duree_min: 30, praticien_id: null, preavis_minutes: 60, drapeau_gene: false, source: "logiciel", ajoute_le: ilYa(11), retire_le: null, motif_retrait: null, patient_nom: "Rodolphe Clarac" },
    { id: "atg-2", entite_id: E, patient_id: "pg-12", famille: "soin_conservateur", duree_min: 30, praticien_id: P4, preavis_minutes: 120, drapeau_gene: true, source: "tiroma", ajoute_le: ilYa(6), retire_le: null, motif_retrait: null, patient_nom: "Laetitia Bernos" },
    { id: "atg-3", entite_id: E, patient_id: "pg-13", famille: "controle", duree_min: 20, praticien_id: null, preavis_minutes: null, drapeau_gene: false, source: "logiciel", ajoute_le: ilYa(19), retire_le: null, motif_retrait: null, patient_nom: "Fabrice Anicette" },
    { id: "atg-4", entite_id: E, patient_id: "pg-14", famille: "orthodontie_controle", duree_min: 20, praticien_id: P3, preavis_minutes: 60, drapeau_gene: false, source: "tiroma", ajoute_le: ilYa(2), retire_le: null, motif_retrait: null, patient_nom: "Inaya Rinaldo" },
  ],
  creneaux: [
    {
      evenement_id: 9201, type: "annulation", detecte_le: a(0, 7, 12), rendez_vous_id: "rdvg-1", debut: a(1, 10, 30), fin: a(1, 11, 15), minutes: 45,
      fauteuil_id: FB, fauteuil_nom: "Fauteuil B", praticien_id: P4, praticien_nom: NOMS[P4], famille: "soin_conservateur", libre: true,
      candidats: [
        { rang: 1, origine: "attente", patient_id: "pg-12", patient_nom: "Laetitia Bernos", motif: "en liste d'attente depuis le " + new Date(ilYa(6)).toLocaleDateString("fr-FR") + " : Soin composite (patiente gênée)", duree_min: 30, plan_id: null, attente_id: "atg-2", depuis: aujourdHui(-6), preferences_ok: true, ne_pas_contacter: false },
        { rang: 2, origine: "plan", patient_id: "pg-7", patient_nom: "Céline Duféal", motif: "plan signé le " + new Date(ilYa(4)).toLocaleDateString("fr-FR") + " : Soins composites 35 et 36 (séance 1)", duree_min: 45, plan_id: "pg-pl-7", attente_id: null, depuis: aujourdHui(-4), preferences_ok: true, ne_pas_contacter: false },
        { rang: 3, origine: "controle", patient_id: "pg-21", patient_nom: "Gérard Mathurin", motif: "dernier contrôle le " + new Date(ilYa(410)).toLocaleDateString("fr-FR"), duree_min: 20, plan_id: null, attente_id: null, depuis: aujourdHui(-410), preferences_ok: true, ne_pas_contacter: false },
      ],
    },
    {
      evenement_id: 9202, type: "report", detecte_le: a(-1, 17, 45), rendez_vous_id: "rdvg-2", debut: a(2, 8, 30), fin: a(2, 9, 0), minutes: 30,
      fauteuil_id: FA, fauteuil_nom: "Fauteuil A", praticien_id: P5, praticien_nom: NOMS[P5], famille: "detartrage", libre: true,
      candidats: [
        { rang: 1, origine: "attente", patient_id: "pg-11", patient_nom: "Rodolphe Clarac", motif: "en liste d'attente depuis le " + new Date(ilYa(11)).toLocaleDateString("fr-FR") + " : Détartrage", duree_min: 30, plan_id: null, attente_id: "atg-1", depuis: aujourdHui(-11), preferences_ok: true, ne_pas_contacter: false },
      ],
    },
    {
      evenement_id: 9203, type: "annulation", detecte_le: a(-1, 12, 5), rendez_vous_id: "rdvg-3", debut: a(1, 15, 0), fin: a(1, 15, 30), minutes: 30,
      fauteuil_id: FD, fauteuil_nom: "Fauteuil D", praticien_id: P3, praticien_nom: NOMS[P3], famille: "controle", libre: false, candidats: [],
    },
  ],
  plans,
  verifications: [
    { nature: "labo", gravite: "attention", quand: aujourdHui(2), rendez_vous_id: "rdvg-10", patient_id: "pg-15", patient_nom: "Armelle Gotin", texte: "Couronne — pose : le laboratoire annonce le retour la veille de la pose (" + new Date(dans(1)).toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit" }) + ").", objet_type: "tiroma_travaux_labo", objet_id: "wg-1" },
    { nature: "devis_expire", gravite: "attention", quand: aujourdHui(24), rendez_vous_id: null, patient_id: "pg-2", patient_nom: "Thomas Lubin", texte: "Le devis DG-2026-0219 (1960 €) expire le " + new Date(dans(24)).toLocaleDateString("fr-FR") + " : passé la date, il faudra le refaire et redemander l'accord de la mutuelle.", objet_type: "tiroma_plans", objet_id: "pg-pl-2" },
    { nature: "mutuelle_accord", gravite: "attention", quand: aujourdHui(-38), rendez_vous_id: null, patient_id: "pg-1", patient_nom: "Héloïse Bambuck", texte: "La mutuelle a donné son accord le " + new Date(ilYa(38)).toLocaleDateString("fr-FR") + " pour le devis DG-2026-0212 : aucun rendez-vous n'a suivi.", objet_type: "tiroma_plans", objet_id: "pg-pl-1" },
    { nature: "labo", gravite: "info", quand: aujourdHui(1), rendez_vous_id: "rdvg-11", patient_id: "pg-16", patient_nom: "Joël Ramdine", texte: "Inlay — pose : le travail est revenu du laboratoire.", objet_type: "tiroma_travaux_labo", objet_id: "wg-2" },
  ],
  charge,
  appels: {
    jour: aujourdHui(0),
    a_reprendre: [
      { patient_id: "pg-2", patient_nom: "Thomas Lubin", motif: "plan", plan_id: "pg-pl-2", issue: "pas_de_reponse", appele_le: a(-1, 15, 40), rappeler_le: null, par: "Nadia", tentatives: 1, du: true },
      { patient_id: "pg-13", patient_nom: "Fabrice Anicette", motif: "attente", plan_id: null, issue: "rappeler", appele_le: a(-2, 10, 0), rappeler_le: aujourdHui(1), par: "Sabine", tentatives: 1, du: false },
    ],
    derniers: {
      "pg-2": { motif: "plan", issue: "pas_de_reponse", appele_le: a(-1, 15, 40), rappeler_le: null, par: "Nadia" },
      "pg-13": { motif: "attente", issue: "rappeler", appele_le: a(-2, 10, 0), rappeler_le: aujourdHui(1), par: "Sabine" },
      "pg-30": { motif: "plan", issue: "rdv_pris", appele_le: a(-1, 9, 10), rappeler_le: null, par: "Sabine", patient_nom: "Murielle Saint-Éloi" },
    },
    bilan: { jours: 30, appels: 88, patients: 57, rdv_pris: 31, confirmes: 27, refus: 9, ne_plus_contacter: 0, a_reporter_logiciel: 2, valeur_plans: 12480, minutes_creneaux: 720 },
  },
  pilotage: {
    periode: { du: aujourdHui(-29), au: aujourdHui(0), jours: 30 },
    devis: {
      presentes: 52, signes: 30, taux: 0.577, montant_presente: 78420, montant_signe: 45160,
      par_panier: [
        { panier: "100_sante", presentes: 17, signes: 13, montant_signe: 6240 },
        { panier: "libre", presentes: 15, signes: 7, montant_signe: 22880 },
        { panier: "maitrise", presentes: 20, signes: 10, montant_signe: 16040 },
      ],
      precedent: { presentes: 48, signes: 29, taux: 0.604 },
    },
    en_attente: {
      devis: 12, montant: 21730, expirent_30j: 1, a_relancer: 2,
      a_relancer_liste: [
        { plan_id: "pg-pl-9", patient_id: "pg-17", patient_nom: "Ludovic Hibiscus", devis_numero: "DG-2026-0201", montant: 3640, reste_a_charge: 1420, presente_le: aujourdHui(-16), valide_jusqu_au: aujourdHui(164), panier: "libre" },
        { plan_id: "pg-pl-10", patient_id: "pg-18", patient_nom: "Marie-Ange Théodore", devis_numero: "DG-2026-0207", montant: 980, reste_a_charge: 290, presente_le: aujourdHui(-10), valide_jusqu_au: aujourdHui(26), panier: "maitrise" },
      ],
    },
    plans_sans_rdv: sansRdv,
    rendez_vous: {
      passes: 874, honores: 836, manques: 27, annules: 61, taux_manques: 0.031,
      par_praticien: [
        { praticien_id: P3, nom: NOMS[P3], passes: 362, manques: 10, taux: 0.028 },
        { praticien_id: P4, nom: NOMS[P4], passes: 288, manques: 11, taux: 0.038 },
        { praticien_id: P5, nom: NOMS[P5], passes: 224, manques: 6, taux: 0.027 },
      ],
      precedent: { passes: 851, manques: 30, taux_manques: 0.035 },
    },
    appels: { appels: 88, rdv_pris: 31 },
  },
  rappels: {
    reglage: { mode: "essai", essai: true, canaux: ["email"] },
    contacts: [
      { id: "ctg-1", patient_id: "pg-15", patient_nom: "Armelle Gotin", canal: "email", adresse: "armelle.gotin@exemple.test", rappels: true, relances: true, source: "ecrit", cree_le: ilYa(20) },
      { id: "ctg-2", patient_id: "pg-1", patient_nom: "Héloïse Bambuck", canal: "email", adresse: "h.bambuck@exemple.test", rappels: true, relances: false, source: "oral", cree_le: ilYa(9) },
    ],
    envois: [
      { id: "eng-1", type: "j2", canal: "email", mode: "essai", statut: "bloque", verrou: "SANTE_HORS_CANAL_AGREE", cree_le: a(0, 7, 15), envoye_le: null, patient_nom: "Armelle Gotin" },
    ],
    reponses: [{ id: "rpg-1", reponse: "confirme", recue_le: a(-1, 19, 12), rendez_vous_id: "rdvg-10", debut: a(2, 9, 30), patient_nom: "Armelle Gotin" }],
  },
  synthese: null,
  reinscription: {
    periode: { du: aujourdHui(-29), au: aujourdHui(0), jours: 30 },
    visites: 781, reinscrits: 619, taux: 0.793,
    precedent: { taux: 0.776, visites: 760 },
    par_praticien: [
      { praticien_id: P3, nom: NOMS[P3], visites: 322, reinscrits: 268, taux: 0.832 },
      { praticien_id: P4, nom: NOMS[P4], visites: 258, reinscrits: 196, taux: 0.76 },
      { praticien_id: P5, nom: NOMS[P5], visites: 201, reinscrits: 155, taux: 0.771 },
    ],
    sans_suite: [
      { patient_id: "pg-19", patient_nom: "Évariste Lauriette", derniere_visite: aujourdHui(-17), praticien: NOMS[P4] },
      { patient_id: "pg-20", patient_nom: "Noémie Calodat", derniere_visite: aujourdHui(-8), praticien: NOMS[P3] },
    ],
  },
  absences: [
    { rendez_vous_id: "rdvg-21", debut: a(1, 17, 0), patient_id: "pg-22", patient_nom: "Sébastien Ozier", praticien_nom: NOMS[P4], fauteuil_nom: "Fauteuil B", score: 4, niveau: "fort", raisons: ["3 rendez-vous manqués en 18 mois"], annonce: false },
    { rendez_vous_id: "rdvg-22", debut: a(2, 8, 0), patient_id: "pg-23", patient_nom: "Aïcha Monrose", praticien_nom: NOMS[P5], fauteuil_nom: "Fauteuil A", score: 2, niveau: "moyen", raisons: ["nouvelle patiente", "pris il y a 63 jours"], annonce: false },
  ],
  equipe: [],
  demiJournees: {
    du: aujourdHui(0), au: aujourdHui(14), seuil: 0.2,
    demi_journees: [
      { praticien_id: P5, praticien: NOMS[P5], jour: aujourdHui(3), moment: "apres_midi", source: "horaires", ouvert_min: 300, prevu_min: 45, libre_min: 255, taux: 0.15, attente: 2 },
      { praticien_id: P4, praticien: NOMS[P4], jour: aujourdHui(8), moment: "matin", source: "habitude", ouvert_min: 240, prevu_min: 30, libre_min: 210, taux: 0.125, attente: 4 },
    ],
  },
  objectifs: {
    semaines: [-4, -3, -2, -1, 0, 1].map((k) => ({ lundi: lundi(k), nature: k < 0 ? ("realisee" as const) : ("prevue" as const), en_cours: k === 0 })),
    fauteuils: [
      objectif(FA, "Fauteuil A", 0.85, [0.87, 0.9, 0.84, 0.88, 0.81, 0.6]),
      objectif(FB, "Fauteuil B", 0.8, [0.82, 0.77, 0.81, 0.79, 0.74, 0.5]),
      objectif(FC, "Fauteuil C", 0.75, [0.61, 0.58, 0.66, 0.6, 0.44, 0.31]),
      objectif(FD, "Fauteuil D", 0.8, [0.84, 0.86, 0.83, 0.85, 0.79, 0.55]),
    ],
  },
  reglesCommunes: base.reglesCommunes,
  soinsADeplacer: {
    seuil: 0.2,
    demi_journees: [
      { jour: aujourdHui(0), moment: "apres_midi", fauteuil_id: FC, fauteuil: "Fauteuil C", taux: 0.1, libere: true,
        soins: [{ rendez_vous_id: "rdvg-30", debut: a(0, 14, 0), fin: a(0, 14, 30), patient_nom: "Inaya Rinaldo", soin: "Contrôle orthodontique", vers: [{ fauteuil_id: FA, fauteuil: "Fauteuil A", taux: 0.82, assistante: "Sabine" }] }] },
    ],
  },
  seancesLongues: [],
  creneauxPlans: [
    { plan_id: "pg-pl-1", patient_nom: "Héloïse Bambuck", devis_numero: "DG-2026-0212", duree_min: 60, praticien: NOMS[P3],
      seance: { rang: 1, libelle: "Bridge 14-16 — préparation", famille: "prothese_preparation", duree_min: 60, seance: 1 },
      creneaux: [{ debut: a(3, 9), fin: a(3, 10), fauteuil_id: FB, fauteuil: "Fauteuil B" }] },
  ],
  controlesDus: {
    seuil_mois: 12, total: 2, ne_pas_contacter: 0,
    patients: [
      { patient_id: "pg-21", patient_nom: "Gérard Mathurin", dernier_controle_le: aujourdHui(-410), derniere_venue: aujourdHui(-410), mois_depuis: 13, praticien: NOMS[P3] },
      { patient_id: "pg-24", patient_nom: "Patricia Lauret", dernier_controle_le: aujourdHui(-470), derniere_venue: aujourdHui(-240), mois_depuis: 15, praticien: NOMS[P4] },
    ],
  },
  annulations: annulationsExemple([
    ["rdvg-1", 1, 10, 30, 0, 7, 12],
    ["rdvg-3", 1, 15, 0, -1, 12, 5],
    ["rdvg-41", -2, 9, 0, -2, 7, 30],
    ["rdvg-42", -4, 16, 30, -9, 10, 0],
    ["rdvg-43", -6, 11, 0, -7, 18, 40],
    ["rdvg-44", -11, 14, 0, -15, 9, 0],
    ["rdvg-45", -18, 8, 30, -19, 16, 20],
    ["rdvg-46", -23, 10, 0, -26, 11, 0],
  ]),
};
