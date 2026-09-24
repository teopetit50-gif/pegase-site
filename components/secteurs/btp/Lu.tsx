/* Grille « Trusted by » de Vertex (module 8499 de page-*.js) : mêmes croix d'angle, même grille 2 × 5 à filets.
   Le composant de la référence sait déjà afficher un mot-marque typographique à la place d'une image ; c'est ce
   mode qui sert ici — on n'affiche que ce que Daliro lit, jamais un logo de client.

   COPIÉ le 24/09/2026 à 12 h 01 de `OMEGA/chantieros-site/src/components/logos.tsx`. Couleurs converties
   (règle 3) : bg-background → bg-[#ffffff] · text-foreground/65, text-foreground → #171717/65, #171717 ·
   bg-foreground/30, bg-foreground/5, border-foreground/15 → #171717/N. La grille `divide-x divide-y` n'a
   pas de couleur à elle : c'est la règle de base de btp.css (filets #e6e6e6, comme `* { border-color }`
   dans la source) qui la peint. Les mots-marques en serif (Newsreader) passent en police de titre du site
   (textes.ts, règle 5). */
import * as React from "react";
import { cn } from "@/lib/cn";
import { LU } from "./textes";

type Mot = { name: string; fontFamily?: string; fontWeight?: number; fontSize?: number; italic?: boolean; uppercase?: boolean; letterSpacing?: string };

function MotMarque({ m }: { m: Mot }) {
  return (
    <span
      className="text-[#171717]/65 transition-colors hover:text-[#171717]"
      style={{
        fontFamily: m.fontFamily, fontWeight: m.fontWeight ?? 600, fontStyle: m.italic ? "italic" : "normal",
        fontSize: `${m.fontSize ?? 18}px`, letterSpacing: m.letterSpacing, textTransform: m.uppercase ? "uppercase" : "none",
        whiteSpace: "nowrap", lineHeight: 1,
      }}
    >
      {m.name}
    </span>
  );
}

function Croix({ className }: { className?: string }) {
  return (
    <div aria-hidden="true" className={cn("pointer-events-none absolute size-3", className)}>
      <span className="absolute inset-0 m-auto block h-px w-full bg-[#171717]/30" />
      <span className="absolute inset-0 m-auto block h-full w-px bg-[#171717]/30" />
    </div>
  );
}

export function Logos() {
  return (
    <section className="bg-[#ffffff] py-16 md:py-24" aria-label={LU.aria}>
      <div className="px-6 sm:px-8 lg:px-12">
        <div className="relative">
          <Croix className="-translate-x-1/2 -translate-y-1/2 top-0 left-0" />
          <Croix className="-translate-y-1/2 top-0 right-0 translate-x-1/2" />
          <Croix className="-translate-x-1/2 bottom-0 left-0 translate-y-1/2" />
          <Croix className="right-0 bottom-0 translate-x-1/2 translate-y-1/2" />
          <div className="grid grid-cols-2 divide-x divide-y border border-[#171717]/15 md:grid-cols-5">
            {LU.items.map((m) => (
              <div key={m.name} className="flex items-center justify-center px-4 py-7 transition-colors hover:bg-[#171717]/5">
                <MotMarque m={m} />
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
