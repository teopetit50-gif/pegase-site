"use client";
/* La barre du site Daliro — port de l'en-tête du site source
   (dossier-omega/chantieros-site/src/components/nav.tsx, gabarit Vertex) :
   barre collante de 64 px, colonne max-w-6xl, logo à gauche, entrées au
   centre ; panneau latéral sous md. Les menus à panneau « Produit » et
   « Métiers » de la source listaient des pages qui n'existent pas ici : ce
   sont des ancres vers les sections. La bascule de thème ne vient pas (la
   page n'a pas de sombre, règle 4 de app/secteurs/btp/page.tsx). Jetons de
   la source : fond #fff, texte #171717, atténué #737373, filet #e6e6e6
   (btp.css).

   11/11/2026 — Teo : « pourquoi il y a encore ça ? C'est pas censé être
   là… il est censé avoir écrit Réserver un audit, une des sections
   proposées dans la barre du haut. Et Connexion, ça disparaît aussi. » La
   loupe, le lien Connexion et le bouton noir de la source sont retirés :
   la barre n'a plus que le logo et cinq entrées, la dernière menant à la
   section #audit. Le panneau mobile suit (Panneau sans `cta`). */
import Link from "next/link";
import { Lockup, LienSection, Panneau, type Entree } from "./communs";

const ENTREES: Entree[] = [
  { label: "Produit", id: "features" },
  { label: "Métiers", id: "testimonials" },
  { label: "Formules", id: "pricing" },
  { label: "Questions", id: "faq" },
  { label: "Réserver un audit", id: "audit" },
];

const ENTREE =
  "group inline-flex h-8 w-max items-center justify-center rounded-md px-4 py-1 text-sm font-medium text-[#737373] transition-colors hover:bg-[#171717]/5 hover:text-[#171717] focus-visible:bg-[#171717]/5 focus-visible:text-[#171717] outline-none";
const BOUTON_ICONE = "inline-flex size-9 shrink-0 items-center justify-center rounded-md text-[#171717] transition-colors hover:bg-[#f5f5f5]";

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
      {/* 11/11, Teo : « tout est décalé trop à droite. Le logo est censé être beaucoup plus à gauche et les sections
          au milieu » — plus de colonne max-w-6xl : le logo au bord gauche de l'écran, les entrées centrées sur la barre */}
      <nav aria-label="Principal" className="relative hidden w-full md:block">
        <div className="flex h-16 w-full items-center px-6">
          <Accueil />
          <div className="absolute inset-x-0 top-0 flex h-16 items-center justify-center">
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
        </div>
      </nav>
      <div className="flex h-16 items-center justify-between px-4 md:hidden">
        <Accueil />
        <Panneau marque={<Accueil />} entrees={ENTREES} classeBouton={BOUTON_ICONE} />
      </div>
    </header>
  );
}
