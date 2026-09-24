import type { Metadata } from "next";
import PageShell from "@/components/PageShell";
import Hero from "@/components/secteurs/avocats/Heros";
import { Appel, Connexions, Fonctionnalites, Pieces, PointDuMatin } from "@/components/secteurs/avocats/Sections";
import Secret from "@/components/secteurs/avocats/Secret";
import Formules from "@/components/secteurs/avocats/Formules";
import Matieres from "@/components/secteurs/avocats/Matieres";
import { serifAvocats } from "@/app/_polices/serif";
import "./avocats.css";

/* ══════════════════════════════════════════════════════════════════════
   /secteurs/avocats — TAMILA (24/09/2026, après-midi)

   C'EST LA PAGE D'ACCUEIL DU SITE SaaS `OMEGA/cabinetos-site`, RAPATRIÉE
   (le dossier et le projet Vercel gardent l'ancien nom CabinetOS). Copie
   de l'état du disque le 24/09/2026 à 13 h 37, heure de la Guadeloupe :
   une autre session travaillait encore le site source ; rien n'y a été
   modifié.

   Jusqu'ici /secteurs/avocats AFFICHAIT le site déployé du SaaS dans un
   cadre plein écran (app/secteurs/[metier]/). Teo, le 24/09 : « quand on
   clique sur CASHD c'est une page qui tourne dans omegaai.fr, on peut
   recliquer en haut pour revenir à l'accueil. Je veux le même système pour
   les pages par secteur. » La ligne `avocats` de lib/secteurs.ts porte
   `integre: true` ; la route à cadre ne génère plus ce slug, et ce dossier
   statique prend la place. Méthode : app/secteurs/RAPATRIEMENT.md ; le
   précédent concret : app/secteurs/btp/ (Daliro).

   LES SIX RÈGLES, ET CE QU'ELLES DONNENT ICI
   1. Enveloppée dans `PageShell` : entête, pied et transitions du site.
      La peau `.p-avocats` sort du `<main>` plafonné à 1440 (100vw,
      avocats.css) ; chaque section garde le cadre de la source (1280 px
      dès `lg`, gouttières 16 / 48 px).
   2. Les jetons vivent sous `.p-avocats`, jamais sur `:root`.
   3. Aucun `@theme` : utilitaires de couleur convertis en valeurs
      arbitraires, chacune notée en tête du composant concerné.
   4. Pas de bascule clair/sombre ; chaque section porte
      `data-monde="clair"` pour l'entête du site.
   5. Les polices sont celles du site : aucune `next/font` ici.
   6. Appels à l'action : tout mène à /reserver-un-audit (« Soumettre un
      dossier » du héros et de la formule Pré-lecture, « Réserver un
      audit » de la formule Cabinet et de l'appel final, « Recevoir le
      projet de contrat lors de l'audit »). La source visait
      https://omegaai.fr/reserver.

   MONDE BLANC — LA SOURCE ÉTAIT ENTIÈREMENT SOMBRE (décalque de vetra-app :
   fond noir, halos bleus, maquettes d'application sombres). Tout passe au
   clair, sans îlot noir : fonds et cartes, écran produit du héros
   (ApercuDossier.tsx), cinq illustrations des fonctionnalités
   (Illustrations.tsx), tableaux du point du matin, ondes (ondes.tsx),
   orbites (orbites.tsx), halos (avec une teinte plus claire de la même
   famille à chaque fois). Le bleu de la marque reste. Les choix sont
   écrits en tête de chaque composant ; la table dans avocats.css.

   CE QUI NE VIENT PAS : l'entête du site source (logo, quatre ancres,
   « Réserver un audit », volet mobile Radix) et son pied — ce sont ceux
   d'Omega qui servent. `<PageMotion />` non plus : la page ne pose aucun
   `[data-reveal]` (elle anime avec framer-motion, comme la source).
   ⚠ Le pied d'Omega (components/Footer.tsx, partagé par tout le site) est
   noir : il ferme cette page blanche par une bande noire. Connu, hors de
   notre périmètre.

   24/09 (SOIR) — « ON NE VOIT PAS ASSEZ QUE ÇA FAIT AVOCAT » (Teo). La
   page quitte les codes du gabarit vetra pour ceux des sites du métier :
   titres en serif (Newsreader, app/_polices/serif.ts, posée ici par
   `serifAvocats.variable`), fond blanc (le papier crème essayé le même
   soir a été refusé), vert de Tamila au lieu du bleu,
   plus d'orbites, de halos ni de particules (orbites.tsx, particules.tsx
   et halo.tsx supprimés), photos du Palais de justice de Paris, et un
   écran produit qui montre des conclusions annotées. Le détail et le
   relevé : en tête de avocats.css. Le site source OMEGA/cabinetos-site
   n'a pas suivi : la page d'Omega est désormais la version de référence.
   ══════════════════════════════════════════════════════════════════════ */

const TITRE = "Tamila · chaque fait du dossier, renvoyé à sa pièce";
const DESCRIPTION =
  "Tamila lit toutes les pièces d'un dossier et rend la chronologie, les contradictions et le bordereau contrôlé, chaque fait renvoyé à sa page. Conçu par Omega pour les cabinets d'avocats.";

export const metadata: Metadata = {
  title: `${TITRE} | Omega.AI`,
  description: DESCRIPTION,
  alternates: { canonical: "/secteurs/avocats" },
  openGraph: {
    type: "website",
    locale: "fr_FR",
    siteName: "Omega.AI",
    title: TITRE,
    description: DESCRIPTION,
    url: "/secteurs/avocats",
    /* Déclarer un bloc openGraph remplace celui que Next déduit, image
       comprise : sans cette ligne la page partirait sans visuel (voir
       l'en-tête de app/offres/relances-impayes/page.tsx, 15/09). */
    images: ["/opengraph-image"],
  },
  twitter: { card: "summary_large_image", title: TITRE, description: DESCRIPTION },
};

/* Le cadre de la source (cabinetos-site/src/app/page.tsx) moins l'entête et
   le pied : `mx-auto w-full lg:max-w-[1280px] px-4 md:px-12 py-20`, SANS
   aucun filet vertical (la source n'en avait pas, et la règle de Teo du
   24/09 au soir — « la page n'est pas pleine, il y a les barres sur les
   côtés » — les interdit). Le conteneur unique de la source est découpé
   section par section, comme chez Daliro : c'est ce qui laisse le seul
   séparateur de la page (le filet entre le héros et « Chaque pièce est
   lue ») courir sur toute la largeur de la fenêtre. Les 80 px du `py-20`
   vont en haut du héros et en bas de l'appel final. */
function Section({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div data-monde="clair" className={className}>
      <div className="mx-auto w-full px-4 md:px-12 lg:max-w-[1280px]">{children}</div>
    </div>
  );
}

export default function PageAvocats() {
  return (
    <PageShell>
      <div data-monde="clair" className={`p-avocats ${serifAvocats.variable} flex flex-col`}>
        <Section className="pt-20">
          <Hero />
        </Section>
        {/* `mt-16` : la marge haute de la section dans la source ; le filet
            la suit, posé au bord haut de la section, hors conteneur. */}
        <Section className="relative mt-16">
          <div aria-hidden="true" className="avocats-filet absolute inset-x-0 top-0" />
          <Pieces />
        </Section>
        <Section>
          <Fonctionnalites />
        </Section>
        <Section>
          <PointDuMatin />
        </Section>
        <Section>
          <Connexions />
        </Section>
        <Section>
          <Secret />
        </Section>
        <Section>
          <Formules />
        </Section>
        <Section>
          <Matieres />
        </Section>
        <Section className="pb-20">
          <Appel />
        </Section>
      </div>
    </PageShell>
  );
}
