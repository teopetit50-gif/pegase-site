/* ══════════════════════════════════════════════════════════════════════
   Réseau Omega › Opportunités — le contenu de démonstration (02/11/2026)

   ENTIÈREMENT FICTIF, comme les membres (./membres.ts) : montré
   seulement en « Données d'exemple ». En « Base réelle », la page ne lit
   rien d'ici (le réseau n'a pas encore de table) et dit que le réseau
   ouvre bientôt.

   « Vous », c'est toujours l'organisation connectée d'Espace 2 (CAMA,
   concession automobile, dans l'exemple) : les raisons sont écrites
   depuis ses données à elle (factures fournisseurs, catalogue, contrats).
   Aucun membre n'y parle à la place de « vous ».

   Les badges ne sont PAS recopiés ici : la page les lit dans la fiche du
   membre (MEMBRES[].badges), qui ne porte que ceux qu'il a accepté de
   montrer. Une opportunité ne peut donc pas en citer un autre.
   ══════════════════════════════════════════════════════════════════════ */

/** D'où vient la suggestion : la donnée d'Espace 2 qui l'a fait naître. */
export type Provenance = { libelle: string; detail: string };

/** 1. Une mise en relation tirée des données. */
export type MiseEnRelation = {
  id: string;
  membre: string; // slug
  /** La phrase de la carte, « vous » d'abord. */
  titre: string;
  /** Pourquoi on la propose, en clair. */
  raison: string;
  provenance: Provenance;
  /** Il y a combien de temps la suggestion est née (texte d'exemple). */
  age: string;
};

/** 2. Un groupement de marché public. */
export type Lot = { numero: number; intitule: string; /** slug du membre ; null = vous */ titulaire: string | null };
export type Groupement = {
  id: string;
  titre: string;
  montant: string;
  acheteur: string;
  /** Date limite de remise des offres, AAAA-MM-JJ. */
  remise: string;
  lots: Lot[];
  raison: string;
  provenance: Provenance;
  age: string;
};

/** 3. Un achat groupé. */
export type AchatGroupe = {
  id: string;
  titre: string;
  /** slug du membre qui l'organise ; null = Omega. */
  organisateur: string | null;
  raison: string;
  provenance: Provenance;
  gain: string;
  inscrits: number;
  seuil: number;
  /** Clôture des inscriptions, AAAA-MM-JJ. */
  cloture: string;
};

export const MISES_EN_RELATION: MiseEnRelation[] = [
  {
    id: "mr-emballages",
    membre: "emballa-kreyol",
    titre: "Vous commandez vos emballages en métropole ; Emballa Kréyol les fabrique à Baie-Mahault.",
    raison: "9 factures de cartons d'expédition en 2026, livrées depuis Lyon avec 3 à 5 semaines de délai. Emballa Kréyol produit dès 200 pièces.",
    provenance: { libelle: "Vos factures fournisseurs", detail: "9 factures, 2 fournisseurs, 4 180 € HT" },
    age: "2 j",
  },
  {
    id: "mr-fret",
    membre: "karuko-fret",
    titre: "Vos pièces détachées arrivent en trois envois par mois ; Karuko Fret les grouperait en un conteneur.",
    raison: "Trois transitaires différents vous facturent l'acheminement depuis Le Havre. Karuko Fret cherche justement des clients pour son groupage mensuel vers Jarry.",
    provenance: { libelle: "Vos factures fournisseurs", detail: "31 factures de transport sur 12 mois" },
    age: "3 j",
  },
  {
    id: "mr-pieces",
    membre: "garage-kalbas",
    titre: "Garage Kalbas cherche des pièces avec un stock local ; votre magasin en a.",
    raison: "Ce qu'il cherche dans le réseau recoupe votre catalogue de pièces : filtres, plaquettes, batteries, disponibles en stock à Baie-Mahault.",
    provenance: { libelle: "Votre catalogue", detail: "1 240 références en stock" },
    age: "5 j",
  },
  {
    id: "mr-cadeaux",
    membre: "kaz-zepis",
    titre: "Vous offrez des cadeaux de fin d'année à vos clients ; Kaz Zépis fait des paniers de produits locaux.",
    raison: "En décembre dernier, 3 commandes de coffrets passées à des sites de métropole. Kaz Zépis prépare des paniers pour entreprises au Gosier.",
    provenance: { libelle: "Vos factures fournisseurs", detail: "3 factures en décembre 2025" },
    age: "1 sem.",
  },
  {
    id: "mr-signaletique",
    membre: "imprim-alize",
    titre: "La signalétique de votre showroom est imprimée en métropole ; Imprim Alizé le fait à Jarry.",
    raison: "2 commandes d'enseignes et de bâches en 2026, avec transport et pose facturés à part.",
    provenance: { libelle: "Vos factures fournisseurs", detail: "2 factures, 6 900 € HT" },
    age: "1 sem.",
  },
];

export const GROUPEMENTS: Groupement[] = [
  {
    id: "gp-college",
    titre: "Rénovation énergétique d'un collège",
    montant: "340 k€",
    acheteur: "Collectivité, Les Abymes",
    remise: "2026-11-27",
    lots: [
      { numero: 1, intitule: "Gros œuvre", titulaire: "bwa-vert-btp" },
      { numero: 2, intitule: "Photovoltaïque et bornes de recharge", titulaire: "solelek" },
      { numero: 3, intitule: "Deux utilitaires électriques", titulaire: null },
    ],
    raison: "Avec Solelek Antilles et Bwa Vert BTP, vous couvrez les trois lots. L'acheteur veut une seule offre ; aucun de vous trois ne la remplit seul.",
    provenance: { libelle: "Veille des marchés publics", detail: "Avis publié le 28 oct., 3 lots" },
    age: "4 j",
  },
  {
    id: "gp-flotte",
    titre: "Entretien de la flotte d'une commune, sur 3 ans",
    montant: "180 k€",
    acheteur: "Commune, Sainte-Anne",
    remise: "2026-12-04",
    lots: [
      { numero: 1, intitule: "Entretien mécanique", titulaire: "garage-kalbas" },
      { numero: 2, intitule: "Fourniture de pièces", titulaire: null },
      { numero: 3, intitule: "Marquage des véhicules", titulaire: "imprim-alize" },
    ],
    raison: "Avec Garage Kalbas et Imprim Alizé, vous couvrez le marché entier. Votre lot, les pièces, est le plus gros des trois.",
    provenance: { libelle: "Veille des marchés publics", detail: "Avis publié le 30 oct., 3 lots" },
    age: "2 j",
  },
];

export const ACHATS_GROUPES: AchatGroupe[] = [
  {
    id: "ag-gaz",
    titre: "Gaz réfrigérant R1234yf",
    organisateur: "frigo-tropik",
    raison: "Votre atelier recharge des climatisations : 6 bouteilles achetées en 2026, au prix catalogue.",
    provenance: { libelle: "Vos factures fournisseurs", detail: "6 bouteilles, 2 340 € HT" },
    gain: "Environ 18 % de moins sur la bouteille",
    inscrits: 7,
    seuil: 10,
    cloture: "2026-11-20",
  },
  {
    id: "ag-fret",
    titre: "Fret groupé Le Havre → Jarry, décembre",
    organisateur: "karuko-fret",
    raison: "Vous recevez trois envois par mois depuis Le Havre ; un conteneur partagé coûte moins cher que trois groupages.",
    provenance: { libelle: "Vos factures fournisseurs", detail: "31 factures de transport sur 12 mois" },
    gain: "Environ 25 % de moins par mètre cube",
    inscrits: 11,
    seuil: 12,
    cloture: "2026-11-15",
  },
  {
    id: "ag-assurance",
    titre: "Assurance multirisque professionnelle",
    organisateur: null,
    raison: "Votre contrat arrive à échéance le 31 décembre ; un contrat de groupe se négocie à partir de 15 entreprises.",
    provenance: { libelle: "Vos contrats", detail: "Échéance le 31 déc. 2026" },
    gain: "Garanties cyclone revues à la hausse, prime à négocier",
    inscrits: 9,
    seuil: 15,
    cloture: "2026-12-10",
  },
];

/* ——— « Ce que le réseau vous a apporté » : le suivi, en exemple ——— */

export type EtatSuivi = "intro" | "devis" | "signe" | "perdu";
export type Suivi = {
  membre: string;
  /** Ce qu'on a fait ensemble, en clair. */
  objet: string;
  /** Date de l'intro acceptée, AAAA-MM-JJ. */
  intro: string;
  /** Devis reçu ou envoyé, en euros HT ; null = pas encore. */
  devis: number | null;
  sens: "recu" | "envoye";
  etat: EtatSuivi;
};

export const SUIVI: Suivi[] = [
  { membre: "atelier-moko", objet: "Menuiseries de l'atelier carrosserie", intro: "2026-09-18", devis: 12600, sens: "recu", etat: "signe" },
  { membre: "imprim-alize", objet: "Enseigne et totem du parking", intro: "2026-10-02", devis: 8700, sens: "recu", etat: "signe" },
  { membre: "solelek", objet: "Bornes de recharge de l'atelier", intro: "2026-10-09", devis: 5400, sens: "recu", etat: "devis" },
  { membre: "kontab-ile", objet: "Dossier de financement de l'atelier", intro: "2026-10-14", devis: 3200, sens: "recu", etat: "devis" },
  { membre: "lanmou-traiteur", objet: "Cocktail des portes ouvertes", intro: "2026-10-20", devis: null, sens: "recu", etat: "intro" },
  { membre: "nauti-sable", objet: "Remorques et véhicules de convoyage", intro: "2026-10-24", devis: null, sens: "envoye", etat: "intro" },
];
