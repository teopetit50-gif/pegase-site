import type { Metadata } from "next";
import { omega, omegaMono } from "./_polices";
import { Analytics } from "@vercel/analytics/next";
import Header from "@/components/Header";
import LenisRoot from "@/components/LenisRoot";
import PixelMeta from "@/components/pub/PixelMeta";
import Consentement from "@/components/pub/Consentement";
import "./globals.css";
import "./polices.css";
import "./echelle-mobile.css";
import { SITE_URL } from "@/lib/site";

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
      className={`${omega.variable} ${omegaMono.variable} antialiased`}
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
        {/* 21/09/2026 — pixel Meta pour la pub en ligne, derrière le bandeau
            de consentement. Sans NEXT_PUBLIC_META_PIXEL_ID, les deux rendent
            null (lib/pixel.ts). */}
        <PixelMeta />
        <Consentement />
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
