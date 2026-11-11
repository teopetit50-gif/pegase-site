"use client";
/* La barre du site Varelo. Pas de site source à reprendre (la page
   /secteurs/groupes est la v2 dessinée sur concurrence.com ;
   code/hors-git/varelo ne contient que le SQL) : la barre reprend les
   jetons de la page (groupes.css : fond #fff, filet #dcdce0, texte
   #0b0b0d, atténué #55555c, étiquettes en mono) — lockup à gauche, trois
   entrées en mono capitales vers ses sections (page.tsx pose les ancres
   principe, produit, questions), bouton noir à droite. */
import Link from "next/link";
import { Lockup, LienSection, Panneau, type Entree } from "./communs";

const ENTREES: Entree[] = [
  { label: "Le principe", id: "principe" },
  { label: "Le produit", id: "produit" },
  { label: "Questions", id: "questions" },
];
const CTA = { label: "Réserver un audit", id: "audit" };
const MONO = { fontFamily: "var(--font-omega-mono), ui-monospace, SFMono-Regular, Menlo, monospace" };

function Accueil() {
  return (
    <Link href="/" aria-label="Varelo, accueil" className="flex items-center text-[#0b0b0d]">
      <Lockup src="/logos/varelo-lockup.png" ratio="1200 / 306" className="h-6" label="Varelo" />
    </Link>
  );
}

export default function BarreVarelo() {
  return (
    <header className="sticky top-0 z-50 w-full border-b border-[#dcdce0] bg-white" style={{ viewTransitionName: "site-header" }}>
      <div className="mx-auto flex h-16 max-w-[1280px] items-center justify-between px-5 sm:px-8">
        <Accueil />
        <nav aria-label="Principal" className="hidden items-center gap-7 md:flex" style={MONO}>
          {ENTREES.map((l) => (
            <LienSection key={l.id} id={l.id} className="text-[12px] uppercase tracking-[0.08em] text-[#55555c] transition-colors hover:text-[#0b0b0d]">
              {l.label}
            </LienSection>
          ))}
        </nav>
        <div className="flex items-center gap-2">
          <LienSection
            id={CTA.id}
            className="hidden h-9 items-center justify-center gap-1 rounded-[6px] bg-[#000000] px-4 text-[13px] font-medium text-white transition-colors hover:bg-[#2a2a2e] md:inline-flex"
          >
            {CTA.label} <b aria-hidden="true">↗</b>
          </LienSection>
          <div className="md:hidden">
            <Panneau marque={<Accueil />} entrees={ENTREES} cta={CTA} />
          </div>
        </div>
      </div>
    </header>
  );
}
