"use client";

import { useEffect, useRef, type CSSProperties } from "react";
import { useInView } from "motion/react";
import { BellRing, CornerUpLeft, FileText, Receipt } from "lucide-react";
import { cn } from "@/lib/cn";
import "./JournalDemandes.css";

/* ══════════════════════════════════════════════════════════════════════
   <JournalDemandes> — le journal des demandes reçues par le site
   (14/09/2026)

   ORIGINE. « Animated List » de Magic UI (magicui/animated-list) : une
   liste dont les éléments entrent EN SÉQUENCE. Sa mécanique tient en trois
   pièces — un index dans un `useState`, un `setTimeout` qui l'avance
   toutes les `delay` ms, et `children.slice(0, index + 1).reverse()` qui
   ne monte que les éléments déjà atteints ; chacun entre sous
   `AnimatePresence` en `scale 0 → 1` + opacité, avec `layout` pour que les
   précédents se poussent vers le bas.

   POURQUOI ICI. La carte « La suite » promet qu'un site branché aux postes
   ALIMENTE le reste : une demande arrive, l'accusé part, le devis se
   relance, la facture se règle. Quatre lignes posées d'un bloc se lisent
   comme une capture d'écran ; les mêmes quatre lignes qui tombent l'une
   après l'autre se lisent comme un flux qui continue sans personne. C'est
   exactement ce que la carte vend, et c'est le seul mouvement de la
   section — la carte du prix, en face, reste immobile.

   CE QUI EST JETÉ de la source, et pourquoi :
   1. `slice(0, index + 1)` — le montage progressif. Il ne met dans le
      document que les éléments déjà atteints : sans JavaScript, ou avant
      hydratation, la liste n'aurait qu'UNE ligne, et un lecteur d'écran
      trois de moins. Les quatre lignes sont donc rendues côté serveur, en
      entier ; ce qui est différé n'est plus leur existence mais leur
      entrée, portée par un retard par ligne (`--jd-retard`, ci-dessous).
   2. `AnimatePresence` et `exit` : rien ne sort jamais d'ici. Sans sortie,
      la présence n'a rien à garder ; c'est une dépendance de rendu en
      moins sur un bloc qui doit rester lisible sans JS.
   3. `layout` : il fait pousser les lignes déjà là par celle qui entre —
      donc quatre reflows dans une carte qui, elle, est en train d'être
      révélée par le GSAP de la page. L'entrée d'ici est une pure
      transformation : elle ne réserve ni ne libère de place, la carte ne
      change pas de hauteur d'un pixel pendant les 1,85 s.
   4. `.reverse()` : la source empile les nouveautés en HAUT (une pile de
      notifications). Un journal se lit dans l'ordre, du matin au J+7, et
      les heures rendraient l'inverse illisible.
   5. Le ressort `stiffness 350 / damping 40` et le `scale: 0` de départ :
      une ligne qui naît d'un point puis rebondit, sur une carte de
      démonstration de 560 px, est un jouet. Ici 8 px de montée, 2 % de
      grandeur et 350 ms sur la courbe de sortie de la maison.
   6. `delay = 1000` : une seconde par ligne ferait 4 s de spectacle pour
      quatre phrases. 500 ms — le temps de lire une ligne courte.
   7. La boucle `(prevIndex + 1) % length` : elle ne tourne pas dans la
      source (le `if` la coupe au dernier), mais elle y est écrite. Ici il
      n'y a ni modulo ni cycle : `useInView(once: true)`, une seule fois,
      jamais de liste qui se vide pour se remplir à nouveau.
   8. `cn` de `@/lib/utils`, `flex flex-col items-center gap-4` et
      `mx-auto w-full` : l'alias du projet est `@/lib/cn`, et toute la
      géométrie vit dans JournalDemandes.css, scopée sous `.offres`.
   9. Les fonds colorés et les pastilles d'icône de la démonstration Magic
      UI : le monde est blanc, noir et gris zinc. Le trait de chaque ligne
      est un tracé lucide gris, à la même encre que l'heure et l'état.

   ÉCARTS ASSUMÉS :
   · Le geste est écrit en CSS (`@keyframes jd-entree`), pas en `motion.li`.
     La raison n'est pas l'économie : c'est que motion pose son `initial`
     dans le HTML du serveur. Avec lui, quatre lignes à opacité 0 seraient
     servies à un visiteur sans JavaScript ; sans lui, motion part de l'état
     peint — donc de lignes déjà visibles, qu'il faudrait cacher d'abord,
     ce qui coûte une image de clignotement. L'attribut `data-rejoue` posé
     à l'entrée dans la fenêtre fait les deux dans le même recalcul de
     style : la pose de départ et le départ de l'animation. `motion/react`
     reste ce qui DÉCLENCHE — `useInView`, comme demandé, et comme le
     compteur de la bande de faits juste au-dessus (même marge : la ligne
     à 88 % de la fenêtre où PageMotion révèle les `[data-reveal]`).
   · La cadence reste dans ce fichier, à la place du `delay` de la source :
     `PAS_MS` et `indice × PAS_MS` en variable de style sur chaque `<li>`.
     Valeur déterministe, calculée du même côté au serveur et au client —
     aucun écart d'hydratation.
   · prefers-reduced-motion : lu par `matchMedia` DANS l'effet, jamais au
     rendu. En mouvement réduit l'attribut n'est pas posé, ET la règle CSS
     vit hors de portée : deux verrous pour une même promesse.
   · `<ul>` / `<li>` avec `role="list"` explicite (Safari retire la
     sémantique de liste dès `list-style: none`). Les traits lucide sont
     `aria-hidden` : l'heure, le titre et l'état portent tout le sens, et
     l'état, caché sous 640 px, ne dit rien que le titre ne dise déjà.
   · Le composant rend le CONTENU de la carte, barre de fenêtre comprise —
     jamais la carte : l'enveloppe `o-card overflow-hidden` et son
     `data-reveal` restent à page.tsx.
   · Les textes sont ceux de MaqDemandes au caractère près, insécables
     comprises — c'est-à-dire aucune. Le point médian et les deux-points
     du titre de barre gardent leurs espaces ordinaires : la barre de la
     carte du prix, en face, porte les mêmes, et les deux doivent rester
     jumelles. Rien n'y casse de ligne de toute façon, le titre de chaque
     ligne étant sur une seule ligne tronquée.
   ══════════════════════════════════════════════════════════════════════ */

/** le `delay` de la source : une ligne toutes les 500 ms, dans l'ordre */
const PAS_MS = 500;

type Genre = "devis" | "reponse" | "relance" | "facture";

type Ligne = {
  /** l'heure ou le jalon, colonne de gauche à largeur fixe */
  heure: string;
  /** ce qui est arrivé — la seule colonne qui se tronque */
  titre: string;
  /** où ça en est ; caché sous 640 px */
  etat: string;
  /** le type de ligne, qui choisit son trait */
  genre: Genre;
};

/* les quatre lignes de MaqDemandes, mot pour mot */
const LIGNES: readonly Ligne[] = [
  {
    heure: "09:14",
    titre: "Demande de devis · chantier",
    etat: "accusé de réception envoyé",
    genre: "devis",
  },
  {
    heure: "09:16",
    titre: "Réponse · demande du samedi",
    etat: "sous votre signature",
    genre: "reponse",
  },
  {
    heure: "J+3",
    titre: "Devis DV-0891 · Métalco",
    etat: "relancé",
    genre: "relance",
  },
  {
    heure: "J+7",
    titre: "Facture FA-2418 · Sogexal",
    etat: "réglée, avis demandé",
    genre: "facture",
  },
];

/* un trait par type de ligne — gris, 13 px, décoratif */
function Trait({ genre }: { genre: Genre }) {
  const Icone =
    genre === "devis"
      ? FileText
      : genre === "reponse"
        ? CornerUpLeft
        : genre === "relance"
          ? BellRing
          : Receipt;

  return (
    <Icone className="jd-trait" size={13} strokeWidth={1.6} aria-hidden focusable="false" />
  );
}

export default function JournalDemandes({ className }: { className?: string }) {
  const racine = useRef<HTMLDivElement>(null);
  const vu = useInView(racine, { once: true, margin: "0px 0px -12% 0px" });

  /* À l'entrée dans la fenêtre, une fois : on pose l'attribut qui donne le
     départ. En mouvement réduit on ne le pose jamais — les quatre lignes
     restent telles que le serveur les a rendues.

     14/09, à l'intégration — l'attribut est posé SUR LE NŒUD, pas par un
     `setState` : la règle `react-hooks/set-state-in-effect` du dépôt est en
     erreur, et un état ne servirait à rien ici puisque rien d'autre ne
     dépend de lui (React ne repeindrait qu'un attribut qu'on peut écrire
     directement). L'attribut est absent du HTML du serveur, donc aucun
     écart d'hydratation. */
  useEffect(() => {
    if (!vu) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    racine.current?.setAttribute("data-rejoue", "oui");
  }, [vu]);

  return (
    <div ref={racine} className={cn("jd", className)}>
      <div className="jd-barre">
        <span aria-hidden className="jd-pastilles">
          {[0, 1, 2].map((k) => (
            <i key={k} className="jd-pastille" />
          ))}
        </span>
        <span className="jd-titre-barre">Omega.AI : demandes reçues par le site</span>
      </div>

      <ul role="list" className="jd-liste">
        {LIGNES.map((ligne, i) => (
          <li
            key={ligne.titre}
            className="jd-ligne"
            style={{ "--jd-retard": `${i * PAS_MS}ms` } as CSSProperties}
          >
            <span className="num jd-heure">{ligne.heure}</span>
            <Trait genre={ligne.genre} />
            <span className="jd-titre">{ligne.titre}</span>
            <span className="jd-etat">{ligne.etat}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
