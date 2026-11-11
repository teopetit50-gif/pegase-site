/* ══════════════════════════════════════════════════════════════════════
   Tamila sur le dessin Radius — « Jugez-en sur un dossier déjà plaidé »
   (11/11/2026)

   La section « Context synthesis » du modèle : à gauche (sept colonnes,
   520 / 600 px au moins, carré et en dernier sous `md`) le fond en
   caractères et la pile : la carte du rapport (signe rond à cheval sur
   le bord haut, titre, filet, étiquette scintillante, texte voilé vers
   le bas, ligne des sources), deux flèches blanches, la carte du journal ;
   sous `md`, la pile est mise à l'échelle par une requête de conteneur
   (`max-md:scale-[min(1.2,calc((100cqw-2*2rem)/24rem))]`). À droite
   (cinq colonnes) la tête et trois traits filetés.
   Les mots : APPEL (textes.ts) — titre, texte, bouton — ; le rapport
   d'exemple et les trois traits : radius.ts. Le bouton n'est pas dans le
   modèle : il porte l'appel final de la page du 24/09, qui n'a pas
   d'autre place dans ce dessin.
   ══════════════════════════════════════════════════════════════════════ */
import Image from "next/image";
import Link from "next/link";
import { BookOpen, FileText, Gavel, ListChecks, MoveDown, MoveUp, Scale, ScrollText } from "lucide-react";
import { Glyphe } from "./marque";
import { AMORCES, RAPPORT } from "./radius";
import { APPEL, CONTACT } from "./textes";
import { Amorce, Chapo, Conteneur, FOND, Halo, SECTION, Titre, Trait } from "./ui";

const SOURCES = [FileText, Scale, BookOpen, Gavel];
const TRAITS = [ListChecks, Scale, ScrollText];

export default function Rapport() {
  return (
    <section id="audit-dossier" data-monde="clair" className={SECTION} aria-labelledby="rapport-de-coherence">
      <Conteneur>
        <div className="grid grid-cols-12 gap-8 lg:gap-12">
          <div className="@container relative order-last col-span-12 aspect-square min-h-0 select-none overflow-hidden rounded-md bg-[#f2f1f0] md:order-none md:col-span-7 md:aspect-auto md:h-full md:min-h-[520px] lg:min-h-[600px]">
            <Image alt="" fill sizes="(max-width: 768px) 100vw, 58vw" className="object-cover" src={FOND} />
            <div className="absolute inset-0 flex items-center justify-center p-6 sm:p-8 lg:p-10">
              <div className="flex w-full max-w-[24rem] flex-col gap-4 @[400px]:gap-5 max-md:w-[24rem] max-md:max-w-none max-md:shrink-0 max-md:origin-center max-md:scale-[min(1.2,calc((100cqw-2*2rem)/24rem))]">
                <div className="relative">
                  <div className="relative isolate overflow-visible rounded-lg bg-[#fafaf9] shadow-sm ring-1 ring-black/[0.06]">
                    <div className="absolute left-1/2 top-0 z-[100] grid h-12 w-12 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full bg-[#fafaf9] p-[3px] md:h-20 md:w-20">
                      <span className="grid h-full w-full place-items-center rounded-full bg-[#0f0e0d] text-[#fafaf9]">
                        <Glyphe className="size-5 md:size-9" />
                      </span>
                    </div>
                    <div className="flex items-center justify-between gap-4 px-6 py-4 pt-8 md:pt-12">
                      <h3 className="text-sm font-medium leading-tight text-[#0f0e0d]">{RAPPORT.titre}</h3>
                    </div>
                    <hr className="m-0 h-0 border-0 border-t border-[#e5e5e3]" />
                    <div className="avocats-voile flex flex-col gap-1.5 px-6 py-4">
                      <p className="avocats-shimmer text-[12px] font-medium uppercase tracking-wider">{RAPPORT.etiquette}</p>
                      <p className="text-[13px] leading-normal text-[#0f0e0d]">{RAPPORT.extrait}</p>
                    </div>
                    <hr className="m-0 h-0 border-0 border-t border-[#e5e5e3]" />
                    <div className="flex items-center justify-between gap-3 px-6 py-3.5">
                      <div className="text-[13px] text-[#0f0e0d]">{RAPPORT.sources}</div>
                      <div className="flex flex-1 items-center gap-1.5">
                        {SOURCES.map((Icone, i) => (
                          <span key={i} className="inline-grid h-5 w-5 place-items-center rounded-full bg-[#f2f1f0] text-[#0f0e0d]">
                            <Icone className="h-3 w-3" strokeWidth={1.75} aria-hidden="true" />
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                  <Halo rayon="0.5rem" />
                </div>
                <div className="flex items-center justify-center gap-8 py-1 text-white">
                  <MoveDown className="h-6 w-6" strokeWidth={1.75} aria-hidden="true" />
                  <MoveUp className="h-6 w-6" strokeWidth={1.75} aria-hidden="true" />
                </div>
                <div className="relative">
                  <div className="relative flex items-start gap-3 rounded-lg bg-[#fafaf9] p-4 shadow-sm ring-1 ring-black/[0.06]">
                    <div className="grid h-8 w-8 shrink-0 place-items-center rounded-md bg-[#f2f1f0] text-[#0f0e0d]">
                      <ScrollText className="h-4 w-4" strokeWidth={1.75} aria-hidden="true" />
                    </div>
                    <div className="flex min-w-0 flex-col gap-0.5">
                      <h3 className="text-balance text-[13px] font-medium leading-normal text-[#0f0e0d]">{RAPPORT.journal.titre}</h3>
                      <p className="text-[13px] leading-normal text-[#524f49]">{RAPPORT.journal.texte}</p>
                    </div>
                  </div>
                  <Halo rayon="0.5rem" />
                </div>
              </div>
            </div>
          </div>
          <div className="col-span-12 flex flex-col justify-center gap-10 md:col-span-5 md:gap-12">
            <header className="flex flex-col gap-4">
              <Amorce>{AMORCES.rapport}</Amorce>
              <Titre id="rapport-de-coherence">
                {APPEL.titreAvant}
                <br />
                {APPEL.titreMot}
              </Titre>
              <Chapo>
                {APPEL.texte} {APPEL.texteSuite}
              </Chapo>
            </header>
            <div className="flex flex-col">
              {RAPPORT.traits.map((t, i) => {
                const Icone = TRAITS[i];
                return <Trait key={t.titre} premier={i === 0} titre={t.titre} texte={t.texte} icone={<Icone className="h-4 w-4 sm:h-[18px] sm:w-[18px]" strokeWidth={1.75} aria-hidden="true" />} />;
              })}
              <div className="border-t border-[#e5e5e3] pt-6">
                <Link href={CONTACT.audit} className="inline-flex items-center justify-center rounded-lg bg-black px-6 py-3 text-sm font-medium text-white transition-colors hover:bg-[#1e2939]">
                  {APPEL.bouton}
                </Link>
              </div>
            </div>
          </div>
        </div>
      </Conteneur>
      <ul className="sr-only">
        <li>
          {RAPPORT.titre} : {RAPPORT.extrait}
        </li>
      </ul>
    </section>
  );
}
