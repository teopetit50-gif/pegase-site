import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

/* Helper `cn` de la convention shadcn : les composants récupérés sur
   21st.dev l'importent depuis `@/lib/utils`.

   POURQUOI IL VIT ICI ET PAS DANS lib/ — omega-site-v3 n'avait pas de
   `lib/utils.ts`, et les quatre sites SaaS rapatriés le 11/09 en
   attendaient tous un. Quatre agents créant le même fichier partagé en
   même temps, c'est une collision garantie et un fichier qui n'appartient
   à personne. Il reste donc dans le jeu de fichiers du produit, qui est
   disjoint par construction. Le jour où les quatre pages sont posées,
   remonter les quatre copies en un seul `lib/utils.ts` est un
   déplacement de fichier, pas une refonte. */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
