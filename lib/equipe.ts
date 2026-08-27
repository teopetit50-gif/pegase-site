/* ══════════════════════════════════════════════════════════════════════
   L'ÉQUIPE — section « Qui sommes-nous ? » de /contact

   Calque de la grille équipe d'hyperstack.studio/a-propos : portrait, prénom,
   rôle, deux lignes de bio. Chez eux ils sont dix ; ici la grille s'adapte au
   nombre réel de fiches (1, 2, 3 → rangée centrée ; 4+ → grille 3 colonnes).

   ⚠️  TEO : je n'ai pas inventé de collaborateurs. Une équipe fictive avec des
   portraits d'inconnus, c'est autre chose qu'un avis de démonstration — ce
   sont des personnes réelles dont on utiliserait le visage pour prétendre
   qu'elles travaillent chez toi. La fiche ci-dessous est donc la tienne, à
   compléter, et la section ne s'affiche pas tant que MEMBRES est vide.

   Pour ajouter quelqu'un : une entrée par personne, et une photo dans
   /public/equipe/ (cadrage portrait, 800×1000 environ).
   ══════════════════════════════════════════════════════════════════════ */

export type Membre = {
  cle: string;
  prenom: string;
  role: string;
  bio: string;
  /* chemin dans /public — sans photo, la carte affiche les initiales */
  photo?: string;
};

export const MEMBRES: Membre[] = [
  {
    cle: "teo",
    prenom: "Teo",
    role: "Fondateur",
    bio: "[À COMPLÉTER, deux lignes : ton parcours, et ce qui t'a fait monter Omega.AI. Les fiches d'hyperstack font 200 à 300 signes, ton ton peut être plus direct.]",
    // photo: "/equipe/teo.jpg",
  },
];

/* Sur-titre et titre de la section — modifiables sans toucher au composant. */
export const EQUIPE_SURTITRE = "L'équipe";
export const EQUIPE_TITRE = "Qui est derrière";
export const EQUIPE_CHAPO =
  "Omega.AI est un desk, pas une agence à étages : la personne qui fait l'audit est celle qui installe le moteur et celle que vous avez au téléphone six mois plus tard.";
