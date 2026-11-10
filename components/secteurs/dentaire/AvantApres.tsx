/* ══════════════════════════════════════════════════════════════════════
   « Le matin, avec et sans Tiroma » — l'avant / après de la page du
   24/09 (textes.ts, SANS_TIROMA et AVEC_TIROMA), dans deux cartes de la
   grille de la référence (trame de points, titre, texte, puis une scène
   en fil d'activité : icône carrée, filet pointillé, cartes). La
   référence n'a pas d'avant / après : les deux cartes reprennent son
   bloc « Activity timeline » tel quel.
   ══════════════════════════════════════════════════════════════════════ */
import Apparition, { GroupeApparition, MotsApparition } from "@/components/accueil/Apparition";
import { AVEC_TIROMA, SANS_TIROMA } from "./textes";

function Fil({ items, teinte }: { items: string[]; teinte: "rose" | "vert" }) {
  const pastille = teinte === "rose" ? "bg-rose-100 ring-1 ring-rose-200/60 text-rose-600" : "bg-emerald-100 ring-1 ring-emerald-200/60 text-emerald-700";
  return (
    <div className="relative flex-1">
      <div className="pointer-events-none relative flex h-full w-full select-none items-center justify-center overflow-hidden bg-tir-background p-4">
        <div className="relative w-full max-w-[340px]">
          <div className="relative pl-12">
            <div className="absolute top-0 bottom-0 left-6 border-tir-foreground/15 border-l border-dashed" />
            {items.map((item, i) => (
              <div key={item} className={i > 0 ? "relative mt-3" : "relative"}>
                <div className={`-left-9 absolute top-0 z-10 flex size-6 items-center justify-center rounded-md ${pastille}`}>
                  <span className="size-2 rounded-full bg-current" />
                </div>
                <div className="ml-1 rounded-md border border-tir-border bg-tir-card p-2.5 shadow-sm">
                  <p className="font-semibold text-[11px] text-tir-foreground leading-snug">{item}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function Carte({ titre, texte, chip, items, teinte }: { titre: string; texte: string; chip: string; items: string[]; teinte: "rose" | "vert" }) {
  return (
    <div className="relative flex min-h-[540px] flex-col overflow-hidden rounded-2xl border border-tir-border bg-tir-background">
      <div className="pointer-events-none absolute inset-0 text-tir-foreground/[0.06] [background-image:radial-gradient(currentColor_1px,transparent_1px)] [background-size:14px_14px]" />
      <div className="relative p-8">
        <span className={`inline-flex items-center gap-0.5 rounded-md px-1.5 py-px font-medium text-[10px] ${teinte === "rose" ? "bg-rose-100 text-rose-700" : "bg-emerald-100 text-emerald-700"}`}>{chip}</span>
        <h3 className="mt-3 font-semibold text-tir-foreground text-lg leading-tight">{titre}</h3>
        <p className="mt-2 text-base text-tir-foreground/75 leading-relaxed">{texte}</p>
      </div>
      <Fil items={items} teinte={teinte} />
    </div>
  );
}

export default function AvantApres() {
  return (
    <section id="screenshots" data-monde="clair" className="py-20 md:py-28">
      <div className="mx-auto max-w-7xl px-6 lg:px-8">
        <GroupeApparition retard={700} className="grid items-end gap-8 md:grid-cols-2 md:gap-12">
          <h2 className="text-balance font-bold text-4xl text-tir-foreground tracking-tight md:text-5xl">
            <MotsApparition texte="Le matin, avec et sans Tiroma" depart={80} />
          </h2>
          <Apparition as="p" delai={450} className="max-w-md text-base text-tir-muted-foreground leading-relaxed">
            Lecture seule de l&apos;agenda, des plans et des devis. Aucun message ne part sans votre accord.
          </Apparition>
        </GroupeApparition>
        <Apparition delai={150} className="mt-14 grid grid-cols-1 gap-5 lg:grid-cols-2">
          <Carte titre="Sans Tiroma" texte={SANS_TIROMA[0]} chip="8 h 10, avant le premier patient" items={SANS_TIROMA.slice(1)} teinte="rose" />
          <Carte titre="Avec Tiroma" texte={AVEC_TIROMA[0]} chip="Avant / après" items={AVEC_TIROMA.slice(1)} teinte="vert" />
        </Apparition>
      </div>
    </section>
  );
}
