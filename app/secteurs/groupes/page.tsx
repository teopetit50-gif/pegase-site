import type { Metadata } from "next";
import PageShell from "@/components/PageShell";
import SeCombine from "@/components/secteurs/SeCombine";
import Heros from "@/components/secteurs/groupes/Heros";
import Enonce from "@/components/secteurs/groupes/Enonce";
import Survol from "@/components/secteurs/groupes/Survol";
import Carrousel from "@/components/secteurs/groupes/Carrousel";
import Accordeon from "@/components/secteurs/groupes/Accordeon";
import { ENONCE_1, ENONCE_2 } from "@/components/secteurs/groupes/textes";
import "./groupes.css";
import "./mobile.css";

/* ══════════════════════════════════════════════════════════════════════
   /secteurs/groupes — Varelo, le point du matin des grands groupes (nom
   de travail). Jusqu'au 25/09/2026 au soir : Namolu, à
   /secteurs/distribution, pour les seuls groupes de distribution. Teo l'a
   renommé et élargi : le produit « est censé tout faire », pour un groupe
   à plusieurs sociétés et plusieurs pôles. L'ancienne adresse redirige
   ici (next.config.ts).

   Mise en page v3 du 25/09 au soir : décalque 1:1 de
   https://payload-marketing-v1.21st.app/ (le gabarit « Payload marketing »
   de 21st.dev), passé en blanc. Teo : « je préfère un truc fait à
   l'identique plutôt qu'un truc fait à 80 % », puis « le SaaS référence
   est noir, je veux qu'il soit blanc (Omega) ». La v2 (concurrence.com)
   et la v1 (toolio.com) sont remplacées.

   Le relevé, la table des couleurs et les écarts sont en tête de
   ./groupes.css ; les textes et les écrans, dans
   components/secteurs/groupes/textes.ts ; la fabrique des écrans, dans
   outils/ecrans-varelo/.

   Les blocs, dans l'ordre de la référence :
    1 hero            le verre animé, le texte, deux écrans   Heros
    2 statement       le titre, l'assemblage d'écrans          Enonce
    3 hoverHighlights quatre entrées, l'écran de l'entrée      Survol
    4 slider          les situations types, une à la fois      Carrousel
    5 accordion       quatre éléments, l'écran de l'ouvert     Accordeon
    6 statement       le titre, trois paragraphes, deux boutons Enonce
   Entête et pied : ceux d'Omega (PageShell).
   ══════════════════════════════════════════════════════════════════════ */

const TITRE = "Varelo · le point du matin des grands groupes";
const DESCRIPTION =
  "Chaque matin, Varelo lit les logiciels et les tableurs de toutes les sociétés d'un groupe et dit à chaque direction ce qu'elle doit décider : contrats, baux, sinistres, livraisons, reportings et trésorerie. Conçu par Omega.";

export const metadata: Metadata = {
  title: `${TITRE} | Omega.AI`,
  description: DESCRIPTION,
  alternates: { canonical: "/secteurs/groupes" },
  openGraph: {
    type: "website",
    locale: "fr_FR",
    siteName: "Omega.AI",
    title: TITRE,
    description: DESCRIPTION,
    url: "/secteurs/groupes",
    images: ["/opengraph-image"],
  },
  twitter: { card: "summary_large_image", title: TITRE, description: DESCRIPTION },
};

export default function PageGroupes() {
  return (
    <PageShell>
      <div className="p-groupes">
        <Heros />
        <Enonce titre={ENONCE_1.titre} ecran={ENONCE_1.ecran} />
        <Survol />
        <Carrousel />
        <Accordeon />
        <Enonce
          titre={ENONCE_2.titre}
          paragraphes={ENONCE_2.paragraphes}
          boutons={ENONCE_2.boutons}
        />
      </div>
      <SeCombine slug="groupes" />
    </PageShell>
  );
}
