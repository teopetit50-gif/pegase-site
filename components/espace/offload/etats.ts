/* Libellés et teintes de l'écran OFFLOAD. */

import type { Teinte } from "../ui";
import type { Niveau, StatutReprise } from "./types";

export const NIVEAUX: Record<Niveau, { libelle: string; teinte: Teinte; sous: string }> = {
  eteint: { libelle: "S'est tu", teinte: "rouge", sous: "au-delà de trois fois son rythme" },
  decroche: { libelle: "Décroche", teinte: "ambre", sous: "en retard sur son rythme" },
  saison: { libelle: "Saison manquée", teinte: "ambre", sous: "absent au mois où il achète" },
  ralentit: { libelle: "Ralentit", teinte: "bleu", sous: "achète moins ou moins souvent" },
  ok: { libelle: "Régulier", teinte: "vert", sous: "dans son rythme" },
  sans_achat: { libelle: "Sans achat daté", teinte: "gris", sous: "présenté à part" },
  sous_seuil: { libelle: "Sous le seuil", teinte: "gris", sous: "moins que le montant minimal" },
};

export const A_RISQUE: Niveau[] = ["eteint", "decroche", "saison", "ralentit"];

export const STATUTS_REPRISE: Record<StatutReprise, { libelle: string; teinte: Teinte }> = {
  a_valider: { libelle: "Message à valider", teinte: "ambre" },
  appel: { libelle: "Appel à passer", teinte: "ambre" },
  envoyee: { libelle: "Message parti, en attente", teinte: "bleu" },
  relance_a_valider: { libelle: "Relance à valider", teinte: "ambre" },
  relancee: { libelle: "Relancé, en attente", teinte: "bleu" },
  repondue: { libelle: "A répondu", teinte: "vert" },
  close: { libelle: "Reprise close", teinte: "gris" },
};

export const ISSUES: Record<string, string> = {
  reponse: "le client a répondu",
  arret: "le client a demandé l'arrêt",
  commande: "le client a commandé",
  sans_reponse: "deux messages sans réponse",
  refusee: "message refusé en validation",
  appel_passe: "appel passé",
  reprise_en_main: "repris en main par le commercial",
  abandon: "abandonnée",
};

export const STATUTS_COMPTE: Record<"suivi" | "exclu" | "arrete", string> = {
  suivi: "Suivi",
  exclu: "Suivi en direct",
  arrete: "Retiré à sa demande",
};
