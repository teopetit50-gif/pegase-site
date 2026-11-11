/* ══════════════════════════════════════════════════════════════════════
   Tamila sur le dessin Radius — le bandeau (11/11/2026)

   Le « logo cloud » du modèle : une bande filetée haut et bas, une piste
   qui défile de droite à gauche (marquee-left 22 s, avocats.css), chaque
   logo à 60 % et en gris, deux fois la même liste pour la boucle. Pas de
   logos inventés (règle maison) : à leur place, les neuf familles de
   pièces que Tamila lit (PIECES.familles, textes.ts), chacune avec son
   pictogramme lucide, à la hauteur des logos (h-5 sm:h-6).
   ══════════════════════════════════════════════════════════════════════ */
import { BookOpen, FileSignature, FileText, FileWarning, Gavel, ListChecks, Microscope, ScanLine, Stamp } from "lucide-react";
import { PIECES } from "./textes";
import { Conteneur } from "./ui";

const ICONES = [FileText, ListChecks, FileWarning, Microscope, FileSignature, Stamp, BookOpen, Gavel, ScanLine];

function Liste({ lazy = false }: { lazy?: boolean }) {
  return (
    <div className="flex items-center gap-x-10 sm:gap-x-14" aria-hidden={lazy || undefined}>
      {PIECES.familles.map((f, i) => {
        const Icone = ICONES[i % ICONES.length];
        return (
          <div key={f} className="flex items-center justify-center opacity-60 grayscale transition-opacity hover:opacity-100 hover:grayscale-0">
            <span className="flex h-5 w-auto items-center gap-2 whitespace-nowrap text-sm font-medium text-[#101828] sm:h-6 sm:text-base">
              <Icone className="h-5 w-5 shrink-0" strokeWidth={1.75} aria-hidden="true" />
              {f}
            </span>
          </div>
        );
      })}
    </div>
  );
}

export default function Bandeau() {
  return (
    <section data-monde="clair" className="w-full border-y border-[#e5e7eb]/70 bg-white py-6 sm:py-8" aria-label={`${PIECES.avant} ${PIECES.mot}`}>
      <Conteneur large>
        <div className="group relative overflow-hidden">
          <div className="avocats-bandeau flex w-max items-center gap-x-10 group-hover:[animation-play-state:paused] sm:gap-x-14">
            <Liste />
            <Liste lazy />
          </div>
          <div aria-hidden="true" className="absolute inset-0" />
        </div>
      </Conteneur>
    </section>
  );
}
