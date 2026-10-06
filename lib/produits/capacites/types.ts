/* ══════════════════════════════════════════════════════════════════════
   Le catalogue de capacités des pages produit (14/09/2026)

   Pourquoi ce fichier existe. Les quatre pages produit décrivaient une
   boucle unique — le système lit, rédige, vous validez — et s'arrêtaient
   là. Une direction de groupe y voyait un assistant de messagerie. Ce que
   Teo a demandé : « qu'il lise ça et se dise : ils peuvent faire tout ça ».
   L'effet ne vient pas d'un adjectif, il vient de trois choses — un
   catalogue exhaustif, des cas limites nommés, et la preuve que ça tient à
   l'échelle d'un groupe. Ce sont les trois blocs décrits ici.

   ⚠️  LA RÈGLE QUI COMPTE : `atteste`.
   Chaque ligne du catalogue porte `atteste: true | false`.
   · `true`  — la capacité existe et se montre en démonstration.
   · `false` — elle est ÉCRITE MAIS PAS CONSTRUITE. Décision de Teo du
     14/09 : « pour l'instant le site ne va pas être en ligne, donc on peut
     mettre des trucs faux, on modifiera une fois qu'on le partagera ».
   Le drapeau n'est PAS rendu sur la page : il vit dans la donnée pour
   qu'on retrouve mécaniquement, avant tout partage, ce qui reste à
   construire ou à retirer. Le relevé complet est dans
   `CAPACITES-A-VALIDER.md`, à la racine du banc, et il se régénère par
   `node outils/capacites-a-valider.mjs`.

   ⚠️  CE TRAVAIL VIT SUR LE BANC, PAS DANS `pegase-site`. Le banc n'a
   aucun domaine et rend `Disallow: /` ; la vitrine, elle, est servie par
   omegaai.fr. Ne pas porter ces trois blocs tant que la colonne `atteste`
   n'a pas été tranchée ligne à ligne.

   Les icônes sont désignées par un NOM, jamais par le composant : une
   page produit est un composant serveur, et lui faire passer une fonction
   à un composant client rend un 500 en production.
   ══════════════════════════════════════════════════════════════════════ */

/** Le nom d'une icône lucide, résolu côté client par `icones.ts`. */
export type NomIcone =
  | "inbox"
  | "scan"
  | "shield"
  | "route"
  | "calculator"
  | "chart"
  | "users"
  | "search"
  | "megaphone"
  | "landmark"
  | "handshake"
  | "message"
  | "brain"
  | "calendar"
  | "bell"
  | "wallet"
  | "scale"
  | "lock";

export type Capacite = {
  /** La capacité, une phrase de huit à quinze mots, verbe conjugué. */
  t: string;
  /** Vrai si la capacité existe aujourd'hui et se montre en démonstration. */
  atteste: boolean;
};

export type FamilleCapacites = {
  nom: string;
  icone: NomIcone;
  lignes: Capacite[];
};

export type Catalogue = {
  etiquette: string;
  titre: string;
  chapo: string;
  familles: FamilleCapacites[];
  /** La note sous la grille : ce que le lecteur doit comprendre du périmètre. */
  mention: string;
};

export type CasLimite = {
  /** La situation, telle que le lecteur l'a vécue. */
  q: string;
  /** Ce que le système en fait. Une à deux phrases, jamais une promesse. */
  r: string;
};

export type BlocCasLimites = {
  etiquette: string;
  titre: string;
  chapo: string;
  cas: CasLimite[];
};

export type CarteEchelle = {
  icone: NomIcone;
  titre: string;
  texte: string;
};

export type BlocEchelle = {
  etiquette: string;
  titre: string;
  chapo: string;
  cartes: CarteEchelle[];
};

/** Le compte affiché au-dessus de la grille, calculé, jamais écrit à la main. */
export function compterCapacites(c: Catalogue) {
  return c.familles.reduce((n, f) => n + f.lignes.length, 0);
}
