/* ══════════════════════════════════════════════════════════════════════
   Contenu de /reserver-un-audit — source unique (26/07/2026)

   La page reprend l'architecture de la page tarifs de référence : un
   sélecteur à deux profils, trois formules en cartes, un comparatif à
   quatre familles de lignes, deux compléments, un simulateur, une FAQ.
   Ce fichier porte tout le texte pour que la page reste lisible et que la
   révision éditoriale se fasse à un seul endroit.

   ⚠ À VALIDER PAR TEO avant mise en avant commerciale : les durées, le
   contenu exact de chaque formule et le périmètre des compléments sont
   une proposition construite à partir de l'existant (page /audit, section
   Chèque TIC, articles). Aucun prix n'est affiché — les deux formules
   payantes sont « sur devis », précisément pour ne rien figer ici.
   Aucun chiffre de preuve sociale, aucun avis client : la règle posée
   dans refs-qonto/NOTES-DESIGN.md tient toujours.
   ══════════════════════════════════════════════════════════════════════ */

export const COURRIEL = "contact@pegase.gp";

/* ══════════════════════════════════════════════════════════════════════
   Numéro WhatsApp du desk — fourni par Teo le 30/07 (+33 7 68 16 34 43).

   Format international, SANS le +, SANS espaces : indicatif pays collé au
   numéro. Ici 33 (France) + 768163443.

   Vider cette chaîne fait retomber TOUS les boutons du site sur le
   courriel, sans rien casser : c'est l'interrupteur de repli.

   Pourquoi WhatsApp (arbitrage Teo, 30/07) : un artisan sur téléphone
   passe de la page à une conversation en un geste, là où un `mailto:` lui
   ouvre une application qu'il n'utilise pas. Et ça ne dépend ni du
   domaine — qui n'existe toujours pas — ni d'un serveur, ni d'un compte.
   ══════════════════════════════════════════════════════════════════════ */
/* `: string` explicite et non inféré : sans lui TypeScript fige le type sur
   le littéral et réduit l'autre branche à `never`. */
export const WHATSAPP: string = "33768163443";

/* Le canal effectif : WhatsApp dès que le numéro est posé, courriel sinon.
   Tout le site passe par cette fonction — il n'y a donc qu'un endroit à
   changer le jour où un outil de prise de rendez-vous arrive. */
export const CANAL: "whatsapp" | "courriel" = WHATSAPP ? "whatsapp" : "courriel";

/* ══════════════════════════════════════════════════════════════════════
   28/08/2026 — LE JOUR PRÉVU PAR LE COMMENTAIRE D'EN-TÊTE EST ARRIVÉ :
   l'outil de prise de rendez-vous existe (/reserver, calendrier branché
   sur l'armoire OMEGA-Core). lienReservation n'ouvre plus WhatsApp : il
   mène au calendrier, avec le format pré-choisi. Le paramètre passe du
   LIBELLÉ (« Audit complet (90 min) ») à l'ID de formule (« complet ») —
   tous les appelants sont passés à l'ID le même jour.

   WhatsApp ne disparaît pas : lienContact (questions libres, pied de
   page, voie de secours si l'agenda ne répond pas) passe toujours par le
   desk. L'interrupteur de repli WHATSAPP → COURRIEL ne vaut plus que
   pour lui. */

export function lienReservation(formuleId: string) {
  return `/reserver?formule=${encodeURIComponent(formuleId)}`;
}

/* Contact libre, hors réservation (pied de page, « une autre question »). */
export function lienContact(sujet: string, corps?: string) {
  if (WHATSAPP) {
    return `https://wa.me/${WHATSAPP}?text=${encodeURIComponent(corps ?? sujet)}`;
  }
  const q = new URLSearchParams({ subject: sujet });
  if (corps) q.set("body", corps);
  return `mailto:${COURRIEL}?${q.toString()}`;
}

/* Libellé et valeur affichée, pour ne pas écrire « par courriel » sous un
   bouton qui ouvre WhatsApp. */
export const CANAL_LABEL = WHATSAPP ? "Par WhatsApp" : "Par courriel";

/* Variante pour l'intérieur d'une phrase. Surtout PAS un `.toLowerCase()`
   sur CANAL_LABEL : ça donnait « par whatsapp », la marque décapitalisée. */
export const CANAL_LABEL_PHRASE = WHATSAPP ? "par WhatsApp" : "par courriel";

/* Mise en forme lisible du numéro. Le découpage dépend de l'indicatif — un
   numéro français fait 11 chiffres (33 + 9), un guadeloupéen 12 (590 + 9) —
   d'où le traitement par préfixe plutôt qu'un seul gabarit. Tout indicatif
   non prévu s'affiche brut : mieux vaut un numéro non formaté qu'un numéro
   mal coupé. */
function formateNumero(n: string) {
  if (n.startsWith("590") && n.length === 12) {
    const s = n.slice(3);
    return `+590 ${s.slice(0, 3)} ${s.slice(3, 5)} ${s.slice(5, 7)} ${s.slice(7)}`;
  }
  if (n.startsWith("33") && n.length === 11) {
    const s = n.slice(2);
    return `+33 ${s.slice(0, 1)} ${s.slice(1, 3)} ${s.slice(3, 5)} ${s.slice(5, 7)} ${s.slice(7)}`;
  }
  return `+${n}`;
}

export const CANAL_VALEUR = WHATSAPP ? formateNumero(WHATSAPP) : COURRIEL;

/* ——— les deux profils du sélecteur ——— */

export type Point = { texte: string; fort?: string; surligne?: boolean };

export type Formule = {
  id: string;
  nom: string;
  /* le grand chiffre de la carte : ici une durée, pas un prix */
  duree: string;
  suffixe: string;
  /* la sous-ligne grise, à la place du « facturé annuellement » */
  conditions: string;
  promesse?: string;
  /* true = la promesse tient sa place — même hauteur de tête, même repli de
     lignes — mais ne s'affiche pas (Teo, 02/08 : « la phrase disparaît,
     l'espace reste »). La retirer du JSX changerait la hauteur mobile,
     où la tête n'a pas de min-height. */
  promesseFantome?: boolean;
  cta: string;
  souscta: string;
  phare?: boolean;
  badge?: string;
  enteteListe: string;
  points: Point[];
};

export type Profil = {
  id: string;
  label: string;
  formules: [Formule, Formule, Formule];
};

export const PROFILS: [Profil, Profil] = [
  {
    id: "tpe",
    label: "Indépendant & petite entreprise",
    formules: [
      {
        id: "diagnostic",
        nom: "Diagnostic",
        duree: "30 min",
        suffixe: "en visio",
        conditions: "Gratuit, sans engagement",
        promesse:
          "Identifier la difficulté qui vous coûte le plus cher, et repartir avec un chiffre plutôt qu'une impression.",
        promesseFantome: true,
        cta: "Réserver ce créneau",
        souscta: "Créneau bloqué immédiatement, confirmé le jour même",
        enteteListe: "L'entretien comprend :",
        points: [
          {
            texte:
              "Revue du quotidien : facturation, demandes clients, présence en ligne, administratif",
            fort: "facturation, demandes clients, présence en ligne",
          },
          { texte: "Chiffrage du poste le plus coûteux", fort: "poste le plus coûteux" },
          { texte: "Une recommandation orale, à chaud", fort: "recommandation orale" },
          {
            texte: "Vérification de votre éligibilité au Chèque TIC",
            fort: "éligibilité au Chèque TIC",
          },
        ],
      },
      {
        id: "complet",
        nom: "Audit complet",
        duree: "90 min",
        suffixe: "en visio ou sur place",
        conditions: "Gratuit, sans engagement",
        promesse:
          "Passer toute la chaîne en revue et chiffrer les trois postes : pas seulement celui qui se voit.",
        promesseFantome: true,
        cta: "Réserver ce créneau",
        souscta: "Créneau bloqué immédiatement, confirmé le jour même",
        phare: true,
        badge: "Populaire",
        enteteListe: "Tout le Diagnostic, plus :",
        points: [
          {
            texte:
              "Chiffrage écrit des trois postes : impayés, demandes perdues, heures administratives",
            fort: "Chiffrage écrit",
            surligne: true,
          },
          {
            texte: "Cartographie de vos outils actuels, mail, tableur, WhatsApp, caisse",
            fort: "Cartographie de vos outils",
          },
          {
            texte:
              "État de votre présence en ligne : ce que vous captez, ce qui n'arrive jamais faute de site",
            fort: "présence en ligne",
          },
          {
            texte: "Devis du moteur recommandé et du modèle de site qui va avec, valables 30 jours",
            fort: "Devis",
          },
          {
            texte: "Dossier de financement Chèque TIC monté par nos soins",
            fort: "Chèque TIC",
          },
        ],
      },
      {
        id: "site",
        nom: "Audit dans vos locaux",
        duree: "½ journée",
        suffixe: "dans vos locaux",
        conditions: "Sur devis, déduit de l'installation",
        promesse:
          "Observer le travail réel, avec vos fichiers et vos équipes sous les yeux plutôt que de le reconstituer.",
        promesseFantome: true,
        cta: "Demander un devis",
        souscta: "Dans vos locaux, déplacement inclus en Guadeloupe",
        enteteListe: "Tout l'Audit complet, plus :",
        points: [
          {
            texte: "Observation sur poste : on regarde comment ça se passe vraiment",
            fort: "Observation sur poste",
            surligne: true,
          },
          {
            texte: "Relevé sur vos fichiers réels : échéancier, boîte mail, historique WhatsApp",
            fort: "fichiers réels",
          },
          {
            texte: "Maquette du moteur construite sur vos propres données",
            fort: "Maquette du moteur",
          },
          { texte: "Point de suivi à 30 jours, inclus", fort: "Point de suivi à 30 jours" },
        ],
      },
    ],
  },
  {
    id: "equipe",
    label: "Entreprise & équipes",
    formules: [
      {
        id: "cadrage",
        nom: "Cadrage",
        duree: "45 min",
        suffixe: "en visio",
        conditions: "Gratuit, sans engagement",
        promesse:
          "Poser le périmètre : quels services, quels volumes, quelles contraintes de validation avant d'aller plus loin.",
        promesseFantome: true,
        cta: "Réserver ce créneau",
        souscta: "Créneau bloqué immédiatement, confirmé le jour même",
        enteteListe: "L'entretien comprend :",
        points: [
          {
            texte:
              "Recensement des services concernés, de leurs volumes et des demandes entrantes",
            fort: "services concernés",
          },
          {
            texte: "Identification des points de validation obligatoires",
            fort: "points de validation",
          },
          { texte: "Premier ordre de grandeur du gain attendu", fort: "ordre de grandeur" },
          { texte: "Vérification de l'éligibilité au Chèque TIC", fort: "Chèque TIC" },
        ],
      },
      {
        id: "process",
        nom: "Audit process",
        duree: "2 h",
        suffixe: "en visio ou sur place",
        conditions: "Gratuit, sans engagement",
        promesse:
          "Dérouler le processus bout en bout et chiffrer chaque rupture de chaîne, poste par poste.",
        promesseFantome: true,
        cta: "Réserver ce créneau",
        souscta: "Créneau bloqué immédiatement, confirmé le jour même",
        phare: true,
        badge: "Populaire",
        enteteListe: "Tout le Cadrage, plus :",
        points: [
          {
            texte: "Chiffrage écrit par service : délais, reprises, temps de saisie",
            fort: "Chiffrage écrit par service",
            surligne: true,
          },
          {
            texte:
              "Entretiens individuels avec les personnes qui tiennent les outils : jamais en réunion de groupe",
            fort: "Entretiens individuels",
          },
          {
            texte: "Cartographie des outils et des accès en place",
            fort: "Cartographie des outils",
          },
          { texte: "Devis du moteur recommandé, valable 30 jours", fort: "Devis" },
          { texte: "Dossier Chèque TIC monté par nos soins", fort: "Chèque TIC" },
        ],
      },
      {
        id: "atelier",
        nom: "Audit + atelier",
        duree: "1 journée",
        suffixe: "dans vos locaux",
        conditions: "Sur devis, déduit de l'installation",
        promesse:
          "Auditer le matin, former l'équipe l'après-midi : la validation des messages ne s'improvise pas.",
        promesseFantome: true,
        cta: "Demander un devis",
        souscta: "Dans vos locaux, déplacement inclus en Guadeloupe",
        enteteListe: "Tout l'Audit process, plus :",
        points: [
          {
            texte: "Atelier de deux heures avec les personnes qui valideront",
            fort: "Atelier de deux heures",
            surligne: true,
          },
          { texte: "Relevé sur vos fichiers et vos boîtes réelles", fort: "fichiers" },
          { texte: "Maquette du moteur sur vos propres données", fort: "Maquette" },
          { texte: "Point de suivi à 30 jours, inclus", fort: "Point de suivi à 30 jours" },
        ],
      },
    ],
  },
];

/* ——— comparatif ———
   `valeurs` suit l'ordre des formules du profil affiché. Le tiret « — »
   signifie « non compris » : la référence utilise le même signe plutôt
   qu'une croix, qui se lit comme un reproche. */

export type LigneComparatif = {
  libelle: string;
  aide: string;
  valeurs: [string, string, string];
};

export type FamilleComparatif = {
  titre: string;
  /* les deux premières familles sont visibles, les suivantes sont derrière
     le bouton « Voir tous les points » — comme la référence */
  repliee?: boolean;
  lignes: LigneComparatif[];
};

export const COMPARATIF: FamilleComparatif[] = [
  {
    titre: "Le déroulé de l'entretien",
    lignes: [
      {
        libelle: "Durée",
        aide: "Le format est cadré et se termine à l'heure annoncée. Si le sujet mérite davantage, c'est vous qui décidez de la suite.",
        valeurs: ["30 minutes", "90 minutes", "Une demi-journée"],
      },
      {
        libelle: "Format",
        aide: "La visio suffit dans la très grande majorité des cas : ce qu'on regarde, ce sont vos fichiers et vos boîtes, pas vos murs.",
        valeurs: ["Visio", "Visio ou sur place", "Sur place, dans vos locaux"],
      },
      {
        libelle: "Qui participe",
        aide: "Un audit se fait avec les personnes qui tiennent réellement les outils, pas seulement avec celle qui signe. En équipe, les entretiens sont individuels : c'est l'écart entre la vision de la direction et le quotidien réel qu'on mesure.",
        valeurs: [
          "Le dirigeant",
          "Dirigeant, et le comptable si utile",
          "Dirigeant et équipe concernée",
        ],
      },
      {
        libelle: "Ce que vous préparez",
        aide: "Rien d'administratif à produire : on travaille sur ce qui existe déjà chez vous, dans l'état où il est.",
        valeurs: [
          "Rien",
          "Vos trois derniers mois d'échéances",
          "Accès en lecture à vos outils",
        ],
      },
      {
        libelle: "Délai pour obtenir un créneau",
        aide: "Délais constatés, hors périodes de fermeture. Trois créneaux vous sont proposés à chaque fois.",
        valeurs: ["Sous 72 h", "Sous 5 jours ouvrés", "Sous 10 jours ouvrés"],
      },
    ],
  },
  /* La famille « Ce que nous mesurons » a été resserrée puis SUPPRIMÉE le
     02/08 à la demande de Teo ; « Ce que vous recevez » est resserrée à
     3 lignes le même jour. Les anciens découpages restent dans git. */
  {
    titre: "Ce que vous recevez",
    repliee: true,
    lignes: [
      {
        libelle: "Recommandation et chiffrage",
        aide: "Le moteur à installer d'abord, le chantier à planifier ensuite, ce qu'on déconseille d'automatiser, et le montant de chaque poste, vérifiable dans vos propres documents.",
        valeurs: [
          "Oraux, en fin d'entretien",
          "Écrits, sous 72 h",
          "PDF détaillé, avec maquette sur vos données",
        ],
      },
      {
        libelle: "Devis du moteur",
        aide: "Le devis est indépendant de l'audit : vous pouvez le prendre et ne rien installer.",
        valeurs: ["Sur demande", "Compris, valable 30 jours", "Compris, valable 30 jours"],
      },
      {
        libelle: "Dossier Chèque TIC",
        aide: "Le dispositif de la Région Guadeloupe finance de 40 à 80 % d'un projet numérique selon le poste, jusqu'à 10 000 €, pour une entreprise éligible.",
        valeurs: [
          "Éligibilité vérifiée",
          "Dossier monté",
          "Dossier monté et instruction suivie",
        ],
      },
    ],
  },
  {
    titre: "Après l'audit",
    repliee: true,
    lignes: [
      {
        libelle: "Délai de réponse",
        aide: "Toute demande obtient une réponse dans ce délai, y compris pour dire non.",
        valeurs: ["Le jour même", "Le jour même", "Le jour même"],
      },
      {
        libelle: "Point de suivi",
        aide: "Trente jours après l'audit, on reprend les chiffres (ce qui a bougé, ce qui n'a pas bougé), et la cartographie est remise à jour avec.",
        /* Le Diagnostic n'a pas de point de suivi : « — », le signe de
           « non compris » posé en tête du comparatif. La cellule portait
           « , » — une virgule seule, reste d'une valeur effacée. Elle
           s'affichait telle quelle en production (repéré le 16/08). */
        valeurs: ["—", "À 30 jours, sur demande", "À 30 jours, compris"],
      },
      {
        libelle: "Engagement",
        aide: "La recommandation vous appartient, que vous installiez un moteur ou non.",
        valeurs: ["Aucun", "Aucun", "Aucun"],
      },
      {
        libelle: "Confidentialité",
        aide: "Les chiffres partagés pendant l'entretien n'en sortent pas.",
        valeurs: [
          "Aucune donnée conservée sans accord",
          "Aucune donnée conservée sans accord",
          "Aucune donnée conservée sans accord",
        ],
      },
    ],
  },
];

/* ——— compléments (les « add-ons » de la référence) ——— */

export const COMPLEMENTS: { titre: string; texte: string; conditions: string }[] = [
  {
    titre: "Atelier équipe",
    texte:
      "Deux heures avec les personnes qui valideront les messages du moteur au quotidien. Rien ne part sans validation humaine chez Omega.AI : encore faut-il que l'équipe sache corriger, suspendre et reprendre la main sans appeler à l'aide.",
    conditions: "Sur devis, souvent éligible au Chèque TIC.",
  },
  {
    titre: "Cartographie approfondie",
    texte:
      "Un relevé complet de ce qui tourne déjà chez vous, jusqu'aux fichiers partagés et aux boîtes secondaires que personne ne mentionne spontanément. Utile quand plusieurs services se sont équipés chacun de leur côté depuis des années.",
    conditions: "Comprise dès l'Audit dans vos locaux. Sur devis en complément d'un Diagnostic.",
  },
];

/* ——— FAQ ——— */

export const FAQ: { q: string; r: string[] }[] = [
  {
    q: "L'audit est-il vraiment gratuit ?",
    r: [
      "Le Diagnostic et l'Audit complet le sont, et le demeurent : aucune facture n'arrive après coup, aucune contrepartie n'est demandée. Vous repartez avec le chiffrage et la recommandation, que vous installiez un moteur ou non.",
      "Les deux formats sur site sont facturés parce qu'ils mobilisent une demi-journée à une journée de déplacement et de relevé. Leur montant est déduit de l'installation si vous décidez d'aller plus loin.",
    ],
  },
  {
    q: "Que se passe-t-il concrètement après ma demande ?",
    r: [
      "Votre créneau est bloqué à l'instant où vous le choisissez : l'agenda n'affiche que les disponibilités réelles, personne ne peut prendre le même. Vous recevez un mot de confirmation le jour même — WhatsApp ou e-mail — avec le lien de la visio. Si votre demande relève d'un autre format que celui que vous avez coché, on vous le dit à ce moment-là.",
      "À l'issue de l'entretien, le chiffrage écrit part sous 72 heures pour les formats qui le comprennent. Il n'y a pas de relance commerciale ensuite : si vous ne donnez pas suite, le dossier se ferme.",
    ],
  },
  {
    q: "Faut-il préparer des documents ?",
    r: [
      "Pour le Diagnostic, rien. On travaille à partir de ce que vous savez de tête, et c'est suffisant pour identifier le poste qui coûte le plus cher.",
      "Pour l'Audit complet, vos trois derniers mois d'échéances rendent le chiffrage nettement plus précis : un export de logiciel de facturation ou un tableur suffit. Rien n'est à mettre en forme : on prend les fichiers dans l'état où ils sont.",
    ],
  },
  {
    q: "Rien n'est écrit chez moi, tout est dans ma tête, c'est bloquant ?",
    r: [
      "Non : c'est le cas de la majorité des entreprises auditées : les décisions se prennent à l'oral, les habitudes vivent dans la mémoire des personnes. Ce n'est pas un obstacle à l'entretien : on vous fait raconter, c'est tout.",
      "C'est même une partie du travail. La cartographie met votre fonctionnement à plat, noir sur blanc, et un moteur ne s'installe que sur un processus posé. À la fin de l'audit, le vôtre l'est, que vous installiez un moteur ou non.",
    ],
  },
  {
    q: "Mes chiffres restent-ils confidentiels ?",
    r: [
      "Oui. Les montants et les fichiers partagés pendant l'entretien ne sortent pas de l'audit et ne sont conservés qu'avec votre accord explicite. Rien n'est recopié dans une base tierce pour être analysé : l'audit se fait sur vos fichiers, en lecture.",
    ],
  },
  {
    q: "Le Chèque TIC, c'est automatique ?",
    r: [
      "Non. C'est un dispositif de la Région Guadeloupe qui finance de 40 à 80 % d'un projet numérique selon le poste, dans la limite de 10 000 €, pour une entreprise immatriculée en Guadeloupe depuis au moins un an et à jour de ses obligations sociales et fiscales. Les critères et les enveloppes évoluent.",
      "Votre éligibilité est vérifiée pendant l'audit, avant tout engagement. Si vous n'êtes pas éligible, on vous le dit à ce moment-là plutôt qu'après signature.",
    ],
  },
  {
    /* 04/08 — ajoutée avec la page /modeles. C'est littéralement la
       question de quelqu'un qui arrive de la galerie de sites : il vient
       chercher une vitrine et tombe sur une page qui parle d'impayés. La
       réponse dit oui, puis explique pourquoi on regarde d'abord ce qui se
       passe APRÈS le clic — sans quoi on livre une vitrine qui dort. */
    q: "Je veux surtout un site, vous faites ça ?",
    r: [
      /* Vingt et un, pas vingt-deux : AssetX est sorti du catalogue le
         06/08 (voir components/modeles/donnees.ts). /modeles affichait bien
         « 21 modèles », cette réponse était restée à l'ancien compte. */
      "Oui, et vous pouvez déjà en visiter vingt et un : chaque modèle du catalogue est en ligne et se parcourt en vrai. Vous choisissez l'allure, on réécrit tout le contenu en français, à votre métier.",
      "L'audit sert à regarder ce qui se passe une fois qu'un visiteur a cliqué : où part la demande, qui la voit, en combien de temps on lui répond, et ce que devient le devis. Un site qui reçoit trois demandes par semaine et n'en transforme aucune coûte plus cher qu'il ne rapporte : c'est cette partie-là qu'on chiffre d'abord, pour que la vitrine ne dorme pas.",
    ],
  },
  {
    q: "Vous intervenez partout en France ?",
    r: [
      "Oui pour tous les formats à distance, où que vous soyez. Les formats dans vos locaux sont réservés à la Guadeloupe, où nous sommes établis : au-delà, le déplacement coûterait plus cher que ce qu'il apporte.",
      "L'installation d'un moteur, elle, ne demande aucune présence permanente : le raccordement se fait sur vos outils existants.",
    ],
  },
  {
    q: "Et si l'audit conclut qu'il n'y a rien à automatiser ?",
    r: [
      "Cela arrive, et c'est une conclusion valable. Un moteur ne se justifie que si la difficulté qu'il traite coûte plus cher que lui : quand ce n'est pas le cas, la recommandation est de ne rien installer.",
      "C'est précisément pour cette raison que l'audit chiffre avant de recommander, et jamais l'inverse.",
    ],
  },
];
