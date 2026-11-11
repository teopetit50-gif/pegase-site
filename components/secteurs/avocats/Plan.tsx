"use client";
/* ══════════════════════════════════════════════════════════════════════
   Tamila sur le dessin Radius — le plan de vérification (11/11/2026)

   La section « Agentic workspaces » du modèle : à gauche (cinq colonnes)
   la tête et trois traits filetés ; à droite (sept colonnes, 600 px au
   moins, carré sous `md` et passé en dernier) le fond en caractères, la
   pilule de demande (flèche noire) et la fenêtre du plan : six étapes de
   4.5rem, quatre visibles, la pile remonte d'une étape toutes les
   2 400 ms (translateY 700 ms, cubic-bezier(.77,0,.175,1)) ; l'étape
   active a son carré noir, la quatrième est à 40 %, les autres
   invisibles ; un filet relie les carrés. Logique reprise du JS servi du
   modèle (page-*.js : `visibleSteps: 4, autoAdvanceMs: 2400`).
   Les mots : FONCTIONNALITES (titre, texte, cartes 3 à 5) et le plan
   d'exemple de radius.ts. Un `<ul class="sr-only">` répète la demande et
   les étapes pour les lecteurs d'écran, comme le modèle.
   ══════════════════════════════════════════════════════════════════════ */
import Image from "next/image";
import { useEffect, useState } from "react";
import { ArrowUp, BookOpen, ChevronRight, ClipboardCheck, FileText, GitCompareArrows, ListChecks, Scale, ScrollText, Signature } from "lucide-react";
import { AMORCES, PLAN } from "./radius";
import { FONCTIONNALITES } from "./textes";
import { Amorce, Chapo, Conteneur, FOND, Halo, SECTION, Titre, Trait } from "./ui";

const ETAPES_ICONES = [FileText, ListChecks, ClipboardCheck, Scale, GitCompareArrows, Signature];
const TRAITS_ICONES = [ClipboardCheck, GitCompareArrows, ScrollText, BookOpen];
const VISIBLES = 4;
const PAS = 2400;

function Etapes() {
  const [actif, setActif] = useState(0);
  const n = PLAN.etapes.length;
  useEffect(() => {
    const id = window.setInterval(() => setActif((a) => (a + 1) % n), PAS);
    return () => window.clearInterval(id);
  }, [n]);
  return (
    <div className="relative">
      <div className="pointer-events-none relative isolate grid grid-rows-[auto_1fr] overflow-visible rounded-lg bg-[#fafaf9] shadow-sm">
        <div className="flex items-center justify-between gap-3 px-6 py-4">
          <h4 className="text-sm font-medium leading-[1.2] text-[#0f0e0d]">{PLAN.titre}</h4>
        </div>
        <hr className="m-0 h-0 border-0 border-t border-[#e5e5e3]" />
        <div className="relative overflow-hidden" style={{ height: `${4.5 * VISIBLES}rem` }}>
          <div className="flex flex-col transition-transform duration-700 ease-[cubic-bezier(0.77,0,0.175,1)] will-change-transform" style={{ transform: `translateY(-${4.5 * actif}rem)` }}>
            {PLAN.etapes.map((e, i) => {
              const Icone = ETAPES_ICONES[i];
              const l = i - actif;
              const opacite = l === VISIBLES - 1 ? 0.4 : l >= VISIBLES || l < 0 ? 0 : 1;
              const dernier = i === n - 1;
              return (
                <div key={e.titre} className="relative flex w-full flex-row items-center gap-3 px-6" style={{ height: "4.5rem", opacity: opacite, transition: "opacity 0.7s cubic-bezier(0.77,0,0.175,1)" }}>
                  <div className="relative">
                    <div className={`grid h-10 w-10 shrink-0 place-items-center rounded-md transition-colors duration-500 ${i === actif ? "bg-[#0f0e0d] text-[#fafaf9]" : "bg-[#f2f1f0] text-[#0f0e0d]"}`}>
                      <Icone className="h-4 w-4" strokeWidth={1.75} aria-hidden="true" />
                    </div>
                    {dernier ? null : <span aria-hidden="true" className="absolute left-1/2 top-full h-[calc(4.5rem-2.5rem)] w-px -translate-x-1/2 bg-[#e5e5e3]" />}
                  </div>
                  <div className="flex min-w-0 flex-col gap-0.5">
                    <h5 className="text-balance text-[13px] font-medium text-[#0f0e0d]">{e.titre}</h5>
                    <p className="text-[13px] leading-normal text-[#524f49]">{e.texte}</p>
                  </div>
                  <div className="ms-auto inline-flex items-center">
                    <button type="button" tabIndex={-1} className="inline-flex h-8 items-center rounded-md px-2 text-[#0f0e0d]">
                      <ChevronRight className="h-4 w-4" aria-hidden="true" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
      <Halo rayon="0.5rem" />
    </div>
  );
}

export default function Plan() {
  const traits = FONCTIONNALITES.cartes.slice(2);
  return (
    <section id="verification" data-monde="clair" className={SECTION} aria-labelledby="plan-de-verification">
      <Conteneur>
        <div className="grid grid-cols-1 items-stretch gap-10 md:grid-cols-12 md:gap-8 lg:gap-12">
          <div className="flex flex-col justify-between gap-10 md:col-span-5 md:gap-12">
            <header className="flex flex-col gap-4">
              <Amorce>{AMORCES.fonctionnalites}</Amorce>
              <Titre id="plan-de-verification">
                {FONCTIONNALITES.titreL1}
                <br />
                {FONCTIONNALITES.titreL2} {FONCTIONNALITES.titreMot}
              </Titre>
              <Chapo>{FONCTIONNALITES.texte}</Chapo>
            </header>
            <div className="flex flex-col">
              {traits.map((t, i) => {
                const Icone = TRAITS_ICONES[i];
                return <Trait key={t.titre} premier={i === 0} titre={t.titre} texte={t.texte} icone={<Icone className="h-4 w-4 sm:h-[18px] sm:w-[18px]" strokeWidth={1.75} aria-hidden="true" />} />;
              })}
            </div>
          </div>
          <div className="order-last aspect-square w-full overflow-hidden rounded-md bg-[#f2f1f0] md:order-none md:col-span-7 md:aspect-auto md:min-h-[600px]">
            <div className="relative flex h-full w-full select-none flex-col justify-center gap-6 overflow-hidden px-6 py-12 sm:px-10 sm:py-16 md:gap-8 md:px-16 md:py-24 lg:px-24">
              <Image alt="" fill sizes="(max-width: 768px) 100vw, 58vw" className="object-cover" src={FOND} />
              <div className="relative z-10 mx-auto flex w-full max-w-[28rem] flex-col gap-6">
                <div className="relative">
                  <div className="pointer-events-none relative flex items-center gap-3 rounded-full bg-[#fafaf9] py-2 pl-5 pr-2 shadow-sm">
                    <p className="min-w-0 flex-1 truncate text-sm text-[#0f0e0d]">{PLAN.demande}</p>
                    <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#0f0e0d] text-[#fafaf9]">
                      <ArrowUp className="h-4 w-4" aria-hidden="true" />
                    </span>
                  </div>
                  <Halo rayon="9999px" />
                </div>
                <Etapes />
              </div>
            </div>
          </div>
        </div>
      </Conteneur>
      <ul className="sr-only">
        <li>Demande : {PLAN.demande}</li>
        {PLAN.etapes.map((e) => (
          <li key={e.titre}>
            {e.titre} : {e.texte}
          </li>
        ))}
      </ul>
    </section>
  );
}
