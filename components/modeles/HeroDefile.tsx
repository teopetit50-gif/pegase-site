"use client";

import { useCallback, useRef, useSyncExternalStore } from "react";
import Image from "next/image";
import Link from "next/link";
import { motion, useScroll, useSpring, useTransform, type MotionValue } from "motion/react";
import { capture, parSlug, type Modele } from "./donnees";
import "./HeroDefile.css";

/* ══════════════════════════════════════════════════════════════════════
   <HeroDefile> — le hero de /modeles en trois rangées qui glissent (14/09/2026)

   ORIGINE. « Hero Parallax » d'Aceternity UI (aceternity/hero-parallax,
   ui.aceternity.com) : un en-tête titre + texte, puis trois rangées de cinq
   cartes-produits posées en flex, qui glissent horizontalement en sens
   alternés pendant le défilement, tandis que le bloc entier se redresse
   (rotateX 15° → 0, rotateZ 20° → 0, translateY, opacité) — le tout piloté
   par useScroll / useTransform / useSpring de motion/react.

   POURQUOI ICI. Le hero d'avant était un collage figé de douze vignettes
   dans un cadre noir, titre blanc par-dessus. Ici les mêmes vitrines
   deviennent des CARTES CLIQUABLES qui passent sous les yeux : on voit
   quinze sites, on lit leur nom au survol, on ouvre la démonstration d'un
   clic. Le hero cesse d'être une image de fond et devient la première
   page du catalogue.

   CE QUI EST JETÉ de la source, et pourquoi :
   1. `h-[300vh]` et `py-40` : la section pesait trois écrans, pensée pour
      un desktop seul. Ramenée à ~200 vh à 1440 (min-height + contenu), et
      à ~145 vh sur téléphone avec trois rangées de cartes de 200 px.
   2. La course verticale -700 → +500 px et le rotateZ à 20° : les cartes
      passaient SOUS le titre au chargement. Ici les rangées vivent dans une
      scène clipée qui commence sous l'en-tête — elles ne peuvent jamais
      recouvrir le texte — et la course est ramenée à -140 → +100 au
      bureau, -80 → +100 sur téléphone (le padding-top de la scène y est
      plus petit en pixels : à -140 la première rangée naissait coupée),
      le rotateZ à 12°.
   3. `<img>` nu chargé depuis Unsplash : next/image `fill` sur les
      captures locales de public/modeles/, avec `sizes` par palier.
   4. `whileHover={{ y: -20 }}` sur la carte : le lien intérieur se lève en
      CSS (HeroDefile.css), ce qui laisse le `x` de motion seul sur la
      carte et s'éteint proprement sous prefers-reduced-motion.
   5. Le voile noir à 80 % : trop lourd sur un monde clair, 45 % suffit à
      porter le nom en blanc.
   6. `text-white` / `dark:` de l'en-tête : monde clair, encre noire sur
      blanc, classes .m-h1 / .m-chapo / .m-btn de la page.

   ÉCARTS ASSUMÉS :
   · Les quinze cartes sont des <li> dans trois <ul>, chacune un vrai lien
     vers la démonstration — pas des <div> décoratifs.
   · Sur écran tactile (hover: none), le nom du modèle est affiché en
     permanence sur une bande sombre en pied de carte : sans survol, une
     carte muette ne dit pas ce qu'elle ouvre.
   · prefers-reduced-motion : rendu statique, rangées posées, aucun
     MotionValue appliqué. Lecture par useSyncExternalStore (instantané
     serveur « animé »), pas de lecture de window au rendu initial.
   · Sans JavaScript, les rangées restent dans leur pose de départ
     (inclinées, à 55 % d'opacité) : visibles et cliquables, mais pas
     redressées.
   ══════════════════════════════════════════════════════════════════════ */

/* ——— les quinze vitrines ———
   Les douze slugs de MUR, puis trois autres (schedule, folio, synthai),
   rangés pour que CHAQUE rangée alterne sombre et clair : sur un fond
   blanc, deux captures claires côte à côte se fondent l'une dans l'autre.
     rangée 1 : clair · sombre · clair · sombre · clair
     rangée 2 : sombre · clair · sombre · clair · sombre
     rangée 3 : clair · sombre · clair · sombre · clair */
const RANGEES: string[][] = [
  ["kinto", "proactiv", "flux", "sage", "sonic"],
  ["hive", "originx", "fincash", "studio", "aspect"],
  ["gray", "template07", "schedule", "folio", "synthai"],
];

const MODELES_RANGEES: Modele[][] = RANGEES.map((r) => r.map(parSlug));

/* ——— lecture d'une media query sans toucher à window au rendu ———
   L'instantané serveur vaut toujours `false` : « animé » pour le
   mouvement réduit, « desktop » pour le palier mobile. Le client relit la
   vraie valeur à l'hydratation et suit ses changements. */
function useMedia(requete: string): boolean {
  const abonner = useCallback(
    (rappel: () => void) => {
      const mq = window.matchMedia(requete);
      mq.addEventListener("change", rappel);
      return () => mq.removeEventListener("change", rappel);
    },
    [requete]
  );
  return useSyncExternalStore(
    abonner,
    () => window.matchMedia(requete).matches,
    () => false
  );
}

/* course horizontale d'une rangée sur toute la hauteur de la section :
   les cartes de 200 px du téléphone n'ont pas besoin des 800 px du bureau */
const AMPLITUDE = { bureau: 800, mobile: 420 };

/* pose de départ verticale du bloc (scrollYProgress 0). Elle doit rester
   sous le padding-top de .hd-scene, coins levés par rotateZ compris,
   sinon la première rangée est coupée au chargement : le padding vaut
   ~99 px à 1440×900 (la projection de rotateX rabaisse le bord haut de
   ~70 px et compense) mais ~152 px à 390×844, où rotateX ne rend que
   ~20 px et où les coins montent de ~40 px. */
const DEPART_Y = { bureau: -140, mobile: -80 };

export default function HeroDefile({
  ancreCatalogue = "#modeles",
}: {
  /* cible du second bouton — l'ancre du catalogue, plus bas dans la page.
     `#modeles` est l'id que porte la section 3 de app/modeles/page.tsx et
     que vise déjà le lien « Voir les démonstrations → » du bandeau : une
     seule ancre pour le même catalogue. */
  ancreCatalogue?: string;
}) {
  const ref = useRef<HTMLElement>(null);
  const reduit = useMedia("(prefers-reduced-motion: reduce)");
  const mobile = useMedia("(max-width: 767px)");

  /* capturé par les transformateurs ci-dessous : motion les relit à
     chaque rendu (useCombineMotionValues), donc le changement de palier
     est pris en compte sans recâblage */
  const amplitude = mobile ? AMPLITUDE.mobile : AMPLITUDE.bureau;
  const departY = mobile ? DEPART_Y.mobile : DEPART_Y.bureau;

  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start start", "end start"],
  });

  const ressort = { stiffness: 300, damping: 30 };

  const versLaDroite = useSpring(
    useTransform(scrollYProgress, (p) => p * amplitude),
    ressort
  );
  const versLaGauche = useSpring(
    useTransform(scrollYProgress, (p) => -p * amplitude),
    ressort
  );
  const rotateX = useSpring(useTransform(scrollYProgress, [0, 0.2], [15, 0]), ressort);
  const rotateZ = useSpring(useTransform(scrollYProgress, [0, 0.2], [12, 0]), ressort);
  const translateY = useSpring(useTransform(scrollYProgress, [0, 0.2], [departY, 100]), ressort);
  const opacity = useSpring(useTransform(scrollYProgress, [0, 0.2], [0.55, 1]), ressort);

  return (
    <section ref={ref} data-monde="clair" className="hd relative isolate overflow-hidden">
      {/* ——— l'en-tête : les textes exacts du hero d'avant, encre sur blanc ——— */}
      <div className="hd-tete m-wrap relative z-10">
        {/* 15ch : le titre tombe en deux lignes équilibrées (« Un site qui
            vous / ramène des clients ») au lieu de laisser « clients »
            orphelin sur la seconde. */}
        <h1 data-arrivee="hero-titre" className="m-h1 max-w-[15ch]">
          Un site qui reçoit, apprend et relance
        </h1>
        <p data-arrivee="hero-chapo" className="m-chapo mt-5 max-w-xl">
          Vingt et un modèles en ligne, consultables immédiatement. Le design change d&apos;un modèle à l&apos;autre&nbsp;; ce qu&apos;il y a derrière, jamais.
        </p>
        <div data-arrivee="hero-bloc" className="mt-8 flex flex-wrap items-center gap-3">
          {/* depuis la galerie, « Commencer » mène DIRECTEMENT à l'offre
              site (/tarifs/site), pas à l'aiguillage à trois cartes */}
          <Link
            href="/tarifs/site"
            className="m-btn hd-btn inline-flex items-center gap-2.5 py-3 pl-6 pr-2.5 text-[15px]"
          >
            Commencer
            <span className="hd-chevron flex h-7 w-7 items-center justify-center rounded-full">
              <svg width="12" height="12" viewBox="0 0 16 16" fill="none" aria-hidden>
                <path
                  d="M3 8h9M8.5 4.5 12 8l-3.5 3.5"
                  stroke="#fff"
                  strokeWidth="1.7"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </span>
          </Link>
          <a
            href={ancreCatalogue}
            className="hd-btn-contour rounded-[var(--radius-btn)] border border-black/20 px-6 py-3 text-[15px] font-medium text-[color:var(--m-encre)] transition-colors hover:border-black/45"
          >
            Voir les 21 modèles
          </a>
        </div>
      </div>

      {/* ——— la scène : clipée, elle commence SOUS l'en-tête, donc aucune
          carte ne peut jamais passer sous le titre, quel que soit le
          translateY. C'est elle qui porte la perspective et le fondu des
          bords, jamais la section (le fondu mangerait le début du titre). ——— */}
      <div data-arrivee="collage" className="hd-scene relative z-0">
        <motion.div
          className="hd-bloc"
          style={reduit ? undefined : { rotateX, rotateZ, translateY, opacity }}
        >
          {MODELES_RANGEES.map((rangee, i) => (
            <ul
              key={rangee[0].slug}
              className={`hd-rangee${i % 2 === 0 ? " hd-rangee--inverse" : ""}`}
            >
              {rangee.map((m) => (
                <Carte
                  key={m.slug}
                  m={m}
                  x={reduit ? null : i % 2 === 0 ? versLaDroite : versLaGauche}
                  priority={i === 0}
                />
              ))}
            </ul>
          ))}
        </motion.div>
      </div>
    </section>
  );
}

function Carte({
  m,
  x,
  priority,
}: {
  m: Modele;
  /* null = rendu statique (mouvement réduit) */
  x: MotionValue<number> | null;
  priority: boolean;
}) {
  /* le fond ne se voit que le temps du chargement de la capture, et sous
     les coins arrondis : les jetons de la page, pas des gris à part */
  const fond = m.theme === "sombre" ? "var(--m-sombre)" : "var(--m-carte)";
  return (
    <motion.li className="hd-carte" style={x ? { x } : undefined}>
      <a
        href={m.demo}
        target="_blank"
        rel="noopener noreferrer"
        aria-label={`Ouvrir la démonstration du modèle ${m.nom} dans un nouvel onglet`}
        className="hd-lien"
        style={{ background: fond }}
      >
        <Image
          src={capture(m)}
          alt={`Aperçu du modèle ${m.nom}\u00a0: ${m.style}`}
          fill
          sizes="(max-width: 767px) 200px, (max-width: 1023px) 320px, 400px"
          priority={priority}
          className="object-cover object-top"
        />
        <span aria-hidden className="hd-voile" />
        <span aria-hidden className="hd-nom">
          {m.nom}
        </span>
      </a>
    </motion.li>
  );
}
