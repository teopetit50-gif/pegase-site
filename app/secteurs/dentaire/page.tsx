import type { Metadata } from "next";
import PageShell from "@/components/PageShell";
import Heros from "@/components/secteurs/dentaire/Heros";
import EnDirect from "@/components/secteurs/dentaire/EnDirect";
import Matinee from "@/components/secteurs/dentaire/Matinee";
import Ecrans from "@/components/secteurs/dentaire/Ecrans";
import Comparatif from "@/components/secteurs/dentaire/Comparatif";
import PourQui from "@/components/secteurs/dentaire/PourQui";
import Demo from "@/components/secteurs/dentaire/Demo";
import Quotidien from "@/components/secteurs/dentaire/Quotidien";
import Formules from "@/components/secteurs/dentaire/Formules";
import Questions from "@/components/secteurs/dentaire/Questions";
import Appel from "@/components/secteurs/dentaire/Appel";
import "./dentaire.css";
import "./mobile.css";

/* ══════════════════════════════════════════════════════════════════════
   /secteurs/dentaire — TIROMA (nom provisoire, 24/09/2026)

   C'EST LA PAGE D'ACCUEIL DU SITE SaaS `OMEGA/dentaire-site`, RAPATRIÉE
   comme Daliro (/secteurs/btp) et Tamila (/secteurs/avocats). Version
   finale du disque le 24/09/2026 à 17 h 12, heure de la Guadeloupe, celle
   que sert https://tiroma-site.vercel.app : les fonctions ajoutées par la
   session « fonctions » (laboratoire, mutuelles, implants, orthodontie,
   écran « Avant les rendez-vous ») ET le rhabillage « cabinet dentaire »
   du même après-midi (Teo : « ne fait pas assez site dentaire ») — vraies
   photos de cabinet avec des cartes d'interface posées dessus, schéma
   dentaire FDI, vert d'eau clinique à la place du bleu ciel.

   Méthode : app/secteurs/RAPATRIEMENT.md. La source est UN fichier de
   150 Ko (un bundle compilé repassé en JSX, noms minifiés) : il est
   découpé ici en composants TypeScript lisibles, un par section, plus les
   pièces partagées — components/secteurs/dentaire/.

   LES SIX RÈGLES, ET CE QU'ELLES DONNENT ICI
   1. Enveloppée dans `PageShell` : entête, pied et transitions du site.
      La peau `.p-dentaire` sort du `<main>` plafonné à 1440 (100vw,
      dentaire.css) ; chaque section garde son cadre de la source
      (`max-w-[1400px] px-6 lg:px-12`), sans aucun filet vertical — la
      source n'en avait pas.
   2. Aucun jeton sur `:root` : tout vit sous `.p-dentaire`.
   3. Aucun `@theme` : l'échelle « eau » de la source est écrite en
      hexadécimal dans les composants.
   4. Pas de bascule clair/sombre (275 `dark:` retirés) ; chaque section
      porte `data-monde="clair"` pour l'entête du site.
   5. Les polices sont celles du site : aucune `next/font` ici.
   6. Appels à l'action : tout mène à /reserver-un-audit — héros,
      calculateur, quatre formules, bandeau, schéma, démo, appel final. La
      source visait https://omegaai.fr/reserver et, pour « Nous écrire »,
      mailto:contact@omegaai.fr. « Voir la démo » reste une ancre vers la
      démo de la page (#demo), qui se joue dans le navigateur.

   CE QUI NE VIENT PAS : l'entête de la source (fixe, qui passait
   par-dessus le héros ; marque, cinq ancres, « Nous écrire », « Réserver
   une démo », volet mobile) et son pied (marque, colonnes de liens,
   « © 2026 »). Le bloc d'appel qui OUVRAIT ce pied reste, en section
   (Appel.tsx). La marque provisoire de Tiroma reste dans le corps, au
   premier nœud du schéma (marque.tsx) : Tiroma n'a pas encore de logo.
   `<PageMotion />` non plus : la page anime avec ses propres
   observateurs et framer-motion, comme la source.

   MONDE BLANC : la source était déjà claire ; la section « Écrans », noire
   dans la référence, l'était déjà devenue. Rien de sombre ne reste, hors
   le pied de page d'Omega (components/Footer.tsx, partagé par tout le
   site), noir, hors de notre périmètre.
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
      <div
        data-monde="clair"
        className="p-dentaire flex flex-col selection:bg-[#e3f0ed] selection:text-[#23433e]"
      >
        <Heros />
        <EnDirect />
        <Matinee />
        <Ecrans />
        <Comparatif />
        <PourQui />
        <Demo />
        <Quotidien />
        <Formules />
        <Questions />
        <Appel />
      </div>
    </PageShell>
  );
}
