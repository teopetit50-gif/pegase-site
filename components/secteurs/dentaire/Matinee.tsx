/* ══════════════════════════════════════════════════════════════════════
   « De l'annulation au fauteuil occupé » (#workflow) — quatre cases en
   grille 2 × 2 dans un cadre arrondi, chacune avec sa petite maquette :
   le relevé de 6 h 45, le créneau repris (onde verte), la semaine des
   plans (cases qui s'allument tour à tour), et Tiroma entre l'agenda et
   les fauteuils (flèches qui battent). Les animations de ces maquettes
   sont les boucles `lp3-*` que la page de référence injectait au montage,
   renommées `dentaire-*` dans dentaire.css.

   RHABILLAGE DU 24/09 : le titre partage sa rangée avec une vraie photo,
   l'accueil du cabinet, et une carte d'annulation posée dessus (Photos.tsx).

   Fond `bg-slate-50` de la source : un gris bleuté très clair, pas une
   surface sombre. `dark:` retirés, dont les `dark:bg-black/20` des
   maquettes.
   ══════════════════════════════════════════════════════════════════════ */
import { ArrowRight, CircleCheck } from "lucide-react";
import type { ReactNode } from "react";
import Apparition from "./Apparition";
import { CarteAnnulation, PHOTOS, PhotoCarte } from "./Photos";
import { Surtitre } from "./Surtitre";
import { ETAPES } from "./textes";

const CADRE_MAQUETTE = "rounded-xl border border-slate-200 bg-slate-50 text-xs";

function Releve() {
  return (
    <div className={`${CADRE_MAQUETTE} overflow-hidden`}>
      <div className="flex items-center justify-between border-b border-slate-200 px-4 py-2 text-slate-400">
        <span>Relevé de 6 h 45 · exemple</span>
        <span className="text-emerald-600">prêt</span>
      </div>
      {[
        ["Rendez-vous du jour, 3 fauteuils", "41"],
        ["Plans signés sans rendez-vous", "12"],
        ["Annulations depuis hier soir", "2"],
      ].map(([libelle, nombre]) => (
        <div
          key={libelle}
          className="flex items-center justify-between border-b border-slate-200/70 px-4 py-2 text-slate-600"
        >
          <span>{libelle}</span>
          <span className="font-mono">{nombre}</span>
        </div>
      ))}
      <div className="dentaire-lueur-ligne flex items-center justify-between bg-[#f3f8f7] px-4 py-2.5 font-semibold text-slate-900">
        <span>Décisions pour ce matin</span>
        <span className="font-mono">3</span>
      </div>
    </div>
  );
}

function CreneauRepris() {
  return (
    <div className={`${CADRE_MAQUETTE} flex items-center gap-3 p-4`}>
      <div className="relative h-9 w-9 shrink-0">
        <span className="dentaire-onde absolute inset-0 rounded-full bg-emerald-400/50" />
        <div className="relative flex h-9 w-9 items-center justify-center rounded-full bg-emerald-100">
          <CircleCheck size={18} className="text-emerald-600" />
        </div>
      </div>
      <div>
        <div className="font-medium text-slate-700">Créneau de 10 h 30 repris</div>
        <div className="text-slate-400">Mme R. a confirmé → agenda à jour</div>
      </div>
    </div>
  );
}

const SEMAINE = ["LUN", "MAR", "MER", "JEU"];
const CASES = ["Couronne", "Couronne", "", "Implant", "", "Bridge", "Bridge", "", "Racine", "", "Aligneurs", "Aligneurs"];

function SemaineDesPlans() {
  return (
    <div className={`${CADRE_MAQUETTE} grid grid-cols-4 gap-1.5 p-3`}>
      {SEMAINE.map((jour) => (
        <div key={jour} className="mb-1 text-center text-[10px] text-slate-400">
          {jour}
        </div>
      ))}
      {CASES.map((soin, i) => (
        <div
          key={i}
          style={soin ? { animationDelay: `${0.2 * i}s` } : undefined}
          className={`h-7 rounded-md ${soin ? "dentaire-lueur-case flex items-center justify-center truncate border border-[#a0ccc3] bg-[#e3f0ed] px-1 text-[9px] text-[#30635a]" : ""}`}
        >
          {soin}
        </div>
      ))}
    </div>
  );
}

function Pastille({ children }: { children: ReactNode }) {
  return <span className="rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-slate-500">{children}</span>;
}

function EntreDeux() {
  return (
    <div className={`${CADRE_MAQUETTE} flex flex-wrap items-center justify-center gap-2 p-4`}>
      <Pastille>Agenda</Pastille>
      <Pastille>Présences</Pastille>
      <ArrowRight size={14} className="dentaire-pouls text-[#72b0a4]" style={{ animationDelay: "0s" }} />
      <span className="dentaire-lueur-pastille rounded-lg bg-[#3b7a6e] px-2.5 py-1.5 font-semibold text-white">Tiroma</span>
      <ArrowRight size={14} className="dentaire-pouls text-[#72b0a4]" style={{ animationDelay: "0.5s" }} />
      <Pastille>Fauteuils</Pastille>
      <Pastille>Objectif</Pastille>
    </div>
  );
}

/* L'ordre des cases, dans celui des ÉTAPES (textes.ts). La source leur
   donnait aussi une icône qu'elle n'affichait jamais : non reprise. */
const MAQUETTES: { cle: string; Maquette: () => ReactNode }[] = [
  { cle: "releve", Maquette: Releve },
  { cle: "creneau", Maquette: CreneauRepris },
  { cle: "semaine", Maquette: SemaineDesPlans },
  { cle: "tiroma", Maquette: EntreDeux },
];

export default function Matinee() {
  return (
    <section id="workflow" data-monde="clair" className="bg-slate-50 py-24 lg:py-32">
      <div className="mx-auto max-w-[1400px] px-6 lg:px-12">
        <div className="mb-16 grid grid-cols-1 items-center gap-10 lg:mb-24 lg:grid-cols-[1fr_0.95fr] lg:gap-16">
        <Apparition className="max-w-3xl">
          <Surtitre>Votre matinée</Surtitre>
          <h2 className="mb-6 text-3xl text-slate-900 lg:text-5xl">De l&apos;annulation au fauteuil occupé</h2>
          <p className="text-lg text-slate-600">
            Tiroma suit ce qui se passe entre deux rendez-vous, sans changer de logiciel et sans double saisie.
          </p>
        </Apparition>
        <Apparition delay={150}>
          <PhotoCarte
            src={`${PHOTOS}/accueil-du-cabinet.jpg`}
            alt="À l'accueil du cabinet, une assistante répond à une patiente"
            position="60% 40%"
            carte={<CarteAnnulation />}
            placeCarte="left-3 bottom-3 sm:left-5 sm:bottom-5"
          />
        </Apparition>
        </div>
        <div className="relative grid grid-cols-1 overflow-hidden rounded-3xl border border-slate-200 bg-white md:grid-cols-2">
          {MAQUETTES.map(({ cle, Maquette }, i) => {
            const droite = i % 2 === 1;
            const derniereRangee = i >= MAQUETTES.length - 2;
            return (
              <Apparition key={cle} delay={120 * i}>
                <div
                  className={`relative h-full border-slate-200 p-8 lg:p-12 ${!droite ? "md:border-r" : ""} ${i !== MAQUETTES.length - 1 ? "border-b" : ""} ${derniereRangee ? "md:border-b-0" : ""}`}
                >
                  <div className="relative">
                    <div className="mb-8 lg:mb-10">
                      <Maquette />
                    </div>
                    <h3 className="mb-3 text-2xl text-slate-900 lg:text-3xl">{ETAPES[i].titre}</h3>
                    <p className="leading-relaxed text-slate-600">{ETAPES[i].texte}</p>
                  </div>
                </div>
              </Apparition>
            );
          })}
        </div>
      </div>
    </section>
  );
}
