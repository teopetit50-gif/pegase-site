"use client";
/* ══════════════════════════════════════════════════════════════════════
   Tamila (cabinets d'avocats) — Formules.tsx

   COPIÉ le 24/09/2026 à 13 h 37 de `OMEGA/cabinetos-site/src/components/
   formules.tsx`. Bascule, deux cartes, liseré bleu et lueur de la formule
   conseillée, liste animée : inchangés.

   AUCUN PRIX (règle maison) : la source l'avait déjà fait — le compteur
   animé de la référence y est devenu « Sur audit », et la bascule
   mensuel/annuel choisit la porte d'entrée (contentieux ou dommage
   corporel). Même traitement que les formules de Daliro.

   CONVERSIONS (règle 3, jetons CLAIRS) : `border-foreground/10` →
   `border-[#171717]/10` · `text-foreground` → `text-[#171717]` ·
   `text-muted-foreground` → `text-[#737373]` · `ring-ring` →
   `ring-[#171717]` · `text-accent-foreground/80` → `text-[#171717]/80` ·
   `font-subheading italic` → `avocats-accent italic`. `bg-background/`
   (suffixe d'opacité vide) ne produisait aucune règle dans la source :
   retiré.

   MONDE BLANC :
   · Le bouton de la formule « Pré-lecture » (variante `white`) était blanc
     sur le noir ; il est encre sur le blanc (bouton.tsx). Celui de la
     formule conseillée reste bleu, son liseré `border-blue-500` aussi.
   · La lueur oblique `bg-blue-600` derrière la formule conseillée →
     `bg-blue-300`.
   · La bascule reste bleue, son curseur blanc.
   24/09 AU SOIR (registre d'un cabinet, avocats.css) : le bleu devient le
   vert de Tamila (#193a29) — bascule, liseré et bouton de la formule
   conseillée (variante `marque`, bouton.tsx) ; la lueur oblique est
   retirée ; le h2 et le prix « Sur audit » passent en serif.

   LIENS (règle 6) : « Soumettre un dossier » et « Réserver un audit » →
   /reserver-un-audit (textes.ts), en <Link> dans `Button asChild`, comme
   la source. Ancre : `scroll-mt-16 sm:scroll-mt-[72px]` (entête d'Omega).
   ══════════════════════════════════════════════════════════════════════ */

import { useState } from "react";
import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";
import { Check } from "lucide-react";
import AnimationContainer from "./apparition";
import { Button } from "./bouton";
import { CONTACT, FORMULES } from "./textes";
import { cn } from "@/lib/cn";

type Mode = "Contentieux" | "Dommage corporel";

/* Tarifs de la référence (module 6694) : bascule, deux cartes, la seconde liserée de bleu avec sa lueur.
   Écarts assumés : aucun prix public (règle maison) — le chiffre animé devient « Sur audit » ; la bascule
   mensuel/annuel, qui n'aurait plus rien à basculer, choisit la porte d'entrée (contentieux ou dommage
   corporel) et change la liste de ce qui est inclus. */
export default function Formules() {
  const [mode, setMode] = useState<Mode>("Contentieux");
  const [a, b] = FORMULES.bascule as [Mode, Mode];
  return (
    <div id="formules" className="relative flex flex-col items-center justify-center max-w-5xl py-20 mx-auto scroll-mt-16 sm:scroll-mt-[72px]">
      <div className="flex flex-col items-center justify-center max-w-2xl mx-auto">
        <AnimationContainer>
          <div className="flex flex-col items-center text-center max-w-2xl mx-auto">
            <h2 className="text-2xl md:text-4xl lg:text-5xl font-medium leading-[1.15]! mt-6">
              {FORMULES.titreAvant} <br className="hidden lg:block" /> <span className="avocats-accent italic">{FORMULES.titreMot}</span>
            </h2>
            <p className="text-base md:text-lg text-center text-[#171717]/80 mt-6">{FORMULES.texte}</p>
          </div>
        </AnimationContainer>
        <AnimationContainer delay={0.2}>
          <div className="flex items-center justify-center space-x-4 mt-6">
            <span className="text-base font-medium">{a}</span>
            <button
              type="button"
              role="switch"
              aria-checked={mode === b}
              aria-label={`Afficher la formule ${mode === a ? b : a}`}
              onClick={() => setMode((m) => (m === a ? b : a))}
              className="relative rounded-full focus:outline-none focus-visible:ring-2 focus-visible:ring-[#171717]"
            >
              <div className="w-12 h-6 transition rounded-full shadow-md outline-none bg-[#193a29]" />
              <div className={cn("absolute inline-flex items-center justify-center w-4 h-4 transition-all duration-500 ease-in-out top-1 left-1 rounded-full bg-white", mode === b ? "translate-x-6" : "translate-x-0")} />
            </button>
            <span className="text-base font-medium">{b}</span>
          </div>
        </AnimationContainer>
      </div>
      <div className="grid w-full grid-cols-1 lg:grid-cols-2 pt-8 lg:pt-12 gap-4 lg:gap-6 max-w-4xl mx-auto">
        {FORMULES.plans.map((plan, r) => {
          const vedette = plan.id === "cabinet";
          return (
            <AnimationContainer key={plan.id} delay={0.1 * r + 0.2}>
              <div className={cn("flex flex-col relative rounded-2xl lg:rounded-3xl transition-all items-start w-full border border-[#171717]/10 overflow-hidden", vedette && "border-[#193a29] bg-[#ffffff]")}>
                <div className="p-4 md:p-8 flex rounded-t-2xl lg:rounded-t-3xl flex-col items-start w-full relative">
                  <h3 className="font-medium text-xl text-[#171717] pt-5">{plan.titre}</h3>
                  {/* py 0,25em : la hauteur du compteur NumberFlow de la référence (48 → 72 px, 30 → 45 px) */}
                  <p className="mt-3 text-3xl md:text-5xl leading-none py-[0.25em] avocats-serif">{plan.prix}</p>
                  <p className="text-sm md:text-base text-[#6f6a62] mt-2">{plan.desc}</p>
                </div>
                <div className="flex flex-col items-start w-full px-4 py-2 md:px-8">
                  <Button asChild size="lg" variant={vedette ? "marque" : "white"} className="w-full">
                    <Link href={CONTACT.audit}>{plan.bouton}</Link>
                  </Button>
                  <div className="h-8 overflow-hidden w-full mx-auto">
                    <AnimatePresence mode="wait">
                      <motion.span
                        key={mode}
                        initial={{ y: 20, opacity: 0 }}
                        animate={{ y: 0, opacity: 1 }}
                        exit={{ y: -20, opacity: 0 }}
                        transition={{ duration: 0.2, ease: "easeOut" }}
                        className="text-sm text-center text-[#6f6a62] mt-3 mx-auto block"
                      >
                        {plan.note[mode]}
                      </motion.span>
                    </AnimatePresence>
                  </div>
                </div>
                <div className="flex flex-col items-start w-full p-5 mb-4 ml-1 gap-y-2">
                  <span className="text-base text-left mb-2">Inclus :</span>
                  {plan.inclut[mode].map((f) => (
                    <div key={f} className="flex items-center justify-start gap-2">
                      <div className="flex items-center justify-center">
                        <Check className="size-5" aria-hidden="true" />
                      </div>
                      <span>{f}</span>
                    </div>
                  ))}
                </div>
              </div>
            </AnimationContainer>
          );
        })}
      </div>
    </div>
  );
}
