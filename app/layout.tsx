import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Analytics } from "@vercel/analytics/next";
import Header from "@/components/Header";
import LenisRoot from "@/components/LenisRoot";
import "./globals.css";
import "./polices.css";
import "./echelle-mobile.css";
import { SITE_URL } from "@/lib/site";

/* ══ UNE SEULE FAMILLE — 16/09/2026 ═══════════════════════════════════
   Le site portait six familles sans + trois monos, empilées page par page
   au fil des décalques (Inter, Inter Tight, Plus Jakarta Sans, DM Sans,
   Hanken Grotesk, Figtree — JetBrains Mono, DM Mono, Space Mono). Teo, en
   comparant l'accueil à scale.ai : « modifie notre police avec la leur, et
   ça pour tout le site ».

   scale.com est composé en Aeonik Pro, sous licence commerciale : ni
   servable depuis leurs fichiers, ni achetable à leur place. GEIST est le
   substitut libre le plus proche, et ce n'est pas un jugement à l'œil —
   « The Best In The Business » à 40 px / -0.01em fait 440 px dans la
   référence ; douze familles libres ont été mesurées sur la même chaîne :
     Familjen Grotesk 408 · Inter Tight 422 · Hanken Grotesk 431
     Figtree 432 · ARCHIVO 442 · Instrument Sans 446 · GEIST 447
     Manrope 450 · Public Sans 453 · Onest 456 · Schibsted 461
   Geist tombe à +1,6 % et c'est, parmi les trois plus proches en largeur,
   celle dont le squelette colle le mieux — grotesque neutre, barre du 'e'
   horizontale, terminaisons coupées droit. Teo l'avait déjà validée à
   l'œil sur /offres le matin même. Geist Mono fait la paire, comme Aeonik
   Mono chez eux.

   Les ~240 règles `font-family: var(--font-X)` du site ne sont PAS
   réécrites : app/polices.css fait pointer les anciens noms de variables
   sur ces deux-là. Revenir en arrière = rendre ses imports à ce fichier et
   supprimer app/polices.css.

   Les deux familles sont préchargées : elles servent TOUTES les pages, ce
   qui n'était le cas d'aucune des neuf d'avant (d'où le `preload: false`
   qu'elles portaient toutes sauf Inter et JetBrains Mono).
   ═══════════════════════════════════════════════════════════════════════ */
const geist = Geist({ subsets: ["latin"], variable: "--font-geist" });
const geistMono = Geist_Mono({ subsets: ["latin"], variable: "--font-geist-mono" });

/* 01/08 — ramenée sous ~160 caractères : Google tronquait l'ancienne (278). */
const DESCRIPTION =
  "Des systèmes qui connectent vos directions, vos outils et vos données, sous validation humaine, sans changer votre environnement. Diagnostic de 30 minutes offert.";

export const metadata: Metadata = {
  /* 30/07 — `metadataBase` est ce qui transforme les chemins relatifs des
     images Open Graph en URL absolues. Sans lui, l'image générée par
     app/opengraph-image.tsx n'est pas résolue et les aperçus de partage
     restent vides — précisément sur WhatsApp, devenu le canal principal. */
  metadataBase: new URL(SITE_URL),
  title: "Omega.AI | Systèmes métiers, automatisation et intégration",
  description: DESCRIPTION,
  openGraph: {
    type: "website",
    locale: "fr_FR",
    siteName: "Omega.AI",
    title: "Omega.AI | Systèmes métiers, automatisation et intégration",
    description: DESCRIPTION,
    url: SITE_URL,
  },
  twitter: {
    card: "summary_large_image",
    title: "Omega.AI | Systèmes métiers, automatisation et intégration",
    description: DESCRIPTION,
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="fr"
      className={`${geist.variable} ${geistMono.variable} antialiased`}
    >
      {/* Vercel Web Analytics — sans cookie, donc pas de bandeau consentement.
          Le script ne collecte qu'une fois « Web Analytics » activé sur le
          projet Vercel (dashboard → pegase-site → Analytics → Enable). */}
      <body>
        {/* 01/09 — transitions de page : le Header et Lenis vivent ICI, hors
            du sous-arbre de page, et survivent aux navigations. Avant, chaque
            page les remontait (barre noire d'une image, inertie perdue). */}
        <LenisRoot />
        <Header />
        {children}
        <Analytics />
        {/* 15/09/2026 — <TrackWhatsApp /> retiré. Il comptait les clics sur
            les liens wa.me ; il n'en reste aucun sur le site depuis le
            14/09, donc il écoutait chaque clic de chaque page pour un
            sélecteur qui ne peut plus rien attraper. Le fichier
            components/TrackWhatsApp.tsx est supprimé avec lui — c'était
            la dernière trace de WhatsApp dans le code servi. */}
      </body>
    </html>
  );
}
