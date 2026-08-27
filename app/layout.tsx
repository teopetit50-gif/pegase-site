import type { Metadata } from "next";
import {
  DM_Mono,
  DM_Sans,
  Hanken_Grotesk,
  Inter,
  Inter_Tight,
  JetBrains_Mono,
  Plus_Jakarta_Sans,
} from "next/font/google";
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

/* 05/08 — DM Sans, uniquement pour le hero de la home (Teo : cloner à
   l'identique le hero du template Flux, qu'il a acheté). C'est la famille du
   titre de la référence, et son dessin géométrique se voit au premier coup
   d'œil sur un H1 de 60 px — reprendre les métriques sans la police aurait
   donné « presque pareil ». Comme jakarta/interTight, elle n'est PAS posée sur
   <body> : seul `.o-flux-h1` la consomme. */
/* 06/08 — DM Sans sert aussi /tarifs, refaite sur le même template Flux :
   les deux pages se répondent, et il n'y a donc aucune famille à charger
   en plus pour elle. (Figtree et Space Mono, ajoutées le 05/08 pour la
   grille de prix clonée de Synth AI, sont reparties avec elle.) */
const dmSans = DM_Sans({ subsets: ["latin"], variable: "--font-dm-sans" });

/* 07/08 — deux familles pour /vos-donnees uniquement (Teo : reproduire à
   l'identique scale.com/public-sector). La référence est composée en Aeonik,
   une police sous licence commerciale : on ne peut ni la servir depuis leurs
   fichiers ni l'acheter à leur place. Hanken Grotesk est le remplaçant le
   plus proche parmi les fontes libres — même squelette de grotesque
   géométrique, même hauteur d'x, 'g' à un étage, 'y' à queue droite. DM Mono
   porte les étiquettes de section, qui sont bien en monospace dans la
   référence. Comme les familles de /offres, elles ne sont PAS posées sur
   <body> : seul le bloc `.vd` de globals.css les consomme. */
const hanken = Hanken_Grotesk({ subsets: ["latin"], variable: "--font-hanken" });
const dmMono = DM_Mono({
  subsets: ["latin"],
  weight: ["400"],
  variable: "--font-dm-mono",
});

/* 01/08 — ramenée sous ~160 caractères : Google tronquait l'ancienne (278). */
const DESCRIPTION =
  "Douze moteurs d'automatisation branchés sur vos outils (mail, tableur, WhatsApp), sous votre validation. Audit gratuit de 30 minutes, Chèque TIC vérifié.";

export const metadata: Metadata = {
  /* 30/07 — `metadataBase` est ce qui transforme les chemins relatifs des
     images Open Graph en URL absolues. Sans lui, l'image générée par
     app/opengraph-image.tsx n'est pas résolue et les aperçus de partage
     restent vides — précisément sur WhatsApp, devenu le canal principal. */
  metadataBase: new URL(SITE_URL),
  title: "Omega.AI, Automatisation pour les petites entreprises",
  description: DESCRIPTION,
  openGraph: {
    type: "website",
    locale: "fr_FR",
    siteName: "Omega.AI",
    title: "Omega.AI, Automatisation pour les petites entreprises",
    description: DESCRIPTION,
    url: SITE_URL,
  },
  twitter: {
    card: "summary_large_image",
    title: "Omega.AI, Automatisation pour les petites entreprises",
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
      className={`${inter.variable} ${jbmono.variable} ${jakarta.variable} ${interTight.variable} ${dmSans.variable} ${hanken.variable} ${dmMono.variable} antialiased`}
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
