"use client";

import {
  useEffect,
  useRef,
  type PointerEvent as EvtPointeur,
  type ReactElement,
} from "react";
import {
  IconeBarriere,
  IconeCadenas,
  IconeEmporter,
  IconeJournal,
  IconeLieu,
  IconeOeil,
} from "@/components/donnees/Icones";
import "./CartesGaranties.css";

/* ══════════════════════════════════════════════════════════════════════
   <CartesGaranties> — les cartes de « Ce que ça vous garantit »,
   section #garanties de /vos-donnees (14/09/2026)

   ORIGINE. `evervault-card` d'Aceternity UI, fiche de la bibliothèque :
   `OMEGA/toyota-guadeloupe/bibliotheque/composants/cartes-et-produits/
   aceternity__evervault-card/`. Une seule idée en est gardée, la sienne :
   une nappe de caractères illisibles dort dans la carte, et un masque
   radial accroché au pointeur en découvre un disque au passage. Du texte
   chiffré qu'on ne lit que là où on pose le doigt dessus.

   POURQUOI ICI. La section énonce six promesses en six pavés gris
   strictement identiques, dont une — « Chiffrement de bout en bout » —
   parle d'une chose qu'on ne voit jamais. Un site qui écrit « chiffré »
   demande qu'on le croie ; une carte dont le fond EST du chiffre le
   montre. Le geste ne vaut que s'il reste rare : appliqué aux six, il
   redeviendrait une décoration et la carte du chiffrement ne dirait plus
   rien de plus que ses voisines.

   LA RÉPARTITION, et elle se lit dans les textes de la page. La nappe ne
   va qu'à « Chiffrement de bout en bout », la seule garantie dont le
   texte nomme la chose (« TLS sur toutes les liaisons, chiffrement au
   repos »). Les cinq autres parlent d'autre chose : « Hébergement
   européen » d'un lieu, « Aucun entraînement » d'un droit d'usage,
   « Rien ne part sans vous » d'une validation humaine. Les deux
   dernières l'interdisent carrément — « Tout est journalisé » promet un
   journal « consultable et exportable », « Réversibilité » des
   « fichiers lisibles » : leur couvrir le fond de caractères illisibles
   dirait le contraire de leur texte. Elles reçoivent donc le relief
   sobre : le filet se marque, la carte se lève de 2 px.

   CE QUI EST JETÉ. Tout l'habillage de la source : `aspect-square`, le
   disque de 176 px, son `text` centré, la plaque floutée, le dégradé
   vert→bleu (couleur d'accent interdite ici), `mix-blend-overlay`,
   `backdrop-blur-xl`, `rounded-3xl`, ses variantes `dark:` et son `cn`
   de `@/lib/utils`, qui n'existe pas dans ce dépôt. Jetés aussi : son
   `useState` + `Math.random()` au rendu (deux chaînes différentes entre
   le serveur et le navigateur), et surtout la REGÉNÉRATION de la nappe à
   chaque `onMouseMove` — un `setState` par image, donc un rendu React
   par image, pour un scintillement que le masque qui se déplace rend
   déjà. Ici la nappe est posée une fois ; seul le masque bouge.

   ÉCARTS ASSUMÉS.
   • LA NAPPE EST DÉTERMINISTE, semée par l'index de la carte : la même
     suite sur le serveur et dans le navigateur, quel que soit le moteur.
     Et elle n'est même pas rendue par React — elle est écrite en
     `textContent` dans un `useEffect`, après deux `matchMedia`. Sur un
     écran tactile ou en mouvement réduit, aucun caractère n'est produit,
     et le HTML servi n'en porte jamais un seul.
   • AUCUN `setState` NULLE PART, donc aucun rendu React au survol : la
     position du pointeur passe par `style.setProperty`, la discipline du
     dépôt (et `react-hooks/set-state-in-effect` est en erreur ici).
   • `motion/react` n'est pas utilisé là où la source s'en sert
     (`useMotionValue` + `useMotionTemplate`) : deux variables CSS font le
     même travail sans monter une bibliothèque dans le lot de la page.
   • Le pointeur n'est suivi que si `pointerType === "mouse"` — un doigt
     ou un stylet ne déclenche rien, en plus du `(hover: none)` de la
     feuille.
   • La section garde son apparition actuelle, c'est-à-dire aucune : la
     page anime `.vd-monte` / `.vd-ap` via <Apparition>, que #garanties
     n'a jamais porté. Pas de seconde mécanique posée ici.
   ══════════════════════════════════════════════════════════════════════ */

export type Garantie = { titre: string; texte: string };

type ComposantSigne = (p: { className?: string }) => ReactElement;

/* Le signe est choisi PAR TITRE et non reçu en prop : `GARANTIES` porte
   des composants, or un composant ne traverse pas la frontière
   serveur → client. Un composant client importe ses icônes lui-même.
   Si un titre change dans page.tsx sans être repris ici, la carte perd
   sa pastille — elle reste lisible, elle ne casse pas. */
const SIGNES: Record<string, ComposantSigne | undefined> = {
  "Hébergement européen": IconeLieu,
  "Aucun entraînement": IconeBarriere,
  "Chiffrement de bout en bout": IconeCadenas,
  "Rien ne part sans vous": IconeOeil,
  "Tout est journalisé": IconeJournal,
  "Réversibilité": IconeEmporter,
};

/* La liste tient en un titre, et c'est le propos du composant : voir la
   justification de la répartition en tête de fichier. */
const CHIFFREES = new Set(["Chiffrement de bout en bout"]);

const ALPHABET =
  "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";

/* Assez pour couvrir la plus haute des cartes à la plus étroite des
   largeurs ; le reste est rogné par l'`overflow: hidden` de la carte. */
const LONGUEUR_NAPPE = 1900;

/* Générateur congruentiel linéaire (constantes de Numerical Recipes).
   Déterministe : à graine égale, même chaîne partout, toujours — c'est
   ce qui remplace le `Math.random()` de la source sans risque
   d'hydratation. `Math.imul` garde la multiplication sur 32 bits, `>>> 0`
   la ramène dans les entiers non signés. */
function nappeDeterministe(graine: number, longueur: number): string {
  let etat = (graine + 1) * 1013904223;
  let sortie = "";
  for (let i = 0; i < longueur; i++) {
    etat = (Math.imul(etat, 1664525) + 1013904223) >>> 0;
    sortie += ALPHABET[etat % ALPHABET.length];
  }
  return sortie;
}

function Carte({ garantie, graine }: { garantie: Garantie; graine: number }) {
  const Signe = SIGNES[garantie.titre];
  const chiffree = CHIFFREES.has(garantie.titre);
  const nappe = useRef<HTMLSpanElement>(null);

  /* La nappe n'est écrite QUE sur un appareil à souris dont le porteur
     n'a pas demandé moins de mouvement. Ailleurs, le span reste vide :
     pas un caractère produit, rien à mettre en page. On écrit en
     `textContent` plutôt qu'en état — aucun rendu React, et la feuille
     de la carte reste maîtresse de l'affichage. */
  useEffect(() => {
    const el = nappe.current;
    if (!el) return;
    if (typeof window.matchMedia !== "function") return;
    if (!window.matchMedia("(hover: hover)").matches) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    el.textContent = nappeDeterministe(graine, LONGUEUR_NAPPE);
  }, [graine]);

  /* Le centre du masque, en pixels depuis le coin de la carte. Deux
     variables CSS posées sur l'élément : ni état, ni rendu, ni
     bibliothèque de mouvement. */
  function suivrePointeur(e: EvtPointeur<HTMLLIElement>) {
    if (!chiffree || e.pointerType !== "mouse") return;
    const el = e.currentTarget;
    const cadre = el.getBoundingClientRect();
    el.style.setProperty("--cg-x", `${e.clientX - cadre.left}px`);
    el.style.setProperty("--cg-y", `${e.clientY - cadre.top}px`);
  }

  return (
    <li
      className="vd-carte cg-carte"
      data-cg-chiffre={chiffree ? "" : undefined}
      onPointerMove={suivrePointeur}
    >
      {chiffree ? (
        <span ref={nappe} className="cg-nappe" aria-hidden="true" />
      ) : null}

      {Signe ? (
        <span className="vd-chip">
          <Signe className="h-5 w-5" />
        </span>
      ) : null}

      <h3 className="vd-h3 cg-titre">{garantie.titre}</h3>
      <p className="vd-small cg-texte">{garantie.texte}</p>
    </li>
  );
}

export default function CartesGaranties({
  garanties,
}: {
  garanties: Garantie[];
}) {
  return (
    /* `role="list"` : le `list-style: none` de la feuille retire la
       sémantique de liste dans VoiceOver, cette ligne la rend. */
    <ul role="list" className="cg-grille">
      {garanties.map((g, i) => (
        <Carte key={g.titre} garantie={g} graine={i} />
      ))}
    </ul>
  );
}
