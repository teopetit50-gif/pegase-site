/* ══════════════════════════════════════════════════════════════════════
   Tiroma (/secteurs/dentaire) — les petits outils partagés par la page.
   Recopiés SUR PLACE (règle des secteurs rapatriés : aucun import de
   `@/lib/utils` ni de `@/components/ui/…`) : supprimer le dossier
   components/secteurs/dentaire supprime la page sans rien laisser derrière.
   ══════════════════════════════════════════════════════════════════════ */

/* Tous les boutons d'action de la page mènent ici (règle maison). */
export const RESERVER = "/reserver-un-audit";

/* La photo qui tient lieu du fond de la référence (dashboard-bg.jpg, droits
   inconnus) : la salle de soins, Unsplash, créditée dans
   public/secteurs-dentaire/photos/CREDITS.txt. Même image dans le héros et
   dans l'appel final, comme la référence. */
export const PHOTO_FOND = "/secteurs-dentaire/photos/salle-de-soins.jpg";

/* Défilement vers une section de la page : défilement doux, puis l'ancre
   écrite dans l'adresse sans ajouter d'entrée à l'historique. */
export function allerA(id: string) {
  const cible = document.getElementById(id);
  if (!cible) return;
  cible.scrollIntoView({ behavior: "smooth", block: "start" });
  window.history.replaceState(window.history.state, "", `#${id}`);
}
