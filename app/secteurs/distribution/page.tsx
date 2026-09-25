import type { Metadata } from "next";
import PageShell from "@/components/PageShell";
import { serifAvocats } from "@/app/_polices/serif";
import Heros from "@/components/secteurs/distribution/Heros";
import Chiffres from "@/components/secteurs/distribution/Chiffres";
import Securite from "@/components/secteurs/distribution/Securite";
import Methode from "@/components/secteurs/distribution/Methode";
import Etapes from "@/components/secteurs/distribution/Etapes";
import Fin from "@/components/secteurs/distribution/Fin";
import "./distribution.css";
import "./mobile.css";

/* ══════════════════════════════════════════════════════════════════════
   /secteurs/distribution — Namolu, le produit des groupes de distribution
   d'outre-mer (nom de travail). v2 du 24/09/2026 au soir : décalque de la
   page d'accueil de concurrence.com, aux couleurs et aux polices d'Omega.
   La v1 (décalque de toolio.com) a été refusée par Teo et supprimée.

   Le relevé, les conversions de couleurs et de polices et les écarts
   sont en tête de ./distribution.css ; les textes et ce qui n'est pas
   repris de la référence, dans components/secteurs/distribution/textes.ts.

   Les blocs, dans l'ordre de la référence :
    1 carte blanche : hero, visuel animé, bandeau des métiers   Heros
    2 bande sombre : trois chiffres, lumières, problèmes          Chiffres
    3 carte blanche : sécurité, enseignes                         Securite
    4 bande sombre 2 : méthode (01-03), sources                   Methode
    5 carte blanche : étapes (01-04), faits ; lumières dessous    Etapes
    6 carte blanche : pilote, territoires, modules, appel         Fin
   Entête et pied : ceux d'Omega (PageShell).
   ══════════════════════════════════════════════════════════════════════ */

const TITRE = "Namolu · le point du matin des groupes de distribution";
const DESCRIPTION =
  "Chaque matin, Namolu lit les ventes, les stocks et les conteneurs en mer d'un groupe de distribution d'outre-mer, et dit quoi commander, quoi faire venir par avion, quoi transférer d'une île à l'autre et quoi démarquer. Conçu par Omega.";

export const metadata: Metadata = {
  title: `${TITRE} | Omega.AI`,
  description: DESCRIPTION,
  alternates: { canonical: "/secteurs/distribution" },
  openGraph: {
    type: "website",
    locale: "fr_FR",
    siteName: "Omega.AI",
    title: TITRE,
    description: DESCRIPTION,
    url: "/secteurs/distribution",
    images: ["/opengraph-image"],
  },
  twitter: { card: "summary_large_image", title: TITRE, description: DESCRIPTION },
};

export default function PageDistribution() {
  return (
    <PageShell>
      <div className={`p-distribution ${serifAvocats.variable}`}>
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
    </PageShell>
  );
}
