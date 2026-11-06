/* ══════════════════════════════════════════════════════════════════════
   DALIRO — la bibliothèque de prix d'exemple, côté devis dictés (06/11/2026)

   Celle sur laquelle « Dicter un devis » chiffre une dictée : les prix des
   devis d'exemple (./exemplesDevis), ceux de la page Réglages
   (./exemplesReglages) et quelques ouvrages courants en Guadeloupe. Lue par
   la page (affichage) et par /api/daliro/devis (le modèle choisit une
   référence et le prix vient d'ici ; pour l'exemple, un ouvrage hors
   bibliothèque est chiffré par le modèle et présenté de la même façon).

   Prix HT, entreprise fictive. Rien ici n'est jamais écrit en base.
   ══════════════════════════════════════════════════════════════════════ */

export type PrixBibliotheque = { ref: string; designation: string; unite: string; corps: string; prix: number };

type Def = [designation: string, unite: string, corps: string, prix: number];
const DEFS: Def[] = [
  /* démolition, gros œuvre */
  ["Dépose de la baignoire, de la faïence et évacuation des gravats", "forfait", "démolition", 680],
  ["Dépose de la couverture tôle existante", "m²", "démolition", 14],
  ["Démolition de cloison et évacuation", "m²", "démolition", 32],
  ["Massifs béton des poteaux", "u", "maçonnerie", 260],
  ["Plots béton et platines", "u", "maçonnerie", 225],
  ["Dalle béton armé 12 cm", "m²", "maçonnerie", 78],
  ["Chape de ragréage", "m²", "maçonnerie", 28],
  ["Mur en parpaings de 15, enduit deux faces", "m²", "maçonnerie", 96],
  /* charpente, couverture */
  ["Charpente bois et liteaux", "m²", "charpente", 118],
  ["Couverture bac acier anticyclonique", "m²", "couverture", 64],
  ["Remplacement de chevrons", "u", "charpente", 145],
  ["Faîtages et closoirs", "ml", "couverture", 38],
  ["Gouttières aluminium et descentes", "ml", "couverture", 46],
  ["Échafaudage, une semaine", "forfait", "couverture", 890],
  ["Bardage mélèze à claire-voie", "m²", "charpente", 92],
  ["Toiture panneaux sandwich 40 mm", "m²", "couverture", 72],
  ["Structure aluminium thermolaqué d'abri voiture, 6 × 5 m", "forfait", "serrurerie", 6850],
  /* plomberie */
  ["Reprise des alimentations et de l'évacuation", "forfait", "plomberie", 1150],
  ["Receveur extra-plat 120 × 90 et paroi fixe", "u", "plomberie", 1240],
  ["Meuble vasque 80 cm et mitigeur", "u", "plomberie", 890],
  ["WC suspendu avec bâti-support", "u", "plomberie", 980],
  ["Chauffe-eau solaire 300 L, pose comprise", "u", "plomberie", 3400],
  ["Évier inox double bac sur piétement", "u", "plomberie", 760],
  /* carrelage, faïence */
  ["Faïence murale, pose comprise", "m²", "carrelage", 92],
  ["Carrelage antidérapant R11, pose comprise", "m²", "carrelage", 98],
  ["Carrelage grès cérame intérieur 60 × 60, pose comprise", "m²", "carrelage", 86],
  ["Carrelage de terrasse extérieure, pose comprise", "m²", "carrelage", 104],
  ["Plinthes carrelées", "ml", "carrelage", 18],
  /* plâtrerie, peinture */
  ["Cloison distributive 72/48, deux plaques BA13", "m²", "plâtrerie", 54],
  ["Doublage isolant PSE 100 mm + BA13", "m²", "plâtrerie", 52],
  ["Plafond acoustique en dalles 600 × 600", "m²", "plâtrerie", 46],
  ["Peinture du plafond, deux couches", "m²", "peinture", 24],
  ["Peinture des murs intérieurs, deux couches", "m²", "peinture", 22],
  ["Peinture de façade, nettoyage et deux couches", "m²", "peinture", 34],
  /* électricité */
  ["Prise 16 A encastrée, câblage depuis le tableau", "u", "électricité", 68],
  ["Point lumineux et interrupteur", "u", "électricité", 120],
  ["Luminaire LED étanche IP65", "u", "électricité", 165],
  ["Tableau électrique, remplacement et mise aux normes", "forfait", "électricité", 1650],
  /* menuiserie, serrurerie */
  ["Bloc-porte intérieur, huisserie bois", "u", "menuiserie", 420],
  ["Bloc-porte coupe-feu EI 30, huisserie métallique", "u", "menuiserie", 1460],
  ["Fenêtre aluminium coulissante 120 × 100, pose comprise", "u", "menuiserie", 980],
  ["Volet roulant anticyclonique motorisé", "u", "menuiserie", 1180],
  ["Garde-corps aluminium à barreaudage", "ml", "serrurerie", 260],
  ["Garde-corps verre feuilleté, pinces inox", "ml", "serrurerie", 420],
];

export const BIBLIOTHEQUE_PRIX: PrixBibliotheque[] = DEFS.map(([designation, unite, corps, prix], i) => ({
  ref: `P${String(i + 1).padStart(2, "0")}`,
  designation,
  unite,
  corps,
  prix,
}));

export function prixParRef(ref: string | null): PrixBibliotheque | null {
  return ref ? (BIBLIOTHEQUE_PRIX.find((p) => p.ref === ref) ?? null) : null;
}

/* La dictée d'exemple, lue mot à mot par « Essayer avec un exemple » quand on
   ne peut pas parler (rendez-vous, navigateur sans dictée). Le garde-corps
   en bois exotique n'est pas dans la bibliothèque : il est chiffré quand même. */
export const DICTEE_EXEMPLE =
  "Devis pour Monsieur Lacroix à Petit-Bourg, quartier Carrère. Terrasse à l'arrière de la maison, vingt-deux mètres carrés. On coule une dalle béton de douze, puis carrelage extérieur sur toute la surface. Garde-corps en bois exotique sur huit mètres linéaires, côté jardin. On rajoute deux points lumineux avec interrupteur et une prise étanche. Il voudrait commencer fin novembre.";
