import type { Metadata } from "next";
import PageShell from "@/components/PageShell";
import { Hero } from "@/components/secteurs/location/Heros";
import { Solutions } from "@/components/secteurs/location/Solutions";
import { GrilleMoteurs } from "@/components/secteurs/location/GrilleModules";
import { Methode } from "@/components/secteurs/location/Methode";
import { APropos } from "@/components/secteurs/location/APropos";
import "./location.css";
/* Les feuilles maison de la source, scopées sous `.p-location`, APRÈS
   location.css et dans l'ordre de son layout (src/app/layout.tsx). */
import "@/components/secteurs/location/styles/react-flow.css";
import "@/components/secteurs/location/styles/container-scroll-animation.css";
import "@/components/secteurs/location/styles/HeroProductMock.css";
import "@/components/secteurs/location/styles/AgentSolutions.css";
import "@/components/secteurs/location/styles/AgentUxPreview.css";
import "@/components/secteurs/location/styles/PilotProductPreview.css";
import "@/components/secteurs/location/styles/DesignSprints.css";
import "@/components/secteurs/location/styles/About.css";
import "./mobile.css";

/* ══════════════════════════════════════════════════════════════════════
   /secteurs/location-automobile — TAVARO (24/09/2026, après-midi)

   C'EST LA PAGE D'ACCUEIL DU SITE SaaS `OMEGA/rentalos-site`, RAPATRIÉE
   (le dossier et le projet Vercel gardent l'ancien nom RentalOS). Copie
   de l'état du disque le 24/09/2026 à 14 h 58, heure de la Guadeloupe —
   après le passage des moteurs en modules français (14 h 31), identique à
   rentalos-site.vercel.app ce jour-là ; rien n'a été modifié dans la
   source. Seconde copie à 17 h 03 : les fonctions ajoutées à la source
   entre 16 h 00 et 16 h 55 (huit modules de plus, 20 au lieu de 12, trois
   résumés de solutions et « Ce que Tavaro prend en charge » allongés, coins
   du bouton de la méthode) sont reportées — détail en tête de
   components/secteurs/location/textes.ts, GrilleModules.tsx et Methode.tsx.

   Jusqu'ici /secteurs/location-automobile AFFICHAIT le site déployé dans
   un cadre plein écran (app/secteurs/[metier]/). Teo, le 24/09 : « quand
   on clique sur CASHD c'est une page qui tourne dans omegaai.fr, on peut
   recliquer en haut pour revenir à l'accueil. Je veux le même système pour
   les pages par secteur. » La ligne `location-automobile` de
   lib/secteurs.ts porte `integre: true` ; la route à cadre ne génère plus
   ce slug, et ce dossier statique prend la place. Méthode :
   app/secteurs/RAPATRIEMENT.md ; précédents : app/secteurs/btp/ (Daliro),
   app/secteurs/avocats/ (Tamila).

   LES SIX RÈGLES, ET CE QU'ELLES DONNENT ICI
   1. Enveloppée dans `PageShell` : entête, pied et transitions du site.
      La peau `.p-location` sort du `<main>` plafonné à 1440 (100vw) ;
      chaque section garde le conteneur de la source (`.page-container`,
      colonne de 95vw centrée).
   2. Les jetons vivent sous `.p-location`, jamais sur `:root`.
   3. Aucun `@theme` : la source est en Tailwind v3, son thème
      (tailwind.config.ts : espacements en pixels, tailles `body1…6`,
      couleur `primary`, rayon `8`, police `ui`, variante `touch-device`)
      est converti en valeurs arbitraires, chaque conversion notée en tête
      du composant ; ses feuilles maison sont scopées (location.css, 1).
   4. Pas de bascule clair/sombre (la source n'en avait pas) ; chaque bloc
      porte `data-monde="clair"` pour l'entête du site.
   5. Les polices sont celles du site : aucune `next/font` ici (Onest, Syne
      et IBM Plex Mono de la source → General Sans et sa mono).
   6. Appels à l'action : « Réserver un audit » du héros et de la méthode
      ouvraient la modale de démonstration de la source (formulaire vers
      `mailto:`, visioconférence vers omegaai.fr/reserver) ; la modale ne
      vient pas, les deux boutons sont des <Link> vers /reserver-un-audit.
      « Voir les modules », « Voir le module ↗ », les cases de la grille et
      les liens « Explorer » restent des ancres de la page : ils font
      défiler, ils ne déclenchent rien.

   MONDE BLANC — la source était claire, sauf « 03 / Méthode » : un rideau
   noir et cinq cartes sombres (« Un pilote en trois temps », « L'agence
   garde la main »…). Tout passe au clair, sans demi-mesure : table dans
   components/secteurs/location/styles/DesignSprints.css. Le fond #fcfcfa
   de la source devient le #ffffff d'Omega.

   LA PAGE EST PLEINE — aucun filet vertical n'encadre la page : les flancs
   de la vitrine des solutions (quatre à cinq écrans de haut, à 36 px des
   bords) sont retirés ; les deux séparateurs entre sections (au-dessus de
   la vitrine, au-dessus de la méthode) prennent toute la largeur.

   CE QUI NE VIENT PAS : l'entête de la source (liens d'ancre, lockup
   surmonté de « Powered by Omega », « Réserver un audit », menu mobile),
   son pied (mot d'accueil animé, colonnes, e-mail) et la modale de
   démonstration — ce sont ceux d'Omega qui servent. Le logo officiel
   (/logos/tavaro-lockup.png, tavaro-mark.png) sert dans la phrase « à
   propos » et comme icône d'application dans les maquettes et la grille
   (components/secteurs/location/marque.tsx).
   ⚠ Le pied d'Omega (components/Footer.tsx, partagé par tout le site) est
   noir : il ferme cette page blanche par une bande noire. Connu, hors de
   notre périmètre.
   ══════════════════════════════════════════════════════════════════════ */

const TITRE = "Tavaro · chaque restitution facturée sur votre barème";
const DESCRIPTION =
  "Tavaro rapproche les photos de restitution de l'état des lieux de départ, chiffre le carburant, le retard et les dommages selon votre barème de remise en état, puis prépare la facture que l'agence valide. Conçu par Omega pour les loueurs automobiles.";

export const metadata: Metadata = {
  title: `${TITRE} | Omega.AI`,
  description: DESCRIPTION,
  alternates: { canonical: "/secteurs/location-automobile" },
  openGraph: {
    type: "website",
    locale: "fr_FR",
    siteName: "Omega.AI",
    title: TITRE,
    description: DESCRIPTION,
    url: "/secteurs/location-automobile",
    /* Déclarer un bloc openGraph remplace celui que Next déduit, image
       comprise : sans cette ligne la page partirait sans visuel (voir
       l'en-tête de app/offres/relances-impayes/page.tsx, 15/09). */
    images: ["/opengraph-image"],
  },
  twitter: { card: "summary_large_image", title: TITRE, description: DESCRIPTION },
};

/* Chaque bloc de la source (`<main>` : héros, solutions, modules, méthode,
   à propos) porte déjà son conteneur centré (`.page-container`) : le
   découpage se limite à poser `data-monde="clair"` sur chacun. Le `<main>`
   de la source devient une suite de blocs : PageShell porte déjà le
   <main> de la page. */
function Bloc({ children }: { children: React.ReactNode }) {
  return <div data-monde="clair">{children}</div>;
}

export default function PageLocationAutomobile() {
  return (
    <PageShell>
      <div data-monde="clair" className="p-location">
        <Bloc>
          <Hero />
        </Bloc>
        <Bloc>
          <Solutions />
        </Bloc>
        <Bloc>
          <GrilleMoteurs />
        </Bloc>
        <Bloc>
          <Methode />
        </Bloc>
        <Bloc>
          <APropos />
        </Bloc>
      </div>
    </PageShell>
  );
}
