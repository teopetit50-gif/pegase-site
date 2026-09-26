/* ══════════════════════════════════════════════════════════════════════
   Varelo — les textes de /secteurs/groupes, v3 (25/09/2026)

   Un emplacement par emplacement de la référence (payload-marketing-v1
   .21st.app), au même budget de signes. Le positionnement et les textes
   viennent de la session « Namolu branding et positionnement » (25/09) :
   Varelo est le point du matin de TOUT un groupe à plusieurs sociétés —
   une quarantaine de sociétés, six pôles, cinq territoires.

   Règles maison tenues ici :
   • aucun groupe nommé, aucun gain en %, aucun prix ;
   • pas de témoignage : leurs « Editable demo testimonial » signés
     « Example person » deviennent des SITUATIONS TYPES, sans personne ;
   • les écrans sont des données d'exemple, et la légende le dit ;
   • jamais prix, marges ni « vie chère », ni IA qui répond aux clients,
     ni tri des candidatures (les mines du positionnement).

   Les écrans (`ecran`) sont fabriqués en HTML sur des données d'exemple
   puis photographiés : outils/ecrans-varelo/. Leurs rapports
   largeur/hauteur sont ceux des images de la référence, un pour un.
   ══════════════════════════════════════════════════════════════════════ */

export const AUDIT = "/reserver-un-audit";
export const DONNEES = "/vos-donnees";
export const COURRIEL = "contact@omegaai.fr";

/** Un écran photographié : chemin, dimensions du fichier, texte de
 *  remplacement. Les dimensions servent à next/image (aucun saut de mise
 *  en page) ; ce sont celles des images de la référence. */
export type Ecran = { src: string; l: number; h: number; alt: string };

const E = (nom: string, l: number, h: number, alt: string): Ecran => ({
  src: `/secteurs-groupes/ecrans/${nom}.webp`,
  l,
  h,
  alt,
});

/* ── 1. héros ──────────────────────────────────────────────────────── */
export const HEROS = {
  titre: "Chaque société tient ses chiffres à part.",
  chapo:
    "Varelo les réunit chaque matin et dit à chaque direction du groupe ce qu'elle doit décider.",
  bouton: "Réserver un audit",
  legende:
    "Le point du matin d'une direction financière, sur des données d'exemple.",
  /* leur 3.0-homepage-live-preview-hero.png (3200 × 1915) et config.webp
     (3200 × 1973) */
  ecrans: [
    E(
      "heros-point-du-matin",
      3200,
      1914,
      "Le point du matin d'une direction financière : trois décisions à valider, chacune avec son calcul, et la facture de la première rapprochée de son bon de livraison.",
    ),
    E(
      "heros-referentiel",
      3200,
      1972,
      "Le référentiel du groupe : les codes de chaque société rangés sous un seul nom de client, de fournisseur ou d'article.",
    ),
  ] as const,
};

/* ── 2. énoncé 1 (leur « Code-first for developers. ») ─────────────── */
export const ENONCE_1 = {
  titre: "Une page pour la présidence.\nUne liste par direction.",
  /* leur 3.0-collage-3.webp (2880 × 1940), posé en pleine largeur */
  ecran: E(
    "collage",
    2880,
    1940,
    "Un assemblage d'écrans de Varelo : les sociétés d'un pôle, les clients du groupe, une règle de calcul, les pièces, le point du matin d'une direction et ses commentaires.",
  ),
};

/* ── 3. survol (leur hoverHighlights) ──────────────────────────────── */
export const SURVOL = {
  avant: "Chaque matin à 7 h, chaque direction reçoit :",
  lien: "En parler",
  bouton: "Réserver un audit",
  /* bas = l'image dans le flux ; dessus = la vignette posée par-dessus
     (leur `media.top`), au même cadre. Rapports de la référence :
     hh-cms 1800 × 1440 ; hh-ecom 1800 × 1587 (les deux) ; hh-etb
     1800 × 1500 dessous, 1800 × 1518 dessus ; hh-dam 1800 × 1440. */
  entrees: [
    {
      texte: "Le groupe sur une page",
      bas: E(
        "survol-groupe",
        1800,
        1440,
        "La page du groupe : ventes, trésorerie et écarts de chaque société, sur une seule page.",
      ),
      dessus: null,
    },
    {
      texte: "Les contrats à dénoncer",
      bas: E(
        "survol-contrats",
        1800,
        1586,
        "Les contrats du groupe à reconduction tacite, chacun avec sa date limite de dénonciation.",
      ),
      dessus: E(
        "survol-contrats-fiche",
        1800,
        1586,
        "La fiche d'un contrat : société, échéance, préavis et date limite pour le dénoncer.",
      ),
    },
    {
      texte: "Les réserves à émettre",
      bas: E(
        "survol-reserves",
        1800,
        1500,
        "Une livraison reçue avec avarie : le transport, les colis et les photos du constat.",
      ),
      dessus: E(
        "survol-reserves-delai",
        1800,
        1518,
        "Le compte à rebours de la réserve : trois jours pour l'adresser au transporteur.",
      ),
    },
    {
      texte: "Les reportings dus",
      bas: E(
        "survol-reportings",
        1800,
        1440,
        "Les reportings attendus par chaque marque, rangés par échéance.",
      ),
      dessus: null,
    },
  ],
};

/* ── 4. carrousel (leur slider de témoignages) ─────────────────────── */
export const CARROUSEL = {
  titre: "Quatre situations types",
  etiquette: "Situation type",
  lien: "En parler",
  /* chaque carte : la situation, qui la vit (leur « author ») et, en gris,
     ce que Varelo lui envoie (leur « role ») */
  cartes: [
    {
      citation:
        "Chaque société envoie son reporting à sa façon, et le chiffre du groupe arrive en retard.",
      role: "Présidence du groupe",
      liste: "Le groupe sur une page",
    },
    {
      citation:
        "Le contrat se renouvelle seul si personne ne le dénonce, et sa date est ailleurs.",
      role: "Direction juridique",
      liste: "Les contrats à dénoncer",
    },
    {
      citation:
        "Sans réserve envoyée au transporteur sous trois jours, l'avarie devient une perte.",
      role: "Direction des opérations",
      liste: "Les réserves à émettre",
    },
    {
      citation:
        "Le même client porte trois noms dans trois sociétés, et personne ne voit son encours.",
      role: "Direction financière",
      liste: "Un seul référentiel",
    },
  ],
};

/* ── 5. accordéon (leur mediaContentAccordion) ─────────────────────── */
export const ACCORDEON = {
  titre: "Vos systèmes restent à vous",
  /* rapports de la référence : folder-structure 2291 × 1442 ;
     visual-editing 2400 × 1275 ; vectordatabase 3200 × 1644 ;
     Define-schema 2400 × 1600 */
  elements: [
    {
      titre: "Lecture seule",
      texte: "Varelo lit vos logiciels et vos tableurs sans jamais rien y écrire.",
      lien: { texte: "Où vivent vos données", href: DONNEES },
      ecran: E(
        "systemes-lecture-seule",
        2292,
        1442,
        "Les sources d'une société branchées en lecture seule : logiciel de gestion, caisses, tableurs et documents.",
      ),
    },
    {
      titre: "Un seul référentiel",
      texte:
        "Chaque client, fournisseur ou article porte le même nom dans tout le groupe.",
      lien: { texte: "En parler", href: AUDIT },
      ecran: E(
        "systemes-referentiel",
        2400,
        1274,
        "Un même client inscrit sous trois noms dans trois sociétés, rangé sous un seul nom avec son encours total.",
      ),
    },
    {
      titre: "Validation humaine",
      texte:
        "Rien ne part sans l'accord de la direction concernée, décision par décision.",
      lien: { texte: "En parler", href: AUDIT },
      ecran: E(
        "systemes-validation",
        3200,
        1644,
        "Une décision proposée à la direction juridique, avec son calcul, en attente de sa validation.",
      ),
    },
    {
      titre: "Données en Europe",
      texte:
        "Les données restent dans l'Union européenne, chiffrées, avec un journal.",
      lien: { texte: "Où vivent vos données", href: DONNEES },
      ecran: E(
        "systemes-europe",
        2400,
        1600,
        "Les réglages d'hébergement et le journal : données dans l'Union européenne, chiffrées, chaque lecture tracée.",
      ),
    },
  ],
};

/* ── 6. énoncé 2 (leur « We're building a better way. ») ───────────── */
export const ENONCE_2 = {
  titre: "Un pôle, puis le groupe.",
  paragraphes: [
    "Nous commençons par un pôle, une société et une direction. Le pilote se juge sur un trimestre complet, avec ses clôtures, ses échéances et ses chiffres réels.",
    "Puis le groupe entier suit.",
    "Chaque société suivante reprend le même référentiel et les mêmes règles : un processus validé une fois se déploie dans les autres, d'un territoire à l'autre.",
  ],
  boutons: [
    { texte: "Réserver un audit", href: AUDIT },
    { texte: "Où vivent vos données", href: DONNEES },
  ],
};
