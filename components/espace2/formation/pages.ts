/* ══════════════════════════════════════════════════════════════════════
   Le contenu de la formation (/espace2/formation), page par page
   (29/10/2026).

   Chaque phrase vient de ce que l'espace montre ou de ce que les pages
   produit disent déjà (relevé sur main le 29/10, sources dans le fil de la
   session). Ce qui n'est pas encore construit n'y est PAS : la liste
   lib/en-preparation.ts, les capacités `atteste: false` de
   lib/produits/capacites, et ce qui ne vient que du document d'août
   (OMEGA-DE-A-A-Z.md : rituel hebdomadaire, pointage des 7 jours…).
   Deux écarts avec des pages publiques sont tranchés ici par l'écran :
   · l'arrêt de tous les envois se fait côté Omega, pas dans les réglages
     du client (« écrivez-nous ») ;
   · l'invitation par e-mail n'existe pas encore : la personne doit déjà
     avoir un compte, sinon Omega ouvre son accès.

   Texte riche : [libellé](/lien) devient un lien (Article.tsx).
   ══════════════════════════════════════════════════════════════════════ */

import { MODULES, MODULES_PRINCIPAUX } from "../modules";
import { video, type VideoFormation } from "./videos";

export type { VideoFormation };

export type Riche = string;
export type Bloc = { p: Riche } | { sous: string } | { liste: Riche[] };
export type SectionFormation = { id: string; titre: string; niveau: 2 | 3; video?: VideoFormation; blocs: Bloc[] };
export type PageFormation = {
  titre: string;
  intro: Riche;
  video?: VideoFormation;
  sections: SectionFormation[];
  suivant?: { titre: string; href: string };
};

const F = "/espace2/formation";
const E = "/espace2";

/* 03/11/2026 — chaque vidéo est une fiche du catalogue (videos.ts), citée
   ici par son identifiant. Tant que Teo ne l'a pas tournée, elle montre la
   vidéo provisoire sous son propre titre. */
const v = video;

const minuscule = (s: string) => s.charAt(0).toLowerCase() + s.slice(1);
const PRINCIPAUX = MODULES_PRINCIPAUX.map((cle) => MODULES.find((m) => m.cle === cle)!);

/* un module métier : la page se termine sur l'ouverture du module */
const metier = (cle: string, page: Omit<PageFormation, "suivant">): PageFormation => ({
  ...page,
  suivant: { titre: `Ouvrir ${MODULES.find((m) => m.cle === cle)?.nom ?? cle}`, href: `${E}/${cle}` },
});

export const PAGES: Record<string, PageFormation> = {
  /* ——— Bien démarrer ——— */
  guide: {
    titre: "Guide de démarrage",
    intro:
      "Omega relance vos impayés, répond à vos demandes et classe vos factures, et c'est toujours vous qui validez. Ce guide vous mène de votre premier accès à votre première validation.",
    video: v("decouvrir-omega"),
    sections: [
      {
        id: "vue-ensemble",
        titre: "Vue d'ensemble et démo",
        niveau: 2,
        blocs: [
          {
            p: `Commencez par la [vue d'ensemble](${E}) : tout ce qui demande votre attention aujourd'hui y tient sur un écran. Sans compte, l'espace montre une entreprise fictive, telle que vous verrez la vôtre.`,
          },
          { p: "Si vous préférez qu'on vous le montre, [réservez un appel](/reserver) : nous faisons le tour de l'espace avec vous et répondons à vos questions." },
        ],
      },
      {
        id: "ouvrir",
        titre: "Ouvrir votre espace",
        niveau: 2,
        blocs: [
          {
            p: `Une fois le contrat signé, vous recevez par e-mail votre lien de connexion. Au premier passage, quatre questions règlent l'espace : [votre première semaine](${F}/premiere-semaine) les détaille.`,
          },
        ],
      },
      {
        id: "meilleur",
        titre: "Tirer le meilleur d'Omega",
        niveau: 3,
        blocs: [
          { sous: "Le dirigeant" },
          {
            liste: [
              `[Lire le point du matin](${E}/point)`,
              `[Valider ce qui attend votre accord](${E}/validations)`,
              `[Suivre l'activité de la semaine](${E}/activite)`,
            ],
          },
          { sous: "L'équipe" },
          { liste: [`[Voir qui a accès à l'espace, et avec quel rôle](${E}/equipe)`] },
        ],
      },
      {
        id: "modules",
        titre: "Les modules",
        niveau: 3,
        blocs: [
          { liste: PRINCIPAUX.map((m) => `[${m.nom}](${F}/${m.cle}) : ${minuscule(m.description)}`) },
          { p: "Le module de votre métier a aussi sa page, dans le panneau de gauche." },
        ],
      },
      {
        id: "garde-fous",
        titre: "Ce qu'Omega ne fait jamais sans vous",
        niveau: 3,
        blocs: [
          {
            p: `Aucun message engageant ne part sans votre accord. Le détail est dans [comment marche Omega](${F}/principes) ; pour le reste, [écrivez-nous](/contact).`,
          },
        ],
      },
    ],
    suivant: { titre: "Comment marche Omega", href: `${F}/principes` },
  },

  principes: {
    titre: "Comment marche Omega",
    intro:
      "Omega prépare, vous décidez. Ses modules lisent ce qui arrive, rédigent ce qu'il faut envoyer et le déposent dans votre espace : rien d'engageant ne part sans un oui de votre part.",
    sections: [
      {
        id: "a-valider",
        titre: "Tout passe par « À valider »",
        niveau: 2,
        video: v("valider-une-demande"),
        blocs: [
          {
            p: `Les virements, les factures, les IBAN et les accords qui attendent une décision arrivent dans [À valider](${E}/validations), classés par échéance : en retard, aujourd'hui, cette semaine, plus tard.`,
          },
          { p: "Sur chaque demande : Approuver, Refuser, Modifier ou Déléguer. Un refus se motive, et plusieurs demandes peuvent se décider d'un coup." },
        ],
      },
      {
        id: "regles",
        titre: "Les règles de décision",
        niveau: 3,
        blocs: [
          {
            liste: [
              "Celui qui a saisi une demande ne peut pas l'approuver : saisie et approbation sont séparées.",
              "Une demande modifiée remplace l'ancienne et repart en validation.",
              "Une demande annulée ne se rouvre pas.",
            ],
          },
        ],
      },
      {
        id: "essai",
        titre: "Le mode essai",
        niveau: 2,
        video: v("mode-essai"),
        blocs: [
          {
            p: "Chaque module est installé en mode essai. Tant que le gérant n'a pas basculé en réel, les messages validés partent vers une adresse d'essai d'Omega, jamais chez vos clients.",
          },
        ],
      },
      {
        id: "arret",
        titre: "Ce qui arrête un envoi",
        niveau: 2,
        blocs: [
          {
            liste: [
              "Un client qui demande à ne plus être contacté ne l'est plus, sur aucun canal.",
              `Dans [CASHD](${F}/cashd), un règlement enregistré arrête les relances de la facture.`,
              `Dans [REPUT](${F}/reput), « Couper l'envoi automatique » remet toutes les réponses en validation.`,
              `Dans [OFFLOAD](${F}/offload), « Suspendre OFFLOAD » arrête les reprises de contact.`,
            ],
          },
          { p: "En cas de doute, Omega peut arrêter tous les envois d'un seul geste : [écrivez-nous](/contact)." },
        ],
      },
      {
        id: "equipe",
        titre: "Qui fait quoi",
        niveau: 2,
        video: v("roles-equipe"),
        blocs: [
          {
            p: `Chaque personne a un rôle : Gérant, Administrateur, Valideur, Collaborateur ou Lecteur. Le rôle fixe ce qu'elle voit et ce qu'elle peut décider ; la liste est dans [Équipe](${E}/equipe).`,
          },
          { p: "Pour ajouter quelqu'un, la personne doit déjà avoir un compte Omega ; sinon, [écrivez-nous](/contact) et nous ouvrons son accès." },
        ],
      },
      {
        id: "donnees",
        titre: "Vos données",
        niveau: 2,
        blocs: [
          {
            p: `Votre espace est chiffré, hébergé dans l'Union européenne et séparé de celui des autres clients. Depuis les [réglages](${E}/reglages), vous exportez votre journal ou toutes vos données à tout moment.`,
          },
        ],
      },
    ],
    suivant: { titre: "Votre première semaine", href: `${F}/premiere-semaine` },
  },

  "premiere-semaine": {
    titre: "Votre première semaine",
    intro: "Les premiers jours, Omega tourne en essai et vous soumet tout. C'est le moment de vérifier ses propositions et de régler l'espace à votre façon.",
    sections: [
      {
        id: "premier-acces",
        titre: "Le premier accès",
        niveau: 2,
        video: v("premier-acces"),
        blocs: [
          { p: "Le lien reçu par e-mail ouvre quatre écrans :" },
          {
            liste: [
              "Votre espace : logo, nom, SIREN et territoire.",
              "Votre métier, et ce qui vous prend le plus de temps : demandes clients, relances d'impayés, documents, avis clients.",
              "Votre messagerie, Google ou Microsoft. Vous pouvez le faire plus tard : nous finalisons la connexion avec vous à l'installation.",
              "Votre équipe. Cette étape peut attendre.",
            ],
          },
        ],
      },
      {
        id: "chaque-jour",
        titre: "Chaque jour",
        niveau: 2,
        blocs: [{ p: "Trois gestes suffisent, dans cet ordre." }],
      },
      {
        id: "point",
        titre: "Lire le point du matin",
        niveau: 3,
        video: v("point-du-matin"),
        blocs: [
          {
            p: `Le [point du matin](${E}/point) arrive à 7 h par défaut, par e-mail ou WhatsApp. Il commence par ce qu'il faut regarder en premier, puis ce qui a bougé depuis la dernière édition. Les sept dernières éditions restent consultables.`,
          },
        ],
      },
      {
        id: "decider",
        titre: "Décider ce qui attend",
        niveau: 3,
        video: v("routine-a-valider"),
        blocs: [{ p: `Ouvrez [À valider](${E}/validations) sur l'onglet « À décider par moi ». Ce qui est en retard est en haut.` }],
      },
      {
        id: "activite",
        titre: "Suivre l'activité",
        niveau: 3,
        blocs: [
          {
            p: `[L'activité](${E}/activite) montre ce qui s'est passé, et [Automatisations](${E}/automatisations) chaque passage d'un module, ligne par ligne.`,
          },
        ],
      },
      {
        id: "rodage",
        titre: "Pendant le rodage",
        niveau: 2,
        blocs: [
          {
            p: `Les premières semaines, tout vous est soumis. Relisez chaque proposition et corrigez-la dès qu'elle ne vous ressemble pas. Quand un type de réponse vous convient, vous pouvez l'autoriser à partir seul, sujet par sujet, dans [REPUT](${F}/reput).`,
          },
          { p: "Pour passer en réel, c'est le gérant qui bascule : tant qu'il ne l'a pas fait, rien ne part chez vos clients." },
        ],
      },
    ],
    suivant: { titre: "FILED", href: `${F}/filed` },
  },

  /* ——— Les modules ——— */
  filed: {
    titre: "FILED",
    intro: "FILED lit chaque pièce qui arrive, recoupe ses montants et la classe jusqu'au dossier de votre comptabilité. Vous décidez de ce qui est payé.",
    sections: [
      {
        id: "ecrans",
        titre: "Les écrans",
        niveau: 2,
        video: v("filed-facture-arrive"),
        blocs: [
          {
            liste: [
              `[Documents reçus](${E}/filed) : le tableau de bord, et chaque pièce avec son dossier.`,
              `[Boîte de réception](${E}/filed/boite) : les e-mails reçus, nouveaux ou déjà lus.`,
              `[À payer](${E}/filed/a-payer) : les factures validées, par échéance.`,
              `[Fournisseurs](${E}/filed/fournisseurs) : à confirmer, IBAN à valider, actifs, bloqués.`,
              `[Comptabilité](${E}/filed/comptabilite) : le FEC et les comptes.`,
              `[Contrôles et fraude](${E}/filed/controles) : ce qui bloque, et ce qui est à vérifier.`,
              `[Circuit de validation](${E}/filed/circuit) : qui approuve quoi.`,
              `[Refusées](${E}/filed/refusees) : les pièces à corriger, ou impossibles à reprendre.`,
            ],
          },
          { p: "Dans une pièce, cliquez sur une valeur lue : elle se surligne dans le document." },
        ],
      },
      {
        id: "arrivee",
        titre: "Ce qui arrive",
        niveau: 2,
        blocs: [],
      },
      {
        id: "deposer",
        titre: "Déposer un document",
        niveau: 3,
        video: v("filed-deposer"),
        blocs: [{ p: "« Déposer un document » ajoute une pièce à la main. Elle reçoit un numéro, est lue, puis contrôlée comme tout document reçu." }],
      },
      {
        id: "boite",
        titre: "Trier la boîte de réception",
        niveau: 3,
        video: v("filed-boite"),
        blocs: [{ p: `Dans la [boîte de réception](${E}/filed/boite), un e-mail se marque comme lu, ou s'écarte s'il n'apporte aucune pièce.` }],
      },
      {
        id: "dossier",
        titre: "Dans le dossier d'une facture",
        niveau: 2,
        video: v("filed-dossier-facture"),
        blocs: [{ p: "Tous les gestes sur une facture partent de son dossier. La pièce d'origine reste consultable telle qu'elle est arrivée." }],
      },
      {
        id: "corriger",
        titre: "Corriger une valeur",
        niveau: 3,
        video: v("filed-corriger"),
        blocs: [
          {
            p: "« Corriger une valeur » rectifie un montant, une échéance ou un numéro mal lu ; une valeur dont FILED n'est pas sûr se confirme. Chaque correction crée une nouvelle version de la facture, et les contrôles sont rejoués.",
          },
        ],
      },
      {
        id: "litige",
        titre: "Ouvrir un litige",
        niveau: 3,
        video: v("filed-litige"),
        blocs: [{ p: "« Ouvrir un litige » signale une facture contestée auprès du fournisseur ; « Clore le litige » la libère une fois l'affaire réglée." }],
      },
      {
        id: "commande",
        titre: "Rattacher une commande",
        niveau: 3,
        video: v("filed-commande"),
        blocs: [{ p: "« Désigner une commande » rattache la facture à sa commande, puis chaque ligne s'apparie à la sienne." }],
      },
      {
        id: "fournisseurs",
        titre: "Vos fournisseurs",
        niveau: 2,
        video: v("filed-fournisseur"),
        blocs: [
          {
            p: `Un fournisseur naît de sa première facture et attend d'être confirmé dans [Fournisseurs](${E}/filed/fournisseurs). La personne qui a déposé la pièce ne peut pas confirmer elle-même : une autre le fait, en disant ce qu'elle a vérifié.`,
          },
          { p: `Un IBAN proposé part dans [À valider](${E}/validations) : une personne habilitée l'approuve avant tout paiement.` },
        ],
      },
      {
        id: "payer",
        titre: "Payer et comptabiliser",
        niveau: 2,
        blocs: [],
      },
      {
        id: "a-payer",
        titre: "Payer",
        niveau: 3,
        video: v("filed-payer"),
        blocs: [{ p: `Une facture validée arrive dans [À payer](${E}/filed/a-payer), par échéance. « Noter un paiement » enregistre son règlement.` }],
      },
      {
        id: "comptabilite",
        titre: "Transmettre à la comptabilité",
        niveau: 3,
        video: v("filed-comptabilite"),
        blocs: [
          {
            p: `« Transmettre à la comptabilité » passe l'écriture d'une facture validée. [Comptabilité](${E}/filed/comptabilite) montre le hors-taxes, la TVA déductible, et « Exporter le FEC » sort le fichier des écritures pour votre expert-comptable.`,
          },
        ],
      },
      {
        id: "garde-fous",
        titre: "Les garde-fous",
        niveau: 2,
        video: v("filed-controles"),
        blocs: [
          {
            liste: [
              `Le HT, la TVA et le TTC sont recoupés : si le compte ne tombe pas juste, la pièce est mise de côté dans [Contrôles et fraude](${E}/filed/controles). Un contrôle ne se lève qu'avec un motif.`,
              "Un IBAN proposé doit être validé par une personne habilitée avant tout paiement.",
              "Une correction crée une nouvelle version de la facture, et les contrôles sont rejoués.",
              "Une écriture transmise ne se modifie plus, et aucune pièce n'est effacée.",
            ],
          },
        ],
      },
      {
        id: "circuit",
        titre: "Le circuit de validation",
        niveau: 3,
        video: v("filed-circuit"),
        blocs: [
          {
            p: `Le [circuit](${E}/filed/circuit) dit qui approuve une facture, une anomalie à lever ou un IBAN. Ses règles se lisent de haut en bas, la première qui correspond l'emporte. Une absence se couvre par une délégation datée, depuis « À valider ».`,
          },
        ],
      },
      {
        id: "refusees",
        titre: "Les factures refusées",
        niveau: 3,
        video: v("filed-refusees"),
        blocs: [
          {
            p: `Une facture refusée arrive dans [Refusées](${E}/filed/refusees) avec sa raison. Corrigée dans les 24 h qui suivent le refus, elle est reprise ; sinon elle se classe sans suite, ou le fournisseur envoie une facture rectificative.`,
          },
        ],
      },
    ],
    suivant: { titre: "CASHD", href: `${F}/cashd` },
  },

  cashd: {
    titre: "CASHD",
    intro: "CASHD suit qui vous doit, depuis quand, et où en est chaque relance. Chaque matin, les relances du jour sont déjà rédigées ; vous décidez si elles partent.",
    sections: [
      {
        id: "ecrans",
        titre: "Les écrans",
        niveau: 2,
        video: v("cashd-tableau-de-bord"),
        blocs: [
          {
            liste: [
              `[Tableau de bord](${E}/cashd) : vos débiteurs par état, en retard, en litige, en pause, à jour.`,
              `[Débiteurs et relances](${E}/cashd/suivi) : chaque compte, chaque relance, et la file des envois.`,
              `[Balance âgée](${E}/cashd/balance) : ce qui est dû, par ancienneté, exportable vers un tableur.`,
              `[Litiges et pauses](${E}/cashd/litiges), [risque client](${E}/cashd/risque), [devis sans réponse](${E}/cashd/devis) et [encaissements](${E}/cashd/encaissements).`,
            ],
          },
        ],
      },
      {
        id: "calendrier",
        titre: "Le calendrier des relances",
        niveau: 2,
        blocs: [
          {
            liste: [
              "Après 7 jours, un rappel courtois.",
              "Après 21 jours, une relance ferme.",
              "Après 30 jours, une mise en demeure est préparée ; elle ne part jamais seule.",
              "Un devis sans réponse est relancé après 3 jours, puis après 7.",
            ],
          },
        ],
      },
      {
        id: "valider",
        titre: "Valider les relances du jour",
        niveau: 3,
        video: v("cashd-valider-relance"),
        blocs: [
          {
            p: `Chaque relance rédigée attend votre accord dans [À valider](${E}/validations). Une fois approuvée, elle passe à « Validée, à envoyer ». Un compte ne reçoit jamais deux fois le même message.`,
          },
        ],
      },
      {
        id: "textes",
        titre: "Retoucher vos textes de relance",
        niveau: 3,
        video: v("cashd-textes-relance"),
        blocs: [
          {
            p: `Dans [Débiteurs et relances](${E}/cashd/suivi), le menu « … » ouvre « Vos textes de relance » : un texte par palier. Les relances suivantes partent du texte modifié ; celles déjà rédigées ne changent pas.`,
          },
        ],
      },
      {
        id: "gestes",
        titre: "Quand un client paie, conteste ou discute",
        niveau: 2,
        blocs: [{ p: "Ces gestes se font depuis le compte du débiteur, sur la facture concernée. Chacun est daté dans le journal." }],
      },
      {
        id: "reglement",
        titre: "Noter un règlement",
        niveau: 3,
        video: v("cashd-noter-reglement"),
        blocs: [
          { p: "« Noter un règlement » enregistre le montant, le mode (virement, chèque, prélèvement, carte, espèces) et une référence. Les relances de la facture s'arrêtent." },
        ],
      },
      {
        id: "echeancier",
        titre: "Poser un échéancier",
        niveau: 3,
        video: v("cashd-echeancier"),
        blocs: [
          { p: "« Échéancier » propose trois échéances, que vous ajustez avant de noter le motif ; elles doivent totaliser le reste dû. L'échéancier remplace l'échéance d'origine : seule une échéance manquée relance le cycle." },
        ],
      },
      {
        id: "litige",
        titre: "Mettre une facture en litige",
        niveau: 3,
        video: v("cashd-litige"),
        blocs: [
          {
            p: `« Mettre en litige » arrête les relances de la facture ; « Contestation partielle » sort la part contestée du cycle et continue de relancer le reste. Les litiges en cours sont dans [Litiges et pauses](${E}/cashd/litiges), où l'on clôt chacun une fois réglé.`,
          },
        ],
      },
      {
        id: "pause",
        titre: "Mettre un compte en pause",
        niveau: 3,
        video: v("cashd-pause"),
        blocs: [{ p: "« Mettre en pause » arrête toutes les relances d'un client le temps d'une discussion ; « Reprendre les relances » se motive, et les relances repartent au palier où elles en étaient." }],
      },
      {
        id: "reponse",
        titre: "Traiter une réponse reçue",
        niveau: 3,
        video: v("cashd-reponse-recue"),
        blocs: [
          { p: "Quand un client répond à une relance, elle passe à « Réponse à trancher » et CASHD propose une lecture : contestation, règlement annoncé ou contact parti. « Accepter » applique la proposition (litige, pause le temps du règlement, attente d'un nouveau contact) ; « Écarter » ne change rien." },
        ],
      },
      {
        id: "devis",
        titre: "Les devis sans réponse",
        niveau: 3,
        video: v("cashd-devis"),
        blocs: [
          {
            p: `Les [devis sans réponse](${E}/cashd/devis) sont relancés comme les factures. Si le client a dit oui au téléphone, « Accord de vive voix » arrête leurs relances.`,
          },
        ],
      },
      {
        id: "suivre",
        titre: "Suivre et tenir à jour",
        niveau: 2,
        blocs: [],
      },
      {
        id: "balance",
        titre: "La balance âgée",
        niveau: 3,
        video: v("cashd-balance"),
        blocs: [
          { p: `La [balance âgée](${E}/cashd/balance) range ce qui vous est dû par ancienneté. « Exporter la balance » la transmet à un tableur, pour votre comptable ou votre banque.` },
        ],
      },
      {
        id: "export",
        titre: "Déposer un export du facturier",
        niveau: 3,
        video: v("cashd-deposer-export"),
        blocs: [
          {
            p: "Si votre logiciel de facturation n'est pas branché, « Déposer un export du facturier » (menu « … » de Débiteurs et relances) met CASHD à jour avec ses factures et ses paiements.",
          },
        ],
      },
      {
        id: "garde-fous",
        titre: "Les garde-fous",
        niveau: 2,
        video: v("cashd-qui-valide"),
        blocs: [
          {
            liste: [
              "Un règlement enregistré arrête les relances de la facture.",
              "Qui valide dépend du montant. Par défaut : tout valideur jusqu'à 2 000 €, un administrateur ou le gérant au-delà, le gérant seul à partir de 10 000 €.",
              `Un plafond d'encours fixé sur un client, dans [risque client](${E}/cashd/risque), est daté dans le journal.`,
              "En mode essai, les relances validées partent vers l'adresse d'essai d'Omega, jamais chez vos clients.",
            ],
          },
        ],
      },
    ],
    suivant: { titre: "REPUT", href: `${F}/reput` },
  },

  reput: {
    titre: "REPUT",
    intro: "REPUT reçoit les demandes de vos clients et prépare les réponses. Il ne dit rien que vous n'ayez validé, et ce qu'il ne sait pas, il vous le transfère.",
    sections: [
      {
        id: "ecrans",
        titre: "Les écrans",
        niveau: 2,
        video: v("reput-demandes"),
        blocs: [
          {
            liste: [
              `[Demandes](${E}/reput) : chaque demande, et la réponse préparée.`,
              `[Base de connaissances](${E}/reput/base) : les fiches dont il se sert, en vigueur, en brouillon ou à revoir.`,
              `[Sujets autorisés](${E}/reput/sujets) : ce qui est toujours relu, et ce qui peut partir seul.`,
              `[Réglages et avis](${E}/reput/reglages) : signature, mention de la réponse automatisée, accusé de réception, demandes d'avis.`,
              `[Urgences et escalade](${E}/reput/urgences) : urgences, réclamations, demandes à reprendre.`,
            ],
          },
        ],
      },
      {
        id: "gestes",
        titre: "Ce que vous faites",
        niveau: 2,
        blocs: [],
      },
      {
        id: "repondre",
        titre: "Répondre",
        niveau: 3,
        video: v("reput-repondre"),
        blocs: [{ p: "Sur une demande : « Valider et envoyer », « Corriger la réponse » ou « Refuser la réponse » ; un refus se motive et la demande vous revient." }],
      },
      {
        id: "base",
        titre: "Tenir la base à jour",
        niveau: 3,
        video: v("reput-base"),
        blocs: [
          {
            p: `REPUT ne répond qu'avec votre [base de connaissances](${E}/reput/base). « Nouvelle fiche » crée un brouillon ; « Valider et mettre en vigueur » le fait citer dès la prochaine réponse ; une fiche retirée ne sert plus. Une question hors de la base vous est transférée.`,
          },
        ],
      },
      {
        id: "sujets",
        titre: "Laisser partir seul",
        niveau: 3,
        video: v("reput-partir-seul"),
        blocs: [
          {
            p: `Dans [Sujets autorisés](${E}/reput/sujets), « Autoriser l'envoi seul » laisse partir sans relecture les réponses tirées de votre base sur ce sujet. « Couper l'envoi automatique » remet toutes les réponses en validation ; il faut en donner le motif.`,
          },
          { p: "Un sujet peut aussi être confié à un service : seuls ses membres valident alors ses réponses." },
        ],
      },
      {
        id: "urgences",
        titre: "Urgences et réclamations",
        niveau: 2,
        video: v("reput-urgences"),
        blocs: [
          {
            liste: [
              "Une urgence, une réclamation, un client en litige ou une personne qui demande à parler à quelqu'un ne reçoivent jamais de réponse automatique : la demande revient à une personne.",
              "Chaque sujet porte le délai que vous avez fixé : par exemple une heure pour une urgence, quatre pour une réclamation. Passé ce délai, la demande remonte au responsable.",
              "Par défaut, personne n'est appelé hors horaires : le client reçoit tout de suite une réponse avec vos horaires, et son urgence passe en tête à l'ouverture.",
            ],
          },
        ],
      },
      {
        id: "garde-fous",
        titre: "Les garde-fous",
        niveau: 2,
        video: v("reput-reglages"),
        blocs: [
          {
            liste: [
              `Chaque réponse préparée porte une mention qui dit qu'elle vient d'un assistant ; vous en choisissez le texte dans les [réglages](${E}/reput/reglages).`,
              "Un accusé de réception part dans la minute.",
              "Une demande d'avis part trois jours après le règlement, avec deux relances au plus, pas plus d'une fois en six mois, et sans tri des clients mécontents.",
              "Les premières semaines, tout vous est soumis.",
            ],
          },
        ],
      },
    ],
    suivant: { titre: "OFFLOAD", href: `${F}/offload` },
  },

  offload: {
    titre: "OFFLOAD",
    intro: "OFFLOAD relit votre base clients chaque matin et vous dit à qui écrire : ceux qui ralentissent, qui décrochent ou qui se sont tus.",
    sections: [
      {
        id: "ecrans",
        titre: "Les écrans",
        niveau: 2,
        video: v("offload-comptes-risque"),
        blocs: [
          {
            liste: [
              `[Comptes à risque](${E}/offload) : chaque client par niveau, régulier, ralentit, saison manquée, décroche, s'est tu.`,
              `[Échéances et renouvellements](${E}/offload/echeances), [affaires restées en plan](${E}/offload/affaires) et [groupes clients](${E}/offload/groupes).`,
              `[Garde-fous](${E}/offload/garde-fous) : vos règles, et l'arrêt d'OFFLOAD.`,
              `[Pilotage](${E}/offload/pilotage) : les reprises, les réponses et le chiffre repris.`,
            ],
          },
        ],
      },
      {
        id: "gestes",
        titre: "Ce que vous faites",
        niveau: 2,
        blocs: [],
      },
      {
        id: "reprise",
        titre: "Préparer une reprise",
        niveau: 3,
        video: v("offload-reprise"),
        blocs: [
          {
            p: "« Préparer une nouvelle reprise » : le message part en validation, et une tâche d'appel est créée. Un compte se reprend aussi en main, ou se remet dans le cycle, en donnant le motif.",
          },
        ],
      },
      {
        id: "echeances",
        titre: "Les échéances",
        niveau: 3,
        video: v("offload-echeances"),
        blocs: [
          {
            p: `Dans [Échéances et renouvellements](${E}/offload/echeances), le message de la semaine qui précède attend votre validation. « Noter une intervention » date l'échéance suivante depuis l'intervention.`,
          },
        ],
      },
      {
        id: "affaires",
        titre: "Les affaires restées en plan",
        niveau: 3,
        video: v("offload-affaires"),
        blocs: [
          {
            p: `Dans les [affaires restées en plan](${E}/offload/affaires), glissez une affaire sur « En attente » pour relancer encore (un nouveau message est préparé, en validation), ou sur « Closes sans suite ».`,
          },
        ],
      },
      {
        id: "groupes",
        titre: "Les groupes clients",
        niveau: 3,
        video: v("offload-groupes"),
        blocs: [
          {
            p: `Les [groupes clients](${E}/offload/groupes) réunissent les entités d'un même client, par la colonne « groupe » de votre export ou par rattachement. Le plafond de sollicitation vaut alors pour tout le groupe.`,
          },
        ],
      },
      {
        id: "garde-fous",
        titre: "Les garde-fous",
        niveau: 2,
        video: v("offload-garde-fous"),
        blocs: [
          {
            liste: [
              "Sans règle de votre part, les messages restent sans prix ni délai, toujours au vouvoiement. Une règle s'écrit en une phrase ; OFFLOAD répond ce qu'il en fera, et retient tout message qui l'enfreint.",
              "Une réponse du client arrête la séquence.",
              "OFFLOAD s'arrête seul au-delà de 20 % de messages non remis sur 7 jours, ou si deux messages visent la même adresse ; seul le gérant ou un administrateur le relance.",
              "« Suspendre OFFLOAD » arrête toutes les reprises.",
              "En mode essai, rien ne part chez le client.",
            ],
          },
        ],
      },
    ],
    suivant: { titre: "Votre espace au quotidien", href: `${F}/espace` },
  },

  /* ——— votre espace au quotidien, et le Réseau (lot 4, 03/11/2026) ——— */
  espace: {
    titre: "Votre espace au quotidien",
    intro: "Au-delà de vos systèmes, l'espace porte votre équipe, vos délégations, votre activité, vos tâches et votre carnet. Voici les gestes de tous les jours.",
    sections: [
      {
        id: "accueil",
        titre: "La vue d'ensemble",
        niveau: 2,
        video: v("espace-accueil"),
        blocs: [{ p: `La [vue d'ensemble](${E}) montre les factures reçues, ce qu'il faut payer en priorité, les tâches du jour et l'activité récente ; « Voir tout » ouvre l'écran complet.` }],
      },
      {
        id: "delegation",
        titre: "Déléguer pendant une absence",
        niveau: 2,
        video: v("espace-delegation"),
        blocs: [{ p: `Dans [À valider](${E}/validations), « Déléguer » fait décider une personne en votre nom, sur un module ou sur tous, jusqu'à une date. On ne se désigne pas soi-même. « Révoquer » y met fin ; les décisions déjà prises restent valables.` }],
      },
      {
        id: "equipe",
        titre: "Gérer l'équipe",
        niveau: 2,
        video: v("espace-equipe"),
        blocs: [{ p: `Dans [Équipe](${E}/equipe), seuls le gérant et les administrateurs agissent. « Inviter » ajoute une personne qui a déjà un compte Omega ; le menu d'une personne change son rôle, ses sociétés visibles, ou la retire. Personne ne change son propre rôle.` }],
      },
      {
        id: "activite",
        titre: "Activité et automatisations",
        niveau: 2,
        video: v("espace-activite"),
        blocs: [{ p: `[L'activité](${E}/activite) se filtre par période, par type et par mot ; [Automatisations](${E}/automatisations) montre chaque passage d'un système, par état. Les deux se consultent : rien ne s'y décide.` }],
      },
      {
        id: "taches",
        titre: "Les tâches",
        niveau: 2,
        video: v("espace-taches"),
        blocs: [{ p: `Dans [Tâches](${E}/taches), « Nouvelle tâche » (ou la touche C) crée une tâche avec statut, priorité, échéance. Pour l'instant, les tâches sont gardées sur cet appareil : vos collègues ne les voient pas encore.` }],
      },
      {
        id: "carnet",
        titre: "Contacts, notes et appels",
        niveau: 2,
        video: v("espace-carnet"),
        blocs: [{ p: `[Appels](${E}/appels), [Contacts](${E}/contacts), [Entreprises](${E}/entreprises) et [Notes](${E}/notes) gardent votre carnet : un appel se note, se suit à une date, se clôt. Pour l'instant, ces fiches sont enregistrées sur cet appareil, pas encore partagées avec l'équipe.` }],
      },
      {
        id: "utilisation",
        titre: "Utilisation et carte",
        niveau: 2,
        video: v("espace-utilisation"),
        blocs: [{ p: `[Utilisation](${E}/utilisation) mesure ce que l'espace a traité sur une période ; la [carte](${E}/carte) montre le circuit, des sources aux résultats. Rien ne s'y décide.` }],
      },
      {
        id: "reglages",
        titre: "Réglages et vos données",
        niveau: 2,
        video: v("espace-reglages"),
        blocs: [{ p: `Dans les [réglages](${E}/reglages), « Afficher la base réelle » passe de l'entreprise d'exemple à vos données. « Exporter toutes mes données » produit une archive chiffrée, avec un lien valable 24 heures et un mot de passe montré une seule fois.` }],
      },
    ],
    suivant: { titre: "Le Réseau Omega", href: `${F}/reseau` },
  },

  reseau: {
    titre: "Le Réseau Omega",
    intro: "Le Réseau Omega met les entreprises clientes d'Omega en relation : demandes et alertes du terrain, annuaire vérifié, messages, mises en relation et achats groupés. Il ouvre bientôt.",
    video: v("reseau-apercu"),
    sections: [
      {
        id: "ecrans",
        titre: "Ses quatre écrans",
        niveau: 2,
        blocs: [
          {
            liste: [
              `[Fil](${E}/reseau) : les demandes et les alertes terrain des membres, par île et par secteur.`,
              `[Membres](${E}/reseau/membres) : l'annuaire des membres, avec des badges vérifiés par la donnée.`,
              `[Messages](${E}/reseau/messages) : les messages privés et les sujets des salons, par île et par secteur.`,
              `[Opportunités](${E}/reseau/opportunites) : les mises en relation, les groupements de marchés publics et les achats groupés.`,
            ],
          },
        ],
      },
      {
        id: "aujourdhui",
        titre: "Aujourd'hui",
        niveau: 2,
        blocs: [
          { p: "Le réseau ouvre bientôt : aucune entreprise n'y est encore inscrite. Avec vos données, ses écrans l'indiquent ; « Voir les données d'exemple » montre à quoi il ressemblera." },
          { p: "Dans les données d'exemple, les gestes (publier, répondre, écrire, accepter une mise en relation) restent dans la page : rien n'est envoyé ni enregistré." },
        ],
      },
      {
        id: "garde-fous",
        titre: "Les garde-fous",
        niveau: 2,
        blocs: [
          {
            liste: [
              "Rien n'est partagé avec le réseau tant que vous n'avez pas donné votre accord.",
              "Vous choisissez, champ par champ, ce que votre fiche montre aux autres membres.",
              "Une mise en relation ne part pas sans votre accord.",
            ],
          },
        ],
      },
    ],
    suivant: { titre: "Revenir à l'accueil de la formation", href: F },
  },

  /* ——— les modules métier : le panneau ne montre que celui de l'entreprise ——— */
  daliro: metier("daliro", {
    titre: "DALIRO",
    intro: "DALIRO suit vos chantiers : le marché vérifié ligne à ligne, les travaux supplémentaires chiffrés sur vos prix et signés avant exécution, les passages confirmés à J-2.",
    sections: [
      {
        id: "ecrans",
        titre: "Les écrans",
        niveau: 2,
        blocs: [
          {
            liste: [
              `[Vue d'ensemble](${E}/daliro) : vos chantiers et ce qui demande votre attention.`,
              `[Chantiers](${E}/daliro/chantiers) : chaque chantier sur une frise : dates, santé, avancement, prochain passage ; la fiche d'un chantier porte ses lots, son planning, son argent, le fil du terrain et la réception.`,
              `[À ranger](${E}/daliro/a-ranger) : les photos, vocaux et messages du terrain sans chantier.`,
              `[À faire](${E}/daliro/a-faire) : les passages à confirmer ou à noter faits, les avenants à signer, les situations à soumettre.`,
              `[Avenants et situations](${E}/daliro/avenants) : les avenants à chiffrer, à signer et signés, les situations de travaux.`,
              `[Approvisionnement](${E}/daliro/approvisionnement) : ce qu'il faut commander, les livraisons attendues, le matériel à rendre.`,
              `[Annuaire](${E}/daliro/annuaire) : les entreprises de vos chantiers, en lecture.`,
              `[Équipes](${E}/daliro/equipes) : les passages des équipes et sous-traitants, leurs confirmations à J-2, leurs absences.`,
              `[Réglages](${E}/daliro/reglages) : la bibliothèque de prix et l'organisation.`,
            ],
          },
        ],
      },
      { id: "gestes", titre: "Ce que vous faites", niveau: 2, blocs: [] },
      {
        id: "chantier",
        titre: "Créer et ouvrir un chantier",
        niveau: 3,
        video: v("daliro-chantier"),
        blocs: [{ p: `« Nouveau chantier » crée un chantier en préparation : le département, le territoire et le régime de TVA se déduisent du code postal. Une fois ses lots et son marché posés, « Ouvrir le chantier » le lance ; il faut pour cela un maître d'ouvrage désigné, qui signera les avenants.` }],
      },
      {
        id: "ranger",
        titre: "Ranger un message du terrain",
        niveau: 3,
        video: v("daliro-ranger"),
        blocs: [{ p: `Dans [À ranger](${E}/daliro/a-ranger), la pastille « Chantier » range un message dans son chantier. « Écarter le message » le sort de la file sans le ranger ; il reste au journal.` }],
      },
      {
        id: "avenant",
        titre: "Ouvrir et chiffrer un avenant",
        niveau: 3,
        video: v("daliro-avenant"),
        blocs: [{ p: `« Ajouter un avenant » fait d'un message l'origine d'un avenant en brouillon, sur un chantier en cours. Chaque ligne se chiffre sur un prix validé de la bibliothèque. « Soumettre à la signature » envoie une demande de validation dans [À valider](${E}/validations) : celui qui a chiffré ne décide pas.` }],
      },
      {
        id: "signer",
        titre: "Signer un avenant",
        niveau: 3,
        video: v("daliro-signer"),
        blocs: [{ p: `Un avenant approuvé se signe depuis la fiche du chantier, onglet Argent : ses travaux entrent alors dans l'engagé du lot. « Faire signer sur place » prépare un lien à usage unique que le client signe du doigt.` }],
      },
      {
        id: "passages",
        titre: "Confirmer les passages à J-2",
        niveau: 3,
        video: v("daliro-passages"),
        blocs: [{ p: `Dans [Équipes](${E}/daliro/equipes), « Noter la réponse » inscrit au fil la confirmation d'un sous-traitant. Un passage décliné propose des remplaçants et prévient le conducteur. « Relancer le sous-traitant » ne part jamais sans vous.` }],
      },
      {
        id: "planning",
        titre: "Noter un passage fait, recaler la suite",
        niveau: 3,
        video: v("daliro-planning"),
        blocs: [{ p: `« Noter fait » clôt un passage ; « Recaler » décale la suite en jours ouvrés, chaque passage gardant sa durée. Dans [À faire](${E}/daliro/a-faire), plusieurs passages se notent faits d'un coup.` }],
      },
      {
        id: "absence",
        titre: "Noter une absence",
        niveau: 3,
        video: v("daliro-absence"),
        blocs: [{ p: `« Noter une absence » retire ces jours des propositions pour ce sous-traitant.` }],
      },
      {
        id: "prix",
        titre: "La bibliothèque de prix",
        niveau: 3,
        video: v("daliro-prix"),
        blocs: [{ p: `Dans les [réglages](${E}/daliro/reglages), « Poser un prix » enrichit la bibliothèque ; un prix proposé pendant un chiffrage s'y valide. Un nouveau prix validé pour la même désignation retire l'ancien.` }],
      },
      {
        id: "garde-fous",
        titre: "Les garde-fous",
        niveau: 2,
        blocs: [
          {
            liste: [
              "Un avenant se soumet avec au moins une ligne chiffrée, et celui qui l'a chiffré ne le signe pas.",
              "Un avenant ne se signe qu'après son approbation dans « À valider ».",
              "Un chantier ne s'ouvre qu'avec un maître d'ouvrage désigné.",
              "Une relance de sous-traitant ne part jamais sans vous.",
              "Seule une personne autorisée valide les prix de la bibliothèque.",
            ],
          },
        ],
      },
    ],
  }),

  lorani: metier("lorani", {
    titre: "LORANI",
    intro: "LORANI suit chacun de vos permis jusqu'à la purge des recours : délai d'instruction, pièces réclamées, décision tacite, affichage, recours des tiers.",
    sections: [
      {
        id: "ecrans",
        titre: "Les écrans",
        niveau: 2,
        blocs: [
          {
            liste: [
              `[Vue d'ensemble](${E}/lorani) : le calendrier des permis : à confirmer, pièces à fournir, en instruction, accordé, clos.`,
              `[Courrier à ranger](${E}/lorani/courrier) : les dates lues sur les courriers de la mairie, à confirmer ou à écarter.`,
              `[Questions et réponses](${E}/lorani/questions) : les questions posées aux entreprises et aux bureaux d'études, suivies jusqu'à la réponse.`,
              `[À viser](${E}/lorani/a-viser) : les situations et documents à viser, les réserves à lever, les décennales qui expirent.`,
              `[Réglages](${E}/lorani/reglages) : par projet : l'équipe, les lots, le régime de chaque permis, qui décide.`,
            ],
          },
        ],
      },
      { id: "gestes", titre: "Ce que vous faites", niveau: 2, blocs: [] },
      {
        id: "projet",
        titre: "Créer un projet et son permis",
        niveau: 3,
        video: v("lorani-projet"),
        blocs: [{ p: `« Nouveau projet » ouvre un projet ; le lieu du terrain fixe les règles. « Nouveau permis » y ajoute un permis, dont le type fixe le délai de droit commun : un mois pour une déclaration préalable, deux pour une maison, trois pour les autres.` }],
      },
      {
        id: "courrier",
        titre: "Déposer un courrier de la mairie",
        niveau: 3,
        video: v("lorani-courrier"),
        blocs: [{ p: `« Déposer un courrier de la mairie » fait lire un récépissé, une lettre de délai, une demande de pièces, un arrêté ou un constat d'affichage. LORANI propose la date lue, à confirmer.` }],
      },
      {
        id: "confirmer",
        titre: "Confirmer une date lue",
        niveau: 3,
        video: v("lorani-confirmer"),
        blocs: [{ p: `Dans [Courrier à ranger](${E}/lorani/courrier), « Confirmer » valide la date lue (corrigée au besoin) et recalcule le calendrier ; « Écarter » l'abandonne, motif au journal.` }],
      },
      {
        id: "tacite",
        titre: "Confirmer une décision tacite",
        niveau: 3,
        video: v("lorani-tacite"),
        blocs: [{ p: `Une décision implicite se confirme, elle ne se saisit pas : le système la date. Il reste à afficher le permis et à saisir le premier jour d'affichage.` }],
      },
      {
        id: "evenement",
        titre: "Saisir ce qui arrive sur un permis",
        niveau: 3,
        video: v("lorani-evenement"),
        blocs: [{ p: `Sur la page d'un permis, « Copier ou saisir ce qui est arrivé » note un dépôt, une demande de pièces, un arrêté, l'affichage ou un recours. Le premier jour d'affichage ouvre les deux mois de recours des tiers.` }],
      },
      {
        id: "questions",
        titre: "Suivre une question",
        niveau: 3,
        video: v("lorani-questions"),
        blocs: [{ p: `Dans [Questions et réponses](${E}/lorani/questions), une question est suivie jusqu'à la réponse ; sans réponse au bout de huit jours, elle remonte au point du matin. Rien n'est envoyé au destinataire ; une relance s'ouvre dans votre messagerie.` }],
      },
      {
        id: "viser",
        titre: "Viser une situation, lever une réserve",
        niveau: 3,
        video: v("lorani-viser"),
        blocs: [{ p: `Dans [À viser](${E}/lorani/a-viser), « Viser » ou « Rectifier » une situation, rendre un avis (VSO, VAO, refusé) sur un document, ou « Lever » une réserve.` }],
      },
      {
        id: "export",
        titre: "Exporter le dossier daté",
        niveau: 3,
        video: v("lorani-export"),
        blocs: [{ p: `« Exporter le dossier daté » (options du projet) produit le registre en PDF et Excel, dans une archive.` }],
      },
      {
        id: "garde-fous",
        titre: "Les garde-fous",
        niveau: 2,
        blocs: [
          {
            liste: [
              "Rien de ce que LORANI lit n'est appliqué sans votre confirmation.",
              "Une décision tacite se confirme ; elle est datée par le système, jamais saisie à la main.",
              "Un permis n'est purgé que lorsque l'issue de chaque recours est saisie.",
              "Aucune question n'est envoyée à une entreprise à votre place.",
            ],
          },
        ],
      },
    ],
  }),

  tavaro: metier("tavaro", {
    titre: "TAVARO",
    intro: "TAVARO chiffre les retours de location sur votre barème et prépare les factures. L'agence valide ou refuse chaque facture, et aucune ne part sans cette validation.",
    sections: [
      {
        id: "ecrans",
        titre: "Les écrans",
        niveau: 2,
        blocs: [
          {
            liste: [
              `[Vue d'ensemble](${E}/tavaro) : les contrats de location, les retours chiffrés et les factures.`,
              `[Retours à facturer](${E}/tavaro/retours) : les retours à chiffrer, les propositions devant l'agence, les factures bloquées ; un contrat s'ouvre à droite.`,
              `[Parc et atelier](${E}/tavaro/parc) : les véhicules à remettre en location, immobilisés ou en entretien.`,
              `[Amendes](${E}/tavaro/amendes) : les avis de contravention à désigner sous 45 jours.`,
              `[Pilotage](${E}/tavaro/pilotage) : part facturée et délais, par agence.`,
              `[Réglages](${E}/tavaro/reglages) : le barème, les règles et les responsables.`,
            ],
          },
        ],
      },
      { id: "gestes", titre: "Ce que vous faites", niveau: 2, blocs: [] },
      {
        id: "retours",
        titre: "Voir ce qui attend",
        niveau: 3,
        video: v("tavaro-retours"),
        blocs: [{ p: `Dans [Retours à facturer](${E}/tavaro/retours), filtrez par famille (à chiffrer, à valider, bloqués) et par agence ; un contrat s'ouvre à droite.` }],
      },
      {
        id: "etat-lieux",
        titre: "L'état des lieux signé",
        niveau: 3,
        video: v("tavaro-etat-lieux"),
        blocs: [{ p: `« Faire l'état de départ » puis « Signer l'état des lieux » : une empreinte du contenu signé est gardée, l'état ne change plus. Sans signature du client, l'état se clôt avec un motif ; les dommages iront alors à la direction, hors barème.` }],
      },
      {
        id: "retour",
        titre: "Chiffrer un retour",
        niveau: 3,
        video: v("tavaro-retour"),
        blocs: [{ p: `« Chiffrer le retour » compare les dommages relevés à l'état de départ et chiffre chaque poste sur le barème. La facture est proposée à l'agence ; sans preuve, aucune facture ne part.` }],
      },
      {
        id: "valider",
        titre: "Valider la facture",
        niveau: 3,
        video: v("tavaro-valider"),
        blocs: [{ p: `La facture proposée se décide dans [À valider](${E}/validations). Celui qui a chiffré ne décide pas ; une facture refusée se rechiffre si un montant reste dû.` }],
      },
      {
        id: "facture",
        titre: "Suivre une facture",
        niveau: 3,
        video: v("tavaro-facture"),
        blocs: [{ p: `Sur une facture : « Réglée » date le règlement ; « Relancer » prépare une relance qui attend un accord ; « Demander un avoir » corrige une facture émise (la direction décide sous 48 heures) ; « Litige » suspend le recouvrement.` }],
      },
      {
        id: "prolonger",
        titre: "Prolonger un contrat",
        niveau: 3,
        video: v("tavaro-prolonger"),
        blocs: [{ p: `« Prolonger » enregistre une prolongation, une restitution décalée sans frais ou un retard offert ; seul le chef d'agence ou la direction amende un contrat.` }],
      },
      {
        id: "amendes",
        titre: "Désigner le conducteur d'une amende",
        niveau: 3,
        video: v("tavaro-amendes"),
        blocs: [{ p: `Dans [Amendes](${E}/tavaro/amendes), un avis s'enregistre puis sa désignation, faite sur antai.gouv.fr, se consigne : TAVARO garde la preuve et arrête les alertes.` }],
      },
      {
        id: "bareme",
        titre: "Publier un barème",
        niveau: 3,
        video: v("tavaro-bareme"),
        blocs: [{ p: `Dans les [réglages](${E}/tavaro/reglages), « Publier un barème » le met en vigueur pour les départs à partir de sa date d'effet ; seule la direction publie. Les retours déjà chiffrés gardent le leur.` }],
      },
      {
        id: "garde-fous",
        titre: "Les garde-fous",
        niveau: 2,
        blocs: [
          {
            liste: [
              "Aucune facture ne part sans la validation de l'agence, et celui qui chiffre ne décide pas.",
              "Sans preuve, un dommage reste « preuve manquante » et n'est pas facturé.",
              "Une facture émise ne se modifie pas : un avoir la corrige, décidé par la direction.",
              "Un état des lieux signé ne change plus.",
            ],
          },
        ],
      },
    ],
  }),

  tiroma: metier("tiroma", {
    titre: "TIROMA",
    intro: "TIROMA aide à remplir vos fauteuils : les créneaux à sauver, la liste d'attente, les plans sans rendez-vous et les vérifications avant les rendez-vous. Il lit l'agenda du logiciel du cabinet sans y écrire.",
    sections: [
      {
        id: "ecrans",
        titre: "Les écrans",
        niveau: 2,
        blocs: [
          {
            liste: [
              `[Aujourd'hui](${E}/tiroma) : le cabinet en une page : créneaux à sauver, plans sans rendez-vous, vérifications, charge des fauteuils.`,
              `[Créneaux et appels](${E}/tiroma/creneaux) : chaque créneau libéré avec les patients qui peuvent le reprendre, les appels à reprendre, la liste d'attente.`,
              `[Fauteuils](${E}/tiroma/fauteuils) : la charge du jour, les demi-journées vides, l'équipe absente.`,
              `[Plans et devis](${E}/tiroma/plans) : les plans signés sans rendez-vous, la mutuelle, les devis à relancer.`,
              `[Avant les rendez-vous](${E}/tiroma/avant) : labo, implants, orthodontie, devis à échéance, mutuelle.`,
              `[Pilotage](${E}/tiroma/pilotage) : devis acceptés, rendez-vous manqués, occupation.`,
              `[Réglages](${E}/tiroma/reglages) : cabinet, fauteuils, horaires, règles, export.`,
            ],
          },
        ],
      },
      { id: "gestes", titre: "Ce que vous faites", niveau: 2, blocs: [] },
      {
        id: "point",
        titre: "Le point du jour",
        niveau: 3,
        video: v("tiroma-point"),
        blocs: [{ p: `[Aujourd'hui](${E}/tiroma) montre chaque matin les créneaux à sauver, les plans sans rendez-vous et les vérifications ; chaque ligne mène à son écran.` }],
      },
      {
        id: "creneau",
        titre: "Sauver un créneau libéré",
        niveau: 3,
        video: v("tiroma-creneau"),
        blocs: [{ p: `Dans [Créneaux et appels](${E}/tiroma/creneaux), chaque créneau libéré propose les patients qui peuvent le reprendre. « Noter l'appel » enregistre l'issue ; le rendez-vous se pose dans le logiciel du cabinet, qui fait foi.` }],
      },
      {
        id: "attente",
        titre: "La liste d'attente",
        niveau: 3,
        video: v("tiroma-attente"),
        blocs: [{ p: `« Liste d'attente » inscrit un patient, proposé au premier créneau qui lui convient ; un patient gêné passe en premier. Un patient qui a demandé à ne pas être contacté ne s'inscrit pas.` }],
      },
      {
        id: "mutuelle",
        titre: "Noter la mutuelle d'un plan",
        niveau: 3,
        video: v("tiroma-mutuelle"),
        blocs: [{ p: `Dans [Plans et devis](${E}/tiroma/plans), « Noter la mutuelle » suit la demande et la réponse ; un accord reçu sans rendez-vous remonte chaque matin.` }],
      },
      {
        id: "absence",
        titre: "Noter une absence de l'équipe",
        niveau: 3,
        video: v("tiroma-absence"),
        blocs: [{ p: `Dans [Fauteuils](${E}/tiroma/fauteuils), « Noter une absence » affiche les soins à basculer ; aucune raison médicale n'est demandée.` }],
      },
      {
        id: "avant",
        titre: "Préparer les rendez-vous",
        niveau: 3,
        video: v("tiroma-avant"),
        blocs: [{ p: `[Avant les rendez-vous](${E}/tiroma/avant) liste le laboratoire, les implants, l'orthodontie et la mutuelle à vérifier ; les relances se copient et s'envoient par vous.` }],
      },
      {
        id: "fermeture",
        titre: "Fermetures et congés",
        niveau: 3,
        video: v("tiroma-fermeture"),
        blocs: [{ p: `Dans les [réglages](${E}/tiroma/reglages), « Fermetures et congés » réduit la plage ouverte ; réservé au titulaire.` }],
      },
      {
        id: "garde-fous",
        titre: "Les garde-fous",
        niveau: 2,
        blocs: [
          {
            liste: [
              "TIROMA lit le logiciel du cabinet sans y écrire : les rendez-vous se posent dans ce logiciel, qui fait foi.",
              "Un patient qui a demandé à ne pas être contacté ne l'est pas, et ne s'inscrit pas en liste d'attente.",
              "Les messages aux patients ne partent que par un prestataire agréé pour les données de santé ; d'ici là, ils sont préparés puis retenus.",
              "L'export des données est réservé au titulaire : il contient des données de santé.",
            ],
          },
        ],
      },
    ],
  }),

  tamila: metier("tamila", {
    titre: "TAMILA",
    intro: "TAMILA tient les dossiers du cabinet : les délais calculés et confirmés par un avocat, les audiences, les avis RPVA, les conflits d'intérêts et les honoraires. Les dossiers sont chiffrés dans votre navigateur.",
    sections: [
      {
        id: "ecrans",
        titre: "Les écrans",
        niveau: 2,
        blocs: [
          {
            liste: [
              `[Vue d'ensemble](${E}/tamila) : tous les dossiers : délais à confirmer, échéances sous 15 jours, décisions en attente.`,
              `[Arrivées](${E}/tamila/arrivees) : les avis RPVA reçus par courriel, à rattacher ou à écarter.`,
              `[Honoraires du cabinet](${E}/tamila/honoraires) : convention, temps non facturé, à facturer, provisions, reste dû.`,
              `[Pilotage](${E}/tamila/pilotage) : marge, charge, dossiers sans diligence.`,
              `[Conformité du cabinet](${E}/tamila/conformite) : conflits, vigilance LCB-FT, journal des accès.`,
              `[Réglages](${E}/tamila/reglages) : installation, coffre à clés, en-tête des factures, durées de conservation.`,
            ],
          },
        ],
      },
      { id: "gestes", titre: "Ce que vous faites", niveau: 2, blocs: [] },
      {
        id: "ouvrir",
        titre: "Ouvrir un dossier",
        niveau: 3,
        video: v("tamila-ouvrir"),
        blocs: [{ p: `« Nouveau dossier » ouvre un dossier dont la référence, l'intitulé et le numéro RG sont chiffrés dans votre navigateur. Un dossier ouvert par un assistant attend l'accord de son avocat responsable avant toute lecture.` }],
      },
      {
        id: "delais",
        titre: "Poser et confirmer un délai",
        niveau: 3,
        video: v("tamila-delais"),
        blocs: [{ p: `« Déclarer l'appel » fait courir les délais ; « Délai de procédure » calcule l'échéance avec la règle, le départ, la cour et le domicile du client. Chaque délai est confirmé par un avocat qui voit le dossier.` }],
      },
      {
        id: "audience",
        titre: "Audiences et avis RPVA",
        niveau: 3,
        video: v("tamila-audience"),
        blocs: [{ p: `« Audience » pose une audience au dossier ; « Avis RPVA » saisi à la main s'applique comme un avis lu : délais posés, audience ajoutée.` }],
      },
      {
        id: "arrivees",
        titre: "Rattacher un avis reçu",
        niveau: 3,
        video: v("tamila-arrivees"),
        blocs: [{ p: `Dans [Arrivées](${E}/tamila/arrivees), « Chiffrer et rattacher » range un avis dans son dossier et efface la copie reçue par courriel. Un avis non rattaché voit sa copie effacée à sept jours.` }],
      },
      {
        id: "conflits",
        titre: "Contrôler les conflits d'intérêts",
        niveau: 3,
        video: v("tamila-conflits"),
        blocs: [{ p: `« Contrôler les conflits » compare chaque partie à tout le cabinet sans qu'aucun nom ne quitte votre navigateur ; une partie connue se décide (pas de conflit, conflit levé, dossier refusé). La vigilance LCB-FT s'enregistre dans le même onglet.` }],
      },
      {
        id: "honoraires",
        titre: "Honoraires : convention, temps, facture",
        niveau: 3,
        video: v("tamila-honoraires"),
        blocs: [{ p: `Dans l'onglet Honoraires : « Poser la convention », « Saisir du temps », puis « Facturer » ; le numéro des factures suit sans trou. [Honoraires du cabinet](${E}/tamila/honoraires) en fait la synthèse.` }],
      },
      {
        id: "cloture",
        titre: "Clôturer un dossier",
        niveau: 3,
        video: v("tamila-cloture"),
        blocs: [{ p: `« Clôturer le dossier » demande la clôture, qu'un associé décide. Le dossier est effacé N jours après l'approbation (sept par défaut, réglable) : téléchargez l'export avant.` }],
      },
      {
        id: "garde-fous",
        titre: "Les garde-fous",
        niveau: 2,
        blocs: [
          {
            liste: [
              "Chaque délai calculé est confirmé par un avocat qui voit le dossier.",
              "Les dossiers sont chiffrés dans votre navigateur, et chaque lecture est tracée au journal des accès.",
              "La clôture est décidée par un associé ; l'effacement suit à l'échéance réglée.",
              "Une muraille posée sur un dossier ne se lève que sur décision du gérant.",
            ],
          },
        ],
      },
    ],
  }),

  varelo: metier("varelo", {
    titre: "VARELO",
    intro: "VARELO met votre groupe sur une page : sociétés, référentiel commun, finance, contrats et opérations. Il lit vos logiciels et vos exports sans jamais rien y écrire.",
    sections: [
      {
        id: "ecrans",
        titre: "Les écrans",
        niveau: 2,
        blocs: [
          {
            liste: [
              `[Ce matin](${E}/varelo) : les décisions à valider, les trésoreries, les réserves, les reportings, les contrats.`,
              `[Référentiel](${E}/varelo/referentiel) : un seul nom par client, fournisseur, article ou site pour tout le groupe.`,
              `[Finance](${E}/varelo/finance) : encours, plafonds, réciproques intragroupe, ventes des caisses.`,
              `[Contrats](${E}/varelo/contrats) : les contrats rangés par date limite de dénonciation.`,
              `[Opérations](${E}/varelo/operations) : les réserves à émettre aux transporteurs et les reportings dus.`,
              `[Groupe](${E}/varelo/groupe) : ventes, résultat, trésorerie et écarts de chaque société.`,
              `[Sources et structure](${E}/varelo/sources) : sociétés, logiciels branchés, dépôt d'un export, règles du groupe.`,
            ],
          },
        ],
      },
      { id: "gestes", titre: "Ce que vous faites", niveau: 2, blocs: [] },
      {
        id: "societe",
        titre: "Inscrire une société et déposer son export",
        niveau: 3,
        video: v("varelo-societe"),
        blocs: [{ p: `Dans [Sources et structure](${E}/varelo/sources), « Inscrire une société » l'ajoute au groupe ; « Déposer l'export d'une société » lui donne ses données, sans rien écrire dans le logiciel d'origine.` }],
      },
      {
        id: "referentiel",
        titre: "Rapprocher le référentiel",
        niveau: 3,
        video: v("varelo-referentiel"),
        blocs: [{ p: `« Lancer un passage » propose des lots de rapprochement ; une paire fausse s'écarte. Une correction (nom, fusion, scission, rattachement) attend la décision du référent données, qui n'est pas celui qui la propose.` }],
      },
      {
        id: "contrats",
        titre: "Suivre un contrat et sa dénonciation",
        niveau: 3,
        video: v("varelo-contrats"),
        blocs: [{ p: `Dans [Contrats](${E}/varelo/contrats), un contrat ajouté calcule sa date limite de dénonciation et prévient 30 jours avant. La dénonciation se fait valider par la direction juridique, part de chez vous, puis se note.` }],
      },
      {
        id: "reserves",
        titre: "Émettre une réserve transporteur",
        niveau: 3,
        video: v("varelo-reserves"),
        blocs: [{ p: `Dans [Opérations](${E}/varelo/operations), une livraison enregistrée prépare la lettre de protestation, que vous envoyez en recommandé ; « Sous réserve de déballage » ne vaut pas réserve.` }],
      },
      {
        id: "reportings",
        titre: "Suivre un reporting",
        niveau: 3,
        video: v("varelo-reportings"),
        blocs: [{ p: `« Ajouter un reporting » crée ses échéances ; « Envoyé… » note l'envoi au journal.` }],
      },
      {
        id: "finance",
        titre: "Encours et réciproques",
        niveau: 3,
        video: v("varelo-finance"),
        blocs: [{ p: `Dans [Finance](${E}/varelo/finance), un plafond d'encours proposé est posé à la validation de la direction financière ; un écart intragroupe justifié sort dans le tableau remis à la consolidation.` }],
      },
      {
        id: "groupe",
        titre: "Le groupe sur une page",
        niveau: 3,
        video: v("varelo-groupe"),
        blocs: [{ p: `[Groupe](${E}/varelo/groupe) lit chaque société d'après sa balance générale ; « Objectifs » fixe un plancher de trésorerie qui lève une alerte.` }],
      },
      {
        id: "garde-fous",
        titre: "Les garde-fous",
        niveau: 2,
        blocs: [
          {
            liste: [
              "VARELO lit vos logiciels en lecture seule : rien n'est jamais écrit dans un logiciel branché.",
              "Une correction du référentiel attend la décision du référent données ; celui qui la propose ne la décide pas.",
              "Un geste irréversible ou qui envoie quelque chose demande une confirmation.",
              "Les lettres et dénonciations partent de chez vous ; VARELO les prépare et note leur envoi.",
            ],
          },
        ],
      },
    ],
  }),
};
