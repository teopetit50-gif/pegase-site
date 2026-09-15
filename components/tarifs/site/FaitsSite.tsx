import { cn } from "@/lib/cn";
import CompteurFait from "./CompteurFait";
import "./FaitsSite.css";

/* ══════════════════════════════════════════════════════════════════════
   <FaitsSite> — la bande des quatre faits sous le mur de /tarifs/site
   (14/09/2026)

   ORIGINE. Bloc « stats », variante `two`, de Tailark (dépôt public
   tailark/blocks, base radix/mist) : sous un titre et son chapô, une
   grille nue de quatre cellules alignées À GAUCHE — grande valeur en gras
   (`text-4xl font-bold`), libellé gris dessous (`text-muted-foreground`),
   deux colonnes puis quatre à `md`, le tout sur une bande `bg-muted/50`.
   Les deux autres variantes ont été lues et écartées : `three` est une
   liste à flèches, quatre lignes « → valeur libellé » en corps de texte —
   une énumération, pas une bande sous un mur ; `four` est fait pour DEUX
   chiffres et UNE phrase (`col-span-2`, filet à gauche), or la bande
   porte quatre couples de texte exacts, aucun n'est une phrase.
   `one` (la carte à filets) est déjà celle de /modeles.

   POURQUOI ICI. La bande actuelle est une grille de textes CENTRÉS en
   o-h5 à 20 px : quatre petits titres flottants, qu'on ne distingue ni
   du chapô au-dessus ni des intertitres au-dessous. `two` fait ce que
   l'accueil fait avec ses cartes de preuve — « un fait = un intitulé + une
   valeur » — et rien d'autre : la valeur grandit (28 → 36 px, Jakarta 600,
   la voix des titres du monde `.offres`), la précision redevient une
   légende, et l'alignement à gauche pose les quatre faits sur la même
   ligne de départ, comme une rangée de colonnes de presse. Le premier fait
   est chiffré : son « 21 » se compte à l'arrivée dans la fenêtre
   (CompteurFait), les trois autres sont des textes.

   CE QUI EST JETÉ de la source, et pourquoi :
   1. Le `h2` « Tailark in numbers » et son chapô : la bande vit sous le
      mur des modèles et au-dessus de l'intertitre « L'offre » — un titre
      de plus ferait trois intertitres en un écran. Aucun titre, même
      caché ; la section reste ce qu'elle était : une bande.
   2. `bg-muted/50 py-24` et `max-w-5xl px-6` : le monde `.offres` est
      blanc et la colonne est `.o-wrap` (1200 px), tenues par page.tsx.
      Le composant ne rend que la liste ; l'espacement vertical reste à
      la section appelante (`pt-[80px] pb-[40px]`).
   3. Les jetons shadcn (`text-foreground`, `text-muted-foreground`) et
      `text-4xl font-bold` : `--o-text`, `--o-muted`, et un clamp 28–36 px
      au poids 600 des titres de ce monde (FaitsSite.css).
   4. La grille `md:grid-cols-4` à colonnes ÉGALES : faite pour « 90+ » et
      « 10k+ », trois signes. Nos valeurs font dix à dix-huit lettres :
      « Branché aux postes » mesure ~9 em en Jakarta 600, plus que le quart
      de 1200 px dès 32 px — en grille égale il passerait sur deux lignes
      à 1440 comme à 1700 tandis que « Chèque TIC » laisserait un trou.
      Dès `lg`, la rangée est un `flex` à `space-between` : chaque cellule
      prend la largeur de son texte, tout tient sur une ligne jusqu'à
      36 px, les écarts se partagent le reste. Sous `lg`, 2 × 2.
   5. `md` (48 rem) comme seuil des quatre colonnes : à 768 px les quatre
      cellules serreraient les deux valeurs longues sur deux lignes ;
      `lg` (64 rem), comme la bande de /modeles.
   6. Les `<div>` : une liste `ul` / `li` (`role="list"` rendu explicitement,
      Safari retire la sémantique de liste dès `list-style: none`).

   ÉCARTS ASSUMÉS.
   · Deux filets, haut et bas, sur la liste : la source pose sa bande sur
     un fond gris ; ici le fond est blanc et une grille nue sur blanc est
     précisément ce que la page avait. Le bord de la maison est le filet
     `--o-line`, pas un fond — la bande a un contour sans devenir la carte
     de /modeles.
   · Le premier fait seul est examiné pour un nombre en tête (« 21
     modèles » → 21 + « modèles », expression `^\d+`) : c'est le seul fait
     chiffré de FAITS, et compter un texte n'aurait pas de sens. Un premier
     fait sans nombre en tête est rendu tel quel.
   · `data-reveal` sur chaque `li` : l'apparition est celle de la page
     (PageMotion, GSAP), en cascade de quatre ; le composant n'ajoute
     aucune mécanique d'apparition, le compteur ne fait que compter.
   · Composant serveur : le client ne reçoit qu'un nombre et un mot
     (CompteurFait), jamais une fonction ni un nœud.

   TYPAGE. `readonly (readonly [string, string])[]` : la constante FAITS de
   page.tsx est déclarée `[string, string][]`, assignable telle quelle.
   ══════════════════════════════════════════════════════════════════════ */

export type FaitSite = readonly [valeur: string, precision: string];

/* « 21 modèles » → { nombre: 21, suffixe: "modèles" } ; sinon null */
function nombreEnTete(valeur: string): { nombre: number; suffixe?: string } | null {
  const m = /^(\d+)(?:\s+(\S.*))?$/.exec(valeur.trim());
  if (!m) return null;
  return { nombre: Number(m[1]), suffixe: m[2] };
}

export default function FaitsSite({
  faits,
  className,
}: {
  /** quatre couples valeur / précision — la page passe FAITS */
  faits: readonly (readonly [string, string])[];
  className?: string;
}) {
  return (
    <ul className={cn("fs-liste", className)} role="list">
      {faits.map(([valeur, precision], i) => {
        const compte = i === 0 ? nombreEnTete(valeur) : null;
        return (
          <li key={valeur} data-reveal className="fs-fait">
            <p className="fs-valeur">
              {compte ? (
                <CompteurFait valeur={compte.nombre} suffixe={compte.suffixe} />
              ) : (
                valeur
              )}
            </p>
            <p className="fs-precision">{precision}</p>
          </li>
        );
      })}
    </ul>
  );
}
