import { Clock, FileText, FolderInput, UserRoundCheck, type LucideIcon } from "lucide-react";
import Apparition from "./Apparition";
import { Bloc, BoutonLien } from "./Trame";
import { DEMARRAGE } from "./textes";

/* ══════════════════════════════════════════════════════════════════════
   Le démarrage (« [Crystal Studio] Prototype, test, and deploy voice apps
   in one place », balisage.txt ligne 659 : à gauche un surtitre entre
   crochets, un titre, un texte et un bouton ; à droite quatre cartes à
   icône). Les classes sont celles de la référence, dans l'ordre du DOM.

   Écarts :
   · le retour à la ligne du titre ne vaut qu'à partir de `sm` : à 390 px
     « Nous préparons le démarrage » (27 signes, comme leur première
     ligne) dépasse les 324 px utiles de 9 px, et le titre prendrait trois
     lignes au lieu de deux ;
   · leurs icônes « Solar » pleines à deux tons (Iconify) → celles de
     lucide, déjà dans le site, avec un fond à 20 % pour le deuxième ton.
   ══════════════════════════════════════════════════════════════════════ */

const ICONES: Record<string, LucideIcon> = {
  audit: Clock,
  documents: FileText,
  donnees: FolderInput,
  comptable: UserRoundCheck,
};

export function Demarrage() {
  return (
    <Bloc id="demarrage">
      <div className="flex flex-col gap-8 lg:flex-row lg:items-start lg:justify-between lg:gap-16">
        <Apparition className="max-w-md px-4 pt-8 md:px-8 md:pt-12 lg:px-12 lg:pt-14">
          <p className="ge-surtitre mb-3">[{DEMARRAGE.surtitre}]</p>
          <h2 className="ge-h2">
            {DEMARRAGE.titre[0]}
            <br className="hidden sm:block" /> {DEMARRAGE.titre[1]}
          </h2>
          <p className="ge-desc mt-4">{DEMARRAGE.texte}</p>
          <div className="mt-8">
            <BoutonLien bouton={DEMARRAGE.bouton} petit />
          </div>
        </Apparition>
        <ul className="grid flex-1 grid-cols-1 gap-px bg-stone-200 sm:grid-cols-2 lg:border-l lg:border-stone-200">
          {DEMARRAGE.cartes.map((c, i) => {
            const I = ICONES[c.cle] ?? Clock;
            return (
              <li key={c.cle} className="flex">
                <Apparition
                  duree={0.4}
                  retard={0.08 * i}
                  marge={60}
                  className="group flex flex-1 flex-col gap-3 rounded-[10px] bg-white p-6 transition-colors hover:bg-stone-100"
                >
                  <div className="flex h-10 w-10 items-center justify-center rounded-[10px] bg-stone-50">
                    <I
                      className="h-6 w-6 text-[#403630]"
                      fill="currentColor"
                      fillOpacity={0.2}
                      strokeWidth={1.6}
                      aria-hidden="true"
                    />
                  </div>
                  <h3 className="text-base font-medium text-stone-900">{c.titre}</h3>
                  <p className="text-sm leading-relaxed text-stone-500">{c.texte}</p>
                </Apparition>
              </li>
            );
          })}
        </ul>
      </div>
    </Bloc>
  );
}
