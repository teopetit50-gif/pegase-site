"use client";
/* ══════════════════════════════════════════════════════════════════════
   Tamila sur le dessin Radius — les formules (11/11/2026, refaites le soir)

   La première version décalquait la section « Pricing » du modèle : une
   carte noire à ombre xl, quatorze coches rondes par formule. Teo : « j'aime
   toujours pas ce composant-là, il est moche ; trouve-en un similaire aux
   autres composants qu'on a sur Tamila, plus sobre et pro, sur 21st.dev ».

   Dessin repris du `pricing-one` de meschacirung (21st.dev, bibliothèque
   idees-21st) : deux cartes asymétriques à filet, aucune n'est noire. À
   gauche, Découverte, étroite (2/5), soudée au bord de la seconde dès
   `md` ; à droite, Cabinet, large (3/5), en deux colonnes : le prix et le
   bouton, puis « Tout Découverte, plus : » et sa liste. Jetons de la page
   (ui.tsx, radius.ts) : fond #fafaf9, filets #e5e5e3 à 1 px, encre
   #0f0e0d, texte #524f49, rayon .75rem, ombre quasi nulle. La bascule
   Contentieux / Dommage corporel reste (elle change les listes), en
   commande segmentée à filet. Les listes sont COURTES : cinq contrôles
   pour Découverte, six ajouts pour Cabinet — le reste se détaille à
   l'audit (la note sous les cartes). Les mots : FORMULES (textes.ts).
   ══════════════════════════════════════════════════════════════════════ */
import Link from "next/link";
import { useState } from "react";
import { AMORCES, FORMULES_TEXTES } from "./radius";
import { CONTACT, FORMULES } from "./textes";
import { Amorce, Chapo, Conteneur, SECTION, Titre } from "./ui";

type Matiere = keyof (typeof FORMULES.plans)[number]["inclut"];

const COMPTE = { decouverte: 5, cabinet: 6 } as const;

const BOUTON_FILET =
  "inline-flex h-10 w-full items-center justify-center rounded-md border border-[#e5e5e3] bg-white px-4 text-sm font-medium text-[#0f0e0d] transition-colors hover:bg-[#f2f1f0] active:scale-[0.98]";
const BOUTON_PLEIN =
  "inline-flex h-10 w-full items-center justify-center rounded-md bg-[#0f0e0d] px-4 text-sm font-medium text-[#fafaf9] transition-colors hover:bg-[#2a2826] active:scale-[0.98]";

function Coche() {
  return (
    <svg viewBox="0 0 16 16" className="mt-[5px] h-3 w-3 shrink-0 text-[#0f0e0d]" fill="none" aria-hidden="true">
      <path d="M3 8.5 6.5 12 13 4.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function Liste({ lignes }: { lignes: string[] }) {
  return (
    <ul className="flex flex-col gap-3">
      {lignes.map((l) => (
        <li key={l} className="flex items-start gap-2.5 text-sm leading-relaxed text-[#524f49]">
          <Coche />
          <span>{l}</span>
        </li>
      ))}
    </ul>
  );
}

export default function Formules() {
  const [matiere, setMatiere] = useState<Matiere>("Contentieux");
  const [decouverte, cabinet] = FORMULES.plans;
  /* la première ligne de Cabinet redit « tout Découverte » : c'est le titre de sa colonne */
  const ajoutsCabinet = cabinet.inclut[matiere].slice(1, 1 + COMPTE.cabinet);
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
          <div role="tablist" aria-label="Matière" className="inline-flex items-center rounded-lg border border-[#e5e5e3] bg-white p-1">
            {(FORMULES.bascule as Matiere[]).map((m) => {
              const actif = m === matiere;
              return (
                <button
                  key={m}
                  type="button"
                  role="tab"
                  aria-selected={actif}
                  onClick={() => setMatiere(m)}
                  className={`rounded-md px-4 py-1.5 text-sm font-medium transition-colors duration-200 ${actif ? "bg-[#0f0e0d] text-[#fafaf9]" : "text-[#524f49] hover:text-[#0f0e0d]"}`}
                >
                  {m}
                </button>
              );
            })}
          </div>
        </header>

        <div className="mx-auto grid max-w-[1040px] gap-6 md:grid-cols-5 md:gap-0">
          {/* ——— Découverte ——— */}
          <article className="flex flex-col justify-between gap-8 rounded-xl border border-[#e5e5e3] bg-white p-6 md:col-span-2 md:my-2 md:rounded-r-none md:border-r-0 lg:p-8">
            <div className="space-y-4">
              <div>
                <h3 className="text-base font-medium text-[#0f0e0d]">{decouverte.titre}</h3>
                <span className="my-3 block text-2xl font-medium tracking-[-0.01em] text-[#0f0e0d]">{decouverte.prix}</span>
                <p className="text-sm leading-normal text-[#524f49]">{decouverte.note[matiere]}</p>
              </div>
              <Link href={CONTACT.audit} className={BOUTON_FILET}>
                {decouverte.bouton}
              </Link>
              <hr className="border-dashed border-[#e5e5e3]" />
              <Liste lignes={decouverte.inclut[matiere].slice(0, COMPTE.decouverte)} />
            </div>
          </article>

          {/* ——— Cabinet, la formule mise en avant ——— */}
          <article className="rounded-xl border border-[#e5e5e3] bg-white p-6 shadow-[0_2px_8px_rgba(0,0,0,0.04)] md:col-span-3 lg:p-8">
            <div className="grid gap-6 sm:grid-cols-2 sm:gap-8">
              <div className="space-y-4">
                <div>
                  <h3 className="text-base font-medium text-[#0f0e0d]">{cabinet.titre}</h3>
                  <span className="my-3 block text-2xl font-medium tracking-[-0.01em] text-[#0f0e0d]">{cabinet.prix}</span>
                  <p className="text-sm leading-normal text-[#524f49]">{cabinet.note[matiere]}</p>
                </div>
                <Link href={CONTACT.audit} className={BOUTON_PLEIN}>
                  {cabinet.bouton}
                </Link>
                <p className="text-sm leading-relaxed text-[#524f49]">{cabinet.desc}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-[#0f0e0d]">Tout Découverte, sur tous vos dossiers, plus :</p>
                <div className="mt-4">
                  <Liste lignes={ajoutsCabinet} />
                </div>
              </div>
            </div>
          </article>
        </div>

        <p className="mx-auto mt-10 max-w-xl text-center text-xs leading-normal text-[#6e6a65] sm:mt-12 sm:text-sm">{FORMULES_TEXTES.note}</p>
      </Conteneur>
    </section>
  );
}
