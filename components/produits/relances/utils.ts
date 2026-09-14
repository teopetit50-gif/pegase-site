import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

/* Helper `cn` de la convention shadcn : les composants récupérés sur
   21st.dev l'importent depuis `@/lib/utils`.

   Rapatrié ici plutôt qu'à la racine : `lib/` est un dossier partagé, et
   RAPATRIEMENT.md interdit d'y toucher. Les quatre pages produit portent
   donc chacune leur copie de ces huit lignes — c'est le prix d'agents
   disjoints, et c'est moins cher qu'une collision dans `lib/`. */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
