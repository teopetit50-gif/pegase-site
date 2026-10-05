/* ══════════════════════════════════════════════════════════════════════
   La logique de la file de validation — pure, sans Supabase (05/10/2026)

   Ce que la base décide elle-même (triggers approbations_preparer et
   approbations_appliquer : rôle, délégation, séparation saisie /
   approbation, compte des approbations) est RECALCULÉ ici pour l'écran,
   afin de dire AVANT le clic pourquoi un bouton est gris. La base reste
   juge en dernier ressort : si elle refuse, l'écran affiche son message.
   ══════════════════════════════════════════════════════════════════════ */

import type { Approbation, Delegation, Demande, Role } from "../types";

export type Exigences = { commentaire: boolean; piece_jointe: boolean; motif_refus: boolean };

/* Ce que la règle exige au moment de décider. La table regles_validation
   ne porte pas (encore) ces trois drapeaux : ils sont lus dans
   demande.payload.exigences quand le module qui a créé la demande les a
   posés, sinon déduits — un refus porte toujours un motif ; au-delà de
   10 000 €, ou quand plusieurs approbations sont requises, un commentaire
   accompagne l'approbation. (Demande au coordinateur : trois colonnes sur
   regles_validation, voir omega/NOTES-A3.md.) */
export function exigences(d: Demande): Exigences {
  const p = d.payload?.exigences as Partial<Exigences> | undefined;
  const base: Exigences = {
    commentaire: (d.montant ?? 0) >= 10_000 || d.approbations_requises > 1,
    piece_jointe: false,
    motif_refus: true,
  };
  if (!p || typeof p !== "object") return base;
  return {
    commentaire: typeof p.commentaire === "boolean" ? p.commentaire : base.commentaire,
    piece_jointe: typeof p.piece_jointe === "boolean" ? p.piece_jointe : base.piece_jointe,
    motif_refus: typeof p.motif_refus === "boolean" ? p.motif_refus : base.motif_refus,
  };
}

export type Groupe = "retard" | "aujourdhui" | "semaine" | "plus_tard" | "sans";

export const GROUPES: { cle: Groupe; libelle: string; teinte?: "rouge" }[] = [
  { cle: "retard", libelle: "En retard", teinte: "rouge" },
  { cle: "aujourdhui", libelle: "Aujourd'hui" },
  { cle: "semaine", libelle: "Cette semaine" },
  { cle: "plus_tard", libelle: "Plus tard" },
  { cle: "sans", libelle: "Sans échéance" },
];

export function groupeDe(d: Demande, maintenant = new Date()): Groupe {
  if (!d.echeance) return "sans";
  const e = new Date(d.echeance).getTime();
  const t = maintenant.getTime();
  if (e < t) return "retard";
  const finJour = new Date(maintenant);
  finJour.setHours(23, 59, 59, 999);
  if (e <= finJour.getTime()) return "aujourdhui";
  if (e <= t + 7 * 86_400_000) return "semaine";
  return "plus_tard";
}

/* Priorité : retard d'abord, puis échéance la plus proche, puis le montant
   le plus élevé, puis la plus ancienne. Les demandes sans échéance passent
   après celles qui en ont une. */
export function trier(demandes: Demande[], maintenant = new Date()): Demande[] {
  const rang: Record<Groupe, number> = { retard: 0, aujourdhui: 1, semaine: 2, plus_tard: 3, sans: 4 };
  return [...demandes].sort((a, b) => {
    const ga = rang[groupeDe(a, maintenant)];
    const gb = rang[groupeDe(b, maintenant)];
    if (ga !== gb) return ga - gb;
    if (a.echeance && b.echeance) {
      const d = new Date(a.echeance).getTime() - new Date(b.echeance).getTime();
      if (d !== 0) return d;
    }
    const m = (b.montant ?? 0) - (a.montant ?? 0);
    if (m !== 0) return m;
    return new Date(a.cree_le).getTime() - new Date(b.cree_le).getTime();
  });
}

export type Decideur = { id: string; role: Role | null };

export type Verdict =
  | { peut: true; au_nom_de: Delegation | null }
  | { peut: false; raison: string; separation?: boolean };

/* Qui peut décider, et pourquoi pas : la séparation saisie / approbation
   d'abord (c'est celle qu'on affiche), puis « déjà décidé », puis le rôle,
   que la délégation en cours peut suppléer. */
export function verdict(d: Demande, moi: Decideur, approbations: Approbation[], delegations: Delegation[], maintenant = new Date()): Verdict {
  if (d.statut !== "en_attente") return { peut: false, raison: "Cette demande est déjà décidée." };
  if (d.demandeur_type === "utilisateur" && d.demandeur_id === moi.id) {
    return {
      peut: false,
      separation: true,
      raison: "Vous avez saisi cette demande : la séparation entre saisie et approbation vous interdit de la décider.",
    };
  }
  if (approbations.some((a) => a.demande_id === d.id && (a.user_id === moi.id || a.au_nom_de === moi.id))) {
    return { peut: false, raison: "Vous avez déjà pris votre décision sur cette demande." };
  }
  if (moi.role && d.roles_autorises.includes(moi.role)) return { peut: true, au_nom_de: null };
  const t = maintenant.getTime();
  const deleg = delegations.find(
    (g) =>
      g.delegataire === moi.id &&
      !g.revoquee_le &&
      new Date(g.debut).getTime() <= t &&
      (!g.fin || new Date(g.fin).getTime() >= t) &&
      (!g.module || g.module === d.module) &&
      (!g.entite_id || g.entite_id === d.entite_id) &&
      !approbations.some((a) => a.demande_id === d.id && a.user_id === g.delegant),
  );
  if (deleg) return { peut: true, au_nom_de: deleg };
  return {
    peut: false,
    raison: moi.role
      ? `Votre rôle (${moi.role}) n'est pas parmi ceux que la règle autorise (${d.roles_autorises.join(", ")}).`
      : "Votre compte n'a pas de rôle sur ce client.",
  };
}

/* La délégation en cours sous laquelle on PEUT aussi décider, même quand
   on a déjà le rôle : l'écran la propose en option (« au nom de … »). */
export function delegationsUtilisables(d: Demande, moi: Decideur, delegations: Delegation[], maintenant = new Date()): Delegation[] {
  const t = maintenant.getTime();
  return delegations.filter(
    (g) =>
      g.delegataire === moi.id &&
      !g.revoquee_le &&
      new Date(g.debut).getTime() <= t &&
      (!g.fin || new Date(g.fin).getTime() >= t) &&
      (!g.module || g.module === d.module) &&
      (!g.entite_id || g.entite_id === d.entite_id),
  );
}

export function compteApprobations(d: Demande, approbations: Approbation[]) {
  const liees = approbations.filter((a) => a.demande_id === d.id);
  return {
    faites: liees.filter((a) => a.decision === "approuve").length,
    refus: liees.filter((a) => a.decision === "rejete").length,
    requises: d.approbations_requises,
    liste: liees,
  };
}

/* Les motifs de refus proposés : un choix fermé ouvre la saisie libre. */
export const MOTIFS_REFUS = [
  "Montant ou bénéficiaire à vérifier",
  "Pièce justificative manquante ou illisible",
  "Hors budget ou hors période",
  "Doublon d'une demande déjà traitée",
  "Fournisseur non référencé ou bloqué",
  "Désaccord avec la demande (préciser)",
];

export const STATUTS: Record<Demande["statut"], { libelle: string; teinte: "vert" | "ambre" | "rouge" | "bleu" | "gris" }> = {
  en_attente: { libelle: "En attente", teinte: "ambre" },
  approuvee: { libelle: "Approuvée", teinte: "vert" },
  executee: { libelle: "Exécutée", teinte: "vert" },
  rejetee: { libelle: "Refusée", teinte: "rouge" },
  annulee: { libelle: "Annulée", teinte: "gris" },
  expiree: { libelle: "Expirée", teinte: "gris" },
  echec_execution: { libelle: "Échec d'exécution", teinte: "rouge" },
};
