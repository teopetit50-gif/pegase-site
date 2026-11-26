/* 26/11/2026 — LES ACCÈS, en petite mosaïque (Teo : « Bento Grid »
   d'Aceternity UI, via 21st.dev). Remplace le bouclier et ses cinq
   pastilles dans la carte « Des accès contrôlés à chaque niveau »
   (SxSecurite).

   Le dessin est celui de BentoGridItem (registre public d'Aceternity) :
   carte blanche à filet, icône, titre, une ligne de texte, et le contenu
   qui glisse de 8 px au survol. Sans @tabler/icons-react ni `cn` : les
   icônes sont celles de lucide, déjà dans le dépôt. Les cinq cartes sont
   les cinq pastilles d'avant, et leurs phrases reprennent ce que la page
   dit déjà. */

import { Download, FilePen, ScrollText, UserCheck, Users } from "lucide-react";
import type { LucideIcon } from "lucide-react";

type Tuile = { Icone: LucideIcon; titre: string; texte: string; haute?: boolean };

const TUILES: Tuile[] = [
  {
    Icone: UserCheck,
    titre: "Validation humaine",
    texte: "Une personne nommée valide chaque action d'agent avant qu'elle parte.",
    haute: true,
  },
  { Icone: FilePen, titre: "Brouillons", texte: "Les agents préparent, vous tranchez." },
  { Icone: ScrollText, titre: "Journal", texte: "Qui a validé quoi, et quand." },
  { Icone: Users, titre: "Un compte par personne", texte: "Des droits par rôle." },
  { Icone: Download, titre: "Export complet", texte: "Vos données, en entier." },
];

export default function SecuriteAcces() {
  return (
    <div className="grid w-[min(100%,380px)] grid-cols-2 gap-2.5">
      {TUILES.map(({ Icone, titre, texte, haute }) => (
        <div
          key={titre}
          className={`group/bento flex flex-col justify-end rounded-xl border border-[#e6e6e1] bg-white p-3.5 text-[#171717] shadow-[0_1px_2px_rgba(0,0,0,0.04)] transition duration-200 hover:shadow-[0_12px_24px_-14px_rgba(0,0,0,0.22)] ${
            haute ? "row-span-2 justify-between bg-[linear-gradient(180deg,#ffffff,#f5f5f2)]" : ""
          }`}
        >
          {haute && (
            /* l'en-tête de la grande tuile : la marque, comme le « header »
               des cartes d'Aceternity */
            <span className="flex h-full min-h-[72px] items-center justify-center">
              <span className="flex size-14 items-center justify-center rounded-2xl border border-[#e6e6e1] bg-white shadow-[0_6px_14px_-8px_rgba(0,0,0,0.25)]">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src="/logo-pegase.png" alt="" className="size-7" aria-hidden="true" />
              </span>
            </span>
          )}
          <div className="transition duration-200 group-hover/bento:translate-x-2">
            <Icone className="size-4 text-[#3d3d3d]" strokeWidth={1.8} aria-hidden="true" />
            <div className="mt-1.5 text-[12.5px] font-semibold leading-tight">{titre}</div>
            <div className="mt-1 text-[11.5px] leading-snug text-[#84877f]">{texte}</div>
          </div>
        </div>
      ))}
    </div>
  );
}
