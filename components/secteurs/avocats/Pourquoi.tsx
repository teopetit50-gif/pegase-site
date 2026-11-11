/* ══════════════════════════════════════════════════════════════════════
   Tamila sur le dessin Radius — « Pourquoi Tamila ? » (11/11/2026)

   La section « Why Radius? » du modèle : tête sur douze colonnes (amorce,
   titre sur cinq, chapô sur six à partir de la septième), puis trois
   cartes 4:3 sur le fond en caractères, chacune avec sa fenêtre :
   1. le fil « arrivées » (carte 1 de FONCTIONNALITES, textes.ts) ;
   2. la liste « chronologie » (carte 2) ;
   3. la grille de six pictogrammes (les familles de pièces, PIECES).
   Le modèle posait la grille d'icônes en premier et la liste en dernier ;
   l'ordre suit ici celui des cartes de Tamila. Mots : radius.ts.
   ══════════════════════════════════════════════════════════════════════ */
import { FileSignature, FileText, FileWarning, Hash, ListChecks, Microscope, ScanLine } from "lucide-react";
import { AMORCES, CHRONOLOGIE, FIL_ARRIVEES, POURQUOI } from "./radius";
import { FONCTIONNALITES } from "./textes";
import { Amorce, Chapo, Conteneur, Fil, Halo, SECTION, Titre, Visuel } from "./ui";

const PICTOS = [FileText, ListChecks, FileWarning, Microscope, FileSignature, ScanLine];

function Carte({ titre, texte, children }: { titre: string; texte: string; children: React.ReactNode }) {
  return (
    <article className="flex flex-col gap-6 sm:gap-8">
      <Visuel>{children}</Visuel>
      <div className="flex flex-col gap-2 sm:gap-3">
        <h3 className="text-balance text-lg font-normal leading-[1.2] text-[#0f0e0d] sm:text-xl md:text-2xl">{titre}</h3>
        <p className="text-sm leading-normal text-[#524f49] sm:text-base">{texte}</p>
      </div>
    </article>
  );
}

/* la fenêtre décalée vers le bas et la droite, avec son halo */
function Fenetre({ children }: { children: React.ReactNode }) {
  return (
    <div className="absolute bottom-[-1.5rem] left-8 right-[-1.5rem] top-8 sm:left-10 sm:top-10 md:left-12 md:top-12">
      {children}
      <Halo rayon="0.5rem" />
    </div>
  );
}

export default function Pourquoi() {
  const [c1, c2] = FONCTIONNALITES.cartes;
  return (
    <section id="fonctionnalites" data-monde="clair" className={SECTION} aria-labelledby="pourquoi-tamila">
      <Conteneur>
        <header className="mb-12 grid grid-cols-12 gap-x-4 gap-y-4 sm:mb-16 sm:gap-x-6 md:mb-20 md:gap-x-8">
          <Amorce className="col-span-12">{AMORCES.pourquoi}</Amorce>
          <Titre id="pourquoi-tamila" className="col-span-12 md:col-span-5">
            {POURQUOI.titre}
          </Titre>
          <Chapo className="col-span-12 md:col-span-6 md:col-start-7">{POURQUOI.texte}</Chapo>
        </header>
        <div className="grid grid-cols-1 gap-10 sm:gap-12 md:grid-cols-2 lg:grid-cols-3 lg:gap-12">
          <Carte titre={c1.titre} texte={c1.texte}>
            <Fenetre>
              <Fil titre={FIL_ARRIVEES.titre} messages={FIL_ARRIVEES.messages} icone={<Hash className="h-3.5 w-3.5 text-[#0f0e0d]" aria-hidden="true" />} />
            </Fenetre>
          </Carte>
          <Carte titre={c2.titre} texte={c2.texte}>
            <Fenetre>
              <div className="grid h-full grid-rows-[auto_1fr] overflow-hidden rounded-tl-lg bg-[#fafaf9] shadow-sm ring-1 ring-white/60">
                <div className="flex items-center justify-between gap-2 border-b border-[#e5e5e3] px-3 py-2">
                  <h4 className="text-[11px] font-medium text-[#0f0e0d] sm:text-xs md:text-sm">{CHRONOLOGIE.titre}</h4>
                </div>
                <div className="flex flex-col">
                  {CHRONOLOGIE.faits.map((f, i) => (
                    <div key={f.date} className={`mx-3 flex items-center gap-3 p-3 ${i < CHRONOLOGIE.faits.length - 1 ? "border-b border-[#e5e5e3]" : ""}`}>
                      <div className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-[#f2f1f0] text-[#0f0e0d]">
                        <FileText className="h-3.5 w-3.5" strokeWidth={1.75} aria-hidden="true" />
                      </div>
                      <div className="flex min-w-0 flex-col">
                        <h5 className="text-[11px] font-medium leading-normal text-[#0f0e0d] sm:text-xs md:text-sm">
                          {f.date} · {f.fait}
                        </h5>
                        <p className="text-[10px] leading-normal text-[#524f49] sm:text-[11px] md:text-xs">{f.source}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </Fenetre>
          </Carte>
          <Carte titre={POURQUOI.pieces.titre} texte={POURQUOI.pieces.texte}>
            <div className="absolute inset-0 flex items-center justify-center p-8 sm:p-10 md:p-12">
              <div className="grid grid-cols-3 gap-4 sm:gap-5 md:gap-6">
                {PICTOS.map((Icone, i) => (
                  <div key={i} className="relative grid aspect-square w-10 place-items-center rounded-lg bg-white text-[#0f0e0d] shadow-sm sm:w-12 md:w-14">
                    <Icone className="h-2/5 w-2/5" aria-hidden="true" />
                    <Halo rayon="0.5rem" />
                  </div>
                ))}
              </div>
            </div>
          </Carte>
        </div>
      </Conteneur>
    </section>
  );
}
