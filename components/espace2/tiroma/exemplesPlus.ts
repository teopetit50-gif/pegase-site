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

const tousPlans = [...DOSSIER_EXEMPLE.plans, ...plans].sort((x, y) => y.jours_depuis - x.jours_depuis);

/* Pilotage et synthèse comptent les mêmes plans que la page Plans et devis (11 avec ceux ci-dessus), pas les 4 du
   dossier de base : « signé sans rendez-vous » doit dire le même nombre partout. */
const sansRdv = {
  nombre: tousPlans.length,
  montant: tousPlans.reduce((s, p) => s + (p.montant ?? 0), 0),
  reste_a_charge: tousPlans.reduce((s, p) => s + (p.reste_a_charge ?? 0), 0),
};
const syn = DOSSIER_EXEMPLE.synthese;

/* 04/11 — « Plans planifiés hier » et « Planifiés cette semaine » (promesses TIROMA n° 5 et 15) : trois appels « plan »
   conclus par un rendez-vous (deux hier, un avant-hier) ; ces plans ne sont plus « sans rendez-vous ». */
const base = DOSSIER_EXEMPLE.appels;
const appels = base
  ? {
      ...base,
      derniers: {
        ...base.derniers,
        "pa-32": { motif: "plan" as const, issue: "rdv_pris" as const, appele_le: a(-2, 10, 20), rappeler_le: null, par: "Élodie", patient_nom: "Josiane Hyacinthe" },
        "pa-30": { motif: "plan" as const, issue: "rdv_pris" as const, appele_le: a(-1, 9, 35), rappeler_le: null, par: "Élodie", patient_nom: "Évelyne Gaspard" },
        "pa-31": { motif: "plan" as const, issue: "rdv_pris" as const, appele_le: a(-1, 11, 50), rappeler_le: null, par: "Karine", patient_nom: "Bruno Calixte" },
      },
    }
  : base;

/* 04/11 — « Annulations < 48 h » (promesse TIROMA n° 5) : les rendez-vous annulés des trente derniers jours et à venir,
   avec l'heure où l'annulation a été relevée ; rdv-1 et rdv-4 sont les créneaux CR-1 et CR-3 à sauver. */
const ANNULES: [string, number, number, number, number, number, number][] = [
  /* rendez-vous, jour, heure, minute, annulé : jour, heure, minute */
  ["rdv-1", 1, 9, 0, 0, 7, 42],
  ["rdv-4", 2, 14, 0, 0, 6, 58],
  ["rdv-41", -1, 16, 0, -1, 8, 10],
  ["rdv-42", -2, 10, 30, -3, 19, 4],
  ["rdv-43", -3, 9, 0, -6, 11, 0],
  ["rdv-44", -5, 15, 0, -6, 17, 30],
  ["rdv-45", -8, 11, 0, -12, 9, 0],
  ["rdv-46", -10, 14, 30, -11, 9, 15],
  ["rdv-47", -13, 8, 30, -13, 7, 50],
  ["rdv-48", -16, 17, 0, -20, 10, 0],
  ["rdv-49", -19, 16, 0, -20, 18, 0],
  ["rdv-50", -24, 10, 0, -30, 8, 45],
  ["rdv-51", -27, 17, 0, -28, 12, 0],
];
export const annulationsExemple = (liste: typeof ANNULES = ANNULES) =>
  liste.map(([id, j, h, m, ja, ha, ma]) => ({ rendez_vous_id: id, debut: a(j, h, m), annule_le: a(ja, ha, ma), patient_nom: null }));

export const DOSSIER_EXEMPLE_TIROMA: Dossier = {
  ...DOSSIER_EXEMPLE,
  creneaux: [...DOSSIER_EXEMPLE.creneaux.slice(0, 2), creneau, ...DOSSIER_EXEMPLE.creneaux.slice(2)],
  plans: tousPlans,
  appels,
  annulations: annulationsExemple(),
  pilotage: DOSSIER_EXEMPLE.pilotage ? { ...DOSSIER_EXEMPLE.pilotage, plans_sans_rdv: sansRdv } : DOSSIER_EXEMPLE.pilotage,
  synthese: syn
    ? (() => {
        const cabinets = syn.cabinets.map((c, i) => (i === 0 ? { ...c, plans_sans_rdv: { nombre: sansRdv.nombre, montant: sansRdv.montant } } : c));
        return {
          ...syn,
          cabinets,
          total: {
            ...syn.total,
            plans_sans_rdv: cabinets.reduce((s, c) => s + c.plans_sans_rdv.nombre, 0),
            montant_plans_sans_rdv: cabinets.reduce((s, c) => s + c.plans_sans_rdv.montant, 0),
          },
        };
      })()
    : syn,
};
