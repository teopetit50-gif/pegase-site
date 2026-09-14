"use client";

import { CircleCheck } from "lucide-react";
import { ECRANS } from "@/lib/produits/relances";
import { Panneau } from "./Panneau";
import { FeatureSteps } from "./ui/feature-section";

/* Les quatre écrans, sur le composant `feature-section`.

   Il remplace la barre d'onglets et la pile de cartes : mêmes captures,
   même défilement automatique, mais la liste des écrans porte désormais
   sa phrase à côté de son numéro au lieu d'un onglet coupé en deux. Le
   panneau garde toute sa logique — étroit ou large.

   RAPATRIEMENT 11/09 — `text-foreground` → `text-[#171717]`,
   `text-muted-foreground` → `text-[#737373]`. `text-emerald-500` reste :
   c'est une couleur de la palette Tailwind par défaut, elle existe ici. */

export function Ecrans() {
  return (
    <section id="ecrans" data-monde="clair" className="scroll-mt-24 py-20 md:py-28">
      <div className="mx-auto max-w-7xl px-6 lg:px-8">
        <div className="grid items-end gap-8 md:grid-cols-2 md:gap-12">
          <h2 className="text-balance font-bold text-4xl text-[#171717] tracking-tight md:text-5xl">
            {ECRANS.titre}
          </h2>
          <p className="max-w-md text-base text-[#737373] leading-relaxed">{ECRANS.chapo}</p>
        </div>

        <FeatureSteps
          className="mt-12 md:mt-16"
          etapes={ECRANS.onglets.map((o) => ({
            cle: o.cle,
            titre: o.titre,
            texte: o.sous,
          }))}
          visuel={(_, i) => {
            const o = ECRANS.onglets[i];
            return <Panneau apercu={o.apercu} alt={o.alt} />;
          }}
        />

        <ul className="mt-10 flex flex-wrap items-center justify-center gap-x-8 gap-y-3">
          {ECRANS.preuves.map((p) => (
            <li key={p} className="flex items-center gap-2 text-[#737373] text-sm">
              <CircleCheck className="size-4 text-emerald-500" />
              {p}
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
