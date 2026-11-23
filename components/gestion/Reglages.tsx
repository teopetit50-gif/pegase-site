import Lien from "@/components/Lien";
import Apparition from "./Apparition";
import { Bloc, BoutonLien } from "./Trame";
import { EcranOnglet } from "./visuels";
import { REGLAGES } from "./textes";

/* ══════════════════════════════════════════════════════════════════════
   Les réglages par l'IA (« Everything you need to ship voice AI »,
   balisage.txt ligne 443 : un titre, un texte, un bouton, puis deux cartes
   produit à grand visuel). Les classes sont celles de la référence, dans
   l'ordre du DOM.

   LE VISUEL DES CARTES. Chez eux deux petites animations (une onde qui
   devient du texte, du texte qui devient un son) dans un cadre de 256 px
   de haut (224 px sous md), sur un dégradé et une trame de points. Ici le
   même cadre, le même fond, et un écran de visuels.tsx : la conversation
   avec l'IA, puis le plan comptable. L'écran est plus haut que le cadre :
   il en dépasse par le bas et s'y fond (`ge-fondu-bas`, leur masque
   `scroll-fade-b`), comme une capture posée dans une carte.

   Écarts :
   · la catégorie et la flèche de la carte sont en stone-500, pas en
     stone-400 (2,6:1 sur blanc) ;
   · leur bouton est un <span> dans un <a> : ici le lien porte les classes ;
   · chaque carte reste un lien entier, comme chez eux ; il mène à l'audit.
   ══════════════════════════════════════════════════════════════════════ */

/* leurs deux fonds de carte, dans l'ordre */
const FONDS = ["from-stone-50 via-stone-100 to-stone-200/70", "from-[#f6f5f5] via-stone-50 to-stone-100"];

export function Reglages() {
  return (
    <Bloc id="reglages">
      <div className="flex flex-col gap-6 px-4 py-8 md:px-8 md:py-12 lg:flex-row lg:items-center lg:justify-between lg:gap-10 lg:px-12 lg:py-14">
        <Apparition className="flex min-w-0 flex-col gap-3">
          <h2 className="ge-h2">
            {REGLAGES.titre[0]} <span className="text-[#342d27]">{REGLAGES.titre[1]}</span>
          </h2>
          <p className="ge-desc max-w-xl">
            <span className="font-medium text-stone-900">{REGLAGES.fort}</span> {REGLAGES.suite}
          </p>
        </Apparition>
        <Apparition retard={0.1} className="shrink-0">
          <BoutonLien bouton={REGLAGES.bouton} petit />
        </Apparition>
      </div>
      <div className="grid grid-cols-1 gap-px border-t border-stone-200 bg-stone-200 md:grid-cols-2">
        {REGLAGES.cartes.map((c, i) => (
          <Apparition key={c.id} y={20} retard={0.1 * i} className="bg-white">
            <Lien
              href={c.href}
              className="group flex h-full flex-col outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#4b4038]/40"
            >
              {/* dans un lien, l'écran est un décor : le lien se lit à son titre et à son texte */}
              <div className="relative h-56 w-full overflow-hidden md:h-64" aria-hidden="true">
                <div className={`relative h-full w-full overflow-hidden bg-gradient-to-br ${FONDS[i % FONDS.length]}`}>
                  <div className="ge-pointille absolute inset-0 opacity-40" />
                  <div className="ge-fondu-bas absolute inset-0 px-6 pt-6 sm:px-8">
                    <div className="mx-auto w-full max-w-md">
                      <EcranOnglet id={c.id} />
                    </div>
                  </div>
                </div>
              </div>
              <div className="space-y-3 p-6">
                <div className="flex items-center gap-2 text-lg font-medium leading-tight">
                  <span className="text-[#342d27]">{c.nom}</span>
                  <span className="text-stone-500">{c.categorie}</span>
                  <span
                    className="text-stone-500 transition-transform duration-200 group-hover:translate-x-0.5"
                    aria-hidden="true"
                  >
                    →
                  </span>
                </div>
                <p className="text-sm leading-snug text-stone-500">{c.texte}</p>
              </div>
            </Lien>
          </Apparition>
        ))}
      </div>
    </Bloc>
  );
}
