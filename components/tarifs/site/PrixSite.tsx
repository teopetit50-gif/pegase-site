"use client";

import { useEffect, useRef, useState, type KeyboardEvent } from "react";
import { useMotionValue, useSpring } from "motion/react";
import "./PrixSite.css";

/* ══════════════════════════════════════════════════════════════════════
   <PrixSite> — le récapitulatif de commande, rendu jouable (14/09/2026)

   ORIGINE. Deux pièces publiques cousues ensemble.
   · Tailark, registre radix/mist, blocks/pricing/one.tsx et two.tsx : la
     STRUCTURE d'une carte de prix (en-tête, un grand prix qui domine la
     carte, les lignes en dessous) et surtout le geste du sélecteur
     mensuel / annuel, ici transposé au TAUX D'AIDE.
   · Magic UI, number-ticker (bibliothèque Toyota) : le nombre qui glisse —
     useMotionValue suivi d'un useSpring, texte écrit image par image.

   POURQUOI ICI. MaqCommande n'affichait qu'un cas, le Chèque TIC à 80 %,
   donc 198 €. Les deux autres — sans l'aide, ou à 40 % — étaient relégués
   dans la phrase de pied, et la FAQ les redisait 400 px plus bas : qui
   ignore son taux devait faire la soustraction de tête. Ici il l'essaie.
   Les 990 €, eux, ne bougent jamais — c'est le propos de la page : le prix
   est le même pour tout le monde.

   CE QUI EST JETÉ. De Tailark : Card / Button / CardHeader shadcn et leurs
   jetons (bg-muted, text-primary, ring-*), qui n'existent pas ici ; les
   trois colonnes Free / Pro / Pro Plus et le plan mis en avant (une seule
   offre existe) ; la liste à coches et les logos de clients (aucune preuve
   sociale) ; le bouton DANS la carte (« Commander le site » vit déjà sous
   la carte, dans page.tsx). De Magic UI : useInView({ once: true }), qui
   aurait posé une SECONDE mécanique d'arrivée sur un bloc déjà animé par
   [data-reveal] ; Intl.NumberFormat("en-US"), dark:text-white, le cn() de
   l'appelant. @number-flow/react, installé, est écarté : il rend ses
   rubans de chiffres dans son propre balisage, or le grand nombre doit
   rester le .num + Jakarta 30 px de la maquette et afficher 198 € sans
   JavaScript. Un span dont on réécrit le texte tient les deux.

   ÉCARTS ASSUMÉS. Le sélecteur est un vrai groupe radio (flèches, Début,
   Fin), même clavier que les puces de /modeles. Le nombre visible est
   aria-hidden — il change soixante fois par seconde, une synthèse vocale
   le lirait soixante fois : le total lu est un doublon invisible et stable
   dans la zone aria-live. Mouvement réduit : le nombre saute, les puces ne
   transitionnent plus. La pastille verte reste posée dans les trois états,
   elle décrit la procédure et non le cas simulé. Les espaces avant « % »,
   « € » et « : » sont des insécables, là où la maquette en avait d'ordinaires.
   ══════════════════════════════════════════════════════════════════════ */

export type CleTaux = "sans" | "t40" | "t80";

type Taux = {
  cle: CleTaux;
  /** le libellé court de la puce */
  puce: string;
  /** le titre de la ligne d'aide */
  ligne: string;
  /** sa sous-ligne */
  sous: string;
  /** le montant soustrait, déjà écrit */
  remise: string;
  /** le restant à votre charge, en euros */
  reste: number;
};

/* Les trois seuls états possibles. Aucun chiffre hors 990 / 396 / 594 /
   792 / 198 : la remise et le restant sont les deux faces du même calcul,
   écrits ici plutôt que calculés, pour qu'aucun arrondi ne s'invente. */
const TAUX: Taux[] = [
  {
    cle: "sans",
    puce: "Sans aide",
    ligne: "Chèque TIC",
    sous: "non demandé",
    remise: "0 €",
    reste: 990,
  },
  {
    cle: "t40",
    puce: "Aide à 40 %",
    ligne: "Chèque TIC à 40 %",
    sous: "Région Guadeloupe · si vous êtes éligible",
    remise: "− 396 €",
    reste: 594,
  },
  {
    cle: "t80",
    puce: "Aide à 80 %",
    ligne: "Chèque TIC à 80 %",
    sous: "Région Guadeloupe · si vous êtes éligible",
    remise: "− 792 €",
    reste: 198,
  },
];

export default function PrixSite({ defaut = "t80" }: { defaut?: CleTaux }) {
  const depart = Math.max(
    0,
    TAUX.findIndex((t) => t.cle === defaut),
  );
  const [rang, setRang] = useState(depart);
  /* La valeur du PREMIER rendu, gelée : c'est elle que React garde comme
     enfant du <span> du ticker. Tant qu'elle ne change pas, React ne
     retouche jamais ce nœud de texte et les écritures image par image du
     ressort survivent aux re-rendus. */
  const [initial] = useState(TAUX[depart].reste);
  const actif = TAUX[rang];

  /* Les puces, pour porter le focus au clavier, et le <span> du ticker.
     Les callbacks de ref ne renvoient RIEN : React 19 prendrait une
     valeur de retour pour une fonction de nettoyage. */
  const puces = useRef<(HTMLButtonElement | null)[]>([]);
  const nombre = useRef<HTMLSpanElement | null>(null);

  /* prefers-reduced-motion : lu en effet seulement, jamais au rendu — le
     rendu initial doit être identique serveur et client. */
  const [fige, setFige] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const lire = () => setFige(mq.matches);
    lire();
    mq.addEventListener("change", lire);
    return () => mq.removeEventListener("change", lire);
  }, []);

  /* Le ressort de Magic UI, sans son déclencheur au défilement : il part
     de la valeur par défaut, donc il est AU REPOS au montage. Rien ne
     glisse tant qu'une puce n'a pas été changée. */
  const valeur = useMotionValue(initial);
  const ressort = useSpring(valeur, { stiffness: 210, damping: 34, restDelta: 0.4 });

  useEffect(() => {
    if (valeur.get() !== actif.reste) valeur.set(actif.reste);
  }, [valeur, actif.reste]);

  useEffect(() => {
    const el = nombre.current;
    if (!el) return;
    if (fige) {
      el.textContent = String(actif.reste);
      return;
    }
    /* On repart de là où le ressort en est (l'ANCIENNE valeur : il n'a pas
       encore avancé d'une image), jamais de la cible — sinon le chiffre
       final clignoterait avant de glisser. */
    el.textContent = String(Math.round(ressort.get()));
    return ressort.on("change", (v) => {
      el.textContent = String(Math.round(v));
    });
  }, [ressort, fige, actif.reste]);

  const choisir = (i: number) => {
    setRang(i);
    puces.current[i]?.focus();
  };

  /* Groupe radio au clavier : flèches, Début, Fin — choisir, c'est cocher.
     Le même geste que les puces de components/modeles/Galerie.tsx. */
  const clavier = (e: KeyboardEvent<HTMLButtonElement>, i: number) => {
    const n = TAUX.length;
    let vise: number | null = null;
    switch (e.key) {
      case "ArrowRight":
      case "ArrowDown":
        vise = (i + 1) % n;
        break;
      case "ArrowLeft":
      case "ArrowUp":
        vise = (i - 1 + n) % n;
        break;
      case "Home":
        vise = 0;
        break;
      case "End":
        vise = n - 1;
        break;
    }
    if (vise === null) return;
    e.preventDefault();
    choisir(vise);
  };

  return (
    <>
      {/* la barre de fenêtre : jumelle de celle de la carte d'à côté */}
      <div className="ps-barre">
        <span aria-hidden className="ps-pastilles">
          {[0, 1, 2].map((k) => (
            <i key={k} className="ps-pastille" />
          ))}
        </span>
        <span className="ps-titre-barre">Omega.AI&nbsp;: votre commande</span>
      </div>

      <div className="ps-corps">
        <div className="ps-selecteur" role="radiogroup" aria-label="Taux du Chèque TIC">
          {TAUX.map((t, i) => (
            <button
              key={t.cle}
              ref={(el) => {
                puces.current[i] = el;
              }}
              type="button"
              role="radio"
              aria-checked={i === rang}
              tabIndex={i === rang ? 0 : -1}
              onClick={() => choisir(i)}
              onKeyDown={(e) => clavier(e, i)}
              className="ps-puce"
            >
              {t.puce}
            </button>
          ))}
        </div>

        <div className="ps-ligne">
          <div className="ps-ligne-texte">
            <div className="ps-ligne-titre">Site catalogue</div>
            <div className="ps-ligne-sous">un modèle, réécrit à votre métier et à votre marque</div>
          </div>
          <span className="num ps-ligne-prix">990&nbsp;€</span>
        </div>

        <div className="ps-ligne ps-ligne--filet">
          <div className="ps-ligne-texte">
            <div className="ps-ligne-titre">{actif.ligne}</div>
            <div className="ps-ligne-sous">{actif.sous}</div>
          </div>
          <span className="num ps-ligne-prix">{actif.remise}</span>
        </div>

        <div className="ps-total" aria-live="polite">
          <div className="ps-total-bloc">
            <div className="ps-total-libelle">Restant à votre charge</div>
            {/* la famille Jakarta reste en style en ligne, comme dans la
                maquette actuelle : .num impose var(--font-inter), et une
                règle de feuille se jouerait sur la spécificité. */}
            <p className="num ps-total-valeur" style={{ fontFamily: "var(--font-jakarta)" }}>
              <span aria-hidden ref={nombre}>
                {initial}
              </span>
              <span aria-hidden>&nbsp;€</span>
              {/* le seul total LU : stable, annoncé une fois par changement */}
              <span className="ps-lecture">{actif.reste}&nbsp;€</span>
            </p>
          </div>
          <span className="ps-eligible">Éligibilité vérifiée à l&apos;audit</span>
        </div>

        <p className="ps-pied">
          Le prix est le même pour tout le monde. Sans l&apos;aide, ou à 40&nbsp;%, il reste
          990&nbsp;€ ou 594&nbsp;€, jamais plus.
        </p>
      </div>
    </>
  );
}
