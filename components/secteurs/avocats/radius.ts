/* ══════════════════════════════════════════════════════════════════════
   Tamila sur le dessin Radius — ce que le dessin demande en plus de
   textes.ts (11/11/2026)

   Teo : « refais exactement le même design que ce site […] en 1:1 ».
   Le modèle fournit le dessin, textes.ts fournit les mots : chaque
   titre, chapô, carte et formule de la page vient de là, lettre pour
   lettre. Mais le dessin Radius a des cases que la page du 24/09 n'avait
   pas : un mot d'amorce au-dessus de chaque titre (« Why Radius? »),
   des fenêtres d'exemple (un fil de messages, une liste, un plan
   d'agent, un rapport), des entrées de barre. Ce fichier les porte, et
   dit d'où chacune vient :
   · les AMORCES sont des étiquettes de section, pas des promesses ;
   · les fenêtres d'exemple sont composées à partir des données déjà
     dans textes.ts (POINT.cartes) et des phrases des formules
     (FORMULES.inclut) — aucun client nommé, aucun gain chiffré, aucun
     témoignage ; chaque fenêtre porte « exemple » dans son titre ;
   · les deux phrases du « pourquoi » sont celles de la ligne Tamila de
     lib/secteurs.ts (texte, detail), déjà servies sur /secteurs.
   ══════════════════════════════════════════════════════════════════════ */
import { secteur } from "@/lib/secteurs";
import { FORMULES, PIECES, POINT, SECRET } from "./textes";

const TAMILA = secteur("avocats");

export const AMORCES = {
  pourquoi: "Pourquoi Tamila ?",
  secret: "Secret professionnel",
  fonctionnalites: "Vérification",
  rapport: "Rapport de cohérence",
  matieres: "Matières",
  formules: "Formules",
  souverainete: "Hébergement et droit applicable",
  outils: "Vos outils",
  point: "Point du matin",
} as const;

/* « Pourquoi Tamila ? » — les deux phrases de lib/secteurs.ts (ligne
   `avocats`), reprises telles quelles. */
export const POURQUOI = {
  titre: TAMILA?.texte ?? "Chaque fait renvoie à la pièce et à la page qui le fondent.",
  texte:
    TAMILA?.detail ??
    "Tamila lit chaque pièce du dossier, y compris scannée ou manuscrite, et rattache chaque fait à la page qui le fonde.",
  /* la troisième carte : les familles de pièces (PIECES) en une phrase */
  pieces: {
    titre: `${PIECES.avant} ${PIECES.mot}`,
    texte: `${PIECES.familles.map((f, i) => (i ? f.toLowerCase() : f)).join(", ")}.`,
  },
};

/* Le fil « arrivées » (carte 1 du pourquoi) — un exemple composé avec le
   dossier Copropriété de POINT.cartes[3] (pièce n° 12 citée, sommation). */
export const FIL_ARRIVEES = {
  titre: "arrivées · exemple",
  messages: [
    { de: "Confrère", heure: "9:14", texte: "Conclusions adverses déposées, avec la pièce n° 12 au bordereau." },
    { de: "Tamila", heure: "9:14", texte: "Rapprochée du dossier de faits : la pièce n° 12 est citée, jamais communiquée. Sommation prête, page 7 des conclusions." },
    { de: "Cabinet", heure: "9:20", texte: "Sommation à envoyer avant l'audience du 18." },
  ],
};

/* La chronologie sourcée (carte 2 du pourquoi) — trois faits d'un dossier
   Construction, chacun daté et rattaché à sa pièce. */
export const CHRONOLOGIE = {
  titre: "Chronologie · exemple",
  faits: [
    { date: "12 mars 2024", fait: "Devis signé, 12 000 €", source: "Pièce n° 4, p. 3" },
    { date: "3 juin 2024", fait: "Réserves à la réception", source: "Pièce n° 9, p. 1" },
    { date: "21 oct. 2024", fait: "Pré-rapport de l'expert", source: "Pièce n° 17, p. 12" },
  ],
};

/* Le plan de vérification (section « agents » du modèle) — la demande et
   les six étapes sont les cinq cartes de FONCTIONNALITES et le journal,
   dites en une ligne chacune. */
export const PLAN = {
  demande: "Vérifier le dossier Construction avant l'appel du 2 oct.",
  titre: "Plan de vérification · exemple",
  etapes: [
    { titre: "Pièces lues", texte: "Conclusions, bordereaux, pièces adverses, expertise" },
    { titre: "Faits datés et sourcés", texte: "Chaque fait rattaché à la page de sa pièce" },
    { titre: "Bordereau contrôlé", texte: "Prétentions rapprochées des pièces (art. 768)" },
    { titre: "Références vérifiées", texte: "Textes et arrêts cités : existence, version, portée" },
    { titre: "Contradictions relevées", texte: "Deux pièces qui divergent, côte à côte" },
    { titre: "Journal d'audit daté", texte: "Relevés et décisions exportables en dossier scellé" },
  ],
};

/* Le rapport de cohérence (section « performance » du modèle) — un
   extrait d'exemple, puis la ligne du journal. */
export const RAPPORT = {
  titre: "Tamila · Rapport de cohérence",
  etiquette: "Relevé",
  extrait:
    "Les conclusions adverses du 12 mars (p. 7) invoquent la pièce n° 12, qui ne figure à aucun bordereau communiqué. Le devis signé (pièce n° 4, p. 3) porte 12 000 € ; l'assignation (p. 2) retient 15 000 €. L'article L. 145-41 est cité dans sa version antérieure au 1er janvier 2024…",
  sources: "Sources",
  journal: { titre: "Journal d'audit mis à jour", texte: "Trois points relevés, datés et rattachés à leur pièce" },
  /* les trois traits à droite : des phrases de FORMULES.inclut (Contentieux) */
  traits: [
    { titre: "Rapport de cohérence et tableau des références", texte: "Trous de la chronologie et faits contredits. Prétentions nouvelles et concentration en appel." },
    { titre: "Textes et arrêts cités vérifiés", texte: "Textes cités : existence et version en vigueur. Arrêts cités : existence et portée." },
    { titre: "Dossier de faits daté et sourcé", texte: "Index des personnes et faits classés par moyen. Export Word et PDF." },
  ],
};

/* Les matières en trois cartes (section « roles » du modèle) : les
   dix-neuf de MATIERES.liste, regroupées, et « Et d'autres » en clôture. */
export const MATIERES_CARTES = [
  { amorce: "Plaidé sur pièces en", titre: "Civil et commercial", matieres: ["Civil", "Commercial", "Bancaire", "Consommation", "Recouvrement", "Sociétés", "Brevets"], photo: "/photos/avocats-palais-facade.jpg", alt: "La façade du Palais de justice de Paris" },
  { amorce: "Plaidé sur pièces en", titre: "Immobilier et construction", matieres: ["Construction", "Baux", "Copropriété", "Rural", "Transport", "Assurances"], photo: "/photos/avocats-palais-grille.jpg", alt: "La grille dorée du Palais de justice de Paris" },
  { amorce: "Plaidé sur pièces en", titre: "Personnes et travail", matieres: ["Prud'hommes", "Famille", "Successions", "Corporel", "Santé", "Administratif"], photo: "/photos/avocats-cour-du-mai.jpg", alt: "La cour du Mai du Palais de justice de Paris" },
];

/* Les formules : le chapô en deux temps (FORMULES.texte, coupé à la
   première phrase pour la tête, la seconde en note sous les cartes). */
const [FORMULES_TETE, FORMULES_NOTE] = FORMULES.texte.split(" Le tarif");
export const FORMULES_TEXTES = { tete: FORMULES_TETE, note: `Le tarif${FORMULES_NOTE}` };

/* Le bloc sombre : le badge de SECRET en titre, l'accroche en chapô. */
export const SOUVERAINETE = {
  titre: SECRET.badge,
  texte: SECRET.accroche,
  faits: SECRET.faits,
  mention: SECRET.mention,
  sceaux: [
    { ligne1: "Hébergé", ligne2: "en France", tour: "Hébergeur français · Droit français · Art. 28 RGPD" },
    { ligne1: "Art. 66-5", ligne2: "Secret pro.", tour: "Loi du 31 décembre 1971 · RIN, art. 2" },
  ],
};

/* « Vos outils restent en place » (section « intégrations » du modèle) :
   trois cartes dont les phrases viennent de FORMULES.inclut (Cabinet). */
export const OUTILS = {
  cartes: [
    { titre: "Messagerie et agenda", texte: "Point du matin à 7 h. Délais lus dans les avis RPVA." },
    { titre: "Logiciel de cabinet et dossiers partagés", texte: "Lecture seule de vos outils. Pièces attendues du client, de l'expert et du confrère." },
    { titre: "Pièces scannées et exports", texte: "Pièces scannées et manuscrites. Export Word et PDF. Piste d'audit du cabinet, export scellé." },
  ],
  fil: {
    titre: "point-du-matin · exemple",
    messages: [
      { de: "Tamila", heure: "7:00", texte: `${POINT.cartes[0].valeur}, ${POINT.cartes[1].valeur}, ${POINT.cartes[2].valeur} à corriger, ${POINT.cartes[3].valeur} de conformité.` },
      { de: "Cabinet", heure: "7:12", texte: "quel acte pour le dossier Construction ?", mention: "@Tamila" },
      { de: "Tamila", heure: "7:12", texte: `${POINT.cartes[0].lignes[0][1]}, échéance le ${POINT.cartes[0].lignes[0][2]} (${POINT.cartes[0].lignes[0][3]}), lue dans l'avis RPVA.` },
    ],
  },
  demande: "Rapprocher la pièce n° 12 citée par le confrère du dossier de faits Copropriété.",
};
