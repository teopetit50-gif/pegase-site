/* ══════════════════════════════════════════════════════════════════════
   TIROMA — l'exemple des nouvelles sous-pages (02/11/2026)

   Le cabinet fictif de l'écran d'avant (components/espace/tiroma/exemple.ts,
   inchangé : l'ancien écran sous « ?ancien=1 » le lit toujours), complété
   pour que les pages copiées aient autant de lignes que les pages de
   référence remplies (consigne commune, § 3.4 : « données d'exemple avec un
   contenu de même longueur que la référence ») : un troisième créneau
   libéré, onze plans sans rendez-vous (Linear My issues : groupes de 3, 11
   et 3 lignes ; Board : colonnes de 4 à 20 cartes). Patients inventés,
   identifiants 0000…, rien n'est écrit en base.
   ══════════════════════════════════════════════════════════════════════ */

import { aujourdHui, ilYa } from "@/components/espace/exemples/socle";
import { DOSSIER_EXEMPLE } from "@/components/espace/tiroma/exemple";
import type { Creneau, Dossier, Famille, PlanSansRdv } from "@/components/espace/tiroma/types";

const F1 = "00000000-0000-4000-8000-0000000000f1";
const P1 = "00000000-0000-4000-8000-0000000000d1";
const P2 = "00000000-0000-4000-8000-0000000000d2";

function a(jours: number, heure: number, minute = 0): string {
  const d = new Date();
  d.setDate(d.getDate() + jours);
  d.setHours(heure, minute, 0, 0);
  return d.toISOString();
}

const creneau: Creneau = {
  evenement_id: 9104, type: "annulation", detecte_le: a(0, 6, 58), rendez_vous_id: "rdv-4", debut: a(2, 14, 0), fin: a(2, 14, 30), minutes: 30,
  fauteuil_id: F1, fauteuil_nom: "Fauteuil 1", praticien_id: P1, praticien_nom: "Dr Ambre Lacour", famille: "detartrage", libre: true,
  candidats: [
    { rang: 1, origine: "attente", patient_id: "pa-14", patient_nom: "Aurélie Cornélie", motif: "en liste d'attente depuis le " + new Date(ilYa(3)).toLocaleDateString("fr-FR") + " : Contrôle", duree_min: 20, plan_id: null, attente_id: "at-3", depuis: aujourdHui(-3), preferences_ok: true, ne_pas_contacter: false },
    { rang: 2, origine: "controle", patient_id: "pa-20", patient_nom: "Henri Calvaire", motif: "jamais de contrôle au cabinet", duree_min: 20, plan_id: null, attente_id: null, depuis: null, preferences_ok: true, ne_pas_contacter: false },
  ],
};

type Gabarit = [string, string, string, string, number, number, number, PlanSansRdv["mutuelle_statut"], string, Famille, number, number];
/* identifiant, patient_id, patient, praticien, jours depuis la signature, montant, reste à charge, mutuelle, séance, famille, durée, expire dans (j) */
const GABARITS: Gabarit[] = [
  ["pl-12", "pa-23", "Gisèle Anatole", P1, 38, 2240, 760, "accord", "Inlay-core 15 et couronne — préparation", "prothese_preparation", 60, 142],
  ["pl-13", "pa-24", "Raphaël Montout", P2, 31, 480, 0, "non_requise", "Traitement de racine 46 — séance 1", "endodontie", 60, 149],
  ["pl-14", "pa-25", "Clémence Ladal", P1, 27, 3850, 1640, "demandee", "Implant 36 — chirurgie", "implant_chirurgie", 90, 26],
  ["pl-15", "pa-26", "Yves Ramassamy", P2, 24, 160, 48, "non_requise", "Soin composite 24 et 25", "soin_conservateur", 45, 156],
  ["pl-16", "pa-27", "Line Bourgeois", P1, 19, 1420, 510, "a_demander", "Couronne zircone 11 — préparation", "prothese_preparation", 45, 161],
  ["pl-17", "pa-28", "Marius Pélage", P2, 15, 2780, 0, "accord", "Bilan orthodontique et pose de l'appareil", "orthodontie_pose", 60, 165],
  ["pl-18", "pa-29", "Odile Flavien", P1, 9, 640, 210, "non_requise", "Détartrage et surfaçage, séance 1", "parodontie", 45, 171],
];

const plans: PlanSansRdv[] = GABARITS.map(([plan_id, patient_id, patient_nom, praticien_id, jours, montant, reste, mutuelle, libelle, famille, duree, expire], i) => ({
  plan_id, devis_numero: `D-2026-0${430 + i * 9}`, type: famille === "orthodontie_pose" ? "odf" : "conventionnel", statut: "signe",
  patient_id, patient_nom, praticien_id, praticien_nom: praticien_id === P1 ? "Dr Ambre Lacour" : "Dr Mathis Rousseau",
  signe_le: aujourdHui(-jours), depuis: aujourdHui(-jours), jours_depuis: jours, montant, reste_a_charge: reste,
  mutuelle_statut: mutuelle, mutuelle_reponse_le: mutuelle === "accord" ? aujourdHui(-Math.max(1, jours - 10)) : null, mutuelle_accord_sans_rdv: mutuelle === "accord",
  valide_jusqu_au: aujourdHui(expire), jours_avant_expiration: expire, a_verifier: expire <= 30, lignes_a_faire: 1 + (i % 3), lignes_faites: i % 2,
  prochaine: { rang: 1, libelle, famille, duree_min: duree, seance: 1 }, proches_a_planifier: i === 2 ? 1 : 0, ne_pas_contacter: false,
}));

export const DOSSIER_EXEMPLE_TIROMA: Dossier = {
  ...DOSSIER_EXEMPLE,
  creneaux: [...DOSSIER_EXEMPLE.creneaux.slice(0, 2), creneau, ...DOSSIER_EXEMPLE.creneaux.slice(2)],
  plans: [...DOSSIER_EXEMPLE.plans, ...plans].sort((x, y) => y.jours_depuis - x.jours_depuis),
};
