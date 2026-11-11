import type { Metadata } from "next";
import { NOM_SITE, canoniqueSecteur, sansOmega, titreSite } from "@/components/espace2/portail";
import PageShell from "@/components/PageShell";
import SeCombine from "@/components/secteurs/SeCombine";
import Heros from "@/components/secteurs/groupes/Heros";
import Enonce from "@/components/secteurs/groupes/Enonce";
import Survol from "@/components/secteurs/groupes/Survol";
import Carrousel from "@/components/secteurs/groupes/Carrousel";
import Accordeon from "@/components/secteurs/groupes/Accordeon";
import { ENONCE_0, ENONCE_1, ENONCE_2 } from "@/components/secteurs/groupes/textes";
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
    1b statement      le constat, trois paragraphes (26/09)   Enonce
    2 statement       le titre, trois paragraphes, l'assemblage d'écrans  Enonce
    3 hoverHighlights quatre entrées, l'écran de l'entrée      Survol
    4 slider          les situations types, une à la fois      Carrousel
    5 accordion       quatre éléments, l'écran de l'ouvert     Accordeon
    6 statement       le titre, trois paragraphes, deux boutons Enonce
   Entête et pied : ceux d'Omega (PageShell).

   26/09/2026 — la page met l'accent sur la centralisation de l'IA du
   groupe (Teo : « la plupart des gros groupes ne centralisent pas leur IA,
   chacun utilise la sienne »). Le bloc 1b n'existe pas chez la référence :
   c'est un second `statement`, au même dessin, sans écran.

   11/11/2026 — la page vend le produit v3 (docs/briefs-saas/varelo-v3.md) :
   le plan du groupe (une fiche par société, client, fournisseur, contrat,
   site ; les liens ; les codes de chaque logiciel rattachés), rempli en
   lecture seule, les actions possibles sur chaque fiche, les agents qui
   proposent et une personne qui décide, les quatre cas d'usage, et les
   trois jours chez le client. Même dessin, tous les textes neufs
   (components/secteurs/groupes/textes.ts).
   ══════════════════════════════════════════════════════════════════════ */

/* 11/11/2026 — brief varelo-v3 : le plan du groupe et ses agents (le modèle Foundry à l'échelle d'une ETI) */
const TITRE = "Varelo · le plan de tout le groupe, des agents qui proposent";
const DESCRIPTION =
  "Varelo dessine le plan de votre groupe, une fiche par société, client, fournisseur, contrat et site, le remplit en lecture seule depuis les logiciels de chaque société, et met des agents dessus qui proposent une action que la personne responsable valide. En trois jours sur vos vraies données, un premier cas d'usage tourne.";

export const metadata: Metadata = {
  /* 10/11/2026 — « | DALIRO » et sans « Conçu par Omega » sur le site dédié à ce métier (components/espace2/portail.ts) */
  title: titreSite(TITRE),
  description: sansOmega(DESCRIPTION),
  /* 09/11/2026 — « / » sur le site dédié à ce métier (components/espace2/portail.ts) */
  alternates: { canonical: canoniqueSecteur("groupes") },
  openGraph: {
    type: "website",
    locale: "fr_FR",
    siteName: NOM_SITE,
    title: TITRE,
    description: sansOmega(DESCRIPTION),
    url: "/secteurs/groupes",
    images: ["/opengraph-image"],
  },
  twitter: { card: "summary_large_image", title: TITRE, description: sansOmega(DESCRIPTION) },
};

export default function PageGroupes() {
  return (
    <PageShell>
      <div className="p-groupes">
        <Heros />
        {/* 10/11/2026 — les ancres de la barre du site dédié à Varelo (components/site-dedie/entetes/Varelo.tsx) */}
        <div id="principe" className="scroll-mt-16">
          <Enonce titre={ENONCE_0.titre} paragraphes={ENONCE_0.paragraphes} />
          <Enonce
            titre={ENONCE_1.titre}
            paragraphes={ENONCE_1.paragraphes}
            ecran={ENONCE_1.ecran}
          />
        </div>
        <div id="produit" className="scroll-mt-16">
          <Survol />
          <Carrousel />
        </div>
        <div id="questions" className="scroll-mt-16">
          <Accordeon />
        </div>
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
