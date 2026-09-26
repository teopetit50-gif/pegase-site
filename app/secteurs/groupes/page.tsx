import type { Metadata } from "next";
import PageShell from "@/components/PageShell";
import { serifAvocats } from "@/app/_polices/serif";
import Heros from "@/components/secteurs/groupes/Heros";
import Chiffres from "@/components/secteurs/groupes/Chiffres";
import Securite from "@/components/secteurs/groupes/Securite";
import Methode from "@/components/secteurs/groupes/Methode";
import Etapes from "@/components/secteurs/groupes/Etapes";
import Fin from "@/components/secteurs/groupes/Fin";
import "./groupes.css";
import "./mobile.css";
import SeCombine from "@/components/secteurs/SeCombine";

/* ══════════════════════════════════════════════════════════════════════
   /secteurs/groupes — Varelo, le point du matin des grands groupes (nom
   de travail). Jusqu'au 25/09/2026 au soir : Namolu, à
   /secteurs/distribution, pour les seuls groupes de distribution. Teo l'a
   renommé et élargi : le produit « est censé tout faire », pour un groupe
   à plusieurs sociétés et plusieurs pôles. L'ancienne adresse redirige
   ici (next.config.ts).

   Mise en page v2 du 24/09 : décalque de la page d'accueil de
   concurrence.com, aux couleurs et aux polices d'Omega. Le relevé, les
   conversions et les écarts sont en tête de ./groupes.css ; les textes et
   ce qui n'est pas repris de la référence, dans
   components/secteurs/groupes/textes.ts.

   Les blocs, dans l'ordre de la référence :
    1 carte blanche : hero, visuel animé, bandeau des pôles       Heros
    2 bande sombre : trois chiffres, lumières, problèmes          Chiffres
    3 carte blanche : sécurité, pôles du groupe                   Securite
    4 bande sombre 2 : méthode (01-03), sources                   Methode
    5 carte blanche : étapes (01-04), faits ; lumières dessous    Etapes
    6 carte blanche : pilote, territoires, modules, appel         Fin
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
      <div className={`p-groupes ${serifAvocats.variable}`}>
        <div className="bg-[var(--nm-bande-2)]">
          <div className="bg-[var(--nm-bande)]">
            <Heros />
            <Chiffres />
          </div>
        </div>
        <Securite />
        <Methode />
        <Etapes />
        <Fin />
      </div>
      <SeCombine slug="groupes" />
    </PageShell>
  );
}
