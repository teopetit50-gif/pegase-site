/* ══════════════════════════════════════════════════════════════════════
   Tamila sur le dessin Radius — « Vos outils restent en place »
   (11/11/2026)

   La section « Integrations » du modèle : tête (amorce, titre sur deux
   lignes), trois cartes 4:3 sur le fond en caractères :
   1. le fil de messages (fenêtre décalée, comme au « pourquoi ») ;
   2. la carte de demande (rayon 1rem, texte, pilule « Tamila », flèche
      noire), centrée ;
   3. la grille des outils : deux rangées de carrés blancs, voilées en
      ellipse (`mask-image: radial-gradient`) — six outils (CONNEXIONS,
      textes.ts) en 3 + 3 au lieu de 4 + 4 logos, chacun avec son
      pictogramme lucide (aucun logo tiers, règle maison).
   Les mots : CONNEXIONS.titre ; les trois cartes, le fil et la demande :
   radius.ts (phrases de FORMULES.inclut, données de POINT).
   ══════════════════════════════════════════════════════════════════════ */
import { ArrowUp, Briefcase, CalendarDays, Download, FolderOpen, Hash, Mail, ScanLine } from "lucide-react";
import { Glyphe } from "./marque";
import { AMORCES, OUTILS } from "./radius";
import { CONNEXIONS } from "./textes";
import { Amorce, Conteneur, Fil, Halo, SECTION, Titre, Visuel } from "./ui";

const PICTOS = [Mail, CalendarDays, FolderOpen, Briefcase, ScanLine, Download];

function Carte({ titre, texte, children }: { titre: string; texte: string; children: React.ReactNode }) {
  return (
    <article className="flex flex-col gap-6 sm:gap-8">
      <Visuel arrondi={false}>{children}</Visuel>
      <div className="flex flex-col gap-2 sm:gap-3">
        <h3 className="text-balance text-lg font-normal leading-[1.2] text-[#0f0e0d] sm:text-xl md:text-2xl">{titre}</h3>
        <p className="text-sm leading-normal text-[#524f49] sm:text-base">{texte}</p>
      </div>
    </article>
  );
}

export default function Outils() {
  const [c1, c2, c3] = OUTILS.cartes;
  const [mots1, mots2] = CONNEXIONS.titre.split(" restent ");
  return (
    <section id="outils" data-monde="clair" className={SECTION} aria-labelledby="outils-titre">
      <Conteneur>
        <header className="mb-10 flex flex-col gap-4 sm:mb-12 md:mb-16">
          <Amorce>{AMORCES.outils}</Amorce>
          <Titre id="outils-titre">
            {mots1}
            <br />
            restent {mots2}
          </Titre>
        </header>
        <div className="grid grid-cols-1 gap-10 sm:gap-12 md:grid-cols-2 lg:grid-cols-3 lg:gap-12">
          <Carte titre={c1.titre} texte={c1.texte}>
            <div className="absolute bottom-[-1.5rem] left-8 right-[-1.5rem] top-8 sm:left-10 sm:top-10 md:left-12 md:top-12">
              <div className="relative h-full w-full">
                <Fil titre={OUTILS.fil.titre} messages={OUTILS.fil.messages} icone={<Hash className="h-3.5 w-3.5 text-[#0f0e0d]" aria-hidden="true" />} />
                <Halo rayon="0.5rem" />
              </div>
            </div>
          </Carte>
          <Carte titre={c2.titre} texte={c2.texte}>
            <div className="absolute inset-0 flex items-center justify-center p-6 sm:p-8 md:p-10">
              <div className="relative w-full max-w-[22rem]">
                <div className="pointer-events-none relative flex flex-col rounded-2xl bg-[#fafaf9] shadow-sm">
                  <div className="px-4 pb-2 pt-4">
                    <p className="text-sm text-[#0f0e0d]">{OUTILS.demande}</p>
                  </div>
                  <div className="flex items-center justify-between gap-3 px-2 pb-2">
                    <div className="inline-flex items-center gap-1.5 rounded-full border border-[#e5e5e3] px-2 py-0.5">
                      <Glyphe className="size-4 text-[#0f0e0d]" />
                      <span className="text-[11px] font-medium text-[#0f0e0d]">Tamila</span>
                    </div>
                    <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#0f0e0d] text-[#fafaf9]">
                      <ArrowUp className="h-4 w-4" aria-hidden="true" />
                    </span>
                  </div>
                </div>
                <Halo rayon="1rem" />
              </div>
            </div>
          </Carte>
          <Carte titre={c3.titre} texte={c3.texte}>
            <div
              className="absolute inset-0 flex flex-col items-center justify-center gap-4 sm:gap-5 md:gap-6"
              style={{ WebkitMaskImage: "radial-gradient(ellipse at center, black 40%, transparent 95%)", maskImage: "radial-gradient(ellipse at center, black 40%, transparent 95%)" }}
            >
              {[CONNEXIONS.outils.slice(0, 3), CONNEXIONS.outils.slice(3)].map((rangee, r) => (
                <div key={r} className="flex gap-4 sm:gap-5 md:gap-6">
                  {rangee.map((o, i) => {
                    const Icone = PICTOS[r * 3 + i];
                    return (
                      <div key={o} className="relative" aria-label={o}>
                        <div className="relative grid h-11 w-11 place-items-center rounded-lg bg-white text-[#0f0e0d] shadow-sm sm:h-12 sm:w-12 md:h-14 md:w-14">
                          <Icone className="h-6 w-6" strokeWidth={1.75} aria-hidden="true" />
                        </div>
                        <Halo rayon="0.5rem" />
                      </div>
                    );
                  })}
                </div>
              ))}
            </div>
          </Carte>
        </div>
      </Conteneur>
    </section>
  );
}
