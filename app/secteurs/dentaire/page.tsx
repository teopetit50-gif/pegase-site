import type { Metadata } from "next";
import PageShell from "@/components/PageShell";
import SeCombine from "@/components/secteurs/SeCombine";
import Appel from "@/components/secteurs/dentaire/Appel";
import AvantApres from "@/components/secteurs/dentaire/AvantApres";
import Bandeau from "@/components/secteurs/dentaire/Bandeau";
import Etapes from "@/components/secteurs/dentaire/Etapes";
import Formules from "@/components/secteurs/dentaire/Formules";
import Heros from "@/components/secteurs/dentaire/Heros";
import Onglets from "@/components/secteurs/dentaire/Onglets";
import PourQui from "@/components/secteurs/dentaire/PourQui";
import Questions from "@/components/secteurs/dentaire/Questions";
import Situations from "@/components/secteurs/dentaire/Situations";
import ToutLeCabinet from "@/components/secteurs/dentaire/ToutLeCabinet";
import "./dentaire.css";

/* ══════════════════════════════════════════════════════════════════════
   /secteurs/dentaire — TIROMA, refaite le 09/11/2026 sur le dessin de
   https://folio-topaz-delta.vercel.app/ (Teo : « copie 1:1 »).

   LA RÉFÉRENCE, relevée au style calculé (Playwright headless, cinq
   largeurs 390 / 768 / 1024 / 1440 / 1700, captures et relevé dans la
   session du 09/11) : fond blanc, texte #171717, gris #737373, filets
   #e6e6e6, surfaces #f5f5f5, rayon 8 px ; corps en Geist, titres h1 et
   h2 en Tiempos Headline, sourcils en Geist Mono. Huit sections : héros à
   fenêtre, bandeau de logos, trois cartes, grille de cinq cartes, onglets
   à fenêtres empilées, mosaïque de témoignages, FAQ à rubriques, appel
   final sur photo, puis le pied.

   CE QUI EST RECOPIÉ : le balisage et toutes les classes Tailwind de la
   référence, section par section (convertisseur HTML → JSX de la session,
   icônes SVG comprises), ses jetons de couleur (globals.css, `@theme
   inline`, préfixe `tir-`), ses polices libres (Geist et Geist Mono, OFL,
   servies depuis public/secteurs-dentaire/polices), ses animations
   (liseré tournant, rubans, filet des onglets, empilement). Ses rayons
   sont ceux de la référence : la page NE porte PAS `.p-dentaire`, donc
   pas arrondis.css (qui ramène tout à 6 px) — c'est `.p-tiroma`.

   CE QUI DIFFÈRE, et pourquoi :
   • TOUS LES TEXTES sont ceux de la page du 24/09 (textes.ts et les
     composants d'alors), jamais reformulés : les sections de la référence
     en accueillent autant qu'elles ont de places (ses maquettes
     d'interface portent la démo, le calculateur, le schéma, les cartes
     des photos et le relevé) ; ce qui n'avait pas de place — les quatre
     étapes, l'avant / après, les formules — tient dans trois sections
     supplémentaires faites des mêmes blocs que la référence (mosaïque,
     cartes de la grille). La page est donc plus longue que la référence ;
     chaque section, elle, est la sienne.
   • Tiempos Headline (Klim, licence commerciale) n'est pas servable :
     Bitter (OFL) à sa place, choisie par mesure contre la vraie Tiempos
     (largeurs de trois titres à 0,2 %, hauteur d'x à 0,4 %, capitales
     égales), devant Lora et Source Serif 4.
   • Les photos de la référence (droits inconnus), ses logos clients et ses
     avatars ne viennent pas : la photo du praticien (Unsplash, créditée)
     en fond du héros et de l'appel (la salle de soins), les données lues en bandeau, l'icône
     de chaque situation en avatar.
   • L'entête de la référence (fixe) et son pied (colonnes) sont ceux du
     site (PageShell) ; le héros perd en haut la hauteur de l'entête
     collante pour tomber au même endroit.
   • L'APPARITION AU DÉFILEMENT est celle de la page d'accueil, voulue par
     Teo : components/accueil/Apparition (GroupeApparition, MotsApparition
     sur chaque titre, Apparition sur chaque corps), rien de la référence.
   ══════════════════════════════════════════════════════════════════════ */

const TITRE = "Tiroma · le point du matin des cabinets dentaires";
const DESCRIPTION =
  "Chaque matin, Tiroma lit l'agenda, les plans de traitement et les devis signés du cabinet, et dit quel créneau sauver, quel plan planifier et quel fauteuil tourne à vide. Conçu par Omega pour les cabinets dentaires.";

export const metadata: Metadata = {
  title: `${TITRE} | Omega.AI`,
  description: DESCRIPTION,
  alternates: { canonical: "/secteurs/dentaire" },
  openGraph: {
    type: "website",
    locale: "fr_FR",
    siteName: "Omega.AI",
    title: TITRE,
    description: DESCRIPTION,
    url: "/secteurs/dentaire",
    /* Déclarer un bloc openGraph remplace celui que Next déduit, image
       comprise : sans cette ligne la page partirait sans visuel (voir
       l'en-tête de app/offres/relances-impayes/page.tsx, 15/09). */
    images: ["/opengraph-image"],
  },
  twitter: { card: "summary_large_image", title: TITRE, description: DESCRIPTION },
};

export default function PageDentaire() {
  return (
    <PageShell>
      <div data-monde="clair" className="p-tiroma flex min-h-screen flex-col">
        <div className="relative z-10 overflow-hidden border-b border-tir-border">
          <Heros />
          <Bandeau />
          <PourQui />
          <ToutLeCabinet />
          <Onglets />
          <Etapes />
          <AvantApres />
          <Formules />
          <Situations />
          <Questions />
        </div>
        <Appel />
      </div>
      <SeCombine slug="dentaire" />
    </PageShell>
  );
}
