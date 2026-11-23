import { CheckCheck } from "lucide-react";
import Apparition from "./Apparition";
import { Bloc, BoutonLien } from "./Trame";
import { OFFRE } from "./textes";

/* ══════════════════════════════════════════════════════════════════════
   Ce que vous recevez, en cinq colonnes (la grille des cinq formules de la
   référence, balisage.txt ligne 905 : Free $0, Creator $15, Pro $59,
   Scale $349, Enterprise « Custom »). Les classes sont celles de la
   référence, dans l'ordre du DOM.

   CE QUI EST REMPLACÉ (règles maison : aucun montant inventé). Le prix
   d'Omega est sur devis, arrêté pendant l'audit : la grande valeur de
   chaque colonne est donc un fait (30 minutes d'audit offert, 6 modules,
   4 agents, 7 modules métier) et non un prix ; la dernière colonne garde
   leur forme « Enterprise / Custom » : « Sur mesure / Sur devis ».

   Écarts :
   · LA CASE VIDE ENTRE 768 ET 1279 px. Cinq colonnes sur deux rangs
     laissent une case sans contenu : chez eux elle montre le gris du
     fond (#e7e5e4), comme un trou. Ici une case blanche la remplit ;
   · le bouton plein va à l'audit, le bouton à filet aux tarifs et aux
     agents : la variante suit l'action, pas le rang de la colonne ;
   · leur icône « check-read » de Solar → un carré de 14 px au même ton
     et la double coche de lucide.
   ══════════════════════════════════════════════════════════════════════ */

export function Offre() {
  return (
    <Bloc id="offre">
      <h2 className="sr-only">Ce que vous recevez</h2>
      <div className="grid grid-cols-1 gap-px bg-stone-200 md:grid-cols-2 xl:grid-cols-5">
        {OFFRE.map((c, i) => (
          <Apparition key={c.nom} y={20} duree={0.4} retard={0.06 * i} marge={60} className="flex flex-col bg-white">
            <div className="flex flex-1 flex-col gap-6 px-6 py-8 md:px-7 md:py-10">
              <div className="space-y-4">
                <h3 className="text-xs font-semibold uppercase tracking-widest text-[#342d27]">{c.nom}</h3>
                <div className="flex items-baseline gap-2">
                  <p className="text-3xl font-medium leading-none text-stone-900 md:text-4xl">{c.valeur}</p>
                  {c.suffixe ? <span className="whitespace-nowrap text-sm text-stone-500">{c.suffixe}</span> : null}
                </div>
              </div>
              <BoutonLien bouton={c.bouton} className="w-full" />
              <div className="space-y-1.5 text-sm leading-snug text-stone-500">
                <p>{c.lignes[0]}</p>
                <p>{c.lignes[1]}</p>
              </div>
              <div className="space-y-3 border-t border-stone-200 pt-6">
                {c.intertitre ? <p className="text-sm font-medium text-stone-900">{c.intertitre}</p> : null}
                <ul className="space-y-2">
                  {c.points.map((p) => (
                    <li key={p} className="flex items-start gap-2 text-sm leading-snug text-stone-500">
                      <span
                        className="mt-1 flex h-3.5 w-3.5 shrink-0 items-center justify-center rounded-[4px] bg-[#403630]/40 text-[#403630]"
                        aria-hidden="true"
                      >
                        <CheckCheck className="h-2.5 w-2.5" strokeWidth={3} />
                      </span>
                      <span>{p}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </Apparition>
        ))}
        <div className="hidden bg-white md:block xl:hidden" aria-hidden="true" />
      </div>
    </Bloc>
  );
}
