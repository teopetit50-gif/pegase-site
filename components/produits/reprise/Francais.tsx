import { PenLine, ShieldCheck } from "lucide-react";
import { LogoFrance, DrapeauFrance } from "./France";
import { FRANCAIS as F } from "@/lib/produits/reprise";
import { Cadre, TitreSection } from "./Cadre";

/* Écart assumé : la référence n'a pas cette section. Teo l'impose, et elle a
   sa raison d'être — une TPE française qui confie son fichier client veut
   savoir où il va. Elle reprend la grammaire du bandeau de chiffres (fond
   hachuré, cadre à filets, cellules séparées par des hairlines) pour ne pas
   ressembler à une pièce rapportée, et gagne une icône par cellule : c'est
   aussi une respiration visuelle dans une page devenue très écrite. */

/* `source` (FileCheck2) illustrait « source officielle française », c'est-à-dire
   le bulletin des marchés publics : la clé est tombée avec lui le 15/09. Ce qui
   la remplace est `langue` — les relances sont écrites en français. */
const ICONES = {
  editeur: LogoFrance,
  langue: PenLine,
  donnees: ShieldCheck,
} as const;

/* Trame relevée telle quelle. Sa jumelle `dark:[background-image:…]` est
   retirée : la page est figée dans son monde clair. */
const HACHURE =
  "bg-[size:10px_10px] [background-image:repeating-linear-gradient(315deg,rgba(0,0,0,0.1)_0_1px,#0000_0_50%)]";

export function Francais() {
  return (
    <section id="france" data-monde="clair" className="scroll-mt-20">
      <Cadre className="relative w-full">
        <div className="flex flex-col gap-5 border-[#d9d9d9] border-b px-6 py-12 md:px-16 md:py-16">
          {/* Le drapeau est posé AU-DESSUS du titre, à sa taille réelle : c'est
              la première chose qu'on doit voir de la section. */}
          <DrapeauFrance />
          <TitreSection titre={F.titre} suite={F.suite} />
        </div>
        <div className={`relative ${HACHURE}`}>
          <div className="mx-6 border-r border-l bg-[#f5f5f5] md:mx-16">
            <div className="relative z-10 grid grid-cols-1 divide-y divide-[#d9d9d9] sm:grid-cols-3 sm:divide-x sm:divide-y-0">
              {F.cellules.map((c) => {
                const Icone = ICONES[c.icone];
                return (
                  <div key={c.titre} className="flex flex-col gap-3 p-6 md:p-10">
                    <Icone
                      className="size-5 text-[#0a0a0a]/70"
                      strokeWidth={1.75}
                      aria-hidden="true"
                    />
                    <p className="font-medium text-[#0a0a0a]">{c.titre}</p>
                    <p className="text-[#737373] text-sm leading-relaxed">
                      {c.texte}
                    </p>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </Cadre>
    </section>
  );
}
