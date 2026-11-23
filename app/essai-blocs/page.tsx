import type { Metadata } from "next";
import type { ReactNode } from "react";
import { geistAccueil, geistMonoAccueil } from "../_polices/geist-accueil";
import "@/components/accueil-v3/accueil.css";
import { SITUATIONS } from "@/components/accueil-v3/textes";
import Apparition, { GroupeApparition, MotsApparition } from "@/components/accueil/Apparition";
import ApercuRecouvrement from "@/components/essai/ApercuRecouvrement";
import CycleFacture from "@/components/essai/CycleFacture";
import FilFacture from "@/components/essai/FilFacture";
import MetiersOnglets, { type Recit } from "@/components/essai/MetiersOnglets";
import OngletsAgents from "@/components/essai/OngletsAgents";
import TrouveOffre from "@/components/essai/TrouveOffre";

/* ══════════════════════════════════════════════════════════════════════
   /essai-blocs — six blocs repris de 21st.dev, à juger avant de les poser

   23/11/2026 (Teo, sur planches : « Oui, pose-les »). Page de TRAVAIL :
   non référencée, liée de nulle part, absente du plan du site. Elle
   reprend l'habillage exact d'une section de l'accueil (rails, lueur,
   surtitre, titre, phrase : app/page.tsx) pour que chaque bloc se juge
   là où il irait. Les blocs vivent dans components/essai/, chacun avec
   son origine et ses écarts en tête ; supprimer ce dossier et celui-ci
   supprime tout.
   ══════════════════════════════════════════════════════════════════════ */

export const metadata: Metadata = {
  title: "Blocs à l'essai | Omega.AI",
  robots: { index: false, follow: false },
};

/* Le grand chiffre de chaque onglet est un FAIT DE CONCEPTION déjà écrit
   sur le site (cadence de relance, lecture seule, devis avant de
   commencer), jamais une performance. Le texte, lui, vient de SITUATIONS. */
const FAITS: Record<string, Pick<Recit, "chiffre" | "libelle" | "note" | "href" | "lien" | "logo" | "logoBlanc">> = {
  CASHD: {
    chiffre: "J+3",
    libelle: "première relance, puis J+7 et J+21",
    note: "Aucun envoi sans votre validation",
    href: "/offres/relances-impayes",
    lien: "Voir CASHD",
    logo: "/logos/cashd-lockup.png",
    logoBlanc: true,
  },
  REPUT: {
    chiffre: "21\u00a0h",
    libelle: "la réponse est rédigée aussitôt",
    note: "Demandes reçues par mail et WhatsApp",
    href: "/offres/demandes-clients",
    lien: "Voir REPUT",
    logo: "/logos/reput-lockup.png",
    logoBlanc: true,
  },
  FILED: {
    chiffre: "1\u00a0clic",
    libelle: "pour valider une pièce déjà lue et contrôlée",
    note: "Classée par fournisseur, transmise à la comptabilité",
    href: "/offres/factures-fournisseurs",
    lien: "Voir FILED",
    logo: "/logos/filed-lockup.png",
    logoBlanc: true,
  },
  Daliro: {
    chiffre: "1\u00a0dossier",
    libelle: "par chantier, du premier appel au décompte final",
    note: "Devis, avenants, situations de travaux",
    href: "/secteurs/btp",
    lien: "Voir Daliro",
    logo: "/logos/daliro-lockup.png",
  },
  Varelo: {
    chiffre: "0\u00a0écriture",
    libelle: "dans vos logiciels : tout se lit, rien ne s'y modifie",
    note: "La direction décide de chaque action",
    href: "/secteurs/groupes",
    lien: "Voir Varelo",
    logo: "/logos/varelo-lockup.png",
  },
  "Sur mesure": {
    chiffre: "1\u00a0devis",
    libelle: "écrit avant de commencer",
    note: "Ce que fait le module, et son prix",
    href: "/offres/sur-mesure",
    lien: "Voir le sur-mesure",
  },
};

const RECITS: Recit[] = SITUATIONS.filter((situation) => FAITS[situation.nom]).map((situation) => ({
  id: situation.nom.toLowerCase().replace(/\s+/g, "-"),
  nom: situation.nom,
  texte: situation.texte,
  role: situation.role,
  ...FAITS[situation.nom],
}));

const SECTIONS: { id: string; surtitre: string; titre: string; texte: string; bloc: ReactNode }[] = [
  {
    id: "cycle",
    surtitre: "Bloc M · d'après Shadcn Studio",
    titre: "De la relance à l'encaissement, sous vos yeux",
    texte: "L'agent rédige, vous validez, le client règle. Chaque étape se voit.",
    bloc: <CycleFacture />,
  },
  {
    id: "trace",
    surtitre: "Bloc N · d'après robertlib",
    titre: "Chaque action laisse une trace",
    texte: "Qui a rédigé, qui a corrigé, qui a validé, et à quelle heure.",
    bloc: (
      <div className="mx-auto w-full max-w-[600px]">
        <FilFacture />
      </div>
    ),
  },
  {
    id: "agents",
    surtitre: "Bloc A · d'après Cult UI",
    titre: "Un onglet par agent, et ce qu'il prépare",
    texte: "Le visiteur lit la phrase à gauche et voit le travail se faire à droite.",
    bloc: (
      <div className="overflow-hidden rounded-[20px] border border-white/[0.08]">
        <OngletsAgents />
      </div>
    ),
  },
  {
    id: "recouvrement",
    surtitre: "Bloc B · d'après felipemenezes098",
    titre: "Tous vos impayés au même endroit",
    texte: "Encours, relances et paiements se mettent à jour seuls.",
    bloc: <ApercuRecouvrement />,
  },
  {
    id: "metiers",
    surtitre: "Bloc E · d'après Hirael",
    titre: "Chaque métier a ses règles. Son module les connaît.",
    texte: "Un logo, un fait en grand, et la situation qu'il règle.",
    bloc: <MetiersOnglets recits={RECITS} />,
  },
  {
    id: "palier",
    surtitre: "Bloc G · d'après dhxwhy",
    titre: "Cochez vos besoins, le palier se désigne",
    texte: "Le visiteur choisit ce qu'il veut confier. Le montant, lui, s'écrit à l'audit.",
    bloc: <TrouveOffre />,
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
                Six blocs à l&apos;essai
              </h1>
              <p className="text-base md:text-lg text-white/55 leading-relaxed max-w-xl text-balance">
                Repris de 21st.dev et remplis avec les cas d&apos;Omega, pour être jugés en conditions réelles avant
                d&apos;aller sur le site.
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
