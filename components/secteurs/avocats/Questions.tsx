"use client";
/* ══════════════════════════════════════════════════════════════════════
   Tamila sur le dessin Radius — le point du matin en accordéon
   (11/11/2026)

   La section « FAQ » du modèle : à gauche (cinq colonnes) la tête ; à
   droite (sept) un accordéon Radix (le même paquet que le modèle,
   @radix-ui/react-accordion) : chaque entrée filetée en bas, le bouton
   sur py-5 / py-6 en 16 / 18 px médium, un chevron bas qui devient haut
   quand l'entrée est ouverte, le contenu en 14 / 16 px gris, animé par
   les keyframes accordion-down / up (avocats.css).
   La page du 24/09 n'avait pas de questions : les quatre entrées sont
   les quatre cartes du point du matin (POINT.cartes, textes.ts), chacune
   avec son texte, sa valeur, sa tendance et son tableau d'exemple —
   c'est le dessin qui leur va le mieux dans ce modèle.
   ══════════════════════════════════════════════════════════════════════ */
import * as Accordion from "@radix-ui/react-accordion";
import { ChevronDown, ChevronUp } from "lucide-react";
import { AMORCES } from "./radius";
import { POINT } from "./textes";
import { Amorce, Chapo, Conteneur, SECTION, Titre } from "./ui";

export default function Questions() {
  return (
    <section id="point-du-matin" data-monde="clair" className={SECTION} aria-labelledby="point-du-matin-titre">
      <Conteneur>
        <div className="grid grid-cols-1 gap-10 md:grid-cols-12 md:gap-8 lg:gap-12">
          <header className="flex flex-col gap-4 md:col-span-5">
            <Amorce>{AMORCES.point}</Amorce>
            <Titre id="point-du-matin-titre">
              {POINT.titreL1}
              <br />
              {POINT.titreMot}
            </Titre>
            <Chapo>{POINT.texte}</Chapo>
          </header>
          <div className="md:col-span-7">
            <Accordion.Root type="single" collapsible className="flex w-full flex-col">
              {POINT.cartes.map((c, i) => (
                <Accordion.Item key={c.titre} value={`item-${i}`} className="border-b border-[#e5e5e3] first:border-t-0 last:border-b-0">
                  <Accordion.Header className="flex">
                    <Accordion.Trigger className="group/trigger relative flex flex-1 items-start justify-between rounded-lg border border-transparent py-5 text-left text-base font-medium leading-[1.35] text-[#0f0e0d] outline-none transition-all sm:py-6 sm:text-lg [&>svg]:h-5 [&>svg]:w-5 [&>svg]:text-[#524f49]">
                      {c.titre}
                      <ChevronDown className="pointer-events-none ml-auto shrink-0 group-aria-expanded/trigger:hidden" aria-hidden="true" />
                      <ChevronUp className="pointer-events-none ml-auto hidden shrink-0 group-aria-expanded/trigger:inline" aria-hidden="true" />
                    </Accordion.Trigger>
                  </Accordion.Header>
                  <Accordion.Content className="avocats-accordeon overflow-hidden text-sm">
                    <div className="flex flex-col gap-4 pb-5 sm:pb-6">
                      <div className="text-sm leading-relaxed text-[#524f49] sm:text-base">{c.texte}</div>
                      <div className="overflow-x-auto rounded-md border border-[#e5e5e3] bg-white">
                        <div className="flex items-baseline justify-between gap-3 border-b border-[#e5e5e3] px-4 py-3">
                          <p className="text-sm font-medium text-[#0f0e0d]">
                            {c.valeur} <span className="font-normal text-[#524f49]">· {c.tendance}</span>
                          </p>
                          <span className="text-[11px] font-medium uppercase tracking-wider text-[#6e6a65]">{POINT.exemple}</span>
                        </div>
                        <table className="w-full min-w-[360px] text-left text-[13px] text-[#524f49]">
                          <thead>
                            <tr className="text-[11px] uppercase tracking-wider text-[#6e6a65]">
                              {c.colonnes.map((col) => (
                                <th key={col} scope="col" className="px-4 py-2 font-medium">
                                  {col}
                                </th>
                              ))}
                            </tr>
                          </thead>
                          <tbody>
                            {c.lignes.map((l) => (
                              <tr key={l.join()} className="border-t border-[#e5e5e3]">
                                {l.map((cell, j) => (
                                  <td key={j} className={`px-4 py-2 ${j === 0 ? "font-medium text-[#0f0e0d]" : ""}`}>
                                    {cell}
                                  </td>
                                ))}
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </Accordion.Content>
                </Accordion.Item>
              ))}
            </Accordion.Root>
          </div>
        </div>
      </Conteneur>
    </section>
  );
}
