"use client";

import React from "react";
import Link from "next/link";
import { motion, useAnimationFrame, useMotionValue, useReducedMotion } from "motion/react";

/* ══════════════════════════════════════════════════════════════════════
   cas-colonnes — trois colonnes qui remontent en continu (15/09/2026)

   Reprise de `testimonials-columns-1` de @sanjay-kv (21st.dev) : trois
   colonnes de cartes qui remontent à trois vitesses différentes, le
   contenu doublé pour que la boucle ne se voie pas, et un fondu haut et
   bas qui fait apparaître puis disparaître les cartes au lieu de les
   couper net.

   Ferme /offres/sur-mesure, à la place du rectangle éclairé du 14/09
   (`cta-rectangle`, @mikolajdobrucki). L'APPEL N'EST PAS PERDU : la
   pastille, le titre, la phrase et le bouton de l'ancienne section sont
   repris mot pour mot en tête de celle-ci ; les colonnes se lisent en
   dessous. Une page de vente qui se terminerait sans porte de sortie
   serait une régression, pas une refonte.

   ——— L'ÉCART QUI COMPTE : CE NE SONT PAS DES TÉMOIGNAGES ———————————
   L'original est bâti sur neuf faux clients : une citation, un avatar,
   un nom, une fonction. La règle du parc interdit d'inventer un client,
   un avis ou un logo (« aucune preuve sociale inventée »), et Omega.AI
   n'a aucun avis réel à afficher. La géométrie est donc gardée au pixel
   et le contenu remplacé par ce que la règle prévoit à cet emplacement :
   des CAS D'USAGE, sans personne nommée.

   Ce que ça change, carte par carte :
   · la citation → la situation, telle qu'elle se présente avant cadrage,
     sans guillemets — rien n'est mis dans la bouche de quelqu'un ;
   · l'avatar → une icône, même diamètre (40 px), même poids visuel ;
   · le nom → la NATURE du système (« Pont entre outils ») ;
   · la fonction → la FAMILLE DE SECTEUR (« Transport & logistique »),
     celle de la fiche, qui dit pour qui le cas est typique et non chez
     qui il a été livré.
   Les neuf cas sortent tous de la fiche de la page (`FICHE.points`,
   `fonctionnement[1]`, `demo.items`, `cible`) : aucun fait nouveau.
   Le neuvième est le cas ÉCARTÉ — celui qui demande un jugement au cas
   par cas. Une section de témoignages ne garde jamais son mauvais avis ;
   ici il est à sa place, c'est la même phrase qu'au cadrage.

   Quatre écarts de mise en œuvre (le quatrième est noté plus bas, sur
   `CasColonnes` — c'est le seul qui se voie) :
   1. `bg-background`, `border`, `shadow-primary/10` sont des jetons
      shadcn sans valeur ici. Fond blanc, filet `--o-line` écrit en clair
      (en Tailwind v4 un `border` nu peint en `currentColor`, donc de la
      couleur du texte), ombre portée en dur, très basse.
   2. Les cartes n'ont PAS de `data-reveal` : le reveal GSAP pose une
      opacité sur l'élément, et ces cartes-là entrent déjà par le fondu
      du masque. Seuls l'en-tête et le bandeau en portent un.
   3. `useReducedMotion` ajouté : à réglage « animations réduites », les
      colonnes ne bougent plus (l'original tourne dans tous les cas).
      Le doublon reste rendu mais devient `aria-hidden`, comme le
      bandeau `marquee` du site.
   ══════════════════════════════════════════════════════════════════════ */

export type CasUsage = {
  icone: React.ReactNode;
  texte: string;
  nature: string;
  secteur: string;
  /* 15/09 (Teo, « quand on clique sur un widget ça renvoie vers le paquet
     en question ») — la page du paquet qui tient ce cas, quand il y en a
     une. FACULTATIF, et c'est voulu : sur les neuf cas de l'accueil,
     quatre nomment un poste qui a sa vitrine (relances, demandes
     entrantes, clients inactifs, documents) ; les cinq autres parlent du
     point du matin, de la validation, des intégrations et du cas écarté,
     qui n'ont plus de page où aller depuis que le site ne montre que les
     quatre paquets. Une carte sans `href` reste un simple <article>. */
  href?: string;
};

function Carte({ cas, inerte = false }: { cas: CasUsage; inerte?: boolean }) {
  const CADRE =
    "block w-full max-w-xs rounded-[15px] border border-[var(--o-line)] bg-white p-8 shadow-[0_1px_2px_rgba(9,9,11,0.04),0_10px_30px_-18px_rgba(9,9,11,0.18)]";
  const dedans = (
    <>
      <p className="text-[15px] leading-[1.7] tracking-[0.01em] text-[var(--o-muted-strong)]">
        {cas.texte}
      </p>
      <div className="mt-6 flex items-center gap-3 border-t border-[var(--o-line)] pt-5">
        <span
          aria-hidden
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-[var(--o-line)] bg-[var(--o-soft)] text-[var(--o-text)] [&>svg]:h-[18px] [&>svg]:w-[18px]"
        >
          {cas.icone}
        </span>
        <div className="flex min-w-0 flex-col">
          <span className="text-[15px] font-medium leading-5 tracking-[-0.01em] text-[var(--o-text)]">
            {cas.nature}
          </span>
          <span className="text-[13px] leading-5 tracking-[0.01em] text-[var(--o-muted)]">
            {cas.secteur}
          </span>
        </div>
        {/* la flèche du site (bento-02, hero de /offres) : elle avance de
            3 px au survol de la carte, et n'apparaît que sur celles qui
            mènent quelque part */}
        {cas.href ? (
          <svg
            width="15"
            height="15"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={2}
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden
            className="ml-auto shrink-0 text-[var(--o-muted)] transition-all duration-200 group-hover:translate-x-[3px] group-hover:text-[var(--o-text)]"
          >
            <path d="M7 17 17 7" />
            <path d="M8 7h9v9" />
          </svg>
        ) : null}
      </div>
    </>
  );

  if (!cas.href) return <article className={CADRE}>{dedans}</article>;
  return (
    <Link
      href={cas.href}
      /* la COPIE du bandeau est `aria-hidden` : ses liens doivent sortir
         du parcours clavier, sinon on tabule dans un contenu annoncé
         absent — un lien focusable sous `aria-hidden` est une faute
         d'accessibilité, pas un détail. */
      tabIndex={inerte ? -1 : undefined}
      className={`group transition-colors duration-200 hover:border-[var(--o-muted)] ${CADRE}`}
    >
      {dedans}
    </Link>
  );
}

/* CINQUIÈME ÉCART (15/09) — LE DÉFILEMENT SE MET EN PAUSE AU SURVOL.
   Il le fallait dès lors que les cartes sont des liens : viser une cible
   qui remonte de deux cartes par seconde est un jeu d'adresse, et un
   clic raté sur un bandeau en mouvement se lit comme un site cassé.

   La boucle n'est donc plus déclarative (`animate={{ translateY: "-50%" }}`
   + `repeat: Infinity`) : on avance nous-mêmes une `MotionValue` à chaque
   image, de la moitié de la hauteur en `duree` secondes, et on la ramène
   d'une moitié quand elle la dépasse — le même mouvement, exactement, mais
   qu'on peut arrêter et reprendre SANS SAUT, ce qu'une animation
   déclarative ne sait pas faire (la stopper la fige, la relancer la
   ramène à son point de départ).

   `y` est en PIXELS, pas en pourcentage : la moitié est relue sur le DOM
   à chaque image, donc la boucle reste juste quand les cartes changent de
   hauteur (une colonne à 390 px n'a pas la géométrie d'une à 1440).
   À réglage « animations réduites », rien n'avance, comme avant. */
export function ColonneCas({
  cas,
  duree = 15,
  className = "",
}: {
  cas: CasUsage[];
  duree?: number;
  className?: string;
}) {
  const sansMouvement = useReducedMotion();
  const y = useMotionValue(0);
  const piste = React.useRef<HTMLDivElement>(null);
  const [pause, setPause] = React.useState(false);

  useAnimationFrame((_, delta) => {
    if (sansMouvement || pause) return;
    const moitie = (piste.current?.offsetHeight ?? 0) / 2;
    if (moitie <= 0) return;
    let suivant = y.get() - (moitie / (duree * 1000)) * delta;
    if (suivant <= -moitie) suivant += moitie;
    y.set(suivant);
  });

  return (
    <div className={className}>
      <motion.div
        ref={piste}
        style={{ y }}
        /* `onHoverStart`/`onHoverEnd` de motion (pointer events) plutôt que
           `onMouseEnter`/`onMouseLeave` : la piste bouge SOUS le curseur,
           et un pointeur immobile au-dessus d'un élément qui se déplace ne
           produit pas toujours de `mouseenter` — c'est le survol qui
           « glisse » d'une carte à l'autre. Les pointer events couvrent
           aussi le stylet et le doigt qui reste posé. */
        onHoverStart={() => setPause(true)}
        onHoverEnd={() => setPause(false)}
        /* au clavier : le focus d'une carte arrête aussi la colonne,
           sinon la carte visée s'en va pendant qu'on la lit */
        onFocusCapture={() => setPause(true)}
        onBlurCapture={() => setPause(false)}
        className="flex flex-col gap-6 pb-6"
      >
        {[0, 1].map((copie) => (
          <React.Fragment key={copie}>
            {cas.map((c, i) => (
              <div key={`${copie}-${i}`} aria-hidden={copie > 0}>
                <Carte cas={c} inerte={copie > 0} />
              </div>
            ))}
          </React.Fragment>
        ))}
      </motion.div>
    </div>
  );
}

/* Le bandeau complet.

   QUATRIÈME ÉCART, ET LE PLUS VISIBLE : l'original masque sa deuxième
   colonne sous `md` et sa troisième sous `lg`. Sur un téléphone, six
   témoignages sur neuf disparaissent — sans conséquence quand ce sont
   des avis interchangeables, mais ici la neuvième carte est le cas
   ÉCARTÉ, et la phrase au-dessus du bandeau annonce « et un qui n'en
   relève pas ». La promesse serait fausse sur un téléphone.

   D'où deux bandeaux, un seul rendu à la fois : sous `lg`, UNE colonne
   qui porte les neuf cas (défilement ralenti d'autant, la colonne est
   trois fois plus longue) ; à partir de `lg`, les trois colonnes de
   l'original, qui portent les neuf mêmes cas. */
export function CasColonnes({ cas }: { cas: CasUsage[] }) {
  const tiers = Math.ceil(cas.length / 3);
  const colonnes = [cas.slice(0, tiers), cas.slice(tiers, tiers * 2), cas.slice(tiers * 2)];
  const MASQUE =
    "[mask-image:linear-gradient(to_bottom,transparent,black_18%,black_82%,transparent)]";
  return (
    <>
      <div className={`flex max-h-[560px] justify-center overflow-hidden sm:max-h-[640px] lg:hidden ${MASQUE}`}>
        <ColonneCas cas={cas} duree={48} />
      </div>
      <div className={`hidden max-h-[740px] justify-center gap-6 overflow-hidden lg:flex ${MASQUE}`}>
        <ColonneCas cas={colonnes[0]} duree={15} />
        <ColonneCas cas={colonnes[1]} duree={19} />
        <ColonneCas cas={colonnes[2]} duree={17} />
      </div>
    </>
  );
}
