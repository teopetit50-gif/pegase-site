"use client";
/* ══════════════════════════════════════════════════════════════════════
   « Questions fréquentes » — la FAQ de la référence : titre et chapô
   (avec un lien en gras) côte à côte, à gauche la liste des rubriques
   (collante, centrée et voilée sous md), à droite les groupes de
   questions en accordéon : la question ouverte prend une carte (fond,
   anneau, ombre), le chevron se retourne. Classes et attributs
   `data-state` de la référence (accordéon Radix), tenus ici par un état
   React. Les dix questions sont celles de la page du 24/09 (textes.ts,
   QUESTIONS), réparties en trois rubriques ; la première est ouverte.
   ══════════════════════════════════════════════════════════════════════ */
import Link from "next/link";
import { ChevronDown } from "lucide-react";
import { useState } from "react";
import Apparition, { GroupeApparition, MotsApparition } from "@/components/accueil/Apparition";
import { allerA, RESERVER } from "./outils";
import { QUESTIONS } from "./textes";

const RUBRIQUES: { id: string; titre: string; questions: number[] }[] = [
  { id: "votre-matinee", titre: "Votre matinée", questions: [0, 1, 2, 3] },
  { id: "au-quotidien", titre: "Au quotidien", questions: [4, 5, 6] },
  { id: "formules", titre: "Formules", questions: [7, 8, 9] },
];

export default function Questions() {
  const [rubrique, setRubrique] = useState(0);
  const [ouverte, setOuverte] = useState<number | null>(0);

  return (
    <section data-monde="clair" className="bg-tir-background py-16 md:py-24">
      <div className="mx-auto max-w-7xl px-6 lg:px-8">
        <GroupeApparition retard={700} className="grid items-end gap-8 md:grid-cols-2 md:gap-12">
          <h2 className="font-semibold text-4xl text-tir-foreground">
            <MotsApparition texte="Questions fréquentes" depart={80} />
          </h2>
          <Apparition as="p" delai={450} className="max-w-md text-balance text-lg text-tir-muted-foreground">
            Chaque formule inclut les mises à jour. Le prix se fixe à{" "}
            <Link href={RESERVER} className="font-medium text-tir-foreground hover:underline">
              l&apos;audit
            </Link>
            , selon la taille du cabinet.
          </Apparition>
        </GroupeApparition>
        <Apparition delai={150} className="@container mt-6 grid md:mt-20 md:grid-cols-5">
          <nav
            aria-label="Rubriques des questions"
            className="md:-mt-3 sticky top-0 z-10 h-fit max-md:flex max-md:justify-center max-md:bg-tir-foreground/2 max-md:p-2 max-md:backdrop-blur md:top-12 md:col-span-2 md:block"
          >
            {RUBRIQUES.map((r, i) => (
              <button
                key={r.id}
                type="button"
                onClick={() => {
                  setRubrique(i);
                  allerA(r.id);
                }}
                className={`block w-fit cursor-pointer py-2 text-left text-sm transition-colors max-md:px-2 md:py-1.5 ${i === rubrique ? "font-medium text-tir-foreground" : "text-tir-muted-foreground hover:text-tir-foreground"}`}
              >
                {r.titre}
              </button>
            ))}
          </nav>
          <div className="space-y-12 max-md:mt-6 md:col-span-3">
            {RUBRIQUES.map((r) => (
              <div key={r.id} id={r.id} className="scroll-mt-20 space-y-4">
                <h3 className="pl-6 font-semibold text-tir-foreground text-lg">{r.titre}</h3>
                <div className="-space-y-1">
                  {r.questions.map((n) => {
                    const { q, r: reponse } = QUESTIONS[n];
                    const etat = ouverte === n ? "open" : "closed";
                    return (
                      <div
                        key={q}
                        data-state={etat}
                        className="border-b last:border-b-0 peer rounded-xl border-none px-6 py-1 data-[state=open]:border-none data-[state=open]:bg-tir-card data-[state=open]:shadow-black/[0.065] data-[state=open]:shadow-sm data-[state=open]:ring-1 data-[state=open]:ring-tir-border"
                      >
                        <h3 data-state={etat} className="flex">
                          <button
                            type="button"
                            aria-expanded={ouverte === n}
                            aria-controls={`tir-q-${n}`}
                            data-state={etat}
                            onClick={() => setOuverte(ouverte === n ? null : n)}
                            className="flex flex-1 items-start justify-between gap-4 text-left font-medium outline-none focus-visible:border-tir-ring focus-visible:ring-[3px] focus-visible:ring-tir-ring/50 disabled:pointer-events-none disabled:opacity-50 [&[data-state=open]>svg]:rotate-180 cursor-pointer rounded-none border-b py-4 text-base transition-none hover:no-underline data-[state=open]:border-transparent"
                          >
                            {q}
                            <ChevronDown className="pointer-events-none size-4 shrink-0 translate-y-0.5 text-tir-muted-foreground transition-transform duration-200" aria-hidden="true" />
                          </button>
                        </h3>
                        <div id={`tir-q-${n}`} role="region" data-state={etat} hidden={ouverte !== n} className="overflow-hidden text-sm">
                          <div className="pt-0 pb-4">
                            <p className="text-base text-tir-muted-foreground">{reponse}</p>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </Apparition>
      </div>
    </section>
  );
}
