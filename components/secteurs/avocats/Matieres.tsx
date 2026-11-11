/* ══════════════════════════════════════════════════════════════════════
   Tamila sur le dessin Radius — les matières (11/11/2026)

   La section « Built for » du modèle : tête (amorce, titre), puis trois
   cartes photo 3:4 (1 → 2 → 3 colonnes), un voile noir qui monte du
   bas, un bouton rond « + » en haut à droite, et en bas une amorce, un
   titre et un texte blancs. Les photos du modèle (portraits Unsplash)
   deviennent les trois photos du Palais de justice de Paris déjà servies
   par la page du 24/09 (public/photos, crédits dans CREDITS.txt). Les
   mots : MATIERES (textes.ts), les dix-neuf matières réparties en trois
   cartes (radius.ts), « Et d'autres » en clôture.
   ══════════════════════════════════════════════════════════════════════ */
import Image from "next/image";
import { Plus } from "lucide-react";
import { AMORCES, MATIERES_CARTES } from "./radius";
import { MATIERES } from "./textes";
import { Amorce, Conteneur, SECTION, Titre } from "./ui";

export default function Matieres() {
  return (
    <section id="matieres" data-monde="clair" className={SECTION} aria-labelledby="matieres-titre">
      <Conteneur>
        <header className="mb-10 flex flex-col gap-4 sm:mb-12 md:mb-16">
          <Amorce>{AMORCES.matieres}</Amorce>
          <Titre id="matieres-titre">
            {MATIERES.avant} {MATIERES.mot}
          </Titre>
        </header>
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 sm:gap-8 lg:grid-cols-3 lg:gap-10">
          {MATIERES_CARTES.map((c, i) => (
            <article key={c.titre} className="group relative overflow-hidden rounded-lg bg-[#f2f1f0]">
              <div className="relative aspect-[3/4] w-full">
                <Image alt={c.alt} fill sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw" className="object-cover" src={c.photo} />
                <div aria-hidden="true" className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
                <span aria-hidden="true" className="absolute right-4 top-4 z-10 grid h-8 w-8 place-items-center rounded-full bg-[#0f0e0d]/70 text-white backdrop-blur-sm transition group-hover:bg-[#0f0e0d] sm:right-5 sm:top-5 sm:h-9 sm:w-9">
                  <Plus className="h-4 w-4" aria-hidden="true" />
                </span>
                <div className="absolute inset-x-0 bottom-0 z-10 flex flex-col gap-1.5 p-5 text-white sm:p-6">
                  <p className="text-xs font-normal leading-tight text-white/85 sm:text-sm">{c.amorce}</p>
                  <h3 className="text-base font-medium leading-[1.25] sm:text-lg">{c.titre}</h3>
                  <p className="mt-1 max-w-[26ch] text-xs leading-normal text-white/85 sm:text-sm">
                    {c.matieres.join(" · ")}
                    {i === MATIERES_CARTES.length - 1 ? ` · ${MATIERES.plus.toLowerCase()}` : ""}
                  </p>
                </div>
              </div>
            </article>
          ))}
        </div>
      </Conteneur>
    </section>
  );
}
