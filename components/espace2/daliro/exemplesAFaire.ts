/* DALIRO › À faire — sept passages d'exemple de plus (02/11/2026)

   My issues de Linear, relevé rempli (linear-my-issues.md, complément du
   01/11), montre dix-sept lignes en trois groupes. L'exemple de l'espace 2
   en donne dix : on ajoute ici, dans les chantiers d'exemple déjà ouverts,
   trois passages en retard à noter faits et quatre sous-traitants à relancer
   à J-2, pour une page de même longueur que la référence.

   Ils sont posés une fois dans les données partagées (onLocal, ./donnees),
   pour que la fiche du chantier les montre aussi. Rien n'est écrit en base.
   Chaque passage est la copie d'un passage de sous-traitant du même
   chantier : mêmes lot, intervenant et champs, autre tâche et autres dates. */

import { aujourdHui } from "@/components/espace/exemples/socle";
import type { Passage, Tableau } from "@/components/espace/daliro/types";

const id = (n: number) => `00000000-0000-4000-8000-00000000e9${String(n).padStart(2, "0")}`;

type Ajout = { n: number; tache: string; du: number; au: number; confirmation: Passage["confirmation"] };
const AJOUTS: Ajout[] = [
  { n: 1, tache: "Reprise des joints de façade", du: -6, au: -2, confirmation: "confirmee" },
  { n: 2, tache: "Pose des seuils de portes-fenêtres", du: -5, au: -1, confirmation: "confirmee" },
  { n: 3, tache: "Ragréage du local technique", du: -4, au: -1, confirmation: "confirmee" },
  { n: 4, tache: "Raccordement du tableau divisionnaire", du: 2, au: 3, confirmation: "sans_reponse" },
  { n: 5, tache: "Pose des menuiseries du R+1", du: 3, au: 4, confirmation: "sans_reponse" },
  { n: 6, tache: "Étanchéité de la toiture-terrasse", du: 8, au: 10, confirmation: "demandee" },
  { n: 7, tache: "Faïence des salles d'eau", du: 9, au: 11, confirmation: "demandee" },
];
export const IDS_AJOUTS = new Set(AJOUTS.map((a) => id(a.n)));

/* les tableaux à remplacer (ceux qui reçoivent un passage), ou rien si c'est déjà fait */
export function completerExemple(tableaux: Tableau[]): Tableau[] {
  if (tableaux.some((t) => t.passages.some((p) => IDS_AJOUTS.has(p.id)))) return [];
  const sources = tableaux
    .filter((t) => t.chantier.statut === "ouvert")
    .map((t) => ({ t, modele: t.passages.find((p) => p.intervenant_type === "tiers" && p.statut === "prevu") ?? null }))
    .filter((x): x is { t: Tableau; modele: Passage } => !!x.modele);
  if (!sources.length) return [];
  const ajouts = new Map<string, Passage[]>();
  AJOUTS.forEach((a, i) => {
    const { t, modele } = sources[i % sources.length];
    const p: Passage = {
      ...modele,
      id: id(a.n),
      tache: a.tache,
      debut: aujourdHui(a.du),
      fin: aujourdHui(a.au),
      statut: "prevu",
      confirmation: a.confirmation,
      confirmation_le: a.confirmation === "non_demandee" ? null : new Date(Date.now() - 86_400_000 * 3).toISOString(),
      confirmations: [],
      envoi: null,
    };
    ajouts.set(t.chantier.id, [...(ajouts.get(t.chantier.id) ?? []), p]);
  });
  return tableaux.filter((t) => ajouts.has(t.chantier.id)).map((t) => ({ ...t, passages: [...t.passages, ...ajouts.get(t.chantier.id)!] }));
}
