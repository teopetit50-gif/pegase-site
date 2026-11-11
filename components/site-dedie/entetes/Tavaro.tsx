"use client";
/* La barre du site Tavaro — port de l'en-tête du site source
   (dossier-omega/rentalos-site/src/components/navbar.tsx) : collante,
   filet bas, fond de page ; les entrées à gauche en capitales précédées
   d'une barre oblique, filetées entre elles dès xl ; le lockup centré, en
   grand ; le bouton marine en capitales à droite ; sous xl, une barre
   oblique ouvre le menu. L'en-tête porte `p-location` pour lire les
   polices et le cadre de la page (location.css : .f-onest, .f-syne,
   .page-container). Échelle de la source : py-12 = 12 px, px-16 = 16 px. */
import Link from "next/link";
import { Marque } from "@/components/secteurs/location/marque";
import { LienSection, Panneau, type Entree } from "./communs";

const ENTREES: Entree[] = [
  { label: "Modules", id: "moteurs" },
  { label: "Solutions", id: "solutions" },
  { label: "Méthode", id: "methode" },
  { label: "À propos", id: "a-propos" },
];
const CTA = { label: "Réserver un audit", id: "audit" };
const LIEN = "block whitespace-nowrap font-normal uppercase tracking-wide transition-opacity hover:opacity-60";

function Accueil({ className = "" }: { className?: string }) {
  return (
    <Link aria-label="Tavaro, accueil" className={`flex items-center text-[#0b0b0d] ${className}`} href="/">
      <Marque className="text-[20px] md:text-[22px]" />
    </Link>
  );
}

export default function BarreTavaro() {
  return (
    <header className="p-location sticky top-0 z-50 w-full border-b border-black/10 bg-[var(--page-bg-color,#ffffff)]" style={{ viewTransitionName: "site-header" }}>
      <nav aria-label="Principal" className="f-onest">
        <div className="page-container wide">
          <div className="relative flex items-center gap-[16px] py-[12px] md:gap-[24px] md:py-[14px]">
            <ul className="hidden min-w-0 flex-1 items-center justify-start gap-[4px] text-[13px] xl:flex xl:text-[14px] 2xl:gap-[6px]">
              {ENTREES.map((l) => (
                <li key={l.id} className="shrink-0 xl:border-l xl:border-black/10">
                  <LienSection id={l.id} className={`${LIEN} xl:pl-[8px] xl:pr-[4px] 2xl:pl-[12px] 2xl:pr-[8px]`}>
                    <span aria-hidden="true">/ </span>
                    {l.label}
                  </LienSection>
                </li>
              ))}
            </ul>
            <div className="pointer-events-none absolute inset-y-0 left-1/2 z-10 flex -translate-x-1/2 items-center">
              <Accueil className="pointer-events-auto relative z-10 h-[32px] justify-center md:h-[40px]" />
            </div>
            <div className="ml-auto hidden items-center xl:flex">
              <LienSection
                id={CTA.id}
                className="f-syne inline-flex items-center justify-center rounded-[8px] border border-black/10 bg-[#1E3A8A] px-[16px] py-[10px] text-[13px] uppercase text-white transition-colors hover:bg-[#172A66]"
              >
                {CTA.label}
              </LienSection>
            </div>
            <div className="ml-auto flex items-center xl:hidden">
              <Panneau
                marque={<Accueil className="h-[32px]" />}
                entrees={ENTREES}
                cta={CTA}
                classeBouton="flex aspect-square min-w-[40px] items-center justify-center text-[22px] transition-transform active:scale-75"
              />
            </div>
          </div>
        </div>
      </nav>
    </header>
  );
}
