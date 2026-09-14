"use client";

import { useState } from "react";
import Link from "next/link";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { Chevron } from "@/components/offres/MediaMoteurs";

/* ══════════════════════════════════════════════════════════════════════
   Les trois portes de l'accueil — rangée à surbrillance glissante
   (10/09/2026)

   ORIGINE. Repris de `card-hover-effect` (Aceternity UI, MIT) — la fiche
   est dans la bibliothèque montée le 20/08 :
   `OMEGA/toyota-guadeloupe/bibliotheque/composants/cartes-et-produits/
   aceternity__card-hover-effect/`. Ce qui est GARDÉ du composant d'origine,
   c'est sa seule idée réelle : un pavé de fond partagé qui GLISSE d'une
   carte à l'autre au survol, par `layoutId`. Trois cartes qui s'éclairent
   chacune dans leur coin se lisent comme trois produits ; un seul pavé qui
   se déplace se lit comme trois portes d'une même maison — ce que dit la
   section.

   CE QUI EST JETÉ. Toute son habillage : `bg-neutral-200`, la carte noire
   `dark:bg-black`, `rounded-3xl`, ses classes `text-zinc-100`, et le `cn()`
   de shadcn (ce dépôt n'a pas de `lib/utils`). Les cartes gardent
   `.o-card-soft` — le vocabulaire de l'accueil — et le pavé prend le gris
   de la charte plutôt qu'un gris de démo.

   ÉCART ASSUMÉ : c'est le PREMIER composant du site qui anime avec
   `motion`, là où tout le reste passe par GSAP et `data-reveal`. La
   dépendance était déjà au package.json (v12), donc rien à installer, et
   le partage d'élément par `layoutId` est précisément ce que ni GSAP ni le
   CSS ne font en trois lignes. Ne pas généraliser pour autant : une
   apparition au défilement continue de se faire en `data-reveal`.

   Le pavé est SOUS la carte (`z-0` contre `z-10`) et déborde de 8 px par
   le `p-2` du lien : il se voit en halo autour de la carte survolée, sans
   jamais passer devant le texte.

   `prefers-reduced-motion` : la surbrillance ne glisse plus, elle apparaît
   — `layout` est coupé, l'opacité reste. Rien ne disparaît. */

export type Porte = {
  nom: string;
  objectif: string;
  texte: string;
  lien: { label: string; href: string };
};

export default function PortesHover({ portes }: { portes: Porte[] }) {
  const [survolee, setSurvolee] = useState<number | null>(null);
  /* mouvement réduit : chaque carte reçoit SON pavé (donc aucun
     `layoutId` à partager, donc aucun glissement) — il apparaît sur
     place et la surbrillance reste lisible. */
  const reduit = useReducedMotion();

  return (
    <div className="mt-14 grid grid-cols-1 sm:grid-cols-3">
      {portes.map((porte, i) => (
        <Link
          key={porte.nom}
          href={porte.lien.href}
          className="group relative block h-full w-full p-2"
          onMouseEnter={() => setSurvolee(i)}
          onMouseLeave={() => setSurvolee(null)}
          onFocus={() => setSurvolee(i)}
          onBlur={() => setSurvolee(null)}
        >
          <AnimatePresence>
            {survolee === i && (
              <motion.span
                aria-hidden
                layoutId={reduit ? undefined : "porte-surbrillance"}
                className="absolute inset-0 z-0 block rounded-[24px] bg-[#f1f0ed]"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1, transition: { duration: 0.15 } }}
                exit={{ opacity: 0, transition: { duration: 0.15, delay: 0.2 } }}
              />
            )}
          </AnimatePresence>

          <div className="o-card-soft relative z-10 flex h-full flex-col p-7 transition-[background-color,box-shadow] duration-200 group-hover:bg-white">
            <span className="text-[16px] font-semibold tracking-[-0.02em] text-[#09090b]">
              {porte.nom}
            </span>
            <p className="mt-4 text-[15px] font-semibold leading-[23px] text-[#18181b]">
              {porte.objectif}
            </p>
            <p className="o-small mt-2 flex-1 !text-[15px] !leading-[23px] !text-[#52525b]">
              {porte.texte}
            </p>
            <span className="o-link mt-6 !text-[14px]">
              {porte.lien.label}
              <Chevron taille={12} />
            </span>
          </div>
        </Link>
      ))}
    </div>
  );
}
