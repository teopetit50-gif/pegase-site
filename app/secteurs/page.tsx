import type { Metadata } from "next";
import { Geist, Geist_Mono, Gelasio } from "next/font/google";
import PageShell from "@/components/PageShell";
import Metiers from "@/components/secteurs/Metiers";
import {
  Cadrage,
  Cloture,
  Faits,
  Hachure,
  Heros,
  SurMesure,
} from "@/components/secteurs/Sections";
import "./secteurs.css";

/* ══════════════════════════════════════════════════════════════════════
   /secteurs — les métiers que nous connaissons (15/09/2026)

   POURQUOI CETTE PAGE EXISTE. Le contenu sectoriel était déjà écrit, mais
   éparpillé et inatteignable : neuf cas étiquetés par secteur sur
   l'accueil (`lib/cas-accueil.tsx`), quatre à cinq onglets métier enterrés
   au milieu de chaque page produit, et 873 lignes de galères métier dans
   `OMEGA/plans-et-decisions/galeres-metier-par-secteur.md` qui n'étaient
   jamais sorties du dépôt. Un visiteur qui vient par son métier n'avait
   aucune porte d'entrée.

   CE QU'ELLE N'EST PAS. Ce n'est pas un doublon de `/offres` : elle est
   ORTHOGONALE. On y entre par le métier, on en sort par le système. Chaque
   panneau se termine donc sur un ou deux boutons produit — c'est le seul
   travail que la page a à faire.

   CE QU'ELLE NE DIT PAS. « Peu importe votre secteur, nous savons faire. »
   C'est la version que tout le monde écrit, et elle est invérifiable : une
   page qui dit « tous les métiers » ne dit aucun métier. D'où douze métiers
   nommés, une galère précise pour chacun, et une section qui dit à voix
   haute ceux que nous ne prenons pas — l'officine, le cabinet de soins, le
   dépannage d'urgence, dont toute la charge arrive par la voix.

   ── RELEVÉ ET POLICES ──────────────────────────────────────────────────
   Décalque de `vertex-one-lovat.vercel.app` (modèle « Vertex » du
   catalogue /modeles) : grille à filets tiretés, croix aux intersections,
   bandes hachurées. Relevé complet en tête de `secteurs.css`.

   Les trois familles sont chargées ICI, jamais sur `<body>` : seule la
   classe `.p-secteurs` les consomme, le reste du site garde Inter. Geist
   et Geist Mono sont celles de la référence ; Gelasio remplace la
   « Tiempos Headline » sous licence sur laquelle la référence retombe
   elle-même en Georgia — même arbitrage que /offres/relances-impayes.
   ══════════════════════════════════════════════════════════════════════ */

const geist = Geist({ subsets: ["latin"], variable: "--font-geist", display: "swap" });
const geistMono = Geist_Mono({
  subsets: ["latin"],
  variable: "--font-geist-mono",
  display: "swap",
});
const gelasio = Gelasio({
  subsets: ["latin"],
  weight: ["600", "700"],
  variable: "--font-gelasio",
  display: "swap",
});

const TITRE = "Les métiers que nous connaissons";
const DESCRIPTION =
  "Douze métiers, ce qui leur échappe et ce que nos systèmes y prennent : garages, bâtiment, négoce, transport, restauration, cabinets, syndics, formation, optique, traiteurs, concessions, après-vente.";

export const metadata: Metadata = {
  title: `${TITRE} | Omega.AI`,
  description: DESCRIPTION,
  alternates: { canonical: "/secteurs" },
  openGraph: {
    type: "website",
    locale: "fr_FR",
    siteName: "Omega.AI",
    title: TITRE,
    description: DESCRIPTION,
    url: "/secteurs",
  },
  twitter: { card: "summary_large_image", title: TITRE, description: DESCRIPTION },
};

export default function SecteursPage() {
  return (
    <PageShell>
      <div
        data-monde="clair"
        className={`p-secteurs flex flex-col ${geist.variable} ${geistMono.variable} ${gelasio.variable}`}
      >
        {/* LES DOUBLES RAILS de la référence : un premier `border-x` sur le
            conteneur, un second à l'intérieur décalé de 4 / 6 / 8 px selon
            le palier. Ils courent sur toute la hauteur et ferment les filets
            horizontaux des sections, qui sans eux s'arrêteraient dans le
            vide. Relevé sur `<main><div class="container mx-auto"><div
            class="border-x"><div class="mx-1 border-x sm:mx-1.5 lg:mx-2">`. */}
        <div className="sec-wrap">
          <div className="border-[#e6e6e6] border-x">
            <div className="mx-1 border-[#e6e6e6] border-x sm:mx-1.5 lg:mx-2">
              <Heros />
              <Faits />
              <Cadrage />
              <Hachure />
              <Metiers />
              <Hachure />
              <SurMesure />
              <Cloture />
            </div>
          </div>
        </div>
      </div>
    </PageShell>
  );
}
