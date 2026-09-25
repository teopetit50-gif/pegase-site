/* Tavaro — textes.ts. COPIÉ le 24/09/2026 à 14 h 58 de
   `OMEGA/rentalos-site/src/contenu/textes.ts` (état du disque après le
   passage des moteurs en modules français, 14 h 31). Textes inchangés.
   Retirés : NAV (entête), PIED (pied), MODALE (la modale de démonstration)
   — ce qui les affichait ne vient pas ; les boutons mènent à
   /reserver-un-audit. Les chemins des portraits passent de `/equipe/…` à
   `/secteurs-location/equipe/…` (outils/rapatrier-secteur.py). Le trait
   d'union insécable (U+2011) de « co‑fondateur » n'existe pas dans General
   Sans (table cmap lue) : trait d'union ordinaire ici, et le mot est tenu
   d'un bloc par APropos.tsx (`whitespace-nowrap`).

   REPORT DU 24/09 À 17 h 03 (seconde copie du disque). Entre 16 h 00 et
   16 h 32, une autre session a ajouté des fonctions à la source, sur ordre
   de Teo (« ajoute tout sur les sites ») ; diff lu contre
   OMEGA/_sauvegardes-textes/2026-09-24-fonctions/rentalos-site/src, qui
   est identique à la copie de 14 h 58. Reporté ici, mot pour mot :
   · MOTEURS : huit modules 12 à 19 (État des lieux signé, Péages,
     Amendes, Rappels, Garage et carrosserie, Contestations bancaires,
     Sinistres et recours, Relevés constructeur) ; le Plan de flotte
     devient le n° 20 ; le détail de « Contrats à risque » change ;
   · SOLUTIONS : une phrase de plus au résumé de « Facturation des
     retours », de « Remise en location et entretien » et d'« Assistance » ;
   · A_PROPOS.construit : « le garage et les rappels, les péages et les
     amendes » entrent dans l'énumération. */

/** Tous les textes des sections écrites à la main. Les six maquettes d'écran
 *  (hero et cinq solutions) ont les leurs dans outils/textes_apercus.py.
 *
 *  Argumentaire du 23/09/2026 (soir) : Tavaro ne remplace pas le logiciel de
 *  réservation du loueur et ne s'y branche pas. Il travaille sur ce que ce logiciel
 *  ne voit pas : le PARKING, tout ce qui se passe entre deux contrats — le retour,
 *  la facturation du carburant et des dommages, la remise en location, l'entretien,
 *  la panne du dimanche, le véhicule gardé six mois de trop. Aucune marque, aucun lieu.
 *
 *  Registre (passe du 23/09 au soir) : celui d'omegaai.fr, OMEGA/DOCTRINE-TEXTES-SAAS.md
 *  parties II à IV. Le produit est sujet d'un verbe conjugué, « vous » ou « vos agences »
 *  arrive dans la proposition suivante, le lien logique s'écrit (comme, donc, puis,
 *  quand, si bien que). Un bloc = ce que c'est → ce que ça fait → ce qui vous reste.
 *  Aucun fragment nominal en prose, une seule figure sur la page (le hero), nous et
 *  jamais on, visioconférence et jamais visio, boutons à l'infinitif sans « mon/mes ».
 *  Les libellés de tuile, d'onglet et de tableau restent nominaux. Les chiffres sont
 *  ceux du brief, présentés comme un exemple, jamais comme un résultat. Le mot
 *  « moteur » est celui du brief de Teo pour les onze briques nommées : il reste. */

export const HERO = {
  /* Ce qu'on peut affirmer : conçu, développé et édité en France. Jamais « hébergé en
     France » (voir la règle maison), jamais de localisation plus fine. */
  pastille: "Produit français",
  pastilleSuite: "Conçu et développé en France",
  /* La seule figure de la page : deux affirmations parallèles, comme le hero
     d'omegaai.fr (« Vos équipes ont les outils. Nous les faisons travailler ensemble. »). */
  ligne1: "Un dommage non relevé",
  ligne2: "au retour se facture",
  accent: "rarement.",
  chapo:
    "Au retour du véhicule, Tavaro compare les photos de restitution à l’état des lieux de départ, puis chiffre le carburant, le retard et les dommages selon votre barème de remise en état. Chaque facture part avec les photos datées du départ et du retour, après validation de l’agence.",
  chapoCourt: "Tavaro chiffre chaque restitution sur votre barème et prépare la facture avec ses preuves, que l’agence valide avant envoi.",
  boutonPrincipal: "Réserver un audit",
  boutonSecondaire: "Voir les modules",
};

export type Panneau = {
  id: string;
  lien: string;
  kicker?: string;
  titre: string;
  lienTexte: string;
  lienHref: string;
  resume: string;
  points: [string, string, string];
};

export const SOLUTIONS: { etiquette: string; kicker: string; panneaux: Panneau[] } = {
  etiquette: "02 / Solutions",
  kicker: "Solutions",
  panneaux: [
    {
      id: "brief",
      lien: "Le point du matin",
      titre: "Le point du matin",
      lienTexte: "Voir le point du matin",
      lienHref: "#top",
      resume:
        "Tavaro lit ce que vos agences produisent déjà : les photos de retour, les contrats, le planning et la messagerie d’équipe. Avant l’ouverture du comptoir, chaque agence reçoit une page qui décrit l’état de son parking et les décisions qui l’attendent.",
      points: [
        "Votre logiciel de réservation reste en place, et rien ne s’y branche.",
        "Chaque retour, facture, remise en état ou incident est attribué à une personne nommée.",
        "Le point du matin fonctionne de la même façon pour une agence ou pour quarante, sans migration d’outil.",
      ],
    },
    {
      id: "facturation",
      lien: "Facturation des retours",
      kicker: "Le premier module",
      titre: "Facturation des retours",
      lienTexte: "Voir le module",
      lienHref: "#moteurs",
      resume:
        "À chaque restitution, l’agent photographie le véhicule avec son téléphone. Tavaro compare ces photos à l’état des lieux de départ, relève le carburant, le kilométrage, le retard et les dommages nouveaux, puis prépare la facture avec les preuves jointes. Comme le client signe l’état des lieux au départ et au retour, le dossier tient aussi devant sa banque s’il conteste.",
      points: [
        "L’audit commence par vingt retours, pour mesurer ce qui a été facturé et ce qui ne l’a pas été.",
        "Chaque poste de frais est chiffré selon votre barème et la franchise du contrat.",
        "L’agence valide ou refuse chaque facture, et Tavaro n’en envoie aucune sans cette validation.",
      ],
    },
    {
      id: "retours",
      lien: "Remise en location",
      kicker: "Deux modules liés",
      titre: "Remise en location et entretien",
      lienTexte: "Voir les modules",
      lienHref: "#moteurs",
      resume:
        "Dès qu’un véhicule rentre, Tavaro crée la tâche d’inspection, de nettoyage et de recharge avec l’heure du prochain départ. L’entretien est placé dans les creux du planning, hors des réservations, si bien que l’atelier n’immobilise pas un véhicule attendu. Un véhicule parti chez le carrossier garde sa date de retour, et un rappel du constructeur le retire des réservations.",
      points: [
        "Le retour crée la tâche sur la messagerie de l’équipe, avec l’heure limite.",
        "Le responsable est alerté dès que la remise en location risque de manquer le prochain départ.",
        "Chaque anomalie de retour remonte à une personne nommée.",
      ],
    },
    {
      id: "incidents",
      lien: "Assistance",
      kicker: "Les incidents hors horaires",
      titre: "Assistance",
      lienTexte: "Voir le module",
      lienHref: "#moteurs",
      resume:
        "Quand un client appelle un dimanche soir pour une panne, un accident ou une clé perdue, l’assistant de Tavaro répond, ouvre le dossier et envoie la dépanneuse selon votre grille. Il prévient l’agence, puis transfère l’appel à une personne dès que la situation sort de la grille, avec l’historique de l’échange. Le dossier d’accident est ensuite suivi jusqu’au règlement.",
      points: [
        "Le pilote couvre un seul type d’incident courant, puis s’élargit.",
        "Le dossier est ouvert et résumé dans votre logiciel, avec l’heure et le contrat.",
        "Les cas difficiles passent à une personne, qui reçoit tout le contexte.",
      ],
    },
    {
      id: "flotte",
      lien: "Sortie de flotte",
      kicker: "Revente et renouvellement",
      titre: "Sortie de flotte",
      lienTexte: "Voir le module",
      lienHref: "#moteurs",
      resume:
        "Tavaro tient une fiche économique par véhicule, avec son revenu, son entretien, ses jours d’immobilisation et sa valeur de revente. Il désigne ceux qui coûtent plus qu’ils ne rapportent, puis propose le moment et le canal de revente.",
      points: [
        "Chaque véhicule est comparé à son prix de revente réel plutôt qu’à sa valeur comptable.",
        "La décision de vendre, de garder ou de renouveler se prend véhicule par véhicule, chiffres à l’appui.",
        "La direction valide chaque mise en vente, et le journal en garde la trace.",
      ],
    },
  ],
};

export type Moteur = { numero: string; nom: string; role: string; detail: string; chiffre: string; chiffreLegende: string; vedette?: boolean; aVenir?: boolean };

/* `role` est un libellé de tuile (nominal). `detail` suit la carte du catalogue
   d'omegaai.fr : le verbe en tête, le sujet est le moteur nommé juste au-dessus,
   puis ce qui reste à l'agence. */
export const MOTEURS: { etiquette: string; liste: Moteur[] } = {
  etiquette: "01 / Modules",
  liste: [
    { numero: "01", nom: "Facturation des retours", role: "Carburant, retard et dommages", detail: "Chaque restitution est comparée à l’état des lieux de départ, puis chiffrée selon votre barème. L’agence valide la facture avant envoi.", chiffre: "302 €", chiffreLegende: "proposés sur un retour d’exemple" },
    { numero: "02", nom: "Remise en location", role: "Inspection, nettoyage, recharge", detail: "La tâche d’inspection, de nettoyage et de recharge est créée dès le retour, et le responsable est alerté si le prochain départ est menacé.", chiffre: "2 h 48", chiffreLegende: "de remise en location, agence d’exemple" },
    { numero: "03", nom: "Entretien", role: "Révisions hors location", detail: "Tavaro place les révisions dans les creux du planning, hors des réservations, et prévient l’atelier à l’avance.", chiffre: "4", chiffreLegende: "entretiens placés cette semaine" },
    { numero: "04", nom: "Assistance", role: "Panne, accident, clé perdue", detail: "L’assistant répond à l’appel, ouvre le dossier, envoie la dépanneuse selon votre grille et prévient l’agence.", chiffre: "35 min", chiffreLegende: "d’arrivée de la dépanneuse, exemple" },
    { numero: "05", nom: "Sortie de flotte", role: "Revente au bon moment", detail: "Tavaro rapproche le revenu, l’entretien, l’immobilisation et la valeur de revente de chaque véhicule pour désigner ceux qui coûtent plus qu’ils ne rapportent.", chiffre: "12", chiffreLegende: "véhicules à sortir ce trimestre" },
    { numero: "06", nom: "Questions", role: "Votre parking en questions", detail: "Posez une question en français : Tavaro répond chiffres à l’appui, avec la cause de l’écart et la décision proposée.", chiffre: "42", chiffreLegende: "retours relus en une question", vedette: true },
    { numero: "07", nom: "Réservations à risque", role: "Non-présentations anticipées", detail: "Les réservations exposées à une non-présentation sont repérées, avec la confirmation, l’acompte ou la relance à proposer avant le départ.", chiffre: "19", chiffreLegende: "réservations à risque ce matin" },
    { numero: "08", nom: "Montée en gamme", role: "L’offre au comptoir", detail: "La montée en gamme est proposée au comptoir lorsqu’un véhicule supérieur est libre et que le profil du client s’y prête.", chiffre: "34", chiffreLegende: "clients à qui proposer une offre" },
    { numero: "09", nom: "Contrats à risque", role: "Un score par contrat", detail: "Chaque contrat reçoit un score établi à partir du conducteur, de l’historique et de la sinistralité ; la pièce d’identité et le permis sont contrôlés.", chiffre: "3", chiffreLegende: "contrats signalés à risque ce matin" },
    { numero: "10", nom: "Véhicules inactifs", role: "Le risque d’inactivité à 72 h", detail: "La probabilité qu’un véhicule reste trois jours au parking est calculée chaque matin, avec l’action qui permet de l’éviter.", chiffre: "28", chiffreLegende: "véhicules à risque ce matin" },
    { numero: "11", nom: "Transferts", role: "Entre agences, avant le pic", detail: "Tavaro organise les transferts entre agences avant le pic de demande, en une seule tournée, selon les réservations de chaque site.", chiffre: "14", chiffreLegende: "transferts proposés pour samedi" },
    { numero: "12", nom: "État des lieux signé", role: "Photos guidées, signées au départ", detail: "L’agent est guidé angle par angle, la photo floue est refusée, puis le client signe l’état des lieux au départ comme au retour.", chiffre: "12", chiffreLegende: "photos par état des lieux, exemple" },
    { numero: "13", nom: "Péages", role: "Flux libre et télépéage", detail: "Chaque passage sous un portique sans barrière est rattaché au contrat, payé dans les 72 heures, puis refacturé au client.", chiffre: "7", chiffreLegende: "passages à payer avant jeudi" },
    { numero: "14", nom: "Amendes", role: "La désignation à l’ANTAI", detail: "Chaque avis de contravention est rapproché du contrat, et le locataire est désigné dans les 45 jours. Les frais de dossier lui sont refacturés.", chiffre: "9", chiffreLegende: "avis à désigner cette semaine" },
    { numero: "15", nom: "Rappels", role: "Rappels, contrôle technique, Crit’Air", detail: "Un véhicule rappelé par le constructeur, ou dont le contrôle technique arrive à échéance, sort des réservations. Sa vignette Crit’Air est rappelée au comptoir.", chiffre: "3", chiffreLegende: "véhicules rappelés, dont 2 réservés demain" },
    { numero: "16", nom: "Garage et carrosserie", role: "Le retour du véhicule immobilisé", detail: "Chaque véhicule chez le carrossier garde une date de retour. Si cette date manque ou tombe après le pic, Tavaro propose des transferts.", chiffre: "12 j", chiffreLegende: "chez le carrossier, sans date de retour" },
    { numero: "17", nom: "Contestations bancaires", role: "Le dossier de preuve", detail: "Quand un client conteste auprès de sa banque le débit des dommages, le dossier part en un clic : état des lieux signé, photos datées, barème appliqué et contrat.", chiffre: "4", chiffreLegende: "pièces jointes à chaque dossier" },
    { numero: "18", nom: "Sinistres et recours", role: "Suivis jusqu’au règlement", detail: "Chaque accident est suivi du constat au règlement, et le recours contre l’assureur du client est préparé pour les jours d’immobilisation.", chiffre: "5", chiffreLegende: "dossiers ouverts ce mois-ci" },
    { numero: "19", nom: "Relevés constructeur", role: "Sans boîtier à installer", detail: "Le carburant, le kilométrage et la charge de la batterie sont lus auprès du constructeur au moment du retour, puis confirment ce que montrent les photos.", chiffre: "0", chiffreLegende: "boîtier à installer" },
    { numero: "20", nom: "Plan de flotte", role: "La flotte de l’an prochain", detail: "Le plan de flotte de l’an prochain indique, agence par agence, les véhicules à acheter, renouveler, vendre ou déplacer.", chiffre: "2027", chiffreLegende: "à venir", aVenir: true },
  ],
};

export const METHODE = {
  etiquette: "03 / Méthode",
  titre: "Vingt retours suffisent à mesurer ce qui n’a pas été facturé",
  chapo:
    "Pendant l’audit, nous relisons les vingt derniers retours d’une de vos agences et nous mesurons ce qui a été facturé et ce qui ne l’a pas été. Le premier module s’installe là où l’écart est le plus grand, pour quatre semaines, et un seul indicateur est lu à la fin du mois.",
  cta: "Réserver un audit",
};

export const A_PROPOS = {
  etiquette: "04 / À propos",
  identite:
    " est conçu et développé en France par Omega pour les réseaux de location de véhicules. Ses trois associés viennent du logiciel d’entreprise, de l’ingénierie de l’intelligence artificielle et de la finance.",
  equipe: [
    { prenom: "Henri", nom: "Henri Guichané", role: "CEO & fondateur", photo: "/secteurs-location/equipe/henri.jpg" },
    { prenom: "Vincent", nom: "Vincent Karmalecki", role: "CTO & co-fondateur", photo: "/secteurs-location/equipe/vincent.jpg" },
    { prenom: "Teo", nom: "Teo Karczewski", role: "Co-fondateur", photo: "/secteurs-location/equipe/teo.jpg" },
  ],
  construitTitre: "Ce que Tavaro prend en charge",
  construit:
    "Tavaro ne remplace pas votre logiciel de réservation et ne s’y branche pas. Il prend en charge ce qui se passe entre deux contrats : les photos de retour, la facturation du carburant et des dommages, la remise en location, l’entretien, le garage et les rappels, les péages et les amendes, la panne du dimanche et la sortie de flotte. Chaque action qui engage de l’argent passe par la validation de vos équipes.",
  liste: [
    "Les retours sont comparés aux photos de départ, et la facture est proposée avec les preuves.",
    "La remise en location et l’entretien sont placés dans les creux du planning, puis suivis par l’équipe.",
    "Les incidents et la sortie de flotte sont chiffrés, puis vous les validez.",
  ],
  explorer: "Explorer",
  liens: [
    { libelle: "Les modules", href: "#moteurs" },
    { libelle: "Solutions", href: "#solutions" },
    { libelle: "Méthode", href: "#methode" },
    { libelle: "Le point du matin", href: "#top" },
  ],
};
