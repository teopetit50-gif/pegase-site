import type { Metadata } from "next";
import { Inter, Inter_Tight, JetBrains_Mono, Plus_Jakarta_Sans } from "next/font/google";
import { Analytics } from "@vercel/analytics/next";
import TrackWhatsApp from "@/components/TrackWhatsApp";
import "./globals.css";
import { SITE_URL } from "@/lib/site";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });
const jbmono = JetBrains_Mono({ subsets: ["latin"], variable: "--font-jbmono" });

/* 25/07 — deux familles ajoutées pour /offres uniquement (Teo : reproduire à
   l'identique la page de référence). Plus Jakarta Sans porte tous les titres,
   Inter Tight tout le corps de texte. Elles ne sont PAS posées sur <body> :
   seule la classe `.offres` les consomme, le reste du site garde Inter. */
const jakarta = Plus_Jakarta_Sans({ subsets: ["latin"], variable: "--font-jakarta" });
const interTight = Inter_Tight({ subsets: ["latin"], variable: "--font-inter-tight" });

/* 01/08 — ramenée sous ~160 caractères : Google tronquait l'ancienne (278). */
const DESCRIPTION =
  "Douze moteurs d'automatisation branchés sur vos outils — mail, tableur, WhatsApp — sous votre validation. Audit gratuit de 30 minutes, Chèque TIC vérifié.";

export const metadata: Metadata = {
  /* 30/07 — `metadataBase` est ce qui transforme les chemins relatifs des
     images Open Graph en URL absolues. Sans lui, l'image générée par
     app/opengraph-image.tsx n'est pas résolue et les aperçus de partage
     restent vides — précisément sur WhatsApp, devenu le canal principal. */
  metadataBase: new URL(SITE_URL),
  title: "Omega — Automatisation pour les TPE des Antilles",
  description: DESCRIPTION,
  openGraph: {
    type: "website",
    locale: "fr_FR",
    siteName: "Omega",
    title: "Omega — Automatisation pour les TPE des Antilles",
    description: DESCRIPTION,
    url: SITE_URL,
  },
  twitter: {
    card: "summary_large_image",
    title: "Omega — Automatisation pour les TPE des Antilles",
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
      className={`${inter.variable} ${jbmono.variable} ${jakarta.variable} ${interTight.variable} antialiased`}
    >
      {/* Vercel Web Analytics — sans cookie, donc pas de bandeau consentement.
          Le script ne collecte qu'une fois « Web Analytics » activé sur le
          projet Vercel (dashboard → pegase-site → Analytics → Enable). */}
      <body>
        {children}
        <Analytics />
        <TrackWhatsApp />
      </body>
    </html>
  );
}
