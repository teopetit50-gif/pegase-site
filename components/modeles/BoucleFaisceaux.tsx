"use client";

import { useEffect, useId, useRef, useState, useSyncExternalStore } from "react";
import { motion } from "motion/react";
import { cn } from "@/lib/cn";
import "./BoucleFaisceaux.css";

/* ══════════════════════════════════════════════════════════════════════
   <BoucleFaisceaux> — le trajet d'une demande, dessiné en faisceaux
   (14/09/2026). Remplace <Boucle> dans la section 4 de /modeles.

   ORIGINE. `animated-beam` de Magic UI (magicui.design/r/animated-beam) :
   un SVG posé sur un conteneur `relative`, qui trace un chemin entre deux
   éléments mesurés par `getBoundingClientRect`, avec une courbure
   quadratique, et fait courir dessus un dégradé lumineux en boucle
   (`motion.linearGradient` de motion/react). Recalcul au redimensionnement
   par ResizeObserver.

   POURQUOI ICI. L'ancienne <Boucle> disait « la boucle se referme » avec
   une phrase et une petite icône de flèche circulaire, sous un rail en
   pseudo-éléments qui s'arrêtait net au cinquième jalon : le retour vers
   le premier n'était jamais DESSINÉ. Ici les cinq jalons sont reliés par
   des faisceaux, et le cinquième revient au premier par un arc que le
   lecteur voit se refermer avant de lire un mot. Une impulsion parcourt
   la boucle dans l'ordre 1 → 2 → 3 → 4 → 5 → 1 : c'est l'argument de la
   section rendu visible.

   CE QUI EST JETÉ de la source :
   1. Le violet et l'orange du dégradé (#9c40ff, #ffaa40) : le monde de
      /modeles est blanc et noir. La lueur va de l'encre au gris --m-faible,
      le chemin de base est le filet --m-filet. Les <stop> lisent les
      jetons par `style={{ stopColor: "var(…)" }}` — c'est l'ATTRIBUT
      stop-color qui n'accepte pas var(), pas la propriété.
   2. Un SVG par faisceau : cinq SVG superposés mesuraient cinq fois le
      même conteneur. Un seul SVG porte les cinq faisceaux, mesurés d'un
      coup ; chaque faisceau est un <g> avec son propre dégradé.
   3. Le balayage en pourcentages du viewport (x1 10 % → 110 %) : la lueur
      traversait tout le conteneur et n'était visible qu'un cinquième du
      temps sur un segment court. Le balayage est calculé en unités
      utilisateur sur l'étendue du segment, et il sait suivre l'axe
      vertical (colonne mobile), ce que la source ne faisait pas.
   4. `cn` de `@/lib/utils` : ici c'est `@/lib/cn`.
   5. L'appel synchrone de `updatePath()` dans l'effet : la notification
      initiale du ResizeObserver suffit et évite un setState dans l'effet.

   PALIERS. Colonne unique jusqu'à `lg`, cinq colonnes à partir de `lg`
   (1024 px) — comme l'ancienne <Boucle>. Entre 768 et 1023 px, cinq
   colonnes feraient ~118 px chacune : les textes de 140 à 152 signes y
   tenaient sur 8 à 9 lignes. Le palier intermédiaire `sm:grid-cols-2` de
   la source n'est pas repris : en deux colonnes, le rail de retour d'une
   colonne à l'autre n'a pas de tracé propre.

   ÉCARTS ASSUMÉS :
   · Les textes sont AU-DESSUS des pastilles dès `lg`, et non dessous. Un
     arc quadratique de 80 à 120 px de flèche qui passe « sous la rangée »
     ne peut pas coexister avec des textes sous les pastilles : il les
     traverserait aux colonnes 2 à 4. Numéro, titre et texte lisent donc
     d'abord, la rangée d'icônes reliées ferme le panneau, et l'arc de
     retour dessous ne croise rien.
   · Sous `lg`, le retour 5 → 1 n'est pas un arc quadratique mais un rail
     droit à coins arrondis, à gauche des pastilles : un arc bulbeux
     frôlait les pastilles 2 à 4, le rail passe à 16 px d'elles.
   · Le numéro sort de la pastille (qui porte l'icône) et devient un
     sur-titre `.m-sur` en mono : « 01 » … « 05 » au lieu de « 1 » … « 5 »,
     parce qu'un chiffre seul en capitales mono espacées flotte ; à deux
     chiffres, le sur-titre a une largeur.
   · La pastille fait 40 px sous `lg` (comme la source) et 56 px en
     rangée : en colonne, chaque pixel de pastille est pris sur la colonne
     de texte (~238 px à 390).
   · La phrase « Et ça recommence. … » de l'ancienne <Boucle> est gardée
     en légende de la figure : elle dit en mots ce que l'arc dessine.
   · 15/09 (Teo, « on dirait de la critique ») : les cinq textes et la
     légende sont réécrits au registre grands comptes. Ils décrivaient la
     boucle par ce qui manque ailleurs (« ne part pas dans une boîte mail
     où il se perdra », « personne n'attend le lundi matin », « une
     relance, pas une publicité ») ; ils décrivent maintenant ce que le
     système fait, puis ce qui reste à faire au lecteur. Plus aucune
     antithèse « pas X, c'est Y » dans la section.
   ══════════════════════════════════════════════════════════════════════ */

const TRAIT = {
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.4,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
};

/* Pictogrammes repris de <Boucle> : traits fins, même grille de 24. */
const ICONES = {
  formulaire: (
    <svg viewBox="0 0 24 24" {...TRAIT} aria-hidden>
      <rect x="3.5" y="4" width="17" height="13" rx="2" />
      <path d="M7 8.5h7M7 12h4.5" />
      <path d="M14.5 15.5l2.6 2.6 1.4-1.4-2.6-2.6z" />
    </svg>
  ),
  reponse: (
    <svg viewBox="0 0 24 24" {...TRAIT} aria-hidden>
      <path d="M20 12.5a7 7 0 0 1-7 7H8l-4 2.5V12.5a7 7 0 0 1 7-7h2a7 7 0 0 1 7 7z" />
      <path d="M9.5 12.5h5" />
    </svg>
  ),
  devis: (
    <svg viewBox="0 0 24 24" {...TRAIT} aria-hidden>
      <path d="M14 3.5H7a2 2 0 0 0-2 2v13a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2v-8z" />
      <path d="M14 3.5V10h5" />
      <path d="M8.5 16.5a3 3 0 1 0 .9-2.1" />
      <path d="M8.4 12.2v2.4h2.4" />
    </svg>
  ),
  facture: (
    <svg viewBox="0 0 24 24" {...TRAIT} aria-hidden>
      <rect x="3" y="6" width="18" height="12" rx="2" />
      <path d="M3 10h18" />
      <path d="M7 14.5h3.5" />
    </svg>
  ),
  avis: (
    <svg viewBox="0 0 24 24" {...TRAIT} aria-hidden>
      <path d="M12 4.5l2.4 4.9 5.4.8-3.9 3.8.9 5.4-4.8-2.5-4.8 2.5.9-5.4-3.9-3.8 5.4-.8z" />
    </svg>
  ),
};

/* Données locales au composant (pas d'export : un module « use client » ne
   doit pas offrir un tableau de JSX à un composant serveur). L'insécable
   avant les deux-points est écrit en échappement, jamais en caractère. */
const JALONS = [
  {
    n: "01",
    icone: ICONES.formulaire,
    titre: "La demande arrive",
    texte:
      "Chaque formulaire crée une ligne dans votre espace, horodatée, avec la page d'origine et le terme qui y était cherché. Vos équipes voient ce qui est demandé, par qui, et depuis combien de temps.",
  },
  {
    n: "02",
    icone: ICONES.reponse,
    titre: "La réponse part en deux minutes",
    texte:
      "Le système envoie un accusé de réception sous votre signature, avec le délai de traitement que vous annoncez. Le demandeur sait que sa demande est enregistrée, et vos équipes disposent de ce délai pour répondre.",
  },
  {
    n: "03",
    icone: ICONES.devis,
    titre: "Le devis est relancé",
    texte:
      "Sans réponse, le devis repart à J+3 puis à J+7, sous votre signature. Chaque message vous est soumis avant l'envoi\u00a0: vous le validez, le corrigez ou vous suspendez la séquence.",
  },
  {
    n: "04",
    icone: ICONES.facture,
    titre: "La facture suit le même parcours",
    texte:
      "Le devis accepté devient une facture, puis l'impayé entre dans la même séquence de relance. Le système suit les règlements poste par poste et signale ce qui reste dû.",
  },
  {
    n: "05",
    icone: ICONES.avis,
    titre: "L'avis est demandé",
    texte:
      "Une fois la commande livrée ou la prestation terminée, la demande d'avis part au moment où la satisfaction est la plus forte. Les retours reviennent dans votre espace, rattachés à la commande.",
  },
];

/* ——— réglages du dessin ——— */
const FLECHE_ARC = 88; // flèche de l'arc de retour, en ligne (px sous les centres)
const RAIL_ECART = 16; // colonne : air entre le rail de retour et le bord des pastilles
const RAYON_COIN = 16; // colonne : rayon des deux coins du rail de retour
const EPAISSEUR = 1.75;
const FILET = "rgba(0, 0, 0, 0.16)"; /* 14/09 : --m-filet (8 %) se perdait sur le panneau #f2f2f2 */
const ENCRE = "var(--m-encre)";
const GRIS = "var(--m-faible)";

/* Cadence : une impulsion fait le tour en PERIODE secondes. Chaque faisceau
   la porte pendant DUREE, en partant à son tour — quatre segments puis le
   retour — et se rallume une période plus tard. */
const PERIODE = 6;
const DUREE = 1.2;

type Segment = {
  d: string;
  axe: "x" | "y";
  /** étendue du segment sur son axe : min, max */
  de: number;
  a: number;
  /** vrai pour le retour : l'impulsion va de `a` vers `de` */
  inverse: boolean;
};

type Geometrie = { largeur: number; hauteur: number; segments: Segment[] };

const arrondi = (n: number) => Math.round(n * 10) / 10;

/* ——— la mesure ———
   Tout part des rectangles des pastilles, relatifs au conteneur. Le sens
   (rangée ou colonne) se lit dans la géométrie elle-même : pas de
   matchMedia à tenir synchrone avec le palier Tailwind. */
function mesurer(conteneur: HTMLElement, pastilles: (HTMLElement | null)[]): Geometrie | null {
  const rc = conteneur.getBoundingClientRect();
  if (rc.width === 0 || rc.height === 0) return null;
  const c: { x: number; y: number; r: number }[] = [];
  for (const el of pastilles) {
    if (!el) return null;
    const r = el.getBoundingClientRect();
    c.push({ x: r.left - rc.left + r.width / 2, y: r.top - rc.top + r.height / 2, r: r.width / 2 });
  }
  if (c.length < 2) return null;

  const enLigne = c[1].x - c[0].x > 10;
  const segments: Segment[] = [];

  for (let i = 0; i < c.length - 1; i++) {
    const p = c[i];
    const q = c[i + 1];
    segments.push({
      d: `M ${arrondi(p.x)} ${arrondi(p.y)} L ${arrondi(q.x)} ${arrondi(q.y)}`,
      axe: enLigne ? "x" : "y",
      de: enLigne ? Math.min(p.x, q.x) : Math.min(p.y, q.y),
      a: enLigne ? Math.max(p.x, q.x) : Math.max(p.y, q.y),
      inverse: false,
    });
  }

  const premier = c[0];
  const dernier = c[c.length - 1];
  if (enLigne) {
    /* l'arc passe SOUS la rangée : point de contrôle à deux flèches sous
       les centres, la courbe descend donc d'une flèche exactement */
    const y = arrondi(dernier.y);
    segments.push({
      d: `M ${arrondi(dernier.x)} ${y} Q ${arrondi((premier.x + dernier.x) / 2)} ${arrondi(
        dernier.y + 2 * FLECHE_ARC
      )} ${arrondi(premier.x)} ${y}`,
      axe: "x",
      de: Math.min(premier.x, dernier.x),
      a: Math.max(premier.x, dernier.x),
      inverse: true,
    });
  } else {
    /* colonne : sortie par le flanc gauche de la dernière pastille, rail
       vertical à RAIL_ECART du bord des pastilles (quelle que soit leur
       taille), retour par le flanc gauche de la première */
    const cx = arrondi(premier.x - premier.r - RAIL_ECART);
    const rc2 = RAYON_COIN;
    segments.push({
      d:
        `M ${arrondi(dernier.x - dernier.r)} ${arrondi(dernier.y)} ` +
        `H ${arrondi(cx + rc2)} ` +
        `A ${rc2} ${rc2} 0 0 1 ${cx} ${arrondi(dernier.y - rc2)} ` +
        `V ${arrondi(premier.y + rc2)} ` +
        `A ${rc2} ${rc2} 0 0 1 ${arrondi(cx + rc2)} ${arrondi(premier.y)} ` +
        `H ${arrondi(premier.x - premier.r)}`,
      axe: "y",
      de: Math.min(premier.y, dernier.y),
      a: Math.max(premier.y, dernier.y),
      inverse: true,
    });
  }

  return { largeur: arrondi(rc.width), hauteur: arrondi(rc.height), segments };
}

/* ——— prefers-reduced-motion, sans écart d'hydratation ———
   Instantané serveur : false. Le client relit la préférence au premier
   rendu utile et suit ses changements. */
const REQUETE = "(prefers-reduced-motion: reduce)";
const abonner = (cb: () => void) => {
  const mq = window.matchMedia(REQUETE);
  mq.addEventListener("change", cb);
  return () => mq.removeEventListener("change", cb);
};
const lireReduit = () => window.matchMedia(REQUETE).matches;
const lireReduitServeur = () => false;

/* ——— un faisceau : le chemin de base, et la lueur qui le parcourt ———
   Réécriture de <AnimatedBeam>. Le dégradé est en unités utilisateur : la
   tête (offset 0, encre pleine) précède la queue (offset 1, transparente)
   d'une longueur de bande, et les deux balayent l'étendue du segment. */
function Faisceau({
  seg,
  id,
  delai,
  anime,
}: {
  seg: Segment;
  id: string;
  delai: number;
  anime: boolean;
}) {
  const bande = Math.max(48, (seg.a - seg.de) * 0.5);
  const tete = seg.inverse ? [seg.a, seg.de - bande] : [seg.de, seg.a + bande];
  const queue = seg.inverse ? [seg.a + bande, seg.de] : [seg.de - bande, seg.a];
  const horizontal = seg.axe === "x";
  const depart = horizontal
    ? { x1: tete[0], x2: queue[0], y1: 0, y2: 0 }
    : { x1: 0, x2: 0, y1: tete[0], y2: queue[0] };
  const arrivee = horizontal
    ? { x1: tete, x2: queue, y1: [0, 0], y2: [0, 0] }
    : { x1: [0, 0], x2: [0, 0], y1: tete, y2: queue };

  return (
    <g>
      <path
        d={seg.d}
        fill="none"
        style={{ stroke: FILET }}
        strokeWidth={EPAISSEUR}
        strokeLinecap="round"
      />
      {anime && (
        <g className="bf-lueur">
          <path
            d={seg.d}
            fill="none"
            stroke={`url(#${id})`}
            strokeWidth={EPAISSEUR}
            strokeLinecap="round"
          />
          <defs>
            <motion.linearGradient
              id={id}
              gradientUnits="userSpaceOnUse"
              initial={depart}
              animate={arrivee}
              transition={{
                delay: delai,
                duration: DUREE,
                ease: "easeInOut",
                repeat: Infinity,
                repeatDelay: PERIODE - DUREE,
              }}
            >
              <stop offset="0" style={{ stopColor: ENCRE }} stopOpacity="0" />
              <stop offset="0" style={{ stopColor: ENCRE }} />
              <stop offset="0.325" style={{ stopColor: GRIS }} />
              <stop offset="1" style={{ stopColor: GRIS }} stopOpacity="0" />
            </motion.linearGradient>
          </defs>
        </g>
      )}
    </g>
  );
}

export default function BoucleFaisceaux() {
  const conteneur = useRef<HTMLDivElement>(null);
  const pastilles = useRef<(HTMLElement | null)[]>([]);
  const [geo, setGeo] = useState<Geometrie | null>(null);
  const reduit = useSyncExternalStore(abonner, lireReduit, lireReduitServeur);
  const base = useId().replace(/[^\w-]/g, "");

  useEffect(() => {
    const el = conteneur.current;
    if (!el) return;
    /* Le ResizeObserver notifie dès `observe()` : c'est la mesure initiale.
       Il refire quand la colonne change de largeur (paliers) ou quand les
       textes reflowent (polices chargées), ce qui déplace les pastilles. */
    const obs = new ResizeObserver(() => {
      const suivant = mesurer(el, pastilles.current);
      if (!suivant) return;
      setGeo((prec) => (prec && JSON.stringify(prec) === JSON.stringify(suivant) ? prec : suivant));
    });
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  return (
    <figure data-reveal className="m-panneau mt-12 p-5 sm:p-8 lg:p-10">
      {/* Le conteneur mesuré : un <div> et non l'<ol>, dont le modèle de
          contenu n'admet que des <li>. Le SVG est son frère, pas son
          enfant ; les deux ont la même boîte (le pl-2 est intérieur à
          l'<ol>), la mesure ne change pas. */}
      <div ref={conteneur} className="relative">
        {/* Les faisceaux : un seul SVG, derrière les pastilles, jamais
            cliquable, débordant du conteneur sans le déformer (l'arc de
            retour vit dans la marge du panneau). */}
        {geo && (
          <svg
            className="bf-svg"
            viewBox={`0 0 ${geo.largeur} ${geo.hauteur}`}
            aria-hidden
            focusable="false"
          >
            {geo.segments.map((seg, i) => (
              <Faisceau
                key={i}
                seg={seg}
                id={`bf-${base}-${i}`}
                delai={i * DUREE}
                anime={!reduit}
              />
            ))}
          </svg>
        )}

        {/* role="list" : avec list-style none, VoiceOver retire la
            sémantique de liste ; on la rend explicitement. */}
        <ol
          role="list"
          className="bf-jalons m-0 grid list-none grid-cols-1 gap-y-7 p-0 pl-2 lg:grid-cols-5 lg:gap-x-6 lg:pl-0"
        >
          {JALONS.map((j, i) => (
            <li
              key={j.n}
              className="relative flex items-start gap-4 lg:flex-col-reverse lg:items-center lg:gap-0 lg:text-center"
            >
              <span
                ref={(el) => {
                  pastilles.current[i] = el;
                }}
                aria-hidden
                className={cn(
                  "relative z-10 grid size-10 shrink-0 place-items-center rounded-full lg:size-14",
                  "border border-[color:var(--m-filet)] bg-[color:var(--m-carte)] text-[color:var(--m-encre)]",
                  "[&>svg]:h-5 [&>svg]:w-5 lg:[&>svg]:h-[22px] lg:[&>svg]:w-[22px]"
                )}
              >
                {j.icone}
              </span>

              <div className="min-w-0 flex-1 lg:mb-6 lg:flex lg:w-full lg:flex-col lg:items-center">
                <span className="m-sur">{j.n}</span>
                <h3 className="mt-2 text-[15px] leading-snug lg:text-[16px]">{j.titre}</h3>
                <p className="mt-2 text-[13.5px] leading-relaxed text-[color:var(--m-doux)] lg:text-[14px]">
                  {j.texte}
                </p>
              </div>
            </li>
          ))}
        </ol>
      </div>

      {/* La légende : en mots, ce que l'arc dessine. En rangée, l'arc
          descend d'une flèche (FLECHE_ARC = 88 px) sous les centres, soit
          60 px sous le bas des pastilles de 56 ; le filet est à 88 px
          (lg:mt-[5.5rem]) : 28 px d'air. */}
      <figcaption className="mt-8 flex items-center gap-3 border-t border-[color:var(--m-filet)] pt-6 text-[13.5px] text-[color:var(--m-doux)] lg:mt-[5.5rem]">
        <svg
          viewBox="0 0 24 24"
          {...TRAIT}
          aria-hidden
          className="h-[18px] w-[18px] shrink-0 text-[color:var(--m-encre)]"
        >
          <path d="M20 11.5a8 8 0 1 1-2.4-5.7" />
          <path d="M20.5 3.5V8h-4.5" />
        </svg>
        <p>
          <span className="text-[color:var(--m-encre)]">Et le site apprend.</span>{" "}
          Ce qui est demandé le plus souvent, ce qui est cherché sans résultat et les pages
          d&apos;où les visiteurs repartent&nbsp;: votre espace le présente en clair. Un client déjà
          venu qui revient sur une gamme reçoit une relance adaptée à son historique.
        </p>
      </figcaption>
    </figure>
  );
}
