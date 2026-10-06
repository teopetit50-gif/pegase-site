/* Les libellés et teintes de l'écran DALIRO — pur (05/10/2026). */

import type { Teinte } from "../ui";
import type { Confirmation, ControleLigne, EnvoiPassage, Gravite, Lot, StatutAvenant, StatutChantier, Vigilance } from "./types";

export const STATUTS_CHANTIER: Record<StatutChantier, { libelle: string; teinte: Teinte }> = {
  preparation: { libelle: "En préparation", teinte: "bleu" },
  ouvert: { libelle: "Ouvert", teinte: "vert" },
  suspendu: { libelle: "Suspendu", teinte: "ambre" },
  receptionne: { libelle: "Réceptionné", teinte: "gris" },
  clos: { libelle: "Clos", teinte: "gris" },
  annule: { libelle: "Annulé", teinte: "gris" },
};

export const GRAVITES: Record<Gravite, { libelle: string; teinte: Teinte }> = {
  bloquant: { libelle: "Bloquant", teinte: "rouge" },
  attention: { libelle: "À voir", teinte: "ambre" },
  info: { libelle: "Information", teinte: "bleu" },
};

export const CONTROLES_LIGNE: Record<ControleLigne, { libelle: string; teinte: Teinte }> = {
  ok: { libelle: "Juste", teinte: "vert" },
  incomplet: { libelle: "Incomplète", teinte: "rouge" },
  montant_faux: { libelle: "Montant ≠ quantité × PU", teinte: "ambre" },
};

export const CONFIRMATIONS: Record<Confirmation, { libelle: string; teinte: Teinte }> = {
  non_demandee: { libelle: "Pas encore demandée", teinte: "gris" },
  demandee: { libelle: "Demandée (J-2)", teinte: "bleu" },
  confirmee: { libelle: "Confirmé", teinte: "vert" },
  declinee: { libelle: "Décliné", teinte: "rouge" },
  sans_reponse: { libelle: "Sans réponse", teinte: "ambre" },
};

export const STATUTS_AVENANT: Record<StatutAvenant, { libelle: string; teinte: Teinte }> = {
  brouillon: { libelle: "En préparation", teinte: "gris" },
  soumis: { libelle: "À signer", teinte: "bleu" },
  signe: { libelle: "Signé", teinte: "vert" },
  refuse: { libelle: "Refusé", teinte: "rouge" },
  abandonne: { libelle: "Abandonné", teinte: "gris" },
};

export const VIGILANCES: Record<Vigilance, { libelle: string; teinte: Teinte }> = {
  sans_objet: { libelle: "Sans objet", teinte: "gris" },
  absente: { libelle: "Attestation absente", teinte: "rouge" },
  echue: { libelle: "Attestation de plus de six mois", teinte: "rouge" },
  a_verifier: { libelle: "À vérifier (Urssaf)", teinte: "ambre" },
  a_renouveler: { libelle: "À renouveler sous quinze jours", teinte: "bleu" },
  a_jour: { libelle: "À jour", teinte: "vert" },
};

export const EXECUTIONS: Record<Lot["execution"], string> = {
  client: "Nos équipes",
  sous_traitant: "Sous-traitant",
  autre_titulaire: "Autre titulaire",
};

export const ACCEPTATIONS: Record<string, { libelle: string; teinte: Teinte }> = {
  a_demander: { libelle: "Acceptation à demander", teinte: "ambre" },
  demandee: { libelle: "Acceptation demandée", teinte: "bleu" },
  acceptee: { libelle: "Accepté par le maître d'ouvrage", teinte: "vert" },
  refusee: { libelle: "Acceptation refusée", teinte: "rouge" },
  caduque: { libelle: "Acceptation caduque", teinte: "gris" },
};

export const ROLES_TIERS: Record<string, string> = {
  maitre_ouvrage: "Maître d'ouvrage",
  maitre_oeuvre: "Maître d'œuvre",
  sous_traitant: "Sous-traitant",
  autre_titulaire: "Autre titulaire",
  fournisseur: "Fournisseur",
  loueur: "Loueur",
  entreprise_principale: "Entreprise principale",
  controleur: "Contrôleur",
};

export const UNITES: { cle: string; libelle: string }[] = [
  { cle: "u", libelle: "unité" },
  { cle: "ens", libelle: "ensemble" },
  { cle: "forfait", libelle: "forfait" },
  { cle: "ml", libelle: "mètre linéaire" },
  { cle: "m2", libelle: "m²" },
  { cle: "m3", libelle: "m³" },
  { cle: "kg", libelle: "kg" },
  { cle: "t", libelle: "tonne" },
  { cle: "l", libelle: "litre" },
  { cle: "h", libelle: "heure" },
  { cle: "j", libelle: "jour" },
  { cle: "sem", libelle: "semaine" },
  { cle: "mois", libelle: "mois" },
];

export function libelleUnite(u: string | null | undefined): string {
  if (!u) return "—";
  return UNITES.find((x) => x.cle === u)?.libelle ?? u;
}

/* Les contrôles du chantier (vue btp_controle), en clair : le message de la
   base est déjà une phrase ; ici la famille, pour grouper. */
export function familleControle(code: string): string {
  if (code.startsWith("chantier_")) return "Chantier";
  if (code.startsWith("marche_")) return "Marché";
  if (code.startsWith("lot_") || code.startsWith("sous_traitant_")) return "Lots";
  if (code.startsWith("passage_") || code.startsWith("dependance_")) return "Planning";
  if (code.startsWith("vigilance_") || code.startsWith("intervenant_") || code.startsWith("chef_")) return "Annuaire";
  return "Autre";
}

/* Famille d'un chantier pour les compteurs de tête. */
export type Famille = "bloque" | "a_signer" | "a_confirmer" | "ouvert";
export const FAMILLES: { cle: Famille; libelle: string; sous: string; teinte: "rouge" | "ambre" | "bleu" | "vert" }[] = [
  { cle: "bloque", libelle: "Bloqués", sous: "un contrôle bloquant", teinte: "rouge" },
  { cle: "a_signer", libelle: "Avenants à signer", sous: "travaux chiffrés, pas signés", teinte: "ambre" },
  { cle: "a_confirmer", libelle: "Passages à confirmer", sous: "J-2 demandé, sans réponse ou décliné", teinte: "bleu" },
  { cle: "ouvert", libelle: "Chantiers ouverts", sous: "sur le quota de la formule", teinte: "vert" },
];

/* Le statut d'une facture FILED rattachée au chantier (filed_factures.statut,
   a4_02 compris). Un statut que l'écran ne connaît pas encore s'affiche tel
   quel plutôt que de casser. */
export const STATUTS_FACTURE: Record<string, string> = {
  a_completer: "À compléter",
  bloquee: "Bloquée",
  a_valider: "À valider",
  validee: "Validée",
  refusee: "Refusée",
  ecartee: "Écartée",
  comptabilisee: "Comptabilisée",
};

export function libelleStatutFacture(s: string | null | undefined): string {
  if (!s) return "—";
  return STATUTS_FACTURE[s] ?? s;
}

/* Où en est la demande J-2 d'un passage (l'envoi du socle), en une ligne. */
export function libelleEnvoi(e: EnvoiPassage, date: (iso: string) => string): string {
  const essai = (e.mode === "essai" ? " (essai)" : "") + (e.accord ? ` · approuvée par l'accord permanent${e.accord.active_le ? ` du ${date(e.accord.active_le)}` : ""}` : "");
  if (e.remise === "remis") return `Demande remise${e.remise_le ? ` le ${date(e.remise_le)}` : ""}${essai}`;
  if (e.remise === "rebond" || e.remise === "plainte" || e.remise === "refuse") return `Demande non remise (${e.remise === "rebond" ? "adresse en échec" : e.remise === "plainte" ? "signalée comme indésirable" : "refusée"})${essai}`;
  if (e.statut === "envoye") return `Demande envoyée${e.envoye_le ? ` le ${date(e.envoye_le)}` : ""}${essai}`;
  if (e.statut === "a_valider") return `Demande à valider dans « À valider »${essai}`;
  if (e.statut === "differe" || e.statut === "pret" || e.statut === "en_cours") return `Demande en partance${essai}`;
  return `Demande non partie${e.verrou ? ` (${e.verrou})` : ""}${essai}`;
}
