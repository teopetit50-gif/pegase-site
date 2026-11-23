import { Bot } from "lucide-react";
import Apparition from "./Apparition";
import { Bloc, BoutonLien } from "./Trame";
import { APPEL } from "./textes";

/* ══════════════════════════════════════════════════════════════════════
   L'appel final de /gestion (« Start building with Crystal today »,
   balisage.txt ligne 1520 : un titre, deux cartes à bouton, puis le
   bandeau « We're hiring! »). Les classes sont celles de la référence,
   dans l'ordre du DOM.

   CE QUI EST REMPLACÉ : « We're hiring! » et son étoile → les quatre
   agents et leur lien, dans le même bandeau.

   Écarts :
   · chez eux la carte de gauche porte le bouton à filet et celle de
     droite le bouton plein ; ici l'audit, l'action principale, vient en
     premier, à gauche comme en haut sur téléphone ;
   · le titre du bandeau est un <h3> (un <p> chez eux) ;
   · leur icône « star » de Solar → le robot de lucide, au même format
     (28 × 40 px, #403630).
   ══════════════════════════════════════════════════════════════════════ */

export function Appel() {
  const b = APPEL.bandeau;
  return (
    <Bloc id="commencer">
      <div className="flex flex-col gap-6 px-4 py-8 md:px-8 md:py-12 lg:flex-row lg:items-center lg:justify-between lg:gap-10 lg:px-12 lg:py-14">
        <Apparition className="flex min-w-0 flex-col gap-3">
          <h2 className="ge-h2">{APPEL.titre}</h2>
        </Apparition>
      </div>
      <div className="grid grid-cols-1 gap-px border-t border-stone-200 bg-stone-200 md:grid-cols-2">
        {APPEL.cartes.map((c, i) => (
          <Apparition
            key={c.fort}
            y={20}
            retard={0.1 * i}
            className="flex h-full flex-col items-start gap-6 bg-white px-6 py-10 md:gap-7 md:px-12 md:py-12"
          >
            <p className="text-xl leading-snug text-stone-900">
              <span className="font-medium">{c.fort}</span> <span className="text-stone-500">{c.texte}</span>
            </p>
            <div className="mt-auto">
              <BoutonLien bouton={c.bouton} />
            </div>
          </Apparition>
        ))}
      </div>
      <Apparition
        marge={60}
        className="flex flex-col items-start gap-6 border-t border-stone-200 bg-stone-100/70 px-6 py-8 md:px-12 lg:flex-row lg:items-center lg:justify-between lg:gap-10"
      >
        <div className="min-w-0">
          <div className="flex flex-col items-start gap-2 md:flex-row md:items-center md:gap-4">
            <div className="flex items-center gap-2">
              <h3 className="ge-h2">{b.titre}</h3>
              <Bot
                className="h-7 w-10 shrink-0 text-[#403630]"
                fill="currentColor"
                fillOpacity={0.2}
                strokeWidth={1.6}
                aria-hidden="true"
              />
            </div>
            <p className="leading-snug text-stone-700">{b.texte}</p>
          </div>
        </div>
        <div className="shrink-0">
          <BoutonLien bouton={b.bouton} />
        </div>
      </Apparition>
    </Bloc>
  );
}
