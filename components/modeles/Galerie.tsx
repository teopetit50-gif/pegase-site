"use client";

import { useRef, useState, type KeyboardEvent } from "react";
import Link from "next/link";
import { motion, useReducedMotion } from "motion/react";
import MiniSite from "./MiniSite";
import { CATEGORIES, MODELES, type Modele } from "./donnees";
import "./Galerie.css";

/* ══════════════════════════════════════════════════════════════════════
   <Galerie> — le catalogue filtré de /modeles (14/09/2026)

   ORIGINE. Trois sources tressées : `focus-cards` (Aceternity) pour le
   survol — la carte visée reste nette, les autres se voilent ; le motif
   « filter-grid » de ddoemonn (21st.dev) pour la rangée de puces qui
   filtre une grille dont les tuiles se réordonnent ; `layout-grid`
   (Aceternity) pour la mécanique `motion` (layout).

   POURQUOI ICI. Le panneau alignait quatre familles à la suite, trois
   cartes chacune et un « voir plus » : on faisait défiler quatre en-têtes
   avant de choisir. La règle de Teo (03/08 : « range les design et site
   par catégorie […] tu mets 3 et un bouton voir plus ») est tenue
   autrement : une seule famille à l'écran, la première par défaut, et une
   puce par famille pour changer. Le mur de 21 n'apparaît que si on le
   demande (« Tous les modèles »).

   LE HTML LIVRÉ CONTIENT LES 21 (relecture du 14/09). Les vingt et une
   tuiles sont toujours dans l'arbre ; celles hors famille portent
   `hidden` + `inert` (display:none, sorties du tab et de l'accessibilité).
   C'est la décision du 03/08 que <Categorie> gardait : Google voit les
   21 noms, les 21 démos et les 42 liens /reserver-un-audit et
   /site/commande, JavaScript ou pas. Le prix : pas de fondu de SORTIE
   (une tuile qui sort disparaît d'un coup ; AnimatePresence l'aurait
   fondu, mais il retire du DOM, donc du HTML) — on garde le fondu
   d'entrée et le glissement `layout` des tuiles qui restent.

   CE QUI EST JETÉ des sources :
   • l'état `hovered` React de focus-cards : le voile se fait en CSS
     (`:has`), sous `@media (hover: hover)` — la source voilait aussi au
     doigt, où « survoler » n'existe pas.
   • `blur-sm scale-[0.98]` de la source : opacité .55 seule, sans flou
     (le flou re-rastérise vingt cartes à chaque survol, et n'est pas
     dans le vocabulaire de la charte), et la carte active se lève de
     2 px au lieu de rétrécir les autres. Le focus clavier lève la carte
     mais ne voile pas les autres : tabuler dans la grille ne doit pas
     griser vingt cartes.
   • le dégradé de titre `bg-clip-text` et le voile noir `bg-black/50` :
     la charte est monochrome, la carte reste blanche sur panneau gris.
   • `layoutId` et la carte « sélectionnée » plein cadre de layout-grid :
     ici on ne zoome pas, la démo s'ouvre dans un onglet.
   • AnimatePresence de layout-grid : voir ci-dessus, il vide le HTML.
   • `cn` de `@/lib/utils` et `<img>` nu : `next/image` via <MiniSite>.
   • `dark:`, `bg-gray-100`, `bg-neutral-900` : jetons `--m-*`.

   ÉCARTS ASSUMÉS.
   • Le contenu de la carte est celui de <CarteModele>, mot pour mot
     (capture, pages intérieures, mention `reserve`, trois liens et leurs
     href) — mais rendu depuis un composant client : `motion` l'exige.
   • `layout="position"`, pas `layout` : toutes les tuiles ont la même
     largeur, animer aussi la taille déformerait la capture en transit.
   • `prefers-reduced-motion` : aucune transition ni fondu, le filtre
     change d'un coup ; le voile de survol reste (c'est un état, pas un
     mouvement), sans transition. Sans JavaScript : la première famille,
     puces inertes.
   • `data-reveal` (l'apparition au scroll de la page) est posé sur la
     rangée de puces et sur la grille entière, pas sur chaque carte comme
     dans <CarteModele> : GSAP et `motion` se disputeraient le transform
     du même <li>.
   • Le chapô de « Tous les modèles » n'existe nulle part dans les données
     ni dans la page ; phrase neutre écrite ici : « Les quatre familles,
     sans filtre. »
   ══════════════════════════════════════════════════════════════════════ */

type Filtre = Modele["cat"] | "tous";

const EASE: [number, number, number, number] = [0.16, 1, 0.3, 1];

/* les quatre familles, puis le mur — dans cet ordre, « Tous » en fin de
   rangée pour ne pas être la puce qu'on lit en premier */
const PUCES: { cle: Filtre; libelle: string; pour: string }[] = [
  ...CATEGORIES.map((c) => ({ cle: c.cle, libelle: c.titre, pour: c.pour })),
  {
    cle: "tous",
    libelle: `Tous les modèles (${MODELES.length})`,
    pour: "Les quatre familles, sans filtre.",
  },
];

export default function Galerie() {
  const [filtre, setFiltre] = useState<Filtre>(CATEGORIES[0].cle);
  /* null côté serveur seulement ; côté client le hook lit matchMedia
     pendant le rendu et rend un booléen dès l'hydratation. Le balisage ne
     diverge pas pour autant : `fige` ne touche que `layout` et
     `transition`, qui n'écrivent rien dans le DOM — `animate` est le même
     des deux côtés et c'est lui, avec initial={false}, qui fait le style
     rendu. */
  const fige = useReducedMotion() ?? false;
  const puces = useRef<(HTMLButtonElement | null)[]>([]);

  const actif = PUCES.find((p) => p.cle === filtre) ?? PUCES[0];
  const visible = (m: Modele) => filtre === "tous" || m.cat === filtre;
  const visibles = MODELES.filter(visible);
  /* l'orpheline de la grille à deux colonnes se calcule ici, pas en
     `:nth-child` : les tuiles cachées restent des frères dans le DOM */
  const orphelin = visibles.length % 2 === 1 ? visibles[visibles.length - 1].slug : null;

  const choisir = (i: number) => {
    setFiltre(PUCES[i].cle);
    puces.current[i]?.focus();
  };

  /* groupe radio au clavier : flèches, Début, Fin — choisir, c'est cocher */
  const clavier = (e: KeyboardEvent<HTMLButtonElement>, i: number) => {
    const n = PUCES.length;
    let cible: number | null = null;
    switch (e.key) {
      case "ArrowRight":
      case "ArrowDown":
        cible = (i + 1) % n;
        break;
      case "ArrowLeft":
      case "ArrowUp":
        cible = (i - 1 + n) % n;
        break;
      case "Home":
        cible = 0;
        break;
      case "End":
        cible = n - 1;
        break;
    }
    if (cible === null) return;
    e.preventDefault();
    choisir(cible);
  };

  const transition = fige ? { duration: 0 } : { duration: 0.35, ease: EASE };

  return (
    <div id="catalogue" className="m-panneau mt-12 scroll-mt-24 p-5 sm:p-8 lg:p-10">
      <div data-reveal className="flex flex-wrap items-center justify-between gap-x-8 gap-y-3">
        <div role="radiogroup" aria-label="Familles de modèles" className="mg-puces flex flex-wrap gap-1.5 sm:gap-2">
          {PUCES.map((p, i) => {
            const coche = p.cle === filtre;
            return (
              <button
                key={p.cle}
                ref={(el) => {
                  puces.current[i] = el;
                }}
                type="button"
                role="radio"
                aria-checked={coche}
                tabIndex={coche ? 0 : -1}
                onClick={() => choisir(i)}
                onKeyDown={(e) => clavier(e, i)}
                className="mg-puce px-3 py-2 text-left text-[13px] font-medium leading-snug sm:px-4 sm:py-2.5 sm:text-[13.5px]"
              >
                {p.libelle}
              </button>
            );
          })}
        </div>
        {/* sous sm les cinq puces s'empilent déjà : le compteur, qui
            passerait seul à la ligne, attend le téléphone couché */}
        <span className="hidden font-mono text-[11px] uppercase tracking-[0.14em] text-[color:var(--m-faible)] sm:inline">
          {visibles.length} modèle{visibles.length > 1 ? "s" : ""}
        </span>
      </div>

      <p className="m-chapo mt-5 max-w-2xl" aria-live="polite">
        {actif.pour}
      </p>

      {/* les 21 <li> sont toujours rendus (voir l'en-tête) ; `hidden` fait
          le filtre, `layout` fait glisser celles qui restent, `animate`
          fond celles qui arrivent — initial={false} : au montage, pas
          d'entrée, la première famille est déjà là dans le HTML */}
      <ul
        data-reveal
        className="mg-grille mt-8 grid list-none grid-cols-1 gap-4 p-0 sm:grid-cols-2 lg:grid-cols-3 lg:gap-5"
      >
        {MODELES.map((m) => {
          const v = visible(m);
          return (
            <motion.li
              key={m.slug}
              hidden={!v}
              inert={!v}
              data-orphelin={m.slug === orphelin ? "" : undefined}
              layout={fige ? false : "position"}
              initial={false}
              animate={v ? { opacity: 1, scale: 1 } : { opacity: 0, scale: 0.96 }}
              transition={transition}
              className="mg-item min-w-0"
            >
              <Carte m={m} />
            </motion.li>
          );
        })}
      </ul>
    </div>
  );
}

/* ——— une entrée du catalogue : le contenu de <CarteModele>, à l'identique.
   Jamais un lien englobant — un <a> dans un <a> est invalide. ——— */
function Carte({ m }: { m: Modele }) {
  return (
    <article className="m-carte mg-carte group flex h-full flex-col p-3">
      <div className="mg-visuel">
        <a
          href={m.demo}
          target="_blank"
          rel="noopener noreferrer"
          className="mg-lien block rounded-[10px]"
          aria-label={`Ouvrir la démonstration du modèle ${m.nom} dans un nouvel onglet`}
        >
          <MiniSite
            m={m}
            ton="clair"
            sizes="(max-width: 640px) 88vw, (max-width: 1024px) 44vw, 30vw"
            className="transition-transform duration-500 group-hover:scale-[1.012] motion-reduce:transition-none"
          />
        </a>

        {m.pages.length > 1 && (
          <div className="m-pages mt-2 grid grid-cols-3 gap-2 opacity-70 group-hover:translate-y-[-2px] group-hover:opacity-100">
            {m.pages.slice(1).map((suffixe, i) => (
              <a
                key={suffixe}
                href={m.demo}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={`Page intérieure du modèle ${m.nom}`}
                className="mg-lien block overflow-hidden rounded-[6px] transition-transform duration-300 hover:scale-[1.04] motion-reduce:transition-none"
              >
                <MiniSite
                  m={m}
                  page={i + 1}
                  cadre={false}
                  ton="clair"
                  sizes="(max-width: 640px) 28vw, (max-width: 1024px) 14vw, 10vw"
                  className="!rounded-[6px]"
                />
              </a>
            ))}
          </div>
        )}
      </div>

      <div className="mg-texte flex flex-1 flex-col px-2 pb-1 pt-4">
        <div className="flex items-baseline justify-between gap-3">
          <h3 className="text-[17px]">{m.nom}</h3>
          <span className="shrink-0 font-mono text-[10px] uppercase tracking-[0.13em] text-[color:var(--m-faible)]">
            {m.pages.length > 1 ? `${m.pages.length} pages` : "Démo"}
          </span>
        </div>

        <p className="mt-1.5 text-[13px] text-[color:var(--m-faible)]">{m.style}</p>

        {m.reserve && (
          <p className="mt-2.5 rounded-[6px] bg-black/[0.045] px-2.5 py-1.5 text-[12px] leading-snug text-[color:var(--m-doux)]">
            {m.reserve}
          </p>
        )}

        <p className="mt-3.5 text-[13.5px] leading-relaxed">
          <span className="text-[color:var(--m-faible)]">Convient à&nbsp;: </span>
          <span className="text-[color:var(--m-doux)]">{m.pour}</span>
        </p>
        <p className="mt-2 text-[13.5px] leading-relaxed">
          <span className="text-[color:var(--m-faible)]">Ce qu&apos;il alimente&nbsp;: </span>
          <span className="text-[color:var(--m-doux)]">{m.capte}</span>
        </p>

        <div className="mt-auto flex flex-wrap items-center gap-x-5 gap-y-2 pt-5">
          <a
            href={m.demo}
            target="_blank"
            rel="noopener noreferrer"
            className="mg-lien inline-flex items-center gap-1.5 rounded-[4px] text-[13.5px] font-medium underline-offset-4 hover:underline"
          >
            Voir la démonstration
            <svg width="12" height="12" viewBox="0 0 16 16" fill="none" aria-hidden>
              <path
                d="M5.5 10.5 10.5 5.5M6.5 5.5h4v4"
                stroke="currentColor"
                strokeWidth="1.6"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </a>
          <Link
            href={`/reserver-un-audit?modele=${m.slug}`}
            className="mg-lien inline-flex items-center gap-1.5 rounded-[4px] text-[13.5px] font-medium text-[color:var(--m-doux)] underline-offset-4 hover:text-[color:var(--m-encre)] hover:underline"
          >
            Choisir ce modèle
            <svg width="13" height="13" viewBox="0 0 16 16" fill="none" aria-hidden>
              <path
                d="M3 8h10M9 4l4 4-4 4"
                stroke="currentColor"
                strokeWidth="1.6"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </Link>
        </div>
        <p className="mt-2.5 text-[12.5px] text-[color:var(--m-faible)]">
          <Link
            href={`/site/commande?modele=${m.slug}`}
            className="mg-lien rounded-[4px] underline-offset-4 hover:text-[color:var(--m-encre)] hover:underline"
          >
            Commander avec ce modèle
          </Link>
        </p>
      </div>
    </article>
  );
}
