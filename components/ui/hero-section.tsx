"use client";

import { useEffect, useRef } from "react";
import "./hero-section.css";

/* ══════════════════════════════════════════════════════════════════════
   hero-section — le mouvement du hero de l'accueil (14/09/2026)

   Origine : composant « hero-section » collé par Teo — un hero plein
   écran noir dont le titre se peint mot à mot, sur une trame quadrillée,
   avec des équerres de coin, des points flottants et une lueur qui suit
   le pointeur.

   Ce qui est repris : les quatre mouvements et leurs courbes, à
   l'identique (voir `hero-section.css`, qui porte le détail du relevé et
   des écarts). Ce qui ne l'est pas : la mise en page et les couleurs. Teo
   a tranché le 14/09 — le hero de l'accueil RESTE clair, on ne lui prend
   que l'animation. Le composant d'origine était monolithique (sa
   structure, ses textes et son mouvement dans un seul fichier) ; il est
   coupé ici en deux pièces qu'on pose sur le hero existant, sans toucher
   ni au nuancier Silk, ni à la maquette, ni au plancher de lisibilité.

   Deux corrections de fond au passage, l'une et l'autre volontaires :

   · les délais ne sont plus des `setTimeout` posés après montage. La
     référence rend d'abord ses mots visibles, puis les efface pour les
     rejouer — un clignotement à chaque chargement, et rien du tout si le
     JavaScript tombe. Ici chaque mot porte son `animation-delay` en CSS :
     le rendu serveur est déjà juste, et il n'y a aucun timer à nettoyer.
   · les écouteurs de la référence sont posés sur `document` (souris,
     clic, défilement) et ne sont jamais tous retirés. Le seul gardé est
     celui du pointeur, borné à la section.

   Est volontairement jeté : l'onde au clic (elle ajoutait un nœud au
   `<body>` à chaque clic de la page, navigation comprise) et la mise en
   route des points flottants au premier défilement (ils sont sous la
   ligne de flottaison une fois sur deux, donc ne partaient jamais).
   ══════════════════════════════════════════════════════════════════════ */

/* ——————————————————————————————————————————————————————————————
   Le texte qui se peint mot à mot
   —————————————————————————————————————————————————————————————— */

/* Découpe en gardant les séparateurs : ils sont rendus comme des nœuds de
   texte ENTRE les spans, jamais dans un span. C'est ce qui préserve les
   espaces insécables des textes du parc — les avaler dans un
   `inline-block` les aurait rendus sécables. */
const decouper = (texte: string) => texte.split(/(\s+)/);

/* Le composant prend TOUTES les lignes du titre, et pas une seule : c'est
   lui qui continue la cascade d'une ligne sur l'autre. Deux raisons.

   La première est une erreur payée sur place : la page d'accueil est un
   composant SERVEUR, et ce fichier est `"use client"`. Un helper exporté
   d'ici (« compte les mots de la ligne précédente ») devient une
   référence client — l'appeler pendant le rendu serveur fait tomber la
   route entière, pas seulement le hero. Le décompte reste donc de ce
   côté-ci de la frontière. Voir la leçon jumelle sur les fonctions
   passées d'un serveur à un client.

   La seconde est que le rang du mot est la seule chose qui compte pour
   l'œil : une phrase qui repart à zéro à chaque ligne se lit comme deux
   vagues parallèles. */
export function MotsReveles({
  lignes,
  depart = 0,
  pas = 75,
}: {
  lignes: string | string[];
  /** délai du premier mot, en ms */
  depart?: number;
  /** écart entre deux mots, en ms */
  pas?: number;
}) {
  const tableau = Array.isArray(lignes) ? lignes : [lignes];
  let rang = 0;
  return (
    <>
      {tableau.map((ligne, i) => (
        <span key={ligne} className={i > 0 ? "block" : undefined}>
          {decouper(ligne).map((morceau, j) => {
            if (!morceau.trim()) return <span key={j}>{morceau}</span>;
            const delai = depart + pas * rang++;
            return (
              <span
                key={j}
                className="o-mot"
                style={{ "--o-mot-d": `${delai}ms` } as React.CSSProperties}
              >
                {morceau}
              </span>
            );
          })}
        </span>
      ))}
    </>
  );
}

/* ——————————————————————————————————————————————————————————————
   Le décor : trame, filets, points, équerres, points flottants, lueur
   —————————————————————————————————————————————————————————————— */

/* Positions figées, jamais tirées au hasard au rendu : un aléatoire ici
   casserait l'hydratation (le serveur et le navigateur ne tireraient pas
   les mêmes nombres). Même règle que les anciens filets de vitesse du
   hero nuit. */
/* Les hauteurs ne sont plus celles de la référence (25 / 60 / 40 / 75 %) :
   son hero fait exactement une hauteur d'écran, le nôtre monte à 1 500 px à
   partir de lg et ses deux tiers du bas sont occupés par la maquette du
   tableau de bord — donc coupés par le fondu de la couche. Deux points sur
   quatre tombaient dans la zone effacée et n'existaient pas. Tous sont
   ramenés dans la moitié haute, en gardant l'écart gauche/droite. */
const FLOTTANTS = [
  { top: "25%", left: "15%", retard: "0s" },
  { top: "48%", left: "85%", retard: "0.5s" },
  { top: "40%", left: "10%", retard: "1s" },
  { top: "44%", left: "90%", retard: "1.5s" },
];

/* Même raison pour les équerres : la référence en pose quatre parce que son
   hero est un cadre fermé d'une hauteur d'écran. Ici le bas du hero n'est
   jamais vu — il est sous la maquette, dans le fondu — et deux équerres
   posées là auraient été deux nœuds invisibles. Les deux du haut suffisent
   à donner l'angle. */
const COINS = ["hg", "hd"] as const;

export function DecorHero() {
  const cadre = useRef<HTMLDivElement>(null);
  const lueur = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = cadre.current;
    const halo = lueur.current;
    if (!el || !halo) return;
    /* pas de lueur au doigt : sans survol elle resterait allumée là où le
       dernier appui a eu lieu. Et rien du tout en mouvement réduit. */
    if (!window.matchMedia("(hover: hover) and (pointer: fine)").matches) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    /* la couche de décor est en `pointer-events: none` : c'est la section
       qui reçoit les événements, et c'est elle qui borne la lueur */
    const section = el.parentElement;
    if (!section) return;

    const bouge = (e: PointerEvent) => {
      const r = el.getBoundingClientRect();
      halo.style.transform = `translate(${e.clientX - r.left - 192}px, ${e.clientY - r.top - 192}px)`;
      halo.style.opacity = "1";
    };
    const sort = () => {
      halo.style.opacity = "0";
    };

    section.addEventListener("pointermove", bouge);
    section.addEventListener("pointerleave", sort);
    return () => {
      section.removeEventListener("pointermove", bouge);
      section.removeEventListener("pointerleave", sort);
    };
  }, []);

  return (
    <div ref={cadre} aria-hidden className="o-hero-decor">
      {/* la trame et ses filets vivent dans un cadre à part : lui seul
          porte le trou qui épargne la colonne de texte (voir la feuille) */}
      <div className="o-hero-trame">
        <svg xmlns="http://www.w3.org/2000/svg">
          <defs>
            <pattern id="o-hero-trame" width="60" height="60" patternUnits="userSpaceOnUse">
              <path d="M 60 0 L 0 0 0 60" fill="none" stroke="rgba(10,10,10,0.04)" strokeWidth="0.5" />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#o-hero-trame)" />

          <line x1="0" y1="20%" x2="100%" y2="20%" className="o-hero-filet" style={{ animationDelay: "0.5s" }} />
          <line x1="0" y1="80%" x2="100%" y2="80%" className="o-hero-filet" style={{ animationDelay: "1s" }} />
          <line x1="20%" y1="0" x2="20%" y2="100%" className="o-hero-filet" style={{ animationDelay: "1.5s" }} />
          <line x1="80%" y1="0" x2="80%" y2="100%" className="o-hero-filet" style={{ animationDelay: "2s" }} />

          <circle cx="20%" cy="20%" r="2" className="o-hero-point" style={{ animationDelay: "3s" }} />
          <circle cx="80%" cy="20%" r="2" className="o-hero-point" style={{ animationDelay: "3.2s" }} />
          <circle cx="20%" cy="80%" r="2" className="o-hero-point" style={{ animationDelay: "3.4s" }} />
          <circle cx="80%" cy="80%" r="2" className="o-hero-point" style={{ animationDelay: "3.6s" }} />
        </svg>
      </div>

      {COINS.map((c, i) => (
        <div
          key={c}
          className={`o-hero-coin o-hero-coin-${c}`}
          style={{ animationDelay: `${1.4 + i * 0.12}s` }}
        >
          <i />
        </div>
      ))}

      {FLOTTANTS.map((f) => (
        <div
          key={f.top + f.left}
          className="o-hero-flotte"
          style={{ top: f.top, left: f.left, animationDelay: f.retard }}
        />
      ))}

      <div ref={lueur} className="o-hero-lueur" />
    </div>
  );
}
