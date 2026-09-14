"use client";

import { useState } from "react";
import { Briefcase, Factory, Store, Wrench } from "lucide-react";
import { Etiquette } from "./Bouton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs";
import { METIERS } from "@/lib/produits/accueil";

/* Un métier à la fois : le segmented control remplace la maçonnerie de la
   référence, qui s'empilait en quatre pavés sur un téléphone. Même surface
   à l'écran, un quart du texte visible d'un coup. */

const ICONES = { cle: Wrench, industrie: Factory, mallette: Briefcase, boutique: Store };

export function Metiers() {
  /* `as const` sur le contenu fait inférer le type littéral « garages » :
     sans annotation, `setActif` refuse la valeur que Radix lui passe. */
  const [actif, setActif] = useState<string>(METIERS.secteurs[0].cle);

  return (
    <section data-monde="clair" className="bg-white rounded-xl px-3 py-12 max-sm:py-14 lg:py-25">
      <div className="max-w-7xl mx-auto">
        <div className="max-w-2xl mx-auto text-center">
          <Etiquette centre>{METIERS.etiquette}</Etiquette>
          <h2 className="mt-4 text-3xl max-sm:text-[26px] max-sm:leading-[30px] -tracking-[2px] max-sm:-tracking-[1px] sm:text-4xl lg:text-5xl font-medium text-neutral-900 lg:leading-14">
            {METIERS.titre}
          </h2>
          <p className="mt-5 text-lg max-sm:text-[15px] max-sm:leading-[1.55] text-neutral-500">
            {METIERS.citation}
          </p>
        </div>

        <div className="mt-10 sm:mt-14 mx-auto max-w-3xl">
          <Tabs value={actif} onValueChange={setActif}>
            {/* Sous sm, la piste passe en deux colonnes : quatre onglets en
                ligne sur 390 px donnent des libellés de 60 px. */}
            <TabsList className="grid w-full grid-cols-2 sm:inline-flex">
              {METIERS.secteurs.map((s) => {
                const Icone = ICONES[s.icone as keyof typeof ICONES];
                return (
                  <TabsTrigger key={s.cle} value={s.cle}>
                    <Icone className="size-3.5" aria-hidden="true" />
                    {s.nom}
                  </TabsTrigger>
                );
              })}
            </TabsList>

            {METIERS.secteurs.map((s) => (
              <TabsContent key={s.cle} value={s.cle}>
                <figure className="m-0 rounded-2xl border border-neutral-200/80 bg-white p-6 a-ombre-integration sm:p-8">
                  <div className="flex items-center justify-between gap-4">
                    <span className="font-mono text-[11px] uppercase text-neutral-900">{s.heure}</span>
                    <span className="font-mono text-[10px] uppercase text-neutral-400">
                      {METIERS.mention}
                    </span>
                  </div>
                  <p className="mt-5 text-xl max-sm:text-[17px] font-medium -tracking-[0.2px] text-neutral-900">
                    « {s.demande} »
                  </p>
                  <figcaption className="mt-5 flex items-center gap-2 text-base max-sm:text-[15px] text-neutral-500">
                    <span
                      className={`size-1.5 shrink-0 rounded-full ${
                        s.transfert ? "bg-neutral-900" : "bg-emerald-500"
                      }`}
                    />
                    {s.issue}
                  </figcaption>
                </figure>
              </TabsContent>
            ))}
          </Tabs>
        </div>
      </div>
    </section>
  );
}
