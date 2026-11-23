import type { Metadata } from "next";
import type { ReactNode } from "react";
import { geistAccueil, geistMonoAccueil } from "../_polices/geist-accueil";
import "@/components/accueil-v3/accueil.css";
import Apparition, { GroupeApparition, MotsApparition } from "@/components/accueil/Apparition";
import ApercuGestion from "@/components/essai/ApercuGestion";
import CycleVente from "@/components/essai/CycleVente";
import FilPiece from "@/components/essai/FilPiece";
import MetiersOnglets from "@/components/essai/MetiersOnglets";
import OngletsGestion from "@/components/essai/OngletsGestion";
import { RECITS_METIERS } from "@/components/essai/recits";

/* ══════════════════════════════════════════════════════════════════════
   /essai-blocs — cinq blocs repris de 21st.dev, à juger avant de les poser

   23/11/2026 (Teo, sur planches : « Oui, pose-les »). Page de TRAVAIL :
   non référencée, liée de nulle part, absente du plan du site. Elle
   reprend l'habillage exact d'une section de l'accueil (rails, lueur,
   surtitre, titre, phrase : app/page.tsx) pour que chaque bloc se juge
   là où il irait. Les blocs vivent dans components/essai/, chacun avec
   son origine et ses écarts en tête. Trois d'entre eux sont montés sur
   l'accueil depuis le 23/11 (OngletsGestion, CycleVente, MetiersOnglets) :
   cette page peut partir, pas components/essai/.

   LE CONTENU A ÉTÉ REFAIT LE JOUR MÊME. La première version tournait
   autour des relances et des agents nommés par leur code ; Teo : « t'as
   bien vérifié ce qu'Omega est maintenant ? ». Omega est d'abord un
   logiciel de gestion : les blocs montrent une vente qui met tout à
   jour, sa trace, les modules, le tableau de bord et les modules métier. Les mots sont ceux de /gestion et de
   l'accueil, les données d'exemple celles des écrans de /gestion.

   LE SIXIÈME EST RETIRÉ. Teo, capture à l'appui (23/11) : « j'aime tout
   sauf ça ». C'était le tableau à cocher (ChoixModules, d'après
   plan-finder-pricing-table de dhxwhy) : douze lignes, quatre colonnes,
   des coches. Les cinq autres lui plaisent.
   ══════════════════════════════════════════════════════════════════════ */

export const metadata: Metadata = {
  title: "Blocs à l'essai | Omega.AI",
  robots: { index: false, follow: false },
};

const SECTIONS: { id: string; surtitre: string; titre: string; texte: string; bloc: ReactNode }[] = [
  {
    id: "vente",
    surtitre: "Bloc M · d'après Shadcn Studio",
    titre: "Une vente validée, tout se met à jour",
    texte: "Le devis devient facture, le stock sort, la banque rapproche, l'écriture passe. Sans ressaisie.",
    bloc: <CycleVente />,
  },
  {
    id: "trace",
    surtitre: "Bloc N · d'après robertlib",
    titre: "Chaque action laisse une trace",
    texte: "Qui a préparé, qui a corrigé, qui a validé, et à quelle heure.",
    bloc: (
      <div className="mx-auto w-full max-w-[600px]">
        <FilPiece />
      </div>
    ),
  },
  {
    id: "modules",
    surtitre: "Bloc A · d'après Cult UI",
    titre: "Un onglet par pan du logiciel",
    texte: "Le visiteur lit la phrase à gauche et voit l'écran se remplir à droite.",
    bloc: (
      <div className="overflow-hidden rounded-[20px] border border-white/[0.08]">
        <OngletsGestion />
      </div>
    ),
  },
  {
    id: "tableau",
    surtitre: "Bloc B · d'après felipemenezes098",
    titre: "Toute votre gestion au même endroit",
    texte: "Une information saisie une fois est à jour partout.",
    bloc: <ApercuGestion />,
  },
  {
    id: "metiers",
    surtitre: "Bloc E · d'après Hirael",
    titre: "Chaque métier a ses règles. Son module les connaît.",
    texte: "Un logo, l'objet du métier en grand, et le problème que le module règle.",
    bloc: <MetiersOnglets recits={RECITS_METIERS} />,
  },
];

export default function EssaiBlocs() {
  return (
    <div className={`aa aa-clair ${geistAccueil.variable} ${geistMonoAccueil.variable}`}>
      <main className="min-h-screen bg-[#0B0C0E]">
        <section className="relative w-full bg-neutral-950" data-section="intro">
          <div className="max-w-7xl mx-auto px-4 aa-bg-gradient border-l border-r border-white/[0.08]">
            <div className="flex flex-col items-center text-center gap-4 px-6 md:px-12 pt-16 md:pt-24 pb-12 md:pb-16 max-w-3xl mx-auto">
              <p className="text-sm font-medium text-white/55">Page de travail · non référencée</p>
              <h1 className="text-3xl md:text-5xl lg:text-6xl font-normal tracking-tight text-white leading-[1.05] text-balance">
                Cinq blocs à l&apos;essai
              </h1>
              <p className="text-base md:text-lg text-white/55 leading-relaxed max-w-xl text-balance">
                Repris de 21st.dev et remplis avec le logiciel de gestion d&apos;Omega, pour être jugés en conditions
                réelles avant d&apos;aller sur le site.
              </p>
            </div>
          </div>
        </section>

        {SECTIONS.map((section) => (
          <section key={section.id} id={section.id} className="relative w-full bg-neutral-950" data-section={section.id}>
            <div className="w-full border-t border-white/[0.08]">
              <div className="max-w-7xl mx-auto px-4 aa-bg-gradient border-l border-r border-white/[0.08]">
                <GroupeApparition
                  retard={600}
                  className="flex flex-col items-center text-center gap-4 px-6 md:px-12 pt-16 md:pt-24 pb-12 md:pb-16 max-w-3xl mx-auto"
                >
                  <Apparition as="p" className="text-sm font-medium text-white/55">
                    {section.surtitre}
                  </Apparition>
                  <h2 className="text-2xl md:text-4xl lg:text-5xl font-normal tracking-tight text-white leading-[1.05] text-balance">
                    <MotsApparition texte={section.titre} depart={80} />
                  </h2>
                  <Apparition
                    as="p"
                    delai={450}
                    className="text-base md:text-lg text-white/55 leading-relaxed max-w-xl text-balance"
                  >
                    {section.texte}
                  </Apparition>
                </GroupeApparition>
                <Apparition delai={150} className="px-2 sm:px-6 md:px-12 pb-16 md:pb-24">
                  {section.bloc}
                </Apparition>
              </div>
            </div>
          </section>
        ))}
        <div className="w-full border-t border-white/[0.08]" />
      </main>
    </div>
  );
}
