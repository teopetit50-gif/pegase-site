/* Les libellés français de l'écran TIROMA (05/10/2026, session B3) : rien
   d'anglais, rien de technique à l'écran. Les clés sont celles du socle. */

import type { Capacite, Famille, Logiciel, NatureVerif, StatutCabinet } from "./types";

export const LOGICIELS: { cle: Logiciel; libelle: string }[] = [
  { cle: "logosw", libelle: "Logos_w" },
  { cle: "julie", libelle: "Julie" },
  { cle: "veasy", libelle: "Veasy" },
  { cle: "weclever", libelle: "WeClever" },
  { cle: "trophy", libelle: "Trophy" },
  { cle: "desmos", libelle: "Desmos" },
  { cle: "autre", libelle: "Autre logiciel" },
];

export function libelleLogiciel(cle: string | null | undefined): string {
  return LOGICIELS.find((l) => l.cle === cle)?.libelle ?? (cle ?? "—");
}

export const STATUTS_CABINET: Record<StatutCabinet, { libelle: string; teinte: "vert" | "ambre" | "rouge" | "bleu" | "gris" }> = {
  installation: { libelle: "En installation", teinte: "bleu" },
  actif: { libelle: "Actif", teinte: "vert" },
  coupe: { libelle: "Coupé", teinte: "ambre" },
  clos: { libelle: "Clos", teinte: "gris" },
};

export const FAMILLES: Record<Famille, string> = {
  controle: "Contrôle",
  detartrage: "Détartrage",
  soin_conservateur: "Soin conservateur",
  endodontie: "Endodontie",
  prothese_preparation: "Prothèse — préparation",
  prothese_empreinte: "Prothèse — empreinte",
  prothese_pose: "Prothèse — pose",
  implant_chirurgie: "Implant — chirurgie",
  implant_prothese: "Implant — prothèse",
  chirurgie: "Chirurgie",
  parodontie: "Parodontie",
  orthodontie_pose: "Orthodontie — pose",
  orthodontie_controle: "Orthodontie — contrôle",
  urgence: "Urgence",
  premiere_consultation: "Première consultation",
  personnel: "Temps personnel",
  autre: "Autre",
};

export const CAPACITES: Record<Capacite, string> = {
  soins: "Soins",
  prothese: "Prothèse",
  chirurgie: "Chirurgie",
  orthodontie: "Orthodontie",
  prevention: "Prévention",
};

export const ORIGINES: Record<"plan" | "attente" | "controle", { libelle: string; teinte: "vert" | "bleu" | "ambre" }> = {
  plan: { libelle: "Plan accepté", teinte: "vert" },
  attente: { libelle: "Liste d'attente", teinte: "bleu" },
  controle: { libelle: "Contrôle dû", teinte: "ambre" },
};

export const TYPES_CRENEAU: Record<"annulation" | "report" | "deplacement", string> = {
  annulation: "Annulation",
  report: "Report",
  deplacement: "Déplacement",
};

export const NATURES_VERIF: Record<NatureVerif, string> = {
  labo: "Laboratoire",
  implant: "Implants",
  devis_expire: "Devis à échéance",
  mutuelle_accord: "Accord de mutuelle",
  mutuelle_attente: "Mutuelle en attente",
  odf_accord: "Orthodontie — accord",
  odf_semestre: "Orthodontie — semestre",
  interruption: "Traitement interrompu",
  devis_sans_reponse: "Devis sans réponse",
};

export const MUTUELLES: Record<string, string> = {
  non_requise: "Sans mutuelle",
  a_demander: "Accord à demander",
  demandee: "Accord demandé",
  accord: "Accord reçu",
  refus: "Refus de la mutuelle",
};

export const JOURS = ["", "Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi", "Samedi", "Dimanche"];
export const JOURS_COURTS = ["", "lun.", "mar.", "mer.", "jeu.", "ven.", "sam.", "dim."];

export const NATURES_FERMETURE: Record<string, string> = {
  conge: "Congé",
  ferie: "Jour férié",
  fermeture: "Fermeture",
  formation: "Formation",
  absence: "Absence",
};

export const DOMAINES_CAPACITE: Record<string, string> = {
  laboratoire: "Fiches de laboratoire",
  statuts_manques: "Rendez-vous manqués saisis",
  signature_devis: "Dates de signature des devis",
  liens_familiaux: "Liens familiaux",
  stock: "Stock d'implants",
  dates_creation: "Dates de création des rendez-vous",
};

export const ETATS_CAPACITE: Record<string, { libelle: string; teinte: "vert" | "ambre" | "rouge" | "gris" }> = {
  tenu: { libelle: "Tenu", teinte: "vert" },
  partiel: { libelle: "Partiel", teinte: "ambre" },
  non_tenu: { libelle: "Non tenu", teinte: "rouge" },
  inconnu: { libelle: "Inconnu", teinte: "gris" },
};

export const STATUTS_RELEVE: Record<string, { libelle: string; teinte: "vert" | "ambre" | "rouge" | "bleu" | "gris" }> = {
  en_cours: { libelle: "En cours", teinte: "bleu" },
  ok: { libelle: "Appliqué", teinte: "vert" },
  douteux: { libelle: "Douteux", teinte: "ambre" },
  refuse: { libelle: "Refusé", teinte: "rouge" },
  echec: { libelle: "Échec", teinte: "rouge" },
};

export const MODES_RELEVE: Record<string, string> = { rapide: "rapide", courant: "courant", complet: "complet", reprise: "reprise initiale", demande: "à la demande" };

export function heureCourte(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return new Intl.DateTimeFormat("fr-FR", { hour: "2-digit", minute: "2-digit" }).format(d);
}

export function jourEtHeure(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return new Intl.DateTimeFormat("fr-FR", { weekday: "long", day: "numeric", month: "long", hour: "2-digit", minute: "2-digit" }).format(d);
}

export function heureSansSecondes(h: string): string {
  return h.slice(0, 5).replace(":", " h ");
}

export function minutesEnClair(m: number): string {
  if (m < 60) return `${Math.round(m)} min`;
  const h = Math.floor(m / 60);
  const r = Math.round(m % 60);
  return r ? `${h} h ${String(r).padStart(2, "0")}` : `${h} h`;
}

/* b3_12 : le registre des appels */
export const ISSUES_APPEL: Record<"rdv_pris" | "message" | "pas_de_reponse" | "rappeler" | "refus" | "ne_plus_contacter", { libelle: string; teinte: "vert" | "bleu" | "ambre" | "gris" | "rouge" }> = {
  rdv_pris: { libelle: "Rendez-vous pris", teinte: "vert" },
  message: { libelle: "Message laissé", teinte: "bleu" },
  pas_de_reponse: { libelle: "Pas de réponse", teinte: "gris" },
  rappeler: { libelle: "À rappeler", teinte: "ambre" },
  refus: { libelle: "Ne souhaite pas", teinte: "gris" },
  ne_plus_contacter: { libelle: "Ne plus contacter", teinte: "rouge" },
};

export const MOTIFS_APPEL: Record<"creneau" | "plan" | "devis" | "controle" | "attente" | "autre", string> = {
  creneau: "créneau libéré",
  plan: "plan signé",
  devis: "devis sans réponse",
  controle: "contrôle dû",
  attente: "liste d'attente",
  autre: "autre",
};

/* b3_13 : les paniers du devis (100 % Santé, reste à charge maîtrisé, libre) */
export const PANIERS: Record<string, string> = {
  "100_sante": "100 % Santé",
  maitrise: "Reste à charge maîtrisé",
  libre: "Tarifs libres",
  mixte: "Mixte",
  non_precise: "Panier non précisé",
};
