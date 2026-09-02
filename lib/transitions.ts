/* ══════════════════════════════════════════════════════════════════════
   Transitions de page (01/09/2026) — le vocabulaire partagé

   Trois modes d'arrivée, décidés par Arrivee à partir de la route
   précédente (`memoire.route`, null = chargement direct) :
     · aller  : on vient d'une autre page (typiquement /commencer) — la
                sortie VT joue 160 ms, la cascade démarre à 160 ;
     · retour : on revient sur /commencer depuis une des trois portes —
                cascade plus courte, montée inversée (−8 px), et la carte
                qui RÉCUPÈRE la pastille / le cadre apparaît en place, sans
                montée, à l'instant où l'objet partagé se pose ;
     · direct : chargement à froid / rechargement — pas de sortie, la
                cascade part à 0 dès que les polices sont posées.

   Chaque entrée : [délai ms, durée ms, montée px]. Les « colonne »
   s'échelonnent de PAS.colonne (aller/direct) ou PAS.carteRetour.
   Courbe unique partout : la bezier charte [0.16, 1, 0.3, 1].
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
    titre: [160, 460, 14],
    chapo: [220, 420, 12],
    bloc: [300, 420, 12],
    colonne: [300, 420, 12],
    collage: [300, 320, 0],
    "hero-titre": [340, 460, 16],
    "hero-chapo": [400, 420, 12],
    "hero-bloc": [460, 420, 12],
  },
  retour: {
    titre: [120, 380, -8],
    chapo: [120, 380, -8],
    colonne: [180, 400, 10],
  },
  direct: {
    titre: [0, 460, 14],
    chapo: [60, 420, 12],
    bloc: [140, 420, 12],
    colonne: [140, 420, 12],
    collage: [0, 320, 0],
    "hero-titre": [60, 460, 16],
    "hero-chapo": [120, 420, 12],
    "hero-bloc": [180, 420, 12],
  },
};

export const PAS = { colonne: 45, carteRetour: 50 };

/* instant (ms) où l'objet partagé se pose sur sa carte, au retour */
export const POSE_OBJET = { tarifs: 380, audit: 380, modeles: 420 };
