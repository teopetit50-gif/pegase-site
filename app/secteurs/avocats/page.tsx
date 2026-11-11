import type { Metadata } from "next";
import { NOM_SITE, canoniqueSecteur, sansOmega, titreSite } from "@/components/espace2/portail";
import PageShell from "@/components/PageShell";
import SeCombine from "@/components/secteurs/SeCombine";
import Heros from "@/components/secteurs/avocats/Heros";
import Bandeau from "@/components/secteurs/avocats/Bandeau";
import Pourquoi from "@/components/secteurs/avocats/Pourquoi";
import Engagements from "@/components/secteurs/avocats/Engagements";
import Plan from "@/components/secteurs/avocats/Plan";
import Rapport from "@/components/secteurs/avocats/Rapport";
import Matieres from "@/components/secteurs/avocats/Matieres";
import Formules from "@/components/secteurs/avocats/Formules";
import Souverainete from "@/components/secteurs/avocats/Souverainete";
import Outils from "@/components/secteurs/avocats/Outils";
import Questions from "@/components/secteurs/avocats/Questions";
import "./avocats.css";

/* ══════════════════════════════════════════════════════════════════════
   /secteurs/avocats — TAMILA SUR LE DESSIN RADIUS (11/11/2026)

   Teo : « Pour Tamila, il faut que tu refasses exactement le même design
   que ce site : https://radius.nextjsshop-preview.workers.dev/. J'ai
   acheté le modèle sur 21st.dev. Tu dois le copier en 1:1. Je ne veux
   pas du 80 %. » La page du 24/09 (décalque de vetra-app passé au blanc,
   puis titres serif, voir l'historique git) est remplacée. Même méthode
   que Tiroma (app/secteurs/dentaire, 09/11) et Lorani sur Nivara
   (app/secteurs/architectes-nivara) : le HTML, les deux feuilles, les
   polices et les images du modèle téléchargés ; style calculé et
   hauteurs de section relevés avec Playwright aux cinq largeurs (390 /
   768 / 1024 / 1440 / 1700) ; reconstruction classe pour classe,
   section par section ; captures comparées jusqu'à superposition.

   LES MOTS SONT CEUX DE TAMILA, LE DESSIN CELUI DE RADIUS. Tous les
   textes viennent de components/secteurs/avocats/textes.ts (inchangé) ;
   ce que le dessin demande en plus — amorces, fenêtres d'exemple, plan,
   rapport — est dans radius.ts, qui dit d'où vient chaque mot. Les
   douze sections du modèle, dans son ordre, et ce qu'elles portent :
     1. barre          — sur le site dédié tamila : components/site-dedie/
                         entetes/Tamila.tsx (la barre du modèle, ancres
                         vers les sections ci-dessous) ; sur omegaai.fr,
                         l'en-tête d'Omega (PageShell / app/layout.tsx) ;
     2. héros          — HERO, avec une VRAIE capture du tableau de bord ;
     3. bandeau        — les neuf familles de pièces (PIECES) ;
     4. « why »        — lib/secteurs.ts (texte, detail) + cartes 1 et 2 de
                         FONCTIONNALITES + PIECES ;
     5. grille de six  — SECRET (titre, texte, six engagements) ;
     6. « agents »     — FONCTIONNALITES (titre, texte, cartes 3 à 5) et le
                         plan de vérification animé ;
     7. « performance »— APPEL (titre, texte, bouton) et le rapport de
                         cohérence ;
     8. « roles »      — MATIERES en trois cartes photo ;
     9. formules       — FORMULES (bascule Contentieux / Dommage corporel,
                         deux cartes, Cabinet mise en avant) ;
    10. bloc sombre    — SECRET (badge, accroche, faits, mention), deux
                         sceaux dessinés ;
    11. intégrations   — CONNEXIONS, trois cartes ;
    12. « FAQ »        — POINT en accordéon, tableaux d'exemple compris ;
        pied           — site dédié : components/site-dedie/pieds/
                         Tamila.tsx (le pied du modèle) ; omegaai.fr : le
                         pied d'Omega.
   Puis <SeCombine slug="avocats" /> : sur omegaai.fr le bloc « Se combine
   avec », sur le site dédié la section #audit où mènent tous les boutons
   (LIEN_AUDIT). Il reste en dernier.

   LES IMAGES DU MODÈLE ET LEURS ÉQUIVALENTS (public/secteurs-avocats) :
   · bg.jpg (un paysage passé en caractères, derrière chaque fenêtre
     d'exemple) → fond.jpg : la façade du Palais de justice de Paris
     (public/photos/avocats-palais-facade.jpg, Slavan / Unsplash) passée
     au même traitement par outils/fond-ascii.py (scratchpad de la
     session) ;
   · dashboard.png → ecrans/tableau.png : une vraie capture de
     /espace2/tamila (thème clair, données d'exemple, 1440 × 900 à ×2),
     prise sur le build local ; ecrans/arrivees.png, la page des arrivées,
     est prise en même temps pour la suite ;
   · logos de clients et de modèles → aucun (règle maison) : pictogrammes
     lucide ; portraits → le signe de Tamila ou les initiales d'un rôle ;
   · sceaux AICPA / SAML → deux sceaux SVG (Souverainete.tsx).

   LES RÈGLES DES PAGES MÉTIER (app/secteurs/RAPATRIEMENT.md) : peau
   `.p-avocats` (avocats.css), jetons sous la classe et jamais sur :root,
   pas de @theme, polices servies depuis public (Geist, OFL, déjà servie
   par Tiroma), aucun filet qui encadre la page, `data-monde="clair"` sur
   les sections claires, aucun prix, aucun client ni témoignage inventé.
   Les animations sont celles du modèle (bandeau, plan, étiquette,
   accordéon) ; aucune apparition au défilement, le modèle n'en a pas.
   app/_polices/serif.ts (Newsreader, titres de l'ancienne page) n'a plus
   de lecteur.
   ══════════════════════════════════════════════════════════════════════ */

const TITRE = "Tamila · le dossier contentieux vérifié, de la première pièce à l'archivage";
const DESCRIPTION =
  "Tamila lit l'intégralité d'un dossier contentieux, rattache chaque fait et chaque référence à sa pièce et à sa page, signale les incohérences prouvées et tient une piste d'audit exportable. Conçu par Omega pour les cabinets d'avocats.";

export const metadata: Metadata = {
  /* 10/11/2026 — « | DALIRO » et sans « Conçu par Omega » sur le site dédié à ce métier (components/espace2/portail.ts) */
  title: titreSite(TITRE),
  description: sansOmega(DESCRIPTION),
  /* 09/11/2026 — « / » sur le site dédié à ce métier (components/espace2/portail.ts) */
  alternates: { canonical: canoniqueSecteur("avocats") },
  openGraph: {
    type: "website",
    locale: "fr_FR",
    siteName: NOM_SITE,
    title: TITRE,
    description: sansOmega(DESCRIPTION),
    url: "/secteurs/avocats",
    /* Déclarer un bloc openGraph remplace celui que Next déduit, image
       comprise : sans cette ligne la page partirait sans visuel (voir
       l'en-tête de app/offres/relances-impayes/page.tsx, 15/09). */
    images: ["/opengraph-image"],
  },
  twitter: { card: "summary_large_image", title: TITRE, description: sansOmega(DESCRIPTION) },
};

export default function PageAvocats() {
  return (
    <PageShell>
      <div className="p-avocats">
        <Heros />
        <Bandeau />
        <Pourquoi />
        <Engagements />
        <Plan />
        <Rapport />
        <Matieres />
        <Formules />
        <Souverainete />
        <Outils />
        <Questions />
      </div>
      <SeCombine slug="avocats" />
    </PageShell>
  );
}
