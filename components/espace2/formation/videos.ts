/* ══════════════════════════════════════════════════════════════════════
   Le catalogue des vidéos de la formation (03/11/2026)

   Décisions de Teo (docs/formation/CAHIER-DES-CHARGES.md) : une vidéo
   courte par geste, tournée par Teo avec sa voix et sous-titrée. Une
   vidéo qui n'est pas encore tournée montre la vidéo provisoire
   (« Découvrir Omega », 38 s).

   Chaque fiche porte un identifiant stable, le nom des fichiers sous
   public/formation/ : <id>.mp4, <id>.jpg (affiche), <id>.vtt
   (sous-titres). Le script sert de prompteur : `ecran`, ce qu'on fait à
   l'écran ; `dire`, ce qu'on dit.
   docs/formation/SCRIPTS.md se tire de ce fichier
   (node outils/formation-scripts.mjs) : on ne le modifie jamais à la main.

   Mettre en ligne une vidéo tournée : outils/formation-deposer.sh <id>
   <fichier ou lien>, puis renseigner `tournee` ci-dessous.

   Ce fichier n'importe rien : outils/formation-scripts.mjs le lit avec
   Node directement.
   ══════════════════════════════════════════════════════════════════════ */

export type Etape = { ecran: string; dire: string };
export type FicheVideo = {
  titre: string;
  /* la page de la formation où elle se trouve (clé de pages.ts) */
  page: string;
  /* l'écran où commencer à filmer, sur omegaai.fr, sans être connecté */
  depart?: string;
  /* ce que la personne sait faire à la fin */
  objectif?: string;
  etapes?: Etape[];
  /* rempli au dépôt de la vidéo de Teo : sa durée en secondes et la présence des sous-titres */
  tournee?: { duree: number; sousTitres: boolean };
};
export type VideoFormation = { src: string; affiche: string; titre: string; duree: number; sousTitres?: string };

const PROVISOIRE = "decouvrir-omega";

export const VIDEOS: Record<string, FicheVideo> = {
  /* ═══════════════ Lot 1 · Bien démarrer ═══════════════ */
  "decouvrir-omega": {
    titre: "Découvrir Omega",
    page: "guide",
    depart: "/espace2",
    objectif: "Savoir ce qu'Omega fait pour l'entreprise et où se trouve chaque chose dans l'espace.",
    etapes: [
      {
        ecran: "Vue d'ensemble de l'espace, sans bouger.",
        dire: "Voici votre espace Omega. Omega relance vos impayés, répond aux demandes de vos clients et classe vos factures. Il prépare ce travail, et c'est vous qui validez.",
      },
      {
        ecran: "Survoler le panneau de gauche, de haut en bas.",
        dire: "À gauche se trouvent vos écrans : le point du matin, ce qui attend votre accord, l'activité, puis vos systèmes, FILED pour les factures, CASHD pour les impayés, REPUT pour les demandes et OFFLOAD pour les comptes à risque.",
      },
      {
        ecran: "Cliquer sur « À valider ».",
        dire: "Tout ce qui engage l'entreprise passe par ici, que ce soit un virement, une relance ou une réponse à un client. Rien ne part sans votre oui.",
      },
      {
        ecran: "Cliquer sur « Formation » dans le panneau.",
        dire: "Pour chaque geste, une vidéo courte comme celle-ci vous le montre. Commencez par « Comment marche Omega ».",
      },
    ],
  },
  "valider-une-demande": {
    titre: "Valider une demande",
    page: "principes",
    depart: "/espace2/validations",
    objectif: "Approuver, refuser, modifier ou déléguer une demande, seule ou par lot.",
    etapes: [
      {
        ecran: "Ouvrir « À valider » et montrer les groupes : en retard, aujourd'hui, cette semaine, plus tard.",
        dire: "Les demandes qui attendent une décision sont classées par échéance. Ce qui est en retard est en haut.",
      },
      {
        ecran: "Ouvrir une demande et montrer son détail.",
        dire: "Une demande montre ce qui est proposé, le montant, et d'où elle vient.",
      },
      {
        ecran: "Montrer les quatre boutons, puis cliquer sur « Approuver ».",
        dire: "Quatre décisions sont possibles : approuver, refuser, modifier la demande ou déléguer votre décision. J'approuve celle-ci.",
      },
      {
        ecran: "Ouvrir une autre demande, cliquer sur « Refuser » et choisir un motif.",
        dire: "Un refus se motive toujours, et le motif reste dans le journal.",
      },
      {
        ecran: "Cocher plusieurs demandes, puis les décider d'un coup.",
        dire: "Quand plusieurs demandes se ressemblent, vous pouvez les décider ensemble.",
      },
    ],
  },
  "mode-essai": {
    titre: "Le mode essai",
    page: "principes",
    depart: "/espace2/cashd/suivi",
    objectif: "Comprendre que rien ne part chez les clients tant que le gérant n'a pas basculé en réel.",
    etapes: [
      {
        ecran: "Dans CASHD, Débiteurs et relances, pointer la mention « mode essai » en haut de l'écran.",
        dire: "Chaque système s'installe en mode essai. Cette mention vous le rappelle.",
      },
      {
        ecran: "Survoler la mention pour faire apparaître l'explication.",
        dire: "En essai, un message que vous validez part vers une adresse d'essai d'Omega, jamais chez votre client. Vous voyez donc exactement ce qui partirait, sans aucun risque.",
      },
      {
        ecran: "Rester sur l'écran.",
        dire: "Quand les propositions vous conviennent, le gérant bascule en réel. Tant qu'il ne l'a pas fait, rien ne part.",
      },
    ],
  },
  "roles-equipe": {
    titre: "Les rôles de l'équipe",
    page: "principes",
    depart: "/espace2/equipe",
    objectif: "Savoir qui voit quoi et qui décide quoi.",
    etapes: [
      {
        ecran: "Ouvrir Équipe et parcourir la liste des personnes.",
        dire: "Chaque personne de votre équipe a un rôle : gérant, administrateur, valideur, collaborateur ou lecteur.",
      },
      {
        ecran: "Pointer la colonne Rôle sur deux personnes aux rôles différents.",
        dire: "Le rôle fixe ce que la personne voit et ce qu'elle peut décider. Un lecteur consulte. Un valideur approuve jusqu'à un certain montant. Le gérant décide de tout, et c'est lui qui bascule en réel.",
      },
      {
        ecran: "Rester sur la liste.",
        dire: "Pour ajouter quelqu'un, il faut qu'il ait déjà un compte Omega. Sinon, écrivez-nous et nous ouvrons son accès.",
      },
    ],
  },
  "premier-acces": {
    titre: "Le premier accès",
    page: "premiere-semaine",
    objectif: "Passer les quatre écrans du premier accès.",
    etapes: [
      {
        ecran: "Ouvrir le lien reçu par e-mail (à tourner sur un compte de démonstration, jamais sur un vrai client).",
        dire: "Au premier passage, quatre écrans règlent votre espace.",
      },
      { ecran: "Écran 1 : logo, nom, SIREN, territoire.", dire: "D'abord votre entreprise : son logo, son nom, son SIREN et son territoire." },
      {
        ecran: "Écran 2 : choisir le métier et cocher ce qui prend le plus de temps.",
        dire: "Ensuite votre métier, et ce qui vous prend le plus de temps : les demandes clients, les relances d'impayés, les documents ou les avis.",
      },
      {
        ecran: "Écran 3 : messagerie Google ou Microsoft, puis « plus tard ».",
        dire: "Puis votre messagerie. Vous pouvez la brancher plus tard : nous finalisons la connexion avec vous à l'installation.",
      },
      { ecran: "Écran 4 : l'équipe, puis terminer.", dire: "Enfin votre équipe. Cette étape peut attendre. Votre espace est prêt." },
    ],
  },
  "point-du-matin": {
    titre: "Le point du matin",
    page: "premiere-semaine",
    depart: "/espace2/point",
    objectif: "Lire le point du matin et retrouver les éditions précédentes.",
    etapes: [
      {
        ecran: "Ouvrir Point du matin, sur l'édition du jour.",
        dire: "Chaque matin, à 7 heures par défaut, Omega vous envoie un point par e-mail ou par WhatsApp. Vous le retrouvez aussi ici.",
      },
      {
        ecran: "Descendre doucement dans l'édition.",
        dire: "Il commence par ce qu'il faut regarder en premier, puis montre ce qui a bougé depuis la dernière édition.",
      },
      {
        ecran: "Cliquer sur un lien du point qui mène à un écran.",
        dire: "Chaque ligne mène à l'écran concerné.",
      },
      { ecran: "Revenir et ouvrir une édition précédente.", dire: "Les sept dernières éditions restent consultables." },
    ],
  },
  "routine-a-valider": {
    titre: "Votre routine dans « À valider »",
    page: "premiere-semaine",
    depart: "/espace2/validations",
    objectif: "Prendre l'habitude quotidienne : l'onglet « À décider par moi », du haut vers le bas.",
    etapes: [
      {
        ecran: "Ouvrir À valider, onglet « À décider par moi ».",
        dire: "Chaque jour, après le point du matin, ouvrez « À valider » sur l'onglet « À décider par moi ».",
      },
      {
        ecran: "Décider la première demande en haut, puis la suivante.",
        dire: "Prenez les demandes de haut en bas : ce qui est en retard d'abord. Quelques minutes suffisent.",
      },
      {
        ecran: "Passer sur l'onglet « Décidées ».",
        dire: "Ce que vous avez décidé reste ici, avec la date et le nom de la personne qui a décidé.",
      },
    ],
  },

  /* ═══════════════ Lot 1 · CASHD ═══════════════ */
  "cashd-tableau-de-bord": {
    titre: "Le tableau de bord",
    page: "cashd",
    depart: "/espace2/cashd",
    objectif: "Lire en un coup d'œil qui vous doit quoi, et où en est chaque compte.",
    etapes: [
      {
        ecran: "Ouvrir CASHD, tableau de bord.",
        dire: "CASHD suit qui vous doit de l'argent, depuis quand, et où en est chaque relance.",
      },
      {
        ecran: "Pointer les quatre états : en retard, en litige, en pause, à jour.",
        dire: "Vos débiteurs sont rangés en quatre états : en retard, en litige, en pause et à jour.",
      },
      {
        ecran: "Cliquer sur un débiteur en retard.",
        dire: "Un clic ouvre le compte : ses factures, ses relances et ce qui s'est passé.",
      },
    ],
  },
  "cashd-valider-relance": {
    titre: "Valider une relance",
    page: "cashd",
    depart: "/espace2/cashd/suivi",
    objectif: "Relire et valider les relances que CASHD a rédigées pour le jour.",
    etapes: [
      {
        ecran: "Dans Débiteurs et relances, ouvrir le menu « … » et montrer « Écrire les relances du jour ».",
        dire: "Chaque matin, CASHD rédige les relances du jour à partir de votre calendrier.",
      },
      {
        ecran: "Ouvrir une relance « À valider » et lire le texte.",
        dire: "Chaque relance attend votre accord. Relisez le texte : c'est celui qui partira.",
      },
      {
        ecran: "Ouvrir la file de validation et approuver la relance.",
        dire: "Vous l'approuvez dans « À valider », comme toute autre demande. Elle passe alors à « Validée, à envoyer ».",
      },
      {
        ecran: "Revenir sur la relance et montrer son nouvel état.",
        dire: "Un compte ne reçoit jamais deux fois le même message.",
      },
    ],
  },
  "cashd-textes-relance": {
    titre: "Retoucher vos textes de relance",
    page: "cashd",
    depart: "/espace2/cashd/suivi",
    objectif: "Adapter le ton de chaque palier de relance à votre façon d'écrire.",
    etapes: [
      {
        ecran: "Menu « … », « Vos textes de relance ».",
        dire: "Les relances partent de vos textes. Il y en a un par palier : le rappel courtois, la relance ferme, la mise en demeure.",
      },
      { ecran: "Ouvrir le texte du rappel courtois et en modifier une phrase.", dire: "Modifiez-les pour qu'ils vous ressemblent." },
      {
        ecran: "Rester sur le texte modifié.",
        dire: "Les prochaines relances partiront de ce texte. Celles qui sont déjà rédigées ne changent pas.",
      },
    ],
  },
  "cashd-noter-reglement": {
    titre: "Noter un règlement",
    page: "cashd",
    depart: "/espace2/cashd/suivi",
    objectif: "Enregistrer un paiement reçu, ce qui arrête les relances de la facture.",
    etapes: [
      {
        ecran: "Ouvrir un débiteur, puis le menu d'une de ses factures.",
        dire: "Un client vous a payé ? Ouvrez son compte, puis la facture concernée.",
      },
      {
        ecran: "« Noter un règlement » : saisir le montant, choisir le mode (virement, chèque…), une référence.",
        dire: "Cliquez sur « Noter un règlement », puis saisissez le montant, le mode de paiement et une référence si vous en avez une.",
      },
      {
        ecran: "Valider, puis montrer le règlement dans l'activité du compte.",
        dire: "Le règlement est enregistré, et les relances de cette facture s'arrêtent.",
      },
    ],
  },
  "cashd-echeancier": {
    titre: "Poser un échéancier",
    page: "cashd",
    depart: "/espace2/cashd/suivi",
    objectif: "Accorder un paiement en plusieurs fois sans que les relances continuent.",
    etapes: [
      {
        ecran: "Ouvrir un débiteur, menu d'une facture, « Échéancier ».",
        dire: "Un client demande à payer en plusieurs fois ? Ouvrez la facture, puis « Échéancier ».",
      },
      {
        ecran: "Montrer les trois échéances proposées, en modifier une date, saisir un motif.",
        dire: "CASHD propose trois échéances. Ajustez les dates et les montants, et notez pourquoi vous l'accordez.",
      },
      {
        ecran: "Valider et montrer l'échéancier sur la facture.",
        dire: "L'échéancier remplace l'échéance d'origine : tant que le client paie à la date, il n'est plus relancé. Seule une échéance manquée relance le cycle.",
      },
    ],
  },
  "cashd-litige": {
    titre: "Mettre une facture en litige",
    page: "cashd",
    depart: "/espace2/cashd/suivi",
    objectif: "Suspendre les relances d'une facture contestée, puis clore le litige.",
    etapes: [
      {
        ecran: "Menu d'une facture, « Mettre en litige », saisir le motif.",
        dire: "Quand un client conteste une facture, mettez-la en litige. Les relances de cette facture s'arrêtent.",
      },
      {
        ecran: "Montrer « Contestation partielle » dans le même menu, sans valider.",
        dire: "S'il ne conteste qu'une partie, la contestation partielle sort cette part du cycle et continue de relancer le reste.",
      },
      {
        ecran: "Ouvrir Litiges et pauses, puis « Clore le litige » sur la facture.",
        dire: "Les litiges en cours se retrouvent ici. Une fois le désaccord réglé, closez le litige : la facture reprend son cours.",
      },
    ],
  },
  "cashd-pause": {
    titre: "Mettre un compte en pause",
    page: "cashd",
    depart: "/espace2/cashd/suivi",
    objectif: "Arrêter toutes les relances d'un client le temps d'une discussion, puis les reprendre.",
    etapes: [
      {
        ecran: "Ouvrir un débiteur, menu du compte, « Mettre en pause ».",
        dire: "Vous êtes en discussion avec un client ? Mettez son compte en pause : toute relance en attente est coupée, même celle qui est déjà écrite.",
      },
      {
        ecran: "Montrer le compte passé à l'état « En pause ».",
        dire: "Le compte passe à l'état « En pause », et la pause est datée dans le journal.",
      },
      { ecran: "Même menu, « Reprendre les relances », saisir la raison.", dire: "Quand c'est réglé, reprenez les relances en disant pourquoi : elles repartent au palier où elles en étaient." },
    ],
  },
  "cashd-reponse-recue": {
    titre: "Traiter une réponse reçue",
    page: "cashd",
    depart: "/espace2/cashd/suivi",
    objectif: "Trancher quand un client répond à une relance.",
    etapes: [
      {
        ecran: "Filtrer les relances à l'état « Réponse à trancher », en ouvrir une.",
        dire: "Quand un client répond à une relance, CASHD vous la montre ici, à l'état « Réponse à trancher ».",
      },
      { ecran: "Lire la réponse dans l'activité de la relance.", dire: "CASHD a lu la réponse et propose une lecture : une contestation, un règlement annoncé, ou un contact qui a quitté l'entreprise." },
      {
        ecran: "Cliquer sur « Accepter » (ou « Écarter » sur une autre).",
        dire: "Si la lecture est juste, acceptez : une contestation met la facture en litige, un règlement annoncé met le compte en pause le temps du paiement. Sinon, écartez : rien ne change.",
      },
    ],
  },
  "cashd-devis": {
    titre: "Les devis sans réponse",
    page: "cashd",
    depart: "/espace2/cashd/devis",
    objectif: "Suivre les devis en attente et noter un accord donné de vive voix.",
    etapes: [
      {
        ecran: "Ouvrir Devis sans réponse.",
        dire: "CASHD suit aussi vos devis. Sans réponse, un devis est relancé après trois jours, puis après sept.",
      },
      {
        ecran: "Sur un devis en attente, « Accord de vive voix ».",
        dire: "Si le client vous a dit oui au téléphone, notez l'accord : les relances du devis s'arrêtent.",
      },
    ],
  },
  "cashd-balance": {
    titre: "La balance âgée",
    page: "cashd",
    depart: "/espace2/cashd/balance",
    objectif: "Lire ce qui est dû par ancienneté et l'envoyer à votre comptable.",
    etapes: [
      {
        ecran: "Ouvrir Balance âgée.",
        dire: "La balance âgée montre ce qui vous est dû, rangé par ancienneté.",
      },
      { ecran: "Pointer la colonne des retards les plus anciens.", dire: "Les montants les plus anciens sont les plus difficiles à récupérer : regardez-les en premier." },
      { ecran: "Cliquer sur « Exporter la balance ».", dire: "Exportez-la vers un tableur pour votre comptable ou votre banque." },
    ],
  },
  "cashd-deposer-export": {
    titre: "Déposer un export du facturier",
    page: "cashd",
    depart: "/espace2/cashd/suivi",
    objectif: "Mettre CASHD à jour avec les factures de votre logiciel de facturation.",
    etapes: [
      {
        ecran: "Menu « … », « Déposer un export du facturier ».",
        dire: "CASHD part de vos factures. Si votre logiciel de facturation n'est pas branché, déposez-en un export.",
      },
      {
        ecran: "Glisser un fichier d'exemple dans la fenêtre (sans valider en base réelle).",
        dire: "Glissez le fichier dans cette fenêtre : CASHD lit les factures et les paiements et met chaque compte à jour.",
      },
    ],
  },
  "cashd-qui-valide": {
    titre: "Qui valide quoi",
    page: "cashd",
    depart: "/espace2/cashd/suivi",
    objectif: "Connaître les seuils de validation par montant et les plafonds d'encours.",
    etapes: [
      {
        ecran: "Ouvrir une relance d'un petit montant, puis une d'un gros montant.",
        dire: "Qui valide une relance dépend du montant. Par défaut, tout valideur peut le faire jusqu'à 2 000 euros, un administrateur ou le gérant au-delà, et le gérant seul à partir de 10 000 euros.",
      },
      {
        ecran: "Ouvrir Risque client et pointer un plafond d'encours.",
        dire: "Vous pouvez aussi fixer un plafond d'encours par client. CASHD vous prévient quand il est dépassé, et le plafond est daté dans le journal.",
      },
    ],
  },

  /* ═══════════════ Lots suivants : titres seulement, scripts à écrire ═══════════════ */
  "filed-facture-arrive": { titre: "Une facture qui arrive", page: "filed" },
  "filed-dossier-facture": { titre: "Le dossier d'une facture", page: "filed" },
  "filed-payer": { titre: "Payer une facture", page: "filed" },
  "filed-controles": { titre: "Contrôles et fraude", page: "filed" },
  "reput-repondre": { titre: "Répondre à une demande", page: "reput" },
  "reput-base": { titre: "La base de connaissances", page: "reput" },
  "reput-partir-seul": { titre: "Laisser partir seul", page: "reput" },
  "reput-avis-urgences": { titre: "Avis et urgences", page: "reput" },
  "offload-comptes-risque": { titre: "Les comptes à risque", page: "offload" },
  "offload-reprise": { titre: "Préparer une reprise", page: "offload" },
  "offload-garde-fous": { titre: "Les garde-fous", page: "offload" },
  "daliro-chantiers": { titre: "Vos chantiers", page: "daliro" },
  "daliro-avenants": { titre: "Avenants et prix", page: "daliro" },
  "lorani-calendrier": { titre: "Le calendrier des permis", page: "lorani" },
  "lorani-suivre-permis": { titre: "Suivre un permis", page: "lorani" },
  "tavaro-tableau": { titre: "Le tableau de bord", page: "tavaro" },
  "tavaro-retour": { titre: "Chiffrer un retour", page: "tavaro" },
  "tiroma-tableau": { titre: "Le tableau de bord", page: "tiroma" },
  "tiroma-attente": { titre: "La liste d'attente", page: "tiroma" },
  "tamila-dossiers": { titre: "Les dossiers du cabinet", page: "tamila" },
  "tamila-ouvrir": { titre: "Ouvrir un dossier", page: "tamila" },
  "varelo-groupe": { titre: "Le groupe sur une page", page: "varelo" },
  "varelo-rapprocher": { titre: "Rapprocher les fiches", page: "varelo" },
};

/* la vidéo à montrer : celle de Teo si elle est tournée, sinon la vidéo provisoire sous le titre du geste */
export function video(id: string): VideoFormation {
  const fiche = VIDEOS[id];
  if (!fiche) throw new Error(`Formation : vidéo inconnue « ${id} » (components/espace2/formation/videos.ts)`);
  const fichier = fiche.tournee ? id : PROVISOIRE;
  return {
    src: `/formation/${fichier}.mp4`,
    affiche: `/formation/${fichier}.jpg`,
    titre: fiche.titre,
    duree: fiche.tournee?.duree ?? 38,
    sousTitres: fiche.tournee?.sousTitres ? `/formation/${id}.vtt` : undefined,
  };
}
