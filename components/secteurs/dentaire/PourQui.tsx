/* ══════════════════════════════════════════════════════════════════════
   « Pour quels cabinets ? » (#use-cases) — trois cartes : cabinet de 2 à
   3 fauteuils, cabinet de groupe, centre dentaire. Au survol, la carte
   monte de 4 px, une lueur s'allume dans son coin et l'icône prend la
   teinte de la carte. Le pied de carte est un FAIT de conception (« Prêt
   chaque jour à 7 h »), à la place du chiffre de performance d'un
   gabarit commercial. `dark:` retirés.

   RHABILLAGE DU 24/09 : le titre partage sa rangée avec une salle de soins
   (fauteuil vert d'eau) et la carte de charge d'un fauteuil (Photos.tsx).
   ══════════════════════════════════════════════════════════════════════ */
import { CircleCheck } from "lucide-react";
import Apparition from "./Apparition";
import { CarteFauteuil, PHOTOS, PhotoCarte } from "./Photos";
import { Surtitre } from "./Surtitre";
import { CABINETS } from "./textes";

export default function PourQui() {
  return (
    <section id="use-cases" data-monde="clair" className="bg-white py-24 lg:py-32">
      <div className="mx-auto max-w-[1400px] px-6 lg:px-12">
        <div className="mb-16 grid grid-cols-1 items-center gap-10 lg:mb-24 lg:grid-cols-[1fr_1.1fr] lg:gap-16">
          <Apparition className="max-w-3xl">
            <Surtitre>Pour qui</Surtitre>
            <h2 className="text-3xl text-slate-900 lg:text-5xl">Pour quels cabinets ?</h2>
          </Apparition>
          <Apparition delay={150}>
            <PhotoCarte
              src={`${PHOTOS}/salle-de-soins.jpg`}
              alt="Une salle de soins claire, fauteuil vert d'eau prêt pour le patient suivant"
              position="50% 55%"
              carte={<CarteFauteuil />}
              placeCarte="right-3 top-3 sm:right-5 sm:top-5"
            />
          </Apparition>
        </div>
        <div className="grid grid-cols-1 gap-16 lg:grid-cols-3 lg:gap-24">
          {CABINETS.map(({ Icone, titre, texte, points, fait, lueur, fondIcone, couleurIcone }, i) => (
            <Apparition key={titre} delay={120 * i}>
              <div className="group relative h-full overflow-hidden rounded-xl border border-slate-200 bg-white p-8 transition-all duration-300 hover:-translate-y-1 hover:border-[#c7e1db] hover:shadow-xl hover:shadow-[#e3f0ed]/20">
                <div
                  className={`absolute -right-10 -top-10 h-32 w-32 rounded-full opacity-0 blur-2xl transition-opacity duration-300 group-hover:opacity-100 ${lueur}`}
                />
                <div
                  className={`relative mb-6 flex h-12 w-12 items-center justify-center rounded-xl bg-slate-100 transition-colors duration-300 ${fondIcone}`}
                >
                  <Icone size={24} className={`text-slate-700 transition-colors duration-300 ${couleurIcone}`} />
                </div>
                <h3 className="mb-3 text-xl text-slate-900">{titre}</h3>
                <p className="mb-6 leading-relaxed text-slate-600">{texte}</p>
                <ul className="mb-8 space-y-3">
                  {points.map((p) => (
                    <li key={p} className="flex items-start gap-3 text-sm text-slate-600">
                      <CircleCheck size={16} className="mt-0.5 shrink-0 text-[#3b7a6e]" />
                      {p}
                    </li>
                  ))}
                </ul>
                <div className="border-t border-slate-100 pt-6 text-xl font-bold text-[#3b7a6e]">{fait}</div>
              </div>
            </Apparition>
          ))}
        </div>
      </div>
    </section>
  );
}
