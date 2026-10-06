// L'interrupteur des lectures longues (lecteur.analyser). Le secret d'environnement LECTEUR_ANALYSES prime
// (« 1 » / « oui » allume, « 0 » / « non » éteint) ; sans lui, le réglage global `lecteur_analyses` de
// private.reglages, lu par la porte lire_parametre au début du passage (« oui » allume). Le coordinateur peut ainsi
// l'allumer par SQL sans toucher aux secrets de la fonction. Une porte qui ne répond pas laisse éteint.

import { journal, messageDe } from "@partage/journal.ts";
import type { Portes } from "@partage/portes.ts";

export const CLE_ANALYSES = "lecteur_analyses";

export async function analysesActives(env: { get(n: string): string | undefined }, portes: Pick<Portes, "lireParametre">): Promise<boolean> {
  const e = (env.get("LECTEUR_ANALYSES") ?? "").trim().toLowerCase();
  if (e === "1" || e === "oui") return true;
  if (e === "0" || e === "non") return false;
  try {
    return ((await portes.lireParametre(CLE_ANALYSES)) ?? "").trim().toLowerCase() === "oui";
  } catch (err) {
    journal("alerte", "réglage lecteur_analyses illisible : lectures longues éteintes pour ce passage", { erreur: messageDe(err, 200) });
    return false;
  }
}
