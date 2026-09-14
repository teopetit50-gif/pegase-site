/** Fusion de classes, version minimale — reprise telle quelle du site source
 *  (OMEGA/frontd-site, lib/utils.ts).
 *
 * Les composants repris aux registres shadcn appellent `cn(...)`. On n'a pas
 * besoin de `clsx` + `tailwind-merge` ici : aucun de nos usages ne met deux
 * utilitaires en conflit sur la même propriété — et la règle maison est
 * justement que l'appelant porte l'affichage, jamais la base
 * (voir Bouton.tsx). Si un jour un conflit apparaît, passer par
 * `tailwind-merge` (installé sur ce site) plutôt que bricoler cette fonction.
 *
 * RAPATRIEMENT 11/09/2026 — le fichier vit sous components/produits/accueil/
 * et non dans lib/ : `lib/` à la racine est un dossier partagé, et la page
 * rapatriée ne possède que son propre sous-arbre.
 */
export function cn(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}
