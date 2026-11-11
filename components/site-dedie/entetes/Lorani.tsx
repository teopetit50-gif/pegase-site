"use client";
/* La barre du site Lorani — port de l'en-tête du site source
   (dossier-omega/dossieros-site/src/components/nav.tsx, « HeroHeader »
   Tailark) : une barre flottante à 30 px des bords et 10 px du haut,
   filets haut et bas, 50 px de haut dès lg, fond flouté dès qu'on défile ;
   logo à gauche, sept entrées au centre, « Voir la démo » et le bouton
   étoilé à droite. L'en-tête est de hauteur nulle et collant : la barre
   flotte sur le héros comme dans la source (`fixed`), et le héros garde
   sa hauteur « écran moins 72 px » (architectes/Heros.tsx). Jetons de la
   source : fond #fff, texte #0a0a0a, filet #e5e5e5 (architectes.css). */
import { useEffect, useState } from "react";
import Link from "next/link";
import StarButton from "@/components/secteurs/architectes/bouton-etoile";
import { Lockup, LienSection, Panneau, type Entree } from "./communs";

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

function Accueil() {
  return (
    <Link aria-label="Lorani, accueil" className="flex items-center gap-3 text-[#0a0a0a]" href="/">
      <Lockup src="/logos/lorani-lockup.png" ratio="1200 / 325" className="h-6" label="Lorani" />
    </Link>
  );
}

export default function BarreLorani() {
  const [defile, setDefile] = useState(false);
  useEffect(() => {
    const f = () => setDefile(window.scrollY > 0);
    f();
    window.addEventListener("scroll", f, { passive: true });
    return () => window.removeEventListener("scroll", f);
  }, []);
  return (
    <header className="sticky top-0 z-50 h-0 w-full overflow-visible" style={{ viewTransitionName: "site-header" }}>
      <nav
        aria-label="Principal"
        className={`absolute top-[10px] right-[30px] left-[30px] border-y border-[#e5e5e5] px-6 transition-all duration-300 lg:h-[50px] ${
          defile ? "bg-white/90 backdrop-blur-xl backdrop-saturate-150" : "bg-transparent"
        }`}
      >
        <div className="relative flex h-full items-center justify-between py-3 lg:py-0">
          <Accueil />
          <div className="absolute inset-0 m-auto size-fit max-lg:hidden">
            <ul className="flex gap-6 text-sm xl:gap-8">
              {ENTREES.map((l) => (
                <li key={l.id}>
                  <LienSection id={l.id} className="block text-[#737373] transition-colors duration-150 hover:text-[#0a0a0a]">
                    {l.label}
                  </LienSection>
                </li>
              ))}
            </ul>
          </div>
          <div className="hidden items-center gap-3 lg:flex">
            <LienSection
              id="product"
              className="inline-flex h-[34px] items-center justify-center whitespace-nowrap rounded-full bg-white px-3 text-[0.8rem] font-medium text-[#303030] shadow-sm shadow-black/30 ring-1 ring-[#e5e5e5] transition-colors hover:bg-[#fafafa]"
            >
              Voir la démo
            </LienSection>
            {/* la lueur du bouton (architectes.css, .architectes-star-btn) est bornée à .p-architectes ; cette peau pose
                aussi 100vw et un fond, qu'on annule ici en ligne */}
            <span className="p-architectes inline-flex" style={{ width: "auto", marginInline: 0, background: "transparent" }}>
              <StarButton href={`/#${CTA.id}`} className="h-[34px]">
                {CTA.label}
              </StarButton>
            </span>
          </div>
          <div className="lg:hidden">
            <Panneau marque={<Accueil />} entrees={ENTREES} cta={CTA} />
          </div>
        </div>
      </nav>
    </header>
  );
}
