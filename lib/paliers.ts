/* ══════════════════════════════════════════════════════════════════════
   /tarifs v4 — grille publique et catalogue des postes (28/08/2026)

   REVIREMENT ASSUMÉ, décision Teo du 27-28/08 : la v3 interdisait tout
   montant (« le prix sort de vos volumes ») ; le modèle commercial arrêté
   fait l'inverse pour les indépendants et TPE-PME — prix publics, achat
   direct, réunion d'installation incluse. L'ancienne règle ne survit que
   d'un côté : POUR LES STRUCTURES OÙ PLUSIEURS PERSONNES VALIDENT, aucun
   montant ne s'affiche — leur prix sort de l'audit, comme avant.

   GRILLE EN VIGUEUR — 59/89/119 arrêtés le 01/09/2026 (Teo), en
   remplacement du provisoire 59/85/105 du 28/08 : 89 et 119 sont des
   points de prix standards là où 85 et 105 n'en étaient pas, et si l'on
   franchit la barre des 100 €, autant qu'elle rapporte. Les prix ne
   vivent QU'ICI ; la fonction SQL reserver_audit en garde sa propre copie
   (source de vérité de l'instantané stocké) : toute modification se fait
   AUX DEUX ENDROITS — la REMISE ANNUELLE aussi (0,85 dans la SQL).

   FORMULE ANNUELLE — 02/09/2026 (Teo) : un sélecteur Mensuel | Annuel
   au-dessus des cartes, 15 % de remise sur l'annuel (10 % le 02/09, relevé le 03/09 : sous la norme du marché), l'économie mise en
   évidence « comme ça se fait ». L'annuel est facturé en une fois pour
   douze mois ; le satisfait ou remboursé 30 jours s'applique pareil. Le
   mensuel reste sans engagement, inchangé. PALIERS.prix reste le prix
   MENSUEL de référence — l'annuel se DÉRIVE (prixAnnuel & co), il ne se
   stocke pas ici. RÈGLE D'ARRONDI (02/09, relecture — la même que la
   SQL, qui est la source de vérité de l'instantané stocké) : l'équivalent
   mensuel remisé est arrondi à l'euro INFÉRIEUR, puis multiplié par 12.
   Un round(mensuel × 12 × 0,9) donnerait 637 / 961 / 1285, non
   divisibles par 12 : le client lisait « 80 €/mois — facturé 961 € par
   an » (80 × 12 ≠ 961) et la base figeait 960. Chiffres actés :
   600 / 900 / 1212 €/an, soit 50 / 75 / 101 €/mois, économie 108 / 168 /
   144 € par an.

   Le critère qui sépare les deux mondes n'est pas la taille mais QUI
   VALIDE : une personne qui tient les outils → grille ; plusieurs
   services qui se partagent la validation → audit d'abord. C'est le
   déterminant réel du coût d'installation (entretiens individuels,
   points de validation — voir les formats « Entreprise & équipes »).
   ══════════════════════════════════════════════════════════════════════ */

/* ——— les quatre postes facturables (mêmes slugs que /offres) ——— */

export type Poste = {
  id: "cashd" | "reload" | "frontd" | "filed";
  system: string;
  nom: string;
  slug: string; // page /offres/<slug>
  resume: string;
};

export const POSTES: Poste[] = [
  {
    id: "cashd",
    system: "CASHD",
    nom: "Relance devis & factures",
    slug: "relances-impayes",
    resume: "Vos devis sans réponse et vos factures échues, relancés à J+3, J+7, J+21.",
  },
  {
    id: "frontd",
    system: "FRONTD",
    nom: "Demandes entrantes & avis",
    slug: "demandes-clients",
    resume: "Une demande reçue à 21 h obtient sa réponse à 21 h, mail et WhatsApp.",
  },
  {
    id: "reload",
    system: "RELOAD",
    nom: "Clients dormants & marchés",
    slug: "nouvelles-affaires",
    resume: "Vos clients silencieux recontactés, les marchés publics de votre zone filtrés.",
  },
  {
    id: "filed",
    system: "FILED",
    nom: "La paperasse traitée",
    slug: "factures-fournisseurs",
    resume: "Chaque facture fournisseur lue, contrôlée, classée, transmise au cabinet.",
  },
];

/* PULSE et VAULT ne se choisissent pas : ils tournent chez tout le monde,
   quel que soit le palier — c'est la règle posée sur /offres. */
export const COMPRIS = [
  { system: "PULSE", nom: "Le point du matin", slug: "point-du-matin" },
  { system: "VAULT", nom: "Validation & verrous", slug: "securite" },
];

/* ——— la grille ——— */

export type Palier = {
  id: "un" | "trois" | "complet";
  nom: string;
  prix: number; // €/mois TTC — grille du 01/09/2026 (voir l'en-tête)
  sousPrix: string;
  /* combien de postes le visiteur coche — null : tous, rien à choisir */
  aChoisir: number | null;
  phare?: boolean;
  badge?: string;
  promesse: string;
  points: string[];
};

export const PALIERS: Palier[] = [
  {
    id: "un",
    nom: "Un poste",
    prix: 59,
    sousPrix: "par mois, sans engagement",
    aChoisir: 1,
    promesse: "Le poste qui vous coûte le plus cher aujourd'hui, traité en premier.",
    points: [
      "Un poste au choix parmi les quatre",
      "PULSE et VAULT compris, dès le premier jour",
      "Réunion d'installation incluse (visio, 45 min)",
      "Satisfait ou remboursé 30 jours",
    ],
  },
  {
    id: "trois",
    nom: "Trois postes",
    prix: 89,
    sousPrix: "par mois, sans engagement",
    aChoisir: 3,
    phare: true,
    badge: "Recommandé",
    promesse: "La relance, l'accueil et un troisième poste : le trio qui change les journées.",
    points: [
      "Trois postes au choix parmi les quatre",
      "PULSE et VAULT compris, dès le premier jour",
      "Réunion d'installation incluse (visio, 45 min)",
      "Satisfait ou remboursé 30 jours",
    ],
  },
  {
    id: "complet",
    nom: "Tout Omega",
    prix: 119,
    sousPrix: "par mois, sans engagement",
    aChoisir: null,
    promesse: "Les quatre postes en service — six systèmes au total avec le point du matin et les verrous.",
    points: [
      "Les quatre postes, sans choisir",
      "PULSE et VAULT compris, dès le premier jour",
      "Réunion d'installation incluse (visio, 45 min)",
      "Satisfait ou remboursé 30 jours",
    ],
  },
];

/** Prix d'un choix de postes — même barème que la fonction SQL. */
export function prixPour(nb: number): number {
  if (nb <= 1) return 59;
  if (nb <= 3) return 89;
  return 119;
}

/* ——— la formule annuelle (02/09/2026) ———
   UNE seule constante à changer pour bouger la remise — et sa jumelle
   dans la fonction SQL reserver_audit (voir l'en-tête). */

export const REMISE_ANNUELLE = 0.15; // 03/09 (Teo) : 10 % → 15 %, dans la norme du marché (15-20 %)

export type Periodicite = "mensuel" | "annuel";

/** Ce qu'on facture en une fois pour douze mois : l'équivalent mensuel
    remisé arrondi à l'euro inférieur, × 12 — MÊME règle que la fonction
    SQL reserver_audit (floor(v_prix * 0.85) * 12), voir l'en-tête. */
export function prixAnnuel(mensuel: number): number {
  return Math.floor(mensuel * (1 - REMISE_ANNUELLE)) * 12;
}

/** Ce que l'annuel fait gagner sur l'année — le chiffre qu'on met en avant. */
export function economieAnnuelle(mensuel: number): number {
  return mensuel * 12 - prixAnnuel(mensuel);
}

/** Le mensuel équivalent de l'annuel — le grand chiffre de la carte. Un
    entier par construction (prixAnnuel est un multiple de 12) ; le round
    ne coûte rien et protège d'une virgule flottante capricieuse. */
export function equivalentMensuel(mensuel: number): number {
  return Math.round(prixAnnuel(mensuel) / 12);
}

/** Lit une périodicité venue de l'extérieur (paramètre d'URL, colonne) :
    tout ce qui n'est pas « annuel » retombe sur le mensuel, le défaut. */
export function lirePeriodicite(v: unknown): Periodicite {
  return v === "annuel" ? "annuel" : "mensuel";
}

/* ——— les deux portes : qui valide ? ———
   Servent le bandeau d'orientation de /tarifs et le panneau TPE de
   /reserver-un-audit. La formulation évite « petite / grosse entreprise » :
   ce qui change le prix, c'est la structure de validation. */

export const PORTES = {
  critere: "Le prix dépend de qui valide — pas de votre chiffre d'affaires.",
  solo: {
    titre: "Vous tenez les outils",
    texte:
      "Indépendant, TPE, PME : une personne — deux, parfois — voit passer les demandes, les devis, les factures, et valide ce qui part. Le prix est public, l'installation se réserve en ligne.",
  },
  equipe: {
    titre: "Plusieurs services se partagent le travail",
    texte:
      "La demande passe par l'accueil, la compta, l'atelier ; chaque service a ses outils et ses règles de validation. Là, un prix affiché serait un mensonge : on audite d'abord, le devis sort des volumes mesurés.",
  },
};

/* ——— le comparatif des paliers (05/09/2026) ———
   /tarifs reprend le DESIGN de /reserver-un-audit (demande Teo, 05/09 :
   « le même design, les infos de tarifs restent »). La page audit compare
   ses formats dans un tableau ; celui-ci compare les paliers avec les
   mêmes lignes de six colonnes. Aucune règle nouvelle : chaque cellule
   redit un fait déjà posé ailleurs sur la page (points des cartes, note
   TTC, « ce que nous ne facturons jamais », FAQ). Les montants sont
   DÉRIVÉS de PALIERS — jamais recopiés. */

export type LignePaliers = {
  libelle: string;
  aide: string;
  valeurs: [string, string, string];
};

export type FamillePaliers = {
  titre: string;
  /* les deux premières familles sont visibles, la suivante est derrière
     le bouton « Voir tous les points » — comme sur la page audit */
  repliee?: boolean;
  lignes: LignePaliers[];
};

const NBSP = " ";
const REMISE_PCT_TXT = Math.round(REMISE_ANNUELLE * 100);
const meme = (v: string): [string, string, string] => [v, v, v];
const parPalier = (f: (p: Palier) => string): [string, string, string] =>
  PALIERS.map(f) as [string, string, string];

export const COMPARATIF_PALIERS: FamillePaliers[] = [
  {
    titre: "Ce qui tourne chez vous",
    lignes: [
      {
        libelle: "Postes en service",
        aide: "Parmi les quatre : relances, demandes entrantes, clients dormants, paperasse.",
        valeurs: parPalier((p) =>
          p.aChoisir === null ? "Les quatre, sans choisir" : `${p.aChoisir}, au choix`,
        ),
      },
      {
        libelle: "PULSE · le point du matin",
        aide: "Savoir où vous en êtes, chaque matin — compris quel que soit le palier.",
        valeurs: meme("Compris"),
      },
      {
        libelle: "VAULT · validation & verrous",
        aide: "La certitude que rien ne part sans vous — compris quel que soit le palier.",
        valeurs: meme("Compris"),
      },
    ],
  },
  {
    titre: "Prix et engagement",
    lignes: [
      {
        libelle: "Mensuel, sans engagement",
        aide: "Vous prévenez, le mois en cours va à son terme, les envois s'arrêtent.",
        valeurs: parPalier((p) => `${p.prix}${NBSP}€ par mois`),
      },
      {
        libelle: `Annuel, −${REMISE_PCT_TXT}${NBSP}%`,
        aide: "Facturé en une fois pour douze mois ; le satisfait ou remboursé s'applique de la même façon.",
        valeurs: parPalier(
          (p) => `${prixAnnuel(p.prix)}${NBSP}€ par an, soit ${equivalentMensuel(p.prix)}${NBSP}€ par mois`,
        ),
      },
      {
        libelle: "Vous économisez en annuel",
        aide: "L'écart entre douze mensualités et la facture annuelle.",
        valeurs: parPalier((p) => `${economieAnnuelle(p.prix)}${NBSP}€ par an`),
      },
      {
        libelle: "Prix par personne",
        aide: "Le prix ne dépend pas du nombre de gens qui s'en servent chez vous.",
        valeurs: meme("Aucun"),
      },
      {
        libelle: "Commission au résultat",
        aide: "Pas de pourcentage sur les sommes encaissées.",
        valeurs: meme("Aucune"),
      },
    ],
  },
  {
    titre: "Installation et sortie",
    repliee: true,
    lignes: [
      {
        libelle: "Réunion d'installation",
        aide: "En visio, écran partagé : on branche vos outils ensemble, le système démarre sous votre œil.",
        valeurs: meme("Comprise, 45 min"),
      },
      {
        libelle: "Raccordement particulier",
        aide: "Un logiciel rare, un historique à reprendre.",
        valeurs: meme("Chiffré avant tout engagement"),
      },
      {
        libelle: "Paiement",
        aide: "Rien ne se paie en ligne : tout se règle à la réunion d'installation.",
        valeurs: meme("À l'installation"),
      },
      {
        libelle: "Satisfait ou remboursé",
        aide: "Sans justification à fournir, en mensuel comme en annuel.",
        valeurs: meme("30 jours"),
      },
      {
        libelle: "Changement de palier",
        aide: "Le prix suit simplement le nombre de postes en service.",
        valeurs: meme("À tout moment, sans frais"),
      },
      {
        libelle: "Vos données à la sortie",
        aide: "Ce qui est à vous reste à vous.",
        valeurs: meme("Export complet, sans frais"),
      },
      {
        libelle: "Chèque TIC",
        aide: "Région Guadeloupe — porte sur l'installation, pas sur l'abonnement.",
        valeurs: meme("Éligibilité vérifiée à l'installation"),
      },
    ],
  },
];
