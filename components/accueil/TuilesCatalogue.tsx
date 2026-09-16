"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { motion, useReducedMotion } from "motion/react";
import { SystemSigne } from "@/components/logos";
import {
  PatternCard,
  PatternCardBody,
} from "@/components/ui/card-with-ellipsis-pattern";
import "./TuilesCatalogue.css";

/* ══════════════════════════════════════════════════════════════════════
   TUILES DU CATALOGUE — les quatre cartes de l'accueil

   16/09/2026 — LES CARTES PASSENT AU SEMIS DE PASTILLES. Teo : « change
   le design de ces cartes de la page d'accueil par ce design là », le
   composant à l'appui — `card-with-ellipsis-pattern` (21st.dev) : une
   carte de papier, filet fin, coins courts, dont le fond est une trame de
   pastilles très fines qu'un dégradé blanc en biais efface vers le bas à
   gauche et laisse affleurer en haut à droite. La coque et ses écarts au
   modèle vivent dans `components/ui/card-with-ellipsis-pattern.tsx` ; ce
   fichier-ci n'en garde que le contenu.

   ⚠ C'EST LA TROISIÈME COQUE EN CINQ JOURS sur les mêmes quatre cartes —
   tuiles `bento-grid-01` le 11/09, cartes de verre le 15/09, semis le
   16/09. Le CONTENU, lui, n'a jamais bougé : signe du produit, nom,
   objectif, accroche, « Voir le détail ». C'est la preuve par l'usage que
   la séparation coque / contenu doit tenir — la prochaine reprise ne
   devrait toucher qu'au fichier de la coque et à ce `return`.

   CE QUI DISPARAÎT avec le verre : `GlassCard` et `CADRE_VERRE`, donc le
   basculement 3D au survol, les quatre disques concentriques et le disque
   blanc qui portait le signe. `components/ui/glass-card.tsx` reste au
   dépôt, plus personne ne l'appelle. Le signe, lui, revient en haut à
   gauche de la carte, en encre sur le papier — il n'a plus besoin de sa
   pastille (voir `SystemSigne`, components/logos.tsx).

   CE QUI EST CONSERVÉ de la version du 11/09 (grille `bento-grid-01`) :

   • LA GRILLE 2 × 2 ÉGALE. Le chapô annonce « quatre systèmes, quatre
     leviers » : deux tuiles hautes contre deux petites diraient que deux
     produits comptent plus.

   • LES QUATRE ANIMATIONS EN BOUCLE, une par produit. C'est ce que Teo
     avait demandé le 11/09 contre une grille « juste, mais immobile, qui
     se lisait comme un sommaire ». Le semis est une trame FIXE : sans
     elles, la section redevient ce sommaire. Elles retrouvent leur encre
     du 11/09 — le fond est revenu au papier — et ne s'affichent qu'à
     partir de `lg`, la largeur à partir de laquelle la carte dépasse
     ~460 px et laisse au visuel ses ~190 px à droite du signe.

   • LES TUILES SONT DES PORTES. Chaque carte mène à sa page produit :
     c'est le `<Link>` qui porte `group`, sans quoi le chevron de « Voir
     le détail » ne bouge plus au survol — et il ne bougerait plus en
     silence.

   ⚠ `--or` N'EST DÉCLARÉE QUE DANS LA FEUILLE CO-LOCALISÉE. Elle venait
   de `.offres .o-card-or` jusqu'au 14/09, une classe que ces cartes ne
   portent plus depuis le verre : sans la ligne de `TuilesCatalogue.css`,
   `rgba(var(--or), …)` ne résout rien et les accents dorés des animations
   passent au noir sans prévenir.

   ——— les pièges déjà payés, qui n'ont pas changé de nature ————————————

   • PAS DE `whileInView` SUR LA CARTE. L'entrée des blocs appartient à
     GSAP (`[data-reveal]`, components/PageMotion.tsx, qui pose opacity/y
     puis `overwrite: true`). Deux moteurs sur la même propriété du même
     nœud, et la carte reste à mi-chemin. Le basculement de la coque est
     posé sur un nœud INTÉRIEUR, jamais sur celui qui porte `data-reveal`.

   • LES ANIMATIONS NE SONT PAS DES PROPS. Le composant est client, la
     page qui l'appelle est serveur : une fonction passée en prop rend 500
     en production sans que `tsc` ni `eslint` ne le voient. Les visuels
     sont choisis ICI, par le sigle (une chaîne, qui traverse).

   • L'ÉTAT INERTE EST POSÉ DANS `initial`, PAS DANS `style`. Un `border`
     Tailwind v4 sans couleur peint en `currentColor`, et avant hydratation
     aucune valeur de `motion` n'est appliquée : la tuile se montrait une
     fraction de seconde avec des filets pleins. Mais `style` casse
     l'animation — React réécrit l'attribut à chaque rendu et efface ce
     que `motion` venait d'interpoler. `initial` est rendu côté serveur
     par `motion` lui-même, puis `motion` garde la main. `style` ne porte
     donc que la GÉOMÉTRIE.

   • AUCUN CHIFFRE, AUCUN LIBELLÉ dans les visuels. Ce sont des barres et
     des pastilles : montrer « 3 relances » ou un montant serait inventer
     une donnée que le site ne promet nulle part.

   `prefers-reduced-motion` : les quatre se figent sur leur état d'arrivée
   (échéance marquée, file priorisée, demandes qualifiées, documents
   classés) au lieu de boucler.
   ══════════════════════════════════════════════════════════════════════ */

/* encre diluée : les trois crans des formes inertes, tièdes et marquées.
   Valeurs du 11/09, lues sur papier — le fond a fait l'aller-retour par
   l'encre le 15/09 et y est revenu le 16. */
const INERTE = "rgba(24, 24, 27, 0.08)";
const TIEDE = "rgba(24, 24, 27, 0.16)";
const MARQUE = "rgba(24, 24, 27, 0.30)";
/* le filet au repos vit dans TuilesCatalogue.css (`.tc-filet`) */

const DOUX = { duration: 0.45, ease: [0.16, 1, 0.3, 1] as const };
const GLISSE = { duration: 0.55, ease: [0.16, 1, 0.3, 1] as const };

/* minuteur commun aux quatre visuels. Un rAF serait cadencé à l'image et
   resterait bloqué sur sa valeur de montage tant que l'onglet dort.

   ⚠ L'ÉTAT D'ARRIVÉE EST DÉRIVÉ, PAS RANGÉ DANS `useState`. Un
   `useState(fige ? arrivee : 0)` ne marche pas : `useReducedMotion()` rend
   `null` au premier rendu (il lit la requête média au montage), donc `fige`
   y vaut toujours faux — et la valeur initiale d'un `useState` ne se relit
   jamais. Les tuiles se figeaient alors sur l'état VIDE : immobile, donc
   « conforme » à une sonde qui ne vérifie que l'immobilité, et pourtant
   exactement l'inverse de ce qu'on veut montrer à quelqu'un qui a coupé
   les animations. Relevé à la recette du 11/09. */
function useCycle(modulo: number, ms: number, fige: boolean, arrivee: number) {
  const [tic, setTic] = useState(0);
  useEffect(() => {
    if (fige) return;
    const t = setInterval(() => setTic((p) => p + 1), ms);
    return () => clearInterval(t);
  }, [fige, ms]);
  return fige ? arrivee : tic % modulo;
}

/* ——— 1 · RELANCES — « les échéances sont suivies » ———
   trois échéances empilées ; celle qui arrive à terme se marque et prend
   le filet doré. Rien ne part : la carte dit « préparées », pas « envoyées ». */
function Echeancier({ fige }: { fige: boolean }) {
  const actif = useCycle(3, 1500, fige, 2);
  const largeurs = [124, 96, 110];

  return (
    /* la piste a une largeur fixe : sans elle, la pastille suit la barre
       et les trois se décalent en escalier — l'irrégularité se voit avant
       l'animation. */
    <div className="flex h-full items-center">
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
   la file se réordonne ; le premier rang se marque à chaque recomposition. */
const ORDRES = [
  [0, 1, 2, 3],
  [2, 0, 3, 1],
  [1, 3, 0, 2],
];
function Repriorisation({ fige }: { fige: boolean }) {
  const etape = useCycle(3, 2400, fige, 1);
  const largeurs = [132, 104, 118, 88];

  return (
    <div className="flex h-full items-center">
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
    <div className="flex h-full items-center">
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
                animate={{
                  opacity: on ? 1 : 0.18,
                  color: on ? "rgba(24,24,27,0.75)" : TIEDE,
                }}
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
   les pièces quittent la pile et se rangent dans trois casiers, dessinés
   au trait pointillé pour se lire comme des emplacements vides. */
function Classement({ fige }: { fige: boolean }) {
  const rangees = useCycle(4, 1100, fige, 3);
  const casiers = [-30, 0, 30];

  return (
    <div className="flex h-full items-center">
      <div className="relative h-[96px] w-[190px]">
        {casiers.map((y, i) => (
          <span
            key={`casier-${i}`}
            className="tc-filet absolute rounded-[5px] border border-dashed"
            style={{ width: 46, height: 26, right: 4, top: 35 + y }}
          />
        ))}
        {[0, 1, 2].map((i) => {
          const rangee = i < rangees;
          return (
            <motion.span
              key={i}
              className="tc-filet absolute rounded-[5px] border"
              data-on={rangee ? "oui" : "non"}
              style={{ width: 44, height: 24, left: 6, top: 36 }}
              initial={{
                x: i * 5,
                y: i * -4,
                rotate: -7 + i * 3,
                backgroundColor: "rgba(24,24,27,0.04)",
              }}
              animate={{
                x: rangee ? 134 : i * 5,
                y: rangee ? casiers[i] : i * -4,
                rotate: rangee ? 0 : -7 + i * 3,
                backgroundColor: rangee
                  ? "rgba(255,255,255,1)"
                  : "rgba(24,24,27,0.04)",
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
      className="transition-transform duration-300 group-hover:translate-x-[3px]"
    >
      <path d="m9 18 6-6-6-6" />
    </svg>
  );
}

export type TuileCatalogue = {
  /* sigle interne (CASHD, RELOAD…) : porte le signe, le visuel et la clé.
     Jamais affiché tel quel — c'est `nom` qui s'écrit. */
  system: string;
  nom: string;
  objectif: string;
  texte: string;
  /* 15/09/2026 — la même accroche en une phrase, servie sous 640 px.
     Facultative : une tuile sans version courte garde `texte` partout. */
  court?: string;
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
    <div
      className={`mx-auto grid max-w-[1000px] grid-cols-1 gap-6 sm:grid-cols-2 ${className}`}
    >
      {tuiles.map((t) => (
        <Link
          key={t.system}
          href={t.href}
          data-reveal
          /* Le lien est en COLONNE FLEX et la carte en `flex-1` : les
             trois couches de `PatternCard` sont en `size-full`, donc en
             hauteur relative — sans un parent à hauteur définie, elles se
             replient sur leur contenu et la trame s'arrête au milieu de
             la carte.

             Les planchers de hauteur alignent les quatre tuiles deux à
             deux ; sous 640 px il n'y a plus qu'une colonne, donc plus
             rien à aligner (voir le relevé du 15/09 : 330 px imposés à
             une carte qui en demandait 200 faisaient presque deux écrans
             de téléphone pour quatre lignes de produit). */
          className="tc-carte group flex flex-col sm:min-h-[300px] lg:min-h-[392px]"
        >
          <PatternCard className="tc-cadre flex-1">
            <PatternCardBody className="flex h-full flex-col p-5 sm:p-6">
              {/* la ligne haute : le signe du produit à gauche, le visuel
                  animé à droite — et seulement à partir de `lg`, la
                  largeur à partir de laquelle la carte dépasse ~460 px et
                  laisse au visuel ses ~190 px sans serrer le signe. En
                  dessous, la ligne se réduit au signe seul. */}
              <div className="flex items-start justify-between gap-6">
                <SystemSigne system={t.system} taille={26} />
                <div
                  aria-hidden
                  className="hidden h-[104px] items-center lg:flex"
                >
                  <Visuel system={t.system} fige={fige} />
                </div>
              </div>

              <span
                className="mt-5 text-[12px] font-semibold uppercase tracking-[0.18em] text-[var(--o-muted)] sm:mt-6"
                style={{ fontFamily: "var(--font-jakarta)" }}
              >
                {t.nom}
              </span>

              <h3
                className="mt-3 text-[19px] font-medium leading-[1.35] tracking-[-0.01em] text-[var(--o-text)]"
                style={{ fontFamily: "var(--font-jakarta)" }}
              >
                {t.objectif}
              </h3>
              <p className="mt-2 max-w-[34ch] text-[14px] leading-[22px] text-[var(--o-muted)] sm:mt-2.5 sm:text-[15px] sm:leading-[26px]">
                {/* les deux longueurs sont dans le DOM et s'arbitrent en
                    CSS : un rendu conditionnel en JavaScript ferait
                    clignoter la phrase entre le serveur et le client. */}
                {t.court ? (
                  <>
                    <span className="sm:hidden">{t.court}</span>
                    <span className="hidden sm:inline">{t.texte}</span>
                  </>
                ) : (
                  t.texte
                )}
              </p>

              <span className="tc-lien mt-auto inline-flex items-center gap-1.5 self-start pt-4 text-[14px] font-semibold text-[var(--o-text)] sm:pt-6">
                Voir le détail
                <Chevron taille={12} />
              </span>
            </PatternCardBody>
          </PatternCard>
        </Link>
      ))}
    </div>
  );
}
