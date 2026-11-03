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
  /* ═══════════════ Lot 2 · FILED ═══════════════ */
  "filed-facture-arrive": {
    titre: "Une facture qui arrive",
    page: "filed",
    depart: "/espace2/filed",
    objectif: "Suivre une facture depuis son arrivée jusqu'à son dossier, et lire ce que FILED en a compris.",
    etapes: [
      {
        ecran: "Ouvrir FILED, Documents reçus, et montrer la liste.",
        dire: "Chaque facture qui arrive, par e-mail ou déposée à la main, apparaît ici. FILED la lit, recoupe ses montants et la range.",
      },
      { ecran: "Ouvrir une facture de la liste.", dire: "Ouvrez une pièce : vous voyez son fournisseur, ses montants, son échéance, et où elle en est." },
      {
        ecran: "Cliquer sur une valeur lue (le total TTC, par exemple).",
        dire: "Cliquez sur une valeur : elle se surligne dans la pièce. Vous voyez exactement où FILED l'a lue.",
      },
      {
        ecran: "Montrer l'activité de la pièce, en bas.",
        dire: "L'activité retrace tout ce qui est arrivé à la pièce depuis sa réception.",
      },
    ],
  },
  "filed-deposer": {
    titre: "Déposer un document",
    page: "filed",
    depart: "/espace2/filed",
    objectif: "Ajouter à la main une facture reçue sur papier ou hors de la messagerie.",
    etapes: [
      {
        ecran: "Bouton « Déposer un document ».",
        dire: "Une facture vous arrive sur papier, ou par un autre canal ? Déposez-la ici.",
      },
      {
        ecran: "Montrer la fenêtre de dépôt, sans valider.",
        dire: "Le fichier reçoit un numéro, il est lu, puis contrôlé comme tout document reçu par e-mail.",
      },
    ],
  },
  "filed-boite": {
    titre: "La boîte de réception",
    page: "filed",
    depart: "/espace2/filed/boite",
    objectif: "Trier les e-mails reçus par FILED.",
    etapes: [
      {
        ecran: "Ouvrir Boîte de réception, onglets Nouveaux, Lus, Traités.",
        dire: "La boîte de réception montre les e-mails que FILED a reçus. Les pièces jointes en sont tirées automatiquement.",
      },
      {
        ecran: "Ouvrir un e-mail, puis « Marquer comme lu ».",
        dire: "Un e-mail que vous avez vu se marque comme lu.",
      },
      { ecran: "Sur un autre e-mail sans intérêt, « Écarter ».", dire: "Une publicité ou un e-mail sans pièce s'écarte, pour garder la boîte propre." },
    ],
  },
  "filed-dossier-facture": {
    titre: "Le dossier d'une facture",
    page: "filed",
    depart: "/espace2/filed",
    objectif: "Trouver dans le dossier tout ce qu'on peut faire sur une facture.",
    etapes: [
      {
        ecran: "Ouvrir une facture, puis son menu de gestes.",
        dire: "Tous les gestes sur une facture partent de son dossier : corriger une valeur, ouvrir un litige, rattacher une commande, transmettre à la comptabilité.",
      },
      { ecran: "Cliquer sur « Voir la pièce ».", dire: "La pièce d'origine reste toujours consultable, telle qu'elle est arrivée." },
    ],
  },
  "filed-corriger": {
    titre: "Corriger une valeur",
    page: "filed",
    depart: "/espace2/filed",
    objectif: "Rectifier un montant, une date ou un numéro mal lu.",
    etapes: [
      {
        ecran: "Dans le dossier, « Corriger une valeur… », choisir le montant, saisir la bonne valeur.",
        dire: "Si FILED a mal lu une valeur, corrigez-la. Indiquez la bonne valeur et pourquoi.",
      },
      {
        ecran: "Montrer la nouvelle version de la facture et les contrôles rejoués.",
        dire: "La correction crée une nouvelle version de la facture, et tous les contrôles sont rejoués. L'ancienne version reste dans l'historique.",
      },
      {
        ecran: "Sur une autre facture, « Confirmer la valeur non vérifiée… ».",
        dire: "Quand FILED n'est pas sûr d'une valeur, il vous demande de la confirmer.",
      },
    ],
  },
  "filed-controles": {
    titre: "Contrôles et fraude",
    page: "filed",
    depart: "/espace2/filed/controles",
    objectif: "Comprendre ce qui bloque une facture et lever un contrôle à bon escient.",
    etapes: [
      {
        ecran: "Ouvrir Contrôles et fraude, sur « Bloquants » puis « À vérifier ».",
        dire: "FILED contrôle chaque facture : le compte entre HT, TVA et TTC, l'IBAN, les doublons. Ce qui bloque est ici, et ce qui demande un œil aussi.",
      },
      {
        ecran: "Ouvrir un contrôle, puis « Lever avec un motif… ».",
        dire: "Si vous avez vérifié et que tout est en ordre, levez le contrôle en donnant le motif. Il reste au journal.",
      },
    ],
  },
  "filed-fournisseur": {
    titre: "Confirmer un fournisseur et son IBAN",
    page: "filed",
    depart: "/espace2/filed/fournisseurs",
    objectif: "Confirmer un nouveau fournisseur et faire valider son IBAN avant tout paiement.",
    etapes: [
      {
        ecran: "Ouvrir Fournisseurs, onglet « À confirmer ».",
        dire: "Un fournisseur naît de sa première facture. Avant de le payer, il faut le confirmer.",
      },
      {
        ecran: "« Confirmer ce fournisseur… », saisir ce qui a été vérifié.",
        dire: "Dites ce que vous avez vérifié : un bon de commande, un appel au numéro connu, un contrat. Celui qui a déposé la pièce ne peut pas confirmer lui-même : une autre personne le fait.",
      },
      {
        ecran: "« Proposer un IBAN… », saisir d'où il vient.",
        dire: "Un IBAN proposé part en validation dans « À valider ». Une personne habilitée doit l'approuver avant tout paiement.",
      },
    ],
  },
  "filed-litige": {
    titre: "Ouvrir un litige",
    page: "filed",
    depart: "/espace2/filed",
    objectif: "Mettre une facture fournisseur en litige, puis le clore.",
    etapes: [
      {
        ecran: "Dans le dossier d'une facture, « Ouvrir un litige… », saisir le motif.",
        dire: "Une livraison incomplète, un prix qui ne correspond pas ? Ouvrez un litige sur la facture.",
      },
      { ecran: "Montrer « Clore le litige… » dans le même menu.", dire: "Une fois l'affaire réglée avec le fournisseur, closez le litige." },
    ],
  },
  "filed-commande": {
    titre: "Rattacher une commande",
    page: "filed",
    depart: "/espace2/filed",
    objectif: "Rapprocher une facture de sa commande, ligne par ligne.",
    etapes: [
      {
        ecran: "Dans le dossier, « Désigner une commande… », choisir la commande.",
        dire: "Rattachez la facture à la commande qu'elle concerne.",
      },
      {
        ecran: "« Apparier la ligne 1… ».",
        dire: "Puis appariez ses lignes à celles de la commande : vous voyez tout de suite ce qui a été facturé en plus ou en moins.",
      },
    ],
  },
  "filed-payer": {
    titre: "Payer une facture",
    page: "filed",
    depart: "/espace2/filed/a-payer",
    objectif: "Retrouver les factures validées par échéance et noter leur paiement.",
    etapes: [
      {
        ecran: "Ouvrir À payer.",
        dire: "Une facture validée dans « À valider » arrive ici, rangée par échéance.",
      },
      {
        ecran: "Sur une facture, « Noter un paiement… », saisir la date et la référence.",
        dire: "Quand vous l'avez réglée, notez le paiement. La facture sort de la liste.",
      },
    ],
  },
  "filed-comptabilite": {
    titre: "Transmettre à la comptabilité",
    page: "filed",
    depart: "/espace2/filed/comptabilite",
    objectif: "Passer une facture validée en comptabilité et sortir le FEC.",
    etapes: [
      {
        ecran: "Dans le dossier d'une facture validée, « Transmettre à la comptabilité… ».",
        dire: "Une facture validée se transmet à la comptabilité : FILED en passe l'écriture.",
      },
      {
        ecran: "Ouvrir Comptabilité, montrer la vue d'ensemble et la TVA déductible.",
        dire: "L'écran Comptabilité montre les factures comptabilisées, le hors-taxes et la TVA déductible.",
      },
      {
        ecran: "Cliquer sur « Exporter le FEC ».",
        dire: "Exportez le fichier des écritures comptables pour votre expert-comptable. Une écriture transmise ne se modifie plus.",
      },
    ],
  },
  "filed-circuit": {
    titre: "Le circuit de validation",
    page: "filed",
    depart: "/espace2/filed/circuit",
    objectif: "Lire qui approuve quoi, et couvrir une absence.",
    etapes: [
      {
        ecran: "Ouvrir Circuit de validation.",
        dire: "Le circuit dit qui approuve une facture, une anomalie à lever ou un IBAN à confirmer.",
      },
      {
        ecran: "Pointer les règles, de haut en bas.",
        dire: "Les règles se lisent de haut en bas : la première qui correspond l'emporte. Elles se posent à l'installation, avec vous.",
      },
      {
        ecran: "Montrer l'onglet des délégations.",
        dire: "Pour une absence, une délégation datée, posée depuis « À valider », fait décider quelqu'un d'autre à votre place.",
      },
    ],
  },
  "filed-refusees": {
    titre: "Les factures refusées",
    page: "filed",
    depart: "/espace2/filed/refusees",
    objectif: "Savoir quoi faire d'une facture refusée.",
    etapes: [
      {
        ecran: "Ouvrir Refusées, onglets « À corriger » et « Reprise impossible ».",
        dire: "Une facture refusée arrive ici, avec la raison du refus.",
      },
      {
        ecran: "Ouvrir une facture « À corriger ».",
        dire: "Si elle peut être corrigée, faites-le dans les 24 heures qui suivent le refus. Passé ce délai, elle se classe sans suite, ou le fournisseur envoie une facture rectificative.",
      },
    ],
  },
  /* ═══════════════ Lot 2 · REPUT ═══════════════ */
  "reput-demandes": {
    titre: "Une demande qui arrive",
    page: "reput",
    depart: "/espace2/reput",
    objectif: "Lire une demande client et la réponse que REPUT a préparée.",
    etapes: [
      {
        ecran: "Ouvrir REPUT, Demandes.",
        dire: "REPUT reçoit les demandes de vos clients et prépare une réponse à partir de votre base de connaissances.",
      },
      {
        ecran: "Ouvrir une demande, montrer la question puis la réponse préparée et la fiche citée.",
        dire: "Vous voyez la question du client, la réponse préparée, et la fiche de votre base dont elle est tirée.",
      },
      {
        ecran: "Montrer une demande hors de la base.",
        dire: "Ce que la base ne couvre pas, REPUT ne l'invente pas : il vous transfère la demande.",
      },
    ],
  },
  "reput-repondre": {
    titre: "Répondre à une demande",
    page: "reput",
    depart: "/espace2/reput",
    objectif: "Valider, corriger ou refuser une réponse préparée.",
    etapes: [
      {
        ecran: "Sur une demande, « Valider et envoyer ».",
        dire: "Si la réponse vous convient, validez-la et elle part.",
      },
      {
        ecran: "Sur une autre, « Corriger la réponse », modifier une phrase, valider.",
        dire: "Si elle ne vous ressemble pas, corrigez-la avant de l'envoyer.",
      },
      { ecran: "Sur une troisième, « Refuser la réponse… », saisir le motif.", dire: "Si elle est fausse, refusez-la en disant pourquoi : la demande vous revient." },
    ],
  },
  "reput-base": {
    titre: "La base de connaissances",
    page: "reput",
    depart: "/espace2/reput/base",
    objectif: "Créer, corriger et mettre en vigueur une fiche.",
    etapes: [
      {
        ecran: "Ouvrir Base de connaissances, survoler les états : en vigueur, brouillon, à revoir.",
        dire: "REPUT ne répond qu'avec ce qui est dans votre base. Chaque fiche est en vigueur, en brouillon ou à revoir.",
      },
      {
        ecran: "« Nouvelle fiche », saisir une question et sa réponse.",
        dire: "Ajoutez une fiche pour chaque question qui revient : vos horaires, vos délais, vos tarifs.",
      },
      {
        ecran: "« Valider et mettre en vigueur ».",
        dire: "Une fois en vigueur, la prochaine réponse la cite. Un brouillon attend qu'un valideur le mette en vigueur.",
      },
      { ecran: "Sur une fiche périmée, « Retirer la fiche… ».", dire: "Une fiche retirée ne sert plus." },
    ],
  },
  "reput-partir-seul": {
    titre: "Laisser partir seul",
    page: "reput",
    depart: "/espace2/reput/sujets",
    objectif: "Autoriser, sujet par sujet, l'envoi sans relecture, et savoir le couper.",
    etapes: [
      {
        ecran: "Ouvrir Sujets autorisés.",
        dire: "Au début, chaque réponse attend votre validation. Quand un sujet vous convient, vous pouvez le laisser partir seul.",
      },
      {
        ecran: "Sur un sujet simple (les horaires), « Autoriser l'envoi seul ».",
        dire: "Les réponses tirées de votre base sur ce sujet partent alors sans relecture.",
      },
      {
        ecran: "Montrer « Couper l'envoi automatique… » et le motif demandé.",
        dire: "À tout moment, coupez l'envoi automatique en donnant le motif : toutes les réponses attendent de nouveau votre validation.",
      },
    ],
  },
  "reput-urgences": {
    titre: "Urgences et réclamations",
    page: "reput",
    depart: "/espace2/reput/urgences",
    objectif: "Savoir comment REPUT traite une urgence, une réclamation, ou un client qui demande une personne.",
    etapes: [
      {
        ecran: "Ouvrir Urgences et escalade.",
        dire: "Certaines demandes ne reçoivent jamais de réponse automatique : les urgences, les réclamations, les clients en litige, et ceux qui demandent à parler à quelqu'un.",
      },
      {
        ecran: "Pointer le délai d'une urgence (une heure) et d'une réclamation (quatre heures).",
        dire: "Chaque sujet porte le délai que vous avez fixé. Passé ce délai, la demande remonte au responsable.",
      },
      {
        ecran: "Montrer la règle hors horaires.",
        dire: "Par défaut, personne n'est appelé la nuit : le client reçoit tout de suite une réponse honnête avec vos horaires, et son urgence passe en tête à l'ouverture.",
      },
    ],
  },
  "reput-reglages": {
    titre: "Réglages et demandes d'avis",
    page: "reput",
    depart: "/espace2/reput/reglages",
    objectif: "Régler la signature, la mention, l'accusé de réception et les demandes d'avis.",
    etapes: [
      {
        ecran: "Ouvrir Réglages et avis, montrer la signature et la mention de réponse automatisée.",
        dire: "Ici, vous réglez la signature de vos réponses, et le texte de la mention qui dit qu'elles sont préparées par un assistant.",
      },
      { ecran: "Montrer l'accusé de réception.", dire: "Un accusé de réception part dans la minute, pour que le client sache que sa demande est arrivée." },
      {
        ecran: "Montrer les demandes d'avis.",
        dire: "Une demande d'avis part trois jours après le règlement, avec deux relances au plus, jamais plus d'une fois en six mois, et sans écarter les clients mécontents.",
      },
    ],
  },
  /* ═══════════════ Lot 2 · OFFLOAD ═══════════════ */
  "offload-comptes-risque": {
    titre: "Les comptes à risque",
    page: "offload",
    depart: "/espace2/offload",
    objectif: "Lire, chaque matin, quels clients ralentissent ou décrochent.",
    etapes: [
      {
        ecran: "Ouvrir OFFLOAD, Comptes à risque.",
        dire: "Chaque matin, OFFLOAD relit votre base clients et compare chaque client à son propre rythme de commandes.",
      },
      {
        ecran: "Pointer les niveaux : régulier, ralentit, saison manquée, décroche, s'est tu.",
        dire: "Chaque client a un niveau : régulier, ralentit, saison manquée, décroche, ou s'est tu.",
      },
      { ecran: "Ouvrir un compte qui décroche, montrer son rythme et sa valeur en jeu.", dire: "Ouvrez un compte : vous voyez son rythme habituel, depuis quand il s'écarte, et ce qu'il pèse sur une année." },
    ],
  },
  "offload-reprise": {
    titre: "Préparer une reprise",
    page: "offload",
    depart: "/espace2/offload",
    objectif: "Préparer un message de reprise de contact et l'appel qui va avec.",
    etapes: [
      {
        ecran: "Sur un compte à risque, « Préparer une nouvelle reprise ».",
        dire: "Pour reprendre contact avec un client, préparez une reprise.",
      },
      {
        ecran: "Montrer le message préparé, puis « Valider les messages ».",
        dire: "Le message part en validation, et une tâche d'appel est créée pour vous ou votre commercial.",
      },
      {
        ecran: "Montrer la séquence arrêtée après une réponse du client.",
        dire: "Dès que le client répond, la séquence s'arrête : la suite se fait de personne à personne.",
      },
    ],
  },
  "offload-echeances": {
    titre: "Échéances et renouvellements",
    page: "offload",
    depart: "/espace2/offload/echeances",
    objectif: "Suivre les échéances périodiques de vos clients et noter une intervention.",
    etapes: [
      {
        ecran: "Ouvrir Échéances et renouvellements.",
        dire: "OFFLOAD suit aussi les échéances qui reviennent : un entretien annuel, un contrôle, un renouvellement.",
      },
      {
        ecran: "Montrer le message de la semaine qui précède, en validation.",
        dire: "La semaine qui précède une échéance, un message est préparé et attend votre validation.",
      },
      {
        ecran: "Sur une échéance, « Noter une intervention… ».",
        dire: "Quand l'intervention est faite, notez-la : l'échéance suivante est datée depuis cette date.",
      },
    ],
  },
  "offload-affaires": {
    titre: "Les affaires restées en plan",
    page: "offload",
    depart: "/espace2/offload/affaires",
    objectif: "Décider du sort d'une affaire qui n'a pas abouti.",
    etapes: [
      {
        ecran: "Ouvrir Affaires restées en plan.",
        dire: "Les affaires restées sans suite sont rangées ici : en attente, closes sans suite, ou retirées.",
      },
      {
        ecran: "Glisser une affaire sur « En attente ».",
        dire: "Pour relancer encore, glissez-la sur « En attente » : un nouveau message est préparé, en validation.",
      },
      { ecran: "Glisser une autre affaire sur « Closes sans suite ».", dire: "Si elle est perdue, closez-la sans suite : elle n'est plus relancée." },
    ],
  },
  "offload-groupes": {
    titre: "Les groupes clients",
    page: "offload",
    depart: "/espace2/offload/groupes",
    objectif: "Regrouper les entités d'un même client.",
    etapes: [
      {
        ecran: "Ouvrir Groupes clients.",
        dire: "Un même client peut avoir plusieurs entités ou plusieurs sites. Les groupes les réunissent.",
      },
      {
        ecran: "Montrer « À rattacher (même domaine de courriel) ».",
        dire: "OFFLOAD vous propose les comptes qui partagent le même domaine de courriel. Rattachez-les à leur groupe.",
      },
      {
        ecran: "Rester sur le groupe rattaché.",
        dire: "Une fois rattachés, le plafond de sollicitation vaut pour tout le groupe : il n'est pas relancé par chacune de ses entités.",
      },
    ],
  },
  "offload-garde-fous": {
    titre: "Les garde-fous",
    page: "offload",
    depart: "/espace2/offload/garde-fous",
    objectif: "Écrire une règle en français et savoir suspendre OFFLOAD.",
    etapes: [
      {
        ecran: "Ouvrir Garde-fous.",
        dire: "Sans règle de votre part, les messages restent sans prix ni délai, toujours au vouvoiement.",
      },
      {
        ecran: "Écrire une règle, par exemple « ne jamais parler de remise », et lire la réponse.",
        dire: "Écrivez une règle en une phrase. OFFLOAD vous répond ce qu'il en fera, ou qu'il ne l'a pas comprise. Tout message qui enfreint une règle est retenu.",
      },
      {
        ecran: "Montrer « Suspendre OFFLOAD », sans cliquer.",
        dire: "En cas de doute, suspendez OFFLOAD : plus aucune reprise ne part.",
      },
    ],
  },
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
