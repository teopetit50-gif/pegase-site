/* ══════════════════════════════════════════════════════════════════════
   /secteurs — les douze métiers, et ce que les quatre systèmes y font

   SOURCE DU CONTENU : `OMEGA/plans-et-decisions/galeres-metier-par-secteur.md`
   (04/08/2026, 26 familles de métiers passées en revue). Chaque entrée
   ci-dessous porte en commentaire le paragraphe dont elle sort. Rien n'est
   inventé ici : la galère est celle du document, reformulée.

   ── LA RÈGLE QUI A ÉCRIT CETTE PAGE ────────────────────────────────────
   Une page sectorielle multiplie les affirmations par douze. Chaque ligne
   `cherche` ne dit donc QUE ce que les quatre systèmes font AUJOURD'HUI,
   c'est-à-dire ce que les fichiers `lib/produits/capacites/*.ts` marquent
   `atteste: true`. Ce filtre a changé la moitié des brouillons :

   · RELOAD ne tient PAS encore les échéances (entretien, révision,
     renouvellement optique) : tout le groupe « Échéances et
     renouvellements » de `capacites/reprise.ts` est `atteste: false`.
     Les garages et les opticiens sont donc écrits sur le COMPTE DORMANT,
     qui, lui, est construit — pas sur le calendrier d'échéances.
   · FRONTD travaille sur l'ÉCRIT : messagerie et formulaire du site.
     « Un appel non décroché est transcrit » est `atteste: false`. Aucune
     entrée ne promet donc de décrocher un téléphone — ce qui a fait sortir
     de la liste la pharmacie, les cabinets de santé et le dépannage
     d'urgence, dont toute la douleur est vocale. Ils sont nommés dans la
     section « sur mesure », qui dit pourquoi.
   · FILED ne compare PAS encore les prix d'une facture à l'autre
     (`atteste: false`) : la restauration est écrite sur la pile de pièces
     à classer, pas sur la dérive des tarifs fournisseurs.

   Si une capacité passe à `atteste: true`, c'est ici qu'on vient élargir
   la phrase — pas l'inverse.

   ── AUCUN CHIFFRE ──────────────────────────────────────────────────────
   Le document source porte des chiffres sectoriels, dont certains marqués
   【V】 : « hypothèses de travail non citables en clientèle ». Plutôt que
   de trier au cas par cas sur une page publique, aucune entrée ne porte de
   chiffre. Le mécanisme se raconte sans lui, et il n'engage rien.
   ══════════════════════════════════════════════════════════════════════ */

export type CleSysteme = "frontd" | "reload" | "cashd" | "filed";

export type Systeme = {
  cle: CleSysteme;
  nom: string;
  href: string;
  /* ce que le système fait, en une ligne — repris de lib/menu.ts */
  court: string;
};

export const SYSTEMES: Record<CleSysteme, Systeme> = {
  frontd: {
    cle: "frontd",
    nom: "FRONTD",
    href: "/offres/demandes-clients",
    court: "Chaque demande entrante qualifiée et traitée, à toute heure.",
  },
  reload: {
    cle: "reload",
    nom: "RELOAD",
    href: "/offres/nouvelles-affaires",
    court: "Les comptes qui n’ont plus commandé, remis dans le circuit.",
  },
  cashd: {
    cle: "cashd",
    nom: "CASHD",
    href: "/offres/relances-impayes",
    court: "Les échéances suivies, les relances préparées selon vos règles.",
  },
  filed: {
    cle: "filed",
    nom: "FILED",
    href: "/offres/factures-fournisseurs",
    court: "Les pièces fournisseurs lues, contrôlées, transmises à la comptabilité.",
  },
};

export type IconeMetier =
  | "atelier"
  | "chantier"
  | "negoce"
  | "transport"
  | "table"
  | "cabinet"
  | "immeuble"
  | "formation"
  | "optique"
  | "traiteur"
  | "concession"
  | "sav";

export type Metier = {
  /* identifiant d'onglet et ancre — pas une route */
  cle: string;
  /* l'intitulé court, celui de la tuile */
  nom: string;
  /* l'intitulé long, celui du panneau */
  complet: string;
  icone: IconeMetier;
  /* ce qui échappe au professionnel, dans ses mots */
  echappe: string;
  /* ce que les systèmes vont chercher — uniquement du construit */
  cherche: string;
  /* ce qui ne bouge pas de chez lui : le bloc qui rend les deux autres
     croyables. Ne pas le retirer en croyant alléger. */
  reste: string;
  systemes: CleSysteme[];
};

export const METIERS: Metier[] = [
  {
    /* §5 — l'attente de pièces, « un problème de communication déguisé en
       problème de logistique ». La partie « suivi de la pièce » n'est pas
       construite : l'entrée se tient sur le compte dormant. */
    cle: "garages",
    nom: "Garages et ateliers",
    complet: "Garages, ateliers et réparation",
    icone: "atelier",
    echappe:
      "Un client dont la dernière intervention remonte à deux ans n’est pas perdu : il est passé ailleurs un jour où personne ne l’a rappelé, et il y est resté.",
    cherche:
      "Les comptes dont le dernier passage dépasse le délai que vous fixez, repris un par un dans un message qui cite leur dernière intervention et le temps écoulé.",
    reste:
      "Le planning d’atelier, le stock de pièces et les ordres de réparation ne quittent pas votre outil de gestion.",
    systemes: ["reload", "cashd"],
  },
  {
    /* §6 — 8 à 12 h par semaine hors chantier, et la coordination. Ce qui
       est construit ici, c'est le devis sans réponse et la facture échue. */
    cle: "batiment",
    nom: "Bâtiment et artisans",
    complet: "Bâtiment, travaux et artisanat",
    icone: "chantier",
    echappe:
      "Les devis partent le soir et personne n’y revient. Les factures de fin de chantier attendent, parce que relancer un client avec qui ça s’est bien passé est le coup de fil qu’on repousse.",
    cherche:
      "Chaque devis sans réponse relancé au troisième jour, chaque facture échue suivie sur trois paliers, et la mise en demeure préparée mais jamais envoyée sans votre accord.",
    reste:
      "La conduite de chantier, les plans et la coordination des équipes sur place ne nous regardent pas.",
    systemes: ["cashd", "reload"],
  },
  {
    /* §12 — le taux de service et le compte qui s'éteint sans bruit. */
    cle: "negoce",
    nom: "Négoce et commerce de gros",
    complet: "Négoce, distribution et commerce de gros",
    icone: "negoce",
    echappe:
      "Un compte espace ses commandes, puis il s’arrête. Personne ne l’a vu, parce qu’un client qui commande moins ne fait pas de bruit — contrairement à celui qui réclame.",
    cherche:
      "Votre historique de facturation croisé avec votre référentiel clients, les comptes classés par date de dernier contact, et deux messages au plus, espacés, depuis votre boîte.",
    reste:
      "Le stock, les tarifs, les conditions et la préparation de commande restent dans votre ERP.",
    systemes: ["reload", "cashd"],
  },
  {
    /* §9 et motif 2 — la course qui glisse, et le silence qui l'accompagne.
       Le canal traité est celui de l'écrit : FRONTD ne décroche pas. */
    cle: "transport",
    nom: "Transport et logistique",
    complet: "Transport, livraison et logistique",
    icone: "transport",
    echappe:
      "Une tournée glisse, et l’exploitation passe sa matinée à répondre aux mails de ceux qui s’en aperçoivent — au lieu de réguler ce qui reste de la journée.",
    cherche:
      "Les demandes écrites qui arrivent par votre messagerie et le formulaire du site : accusé de réception dans la minute, classement par type, aiguillage vers le bon service.",
    reste:
      "L’affectation des véhicules, les tournées et les heures de conduite restent à votre exploitation.",
    systemes: ["frontd", "cashd"],
  },
  {
    /* §7 — les achats, premier poste variable. La détection de hausse de
       prix n'est pas construite : l'entrée se tient sur la pile de pièces. */
    cle: "restauration",
    nom: "Restauration",
    complet: "Restauration, cafés et hôtellerie",
    icone: "table",
    echappe:
      "Les factures fournisseurs arrivent tous les jours, par mail, en photo, parfois deux fois. Le classement se fait le dimanche soir, ou il ne se fait pas.",
    cherche:
      "Chaque pièce reçue sur une adresse dédiée, lue qu’elle soit native ou scannée, ses totaux recoupés, ses doublons écartés — et ce qui cloche mis de côté plutôt que deviné.",
    reste:
      "Les commandes, les stocks, les fiches techniques et la production ne se pilotent pas depuis chez nous.",
    systemes: ["filed"],
  },
  {
    /* §25 — les professions à dossier, et les cinq galères de l'enveloppe.
       Périmètre volontairement réduit à la pièce comptable. */
    cle: "cabinets",
    nom: "Cabinets comptables et juridiques",
    complet: "Cabinets comptables, juridiques et professions à dossier",
    icone: "cabinet",
    echappe:
      "Les pièces des clients arrivent en vrac, de dix boîtes différentes, sans nom de fichier utile — et il faut les réclamer une deuxième fois à ceux qui n’ont rien envoyé.",
    cherche:
      "L’en-tête de chaque pièce lu — émetteur, numéro, dates, catégorie — et chaque document écrit dans votre espace, dans une table que rien ne modifie après coup.",
    reste:
      "La production comptable, l’écriture, le conseil et le dossier lui-même restent entiers chez vous.",
    systemes: ["filed", "cashd"],
  },
  {
    /* §2 — la surcharge de demandes, « ce n'est plus de la gestion, c'est de
       la conciergerie ». Canal écrit, ce qui est le cas courant ici. */
    cle: "syndics",
    nom: "Syndics de copropriété",
    complet: "Syndics, gestion locative et administration de biens",
    icone: "immeuble",
    echappe:
      "« Où en est le devis de l’ascenseur », « quand passe le plombier ». Les mêmes questions reviennent sur chaque immeuble, et elles tombent toutes sur le même gestionnaire.",
    cherche:
      "Chaque demande accusée dans la minute avec vos horaires, répondue quand la réponse figure dans la base construite avec vos équipes, transférée avec sa fiche quand elle n’y est pas.",
    reste:
      "Les assemblées, les appels de fonds et la comptabilité de copropriété restent dans votre logiciel.",
    systemes: ["frontd"],
  },
  {
    /* §10 — la dispersion des informations et les aléas de session. */
    cle: "formation",
    nom: "Organismes de formation",
    complet: "Organismes de formation et écoles",
    icone: "formation",
    echappe:
      "Les demandes d’inscription, les questions de financement et les reports de session arrivent par quatre canaux, et chacun attend une réponse que personne n’a le temps d’écrire deux fois.",
    cherche:
      "Chaque demande classée par type avant d’entrer dans un circuit, l’urgence reconnue sur le fond du message, et le journal de ce qui est arrivé, quand, et par où.",
    reste:
      "Le planning des formateurs, les émargements et la conformité de vos sessions ne changent pas de main.",
    systemes: ["frontd", "cashd"],
  },
  {
    /* §16 — le renouvellement. ATTENTION : la fenêtre d'éligibilité (cinq
       ans, trois ans, un an) relève des ÉCHÉANCES, qui ne sont pas encore
       construites. L'entrée reste donc sur le client qui n'est pas revenu. */
    cle: "optique",
    nom: "Optique et audioprothèse",
    complet: "Opticiens, audioprothésistes et équipement de la personne",
    icone: "optique",
    echappe:
      "Un client qui n’est pas revenu depuis trois ans n’est pas parti : il n’a simplement aucune raison de penser à vous un matin plutôt qu’un autre.",
    cherche:
      "Les comptes silencieux au-delà du seuil que vous fixez, relancés en deux messages au plus — et toute réponse, même négative, arrête la séquence sur-le-champ.",
    reste:
      "La prise en charge, la mutuelle, la télétransmission et l’ordonnance restent dans votre outil métier.",
    systemes: ["reload"],
  },
  {
    /* §20 galère 4 — « à chaque étape de la qualification, un délai trop
       long fait chuter la probabilité de signature ». */
    cle: "traiteurs",
    nom: "Traiteurs et événementiel",
    complet: "Traiteurs, réception et événementiel",
    icone: "traiteur",
    echappe:
      "Une demande de devis reçue le vendredi soir attend le lundi matin. Entre-temps le client en a envoyé trois autres, et il répond à celui qui lui a répondu.",
    cherche:
      "Un accusé de réception sous votre signature dans la minute, la demande qualifiée par type, et celles qui demandent une date transmises au service qui peut la poser.",
    reste:
      "Le chiffrage, les menus, l’approvisionnement et le personnel de service restent votre métier.",
    systemes: ["frontd"],
  },
  {
    /* §14 — le client qui attend, et le vendeur qui finit par éviter le
       téléphone. Le fil d'attente n'est pas construit : on tient l'entrée
       sur les demandes écrites et sur les comptes silencieux. */
    cle: "concessions",
    nom: "Concessions et vente de véhicules",
    complet: "Concessions, négociants et vente de véhicules",
    icone: "concession",
    echappe:
      "Les demandes du site et des annonces arrivent à toute heure, souvent le dimanche. Celle qui reste sans réponse jusqu’au mardi est déjà allée voir ailleurs.",
    cherche:
      "Chaque demande reçue, qualifiée et aiguillée selon vos règles — et, de l’autre côté, les clients dont le dernier achat est ancien, repris un par un.",
    reste:
      "Le stock, les immatriculations, le financement et la relation constructeur restent chez vous.",
    systemes: ["frontd", "reload"],
  },
  {
    /* §15 — « les avis négatifs se concentrent presque exclusivement sur les
       défaillances de la chaîne logistique et du SAV, pas sur le produit ». */
    cle: "sav",
    nom: "Vente et service après-vente",
    complet: "Téléphonie, informatique, électroménager et mobilier",
    icone: "sav",
    echappe:
      "La vente s’est bien passée, et la relation se dégrade après coup : le client attend une nouvelle d’une commande ou d’une réparation, et le silence lui suffit pour écrire un avis.",
    cherche:
      "Les demandes de suivi accusées et répondues depuis votre base de connaissances, et les clients qui n’ont plus rien acheté depuis longtemps remis dans le circuit.",
    reste:
      "L’atelier, la garantie, les pièces détachées et la relation fournisseur ne bougent pas de vos outils.",
    systemes: ["frontd", "reload"],
  },
];

/* Les trois intitulés de colonne du panneau. Le troisième n'est pas une
   précaution juridique : c'est lui qui rend les deux autres croyables.
   Une grille toute verte ne se croit pas. */
export const BLOCS = {
  echappe: "Ce qui vous échappe",
  cherche: "Ce que nous prenons",
  reste: "Ce qui reste chez vous",
} as const;

/* Bandeau de faits — des faits de CONCEPTION vérifiables, jamais une
   performance commerciale (règles maison : aucune preuve sociale inventée,
   aucun compteur de traction). Chaque libellé tient sur une ligne : une
   rangée de quatre dont deux cellules passent à deux lignes se lit comme un
   défaut d'alignement, pas comme un chiffre. */
export const FAITS = [
  { valeur: "26", libelle: "métiers passés en revue" },
  { valeur: "4", libelle: "systèmes déployables" },
  { valeur: "0", libelle: "outil métier remplacé" },
  { valeur: "30 min", libelle: "pour situer le vôtre" },
];

/* Ce que nous ne prenons pas. Repris de §29 du document source, plus l'état
   réel du parc au 15/09/2026. Cette section est la raison d'être de la page :
   douze métiers traités sans une seule limite énoncée se liraient comme un
   argumentaire. */
export const REFUS = [
  {
    titre: "Le logiciel métier",
    texte:
      "Planning, stock, parc, atelier, tournées : ces outils existent, ils sont bons, et nous perdrions sur ce terrain. Nous lisons le vôtre, nous ne le remplaçons pas.",
  },
  {
    titre: "Le standard téléphonique",
    texte:
      "Les quatre systèmes travaillent sur l’écrit — votre messagerie, le formulaire de votre site, votre facturier. Un métier dont toute la charge arrive par la voix n’est pas encore le nôtre.",
  },
  {
    titre: "La prévision",
    texte:
      "Prévoir une demande, une production ou un invendu est un vrai problème, chiffré, et ce n’est pas le nôtre. Nous n’annonçons rien que vos données ne disent déjà.",
  },
];
