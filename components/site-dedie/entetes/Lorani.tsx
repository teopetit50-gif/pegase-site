"use client";
/* ══════════════════════════════════════════════════════════════════════
   La barre du site Lorani — la « Resizable Navbar » d'Aceternity (11/11/2026)

   La première barre portait l'en-tête Tailark du site source : flottante
   à 30 px des bords, filets haut et bas, fond translucide flouté dès qu'on
   défile. Teo, sur capture (le texte du héros lisible à travers) :
   « j'aime pas la barre du haut, change-la, trouve-en une autre ». Celle-ci
   est le port du bloc `aceternity/resizable-navbar` de la bibliothèque
   (composants/navigation/aceternity__resizable-navbar) : en haut de page,
   une barre pleine largeur ; passé 100 px de défilement, elle se RESSERRE
   en une pilule centrée (ressort motion), avec l'ombre à six couches du
   modèle, un fond blanc flouté et un peu de marge au-dessus. Les entrées
   sont au centre, une pilule grise suit la souris (layoutId) ; à droite,
   « Voir la démo » et le bouton étoilé de la page. Sous xl, la barre
   mobile du modèle : logo, bouton menu, volet blanc à ombre sous la barre.

   Ce qui change : la barre du haut est BLANCHE, pas transparente (plus
   rien ne se lit à travers) ; les entrées sont les sections de la page
   (défilement doux de LienSection, communs.tsx) ; la pilule est à 88 % de
   la largeur (1280 px au plus), pas 40 % : sept entrées, deux boutons et
   le logo n'entrent pas dans moins, en flex plutôt qu'en absolu centré.
   11/11, Teo, sur capture : « quand elle se déplie, elle se colle en
   haut, faut que ce soit flottant » — la pilule descend à 24 px du haut
   et se resserre à 84 % (entre 1130 et 1240 px), franchement détachée. L'en-tête reste de hauteur nulle et collant : la barre
   flotte sur le héros, qui garde sa hauteur « écran moins 72 px »
   (architectes/Heros.tsx). Jetons : fond #fff, texte #0a0a0a, atténué
   #737373, filet #e5e5e5 (architectes.css).
   ══════════════════════════════════════════════════════════════════════ */
import { useState, type MouseEvent } from "react";
import Link from "next/link";
import { Menu, X } from "lucide-react";
import { AnimatePresence, motion, useMotionValueEvent, useScroll } from "motion/react";
import StarButton from "@/components/secteurs/architectes/bouton-etoile";
import { LienSection, Lockup, allerALaSection, type Entree } from "./communs";

const ENTREES: Entree[] = [
  { label: "Produit", id: "product" },
  { label: "Fonctionnement", id: "how-it-works" },
  { label: "Le dossier", id: "channels" },
  { label: "Fonctionnalités", id: "features" },
  { label: "Métiers", id: "testimonials" },
  { label: "Formules", id: "pricing" },
  { label: "Questions", id: "faqs" },
];
const CTA = { label: "Réserver un audit", id: "audit" };

/* l'ombre à six couches du modèle, sur la pilule et sur le volet mobile */
const OMBRE =
  "0 0 24px rgba(34, 42, 53, 0.06), 0 1px 1px rgba(0, 0, 0, 0.05), 0 0 0 1px rgba(34, 42, 53, 0.04), 0 0 4px rgba(34, 42, 53, 0.08), 0 16px 68px rgba(47, 48, 55, 0.05), 0 1px 0 rgba(255, 255, 255, 0.1) inset";
const RESSORT = { type: "spring" as const, stiffness: 200, damping: 50 };

const DEMO =
  "inline-flex h-[34px] items-center justify-center whitespace-nowrap rounded-full bg-white px-3 text-[0.8rem] font-medium text-[#303030] shadow-sm shadow-black/30 ring-1 ring-[#e5e5e5] transition-colors hover:bg-[#f5f5f5]";

function Accueil() {
  return (
    <Link aria-label="Lorani, accueil" className="relative z-20 flex items-center text-[#0a0a0a]" href="/">
      <Lockup src="/logos/lorani-lockup.png" ratio="1200 / 325" className="h-6" label="Lorani" />
    </Link>
  );
}

export default function BarreLorani() {
  const { scrollY } = useScroll();
  const [flotte, setFlotte] = useState(false);
  const [survol, setSurvol] = useState<string | null>(null);
  const [ouvert, setOuvert] = useState(false);
  useMotionValueEvent(scrollY, "change", (y) => setFlotte(y > 100));

  const aller = (e: MouseEvent<HTMLAnchorElement>, id: string) => {
    setOuvert(false);
    allerALaSection(e, id);
  };

  return (
    <header className="sticky top-0 z-50 h-0 w-full overflow-visible" style={{ viewTransitionName: "site-header" }}>
      {/* ——— bureau : la barre, puis la pilule ——— */}
      <motion.nav
        aria-label="Principal"
        animate={{
          /* 11/11, Teo : « quand on remonte tout en haut, ça reste collé en haut, ça reste pas flottant » — la
             pilule flotte dès le haut de page (92 %, 20 px du bord) et se resserre un peu au défilement (84 %, 24 px) */
          width: flotte ? "84%" : "92%",
          y: flotte ? 24 : 20,
          borderRadius: 9999,
          boxShadow: OMBRE,
          backdropFilter: "blur(10px)",
          /* 12/11, Teo, sur capture : « ça passe de long à court d'un coup, pas de sensation de fluidité » — sur un grand
             écran c'est ce plafond qui borne la barre, pas le pourcentage ; posé dans style, il sautait sans animation.
             Animé ici, la barre s'étire et se resserre vraiment, au même ressort que la largeur et la hauteur */
          maxWidth: flotte ? 1240 : 1400,
        }}
        transition={RESSORT}
        /* 11/11, Teo : « quand elle se déplie, elle se colle en haut, faut que ce soit flottant » — 24 px du haut,
           84 % de large entre 1130 px (sept entrées, deux boutons et le logo côte à côte, dès xl) et 1240 px */
        style={{ minWidth: 1130 }}
        className="relative z-[60] mx-auto hidden flex-row items-center justify-between rounded-full bg-white/95 px-5 py-2 ring-1 ring-black/[0.06] xl:flex"
      >
        <Accueil />
        <div
          onMouseLeave={() => setSurvol(null)}
          className="flex flex-1 flex-row items-center justify-center space-x-1 text-sm font-medium text-[#737373]"
        >
          {ENTREES.map((l) => (
            <a
              key={l.id}
              href={`/#${l.id}`}
              onMouseEnter={() => setSurvol(l.id)}
              onClick={(e) => aller(e, l.id)}
              className="relative px-3 py-2 transition-colors duration-200 hover:text-[#0a0a0a] 2xl:px-4"
            >
              {survol === l.id ? <motion.span layoutId="lorani-survol" className="absolute inset-0 h-full w-full rounded-full bg-[#f3f3f3]" /> : null}
              <span className="relative z-20">{l.label}</span>
            </a>
          ))}
        </div>
        <div className="relative z-20 flex items-center gap-3">
          <LienSection id="product" onClick={() => setOuvert(false)} className={DEMO}>
            Voir la démo
          </LienSection>
          {/* la lueur du bouton (architectes.css, .architectes-star-btn) est bornée à .p-architectes ; cette peau pose
              aussi 100vw et un fond, qu'on annule ici en ligne */}
          <span className="p-architectes inline-flex" style={{ width: "auto", marginInline: 0, background: "transparent" }}>
            <StarButton href={`/#${CTA.id}`} className="h-[34px]" onClick={(e) => aller(e, CTA.id)}>
              {CTA.label}
            </StarButton>
          </span>
        </div>
      </motion.nav>

      {/* ——— mobile et tablette : la barre du modèle, le volet dessous ——— */}
      <motion.div
        animate={{
          width: flotte ? "90%" : "94%",
          y: flotte ? 16 : 12,
          borderRadius: 12,
          boxShadow: OMBRE,
          backdropFilter: "blur(10px)",
        }}
        transition={RESSORT}
        className="relative z-50 mx-auto flex w-full flex-col items-center justify-between rounded-xl bg-white/95 px-4 py-3 ring-1 ring-black/[0.06] xl:hidden"
      >
        <div className="flex w-full flex-row items-center justify-between">
          <Accueil />
          <button
            type="button"
            aria-label={ouvert ? "Fermer le menu" : "Ouvrir le menu"}
            aria-expanded={ouvert}
            onClick={() => setOuvert((o) => !o)}
            className="inline-flex size-9 items-center justify-center rounded-md text-[#0a0a0a]"
          >
            {ouvert ? <X className="size-5" /> : <Menu className="size-5" />}
          </button>
        </div>
        <AnimatePresence>
          {ouvert ? (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              style={{ boxShadow: OMBRE }}
              className="absolute inset-x-0 top-16 z-50 flex w-full flex-col items-start justify-start gap-4 rounded-lg bg-white px-4 py-8"
            >
              {ENTREES.map((l) => (
                <a key={l.id} href={`/#${l.id}`} onClick={(e) => aller(e, l.id)} className="block w-full text-base text-[#0a0a0a]">
                  {l.label}
                </a>
              ))}
              <div className="flex w-full flex-col gap-3 pt-2">
                <LienSection id="product" onClick={() => setOuvert(false)} className={`${DEMO} w-full`}>
                  Voir la démo
                </LienSection>
                <span className="p-architectes flex" style={{ width: "auto", marginInline: 0, background: "transparent" }}>
                  <StarButton href={`/#${CTA.id}`} className="h-[34px] w-full" onClick={(e) => aller(e, CTA.id)}>
                    {CTA.label}
                  </StarButton>
                </span>
              </div>
            </motion.div>
          ) : null}
        </AnimatePresence>
      </motion.div>
    </header>
  );
}
