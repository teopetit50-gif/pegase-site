import type { CSSProperties, ReactNode } from "react";
import Lien from "@/components/Lien";
import type { Bouton } from "./textes";

/* ══════════════════════════════════════════════════════════════════════
   La trame de /gestion : la grille à trois colonnes de la référence (son
   composant « SectionGrid », balisage.txt ligne 108), ses filets, ses
   bandes hachurées, ses repères en losange, et ses deux boutons.

   La grille : une colonne de contenu de 1 248 px au plus, deux marges d'au
   moins 16 px. Chaque section est posée dans la colonne `content` et
   bordée à gauche et à droite ; les filets et les bandes courent sur
   `full`, d'un bord à l'autre de la fenêtre.

   Écarts :
   · la référence repose deux repères en haut de certaines sections, au
     même endroit que ceux de la bande qui précède : ils se recouvrent au
     pixel. Ici chaque croisement n'en porte qu'un ;
   · ses boutons sont un <button> dans un <a> (deux contrôles imbriqués,
     invalide en HTML) : ici un seul lien, habillé des mêmes classes ;
   · ses classes `min-[360px]:flex-1` portaient sur ce <button>, donc sans
     effet : elles ne sont pas reprises.
   ══════════════════════════════════════════════════════════════════════ */

export const GRILLE: CSSProperties = {
  gridTemplateColumns:
    "[full-start] minmax(16px,1fr) [content-start] minmax(0,1248px) [content-end] minmax(16px,1fr) [full-end]",
};
const PLEIN: CSSProperties = { display: "grid", gridColumn: "full", ...GRILLE };

/* une section : dans la colonne de contenu, bordée des deux côtés */
export function Bloc({ id, children }: { id: string; children: ReactNode }) {
  return (
    <section id={id} className="relative scroll-mt-24 border-x border-stone-200" style={{ gridColumn: "content" }}>
      {children}
    </section>
  );
}

function Repere({ className }: { className: string }) {
  return (
    <div className={`absolute z-[2] flex h-6 w-6 -translate-x-1/2 -translate-y-1/2 items-center justify-center ${className}`}>
      <div className="ge-repere" />
    </div>
  );
}

/* le filet de 1 px, d'un bord à l'autre, et ses deux repères */
export function Filet() {
  return (
    <div className="relative" style={PLEIN} aria-hidden="true">
      <div className="h-px w-full bg-stone-200" style={{ gridColumn: "full" }} />
      <div className="pointer-events-none relative" style={{ gridColumn: "content", gridRow: 1 }}>
        <Repere className="left-0 top-1/2" />
        <Repere className="left-full top-1/2" />
      </div>
    </div>
  );
}

/* la bande hachurée de 40 px et ses quatre repères */
export function Hachure() {
  return (
    <div className="relative" style={PLEIN} aria-hidden="true">
      <div className="ge-hachure h-10 border-y border-stone-200" style={{ gridColumn: "full" }} />
      <div className="pointer-events-none relative" style={{ gridColumn: "content", gridRow: 1 }}>
        <Repere className="left-0 top-0" />
        <Repere className="left-full top-0" />
        <Repere className="left-0 top-full" />
        <Repere className="left-full top-full" />
      </div>
    </div>
  );
}

/* ── les boutons ── leur composant Button, variantes « primary » et
   « outline » : 36 px de haut, rayon 10 px, ombre 0 1px à 5 % */
const BOUTON =
  "inline-flex shrink-0 items-center justify-center rounded-[10px] border bg-clip-padding whitespace-nowrap transition-all outline-none select-none focus-visible:ring-2 focus-visible:ring-[#4b4038]/40 active:translate-y-px shadow-2xs h-9 gap-1.5 px-3.5";
const BOUTON_PLEIN = "border-transparent bg-[#403630] font-normal text-white hover:bg-[#342d27]";
const BOUTON_FILET =
  "border-stone-200 bg-white font-medium text-stone-700 hover:border-stone-300 hover:bg-stone-50 hover:text-stone-900";

export function BoutonLien({
  bouton,
  petit = false,
  className = "",
}: {
  bouton: Bouton;
  /* 14/20 au lieu de 16/24 : leurs deux boutons de milieu de page */
  petit?: boolean;
  className?: string;
}) {
  return (
    <Lien
      href={bouton.href}
      className={`${BOUTON} ${bouton.plein ? BOUTON_PLEIN : BOUTON_FILET} ${petit ? "text-sm" : "text-base"} ${className}`}
    >
      {bouton.libelle}
    </Lien>
  );
}
