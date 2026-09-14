"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { motion, useReducedMotion } from "motion/react";
import { SystemLogo } from "@/components/logos";
import "./TuilesCatalogue.css";

/* ══════════════════════════════════════════════════════════════════════
   TUILES DU CATALOGUE — les quatre cartes de l'accueil, animées (11/09/2026)

   ORIGINE. `bento-grid-01` de @avanishverma4 (21st.dev) — des tuiles qui
   portent CHACUNE une animation en boucle au-dessus de son intitulé. C'est
   le composant que Teo a désigné ; sa contribution propre n'est pas une
   géométrie, c'est le MOUVEMENT au-dessus du texte.

   Remplace `GrilleSystemes` (components/ui/integrations-three.tsx, repris
   de cnblocks le matin même). Le fichier reste au dépôt, plus personne ne
   l'appelle : ses quatre cartes étaient justes mais immobiles, et la
   section se lisait comme un sommaire.

   ——— trois écarts au composant d'origine ——————————————————————————————

   1. LA GRILLE RESTE EN 2 × 2 ÉGAL. La source range six tuiles sur six
      colonnes, dont deux hautes (2×2) et deux standard (2×1) — c'est ce
      qu'a repris /offres pour ses quatre arguments. Ici NON : le chapô
      annonce « quatre systèmes, quatre leviers », et deux tuiles hautes
      contre deux petites diraient que deux produits comptent plus. Teo a
      demandé « le même design » : les quatre gardent leur largeur
      (~490 px) et leur hauteur.

   2. LES TUILES SONT DES PORTES, DONC DES `<Link>`. La source pose des
      `motion.div` décoratifs. Chaque carte mène à sa page produit, d'où le
      `group`, `.o-card-porte` et le chevron qui avance — conservés tels
      quels de la grille précédente.

   3. ENCRE SUR PAPIER, PAS BLANC SUR NOIR. La source peint ses formes en
      `bg-white/[0.16]` sur `zinc-950`. Le catalogue de l'accueil est clair
      à filet doré (Teo, 11/09, choix confirmé : les bandes noires ont été
      retirées de cette page en août). Les formes passent donc en encre
      diluée, et l'accent est porté par le FILET doré — jamais par un
      aplat : un or franc étalé sur une carte blanche vire au moutarde.
      L'or n'est pas réécrit ici : il est porté par `.tc-filet[data-on]`,
      dans la feuille co-localisée TuilesCatalogue.css, qui résout le
      `rgba(var(--or), …)` hérité de la carte. `motion` ne garde que ce
      qu'il sait interpoler — l'en-tête de cette feuille dit pourquoi, et
      c'est le piège qui a coûté deux passes de recette.

   ——— ce qui a été évité, et qui coûte une demi-heure sinon ————————————

   • PAS DE `whileInView` SUR LA CARTE. L'entrée des blocs appartient à
     GSAP (`[data-reveal]`, components/PageMotion.tsx, qui pose opacity/y
     puis `overwrite: true`). Deux moteurs sur la même propriété du même
     nœud, et la carte reste à mi-chemin. Seul l'INTÉRIEUR des tuiles est
     animé par `motion`, et la carte garde son `data-reveal`.

   • PAS D'`AnimatePresence`. La source s'en sert avec un `animate` en
     `repeat: Infinity` dont la transition s'applique aussi à la SORTIE :
     sous `mode="wait"` l'élément suivant n'entre jamais. Ici les quatre
     animations ne font que cycler un index sur un `setInterval` — rien à
     monter ni démonter, donc le piège ne peut pas se poser.

   • LES ANIMATIONS NE SONT PAS DES PROPS. Le composant est client, la page
     qui l'appelle est serveur : une fonction passée en prop rend 500 en
     production sans que `tsc` ni `eslint` ne le voient. Les visuels sont
     donc choisis ICI, par le sigle (une chaîne, qui traverse).

   • L'ÉTAT INERTE EST POSÉ EN DUR DANS `style`, pas seulement dans
     `animate`. Deux raisons qui se cumulent : un `border` Tailwind v4 sans
     couleur peint en `currentColor` — donc en ENCRE PLEINE — et avant
     hydratation aucune valeur de `motion` n'est encore appliquée. La tuile
     se montrait donc une fraction de seconde avec des filets noirs et des
     barres invisibles (relevé au CDP le 11/09 : `rgb(9, 9, 11)` sur les
     quatorze nœuds de la première tuile).

     ⚠ ET C'EST `initial`, PAS `style`. Poser la valeur inerte dans `style`
     règle bien le premier rendu, mais casse l'animation : React réécrit
     l'attribut `style` à CHAQUE rendu et efface ce que `motion` venait
     d'interpoler — les accents dorés ne sont alors jamais apparus (même
     relevé, deux minutes plus tard). `initial` est rendu côté serveur dans
     l'attribut `style` par `motion` lui-même, puis `motion` garde la main
     sur la propriété. `style` ne garde donc que la GÉOMÉTRIE, jamais une
     propriété animée.

   • AUCUN CHIFFRE, AUCUN LIBELLÉ dans les visuels. Ce sont des barres et
     des pastilles : montrer « 3 relances » ou un montant serait inventer
     une donnée que le site ne promet nulle part.

   `prefers-reduced-motion` : les quatre se figent sur leur état d'arrivée
   (échéance marquée, file priorisée, demandes qualifiées, documents
   classés) au lieu de boucler. La source ne le faisait pas.
   ══════════════════════════════════════════════════════════════════════ */

/* encre diluée : les trois crans des formes inertes, tièdes et marquées */
const INERTE = "rgba(24, 24, 27, 0.08)";
const TIEDE = "rgba(24, 24, 27, 0.16)";
const MARQUE = "rgba(24, 24, 27, 0.30)";
/* le filet au repos vit désormais dans TuilesCatalogue.css (`.tc-filet`) */

const DOUX = { duration: 0.45, ease: [0.16, 1, 0.3, 1] as const };
const GLISSE = { duration: 0.55, ease: [0.16, 1, 0.3, 1] as const };

/* minuteur commun aux quatre visuels. Un rAF serait cadencé à l'image et
   resterait bloqué sur sa valeur de montage tant que l'onglet dort.

   ⚠ L'ÉTAT D'ARRIVÉE EST DÉRIVÉ, PAS RANGÉ DANS `useState`. Un
   `useState(fige ? arrivee : 0)` ne marche pas : `useReducedMotion()` rend
   `null` au premier rendu (il lit la requête média au montage), donc `fige`
   y vaut toujours faux — et la valeur initiale d'un `useState` ne se relit
   jamais. Les tuiles se figeaient alors sur l'état VIDE : aucune échéance
   marquée, aucune demande qualifiée, les pièces encore en pile. Immobile,
   donc « conforme » à une sonde qui ne vérifie que l'immobilité, et pourtant
   exactement l'inverse de ce qu'on veut montrer à quelqu'un qui a coupé les
   animations. Relevé à la recette du 11/09. */
function useCycle(modulo: number, ms: number, fige: boolean, arrivee: number) {
  const [tic, setTic] = useState(0);
  useEffect(() => {
    if (fige) return;
    const t = setInterval(() => setTic((p) => p + 1), ms);
    return () => clearInterval(t);
  }, [fige, ms]);
  /* l'état est DÉRIVÉ, pas rangé : c'est ce qui permet à `fige` d'imposer
     l'arrivée sans écrire dans un effet (que `react-hooks/set-state-in-effect`
     refuse, à raison — un `setEtat` dans un effet fait un rendu de plus). */
  return fige ? arrivee : tic % modulo;
}

/* ——— 1 · RELANCES — « les échéances sont suivies » ———
   trois échéances empilées ; celle qui arrive à terme se marque et prend
   le filet doré. Rien ne part : la carte dit « préparées », pas « envoyées ». */
function Echeancier({ fige }: { fige: boolean }) {
  const actif = useCycle(3, 1500, fige, 2);
  const largeurs = [124, 96, 110];

  return (
    /* le groupe est CENTRÉ dans la tuile, et la piste a une largeur fixe :
       sans elle, la pastille suit la barre et les trois se décalent en
       escalier — l'irrégularité se voit avant l'animation. */
    <div className="flex h-full items-center justify-center">
      <div className="flex flex-col gap-3">
      {[0, 1, 2].map((i) => {
        const on = i === actif;
        return (
          <div key={i} className="flex items-center gap-3">
            <span className="block w-[124px]">
              <motion.span
                className="block h-[7px] rounded-full"
                style={{ width: largeurs[i] }}
                initial={{ backgroundColor: INERTE }}
                animate={{ backgroundColor: on ? MARQUE : INERTE }}
                transition={DOUX}
              />
            </span>
            <motion.span
              className="tc-filet h-[13px] w-[13px] rounded-full border"
              data-on={on ? "oui" : "non"}
              initial={{ scale: 1 }}
              animate={{ scale: on ? 1.15 : 1 }}
              transition={DOUX}
            />
          </div>
        );
      })}
      </div>
    </div>
  );
}

/* ——— 2 · REPRISE — « identifiés, priorisés et remis dans le bon circuit » ———
   la file se réordonne : c'est le mécanisme `layout` de la source (ses
   blocs qui se recomposaient), réaffecté à la priorisation. Le premier rang
   se marque à chaque recomposition. */
const ORDRES = [
  [0, 1, 2, 3],
  [2, 0, 3, 1],
  [1, 3, 0, 2],
];
function Repriorisation({ fige }: { fige: boolean }) {
  const etape = useCycle(3, 2400, fige, 1);
  const largeurs = [132, 104, 118, 88];

  return (
    <div className="flex h-full items-center justify-center">
      <div className="flex flex-col gap-2.5">
        {ORDRES[etape].map((id, rang) => (
          <motion.span
            key={id}
            layout
            className="h-[9px] rounded-full"
            style={{ width: largeurs[id] }}
            initial={{ backgroundColor: INERTE }}
            animate={{ backgroundColor: rang === 0 ? MARQUE : INERTE }}
            transition={{ layout: GLISSE, backgroundColor: DOUX }}
          />
        ))}
      </div>
    </div>
  );
}

/* ——— 3 · ACCUEIL — « analysée, qualifiée et préparée pour réponse » ———
   trois demandes se qualifient l'une après l'autre, puis la file repart.
   La coche est un trait, pas un aplat vert : rien n'est envoyé. */
function Qualification({ fige }: { fige: boolean }) {
  const faites = useCycle(4, 900, fige, 3);

  return (
    <div className="flex h-full items-center justify-center">
      <div className="flex flex-col gap-2.5">
      {[0, 1, 2].map((i) => {
        const on = i < faites;
        return (
          <div
            key={i}
            className="tc-filet flex items-center justify-between gap-3 rounded-md border px-2.5 py-[7px]"
            data-on={on ? "oui" : "non"}
            style={{ width: 156 }}
          >
            <motion.span
              className="h-[6px] rounded-full"
              style={{ width: [64, 46, 56][i] }}
              initial={{ backgroundColor: INERTE }}
              animate={{ backgroundColor: on ? MARQUE : INERTE }}
              transition={DOUX}
            />
            <motion.svg
              width="13"
              height="13"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth={2.8}
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden
              initial={{ opacity: 0.18, color: TIEDE }}
              animate={{ opacity: on ? 1 : 0.18, color: on ? "rgba(24,24,27,0.75)" : TIEDE }}
              transition={DOUX}
            >
              <path d="M20 6 9 17l-5-5" />
            </motion.svg>
          </div>
        );
      })}
      </div>
    </div>
  );
}

/* ——— 4 · FACTURES — « lus, contrôlés, classés et transmis » ———
   les pièces quittent la pile et se rangent dans trois casiers. Les casiers
   sont dessinés au trait pointillé pour se lire comme des emplacements
   vides, sans rien nommer. */
function Classement({ fige }: { fige: boolean }) {
  const rangees = useCycle(4, 1100, fige, 3);
  const casiers = [-30, 0, 30];

  return (
    <div className="flex h-full items-center justify-center">
      <div className="relative h-[96px] w-[190px]">
        {/* les trois casiers */}
        {casiers.map((y, i) => (
          <span
            key={`casier-${i}`}
            className="tc-filet absolute rounded-[5px] border border-dashed"
            style={{
              width: 46,
              height: 26,
              right: 4,
              top: 35 + y,
            }}
          />
        ))}
        {/* les trois pièces */}
        {[0, 1, 2].map((i) => {
          const rangee = i < rangees;
          return (
            <motion.span
              key={i}
              className="tc-filet absolute rounded-[5px] border"
              data-on={rangee ? "oui" : "non"}
              style={{ width: 44, height: 24, left: 6, top: 36 }}
              initial={{
                x: i * 5, y: i * -4, rotate: -7 + i * 3,
                backgroundColor: "rgba(24,24,27,0.04)",
              }}
              animate={{
                x: rangee ? 134 : i * 5,
                y: rangee ? casiers[i] : i * -4,
                rotate: rangee ? 0 : -7 + i * 3,
                backgroundColor: rangee ? "rgba(255,255,255,1)" : "rgba(24,24,27,0.04)",
              }}
              transition={GLISSE}
            />
          );
        })}
      </div>
    </div>
  );
}

/* le visuel par sigle — et non par prop, voir l'en-tête */
function Visuel({ system, fige }: { system: string; fige: boolean }) {
  switch (system) {
    case "CASHD":
      return <Echeancier fige={fige} />;
    case "RELOAD":
      return <Repriorisation fige={fige} />;
    case "FRONTD":
      return <Qualification fige={fige} />;
    case "FILED":
      return <Classement fige={fige} />;
    default:
      /* un système entré dans VEDETTES sans visuel garde une carte muette
         plutôt qu'un trou : la tuile se referme sur le texte. */
      return null;
  }
}

/* chevron recopié plutôt qu'importé de MediaMoteurs : huit lignes de SVG
   contre tout ce module tiré dans le paquet client. */
function Chevron({ taille = 12 }: { taille?: number }) {
  return (
    <svg
      width={taille}
      height={taille}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2.2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="m9 18 6-6-6-6" />
    </svg>
  );
}

export type TuileCatalogue = {
  /* sigle interne (CASHD, RELOAD…) : porte le logo, le visuel et la clé.
     Jamais affiché. */
  system: string;
  nom: string;
  objectif: string;
  texte: string;
  href: string;
};

export function TuilesCatalogue({
  tuiles,
  className = "",
}: {
  tuiles: TuileCatalogue[];
  className?: string;
}) {
  const fige = useReducedMotion() ?? false;

  return (
    /* EXACTEMENT QUATRE ENFANTS DIRECTS. Le liseré doré est décalé d'un
       quart de cycle par `.o-card-or:nth-child(2|3|4)` : un enveloppeur
       autour d'une carte, ou un cinquième nœud dans la grille, et la vague
       redevient un clignotement d'un bloc. */
    <div
      className={`mx-auto grid max-w-[1000px] grid-cols-1 gap-4 sm:grid-cols-2 ${className}`}
    >
      {tuiles.map((t) => (
        <Link
          key={t.system}
          href={t.href}
          data-reveal
          className="o-card-soft o-card-porte o-card-or group flex flex-col p-6 lg:p-8"
        >
          <div
            aria-hidden
            className="mb-7 h-[104px] shrink-0 sm:h-[116px]"
          >
            <Visuel system={t.system} fige={fige} />
          </div>

          <div className="flex items-center gap-3">
            <SystemLogo system={t.system} />
            <span
              className="text-[15px] font-semibold tracking-[-0.02em] text-[var(--o-text)]"
              style={{ fontFamily: "var(--font-jakarta)" }}
            >
              {t.nom}
            </span>
          </div>

          <h3
            className="mt-6 text-[18px] font-semibold leading-[1.35] tracking-[-0.02em] text-[var(--o-text)]"
            style={{ fontFamily: "var(--font-jakarta)" }}
          >
            {t.objectif}
          </h3>
          <p className="o-body mt-2 !text-[15px] !leading-[26px]">{t.texte}</p>

          <span className="o-link mt-auto self-start pt-6 !text-[14px]">
            Voir le détail
            <Chevron taille={12} />
          </span>
        </Link>
      ))}
    </div>
  );
}
