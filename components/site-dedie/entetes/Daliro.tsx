"use client";
/* La barre du site Daliro — port de l'en-tête du site source
   (dossier-omega/chantieros-site/src/components/nav.tsx, gabarit Vertex) :
   barre collante de 64 px, colonne max-w-6xl, logo à gauche, entrées au
   centre, loupe + Connexion + bouton noir à droite ; panneau latéral sous
   md. Les menus à panneau « Produit » et « Métiers » de la source listaient
   des pages qui n'existent pas ici : ce sont des ancres vers les sections.
   La bascule de thème ne vient pas (la page n'a pas de sombre, règle 4 de
   app/secteurs/btp/page.tsx). Jetons de la source : fond #fff, texte
   #171717, atténué #737373, filet #e6e6e6 (btp.css). */
import Link from "next/link";
import { Search } from "lucide-react";
import { Lockup, LienSection, Panneau, type Entree } from "./communs";

const ENTREES: Entree[] = [
  { label: "Produit", id: "features" },
  { label: "Métiers", id: "testimonials" },
  { label: "Formules", id: "pricing" },
  { label: "Questions", id: "faq" },
];
const CTA = { label: "Réserver un audit", id: "audit" };

const ENTREE =
  "group inline-flex h-8 w-max items-center justify-center rounded-md px-4 py-1 text-sm font-medium text-[#737373] transition-colors hover:bg-[#171717]/5 hover:text-[#171717] focus-visible:bg-[#171717]/5 focus-visible:text-[#171717] outline-none";
const BOUTON_ICONE = "inline-flex size-9 shrink-0 items-center justify-center rounded-md text-[#171717] transition-colors hover:bg-[#f5f5f5]";
const DEMARRER =
  "inline-flex h-8 items-center justify-center gap-2 whitespace-nowrap rounded-md border-[0.5px] border-white/10 bg-[#171717] px-3 text-xs font-medium text-white shadow-md shadow-black/15 ring-1 ring-black/15 transition-all hover:bg-[#171717]/90";
const CONNEXION = "hidden h-8 items-center rounded-md px-3 text-xs font-medium text-[#737373] transition-colors hover:text-[#171717] sm:inline-flex";

function Accueil() {
  return (
    <Link aria-label="Daliro, accueil" className="flex h-10 items-center text-[#171717]" href="/">
      <Lockup src="/logos/daliro-lockup.png" ratio="1200 / 326" className="h-8" label="Daliro" />
    </Link>
  );
}

export default function BarreDaliro() {
  return (
    <header className="sticky top-0 z-50 w-full border-b border-[#e6e6e6]/60 bg-white" style={{ viewTransitionName: "site-header" }}>
      <nav aria-label="Principal" className="hidden w-full md:block">
        <div className="mx-auto flex h-16 max-w-6xl items-center gap-3 px-4">
          <Accueil />
          <div className="flex flex-1 justify-center">
            <ul className="flex list-none items-center gap-1">
              {ENTREES.map((l) => (
                <li key={l.id}>
                  <LienSection id={l.id} className={ENTREE}>
                    {l.label}
                  </LienSection>
                </li>
              ))}
            </ul>
          </div>
          <div className="flex items-center gap-1">
            <LienSection id="faq" className={BOUTON_ICONE}>
              <Search className="size-4" aria-hidden="true" />
              <span className="sr-only">Chercher dans les questions</span>
            </LienSection>
            <div className="ml-1 flex items-center gap-2">
              <Link className={CONNEXION} href="/espace2/daliro">
                Connexion
              </Link>
              <LienSection id={CTA.id} className={DEMARRER}>
                {CTA.label}
              </LienSection>
            </div>
          </div>
        </div>
      </nav>
      <div className="flex h-16 items-center justify-between px-4 md:hidden">
        <Accueil />
        <div className="flex items-center gap-1">
          <LienSection id="faq" className={BOUTON_ICONE}>
            <Search className="size-4" aria-hidden="true" />
            <span className="sr-only">Chercher dans les questions</span>
          </LienSection>
          <Panneau marque={<Accueil />} entrees={ENTREES} cta={CTA} classeBouton={BOUTON_ICONE} />
        </div>
      </div>
    </header>
  );
}
