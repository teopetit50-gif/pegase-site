"use client";
/* ══════════════════════════════════════════════════════════════════════
   Tamila (cabinets d'avocats) — Matieres.tsx

   COPIÉ le 24/09/2026 à 13 h 37 de `OMEGA/cabinetos-site/src/components/
   matieres.tsx`. Grille 2/3/4 colonnes, apparition en cascade : inchangées.
   Resynchronisé à 14 h 23 par la session des textes : les émojis des
   matières sont retirés, comme dans la source (`pict` vide, non rendu).

   CONVERSIONS (règle 3, jetons CLAIRS) : `text-muted-foreground` →
   `text-[#737373]` · `hover:text-primary` → `hover:text-[#171717]` (la
   matière survolée s'éclaircissait vers le blanc ; elle fonce vers
   l'encre) · `bg-muted` → `bg-[#f5f5f5]` — ⚠ non convertie, elle aurait
   peint le gris #9b9ba3 du site (`--color-muted`) · `font-subheading
   italic` → `avocats-accent italic`.
   MONDE BLANC : le halo `blue-400 → indigo-500` → `blue-200 → indigo-300`.
   Ancre : `scroll-mt-16 sm:scroll-mt-[72px]` (entête d'Omega).
   ══════════════════════════════════════════════════════════════════════ */

import { motion } from "framer-motion";
import { Plus } from "lucide-react";
import AnimationContainer from "./apparition";
import { MATIERES } from "./textes";

/* « Instantly translate your content into 60+ languages » → les matières où les pièces s'empilent.
   Même grille (2/3/4 colonnes), un pictogramme en text-2xl à la place du drapeau, apparition en cascade.
   24/09 au soir : la tache bleue floue derrière la grille est retirée (registre d'un cabinet, avocats.css). */
export default function Matieres() {
  return (
    <div id="matieres" className="relative flex flex-col items-center justify-center max-w-5xl py-20 mx-auto scroll-mt-16 sm:scroll-mt-[72px]">
      <AnimationContainer>
        <div className="flex flex-col items-center justify-center w-full max-w-3xl mx-auto text-center">
          <h2 className="text-2xl md:text-4xl lg:text-5xl font-medium leading-[1.15]! mb-6">
            {MATIERES.avant} <span className="avocats-accent italic">{MATIERES.mot}</span>
          </h2>
        </div>
      </AnimationContainer>
      <ul className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-6 items-start justify-start max-w-4xl mx-auto pt-10 relative w-full">
        {MATIERES.liste.map(([pict, nom], i) => (
          <motion.li
            key={nom}
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.05 * i, duration: 0.4, type: "spring" }}
            className="w-full flex items-center space-x-2 text-sm text-[#737373] hover:text-[#171717] transition-colors h-auto"
          >
            {pict && <span className="text-2xl" aria-hidden="true">{pict}</span>}
            <span className="text-lg lg:text-xl">{nom}</span>
          </motion.li>
        ))}
        <li className="flex items-center space-x-2 text-sm text-[#737373]">
          <span className="flex items-center justify-center w-6 h-6 rounded-full bg-[#f5f5f5]">
            <Plus className="w-4 h-4" aria-hidden="true" />
          </span>
          <span>{MATIERES.plus}</span>
        </li>
      </ul>
    </div>
  );
}
