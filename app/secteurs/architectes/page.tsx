import type { Metadata } from "next";
import type React from "react";
import PageShell from "@/components/PageShell";
import Heros from "@/components/secteurs/architectes/Heros";
import Produit from "@/components/secteurs/architectes/Produit";
import Fonctionnement from "@/components/secteurs/architectes/Fonctionnement";
import Onglets from "@/components/secteurs/architectes/onglets";
import Dossier from "@/components/secteurs/architectes/Dossier";
import Fonctionnalites from "@/components/secteurs/architectes/Fonctionnalites";
import Compteurs from "@/components/secteurs/architectes/Compteurs";
import Metiers from "@/components/secteurs/architectes/Metiers";
import Formules from "@/components/secteurs/architectes/Formules";
import Questions from "@/components/secteurs/architectes/Questions";
import Appel from "@/components/secteurs/architectes/Appel";
import Bande from "@/components/secteurs/architectes/Bande";
import Apparition from "@/components/secteurs/architectes/apparition";
import Apparitions from "@/components/secteurs/architectes/apparitions";
import "./architectes.css";
import "./mobile.css";

/* ══════════════════════════════════════════════════════════════════════
   /secteurs/architectes — LORANI (24/09/2026, après-midi)

   C'EST LA PAGE D'ACCUEIL DU SITE SaaS `OMEGA/dossieros-site`, RAPATRIÉE
   (le dossier et le projet Vercel gardent l'ancien nom DossierOS). Copie
   de l'état du disque le 24/09/2026 à 14 h 57, heure de la Guadeloupe :
   une autre session venait d'y reporter les textes en registre
   professionnel (14 h 26 – 14 h 39) ; rien n'y a été modifié. Seconde
   copie à 17 h 00 : une autre session y avait ajouté des fonctions entre
   16 h 00 et 16 h 32 (« ajoute tout sur les sites ») — reportées dans
   Produit, Fonctionnement, Formules, GrilleFonctions et Questions, chacun
   le note en tête.

   Jusqu'ici /secteurs/architectes AFFICHAIT le site déployé du SaaS dans
   un cadre plein écran (app/secteurs/[metier]/). Teo, le 24/09 : « quand
   on clique sur CASHD c'est une page qui tourne dans omegaai.fr, on peut
   recliquer en haut pour revenir à l'accueil. Je veux le même système pour
   les pages par secteur. » La ligne `architectes` de lib/secteurs.ts porte
   `integre: true` ; la route à cadre ne génère plus ce slug, et ce dossier
   statique prend la place. Méthode : app/secteurs/RAPATRIEMENT.md ; les
   précédents : app/secteurs/btp/ (Daliro, source claire) et
   app/secteurs/avocats/ (Tamila, source sombre).

   LES SIX RÈGLES, ET CE QU'ELLES DONNENT ICI
   1. Enveloppée dans `PageShell` : entête, pied et transitions du site.
      La peau `.p-architectes` sort du `<main>` plafonné à 1440 (100vw,
      architectes.css) ; chaque section garde le cadre de la source
      (30 px de marge, puis `max-w-7xl px-6`).
   2. Les jetons vivent sous `.p-architectes`, jamais sur `:root`.
   3. Aucun `@theme` : utilitaires de couleur convertis en valeurs
      arbitraires, chacune notée en tête du composant concerné.
   4. Pas de bascule clair/sombre ; chaque section porte
      `data-monde="clair"` pour l'entête du site.
   5. Les polices sont celles du site : aucune `next/font` ici.
   6. Appels à l'action : tout mène à /reserver-un-audit (« Réserver un
      audit » du héros, du produit et de l'appel, « Voir la démo », « Voir
      Lorani en action », les quatre formules). La source visait
      https://omegaai.fr/reserver, un `mailto:` et des `href="#"`.

   MONDE BLANC — LA SOURCE TOURNAIT EN SOMBRE (classe `dark` sur <html>),
   mais son gabarit, Parlo, a un thème clair écrit par son auteur : les
   `dark:` sont retirés et c'est lui qui reste, jusque dans les valeurs que
   la référence choisit en JavaScript (pixels, grille 3D, texte circulaire
   du héros). Ce qui était sombre EN DUR — maquettes, grille des compteurs,
   rayons de l'appel, lueurs, liserés, planches d'architecte en traits
   blancs — est repassé au clair composant par composant, sans îlot noir ;
   chaque choix est écrit en tête du fichier. La table : architectes.css.

   CE QUI NE VIENT PAS : l'entête de la source (logo, « Powered by Omega »,
   sept ancres, « Voir la démo », « Réserver un audit », volet mobile) et
   son pied — ce sont ceux d'Omega qui servent. `<PageMotion />` non plus :
   la page garde ses propres apparitions (apparition.tsx pour les
   `[data-reveal]` de la référence, apparitions.tsx pour la montée des
   blocs), bornées à `.p-architectes`.
   ⚠ Le pied d'Omega (components/Footer.tsx, partagé par tout le site) est
   noir : il ferme cette page blanche par une bande noire. Connu, hors de
   notre périmètre.
   ══════════════════════════════════════════════════════════════════════ */

const TITRE = "Lorani · les incohérences du dossier relevées avant le chantier";
const DESCRIPTION =
  "Lorani croise chaque planche avec le CCTP, la DPGF et les pièces du permis, puis relève chaque incohérence avec la page, l'article et la correction proposée. Conçu par Omega pour les agences d'architecture.";

export const metadata: Metadata = {
  title: `${TITRE} | Omega.AI`,
  description: DESCRIPTION,
  alternates: { canonical: "/secteurs/architectes" },
  openGraph: {
    type: "website",
    locale: "fr_FR",
    siteName: "Omega.AI",
    title: TITRE,
    description: DESCRIPTION,
    url: "/secteurs/architectes",
    /* Déclarer un bloc openGraph remplace celui que Next déduit, image
       comprise : sans cette ligne la page partirait sans visuel (voir
       l'en-tête de app/offres/relances-impayes/page.tsx, 15/09). */
    images: ["/opengraph-image"],
  },
  twitter: { card: "summary_large_image", title: TITRE, description: DESCRIPTION },
};

/* Les libellés de la barre latérale du « Fonctionnement », que `Onglets`
   relie aux quatre blocs. La source listait encore « Contrôle des plans »,
   l'ancien libellé du premier bouton, devenu « Permis et DCE » à la
   réécriture des textes : ce bouton n'était plus relié, et les trois
   autres, décalés d'un rang, allumaient et visaient le bloc du dessus. */
const ONGLETS = ["Permis et DCE", "Analyse des offres", "Situations de travaux", "Visa des documents"];

/* LE CADRE DE LA SOURCE EST DÉCOUPÉ. La source enfermait toute la page
   dans `mx-[30px] border-x`, plus deux paires de rails fixes à 22 et 30 px
   des bords. Teo, le 24/09 au soir, sur Daliro : « la page n'est pas
   pleine, regarde, il y a les barres sur les côtés ». Ni rails ni
   `border-x` ici. Les 30 px restent une MARGE, section par section
   (`Section`) : la géométrie du contenu est celle de la source à toutes
   les largeurs, et les blocs à `md:-mx-8` (la maquette du « dossier »)
   gardent l'air où ils débordaient. Ce qui peint un fond ou un filet
   d'un bord à l'autre est posé HORS marge (`Plein`) : les bandes de
   points, le héros, les compteurs, l'appel, et le produit (dont les deux
   filets des cellules courent sur toute la fenêtre, voir Produit.tsx).
   `data-racine` désigne à apparitions.tsx les racines des sections — les
   mêmes éléments que les `main > *` de la source. */
function Section({ children }: { children: React.ReactNode }) {
  return (
    <div data-monde="clair">
      <div data-racine className="mx-[30px]">
        {children}
      </div>
    </div>
  );
}
function Plein({ children }: { children: React.ReactNode }) {
  return (
    <div data-monde="clair" data-racine>
      {children}
    </div>
  );
}

export default function PageArchitectes() {
  return (
    <PageShell>
      <div data-monde="clair" className="p-architectes flex flex-col">
        <Plein>
          <Heros />
        </Plein>
        <Plein>
          <Produit />
        </Plein>
        <Plein>
          <Bande />
        </Plein>
        <Section>
          <Fonctionnement />
        </Section>
        <Onglets
          ids={["workflow-agents", "alerts", "timeline", "integrations"]}
          buttons='#how-it-works button[data-slot="button"]'
          labels={ONGLETS}
        />
        <Plein>
          <Bande />
        </Plein>
        <Section>
          <Dossier />
        </Section>
        <Plein>
          <Bande />
        </Plein>
        <Section>
          <Fonctionnalites />
        </Section>
        <Plein>
          <Compteurs />
        </Plein>
        <Plein>
          <Bande />
        </Plein>
        <Section>
          <Metiers />
        </Section>
        <Plein>
          <Bande />
        </Plein>
        <Section>
          <Formules />
        </Section>
        <Plein>
          <Bande />
        </Plein>
        <Section>
          <Questions />
        </Section>
        <Plein>
          <Bande />
        </Plein>
        <Plein>
          <Appel />
        </Plein>
        <Plein>
          <Bande />
        </Plein>
        <Apparition />
        <Apparitions />
      </div>
    </PageShell>
  );
}
