"use client";
/* La barre du site Tamila — port de l'en-tête du site source
   (dossier-omega/cabinetos-site/src/components/navbar.tsx) : collante,
   64 px, fond blanc à 80 % flouté, colonne de 1280 px en px-4 / md:px-12 ;
   signe seul sous lg, lockup au-delà ; quatre entrées ; bouton de couleur
   à droite — le bleu de la source est devenu le vert de Tamila sur la
   page (avocats.css, --avocats-marque), le bouton le suit. Volet latéral
   sous lg. */
import Link from "next/link";
import { Glyphe } from "@/components/secteurs/avocats/marque";
import { Lockup, LienSection, Panneau, type Entree } from "./communs";

const ENTREES: Entree[] = [
  { label: "Fonctionnalités", id: "fonctionnalites" },
  { label: "Point du matin", id: "point-du-matin" },
  { label: "Secret professionnel", id: "secret" },
  { label: "Formules", id: "formules" },
];
const CTA = { label: "Réserver un audit", id: "audit" };
const BOUTON =
  "inline-flex h-9 items-center justify-center whitespace-nowrap rounded-md border border-[#193a29] bg-[#193a29] px-4 text-sm font-medium text-white transition-colors hover:bg-[#143021]";

function Accueil({ complet = false }: { complet?: boolean }) {
  return (
    <Link href="/" className="flex items-center gap-2 text-[#171717]" aria-label="Tamila, accueil">
      {complet ? null : <Glyphe className="lg:hidden" />}
      <Lockup src="/logos/tamila-lockup.png" ratio="1200 / 293" className={complet ? "h-6" : "hidden h-7 lg:inline-block"} label="Tamila" />
    </Link>
  );
}

export default function BarreTamila() {
  return (
    <header className="sticky top-0 z-50 h-16 w-full bg-white/80 backdrop-blur-sm" style={{ viewTransitionName: "site-header" }}>
      <div className="mx-auto h-full w-full px-4 md:px-12 lg:max-w-[1280px]">
        <div className="flex h-full items-center justify-between">
          <Accueil />
          <nav aria-label="Principal" className="hidden items-center gap-4 lg:flex">
            <ul className="flex items-center gap-8">
              {ENTREES.map((l) => (
                <li key={l.id} className="text-sm font-medium">
                  <LienSection id={l.id} className="text-[#171717] transition-colors hover:text-[#737373]">
                    {l.label}
                  </LienSection>
                </li>
              ))}
            </ul>
          </nav>
          <div className="flex items-center gap-4">
            <LienSection id={CTA.id} className={`hidden lg:inline-flex ${BOUTON}`}>
              {CTA.label}
            </LienSection>
            <div className="lg:hidden">
              <Panneau marque={<Accueil complet />} entrees={ENTREES} cta={CTA} />
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
