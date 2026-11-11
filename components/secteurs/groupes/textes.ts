import { LIEN_AUDIT } from "@/components/espace2/portail";

/* ══════════════════════════════════════════════════════════════════════
   Varelo — les textes de /secteurs/groupes, v4 (11/11/2026)

   Un emplacement par emplacement de la référence (payload-marketing-v1
   .21st.app), au même budget de signes. Le dessin de la page (v3 du
   25/09, décalque 1:1 de la référence passé en blanc) ne bouge pas ;
   tous les textes sont neufs.

   11/11/2026 — brief varelo-v3 (docs/briefs-saas/varelo-v3.md). Teo : « je
   ne veux pas que tu te bases sur ce qu'on propose ; dis-moi ce qu'eux
   font aux US et qu'on reproduise la même chose ». Le produit reproduit le
   modèle de Palantir Foundry à l'échelle d'une ETI française : LE PLAN DU
   GROUPE (leur ontologie : une fiche par société, client, fournisseur,
   contrat, site, salarié, article, et les liens entre fiches), rempli en
   lecture seule depuis les logiciels en place, LES ACTIONS possibles sur
   chaque fiche (leurs action types, avec qui peut, ce que ça change, le
   journal), LES AGENTS qui lisent le plan et PROPOSENT une action qu'une
   personne valide (leur proposal pattern), et la vente en TROIS JOURS sur
   les vraies données (leur bootcamp), facturée par cas d'usage. La marque
   Palantir n'est jamais citée sur la page : on décrit le modèle.

   Règles maison tenues ici :
   • aucun groupe nommé, aucun gain en %, aucun prix, aucun chiffre ;
   • pas de témoignage : des SITUATIONS TYPES, sans personne ;
   • les écrans sont des données d'exemple, et la légende le dit ;
   • jamais prix, marges ni « vie chère », ni IA qui répond aux clients,
     ni tri des candidatures (les mines du positionnement) ;
   • aucune écriture dans les logiciels sources, aucun agent qui agit
     sans validation : c'est écrit tel quel.

   Les écrans (`ecran`) : deux vraies captures de /espace2/varelo (thème
   clair, données d'exemple) et les écrans peints en HTML dans
   outils/ecrans-varelo/. Leurs rapports largeur/hauteur sont ceux des
   images de la référence, un pour un. Les mêmes images servent : ce
   qu'elles montrent (le groupe, le référentiel, les contrats, les
   réserves, les reportings, la lecture seule, la validation, l'Europe)
   est exactement ce que le plan et ses agents vendent.
   ══════════════════════════════════════════════════════════════════════ */

export const AUDIT = LIEN_AUDIT;
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
  titre: "Le plan du groupe, et ses agents.",
  chapo:
    "Varelo dessine le plan de votre groupe : une fiche par société, par client, par fournisseur, par contrat, par site, et les liens entre elles. Le plan se remplit tout seul, en lecture seule, depuis les logiciels, les tableurs et les dossiers de chaque société. Des agents le lisent en continu et proposent une action ; la personne responsable décide. En trois jours sur vos vraies données, un premier cas d'usage tourne.",
  bouton: "Réserver un audit",
  legende:
    "Le plan d'un groupe et ses sociétés, sur des données d'exemple.",
  /* leur 3.0-homepage-live-preview-hero.png (3200 × 1915) et config.webp
     (3200 × 1973) ; deux vraies captures de /espace2/varelo (thème clair,
     données d'exemple, 2880 × 1800) */
  ecrans: [
    {
      src: "/secteurs-groupes/ecrans/dashboard-groupe.png",
      l: 2880,
      h: 1800,
      alt: "La vue d'ensemble de Varelo : le groupe sur une page, société par société, avec les propositions des agents pour chaque direction.",
    },
    {
      src: "/secteurs-groupes/ecrans/dashboard-referentiel.png",
      l: 2880,
      h: 1800,
      alt: "Le plan du groupe dans Varelo : les codes de chaque société rangés sous une seule fiche de client, de fournisseur ou d'article.",
    },
  ] as const,
};

/* ── 1 bis. le constat ──────────────────────────────────────────────────
   Un bloc `statement` sans écran, entre le héros et l'énoncé : le
   problème que le plan règle, dit comme une situation, jamais comme un
   reproche fait au lecteur. Aucun chiffre : la doctrine des textes
   n'en admet aucun sans source datée, et le constat n'en a pas besoin. */
export const ENONCE_0 = {
  titre: "Le même client porte trois noms dans trois sociétés.",
  paragraphes: [
    "Dans un groupe, chaque société a ses logiciels, ses tableurs et ses propres noms pour les mêmes choses. Le client de la première s'appelle autrement dans la deuxième ; le fournisseur de la troisième a un autre code dans la quatrième.",
    "Alors une question simple, « combien ce client nous doit-il dans tout le groupe », demande une semaine, trois exports et un tableur. Et une règle qui existe ici, un préavis de contrat, un délai de réserve, n'existe pas là.",
    "Les logiciels en place ne le régleront pas : chacun tient sa société. Il manque le plan d'ensemble, celui qui relie les fiches des quarante sociétés et les regarde comme un seul groupe.",
  ],
};

/* ── 2. énoncé 1 (leur « Code-first for developers. ») ─────────────── */
export const ENONCE_1 = {
  titre: "Le plan, les sources,\nles actions, les agents.",
  /* les quatre pièces du produit, dans l'ordre où la DSI les vérifie */
  paragraphes: [
    "Le plan d'abord. Une fiche par société, par client, par fournisseur, par contrat, par site, par salarié, par article, avec ses faits et ses liens : ce client appartient à cette société, ce contrat lie ce fournisseur à ces trois sociétés. Les codes de chaque logiciel sont rattachés à la fiche. Quand deux codes désignent la même chose, Varelo propose de les réunir, et une personne confirme.",
    "Les sources ensuite. Chaque logiciel de gestion, chaque caisse, chaque tableur, chaque dossier est branché en lecture seule, avec ce qui est lu, par qui et depuis quand. Personne ne ressaisit rien, et rien n'est jamais écrit dans vos logiciels. Puis les actions : sur une fiche de contrat, on peut le dénoncer ; sur une livraison, émettre une réserve ; sur un client, relancer. Chaque action dit qui a le droit, ce qu'elle change, et s'inscrit au journal.",
    "Les agents enfin. Ils lisent le plan en continu et proposent une action, avec la fiche, le calcul et la pièce : la lettre de dénonciation prête, la réserve rédigée, la relance préparée. La personne responsable accepte, corrige ou refuse. Un agent ne fait jamais rien seul.",
  ],
  /* la vraie page Référentiel de Varelo (/espace2/varelo/referentiel) : c'est le plan */
  ecran: {
    src: "/secteurs-groupes/ecrans/dashboard-referentiel.png",
    l: 2880,
    h: 1800,
    alt: "Le plan du groupe : les codes de chaque société rangés sous une seule fiche de client, de fournisseur ou d'article, avec les rapprochements proposés et validés.",
  },
};

/* ── 3. survol (leur hoverHighlights) ──────────────────────────────── */
export const SURVOL = {
  avant: "Quatre cas d'usage, prêts à tourner en trois jours :",
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
        "Les fiches de société réunies sur une page : ventes, trésorerie et écarts de chaque société, chaque chiffre rattaché au chiffre de la société d'où il vient.",
      ),
      dessus: null,
    },
    {
      texte: "Les contrats à dénoncer",
      bas: E(
        "survol-contrats",
        1800,
        1586,
        "Les fiches de contrat à reconduction tacite du groupe, chacune avec sa date limite de dénonciation calculée par l'agent.",
      ),
      dessus: E(
        "survol-contrats-fiche",
        1800,
        1586,
        "La fiche d'un contrat : société, échéance, préavis, date limite, et la lettre de dénonciation proposée.",
      ),
    },
    {
      texte: "Les réserves à émettre",
      bas: E(
        "survol-reserves",
        1800,
        1500,
        "La fiche d'une livraison reçue avec avarie : le transport, les colis et les photos du constat.",
      ),
      dessus: E(
        "survol-reserves-delai",
        1800,
        1518,
        "Le compte à rebours de l'agent : trois jours pour adresser la réserve au transporteur, la réserve rédigée en attente de validation.",
      ),
    },
    {
      texte: "Les reportings dus",
      bas: E(
        "survol-reportings",
        1800,
        1440,
        "Ce que chaque société doit à ses marques, ses banques et ses réseaux, rangé par échéance, avec la pièce.",
      ),
      dessus: null,
    },
  ],
};

/* ── 4. carrousel (leur slider de témoignages) ─────────────────────── */
export const CARROUSEL = {
  titre: "Huit situations types",
  etiquette: "Situation type",
  lien: "En parler",
  /* chaque carte : la situation, qui la vit (leur « author ») et, en gris,
     ce que le plan et ses agents lui apportent (leur « role ») */
  cartes: [
    {
      citation:
        "Le même client porte trois noms dans trois sociétés, et personne ne sait ce qu'il nous doit en tout.",
      role: "Direction financière",
      liste: "Une seule fiche, tous les codes",
    },
    {
      citation:
        "Chaque société envoie son reporting à sa façon, et le chiffre du groupe arrive avec un mois de retard.",
      role: "Présidence du groupe",
      liste: "Le groupe sur une page",
    },
    {
      citation:
        "Le contrat se renouvelle seul si personne ne le dénonce, et sa date est dans un tableur que personne n'ouvre.",
      role: "Direction juridique",
      liste: "L'agent compte le préavis, la lettre est prête",
    },
    {
      citation:
        "Sans réserve envoyée au transporteur sous trois jours, l'avarie devient une perte.",
      role: "Direction des opérations",
      liste: "L'agent rédige la réserve, vous validez",
    },
    {
      citation:
        "Les équipes ont pris chacune leur assistant d'IA, et aucun ne connaît les sociétés du groupe.",
      role: "Direction des systèmes d'information",
      liste: "Un plan que vos assistants peuvent lire",
    },
    {
      citation:
        "Le préavis se compte à trois mois dans une société et à six dans l'autre, et personne ne sait qui a décidé quoi.",
      role: "Direction générale",
      liste: "Une action, une règle, un journal",
    },
    {
      citation:
        "On nous a déjà vendu une plateforme de données : six mois de projet, et rien que la direction puisse utiliser.",
      role: "Direction générale",
      liste: "Trois jours, un cas d'usage qui tourne",
    },
    {
      citation:
        "Je ne veux pas qu'un outil écrive dans nos logiciels ni qu'une IA décide à la place de mes directeurs.",
      role: "Direction des systèmes d'information",
      liste: "Lecture seule, et une personne décide",
    },
  ],
};

/* ── 5. accordéon (leur mediaContentAccordion) ─────────────────────── */
export const ACCORDEON = {
  /* les quatre garanties parlent à la DSI : c'est elle qui branche les
     sources et qui règle ce que chaque agent a le droit de proposer. Les
     engagements repris ici sont ceux de /vos-donnees (hébergement en
     Europe ou chez le client, chiffrement, journal, aucun entraînement). */
  titre: "La DSI tient le plan",
  /* rapports de la référence : folder-structure 2291 × 1442 ;
     visual-editing 2400 × 1275 ; vectordatabase 3200 × 1644 ;
     Define-schema 2400 × 1600 */
  elements: [
    {
      titre: "Lecture seule",
      texte:
        "Varelo lit vos logiciels de gestion, vos caisses, vos tableurs et vos dossiers sans jamais rien y écrire. Chaque source se branche avec l'accord de la DSI, avec la liste de ce qui est lu, et se débranche de la même façon.",
      lien: { texte: "Où vivent vos données", href: DONNEES },
      ecran: E(
        "systemes-lecture-seule",
        2292,
        1442,
        "Les sources d'une société branchées en lecture seule : logiciel de gestion, caisses, tableurs et documents, avec ce qui est lu.",
      ),
    },
    {
      titre: "Un seul plan",
      texte:
        "Chaque client, fournisseur, contrat ou article a une seule fiche pour tout le groupe, rattachée aux codes de chaque société. Chaque rapprochement est proposé, puis validé ou refusé par une personne, à une date, et reste réversible. Vos assistants d'IA, quels qu'ils soient, peuvent lire le plan sans le modifier.",
      lien: { texte: "En parler", href: AUDIT },
      ecran: E(
        "systemes-referentiel",
        2400,
        1274,
        "Un même client inscrit sous trois noms dans trois sociétés, réuni sous une seule fiche avec son encours total.",
      ),
    },
    {
      titre: "L'agent propose, vous décidez",
      texte:
        "Chaque action possible sur une fiche dit qui a le droit de la faire et ce qu'elle change. Un agent la propose avec la fiche, le calcul et la pièce ; la direction concernée accepte, corrige ou refuse ; le journal garde qui a décidé quoi. Aucun agent n'agit seul.",
      lien: { texte: "En parler", href: AUDIT },
      ecran: E(
        "systemes-validation",
        3200,
        1644,
        "Une action proposée par un agent à la direction juridique, avec son calcul et sa pièce, en attente de sa décision.",
      ),
    },
    {
      titre: "Données en Europe",
      texte:
        "Le plan et ses sources restent dans l'Union européenne ou sur vos propres serveurs, chiffrés, et chaque lecture est inscrite au journal. Aucune donnée du groupe ne sert à entraîner un modèle.",
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
  titre: "Trois jours, un cas d'usage, puis le groupe.",
  paragraphes: [
    "Nous ne vendons pas une démonstration. Un ingénieur d'Omega vient trois jours chez vous, sur un pôle de trois ou quatre sociétés. Le premier jour, les sources sont branchées et le plan se remplit. Le deuxième, votre direction valide les rapprochements et choisit son cas d'usage. Le troisième soir, il tourne sur vos vraies données, et l'on compte ensemble ce qui est juste.",
    "Le pilote se juge ensuite sur un trimestre complet, avec ses clôtures et ses échéances réelles. Chaque cas d'usage suivant se vend quand le précédent a prouvé, et chaque société suivante rejoint le même plan, avec ses fiches, ses règles et ses agents déjà validés.",
    "Le prix se compte par cas d'usage, jamais par siège : la présidence, les directions et la DSI sont toutes dedans.",
  ],
  boutons: [
    { texte: "Réserver un audit", href: AUDIT },
    { texte: "Où vivent vos données", href: DONNEES },
  ],
};
