/* ══════════════════════════════════════════════════════════════════════
   /modeles — le catalogue des modèles de sites proposés aux clients
   (03/08/2026 — vague 2 : 7 modèles → 22 ; 06/08/2026 — 22 → 21, AssetX
   retiré pour provenance et licence inconnues, motif détaillé à sa place
   dans la liste)

   Les visuels sont les CAPTURES RÉELLES des templates achetés par Teo,
   prises sur ses déploiements. Depuis la vague 2, on ne capture plus
   seulement l'accueil : le script suit les liens de navigation de chaque
   site et capture aussi ses pages internes (tarifs, à propos, blog,
   contact…). C'est ce que Teo a demandé — montrer qu'un modèle, ce n'est
   pas une page d'accueil, c'est un site complet.

   Capture : Brave headless en CDP, 1440×1080 en ×2, bandeaux de démo
   retirés du DOM avant la prise, réduction à 1200 px et JPEG 82 (36 Mo de
   PNG → 8,8 Mo, sans perte visible à la taille où ces images s'affichent).
   Script réutilisable : `scripts-capture-modeles.mjs` à la racine — on y
   ajoute une URL et on relance.

   ⚠ DEUX ENTRÉES NE SONT PAS DES SITES VITRINES, et sont libellées comme
   telles plutôt que maquillées : Summit est une interface d'application
   (fils de discussion, espace membre) et Material Kit est la page de
   présentation d'une bibliothèque de composants. Elles restent au
   catalogue parce qu'elles répondent à un besoin réel — un espace client,
   un stock de pages toutes faites — mais les vendre comme des vitrines
   serait faux.

   ⚠ TOUS ces templates sont rédigés en anglais et parlent de logiciel. On
   ne peut donc pas les étiqueter « le modèle BTP » : la capture montrerait
   « The AI CRM that closes deals while you sleep » sous une étiquette
   maçonnerie. Ils sont présentés pour ce qu'ils sont — des partis pris de
   design — avec, pour chacun, le type d'entreprise à qui il va bien. Le
   contenu est réécrit en français au métier du client pendant l'audit.
   ══════════════════════════════════════════════════════════════════════ */

export type Modele = {
  /* clé React, ancre, et racine du nom de fichier des captures */
  slug: string;
  /* nom du template tel qu'acheté — sa référence si Teo doit le retrouver */
  nom: string;
  /* le parti pris visuel, en trois mots */
  style: string;
  /* à qui il va bien, en clair */
  pour: string;
  /* ce que la vitrine capte et renvoie aux moteurs */
  capte: string;
  /* démo live — déploiement réel, la carte est cliquable dessus */
  demo: string;
  /* fond posé pendant le chargement de l'image */
  theme: "sombre" | "clair";
  /* suffixes des captures disponibles : "" = accueil, "-2" = page interne…
     Non contigus pour certains modèles : les pages internes identiques à
     l'accueil (sites d'une seule page, dont les liens ne sont que des
     ancres) ont été supprimées après comparaison des empreintes. */
  pages: string[];
  /* posé quand l'entrée n'est pas un site vitrine — affiché sur la carte */
  reserve?: string;
  /* rangement du catalogue — voir CATEGORIES plus bas */
  cat: "chantier" | "rendezvous" | "cabinet" | "produit";
};

export const MODELES: Modele[] = [
  {
    slug: "proactiv",
    cat: "chantier",
    nom: "Proactiv",
    style: "Sombre, frontal, très affirmé",
    pour: "Bâtiment, travaux publics, industrie — peser dès la première page",
    capte: "les demandes de devis, avec la nature du chantier, le délai, et la relance qui suit",
    demo: "https://proactiv-aceternity.vercel.app",
    theme: "sombre",
    pages: ["", "-2", "-3", "-4"],
  },
  {
    slug: "schedule",
    cat: "rendezvous",
    nom: "Schedule",
    style: "Clair, orange, tourné mobile",
    pour: "Après-vente, services, réseaux de points de vente — tout ce qui se réserve",
    capte: "les prises de rendez-vous, les rappels avant séance, les créneaux les plus demandés",
    demo: "https://schedule-template-aceternity.vercel.app/",
    theme: "clair",
    pages: ["", "-2", "-3", "-4"],
  },
  {
    slug: "kinto",
    cat: "rendezvous",
    nom: "Kinto",
    style: "Clair, serif chaleureux, élégant",
    pour: "Hôtellerie, résidences, bien-être, enseignes de standing",
    capte: "les réservations, les demandes de séjour, et ce que la clientèle réclame le plus souvent",
    demo: "https://kinto-nextjs-template.vercel.app/",
    theme: "clair",
    pages: ["", "-2", "-3", "-4"],
  },
  {
    slug: "hive",
    cat: "chantier",
    nom: "Hive",
    style: "Noir profond, titre géant, galerie",
    pour: "Agence, production, événementiel, réception haut de gamme",
    capte: "les demandes de projet, le budget annoncé, et la relance jusqu'à la réponse",
    demo: "https://hive-nextjs-template.vercel.app",
    theme: "sombre",
    pages: ["", "-2"],
  },
  {
    slug: "studio",
    cat: "chantier",
    nom: "Studio",
    style: "Noir et blanc, typo large, très dessiné",
    pour: "Architecture, maîtrise d'œuvre, studio de création",
    capte: "les demandes de projet, avec surface et budget, jusqu'au rendez-vous posé",
    demo: "https://studio.tailwindui.com",
    theme: "clair",
    pages: ["", "-2", "-3", "-4"],
  },
  {
    slug: "originx",
    cat: "chantier",
    nom: "OriginX",
    style: "Gris très clair, corail, volumes 3D",
    pour: "Agence, société de services, direction du développement",
    capte: "les demandes de mission, leur page d'origine, et la relance des devis sans réponse",
    demo: "https://originx.demos.tailgrids.com",
    theme: "clair",
    pages: ["", "-2", "-3", "-4"],
  },
  {
    slug: "sonic",
    cat: "rendezvous",
    nom: "Sonic",
    style: "Clair, épuré, le produit en grand",
    pour: "Distribution, showroom, concession, réseau de magasins",
    capte: "les commandes, les disponibilités demandées, et les références réclamées que vous ne référencez pas",
    demo: "https://sonic-nextjs-template.vercel.app/",
    theme: "clair",
    pages: ["", "-2", "-3", "-4"],
  },
  {
    slug: "fincash",
    cat: "cabinet",
    nom: "Fincash",
    style: "Noir et vert citron, application en scène",
    pour: "Courtage, assurance, gestion de patrimoine, services financiers",
    capte: "les demandes de rendez-vous, les simulations lancées, et celles restées en plan",
    demo: "https://fincash.demos.tailgrids.com",
    theme: "sombre",
    pages: ["", "-2", "-3", "-4"],
  },
  {
    slug: "aspect",
    cat: "cabinet",
    nom: "Aspect",
    style: "Sombre, sobre, chiffres au centre",
    pour: "Comptabilité, conseil, assurance, gestion",
    capte: "les demandes de mission qualifiées, et les rappels programmés sans y penser",
    demo: "https://aspect-nextjs-template.vercel.app/",
    theme: "sombre",
    pages: ["", "-2", "-3", "-4"],
  },
  {
    slug: "flux",
    cat: "cabinet",
    nom: "Flux",
    style: "Clair, premium, matière et relief",
    pour: "Services aux entreprises, conseil, prestation à forte valeur",
    capte: "les prises de contact, les demandes de rappel, et le suivi jusqu'à la réponse",
    demo: "https://flux-nextjs-template.vercel.app/?banner=false",
    theme: "clair",
    pages: ["", "-2", "-3", "-4"],
  },
  {
    slug: "gray",
    cat: "cabinet",
    nom: "Gray",
    style: "Blanc, gris, sobre et premium",
    pour: "Société de conseil, direction qui vend d'abord du sérieux",
    capte: "les demandes de démonstration, le rendez-vous posé, et la relance quand il ne l'est pas",
    demo: "https://preview.cruip.com/gray/",
    theme: "clair",
    pages: ["", "-3", "-4"],
  },
  {
    slug: "streamline",
    cat: "cabinet",
    nom: "Streamline",
    style: "Blanc, minimal, presque nu",
    pour: "Conseil, stratégie, direction — quand le texte doit primer",
    capte: "les prises de contact, les demandes d'information, et ce qui a été lu juste avant",
    demo: "https://streamline-nextjs-template.vercel.app",
    theme: "clair",
    pages: ["", "-2", "-3", "-4"],
  },
  {
    slug: "folio",
    cat: "chantier",
    nom: "Folio",
    style: "Sombre, dense, technique",
    pour: "Bureau d'études, ingénierie, industrie",
    capte: "les demandes d'étude et de chiffrage, pièce jointe et délai compris",
    demo: "https://folio-topaz-delta.vercel.app/",
    theme: "sombre",
    pages: ["", "-2", "-3", "-4"],
  },
  /* 06/08/2026 — AssetX RETIRÉ du catalogue. Toutes les autres démos du
     catalogue sont celles de leur éditeur (Cruip pour Flux et Gray, Magic UI
     pour Sage, KokonutUI Pro pour Postly, ruixen.ui pour Folio, shadcnblocks,
     TailGrids, Tailwind Plus, Aceternity, KeenThemes, Creative Tim). Celle
     d'AssetX — assetx-ivory.vercel.app — ne porte aucune attribution
     d'éditeur et n'a pu être rattachée à aucun catalogue : ni 21st.dev (ses
     48 modèles ont été comparés un à un sur l'URL de démo), ni la recherche
     sur le texte du gabarit. Provenance inconnue veut dire licence inconnue,
     et les licences lues ce jour-là (Tailwind Plus, shadcnblocks) interdisent
     toutes de « redistribuer le composant en dehors d'un End Product » — ce
     qu'est exactement une copie nue publiée sans contenu client.
     Pour le remettre : rétablir ce bloc, remettre "assetx" à la place de
     "sage" dans MUR, et repasser les compteurs de /modeles à vingt-deux. Les
     captures sont toujours dans public/. Voir OMEGA/commercial/
     grille-prix-sites.md §4. */
  {
    slug: "synthai",
    cat: "produit",
    nom: "SynthAI",
    style: "Clair, sobre, structure complète",
    pour: "Éditeur, société de services, prestataire technique",
    capte: "les demandes de devis, leur page d'origine, et la relance jusqu'à la signature",
    demo: "https://synthai.demos.tailgrids.com",
    theme: "clair",
    pages: ["", "-2", "-3", "-4"],
  },
  {
    slug: "saasspace",
    cat: "produit",
    nom: "SaaSSpace",
    style: "Clair, carré, très lisible",
    pour: "Éditeur, plateforme, groupe à plusieurs offres",
    capte: "les inscriptions, les demandes d'essai, et les offres regardées avant de choisir",
    demo: "https://saasspace.demos.tailgrids.com",
    theme: "clair",
    pages: ["", "-2", "-3", "-4"],
  },
  {
    slug: "aispace",
    cat: "produit",
    nom: "AISpace",
    style: "Clair, bleu franc, orienté produit",
    pour: "Services numériques, informatique, intégration",
    capte: "les demandes de mission, leur origine, et les rappels programmés",
    demo: "https://aispace.demos.tailgrids.com",
    theme: "clair",
    pages: ["", "-2", "-3", "-4"],
  },
  {
    slug: "appspace",
    cat: "rendezvous",
    nom: "AppSpace",
    style: "Clair, bleu, application mobile en scène",
    pour: "Service à la demande, livraison, réservation, application",
    capte: "les inscriptions, les demandes de rappel, et les créneaux les plus pris",
    demo: "https://appspace.demos.tailgrids.com",
    theme: "clair",
    pages: ["", "-3", "-4"],
  },
  {
    slug: "template07",
    cat: "produit",
    nom: "Postly",
    style: "Noir, bleu électrique, produit en scène",
    pour: "Communication, marque, agence social media",
    capte: "les demandes de devis, leur origine, et la relance des propositions sans réponse",
    demo: "https://template-07-saas.vercel.app",
    theme: "sombre",
    pages: ["", "-2", "-3", "-4"],
  },
  {
    slug: "sage",
    cat: "produit",
    nom: "Sage",
    style: "Noir, page unique, droit au but",
    pour: "Lancement d'offre, campagne, opération ponctuelle",
    capte: "les inscriptions, les demandes d'accès, et le rendement de chaque campagne",
    demo: "https://startup-template-sage.vercel.app",
    theme: "sombre",
    pages: ["", "-2", "-3"],
  },
  {
    slug: "summit",
    cat: "produit",
    nom: "Summit",
    style: "Interface claire, colonnes, fils de discussion",
    pour: "Espace membre, extranet client, plateforme d'échange",
    capte: "les comptes, les fils de discussion, et les demandes déposées par vos clients",
    demo: "https://summit-nextjs.keenthemes.com",
    theme: "clair",
    pages: [""],
    reserve: "Interface d'application, pas un site vitrine",
  },
  {
    slug: "materialkit",
    cat: "produit",
    nom: "Material Kit",
    style: "Bibliothèque de blocs et de pages",
    pour: "Quand il faut beaucoup de pages — 41 gabarits déjà dessinés",
    capte: "selon les pages retenues",
    demo: "https://demos.creative-tim.com/material-kit-pro-react/#/presentation",
    theme: "sombre",
    pages: ["", "-3", "-4"],
    reserve: "Bibliothèque de composants, pas un site prêt à poser",
  },
];

/* chemin d'une capture — les fichiers vivent dans public/modeles/ */
export const capture = (m: Modele, i = 0) => `/modeles/${m.slug}${m.pages[i] ?? ""}.jpg`;

/* ——— rangement du catalogue (03/08, Teo : « range les design et site par
   catégorie […] tu mets 3 et un bouton voir plus ») ———

   Vingt-deux cartes d'affilée, c'est un mur qu'on scrolle sans jamais
   choisir. Rangées par USAGE, on lit trois exemples par famille et on
   déplie seulement celle qui nous concerne.

   Le classement se fait sur ce que le site doit FAIRE, jamais sur le
   métier : ces templates sont génériques, un même design sert un maçon et
   un architecte. « Vous montrez ce que vous réalisez » est vrai pour les
   deux ; « modèle BTP » ne l'aurait été pour aucun. */
export const CATEGORIES = [
  {
    cle: "chantier" as const,
    titre: "Vous montrez ce que vous réalisez",
    pour: "Bâtiment, ingénierie, industrie, création : le travail se voit, donc il se prouve en images.",
  },
  {
    cle: "rendezvous" as const,
    titre: "Vos clients réservent",
    pour: "Réseaux, concessions, après-vente : un créneau, une visite, une commande.",
  },
  {
    cle: "cabinet" as const,
    titre: "Vous vendez votre expertise",
    pour: "Conseil, finance, assurance, comptabilité : c'est le sérieux qui décide, pas la photo.",
  },
  {
    cle: "produit" as const,
    titre: "Vous vendez un service en ligne",
    pour: "Plateforme, espace client, extranet, et les catalogues fournis en pages toutes faites.",
  },
];

export const parCategorie = (cle: Modele["cat"]) => MODELES.filter((m) => m.cat === cle);

/* ——— composition du collage du hero ———
   Six colonnes de deux : douze vignettes prises parmi les vingt et un,
   choisies pour que le mur alterne sombre et clair et qu'aucune colonne ne
   soit monochrome. Ce ne sont que des accueils — les pages internes n'ont
   rien à faire dans un collage, elles se ressemblent trop d'un site à
   l'autre pour donner de la variété.

   06/08 — « sage » remplace « assetx », retiré du catalogue. Même thème
   sombre, donc la colonne 2 reste mixte face à « flux » qui est clair. */
export const MUR: string[][] = [
  ["proactiv", "kinto"],
  ["flux", "sage"],
  ["hive", "sonic"],
  ["originx", "fincash"],
  ["studio", "aspect"],
  ["gray", "template07"],
];

export const parSlug = (slug: string) => MODELES.find((m) => m.slug === slug)!;
