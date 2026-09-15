"use client";

import Link from "next/link";
import type { PointerEvent as EvenementPointeur, ReactNode } from "react";
import Partage from "@/components/Partage";
import { PORTES as ROUTES_PARTAGEES } from "@/lib/transitions";
import { cn } from "@/lib/cn";
import "./CartesPortes.css";

/* ══════════════════════════════════════════════════════════════════════
   <CartesPortes> — les trois cartes de l'aiguillage /commencer (14/09/2026)

   ORIGINE. `card-spotlight` d'Aceternity UI (aceternity/card-spotlight),
   fiche de la bibliothèque montée le 20/08. Son unique idée réelle est
   gardée : une lueur radiale SUIT LE POINTEUR À L'INTÉRIEUR de la carte, et
   ce qu'elle éclaire — un motif régulier, invisible ailleurs — n'existe que
   sous elle. Chez la source c'est un `useMotionTemplate` qui réécrit un
   `maskImage` à chaque image ; ici ce sont deux propriétés personnalisées
   posées sur la carte, et le masque est écrit une fois pour toutes en CSS.

   POURQUOI ICI. /commencer est une page à décision unique : trois cartes,
   et rien d'autre à faire que d'en choisir une. Au repos elles sont trois
   pavés gris identiques ; la seule chose qui répondait au survol était la
   nappe qui monte du bas, un geste qui arrive EN BLOC et qui ne dit pas
   « c'est CELLE-CI que vous désignez ». La lueur, elle, est attachée au
   pointeur : elle nomme la carte visée à l'endroit exact où l'œil est déjà.
   Le titre et le chapô restent dans page.tsx — ici, les cartes seules.

   CE QUI EST JETÉ. Le `CanvasRevealEffect` de la source (un shader GLSL
   sur @react-three/fiber, trois dépendances absentes du dépôt) : le motif
   révélé est une trame de points en `radial-gradient` répété, sans une
   ligne de JavaScript. Tout son habillage : `bg-black`, `border-neutral-800`,
   sa variante `dark:`, `rounded-md`, `p-10`, son `cn` de `@/lib/utils`
   (ce dépôt a `@/lib/cn`), et ses deux couleurs d'accent (bleu 59/130/246,
   violet 139/92/246) — la maison est quasi monochrome, la lueur est un gris
   très clair. Ses props `radius` / `color` partent avec : la géométrie tient
   dans deux variables CSS à deux paliers. `useMotionValue`, `motion.div` et
   le `useState` de survol partent aussi : le repos est rendu par le serveur,
   l'allumage est un `:hover` CSS, et rien ne se re-rend au mouvement.

   ÉCARTS ASSUMÉS.
   • COMPOSANT CLIENT, ET IL PORTE SES PICTOGRAMMES. La règle de la maison
     interdit de recevoir un composant en prop depuis un composant serveur,
     et les trois `ICONES` de page.tsx sont une constante locale, pas un
     module importable. La page ne passe donc plus qu'une CLÉ (`"seul"`,
     `"plusieurs"`, `"site"`) et les tracés vivent ici, au trait 2 px sur
     grille de 24, copiés sans un pixel de changement. La clé est typée
     `string` et non une union : sur un littéral d'objet non figé par
     `as const`, TypeScript infère `string`, une union ferait échouer tsc
     chez l'appelant.
   • LE FOCUS CLAVIER ALLUME LA CARTE, ce que la source ne fait pas (elle
     n'écoute que la souris) : contour net, plus la nappe et le bouton noir
     du survol — le même état, pas un état de plus. Sur `:focus-visible`,
     donc un clic à la souris n'ajoute rien au survol.
   • « (hover: none) → aucune lueur » est tenu DEUX FOIS : en CSS (la
     feuille éteint le calque) et ici (`pointerType !== "mouse"` ne pose
     rien). Le chemin clavier n'est pas dans cette coupure : il vit sur
     `:focus-visible`, une tablette à clavier garde donc son état visible.
   • `data-porte` n'est plus un ternaire sur l'`id` mais la table
     `PORTES` de lib/transitions — la source de vérité que lit déjà
     <Arrivee>. Les trois valeurs rendues sont identiques à celles du
     28/08 ; un href qui sortirait de la table perd son appariement au
     retour au lieu d'être étiqueté « audit » par défaut.
   • Aucune mécanique d'apparition : les cartes gardent leur
     `data-arrivee="colonne"`, la cascade d'<Arrivee> suffit.
   ══════════════════════════════════════════════════════════════════════ */

/* Une carte, telle que la page la décrit. `id` est optionnel : la carte
   sites n'en a pas, son href suffit comme clé de liste. `teinte` reste une
   chaîne libre — ce sont les valeurs de `[data-teinte]` déjà écrites dans
   app/globals.css (chaud / violet / bleu), et rien ici ne les interprète. */
export type CartePorte = {
  id?: string;
  icone: string;
  teinte: string;
  titre: string;
  texte: string;
  cta: string;
  href: string;
};

/* Les pictogrammes de page.tsx, au trait (2 px, grille de 24) : une personne
   seule pour la porte « prix publics », plusieurs pour « sur mesure » —
   c'est le nombre de personnes qui valident qui sépare les deux mondes, pas
   la taille de l'entreprise — et une fenêtre de navigateur pour les sites.
   La couleur vient de `.cm-tuile` par `currentColor`, teinte par teinte. */
const PICTOS: Record<string, ReactNode> = {
  seul: (
    <svg aria-hidden width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="8" r="4" />
      <path d="M4 21v-1a6 6 0 0 1 6-6h4a6 6 0 0 1 6 6v1" />
    </svg>
  ),
  plusieurs: (
    <svg aria-hidden width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="9" cy="8" r="3.5" />
      <path d="M2 20v-1a5 5 0 0 1 5-5h4a5 5 0 0 1 5 5v1" />
      <path d="M16 4.5a3.5 3.5 0 0 1 0 7" />
      <path d="M18.5 14.5a5 5 0 0 1 3.5 4.5v1" />
    </svg>
  ),
  site: (
    <svg aria-hidden width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="4" width="18" height="16" rx="2" />
      <path d="M3 9h18" />
      <circle cx="6.5" cy="6.5" r="0.5" fill="currentColor" />
      <circle cx="9.5" cy="6.5" r="0.5" fill="currentColor" />
    </svg>
  ),
};

/* L'identité de l'objet PARTAGÉ de la carte sites : son cadre voyage jusqu'à
   la carte produit de /tarifs/site et en revient. `nom` est unique dans
   toute l'application (un seul élément monté par nom) et `share` est la
   classe de la paire, déclarée dans app/globals.css (`.voyage-modeles`).
   Deux constantes et non deux props : il n'y a qu'une carte sites. */
const OBJET_SITE = { nom: "cadre-modeles", share: "voyage-modeles" };

/* La lueur suit le pointeur SANS état React : deux propriétés personnalisées
   posées sur la carte (`style.setProperty`, jamais un `setState` — le repos
   est déjà rendu par le serveur et il n'y a rien à re-rendre), lues par le
   masque de CartesPortes.css. Aucun hook, donc rien à démonter.
   `pointerenter` EN PLUS de `pointermove` : sans lui, la lueur s'allumerait
   une fraction de seconde à la dernière position connue avant de rejoindre
   le pointeur. Le tactile ne pose rien — un tap enverrait un `pointerenter`
   de type « touch » juste avant de naviguer. */
function suivrePointeur(e: EvenementPointeur<HTMLElement>) {
  if (e.pointerType !== "mouse") return;
  const carte = e.currentTarget;
  const cadre = carte.getBoundingClientRect();
  carte.style.setProperty("--cpo-x", `${e.clientX - cadre.left}px`);
  carte.style.setProperty("--cpo-y", `${e.clientY - cadre.top}px`);
}

/* Le dedans d'une carte — rigoureusement celui du 05/09 (nappe, tuile,
   titre, texte calé en bas, bouton), plus le seul calque ajouté. L'ordre
   compte : tous ces enfants sont positionnés, c'est donc l'ordre du DOM qui
   décide de la peinture — la lueur passe au-dessus de la nappe et reste
   SOUS la tuile, le titre et le texte, qui sont en `position: relative`. */
function Dedans({ carte }: { carte: CartePorte }) {
  return (
    <>
      <span aria-hidden className="cm-nappe" />
      <span aria-hidden className="cpo-lueur" />
      <span className="cm-tuile">{PICTOS[carte.icone]}</span>
      <h2 className="cm-titre">{carte.titre}</h2>
      <div className="cm-bas">
        <p className="cm-texte">{carte.texte}</p>
        <span className="cm-btn">{carte.cta}</span>
      </div>
    </>
  );
}

export default function CartesPortes({
  portes,
  site,
  className,
}: {
  portes: CartePorte[];
  site: CartePorte;
  className?: string;
}) {
  return (
    /* La grille du 05/09, au réglage près : trois colonnes égales dès lg
       (la référence), deux en md où la carte sites prend la rangée du
       dessous. Le conteneur de 1152 donne des cartes de 368. */
    <div
      className={cn(
        "mx-auto mt-12 grid max-w-4xl gap-6 md:grid-cols-2 lg:max-w-6xl lg:grid-cols-3",
        className
      )}
    >
      {portes.map((p) => (
        <Link
          key={p.id ?? p.href}
          href={p.href}
          data-arrivee="colonne"
          data-porte={ROUTES_PARTAGEES[p.href]}
          data-teinte={p.teinte}
          className="cm-carte cpo-carte"
          onPointerEnter={suivrePointeur}
          onPointerMove={suivrePointeur}
        >
          <Dedans carte={p} />
        </Link>
      ))}

      {/* La carte sites reste l'objet partagé « cadre-modeles » : son cadre
          voyage jusqu'à la carte produit de /tarifs/site et en revient
          (components/Partage.tsx, lib/transitions.ts). */}
      <Partage
        nom={OBJET_SITE.nom}
        share={OBJET_SITE.share}
        href={site.href}
        data-arrivee="colonne"
        data-porte={ROUTES_PARTAGEES[site.href]}
        data-teinte={site.teinte}
        className="cm-carte cpo-carte md:col-span-2 lg:col-span-1"
        onPointerEnter={suivrePointeur}
        onPointerMove={suivrePointeur}
      >
        <Dedans carte={site} />
      </Partage>
    </div>
  );
}
