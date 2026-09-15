"use client";

import { useEffect, useRef, type CSSProperties } from "react";
import { useScroll, useTransform } from "motion/react";
import { cn } from "@/lib/cn";
import { RACCORDEMENT } from "@/lib/integrations";
import "./FriseRaccordement.css";

/* ══════════════════════════════════════════════════════════════════════
   <FriseRaccordement> — les quatre étapes du raccordement (/integrations,
   section 3) — 14/09/2026

   ORIGINE. `timeline` de @manuarora700 (Aceternity UI) — le .tsx et son
   PROMPT.md sont dans OMEGA/toyota-guadeloupe/bibliotheque/composants/
   divers/aceternity__timeline.
   Son idée réelle, et la seule reprise : un rail dont la portion parcourue
   se REMPLIT au fil du défilement (useScroll + useTransform), pendant que
   les jalons s'allument au passage du remplissage. Le déroulé se lit alors
   dans la page elle-même au lieu d'être énoncé par quatre numéros posés
   côte à côte.

   POURQUOI ICI. Les quatre étapes étaient quatre colonnes coiffées d'un
   filet gris continu : à 1440 elles se lisaient d'un coup, donc comme
   quatre options simultanées — alors que la page dit justement l'inverse
   (« toujours dans le même ordre, et toujours en lecture avant
   l'écriture »). Le rail remet l'ordre dans la lecture, et il le fait sans
   ajouter un mot ni un objet : c'est le filet qui existait déjà, qui
   devient une jauge.

   ⚠ Il existe DÉJÀ une reprise verticale de cette même source dans
   components/accueil/FriseDeroule.tsx (le déroulé du chantier, sur
   l'accueil). Celle-ci ne la remplace pas et ne l'importe pas : elle est
   HORIZONTALE dès 1024 px, ses étapes n'ont pas de sous-titre, et sa
   mécanique est entièrement différente (voir ÉCARTS). Ne pas les fusionner
   sans regarder les deux pages.

   CE QUI EST JETÉ. Le rail VERTICAL de la source, dès 1024 px : la
   section garde ses quatre colonnes, c'est le filet horizontal qui se
   remplit de gauche à droite. Le dégradé violet → bleu de la tête de rail :
   le monde est monochrome, le rail prend l'encre (--o-text) et n'a pas de
   tête. Son en-tête en dur (« Changelog from my journey ») : la pastille,
   le titre et le chapô restent dans page.tsx. Ses `dark:`, son `max-w-7xl`,
   ses `md:px-10` (la colonne est .o-wrap), ses titres en `md:text-5xl
   font-bold` (la charte a .o-h5). Sa colonne collante (`sticky top-40`) :
   elle n'a de sens que sur une frise d'un écran et demi de haut. Et surtout
   son `useState(height)` posé DANS un useEffect — interdit par l'ESLint du
   dépôt (react-hooks/set-state-in-effect), et de toute façon inutile ici :
   le remplissage est une fraction, pas une hauteur en pixels.

   ÉCARTS ASSUMÉS.
   • LE PIÈGE DE CE COMPOSANT, traité de front : au repos le rail est PLEIN
     et les quatre jalons sont allumés. Le HTML livré ne porte AUCUNE valeur
     de remplissage ; tout est lu dans `var(--frs-p, 1)`, dont la valeur par
     défaut est 1 — soit « rempli ». Le JavaScript ne fait que RETIRER du
     remplissage en écrivant --frs-p sur le cadre. Sans JavaScript, sous
     prefers-reduced-motion (où la feuille reprend la main avec un
     `!important`) ou si ce fichier casse : la frise se lit entière.
   • La valeur est écrite au `style.setProperty` d'une ref, jamais par un
     setState ni par un `style` de motion : un `style` rendu par motion
     serait SÉRIALISÉ dans le HTML du serveur à sa valeur de départ (0), et
     le rail arriverait VIDE sans JavaScript — exactement ce qu'on refuse.
   • Une seule fraction (0 → 1) pilote tout : chaque étape porte son seuil
     --frs-seuil (i / nombre de segments) et la feuille en tire, par un
     `clamp()`, la longueur de son segment et l'opacité de son jalon. Pas de
     hook dans une boucle, pas de sous-composant par étape.
   • Sous 1024 px, UNE étape par rangée (la source n'en met pas deux non
     plus) : la grille `sm:grid-cols-2` d'avant disparaît, un rail vertical
     ne peut pas traverser deux colonnes. C'est plus haut, c'est le prix du
     séquencement.
   • [data-reveal] est posé sur le CORPS de chaque étape, jamais sur
     l'étape entière : GSAP translate ses cibles de 26 px en quinconce, et
     les segments de rail, qui débordent d'une étape sur la suivante, se
     décaleraient les uns des autres pendant l'entrée. Le rail est la
     structure, il est là d'emblée ; ce sont les textes qui montent.
   • <ol> et non une grille de <div> : quatre étapes numérotées dans un
     ordre imposé sont une liste ordonnée. `role="list"` parce que
     `list-style: none` retire les semantics de liste à VoiceOver.
   ══════════════════════════════════════════════════════════════════════ */

/* Nombre de SEGMENTS de rail = nombre d'étapes − 1. C'est l'inverse du pas
   entre deux seuils, et la feuille s'en sert comme multiplicateur (jamais
   comme diviseur : une division par une var() en CSS est moins sûre qu'une
   multiplication). Borné à 1 pour qu'une liste d'une seule étape ne donne
   jamais un seuil 0/0. */
const PAS = Math.max(1, RACCORDEMENT.length - 1);

export default function FriseRaccordement({ className }: { className?: string }) {
  const cadre = useRef<HTMLOListElement>(null);

  /* La frise traverse la fenêtre : 0 quand son haut touche 85 % de la
     hauteur d'écran (elle vient d'entrer), 1 quand son bas remonte à 55 %
     (elle est lue). À 1440 la frise fait ~200 px de haut, le remplissage
     dure donc ~470 px de défilement ; à 390 elle en fait ~800, et il dure
     toute sa traversée. */
  const { scrollYProgress } = useScroll({
    target: cadre,
    offset: ["start 85%", "end 55%"],
  });

  /* La part parcourue, en TEXTE et SANS unité. Sans unité parce que la
     feuille doit pouvoir la comparer aux seuils (`p − seuil`) autant que
     l'étirer (`calc(part * 100%)`) : un « 43% » interdirait la soustraction.
     Arrondie au millième — mille marches sont plus que ce que l'œil sépare,
     et on n'écrit pas quinze décimales soixante fois par seconde. */
  const part = useTransform(scrollYProgress, (p) =>
    Math.min(1, Math.max(0, p)).toFixed(3)
  );

  useEffect(() => {
    const el = cadre.current;
    if (!el) return;
    /* Mouvement réduit : on ne retire JAMAIS le remplissage. La variable
       n'est pas écrite, la valeur par défaut (1) reste, la frise est
       pleine. La feuille pose la même garantie de son côté, au cas où le
       réglage changerait en cours de visite. */
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const poser = (v: string) => el.style.setProperty("--frs-p", v);
    /* la valeur de départ : `on("change")` ne tire pas au montage, et sans
       cette ligne une frise restée hors champ garderait son rail plein */
    poser(part.get());
    return part.on("change", poser);
  }, [part]);

  return (
    <ol
      ref={cadre}
      role="list"
      className={cn("frs-cadre", className)}
      style={{ "--frs-pas": String(PAS) } as CSSProperties}
    >
      {RACCORDEMENT.map((e, i) => (
        <li
          key={e.n}
          className="frs-etape"
          style={{ "--frs-seuil": (i / PAS).toFixed(4) } as CSSProperties}
        >
          {/* le segment qui mène au jalon suivant — la dernière étape n'en
              a pas. Ornement : rien à annoncer. */}
          {i < RACCORDEMENT.length - 1 && (
            <span aria-hidden className="frs-fil">
              <span className="frs-fil-plein" />
            </span>
          )}

          {/* le jalon : deux disques empilés dans la même cellule de
              grille, le noir par-dessus le blanc, dont l'opacité est la
              seule chose qui bouge. Deux couches et non un `color-mix` :
              le numéro doit passer de l'encre au blanc EN MÊME TEMPS que le
              disque, et une couche qui rate se lit au pire comme « allumé »,
              qui est l'état de repos voulu. */}
          <span className="frs-jalon">
            <span className="frs-jalon-off">{e.n}</span>
            <span aria-hidden className="frs-jalon-on">
              {e.n}
            </span>
          </span>

          <div data-reveal className="frs-corps">
            <h3 className="o-h5">{e.titre}</h3>
            <p className="o-small frs-texte">{e.texte}</p>
          </div>
        </li>
      ))}
    </ol>
  );
}
