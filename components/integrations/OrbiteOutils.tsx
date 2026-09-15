import type { CSSProperties } from "react";
import Image from "next/image";
import { cn } from "@/lib/cn";
import { OUTILS } from "@/components/offres/MediaMoteurs";
import { OUTIL_INFOS } from "@/lib/integrations";
import "./OrbiteOutils.css";

/* ══════════════════════════════════════════════════════════════════════
   <OrbiteOutils> — l'objet visuel du hero de /integrations (14/09/2026)

   ORIGINE. `orbiting-circles` de Magic UI (magicui/orbiting-circles) : des
   enfants posés en absolu au centre d'un carré, chacun recevant --angle,
   --radius et --duration en variables CSS, qu'une animation `orbit` promène
   sur un cercle — `rotate(angle) translateY(radius) rotate(-angle)`, la
   contre-rotation finale empêchant la pastille de tourner sur elle-même. Un
   SVG dessine le cercle du chemin.

   POURQUOI ICI. /integrations est la page du « sur quoi ça se branche »,
   et son hero ne le DISAIT que par des mots : une pastille, un titre, un
   chapô qui énumère « messagerie, tableur, WhatsApp, agenda, paiement,
   comptabilité », puis la ligne des outils raccordés. L'objet qui manquait
   est celui qui le MONTRE. L'anneau intérieur EST ce chapô, dans son ordre
   et outil par outil ; l'anneau extérieur ouvre sur six familles que le
   chapô ne nomme pas. Le texte et les deux boutons restent dans page.tsx,
   à l'identique : ici, l'orbite seule.

   CE QUI EST JETÉ. Les keyframes `orbit` de la source vivent dans le
   tailwind.config du projet d'origine — ce dépôt n'en a pas, elles sont donc
   réécrites dans OrbiteOutils.css sous un nom préfixé. Les props de la
   source (duration, delay, radius, path, iconSize, speed, reverse) et son
   `React.Children.map` disparaissent : un composant paramétrable n'a pas
   lieu d'être pour un objet qui n'existe qu'ici et dont toute la géométrie
   tient dans quatre paliers de variables CSS. Le `{...props}` répandu sur
   CHAQUE enfant (le même id, la même clé, douze fois) part avec. Le rayon en
   nombre nu (`--radius: 160`) devient une longueur. `stroke-black/10` et sa
   variante `dark:` deviennent --o-line. Le `<circle>` SVG devient un span à
   `border-radius: 50%` : le rayon change à quatre paliers, or l'attribut `r`
   ne se pilote pas par variable CSS de façon fiable.

   ÉCARTS ASSUMÉS. Composant SERVEUR : aucun état, aucun hook, aucune ligne
   de JavaScript envoyée — l'orbite est une animation CSS, et elle tourne
   avec le JavaScript coupé. Deux anneaux là où la source en pose un, à
   contresens, l'extérieur plus lent (44 s contre 32 s). Le noyau est le
   logo de marque en bitmap (`/logo-pegase-blanc.png`, celui du Header) sur
   un disque d'encre : la marque n'existe pas en SVG dans ce dépôt, et le
   Header le dit déjà — « le tracé est un entrelacs, pas une forme pleine ».
   Aucune apparition propre : le bloc porte le [data-reveal] de la page, la
   mécanique GSAP existante suffit.
   ══════════════════════════════════════════════════════════════════════ */

type Logo = { title: string; hex: string; path: string };

/* L'ANNEAU INTÉRIEUR, C'EST LE CHAPÔ. Six outils pour les six mots que la
   page écrit juste au-dessus — « Messagerie, tableur, WhatsApp, agenda,
   paiement, comptabilité » —, dans le même ordre. Rien n'est choisi pour
   remplir : chaque pastille répond à un mot du texte. */
const ANNEAU_INTERIEUR = [
  "Gmail" /*            messagerie   */,
  "Google Sheets" /*    tableur      */,
  "WhatsApp" /*         WhatsApp     */,
  "Google Calendar" /*  agenda       */,
  "Stripe" /*           paiement     */,
  "QuickBooks" /*       comptabilité */,
];

/* L'ANNEAU EXTÉRIEUR OUVRE. Six familles de plus, une par outil, toutes
   absentes du chapô : fichiers, e-commerce, CRM, formulaires, site, réseaux.
   L'orbite couvre ainsi onze des douze familles de FAMILLES_OUTILS.
   ⚠ Ce sont les outils DU CLIENT. Aucun outil de notre propre socle n'a sa
   place ici — c'est la règle en tête d'OUTILS, et elle vaut aussi pour un
   simple ornement. */
const ANNEAU_EXTERIEUR = [
  "Google Drive" /*  fichiers        */,
  "Shopify" /*       e-commerce      */,
  "HubSpot" /*       projet & CRM    */,
  "Typeform" /*      formulaires     */,
  "WordPress" /*     site web        */,
  "Instagram" /*     réseaux sociaux */,
];

/* Décalage de l'anneau extérieur, en degrés : sans lui les deux anneaux
   alignent leurs pastilles sur les mêmes rayons et l'orbite se lit comme six
   colonnes, pas comme deux cercles. */
const DECALAGE_EXTERIEUR = 30;

/* Le logo et la fiche viennent des deux sources déjà en place — jamais une
   donnée recopiée. La règle de la page est reprise telle quelle : un outil
   sans fiche n'apparaît pas. Les angles sont calculés APRÈS ce filtre, donc
   un nom qui ne résout plus ne laisse pas un trou dans l'anneau : les
   pastilles restantes se répartissent d'elles-mêmes. */
function resoudre(noms: string[]): Logo[] {
  const logos: Logo[] = [];
  for (const nom of noms) {
    const marque = OUTILS.find((o) => o.title === nom);
    if (!marque || !OUTIL_INFOS[marque.title]) continue;
    logos.push({ title: marque.title, hex: marque.hex, path: marque.path });
  }
  return logos;
}

const INTERIEUR = resoudre(ANNEAU_INTERIEUR);
const EXTERIEUR = resoudre(ANNEAU_EXTERIEUR);

function Satellite({
  logo,
  angle,
  anneau,
}: {
  logo: Logo;
  angle: number;
  anneau: "int" | "ext";
}) {
  return (
    <span
      className={`orb-satellite orb-satellite--${anneau}`}
      style={{ "--orb-angle": angle.toFixed(2) } as CSSProperties}
      title={logo.title}
    >
      <svg viewBox="0 0 24 24" role="img" aria-label={logo.title} fill={`#${logo.hex}`}>
        <path d={logo.path} />
      </svg>
    </span>
  );
}

export default function OrbiteOutils({ className }: { className?: string }) {
  return (
    <div className={cn("orb-bloc", className)}>
      {/* les deux chemins : un ornement, rien à annoncer */}
      <span aria-hidden className="orb-chemin orb-chemin--int" />
      <span aria-hidden className="orb-chemin orb-chemin--ext" />

      <span className="orb-noyau">
        <Image
          src="/logo-pegase-blanc.png"
          alt="Omega.AI"
          width={96}
          height={96}
        />
      </span>

      {INTERIEUR.map((logo, i) => (
        <Satellite
          key={logo.title}
          logo={logo}
          angle={(360 / INTERIEUR.length) * i}
          anneau="int"
        />
      ))}
      {EXTERIEUR.map((logo, i) => (
        <Satellite
          key={logo.title}
          logo={logo}
          angle={(360 / EXTERIEUR.length) * i + DECALAGE_EXTERIEUR}
          anneau="ext"
        />
      ))}
    </div>
  );
}
