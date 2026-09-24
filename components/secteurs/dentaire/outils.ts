/* ══════════════════════════════════════════════════════════════════════
   Tiroma (/secteurs/dentaire) — les petits outils partagés par la page.

   Recopiés SUR PLACE (règle des secteurs rapatriés : aucun import de
   `@/lib/utils` ni de `@/components/ui/…`) : supprimer le dossier
   components/secteurs/dentaire supprime la page sans rien laisser derrière.
   ══════════════════════════════════════════════════════════════════════ */
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

/* `ml()` de la source : les classes réunies, puis dédoublonnées par
   tailwind-merge (le dernier `mt-…` gagne, etc.). */
export function cn(...classes: ClassValue[]) {
  return twMerge(clsx(classes));
}

/* Tous les boutons d'action de la page mènent ici (règle maison). La
   source visait https://omegaai.fr/reserver et, pour « Nous écrire »,
   mailto:contact@omegaai.fr. */
export const RESERVER = "/reserver-un-audit";

/* Défilement vers une section de la page, comme la fonction `A()` de la
   source : défilement doux, puis l'ancre écrite dans l'adresse sans
   ajouter d'entrée à l'historique. */
export function allerA(id: string) {
  const cible = document.getElementById(id);
  if (!cible) return;
  cible.scrollIntoView({ behavior: "smooth", block: "start" });
  window.history.replaceState(window.history.state, "", `#${id}`);
}
