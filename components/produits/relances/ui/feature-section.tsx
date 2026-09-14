"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useRef, useState } from "react";
import { cn } from "@/components/produits/relances/utils";
import { useMouvementReduit } from "@/components/produits/relances/Vivant";

/* Composant 21st.dev « feature-section », adapté.

   Quatre écarts au code d'origine :
   1. **Le visuel n'est pas une `<Image>` brute.** On passe un rendu par
      étape, ce qui laisse le panneau du site garder sa logique — capture
      claire ou sombre, étroite ou large, servie à l'échelle 1.
      Un `object-cover` à hauteur fixe rognait la capture.
   2. **Les étapes sont cliquables.** Dans l'original on ne peut que
      regarder défiler ; c'est pourtant la seule façon d'aller voir un
      écran précis.
   3. **`prefers-reduced-motion` est respecté** : plus de défilement
      automatique, la première étape reste, et on navigue au clic.
   4. **La minuterie ne se recrée plus à chaque centième.** L'original
      met `progress` dans les dépendances de l'effet, ce qui détruit et
      recrée l'intervalle vingt fois par seconde.

   RAPATRIEMENT 11/09 — couleurs converties : `hover:bg-muted/60` →
   `hover:bg-[#f5f5f5]/60`, `border-foreground bg-foreground
   text-background` → `border-[#171717] bg-[#171717] text-[#ffffff]`,
   `border-border bg-card text-muted-foreground` → `border-[#e6e6e6]
   bg-[#ffffff] text-[#737373]`, `text-foreground` → `text-[#171717]`,
   `bg-border` → `bg-[#e6e6e6]`. */

export interface Etape {
  cle: string;
  titre: string;
  texte: string;
}

export function FeatureSteps({
  etapes,
  visuel,
  intervalle = 7000,
  className,
}: {
  etapes: readonly Etape[];
  visuel: (etape: Etape, index: number) => React.ReactNode;
  intervalle?: number;
  className?: string;
}) {
  const [actif, setActif] = useState(0);
  const [avance, setAvance] = useState(0);
  const reduit = useMouvementReduit();
  const debut = useRef(0);

  useEffect(() => {
    if (reduit) return;
    debut.current = performance.now();
    /* On ne remet pas `avance` à zéro ici : un `setState` synchrone dans
       le corps d'un effet déclenche un rendu en cascade. La remise à zéro
       se fait là où le pas change — au clic et au passage automatique. */
    const horloge = setInterval(() => {
      const p = Math.min(1, (performance.now() - debut.current) / intervalle);
      if (p >= 1) {
        setAvance(0);
        setActif((a) => (a + 1) % etapes.length);
      } else {
        setAvance(p);
      }
    }, 80);
    return () => clearInterval(horloge);
  }, [actif, intervalle, etapes.length, reduit]);

  return (
    <div className={cn("w-full", className)}>
      {/* Cinquième écart : l'original coupe en deux moitiés égales. La
          capture du produit y tombe à 585 px de large sur un écran de
          1440 — elle ne se lit plus. La colonne des étapes est plafonnée,
          le visuel prend tout le reste. */}
      <div className="grid gap-8 md:grid-cols-[minmax(0,20rem)_1fr] md:items-center md:gap-10 lg:gap-14">
        <ol className="order-2 space-y-2 md:order-1">
          {etapes.map((e, i) => {
            const courant = i === actif;
            return (
              <li key={e.cle}>
                <button
                  type="button"
                  aria-current={courant ? "step" : undefined}
                  onClick={() => {
                    setAvance(0);
                    setActif(i);
                  }}
                  className="group flex w-full items-start gap-4 rounded-xl px-3 py-3 text-left transition-colors hover:bg-[#f5f5f5]/60"
                >
                  <span
                    className={cn(
                      "mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-full border font-mono text-sm transition-colors",
                      courant
                        ? "border-[#171717] bg-[#171717] text-[#ffffff]"
                        : "border-[#e6e6e6] bg-[#ffffff] text-[#737373]",
                    )}
                  >
                    {i + 1}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span
                      className={cn(
                        "block font-semibold text-base transition-colors",
                        courant ? "text-[#171717]" : "text-[#737373]",
                      )}
                    >
                      {e.titre}
                    </span>
                    <span className="mt-0.5 block text-[#737373] text-sm leading-relaxed">
                      {e.texte}
                    </span>
                    {/* Le fil du temps sous l'étape en cours. */}
                    <span className="mt-2 block h-px w-full overflow-hidden bg-[#e6e6e6]">
                      <span
                        className="block h-full bg-[#171717]"
                        style={{
                          width: courant ? `${(reduit ? 1 : avance) * 100}%` : "0%",
                          transition: "width 80ms linear",
                        }}
                      />
                    </span>
                  </span>
                </button>
              </li>
            );
          })}
        </ol>

        <div className="order-1 md:order-2">
          <AnimatePresence mode="wait">
            <motion.div
              key={etapes[actif].cle}
              initial={reduit ? false : { y: 24, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={reduit ? undefined : { y: -24, opacity: 0 }}
              transition={{ duration: 0.4, ease: "easeInOut" }}
            >
              {visuel(etapes[actif], actif)}
            </motion.div>
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
