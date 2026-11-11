"use client";
/* La barre du site Tiroma. Il n'y a pas de site source à reprendre : la
   page /secteurs/dentaire a été redessinée le 10/11/2026 sur le gabarit
   folio-topaz-delta (code/hors-git/tiroma ne contient que le SQL). La
   barre reprend donc le langage de cette page : fond et filets en
   pointillé des jetons `tir-*` (globals.css), colonne `container`, signe
   Tiroma + lockup, quatre entrées vers ses sections (démo, parcours,
   écrans, formules), bouton noir arrondi. */
import Link from "next/link";
import { MarqueTiroma } from "@/components/secteurs/dentaire/marque";
import { Lockup, LienSection, Panneau, type Entree } from "./communs";

const ENTREES: Entree[] = [
  { label: "La démo", id: "demo" },
  { label: "Le parcours", id: "workflow" },
  { label: "Les écrans", id: "screenshots" },
  { label: "Formules", id: "pricing" },
];
const CTA = { label: "Réserver un audit", id: "audit" };

function Accueil() {
  return (
    <Link href="/" aria-label="Tiroma, accueil" className="flex items-center gap-2 text-tir-foreground">
      <MarqueTiroma className="size-6" />
      <Lockup src="/logos/tiroma-lockup.png" ratio="1200 / 299" className="h-[22px]" label="Tiroma" />
    </Link>
  );
}

export default function BarreTiroma() {
  return (
    <header className="sticky top-0 z-50 w-full border-b border-dashed border-tir-border bg-tir-background/90 backdrop-blur" style={{ viewTransitionName: "site-header" }}>
      <div className="container mx-auto">
        <div className="flex h-16 items-center justify-between border-tir-border border-dashed px-6 sm:border-x">
          <Accueil />
          <nav aria-label="Principal" className="hidden items-center gap-6 md:flex">
            {ENTREES.map((l) => (
              <LienSection key={l.id} id={l.id} className="text-sm font-medium text-tir-muted-foreground transition-colors hover:text-tir-foreground">
                {l.label}
              </LienSection>
            ))}
          </nav>
          <div className="flex items-center gap-2">
            <LienSection
              id={CTA.id}
              className="hidden h-9 items-center justify-center rounded-full bg-tir-foreground px-4 text-sm font-medium text-tir-background transition-opacity hover:opacity-90 md:inline-flex"
            >
              {CTA.label}
            </LienSection>
            <div className="md:hidden">
              <Panneau marque={<Accueil />} entrees={ENTREES} cta={CTA} />
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
