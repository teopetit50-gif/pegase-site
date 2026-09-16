import type { Metadata } from "next";
import {
  DM_Mono,
  DM_Sans,
  Hanken_Grotesk,
  Inter,
  Inter_Tight,
  JetBrains_Mono,
  Onest,
  Plus_Jakarta_Sans,
} from "next/font/google";
import { Analytics } from "@vercel/analytics/next";
import Header from "@/components/Header";
import LenisRoot from "@/components/LenisRoot";
import "./globals.css";
import "./echelle-mobile.css";
import { SITE_URL } from "@/lib/site";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });
const jbmono = JetBrains_Mono({ subsets: ["latin"], variable: "--font-jbmono" });

/* ══ PRÉCHARGEMENT — 14/09/2026 ══════════════════════════════════════
   Les cinq familles ci-dessous portent `preload: false`. Les variables
   sont toutes posées sur <html>, donc Next les considérait toutes
   « utilisées » sur TOUTES les routes et en préchargeait treize fichiers
   par page — mesuré en prod : ~460 ko de woff2, en priorité HAUTE, sur
   une page qui n'en consomme que deux ou trois. Ces treize <link
   rel=preload> passaient devant le JS et le CSS de la page dans la file
   du navigateur : ils retardaient le premier écran au lieu de l'aider.
   `preload: false` ne retire NI la police NI sa déclaration @font-face —
   le fichier est simplement demandé quand une règle le réclame, c'est-à-
   dire sur la seule page qui s'en sert. Inter et JetBrains Mono, elles,
   servent tout le site et gardent leur préchargement.
   ═══════════════════════════════════════════════════════════════════ */

/* 25/07 — deux familles ajoutées pour /offres uniquement (Teo : reproduire à
   l'identique la page de référence). Plus Jakarta Sans porte tous les titres,
   Inter Tight tout le corps de texte. Elles ne sont PAS posées sur <body> :
   seule la classe `.offres` les consomme, le reste du site garde Inter. */
const jakarta = Plus_Jakarta_Sans({
  subsets: ["latin"],
  variable: "--font-jakarta",
  preload: false,
});
const interTight = Inter_Tight({
  subsets: ["latin"],
  variable: "--font-inter-tight",
  preload: false,
});

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
const dmSans = DM_Sans({ subsets: ["latin"], variable: "--font-dm-sans", preload: false });

/* 07/08 — deux familles pour /vos-donnees uniquement (Teo : reproduire à
   l'identique scale.com/public-sector). La référence est composée en Aeonik,
   une police sous licence commerciale : on ne peut ni la servir depuis leurs
   fichiers ni l'acheter à leur place. Hanken Grotesk est le remplaçant le
   plus proche parmi les fontes libres — même squelette de grotesque
   géométrique, même hauteur d'x, 'g' à un étage, 'y' à queue droite. DM Mono
   porte les étiquettes de section, qui sont bien en monospace dans la
   référence. Comme les familles de /offres, elles ne sont PAS posées sur
   <body> : seul le bloc `.vd` de globals.css les consomme. */
const hanken = Hanken_Grotesk({
  subsets: ["latin"],
  variable: "--font-hanken",
  preload: false,
});
/* 16/09/2026 — Onest, pour /offres uniquement (décalque de
   scale.com/data-engine). La référence est composée en Aeonik Pro, sous
   licence : on ne peut ni servir leurs fichiers ni l'acheter à leur place.
   Hanken Grotesk avait d'abord été reprise de /vos-donnees ; Teo a vu la
   différence à l'œil sur un titre de 40 px. Les six candidates libres ont
   été rendues côte à côte à la même taille et comparées à une capture de
   la référence : Onest est la plus proche — mêmes proportions, barre du
   'e' horizontale, mêmes empattements coupés droit. Comme les autres
   familles de page, elle n'est PAS posée sur <body> : seul le bloc `.ofd`
   de app/offres/nos-offres.css la consomme. */
const onest = Onest({ subsets: ["latin"], variable: "--font-onest", preload: false });

const dmMono = DM_Mono({
  subsets: ["latin"],
  weight: ["400"],
  variable: "--font-dm-mono",
  preload: false,
});

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
      className={`${inter.variable} ${jbmono.variable} ${jakarta.variable} ${interTight.variable} ${dmSans.variable} ${hanken.variable} ${dmMono.variable} ${onest.variable} antialiased`}
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
