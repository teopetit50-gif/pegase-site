"use client";
/* ══════════════════════════════════════════════════════════════════════
   Tamila sur le dessin Radius — les formules (11/11/2026)

   La section « Pricing » du modèle : tête centrée (amorce, titre à
   48rem, chapô à 36rem), une rangée de commandes (le curseur « Team size »
   et la bascule Monthly / Annual en pilule), les cartes (p-6 → p-8,
   rayon .75rem, la carte mise en avant noire avec ombre xl, les autres
   blanches à ombre sm ; titre, texte, prix, bouton gris plein, filet,
   liste à coches rondes), chaque carte dans son halo (filet gris zinc à
   50 % ici, pas blanc), puis la note centrée.
   Ce qui change : le curseur ne vient pas (il ne servait qu'à multiplier
   un prix ; la page n'affiche aucun montant, règle maison) ; la bascule
   porte les deux matières de FORMULES.bascule (Contentieux / Dommage
   corporel), qui changent la liste de chaque formule ; deux cartes
   (Découverte, Cabinet mise en avant) au lieu de trois, la grille est
   donc à deux colonnes centrées. Les mots : FORMULES (textes.ts).
   ══════════════════════════════════════════════════════════════════════ */
import Link from "next/link";
import { useState } from "react";
import { Check } from "lucide-react";
import { AMORCES, FORMULES_TEXTES } from "./radius";
import { CONTACT, FORMULES } from "./textes";
import { Amorce, Chapo, Conteneur, Halo, SECTION, Titre } from "./ui";

type Matiere = keyof (typeof FORMULES.plans)[number]["inclut"];

export default function Formules() {
  const [matiere, setMatiere] = useState<Matiere>("Contentieux");
  return (
    <section id="formules" data-monde="clair" className={SECTION} aria-labelledby="formules-titre">
      <Conteneur>
        <header className="mb-10 flex flex-col items-center gap-6 text-center sm:mb-12 md:mb-16">
          <div className="flex flex-col items-center gap-4">
            <Amorce>{AMORCES.formules}</Amorce>
            <Titre id="formules-titre" className="max-w-3xl">
              {FORMULES.titreAvant}
              <br />
              {FORMULES.titreMot}
            </Titre>
            <Chapo className="max-w-xl">{FORMULES_TEXTES.tete}</Chapo>
          </div>
          <div className="flex w-full flex-col items-center gap-4 sm:flex-row sm:justify-center">
            <div role="tablist" aria-label="Matière" className="inline-flex items-center rounded-full border border-[#e5e5e3] bg-white p-1">
              {(FORMULES.bascule as Matiere[]).map((m) => {
                const actif = m === matiere;
                return (
                  <button
                    key={m}
                    type="button"
                    role="tab"
                    aria-selected={actif}
                    onClick={() => setMatiere(m)}
                    className={`inline-flex items-center gap-2 rounded-full px-4 py-1.5 text-sm font-medium transition-colors duration-200 ${actif ? "bg-[#0f0e0d] text-[#fafaf9]" : "text-[#524f49] hover:text-[#0f0e0d]"}`}
                  >
                    {m}
                  </button>
                );
              })}
            </div>
          </div>
        </header>
        <div className="mx-auto grid max-w-[980px] grid-cols-1 items-stretch gap-6 sm:gap-8 md:grid-cols-2 lg:gap-8">
          {FORMULES.plans.map((p) => {
            const sombre = p.id === "cabinet";
            return (
              <div key={p.id} className="relative h-full">
                <article className={`relative flex h-full flex-col rounded-xl p-6 transition-shadow duration-300 sm:p-7 md:p-8 ${sombre ? "bg-[#0f0e0d] text-[#fafaf9] shadow-xl" : "bg-white text-[#0f0e0d] shadow-sm"}`}>
                  <header className="flex flex-col gap-2">
                    <h3 className={`text-lg font-medium sm:text-xl ${sombre ? "text-[#fafaf9]" : "text-[#0f0e0d]"}`}>{p.titre}</h3>
                    <p className={`text-sm leading-normal ${sombre ? "text-white/70" : "text-[#524f49]"}`}>{p.desc}</p>
                  </header>
                  <div className="mt-6 flex flex-wrap items-baseline gap-x-2 gap-y-1">
                    <span className={`text-3xl font-normal leading-none tracking-[-0.015em] sm:text-4xl md:text-[2.5rem] ${sombre ? "text-[#fafaf9]" : "text-[#0f0e0d]"}`}>{p.prix}</span>
                    <span className={`text-sm ${sombre ? "text-white/60" : "text-[#524f49]"}`}>{p.note[matiere]}</span>
                  </div>
                  <div className="mt-6">
                    <Link
                      href={CONTACT.audit}
                      className={`inline-flex h-9 w-full shrink-0 items-center justify-center gap-1.5 whitespace-nowrap rounded-md border border-transparent px-2.5 text-sm font-medium transition-all outline-none select-none active:translate-y-px ${sombre ? "bg-[#fafaf9] text-[#0f0e0d] hover:bg-[#e5e5e3]" : "bg-[#f2f1f0] text-[#0f0e0d] hover:bg-[#e5e5e3]"}`}
                    >
                      {p.bouton}
                    </Link>
                  </div>
                  <hr className={`my-6 h-0 border-0 border-t sm:my-7 ${sombre ? "border-white/10" : "border-[#e5e5e3]"}`} />
                  <ul className="flex flex-col gap-3">
                    {p.inclut[matiere].map((l) => (
                      <li key={l} className={`flex items-start gap-3 text-sm leading-relaxed ${sombre ? "text-white/85" : "text-[#524f49]"}`}>
                        <span className={`mt-0.5 grid h-4 w-4 shrink-0 place-items-center rounded-full ${sombre ? "bg-[#fafaf9] text-[#0f0e0d]" : "bg-[#f2f1f0] text-[#0f0e0d]"}`}>
                          <Check className="h-2.5 w-2.5" strokeWidth={3} aria-hidden="true" />
                        </span>
                        <span>{l}</span>
                      </li>
                    ))}
                  </ul>
                </article>
                <Halo rayon="0.75rem" sombre />
              </div>
            );
          })}
        </div>
        <p className="mx-auto mt-10 max-w-xl text-center text-xs leading-normal text-[#6e6a65] sm:mt-12 sm:text-sm">{FORMULES_TEXTES.note}</p>
      </Conteneur>
    </section>
  );
}
