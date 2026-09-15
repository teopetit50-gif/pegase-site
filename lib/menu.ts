/* ══════════════════════════════════════════════════════════════════════
   Le menu principal — une seule source pour les deux surfaces (11/09/2026)

   Jusqu'ici la navigation était une liste plate de sept liens (`NAV`, dans
   components/Header.tsx) qui ne servait QU'AU panneau plein écran : le
   header n'affichait aucun lien, à aucune largeur, juste un burger façon
   Qonto. Conséquence : les quatre pages produit rapatriées le 11/09
   (/offres/relances-impayes, …/nouvelles-affaires, …/demandes-clients,
   …/factures-fournisseurs) n'étaient atteignables que par /offres — le
   catalogue entier tenait derrière une seule entrée, et il fallait deux
   clics et un scroll pour arriver sur un produit.

   Le menu devient donc une structure à deux niveaux, lue par les deux
   surfaces pour qu'elles ne puissent plus diverger :
   - le bandeau horizontal du header, à partir de `lg` (composant
     components/ui/navigation-menu.tsx) ;
   - le panneau plein écran, conservé sous `lg`, où les mêmes rubriques se
     DÉPLIENT au doigt (une seule à la fois).

   ─ Les arbitrages hérités de l'ancienne liste, tous conservés ─

   · 25/07 — « Solutions » a disparu : la page liste ET les fiches moteurs
     vivent sous /offres. /solutions et /solutions/[moteur] sont redirigées
     en 308 par next.config.ts, aucun lien externe ne casse.
   · 30/07 — « À propos » saute : Teo ne voulait pas de la page
     (reproduction qonto.com/en/about jugée non conforme).
   · 30/07 — « Articles » devient « Blog » (redirection 308 depuis
     /articles).
   · 03/08 — /modeles, la galerie de vitrines sectorielles : l'entrée que
     comprend un patron qui ne sait pas encore ce qu'est un « moteur ».
   · 05/08 — /tarifs : un patron qui a compris ce qu'est un paquet cherche
     le prix juste après.
   · 07/08 — /vos-donnees est ENTRÉE dans la liste ce jour-là, précisément
     parce qu'elle n'était qu'au pied de page (Teo : « bah nan elle est pas
     dans la liste »). ⚠ Elle passe aujourd'hui sous « Ressources », donc à
     un survol du bandeau au lieu d'un coup d'œil — c'est le seul recul de
     ce chantier, assumé pour tenir cinq entrées au lieu de sept. Elle est
     posée en TÊTE de son groupe pour qu'on la voie en premier dès qu'il
     s'ouvre. Si Teo la veut de nouveau au premier plan, la sortir en
     rubrique simple suffit (`{ label, href }`).
   · 14/09 — les deux entrées de « Votre site » sont renommées (Teo : « les
     noms c'est pas clair »). « Modèles de sites » redisait sa rubrique sans
     rien ajouter, et « Votre site, à prix public » ne disait pas ce qu'on
     trouve sur la page. Les intitulés disent maintenant l'ACTE : « Voir les
     modèles » (regarder, rien à décider) et « Prix et commande » (le prix,
     ce qu'il comprend, le tunnel). Les titres des PAGES ne bougent pas —
     « Votre site, à prix public » reste le <title> de /tarifs/site, il
     travaille pour la recherche, pas pour la navigation.

   · 10/09 — /offres/sur-mesure : la page n'était atteignable que par un
     lien en bas de /offres. Le seul endroit du site où l'on vend ce qui ne
     rentre dans aucun paquet était donc le seul qu'on ne pouvait pas
     atteindre depuis la navigation. Elle reste dans le groupe des offres,
     en dernier, parce qu'elle se lit comme leur complément — « et si rien
     de tout ça ne correspond ».

   ─ Les textes ─

   Ils ne sont pas écrits ici : ce sont ceux des cartes de /offres
   (app/offres/page.tsx, tableau PAQUETS) et des `description` de chaque
   page, resserrés au format d'un menu. Budget visé : 40 à 60 signes par
   entrée, une ligne à 1280 px, deux au maximum. Aucun prix, aucun chiffre
   de traction, aucun nom d'outil — voir les règles maison.
   ══════════════════════════════════════════════════════════════════════ */

export type Entree = {
  href: string;
  label: string;
  /* la ligne grise sous l'intitulé, dans le panneau déroulant. Absente, la
     rangée se rend en une seule ligne (cas des « Ressources »). */
  texte?: string;
};

export type Rubrique = {
  label: string;
  /* rubrique SIMPLE : un lien direct dans le bandeau, sans chevron. */
  href?: string;
  /* rubrique à panneau : la case large en tête, puis les rangées. */
  vedette?: Required<Entree>;
  entrees?: Entree[];
};

export const MENU: Rubrique[] = [
  {
    label: "Nos offres",
    vedette: {
      href: "/offres",
      label: "Toutes les offres",
      texte:
        "Quatre systèmes prêts à déployer, deux inclus. Sur vos outils en place, sous votre validation.",
    },
    entrees: [
      {
        href: "/offres/relances-impayes",
        label: "CASHD",
        texte: "Les échéances suivies, les relances préparées selon vos règles.",
      },
      {
        href: "/offres/nouvelles-affaires",
        label: "RELOAD",
        texte: "Les clients inactifs et les marchés de votre zone, remis dans le circuit.",
      },
      {
        href: "/offres/demandes-clients",
        label: "FRONTD",
        texte: "Chaque demande entrante qualifiée et traitée, à toute heure.",
      },
      {
        href: "/offres/factures-fournisseurs",
        label: "FILED",
        texte: "Les pièces fournisseurs lues, contrôlées, transmises à la comptabilité.",
      },
      {
        href: "/offres/sur-mesure",
        label: "Sur mesure",
        texte: "Le système propre à votre organisation, cadré puis construit.",
      },
    ],
  },
  {
    label: "Votre site",
    entrees: [
      {
        href: "/modeles",
        label: "Voir les modèles",
        texte: "Vingt et un modèles en ligne, consultables immédiatement.",
      },
      {
        href: "/tarifs/site",
        label: "Prix et commande",
        texte: "Ce que coûte un site, ce qu'il comprend, et la commande.",
      },
    ],
  },
  { label: "Intégrations", href: "/integrations" },
  { label: "Tarifs", href: "/tarifs" },
  {
    label: "Ressources",
    entrees: [
      {
        href: "/vos-donnees",
        label: "Où vont vos données",
        texte: "Hébergement, cloisonnement et réversibilité, en détail.",
      },
      {
        href: "/reserver-un-audit",
        label: "Réserver un audit",
        texte: "Chiffrer le processus qui pèse le plus sur votre organisation.",
      },
      {
        href: "/blog",
        label: "Blog",
        texte: "Nos analyses, à l'attention des dirigeants.",
      },
    ],
  },
];

/* Le panneau mobile a besoin de la liste à plat pour cadencer sa cascade
   d'entrée (un délai par rangée) : on la calcule ici pour que les deux
   surfaces comptent la même chose. La vedette d'un groupe n'y figure qu'une
   fois, en tête de son groupe. */
export const RANGEES: { groupe: string; entrees: Entree[] }[] = MENU.map((r) => ({
  groupe: r.label,
  entrees: r.href
    ? [{ href: r.href, label: r.label }]
    : [...(r.vedette ? [r.vedette] : []), ...(r.entrees ?? [])],
}));

/* Le panneau du téléphone rend les MÊMES CINQ RUBRIQUES que le bandeau, et
   rien de plus : les groupes s'y déplient au doigt au lieu d'être aplatis.

   11/09/2026, deuxième passe. La première version listait les onze
   destinations à la suite, sous trois intitulés de groupe — Teo : « sur la
   version mobile c'est pas des trucs déroulants […] du coup c'est gênant,
   trop chargé ». Il avait raison : le panneau était passé de sept rangées à
   quatorze et débordait de l'écran. Replié, il en fait cinq et tient sans
   défilement.

   `rang` sert la cascade d'entrée : un délai par RUBRIQUE, donc cinq, plus
   les trois boutons du pied. Les entrées d'un groupe n'en ont pas besoin —
   elles apparaissent d'un coup au dépli, pas au chargement du panneau. */
export const GROUPES = MENU.map((r, rang) => ({
  titre: r.label,
  rang,
  /* rubrique simple : une rangée-lien, exactement celle d'avant ce chantier */
  href: r.href,
  seul: Boolean(r.href),
  entrees: r.href
    ? []
    : [...(r.vedette ? [r.vedette] : []), ...(r.entrees ?? [])],
}));

/* Cinq rangées, pas onze : le pied enchaîne sa cascade derrière elles. */
export const NB_RANGEES = GROUPES.length;

export function rubriqueCourante(pathname: string): string | null {
  for (const r of RANGEES) {
    for (const e of r.entrees) {
      if (pathname === e.href || pathname.startsWith(e.href + "/")) return r.groupe;
    }
  }
  return null;
}
