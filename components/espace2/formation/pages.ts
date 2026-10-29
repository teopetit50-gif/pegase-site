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

export type Riche = string;
export type Bloc = { p: Riche } | { sous: string } | { liste: Riche[] };
export type VideoFormation = { src: string; affiche: string; titre: string; duree: number };
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

/* 29/10/2026 — Teo : « chaque page doit avoir sa ou ses vidéos de formation »,
   une par geste, qu'il tournera plus tard. En attendant, chaque emplacement
   montre la vidéo du guide sous son propre titre. Pour en remplacer une :
   déposer le fichier dans public/formation/ et passer son nom à v(). */
const v = (titre: string, fichier = "decouvrir-omega"): VideoFormation => ({
  src: `/formation/${fichier}.mp4`,
  affiche: `/formation/${fichier}.jpg`,
  titre,
  duree: fichier === "decouvrir-omega" ? 38 : 0,
});

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
    video: v("Découvrir Omega"),
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
        video: v("Valider une demande"),
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
        video: v("Le mode essai"),
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
        video: v("Les rôles de l'équipe"),
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
        video: v("Le premier accès"),
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
        video: v("Le point du matin"),
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
        video: v("Votre routine dans « À valider »"),
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
        video: v("Une facture qui arrive"),
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
        ],
      },
      {
        id: "gestes",
        titre: "Ce que vous faites",
        niveau: 2,
        blocs: [{ p: "« Déposer un document » ajoute une pièce à la main. Dans la boîte, un e-mail se marque comme lu ou s'écarte." }],
      },
      {
        id: "dossier",
        titre: "Dans le dossier d'une facture",
        niveau: 3,
        video: v("Le dossier d'une facture"),
        blocs: [
          {
            liste: [
              "Confirmer le fournisseur, proposer un IBAN, bloquer ou débloquer un fournisseur.",
              "Corriger une valeur, ou lever une anomalie.",
              "Ouvrir un litige, puis le clore.",
              "Rattacher la commande, puis transmettre à la comptabilité.",
            ],
          },
        ],
      },
      {
        id: "payer",
        titre: "Payer",
        niveau: 3,
        video: v("Payer une facture"),
        blocs: [{ p: `Dans [À payer](${E}/filed/a-payer), « Noter un paiement » enregistre le règlement d'une facture.` }],
      },
      {
        id: "garde-fous",
        titre: "Les garde-fous",
        niveau: 2,
        video: v("Contrôles et fraude"),
        blocs: [
          {
            liste: [
              "Le HT, la TVA et le TTC sont recoupés : si le compte ne tombe pas juste, la pièce est mise de côté.",
              "Un IBAN proposé doit être validé par une personne habilitée avant tout paiement.",
              "Une correction crée une nouvelle version de la facture, et les contrôles sont rejoués.",
              "Une écriture transmise ne se modifie plus, et aucune pièce n'est effacée.",
            ],
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
        video: v("Le tableau de bord"),
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
        video: v("Valider une relance"),
        blocs: [
          {
            liste: [
              "Après 7 jours, un rappel courtois.",
              "Après 21 jours, une relance ferme.",
              "Après 30 jours, une mise en demeure est préparée ; elle ne part jamais seule.",
              "Un devis sans réponse est relancé après 3 jours, puis après 7.",
            ],
          },
          { p: `Chaque relance attend votre accord dans [À valider](${E}/validations). Un compte ne reçoit jamais deux fois le même message.` },
        ],
      },
      {
        id: "gestes",
        titre: "Ce que vous faites",
        niveau: 2,
        video: v("Noter un règlement, un litige, une pause"),
        blocs: [
          {
            liste: [
              "Sur une facture : noter un règlement, poser un échéancier, la mettre en litige, joindre une pièce.",
              "Sur un devis : noter un accord de vive voix.",
              "Sur un compte : mettre les relances en pause, puis les reprendre.",
              "Sur une réponse reçue : l'accepter, ou l'écarter.",
              "Déposer un export de votre logiciel de facturation, et retoucher vos textes de relance.",
            ],
          },
        ],
      },
      {
        id: "garde-fous",
        titre: "Les garde-fous",
        niveau: 2,
        video: v("Qui valide quoi"),
        blocs: [
          {
            liste: [
              "Un règlement enregistré arrête les relances de la facture.",
              "Qui valide dépend du montant. Par défaut : tout valideur jusqu'à 2 000 €, un administrateur ou le gérant au-delà, le gérant seul à partir de 10 000 €.",
              "Un plafond d'encours fixé sur un client est daté dans le journal.",
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
        video: v("Répondre à une demande"),
        blocs: [{ p: "Sur une demande : « Valider et envoyer », « Corriger la réponse » ou « Refuser la réponse »." }],
      },
      {
        id: "base",
        titre: "Tenir la base à jour",
        niveau: 3,
        video: v("La base de connaissances"),
        blocs: [{ p: "Une fiche se crée, se corrige, puis se met en vigueur ; une fiche retirée ne sert plus. Une question hors de la base vous est transférée." }],
      },
      {
        id: "sujets",
        titre: "Laisser partir seul",
        niveau: 3,
        video: v("Laisser partir seul"),
        blocs: [
          {
            p: "Sujet par sujet, vous pouvez autoriser l'envoi sans relecture. « Couper l'envoi automatique » remet toutes les réponses en validation ; il faut en donner le motif.",
          },
        ],
      },
      {
        id: "garde-fous",
        titre: "Les garde-fous",
        niveau: 2,
        video: v("Avis et urgences"),
        blocs: [
          {
            liste: [
              "Chaque réponse préparée porte une mention qui dit qu'elle vient d'un assistant ; vous en choisissez le texte dans les réglages.",
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
        video: v("Les comptes à risque"),
        blocs: [
          {
            liste: [
              `[Comptes à risque](${E}/offload) : chaque client par niveau, régulier, ralentit, saison manquée, décroche, s'est tu.`,
              `[Échéances et renouvellements](${E}/offload/echeances), [affaires restées en plan](${E}/offload/affaires) et [groupes clients](${E}/offload/groupes).`,
              `[Garde-fous](${E}/offload/garde-fous) : vos règles, et l'arrêt d'OFFLOAD.`,
              `[Pilotage](${E}/offload/pilotage).`,
            ],
          },
        ],
      },
      {
        id: "gestes",
        titre: "Ce que vous faites",
        niveau: 2,
        video: v("Préparer une reprise"),
        blocs: [
          {
            liste: [
              "« Préparer une nouvelle reprise » : le message part en validation, et une tâche d'appel est créée.",
              "Reprendre un compte en main, ou le remettre dans le cycle, en donnant le motif.",
              "Sur une affaire restée en plan : relancer encore, ou la clore sans suite.",
              "Dans les garde-fous : écrire une règle en français, ou « Suspendre OFFLOAD ».",
            ],
          },
        ],
      },
      {
        id: "garde-fous",
        titre: "Les garde-fous",
        niveau: 2,
        video: v("Les garde-fous"),
        blocs: [
          {
            liste: [
              "Sans règle de votre part, les messages restent sans prix ni délai, toujours au vouvoiement.",
              "Une réponse du client arrête la séquence.",
              "OFFLOAD s'arrête seul au-delà de 20 % de messages non remis sur 7 jours, ou si deux messages visent la même adresse ; seul le gérant ou un administrateur le relance.",
              "En mode essai, rien ne part chez le client.",
            ],
          },
        ],
      },
    ],
    suivant: { titre: "Revenir au guide de démarrage", href: F },
  },

  /* ——— les modules métier : le panneau ne montre que celui de l'entreprise ——— */
  daliro: metier("daliro", {
    titre: "DALIRO",
    intro:
      "DALIRO suit vos chantiers : le marché vérifié ligne à ligne, les travaux supplémentaires chiffrés sur vos prix et signés avant exécution, les passages confirmés à J-2.",
    sections: [
      {
        id: "ecrans",
        titre: "Les écrans",
        niveau: 2,
        video: v("Vos chantiers"),
        blocs: [
          {
            liste: [
              `[Tableau de bord](${E}/daliro) et [chantiers](${E}/daliro/chantiers) : chaque chantier, avec son terrain, son argent, son fil et sa réception.`,
              `[À ranger](${E}/daliro/a-ranger) : les messages à rattacher à un chantier.`,
              `[À faire](${E}/daliro/a-faire) et [avenants](${E}/daliro/avenants).`,
              `[Annuaire](${E}/daliro/annuaire) et [équipes](${E}/daliro/equipes), sur les 30 prochains jours.`,
              `[Réglages](${E}/daliro/reglages) : la bibliothèque de prix.`,
            ],
          },
        ],
      },
      {
        id: "gestes",
        titre: "Ce que vous faites",
        niveau: 2,
        video: v("Avenants et prix"),
        blocs: [
          {
            liste: [
              "Depuis un message : ouvrir un avenant, ou l'écarter.",
              "Dans À faire : noter une réponse, noter fait, signer, soumettre, valider.",
              "Noter une absence dans une équipe.",
              "Poser un prix dans la bibliothèque, puis le valider.",
            ],
          },
        ],
      },
      {
        id: "garde-fous",
        titre: "Les garde-fous",
        niveau: 2,
        blocs: [
          {
            liste: [
              "L'accord permanent de passage à J-2 est réservé au gérant et aux administrateurs.",
              "Un nouveau prix validé pour la même désignation retire l'ancien.",
            ],
          },
        ],
      },
    ],
  }),

  lorani: metier("lorani", {
    titre: "LORANI",
    intro: "LORANI tient le calendrier de vos permis : chaque demande, ses pièces et ses délais d'instruction.",
    sections: [
      {
        id: "ecrans",
        titre: "L'écran",
        niveau: 2,
        video: v("Le calendrier des permis"),
        blocs: [{ liste: [`[Calendrier des permis](${E}/lorani) : à confirmer, pièces à fournir, en instruction, accordés, clos.`] }],
      },
      {
        id: "gestes",
        titre: "Ce que vous faites",
        niveau: 2,
        video: v("Suivre un permis"),
        blocs: [
          {
            liste: [
              "Créer un nouveau permis.",
              "Déposer un courrier de la mairie.",
              "Demander les pièces manquantes.",
              "Saisir un recours.",
              "Exporter le dossier daté.",
            ],
          },
        ],
      },
      {
        id: "garde-fous",
        titre: "Les garde-fous",
        niveau: 2,
        blocs: [{ p: "Quinze jours après la décision, un rappel porte sur l'affichage du permis." }],
      },
    ],
  }),

  tavaro: metier("tavaro", {
    titre: "TAVARO",
    intro: "TAVARO chiffre les retours de location et prépare les factures. L'agence valide ou refuse chaque facture, et aucune ne part sans cette validation.",
    sections: [
      {
        id: "ecrans",
        titre: "L'écran",
        niveau: 2,
        video: v("Le tableau de bord"),
        blocs: [
          {
            liste: [
              `[Tableau de bord](${E}/tavaro) : les retours à chiffrer, à valider, bloqués, et ce qui reste à encaisser ; le dossier de chaque contrat, et le barème.`,
            ],
          },
        ],
      },
      {
        id: "gestes",
        titre: "Ce que vous faites",
        niveau: 2,
        video: v("Chiffrer un retour"),
        blocs: [
          {
            liste: ["Chiffrer un retour.", "Signer l'état des lieux.", "Demander un avoir.", "Publier un barème.", "Envoyer le dossier à la banque."],
          },
        ],
      },
      {
        id: "garde-fous",
        titre: "Les garde-fous",
        niveau: 2,
        blocs: [{ p: "Aucune facture ne part sans la validation de l'agence." }],
      },
    ],
  }),

  tiroma: metier("tiroma", {
    titre: "TIROMA",
    intro: "TIROMA aide à remplir vos fauteuils : les créneaux à sauver, la liste d'attente, et les vérifications avant les rendez-vous.",
    sections: [
      {
        id: "ecrans",
        titre: "L'écran",
        niveau: 2,
        video: v("Le tableau de bord"),
        blocs: [
          {
            liste: [
              `[Tableau de bord](${E}/tiroma) : créneaux à sauver, plans de soins sans rendez-vous, vérifications avant les rendez-vous, demi-journées vides.`,
            ],
          },
        ],
      },
      {
        id: "gestes",
        titre: "Ce que vous faites",
        niveau: 2,
        video: v("La liste d'attente"),
        blocs: [
          {
            liste: [
              "Inscrire un patient sur la liste d'attente.",
              "Noter un appel, ou une mutuelle.",
              "Noter une absence, ou ajouter une fermeture.",
            ],
          },
        ],
      },
      {
        id: "garde-fous",
        titre: "Les garde-fous",
        niveau: 2,
        blocs: [
          {
            liste: [
              "Les messages aux patients partent par le courriel du cabinet, jamais par SMS.",
              "En mode essai, ils ne partent qu'à l'adresse d'essai, jamais au patient.",
              "Un patient qui ne veut plus être contacté se note dans le logiciel du cabinet : c'est lui qui fait foi.",
              "La charge se lit par fauteuil, jamais par personne.",
            ],
          },
        ],
      },
    ],
  }),

  tamila: metier("tamila", {
    titre: "TAMILA",
    intro: "TAMILA tient les dossiers du cabinet : les parties, les délais calculés, les audiences, les avis RPVA et le journal des accès.",
    sections: [
      {
        id: "ecrans",
        titre: "L'écran",
        niveau: 2,
        video: v("Les dossiers du cabinet"),
        blocs: [
          {
            liste: [`[Dossiers du cabinet](${E}/tamila) : délais à confirmer, échéances sous quinze jours, audiences, dossiers ouverts et clos.`],
          },
        ],
      },
      {
        id: "gestes",
        titre: "Ce que vous faites",
        niveau: 2,
        video: v("Ouvrir un dossier"),
        blocs: [
          {
            liste: ["Ouvrir un nouveau dossier.", "Calculer une date.", "Contrôler les conflits.", "Saisir un avis.", "Clôturer un dossier."],
          },
        ],
      },
      {
        id: "garde-fous",
        titre: "Les garde-fous",
        niveau: 2,
        blocs: [
          {
            liste: [
              "TAMILA lit vos pièces sans jamais y écrire, et aucun entraînement n'est fait sur elles.",
              "Les pièces sont effacées à la clôture du dossier.",
            ],
          },
        ],
      },
    ],
  }),

  varelo: metier("varelo", {
    titre: "VARELO",
    intro: "VARELO met votre groupe sur une page : sociétés, lots, caisses, reportings et contrats. Il lit vos logiciels de gestion, vos caisses et vos tableurs sans jamais rien y écrire.",
    sections: [
      {
        id: "ecrans",
        titre: "L'écran",
        niveau: 2,
        video: v("Le groupe sur une page"),
        blocs: [
          {
            liste: [
              `[Tableau de bord](${E}/varelo) : ce matin, le groupe sur une page, les ventes des caisses, les reportings dus, les réserves à émettre, les encours, les contrats à dénoncer et les comptes réciproques.`,
            ],
          },
        ],
      },
      {
        id: "gestes",
        titre: "Ce que vous faites",
        niveau: 2,
        video: v("Rapprocher les fiches"),
        blocs: [
          {
            liste: [
              `Rapprocher les fiches : proposer un nom, fusionner, scinder, détacher, ou écarter une paire. Le rapprochement se décide dans [À valider](${E}/validations).`,
              "Inscrire une société.",
              "Noter la dénonciation d'un contrat.",
              "Justifier un écart.",
            ],
          },
        ],
      },
      {
        id: "garde-fous",
        titre: "Les garde-fous",
        niveau: 2,
        blocs: [{ p: "VARELO n'écrit jamais dans vos logiciels." }],
      },
    ],
  }),
};
