import type { Metadata } from "next";
import { Onest } from "next/font/google";
import PageShell from "@/components/PageShell";
import Metiers from "@/components/secteurs/Metiers";
import {
  Cloture,
  Faits,
  Heros,
  Ligne,
  Refus,
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

   ── RELEVÉ ─────────────────────────────────────────────────────────────
   Décalque de `daliagency-anonymized.vercel.app` (modèle « Northstar » du
   catalogue /modeles) : titre géant en clamp avec une incise à l'accent,
   étiquettes de section numérotées, grille de tuiles numérotées à filets,
   rail collant et panneaux, bande sombre pleine largeur, et une section
   « About » en deux colonnes. Relevé complet en tête de `secteurs.css`.

   ⚠ CE N'EST PAS LE PREMIER DÉCALQUE. La page était d'abord relevée sur
   « Vertex ». Teo l'a arbitrée le 15/09 : « je veux que tu changes la page
   entière avec ce design-là, exactement ». Rien de Vertex ne subsiste — ni
   jeton, ni police, ni géométrie.
   ══════════════════════════════════════════════════════════════════════ */

/* La référence compose TOUT en Onest — corps, titres et étiquettes de
   section (`--font-body` et `--font-technical` y retombent sur la même
   famille). Onest est sous licence ouverte et servie par Google Fonts : il
   n'y a donc aucun substitut à choisir, contrairement aux décalques
   précédents du site. Chargée ICI, jamais sur `<body>` : seule la classe
   `.p-secteurs` la consomme, le reste du site garde Inter. */
const onest = Onest({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  variable: "--font-onest",
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
        className={`p-secteurs flex flex-col ${onest.variable}`}
      >
        <Heros />
        <Faits />
        <Metiers />
        <Refus />
        <Ligne />
        <Cloture />
      </div>
    </PageShell>
  );
}
