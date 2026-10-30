"use client";

/* ══════════════════════════════════════════════════════════════════════
   Le poste affiché dans /espace3 (30/10/2026)

   /espace3 est la copie de /espace2 pour les groupes. Dans la barre du
   haut, à la place du module, le POSTE : le CEO du groupe ou la direction
   marketing. Le poste choisit les modules du rail, la vue d'ensemble, le
   point du matin, la file des validations et la consommation de l'IA.
   Le choix est gardé dans ce navigateur.
   ══════════════════════════════════════════════════════════════════════ */

import { useSyncExternalStore } from "react";
import { Crown, Megaphone, type LucideIcon } from "lucide-react";

export type Poste = "ceo" | "marketing";

export const POSTES: Record<Poste, { nom: string; libelle: string; personne: string; icone: LucideIcon; modules: string[] }> = {
  ceo: { nom: "CEO", libelle: "Président du groupe", personne: "Le Président", icone: Crown, modules: ["varelo", "filed", "cashd", "offload", "reput"] },
  marketing: { nom: "MARKETING", libelle: "Direction marketing du groupe", personne: "Maëva Rosan", icone: Megaphone, modules: ["reput", "offload"] },
};

export const GROUPE = "Groupe Soléa";

const CLE = "espace3.poste";
const abonnes = new Set<() => void>();
let memoire: Poste | null = null;

/** Le poste choisi, lu hors React (les jeux d'exemple) ; « ceo » côté serveur. */
export function posteCourant(): Poste {
  if (memoire) return memoire;
  try {
    memoire = typeof window !== "undefined" && localStorage.getItem(CLE) === "marketing" ? "marketing" : "ceo";
  } catch {
    memoire = "ceo";
  }
  return memoire;
}

export function ecrirePoste(p: Poste) {
  try {
    localStorage.setItem(CLE, p);
  } catch {
    /* navigation privée : le choix vaut pour la visite */
  }
  memoire = p;
  abonnes.forEach((f) => f());
}

const abonner = (f: () => void) => {
  abonnes.add(f);
  return () => abonnes.delete(f);
};

export function usePoste(): Poste {
  return useSyncExternalStore(abonner, posteCourant, () => "ceo");
}
