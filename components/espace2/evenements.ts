/* Les événements de l'organisation, du plus récent au plus ancien —
   documents reçus, demandes de validation, décisions. Partagés par la
   page Activité et le bloc « Activité récente » de la vue d'ensemble. */

import { nomPersonne } from "@/components/espace/exemples/socle";
import { montant } from "@/components/espace/format";
import { etatDocument } from "@/components/espace/filed/etats";
import type { StatutDemande } from "@/components/espace/types";
import { teinte, type Teinte } from "./ui";
import type { Donnees } from "./donnees";

export const STATUTS_DEMANDE: Record<StatutDemande, { libelle: string; teinte: Teinte }> = {
  en_attente: { libelle: "En attente", teinte: "ambre" },
  approuvee: { libelle: "Approuvée", teinte: "vert" },
  rejetee: { libelle: "Rejetée", teinte: "rouge" },
  annulee: { libelle: "Annulée", teinte: "gris" },
  expiree: { libelle: "Expirée", teinte: "gris" },
  executee: { libelle: "Exécutée", teinte: "vert" },
  echec_execution: { libelle: "Échec d'exécution", teinte: "rouge" },
};

export type Evenement = { id: string; quand: string; quoi: string; detail: string; module: string; par: string; etat: { libelle: string; teinte: Teinte }; lien: string | null };

export function evenements(donnees: Donnees): Evenement[] {
  const l: Evenement[] = [];
  for (const d of donnees.docs) {
    const e = etatDocument(d.etat);
    l.push({ id: `doc-${d.id}`, quand: d.recu_le, quoi: "Document reçu", detail: `${d.reference}${d.fournisseur ? ` · ${d.fournisseur}` : ""}`, module: "filed", par: d.fournisseur ?? "Expéditeur inconnu", etat: { libelle: e.libelle, teinte: teinte(e.teinte) }, lien: `/espace2/filed?objet=document:${encodeURIComponent(d.id)}` });
  }
  for (const d of donnees.demandes) {
    const s = STATUTS_DEMANDE[d.statut] ?? { libelle: d.statut, teinte: "gris" as const };
    const par = d.demandeur_type === "systeme" ? "Omega" : nomPersonne(d.demandeur_id);
    l.push({ id: `dem-${d.id}`, quand: d.cree_le, quoi: "Demande de validation", detail: `${d.resume}${d.montant !== null ? ` · ${montant(d.montant, d.devise)}` : ""}`, module: d.module, par, etat: d.decide_le ? { libelle: "Demandée", teinte: "gris" } : s, lien: "/espace2/validations" });
    if (d.decide_le) l.push({ id: `dec-${d.id}`, quand: d.decide_le, quoi: "Décision", detail: d.resume, module: d.module, par: "Valideurs", etat: s, lien: "/espace2/validations" });
  }
  return l.sort((a, b) => b.quand.localeCompare(a.quand));
}
