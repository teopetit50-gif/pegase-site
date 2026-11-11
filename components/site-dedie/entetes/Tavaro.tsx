"use client";
/* ══════════════════════════════════════════════════════════════════════
   La barre du site Tavaro — la « Floating Navbar » d'Aceternity (11/11/2026)

   La première barre portait l'en-tête du site source (rentalos-site) :
   entrées en capitales à gauche, le lockup au centre en grand, le bouton
   marine à droite. Teo, sur capture : « j'aime pas non plus celle de
   Tavaro, trouve-en une autre, mais dans le même design que le SaaS ».
   Celle-ci est le port du bloc `aceternity/floating-navbar` de la
   bibliothèque (composants/navigation/aceternity__floating-navbar) : une
   PILULE flottante centrée, fond blanc flouté, filet et ombre, qui se
   cache quand on descend et revient quand on remonte (0,2 s).

   Dans le design de la page (location.css) : le lockup Tavaro à gauche
   de la pilule, les quatre entrées en capitales espacées dans la police
   des titres (f-syne), un filet, le bouton marine (--accent #1e3a8a,
   --accent-hover) en pilule. Ce qui change encore : la pilule est
   VISIBLE en haut de page (le modèle ne la montre qu'après 5 % de
   défilement, ce qui laisserait la page sans barre) ; les entrées sont
   les sections de la page (défilement doux, LienSection) ; sous md, la
   pilule n'a que le lockup et un bouton menu, le volet blanc s'ouvre
   dessous. L'en-tête est fixé : une cale blanche rend au héros la
   hauteur de l'ancienne barre.
   ══════════════════════════════════════════════════════════════════════ */
import { useState } from "react";
import Link from "next/link";
import { Menu, X } from "lucide-react";
import { AnimatePresence, motion, useMotionValueEvent, useScroll } from "motion/react";
import { Marque } from "@/components/secteurs/location/marque";
import { LienSection, type Entree } from "./communs";

const ENTREES: Entree[] = [
  { label: "Modules", id: "moteurs" },
  { label: "Solutions", id: "solutions" },
  { label: "Méthode", id: "methode" },
  { label: "À propos", id: "a-propos" },
];
const CTA = { label: "Réserver un audit", id: "audit" };

const ENTREE =
  "f-syne relative flex items-center rounded-full px-3 py-2 text-[12px] uppercase tracking-[0.08em] text-[#687170] transition-colors hover:bg-[#f1f2f2] hover:text-[#111312] xl:px-4";
/* sans `inline-flex` : l'appelant pose l'affichage (caché sous md dans la pilule, pleine largeur dans le volet) */
const BOUTON =
  "f-syne items-center justify-center rounded-full bg-[#1e3a8a] px-4 py-2 text-[12px] uppercase tracking-[0.08em] text-white transition-all hover:bg-[#172a66] hover:shadow-lg hover:shadow-[#1e3a8a]/20";

function Accueil() {
  return (
    <Link aria-label="Tavaro, accueil" className="flex items-center px-2 text-[#111312]" href="/">
      <Marque className="text-[17px]" />
    </Link>
  );
}

export default function BarreTavaro() {
  const { scrollY } = useScroll();
  const [visible, setVisible] = useState(true);
  const [ouvert, setOuvert] = useState(false);
  useMotionValueEvent(scrollY, "change", (y) => {
    const avant = scrollY.getPrevious() ?? 0;
    if (y < 80) setVisible(true);
    else setVisible(y < avant);
  });

  return (
    <>
      <div aria-hidden className="h-[72px] w-full bg-white" />
      <header className="p-location fixed inset-x-0 top-4 z-50 flex justify-center px-4" style={{ viewTransitionName: "site-header" }}>
        <AnimatePresence mode="wait">
          <motion.nav
            aria-label="Principal"
            initial={{ opacity: 1, y: 0 }}
            animate={{ y: visible || ouvert ? 0 : -100, opacity: visible || ouvert ? 1 : 0 }}
            transition={{ duration: 0.2 }}
            className="relative flex max-w-full items-center justify-center"
          >
            <div className="flex items-center justify-center gap-2 rounded-full border border-black/10 bg-white/85 py-1.5 pl-2 pr-2 shadow-lg shadow-black/10 backdrop-blur-md">
              <Accueil />
              <div className="hidden h-5 w-px bg-[#e4e6e6] md:block" />
              <div className="hidden items-center gap-1 md:flex">
                {ENTREES.map((l) => (
                  <LienSection key={l.id} id={l.id} className={ENTREE}>
                    {l.label}
                  </LienSection>
                ))}
              </div>
              <div className="hidden h-5 w-px bg-[#e4e6e6] md:block" />
              <LienSection id={CTA.id} className={`${BOUTON} hidden md:inline-flex`}>
                {CTA.label}
              </LienSection>
              <button
                type="button"
                aria-label={ouvert ? "Fermer le menu" : "Ouvrir le menu"}
                aria-expanded={ouvert}
                onClick={() => setOuvert((o) => !o)}
                className="inline-flex size-9 items-center justify-center rounded-full text-[#111312] transition-colors hover:bg-[#f1f2f2] md:hidden"
              >
                {ouvert ? <X className="size-5" /> : <Menu className="size-5" />}
              </button>
            </div>

            {/* ——— le volet mobile, sous la pilule ——— */}
            <AnimatePresence>
              {ouvert ? (
                <motion.div
                  initial={{ opacity: 0, y: -8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  transition={{ duration: 0.2 }}
                  className="absolute left-1/2 top-full z-50 mt-3 flex w-[calc(100vw-2rem)] -translate-x-1/2 flex-col gap-1 rounded-[20px] border border-black/10 bg-white p-3 shadow-lg shadow-black/10 md:hidden"
                >
                  {ENTREES.map((l) => (
                    <LienSection key={l.id} id={l.id} onClick={() => setOuvert(false)} className={`${ENTREE} text-[13px]`}>
                      {l.label}
                    </LienSection>
                  ))}
                  <LienSection id={CTA.id} onClick={() => setOuvert(false)} className={`${BOUTON} mt-2 flex w-full`}>
                    {CTA.label}
                  </LienSection>
                </motion.div>
              ) : null}
            </AnimatePresence>
          </motion.nav>
        </AnimatePresence>
      </header>
    </>
  );
}
