import type { Metadata } from "next";
import PageShell from "@/components/PageShell";
import SeCombine from "@/components/secteurs/SeCombine";
import Heros from "@/components/secteurs/architectes-nivara/Heros";
import Enonce from "@/components/secteurs/architectes-nivara/Enonce";
import Moments from "@/components/secteurs/architectes-nivara/Moments";
import Travaux from "@/components/secteurs/architectes-nivara/Travaux";
import Dossier from "@/components/secteurs/architectes-nivara/Dossier";
import Compteurs from "@/components/secteurs/architectes-nivara/Compteurs";
import Arbitrage from "@/components/secteurs/architectes-nivara/Arbitrage";
import Formules from "@/components/secteurs/architectes-nivara/Formules";
import Questions from "@/components/secteurs/architectes-nivara/Questions";
import Appel from "@/components/secteurs/architectes-nivara/Appel";
import Curseur from "@/components/secteurs/architectes-nivara/Curseur";
import "./nivara.css";

/* ══════════════════════════════════════════════════════════════════════
   /secteurs/architectes-nivara — LORANI SUR LE GABARIT NIVARA (09/11/2026)

   PAGE DE COMPARAISON. Teo, le 09/11 : « compare l'ancienne page et une
   version refaite sur le modèle Nivara ; l'ancienne reste en ligne, la
   nouvelle est construite à côté, je trancherai plus tard. »
   · /secteurs/architectes (app/secteurs/architectes/, components/
     secteurs/architectes/) N'EST PAS TOUCHÉE : c'est la page servie,
     dans les menus et le sitemap.
   · Cette page vit à côté, sur sa propre route, avec ses propres
     composants (components/secteurs/architectes-nivara/). Elle n'est ni
     dans les menus ni dans le sitemap (lib/secteurs.ts ne la connaît
     pas) et porte `robots: noindex`.
   · MÊMES TEXTES, lettre pour lettre (textes.ts dit d'où vient chacun) ;
     seul le dessin change.

   LE DESSIN : https://nivara-architecture-template.vercel.app/, relevé
   au style calculé (Playwright, DOM + feuille servie + captures à 390 /
   768 / 1024 / 1440 / 1700) et recopié classe pour classe : grille de
   1600 px à gouttières 16/32, police Inter Tight (OFL, auto-hébergée),
   échelle de texte, couleurs paper/ink/graphite/rule/charcoal, points
   de rupture 810 et 1200, boutons à voile, liens redessinés, carrousel,
   compteurs collés au défilement, bloc sombre, clôture plein cadre.
   Ce qui s'en écarte, et pourquoi :
   · l'entête et le pied sont ceux d'Omega (PageShell), comme sur toutes
     les pages métier — l'entête fixe et le pied « Nivara » de la
     référence ne viennent pas ;
   · les apparitions au défilement sont celles de l'accueil d'omegaai.fr
     (components/accueil/Apparition.tsx, réutilisé tel quel), à la place
     des fondus et des mots qui montent de la référence — c'est la seule
     exception demandée. Les mouvements LIÉS au défilement (parallaxes,
     cadre des compteurs) et ceux du chargement (premier écran) restent
     ceux de Nivara ;
   · les photos de la référence ne sont pas réutilisables : à leur place,
     les photos et planches Unsplash déjà servies par le site
     (public/secteurs-architectes/, public/photos/, crédits dans leurs
     CREDITS.txt) ;
   · ce que la référence n'a pas (formules, questions, cinq fonctions,
     garanties du héros, phrase de chaque carte métier) est posé dans
     ses propres briques, chaque composant le note en tête.
   ══════════════════════════════════════════════════════════════════════ */

const TITRE = "Lorani · le dossier de l'architecte vérifié, du permis à la réception";
const DESCRIPTION =
  "Lorani lit toutes les pièces d'une opération, planches, CCTP, DPGF, offres, fiches techniques et situations, et relève chaque incohérence avec la page, la valeur lue et la correction proposée, du dépôt du permis à la réception. Conçu par Omega pour les agences d'architecture.";

export const metadata: Metadata = {
  title: `${TITRE} | Omega.AI`,
  description: DESCRIPTION,
  /* page de comparaison : ni indexée, ni suivie, ni canonique */
  robots: { index: false, follow: false, nocache: true },
};

export default function PageArchitectesNivara() {
  return (
    <PageShell>
      <div className="p-nivara">
        <Heros />
        <Enonce />
        <Moments />
        <Travaux />
        <Dossier />
        <Compteurs />
        <div className="theme-dark flow-root pb-32 min-[810px]:pb-44">
          <Arbitrage />
          <Formules />
        </div>
        <Questions />
        <Appel />
        <Curseur />
      </div>
      <SeCombine slug="architectes" />
    </PageShell>
  );
}
