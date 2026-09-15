"use client";

import { useRef, useState, type KeyboardEvent } from "react";
import { motion, useReducedMotion } from "motion/react";
import "./GrilleOutils.css";

/* ══════════════════════════════════════════════════════════════════════
   <GrilleOutils> — les 28 outils de /integrations, filtrés par famille
   (14/09/2026)

   ORIGINE. Le bloc `integrations/three` de Tailark : une grille de cartes
   douces, chacune un logo dans son cadre, un intitulé, une phrase courte.
   C'est `three` et non `one` ni `two` — les deux autres alignent six logos
   nus, sans un mot sur ce que l'outil fait ; or la page répond à « est-ce
   que ça marche avec MON outil ? », et c'est la phrase de raccordement qui
   y répond, pas le logo. La rangée de puces et son clavier viennent de
   <Galerie> (/modeles), qui a déjà résolu ici le groupe radio, le rail
   sous sm et le HTML complet.

   POURQUOI ICI. 07/08, Teo : « 29 cartes ouvertes d'un coup, c'était
   trop ». <FamilleOutils> tenait la règle en n'ouvrant chaque famille que
   sur sa première carte, derrière un « Voir plus » — mais il fallait
   traverser douze en-têtes et douze boutons pour voir douze premières
   cartes. Ici une seule famille est à l'écran (la première), une puce par
   famille pour changer, « Tous » en fin de rangée pour qui veut le mur.
   Le défaut reste trois cartes, jamais vingt-huit.

   LE HTML LIVRÉ CONTIENT LES 28. Les vingt-huit cartes sont toujours dans
   l'arbre ; celles hors famille portent `hidden` + `inert` (display:none,
   sorties du tab et de l'accessibilité). Les 28 noms et les 28 phrases
   sont lisibles sans JavaScript, et sans JavaScript la première famille
   est affichée. Le prix : pas de fondu de SORTIE — AnimatePresence
   l'aurait donné, mais il retire du DOM, donc du HTML.

   CE QUI EST JETÉ. `<Card variant="soft">` → `.o-card-soft`, qui EST la
   même carte (fond #fafafa, filet --o-line, rayon 20). Les jetons
   `text-muted-foreground`, `bg-foreground/5`, `*:size-10` et le
   `max-w-5xl px-6` de la source : rien de tout ça ne vaut sous `.offres`,
   dont la colonne est `.o-wrap`. Le `<h3> text-lg font-semibold` devient
   un `<p>` en 15/16 px 500 — le nom d'une marque n'est pas un titre de
   section, et <FamilleOutils> le rendait déjà ainsi. `line-clamp-2` : voir
   l'écart ci-dessous. L'en-tête de section de la source reste à la page.

   ÉCARTS ASSUMÉS.
   • PAS DE `line-clamp-2` SUR LE RÔLE. Mesuré sur OUTIL_INFOS : les 28
     phrases font 49 à 149 signes, médiane 99 ; deux lignes de 14 px à
     390 px en tiennent ~86. Clamper couperait 19 phrases sur 28, la plus
     longue (WhatsApp, 149) à mi-course. Le rôle s'affiche donc entier —
     3 à 4 lignes selon la largeur — et la grille égalise les rangées.
   • Trois colonnes à lg, pas quatre : à quatre, la ligne fait 35 signes et
     les phrases les plus longues passent à cinq lignes.
   • `layout="position"`, pas `layout` : les cartes ont toutes la même
     largeur, animer la taille ferait respirer le texte en transit.
   • Aucun survol sur la carte : elle ne mène nulle part, rien ne doit
     laisser croire qu'on peut cliquer.
   • `data-reveal` sur la rangée de puces et sur la grille entière, jamais
     sur une carte : GSAP et `motion` se disputeraient le même transform.
   • prefers-reduced-motion : ni glissement ni fondu, la famille change
     d'un coup. Sans JavaScript : première famille, puces inertes.
   ══════════════════════════════════════════════════════════════════════ */

/* Même forme que ce que la page aplatit déjà dans PAR_FAMILLE : un
   composant client ne reçoit que du sérialisable, jamais le module
   simple-icons. Rien n'est recopié ici — ni marque, ni famille, ni rôle. */
export type Outil = {
  title: string;
  hex: string;
  path: string;
  famille: string;
  role: string;
};

export type Groupe = { famille: string; outils: Outil[] };

const EASE: [number, number, number, number] = [0.16, 1, 0.3, 1];

export default function GrilleOutils({
  groupes,
  className,
}: {
  groupes: Groupe[];
  className?: string;
}) {
  /* l'état est l'INDICE de la puce, pas un nom de famille : il n'y a donc
     pas de sentinelle « tous » qui pourrait un jour entrer en collision
     avec une famille, et le tabIndex roving se lit directement */
  const [actif, setActif] = useState(0);
  /* null côté serveur seulement ; côté client le hook lit matchMedia
     pendant le rendu. Le balisage ne diverge pas : `fige` ne touche que
     `layout` et `transition`, qui n'écrivent rien dans le DOM — c'est
     `animate`, avec initial={false}, qui fait le style rendu. */
  const fige = useReducedMotion() ?? false;
  const puces = useRef<(HTMLButtonElement | null)[]>([]);

  if (groupes.length === 0) return null;

  /* les 28, dans l'ordre des familles : en mode « Tous », les familles
     restent groupées à l'œil sans qu'on ait à les étiqueter */
  const outils = groupes.flatMap((g) => g.outils);
  const nbPuces = groupes.length + 1;
  const groupeActif = actif < groupes.length ? groupes[actif] : null;
  const nb = groupeActif ? groupeActif.outils.length : outils.length;
  const visible = (o: Outil) => !groupeActif || o.famille === groupeActif.famille;

  const choisir = (i: number) => {
    setActif(i);
    puces.current[i]?.focus();
  };

  /* groupe radio au clavier : flèches, Début, Fin — choisir, c'est cocher */
  const clavier = (e: KeyboardEvent<HTMLButtonElement>, i: number) => {
    let cible: number | null = null;
    switch (e.key) {
      case "ArrowRight":
      case "ArrowDown":
        cible = (i + 1) % nbPuces;
        break;
      case "ArrowLeft":
      case "ArrowUp":
        cible = (i - 1 + nbPuces) % nbPuces;
        break;
      case "Home":
        cible = 0;
        break;
      case "End":
        cible = nbPuces - 1;
        break;
    }
    if (cible === null) return;
    e.preventDefault();
    choisir(cible);
  };

  const transition = fige ? { duration: 0 } : { duration: 0.35, ease: EASE };

  const puce = (libelle: string, i: number) => {
    const coche = i === actif;
    return (
      <button
        key={libelle}
        ref={(el) => {
          puces.current[i] = el;
        }}
        type="button"
        role="radio"
        aria-checked={coche}
        tabIndex={coche ? 0 : -1}
        onClick={() => choisir(i)}
        onKeyDown={(e) => clavier(e, i)}
        className="go-puce"
      >
        {libelle}
      </button>
    );
  };

  return (
    <div className={className}>
      <div data-reveal className="flex flex-col gap-3.5">
        <div role="radiogroup" aria-label="Familles d'outils" className="go-puces">
          {groupes.map((g, i) => puce(g.famille, i))}
          {puce("Tous", groupes.length)}
        </div>
        <p className="go-compte" aria-live="polite">
          {nb} outil{nb > 1 ? "s" : ""}
        </p>
      </div>

      {/* les 28 <li> sont toujours rendus (voir l'en-tête) ; `hidden` fait
          le filtre, `layout` fait glisser celles qui restent, `animate`
          fond celles qui arrivent — initial={false} : au montage, pas
          d'entrée, la première famille est déjà là dans le HTML */}
      <ul
        data-reveal
        className="go-grille mt-7 grid list-none grid-cols-1 gap-4 p-0 sm:grid-cols-2 lg:grid-cols-3"
      >
        {outils.map((o) => {
          const v = visible(o);
          return (
            <motion.li
              key={o.title}
              hidden={!v}
              inert={!v}
              layout={fige ? false : "position"}
              initial={false}
              animate={v ? { opacity: 1, scale: 1 } : { opacity: 0, scale: 0.97 }}
              transition={transition}
              className="go-item min-w-0"
            >
              <article className="o-card-soft go-carte flex h-full flex-col p-5 sm:p-6">
                {/* le nom est juste dessous : le logo est décoratif, il ne
                    doit pas être annoncé deux fois */}
                <span className="go-logo" aria-hidden>
                  <svg viewBox="0 0 24 24" width="22" height="22" fill={`#${o.hex}`}>
                    <path d={o.path} />
                  </svg>
                </span>
                <p className="go-nom">{o.title}</p>
                <p className="go-role">{o.role}</p>
              </article>
            </motion.li>
          );
        })}
      </ul>
    </div>
  );
}
