"use client";
/* ══════════════════════════════════════════════════════════════════════
   Tavaro (loueurs automobiles) — Heros.tsx

   COPIÉ le 24/09/2026 à 14 h 58 de `OMEGA/rentalos-site/src/components/
   hero.tsx` (le dossier garde l'ancien nom RentalOS). Géométrie, piste
   collante et maquette inchangées.

   CONVERSIONS (source en Tailwind v3, thème dans tailwind.config.ts ;
   détail dans app/secteurs/location-automobile/location.css) :
   · échelle d'espacement EN PIXELS de la source : `px-12` valait 12 px
     (et non 3 rem) → `px-[12px]`, `py-8` → `py-[8px]`, `gap-10` →
     `gap-[10px]`, `mb-4` → `mb-[4px]`… ; `gap-3` restait sur l'échelle
     par défaut, il ne bouge pas ;
   · `text-body4/5/6`, `text-lead` → `text-[16px]/[1.5]`, `text-[14px]/[1.5]`,
     `text-[12px]/[1.5]`, `text-[clamp(18px,1.5vw,20px)]/[1.5]` ;
   · `rounded-8` → `rounded-[8px]` ; `font-ui` (Syne) → `f-syne`, la
     police de titre du site (location.css) ;
   · `bg-primary` / `hover:bg-primary-700` / `text-primary` → `#1E3A8A` /
     `#172A66` (le bleu de la marque, inchangé) ;
   · `text-[color:var(--x)]` → `text-[color:var(--x)]` : sans l'indication de
     type, la v4 peut lire la variable comme une TAILLE de texte.

   LIENS (règle 6) : « Réserver un audit » ouvrait la modale de démonstration
   de la source (`useDemo().ouvrir`) — la modale ne vient pas ; c'est un
   <Link> vers /reserver-un-audit, mêmes classes. « Voir les modules » reste
   une ancre de la page (#moteurs) : il ne déclenche rien, il fait défiler.
   ══════════════════════════════════════════════════════════════════════ */
import Link from "next/link";
import { ContainerScroll } from "./DefilementHeros";
import { FondPapier } from "./FondPapier";
import { MaquetteHero } from "./apercus/MaquetteHeros";
import { HERO } from "./textes";
import { Drapeau } from "./drapeau";

export function Hero() {
  return (
    <section id="top" aria-labelledby="home-hero-title" className="relative z-10">
      <ContainerScroll
        background={<FondPapier />}
        titleComponent={
          <div className="flex flex-col items-center gap-[30px] px-[12px] md:gap-[24px] md:px-[16px]">
            <p className="inline-flex items-center gap-[10px] rounded-full border border-black/10 bg-[var(--page-bg-color)] px-[14px] py-[8px] f-syne text-[12px]/[1.5] uppercase tracking-[0.12em] text-[color:var(--text)]">
              <Drapeau className="h-[14px] w-auto rounded-[1px]" />
              <span>{HERO.pastille}</span>
              <span aria-hidden="true" className="hidden text-[color:var(--muted)] sm:inline">·</span>
              <span className="hidden text-[color:var(--muted)] sm:inline">{HERO.pastilleSuite}</span>
            </p>
            <h1
              id="home-hero-title"
              className="f-onest flex max-w-[72rem] flex-col items-center font-normal leading-[0.98] tracking-[-0.055em]"
              style={{ fontSize: "clamp(36px, 6.1vw, 88px)" }}
            >
              <span className="block max-w-[18rem] text-balance md:max-w-full">{HERO.ligne1}</span>
              <span className="block max-w-[22rem] text-balance md:max-w-full">
                {HERO.ligne2} <span className="text-[#1E3A8A]">{HERO.accent}</span>
              </span>
            </h1>
            <p id="home-hero-lead" className="mx-auto hidden max-w-[44rem] text-[16px]/[1.5] leading-[1.5] text-[color:var(--muted)] [text-wrap:balance] sm:block md:text-[clamp(18px,1.5vw,20px)]/[1.5]">
              {HERO.chapo}
            </p>
            <p className="mx-auto max-w-[22rem] text-[16px]/[1.5] leading-[1.5] text-[color:var(--muted)] [text-wrap:balance] sm:hidden">
              {HERO.chapoCourt}
            </p>
            <div className="mb-[4px] flex w-full max-w-[22rem] flex-col items-stretch justify-center gap-3 sm:w-auto sm:max-w-none sm:flex-row md:mb-[8px]">
              <Link
                href="/reserver-un-audit"
                className="inline-flex min-h-[44px] items-center justify-center rounded-[6px] border border-black/10 bg-[#1E3A8A] px-[20px] py-[12px] text-center f-syne text-[14px]/[1.5] uppercase text-white transition-colors hover:bg-[#172A66]"
                data-cta="hero-demo"
              >
                {HERO.boutonPrincipal}
              </Link>
              <a
                href="#moteurs"
                data-cta="hero-moteurs"
                className="hidden min-h-[44px] items-center justify-center rounded-[6px] border border-black/15 bg-[var(--page-bg-color)] px-[20px] py-[12px] text-center f-syne text-[14px]/[1.5] uppercase text-[color:var(--text)] transition-colors hover:bg-black hover:text-white sm:inline-flex"
              >
                {HERO.boutonSecondaire}
              </a>
            </div>
          </div>
        }
      >
        <MaquetteHero />
      </ContainerScroll>
    </section>
  );
}
