/* ══════════════════════════════════════════════════════════════════════
   Transitions de page (01/09/2026) — le vocabulaire partagé

   Trois modes d'arrivée, décidés par Arrivee à partir de la route
   précédente (`memoire.route`, null = chargement direct) :
     · aller  : on vient d'une autre page (typiquement /commencer) — la
                sortie VT joue 100 ms, la cascade démarre à 60 et la
                recouvre : le premier mot de la nouvelle page se lève
                pendant que l'ancienne finit de s'effacer ;
     · retour : on revient sur /commencer depuis une des trois portes —
                cascade plus courte, montée inversée (−8 px), et la carte
                qui RÉCUPÈRE la pastille / le cadre apparaît en place, sans
                montée, à l'instant où l'objet partagé se pose ;
     · direct : chargement à froid / rechargement — pas de sortie, la
                cascade part à 0 dès que les polices sont posées.

   Chaque entrée : [délai ms, durée ms, montée px]. Les « colonne »
   s'échelonnent de PAS.colonne (aller/direct) ou PAS.carteRetour.
   Courbe unique partout : la bezier charte [0.16, 1, 0.3, 1].

   ── RESSERRAGE DU 14/09/2026 ─────────────────────────────────────────
   Teo : « quand on change de page ça prend trop de temps ». Mesuré en
   prod avant correction : le réseau répondait en 60 à 250 ms, mais le
   titre de la nouvelle page n'apparaissait qu'à 900 ms — la différence
   était CETTE table, pas le serveur. En « aller », le dernier élément
   du premier écran se posait à 880 ms (hero-bloc 460 + 420) et une
   rangée de quatre cartes finissait à 855 ms (300 + 3 × 45 + 420).
   Tout est resserré d'un facteur ~2,4 : le dernier élément se pose
   maintenant vers 400 ms. Les gestes sont les mêmes — mêmes rôles,
   même ordre, même courbe, mêmes montées à 2-4 px près — seule la
   DURÉE change. Ne pas relâcher ces valeurs sans remesurer : c'est le
   plus gros levier de rapidité ressentie du site, devant le poids JS.
   ══════════════════════════════════════════════════════════════════════ */

export const EASE_CHARTE = "0.16,1,0.3,1";

/* route précédente — écrite par Arrivee au moment où il la lit */
export const memoire = { route: null as string | null };

/* 02/09 — la carte « Découvrir nos sites » mène à /tarifs/site (l'offre)
   et plus à /modeles : c'est de là que le cadre bordeaux revient. */
export const PORTES: Record<string, "tarifs" | "audit" | "modeles"> = {
  "/tarifs": "tarifs",
  "/reserver-un-audit": "audit",
  "/tarifs/site": "modeles",
};

export type Temps = [delai: number, duree: number, y: number];
export type Role =
  | "titre"
  | "chapo"
  | "bloc"
  | "colonne"
  | "collage"
  | "hero-titre"
  | "hero-chapo"
  | "hero-bloc";

export const CASCADE: Record<"aller" | "retour" | "direct", Partial<Record<Role, Temps>>> = {
  aller: {
    titre: [60, 240, 10],
    chapo: [100, 230, 9],
    bloc: [140, 230, 9],
    colonne: [140, 200, 9],
    collage: [140, 180, 0],
    "hero-titre": [90, 260, 12],
    "hero-chapo": [140, 230, 9],
    "hero-bloc": [180, 220, 9],
  },
  retour: {
    titre: [70, 220, -6],
    chapo: [70, 220, -6],
    colonne: [110, 230, 8],
  },
  direct: {
    titre: [0, 300, 10],
    chapo: [40, 280, 9],
    bloc: [90, 270, 9],
    colonne: [90, 250, 9],
    collage: [0, 220, 0],
    "hero-titre": [40, 300, 12],
    "hero-chapo": [80, 280, 9],
    "hero-bloc": [120, 270, 9],
  },
};

export const PAS = { colonne: 22, carteRetour: 28 };

/* instant (ms) où l'objet partagé se pose sur sa carte, au retour */
export const POSE_OBJET = { tarifs: 250, audit: 250, modeles: 280 };
