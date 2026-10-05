/* ══════════════════════════════════════════════════════════════════════
   Les libellés et les règles d'affichage de l'écran Tamila (05/10/2026)

   Tout ce qui est écrit ici est en français et reprend les codes du socle
   (contraintes CHECK de omega/SOCLE-EXTRAITS-TAMILA.sql). La base reste
   juge : l'écran dit ce qu'il croit possible AVANT le clic (boutons
   gris), la porte répond en dernier.
   ══════════════════════════════════════════════════════════════════════ */

import type { Teinte } from "../ui";
import type { ActeDelai, Audience, Delai, Dossier, Membre, Muraille, Personne, QualitePartie, Residence, RoleProcedure, StatutDelai, StatutDossier, Territoire, TypeAvis } from "./types";

export const STATUTS_DOSSIER: Record<StatutDossier, { libelle: string; teinte: Teinte }> = {
  attente: { libelle: "Attend l'ouverture", teinte: "ambre" },
  ouvert: { libelle: "Ouvert", teinte: "vert" },
  audit: { libelle: "Audit", teinte: "bleu" },
  clos: { libelle: "Clos", teinte: "gris" },
  efface: { libelle: "Effacé", teinte: "noir" },
  refuse: { libelle: "Ouverture refusée", teinte: "rouge" },
};

export const STATUTS_DELAI: Record<StatutDelai, { libelle: string; teinte: Teinte }> = {
  a_confirmer: { libelle: "À confirmer", teinte: "ambre" },
  confirme: { libelle: "Confirmé", teinte: "vert" },
  rejete: { libelle: "Rejeté", teinte: "rouge" },
  interrompu: { libelle: "Interrompu", teinte: "bleu" },
  clos: { libelle: "Acte déposé", teinte: "gris" },
  annule: { libelle: "Annulé", teinte: "gris" },
};

export const ACTES: Record<ActeDelai, string> = {
  signifier_declaration: "Signifier la déclaration d'appel",
  conclure: "Remettre ses conclusions et les notifier",
  signifier_conclusions: "Signifier les conclusions aux parties non constituées",
  autre: "Accomplir l'acte fixé par le juge",
};

export const TERRITOIRES: { code: Territoire; libelle: string }[] = [
  { code: "metropole", libelle: "Métropole" },
  { code: "alsace-moselle", libelle: "Alsace-Moselle" },
  { code: "guadeloupe", libelle: "Guadeloupe" },
  { code: "martinique", libelle: "Martinique" },
  { code: "guyane", libelle: "Guyane" },
  { code: "la-reunion", libelle: "La Réunion" },
  { code: "mayotte", libelle: "Mayotte" },
  { code: "saint-barthelemy", libelle: "Saint-Barthélemy" },
  { code: "saint-martin", libelle: "Saint-Martin" },
  { code: "saint-pierre-et-miquelon", libelle: "Saint-Pierre-et-Miquelon" },
];

export const RESIDENCES: { code: Residence; libelle: string }[] = [
  ...TERRITOIRES,
  { code: "nouvelle-caledonie", libelle: "Nouvelle-Calédonie" },
  { code: "polynesie-francaise", libelle: "Polynésie française" },
  { code: "wallis-et-futuna", libelle: "Wallis-et-Futuna" },
  { code: "taaf", libelle: "Terres australes" },
  { code: "etranger", libelle: "Étranger" },
  { code: "inconnue", libelle: "Inconnue" },
];

export function libelleTerritoire(code: string | null | undefined): string {
  if (!code) return "—";
  return RESIDENCES.find((t) => t.code === code)?.libelle ?? code;
}

export const QUALITES: Record<QualitePartie, string> = {
  client: "Client du cabinet",
  adverse: "Partie adverse",
  confrere_adverse: "Confrère adverse",
  expert: "Expert",
  juridiction: "Juridiction",
  tiers: "Tiers",
};

export const ROLES_PROCEDURE: Record<RoleProcedure, string> = {
  appelant: "Appelant",
  intime: "Intimé",
  intervenant_force: "Intervenant forcé",
  intervenant_volontaire: "Intervenant volontaire",
};

export const PROCEDURES: Record<"a_orienter" | "mise_en_etat" | "bref_delai", string> = {
  a_orienter: "À orienter",
  mise_en_etat: "Mise en état",
  bref_delai: "Bref délai",
};

export const NATURES_AUDIENCE: Record<Audience["nature"], string> = {
  plaidoiries: "Plaidoiries",
  mise_en_etat: "Mise en état",
  orientation: "Orientation",
  reglement_amiable: "Règlement amiable",
  audience: "Audience",
};

export const STATUTS_AUDIENCE: Record<Audience["statut"], { libelle: string; teinte: Teinte }> = {
  prevue: { libelle: "Prévue", teinte: "bleu" },
  renvoyee: { libelle: "Renvoyée", teinte: "gris" },
  tenue: { libelle: "Tenue", teinte: "vert" },
  annulee: { libelle: "Annulée", teinte: "gris" },
};

export const TYPES_AVIS: Record<TypeAvis, string> = {
  rpva_avis_fixation: "Avis de fixation à bref délai",
  rpva_avis_902: "Avis de signifier la déclaration (art. 902)",
  rpva_declaration_appel: "Déclaration d'appel",
  rpva_conclusions: "Notification de conclusions",
  rpva_appel_incident: "Appel incident",
  rpva_intervention: "Intervention",
  rpva_ordonnance_mee: "Ordonnance du conseiller de la mise en état",
  rpva_avis_audience: "Avis d'audience",
  rpva_accuse_depot: "Accusé de dépôt",
  rpva_interruption: "Interruption du délai (art. 915-3)",
};

export const STATUTS_AVIS: Record<string, { libelle: string; teinte: Teinte }> = {
  lu: { libelle: "Lu", teinte: "gris" },
  applique: { libelle: "Appliqué", teinte: "vert" },
  sans_effet: { libelle: "Sans effet", teinte: "gris" },
  a_rattacher: { libelle: "À rattacher", teinte: "ambre" },
  a_verifier: { libelle: "À vérifier", teinte: "rouge" },
};

export const MOTIFS_CORRECTION = [
  ["calcul_errone", "Calcul à reprendre"],
  ["date_notifiee", "Date notifiée par le greffe"],
  ["delai_modifie_par_le_juge", "Délai modifié par le juge (art. 911, al. 2 ; 906-2, al. 6)"],
  ["reprise_apres_interruption", "Reprise après interruption"],
  ["autre", "Autre"],
] as const;

export const MOTIFS_INTERRUPTION = [
  ["mediation", "Médiation"],
  ["conciliation", "Conciliation"],
  ["procedure_participative", "Convention de procédure participative"],
  ["mise_en_etat_simplifiee", "Convention de mise en état simplifiée"],
  ["audience_reglement_amiable", "Audience de règlement amiable"],
  ["a_preciser", "Cause à préciser"],
] as const;

export const MOTIFS_ANNULATION = [
  ["desistement", "Désistement"],
  ["caducite_prononcee", "Caducité prononcée"],
  ["irrecevabilite_prononcee", "Irrecevabilité prononcée"],
  ["radiation", "Radiation"],
  ["procedure_changee", "La procédure a changé"],
  ["erreur", "Posé par erreur"],
  ["doublon", "Doublon"],
  ["autre", "Autre"],
] as const;

export const RAISONS: Record<string, string> = {
  domicile_inconnu: "domicile de la partie à préciser",
  fin_de_mois_augmentation: "fin de mois : calculé d'un bloc, le délai finirait plus tard",
  etranger_devant_outre_mer: "partie à l'étranger devant une cour d'outre-mer : un ou deux mois",
  type_propose_par_modele: "type d'avis proposé par le modèle",
  rg_non_verifie: "n° RG non vérifié",
  rang_a_verifier: "rang des conclusions à vérifier",
  procedure_changee: "la procédure a changé depuis le calcul",
};

export const MOTIFS_AUGMENTATION: Record<string, string> = {
  aucune: "sans augmentation",
  non_augmentable: "délai non augmentable",
  outre_mer_devant_metropole: "partie demeurant outre-mer devant une juridiction de métropole (art. 915-4)",
  hors_collectivite: "partie hors de la collectivité de la juridiction (art. 915-4)",
  etranger: "partie demeurant à l'étranger (art. 915-4)",
  etranger_devant_outre_mer: "partie à l'étranger devant une juridiction d'outre-mer, à confirmer",
  domicile_inconnu: "domicile inconnu : aucune augmentation retenue",
};

export const ROLES_DOSSIER: Record<Membre["role_dossier"], string> = {
  responsable: "Responsable",
  intervenant: "Intervenant",
  lecteur: "Lecteur",
};

export const ROLES_CABINET: Record<Personne["role"], string> = {
  gerant: "Associé gérant",
  admin: "Associé",
  valideur: "Avocat",
  collaborateur: "Assistant juridique",
  lecteur: "Stagiaire",
};

export const MATIERES = [
  "civil", "commercial", "prud_hommes", "construction", "corporel", "baux", "famille", "assurances", "copropriete",
  "consommation", "successions", "bancaire", "administratif", "transport", "sante", "brevets", "rural", "societes", "recouvrement",
];

export function libelleMatiere(m: string | null | undefined): string {
  if (!m) return "—";
  const l: Record<string, string> = { prud_hommes: "Prud'hommes", corporel: "Dommage corporel", copropriete: "Copropriété", sante: "Santé", societes: "Sociétés" };
  return l[m] ?? m.charAt(0).toUpperCase() + m.slice(1);
}

/* ——— ce que la personne connectée peut faire (la base reste juge) ——— */

export type Moi = { user_id: string; role: Personne["role"] } | null;

export function estAvocat(moi: Moi): boolean {
  return !!moi && ["gerant", "admin", "valideur"].includes(moi.role);
}

export function estAssocie(moi: Moi): boolean {
  return !!moi && ["gerant", "admin"].includes(moi.role);
}

export function estGerant(moi: Moi): boolean {
  return !!moi && moi.role === "gerant";
}

/** Écrit dans le dossier : membre responsable ou intervenant actif, titulaire perso, ou associé (dossier ordinaire). */
export function ecritDossier(moi: Moi, d: Dossier, membres: Membre[], murailles: Muraille[]): boolean {
  if (!moi || moi.role === "lecteur") return false;
  if (!["attente", "ouvert", "audit"].includes(d.statut)) return false;
  if (murailles.some((m) => m.user_id === moi.user_id && !m.leve_le)) return false;
  const m = membres.find((x) => x.user_id === moi.user_id && (!x.jusqu_au || new Date(x.jusqu_au) > new Date()));
  if (m && m.role_dossier !== "lecteur") return true;
  if (d.perso) return d.proprietaire_perso === moi.user_id;
  return estAssocie(moi);
}

/** Gère le dossier : responsable, titulaire perso ou associé. */
export function gereDossier(moi: Moi, d: Dossier, membres: Membre[], murailles: Muraille[]): boolean {
  if (!moi) return false;
  if (!["attente", "ouvert", "audit"].includes(d.statut)) return false;
  if (murailles.some((m) => m.user_id === moi.user_id && !m.leve_le)) return false;
  if (membres.some((x) => x.user_id === moi.user_id && x.role_dossier === "responsable" && (!x.jusqu_au || new Date(x.jusqu_au) > new Date()))) return true;
  if (d.perso) return d.proprietaire_perso === moi.user_id;
  return estAssocie(moi);
}

/** Les délais qui courent encore (à l'écran : à confirmer, confirmés, rejetés, interrompus). */
export function delaiCourt(t: Delai): boolean {
  return ["a_confirmer", "confirme", "rejete", "interrompu"].includes(t.statut);
}

export function joursAvant(iso: string, maintenant = new Date()): number {
  const d = new Date(iso + (iso.length === 10 ? "T12:00:00" : ""));
  const m = new Date(maintenant);
  m.setHours(12, 0, 0, 0);
  return Math.round((d.getTime() - m.getTime()) / 86_400_000);
}
