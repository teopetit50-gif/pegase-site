"use client";

import { useEffect, useRef, useState } from "react";
import { useMotionValueEvent, useScroll } from "motion/react";
import { cn } from "@/lib/cn";
import "./DerouleAudit.css";

/* ══════════════════════════════════════════════════════════════════════
   <DerouleAudit> — « Comment se passe l'audit », à volet collant
   (14/09/2026)

   ORIGINE. « Sticky Scroll Reveal » d'Aceternity UI
   (aceternity/sticky-scroll-reveal) : une colonne de texte défile, une
   colonne VISUELLE reste collée à côté, et le visuel bascule quand
   l'étape courante change — bascule lue à `useScroll` +
   `useMotionValueEvent`. C'est le seul geste qu'on garde : un texte qui
   progresse, et un repère qui répond, sans rien à cliquer.

   POURQUOI ICI. Les trois temps étaient trois colonnes côte à côte : à
   1440 on les lit d'un coup, donc comme trois options simultanées, alors
   que le déroulé est une SUITE — on ne chiffre pas avant d'avoir écouté.
   Et rien ne disait jamais « il en reste deux ». Le volet dit les deux
   choses à la fois : où on en est, et ce qui vient après.

   CE QUI EST JETÉ.
   1. `h-[30rem] overflow-y-auto` : la source enferme tout dans un
      ascenseur DANS la page — deux barres imbriquées, le piège de ce
      composant. Ici c'est la fenêtre qui défile, `target` est la liste.
   2. Les six dégradés cyan/emerald, pink/indigo, orange/yellow et le
      `backgroundColor` animé slate-900 / noir : le monde est blanc,
      quasi monochrome, sans un dégradé ni une couleur d'accent.
   3. Les seuils `index / cardLength` : trois tranches égales ne savent
      pas où commence un temps dont le texte est plus long que les
      autres. `scrollYProgress` reste l'HORLOGE (il cadence le rappel),
      mais l'oracle est la position réelle des trois blocs.
   4. Le dégradé de texte à 0,3 d'opacité pour les temps inactifs : à ce
      niveau le corps de texte passe sous le seuil de contraste AA. Ici le
      CORPS ne bouge jamais ; seuls le filet de gauche et l'encre du titre
      se retirent, et le titre gris reste à 5:1.
   5. `content[activeCard].content` remplacé en place : le volet ne
      remplace rien, il marque. Aucune hauteur ne saute.

   ÉCARTS ASSUMÉS.
   · Le volet est un SOMMAIRE, pas une figure : il reprend les trois
     libellés d'étape et les trois titres de la page, rien d'autre. Une
     figure au trait « écouter / cartographier / chiffrer » aurait été du
     meublage — la page n'a pas de matière à montrer, et elle se l'était
     déjà interdit (en-tête de page.tsx, « remplacés plutôt que
     meublés »). Il est donc `aria-hidden` : tout ce qu'il dit est déjà lu
     dans la colonne de gauche.
   · Aucun état React pour le mode : `data-mode` est posé par
     `setAttribute` dans l'effet, jamais par un `setState` (la règle
     `react-hooks/set-state-in-effect` du dépôt). Seul le rang actif est
     un état, et il n'est écrit que depuis le rappel de défilement.
   · Valeur de repos FINIE : sans JavaScript, `data-mode` vaut « repos »
     et aucune règle de retrait ne s'applique — les trois temps sont à
     pleine encre et les trois puces du volet sont pleines. Le JavaScript
     ne fait que RETIRER l'encre des deux autres.
   · Le `[data-reveal]` de la page reste, mais sur la CARTE et non sur le
     `<li>` mesuré : GSAP écrit `opacity` et `transform` en style en
     ligne, or la mesure porte sur la boîte du `<li>`, que le transform
     d'un enfant ne déplace pas. Le marquage n'emploie ni `opacity` ni
     `transform`, il n'y a donc pas deux mécaniques sur la même propriété.
   · Sous `lg` : une colonne, volet masqué, AUCUN marquage — la carte y
     est celle d'aujourd'hui, au pixel près (rayon 16, fond blanc, marges
     28 puis 36 à partir de 640). Le geste n'a pas de sens sans la
     seconde colonne, et une barre de progression collée en haut serait
     entrée en conflit avec le header caméléon du site.
   ══════════════════════════════════════════════════════════════════════ */

export type Temps = { etape: string; titre: string; texte: string };

/* La ligne de décision, en part de hauteur de fenêtre. Un temps devient
   courant quand son HAUT la franchit, et le reste jusqu'à ce que le
   suivant la franchisse à son tour — c'est-à-dire pendant tout le trajet
   qui le mène de la mi-hauteur au bord haut, exactement le moment où on
   le lit. Trop bas, on marque ce qu'on n'a pas encore lu ; trop haut, on
   marque ce qu'on vient de quitter. */
const LIGNE = 0.45;

export default function DerouleAudit({
  temps,
  className,
}: {
  temps: Temps[];
  className?: string;
}) {
  const racine = useRef<HTMLDivElement>(null);
  const liste = useRef<HTMLOListElement>(null);
  const cellules = useRef<(HTMLLIElement | null)[]>([]);
  /* « est-ce que le défilement a le droit de retirer quelque chose ? » —
     en ref et non en état : le rappel de défilement doit pouvoir le lire
     sans qu'un changement de réglage ne redéclenche un rendu. */
  const pilote = useRef(false);
  const [actif, setActif] = useState(0);

  /* L'horloge : la traversée de la liste par la fenêtre, du moment où
     son haut entre par le bas jusqu'à ce que son bas sorte par le haut.
     On ne se sert pas de la VALEUR (voir « CE QUI EST JETÉ », point 3),
     seulement du rappel qu'elle déclenche à chaque trame utile. */
  const { scrollYProgress } = useScroll({
    target: liste,
    offset: ["start end", "end start"],
  });

  /* matchMedia n'est lu qu'ici, jamais au rendu. On pose un ATTRIBUT :
     aucun `setState` dans un effet, et aucune différence entre le balisage
     du serveur et le premier rendu client (les deux disent « repos »). */
  useEffect(() => {
    const el = racine.current;
    if (!el) return;
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const lire = () => {
      pilote.current = !mq.matches;
      el.setAttribute("data-mode", mq.matches ? "pose" : "defile");
    };
    lire();
    mq.addEventListener("change", lire);
    return () => mq.removeEventListener("change", lire);
  }, []);

  /* Le rang courant : le DERNIER temps dont le haut a franchi la ligne,
     0 tant qu'aucun ne l'a franchie. Monotone, donc la lecture remonte
     comme elle est descendue. Trois `getBoundingClientRect` par trame —
     trois lectures, aucune écriture, donc aucun aller-retour de calcul de
     mise en page. La mise à jour sort par la même valeur quand rien n'a
     changé : React n'a alors rien à refaire. */
  useMotionValueEvent(scrollYProgress, "change", () => {
    if (!pilote.current) return;
    const seuil = window.innerHeight * LIGNE;
    const noeuds = cellules.current;
    let rang = 0;
    for (let i = 0; i < noeuds.length; i += 1) {
      const n = noeuds[i];
      if (n && n.getBoundingClientRect().top <= seuil) rang = i;
    }
    setActif((p) => (p === rang ? p : rang));
  });

  return (
    <div ref={racine} data-mode="repos" className={cn("dra", className)}>
      <ol ref={liste} className="dra-liste">
        {temps.map((t, i) => (
          <li
            key={t.etape}
            ref={(el) => {
              cellules.current[i] = el;
            }}
            data-vif={i === actif ? "oui" : "non"}
            className="dra-temps"
          >
            {/* [data-reveal] sur la CARTE : c'est le <li> qu'on mesure */}
            <div data-reveal className="dra-carte">
              <p className="dra-etape">{t.etape}</p>
              <h3 className="r-h4 dra-titre">{t.titre}</h3>
              <p className="dra-texte">{t.texte}</p>
            </div>
          </li>
        ))}
      </ol>

      {/* Le sommaire collant. Il ne dit rien que la colonne de gauche ne
          dise déjà : masqué aux lecteurs d'écran, il n'existe que pour
          l'œil qui a besoin de savoir où il en est. */}
      <aside aria-hidden="true" className="dra-volet">
        <div className="dra-sommaire">
          <ol className="dra-rangs">
            {temps.map((t, i) => (
              <li
                key={t.etape}
                data-vif={i === actif ? "oui" : "non"}
                className="dra-rang"
              >
                <span className="dra-puce" />
                <span className="dra-rang-textes">
                  <span className="dra-rang-etape">{t.etape}</span>
                  <span className="dra-rang-titre">{t.titre}</span>
                </span>
              </li>
            ))}
          </ol>
        </div>
      </aside>
    </div>
  );
}
