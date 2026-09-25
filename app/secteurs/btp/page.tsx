import type { Metadata } from "next";
import type React from "react";
import PageShell from "@/components/PageShell";
import { Hero } from "@/components/secteurs/btp/Heros";
import { Logos } from "@/components/secteurs/btp/Lu";
import { Features } from "@/components/secteurs/btp/Fonctions";
import { Stats } from "@/components/secteurs/btp/Chiffres";
import { Testimonials } from "@/components/secteurs/btp/Metiers";
import { Pricing } from "@/components/secteurs/btp/Formules";
import { Faq } from "@/components/secteurs/btp/Questions";
import { Cta } from "@/components/secteurs/btp/Appel";
import { Bande } from "@/components/secteurs/btp/Bande";
import "./btp.css";
import "./mobile.css";
import SeCombine from "@/components/secteurs/SeCombine";

/* ══════════════════════════════════════════════════════════════════════
   /secteurs/btp — DALIRO (24/09/2026, soir)

   C'EST LA PAGE D'ACCUEIL DU SITE SaaS `OMEGA/chantieros-site`, RAPATRIÉE
   (le dossier et le projet Vercel gardent l'ancien nom ChantierOS). Copie
   de l'état du disque le 24/09/2026 à 12 h 01, heure de la Guadeloupe :
   une autre session travaillait encore le site source ; rien n'y a été
   modifié.

   Jusqu'ici /secteurs/btp AFFICHAIT le site déployé du SaaS dans un cadre
   plein écran (app/secteurs/[metier]/). Teo, le 24/09 : « ça redirige vers
   un truc à part, alors que quand on clique sur CASHD c'est une page qui
   tourne dans omegaai.fr, on peut recliquer en haut pour revenir à
   l'accueil. Je veux le même système pour les pages par secteur. » Même
   système, donc : celui de /offres/relances-impayes (11/09). La ligne
   `btp` de lib/secteurs.ts porte `integre: true` ; la route à cadre ne
   génère plus ce slug, et ce dossier statique prend la place.

   Méthode et pièges, pour les trois suivants (Tamila, Lorani, Tavaro) :
   app/secteurs/RAPATRIEMENT.md.

   LES SIX RÈGLES, ET CE QU'ELLES DONNENT ICI
   1. Enveloppée dans `PageShell` : entête, pied et transitions du site.
      La peau `.p-btp` sort du `<main>` plafonné à 1440 (100vw, btp.css) ;
      le contenu reste centré par `.btp-conteneur` (1280 puis 1400 px dès
      1536), SANS les filets verticaux de la source (retirés le 24/09 au soir,
      voir plus bas).
   2. Les jetons vivent sous `.p-btp`, jamais sur `:root`.
   3. Aucun `@theme` : les utilitaires de couleur de la source sont
      convertis en valeurs arbitraires (51 `dark:` retirés, ~550
      conversions), chacune notée en tête du composant concerné.
   4. Pas de bascule clair/sombre ; chaque section porte
      `data-monde="clair"` pour l'entête du site.
   5. Les polices sont celles du site : aucune `next/font` ici.
   6. Appels à l'action : tout mène à /reserver-un-audit (héros, bouton
      des fonctionnalités, trois formules, appel final). `/sign-up` et
      `/pricing`, routes mortes du gabarit, sont réaiguillés ; « Connexion »
      et la recherche partent avec l'entête de la source.

   CE QUI NE VIENT PAS : l'entête du site source (menus Produit / Métiers,
   loupe, bascule de thème, « Connexion ») et son pied noir — ce sont ceux
   d'Omega qui servent. `<PageMotion />` non plus : la page ne pose aucun
   `[data-reveal]`.

   MONDE BLANC. Daliro était déjà clair : sa seule bande noire était son
   pied de page, qui ne vient pas. La dernière surface sombre — la vignette
   d'application d'une notification, dans les fonctionnalités — est passée
   au blanc (Fonctions.tsx).
   ══════════════════════════════════════════════════════════════════════ */

const TITRE = "Daliro · les travaux supplémentaires signés avant exécution";
const DESCRIPTION =
  "Daliro compare les photos et les vocaux de vos équipes au marché signé, chiffre les travaux supplémentaires sur vos prix unitaires, prépare l'avenant et confirme vos sous-traitants à J-2. Conçu par Omega pour les entreprises du bâtiment.";

export const metadata: Metadata = {
  title: `${TITRE} | Omega.AI`,
  description: DESCRIPTION,
  alternates: { canonical: "/secteurs/btp" },
  openGraph: {
    type: "website",
    locale: "fr_FR",
    siteName: "Omega.AI",
    title: TITRE,
    description: DESCRIPTION,
    url: "/secteurs/btp",
    /* Déclarer un bloc openGraph remplace celui que Next déduit, image
       comprise : sans cette ligne la page partirait sans visuel (voir
       l'en-tête de app/offres/relances-impayes/page.tsx, 15/09). */
    images: ["/opengraph-image"],
  },
  twitter: { card: "summary_large_image", title: TITRE, description: DESCRIPTION },
};

/* 24/09/2026 (soir) — LE CADRE DE LA SOURCE EST RETIRÉ. Teo, en voyant la
   page en ligne : « la page n'est pas pleine, regarde, il y a les barres sur
   les côtés ». Les deux paires de filets verticaux (`border-x`, puis
   `mx-1 sm:mx-1.5 lg:mx-2 border-x`) encadraient tout le contenu ; ils ne
   sont plus posés. Le contenu reste centré, section par section, par
   `.btp-conteneur` ; les bandes hachurées passent HORS conteneur et
   prennent toute la largeur de la fenêtre, sans les croix d'angle (elles
   marquaient la jonction avec les filets : sans filets, elles flottaient).
   Le `<main>` imbriqué de la source devient une suite de blocs : PageShell
   porte déjà le <main> de la page. */
function Section({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div data-monde="clair" className={className}>
      <div className="btp-conteneur">{children}</div>
    </div>
  );
}

export default function PageBtp() {
  return (
    <PageShell>
      <div data-monde="clair" className="p-btp flex flex-col">
        <Section className="relative z-20 w-full bg-[#ffffff] pt-24 md:pt-32">
          <Hero />
        </Section>
        <Bande />
        <Section>
          <Logos />
        </Section>
        <Bande />
        <Section>
          <Features />
        </Section>
        <Bande />
        <Section>
          <Stats />
        </Section>
        <Bande />
        <Section>
          <Testimonials />
        </Section>
        <Bande />
        <section id="pricing" data-monde="clair" className="scroll-mt-20">
          <div className="btp-conteneur">
            <Pricing />
          </div>
        </section>
        <Bande />
        <section id="faq" data-monde="clair" className="scroll-mt-20">
          <div className="btp-conteneur">
            <Faq />
          </div>
        </section>
        <Bande />
        <Section>
          <Cta />
        </Section>
      </div>
      <SeCombine slug="btp" />
    </PageShell>
  );
}
