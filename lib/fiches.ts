/* Fiches détaillées des PAQUETS — contenu propre aux pages /offres/[slug],
   volontairement distinct des descriptions courtes de l'accueil.

   05/08/2026 — six fiches au lieu de douze. Les cinq premières reprennent
   mot pour mot celles de leur moteur principal (CASHD ← PAYD, FRONTD ←
   ANSWR, FILED ← OFFLOAD, PULSE ← BRIEF, RELOAD ← REVIVE), enrichies du
   second moteur du paquet quand il y en a un : les avis dans FRONTD, les
   marchés publics dans RELOAD, les leçons hebdomadaires dans PULSE. VAULT
   est entièrement neuf. Les six fiches qui décrivaient des moteurs
   inexistants — POSTD, REACH, HIRED, BILLD, STAYD, COLLECT — sont
   supprimées, leurs URL redirigées dans next.config.ts. */

export type Demo =
  | { type: "timeline"; title: string; items: { k: string; label: string; sub: string }[] }
  | {
      type: "chat";
      title: string;
      sub: string;
      messages: { from: "bot" | "client"; text: string; time: string }[];
      note: string;
    }
  | { type: "doc"; title: string; fields: [string, string][]; status: string }
  | { type: "message"; title: string; lines: { label: string; text: string }[] }
  | { type: "calendar"; title: string; items: { day: string; text: string; canal: string }[] }
  | {
      type: "list";
      title: string;
      items: { text: string; badge: string; tone: "ok" | "warn" | "off" }[];
      footer?: string;
    };

export type Fiche = {
  /* Photo de bannière du hero de fiche (22/07). Absente = hero sombre sans
     photo, sans casse — c'est le cas de VAULT, qui n'en a jamais eu.
     Fichiers dans public/photos/, crédits et licence dans
     public/photos/CREDITS.txt. */
  photo?: string;
  /* Texte alternatif de la photo — décrit l'IMAGE, pas le produit. */
  photoAlt?: string;
  /* Densité du voile noir posé sur la photo, 0 à 1. CALCULÉE, pas choisie
     (23/07, Teo : « elles doivent toutes avoir la même sombritude »).

     Les photos n'ont pas la même luminosité de départ : un voile identique
     donnerait donc un rendu différent — c'était le défaut précédent. On vise
     l'inverse : un RENDU identique. PAYD sert de référence (95ᵉ centile
     0,634 × voile 0,79 → luminance 0,133) et chaque photo reçoit le voile
     qui l'amène à cette même valeur. ANSWR, déjà à 0,131 brut, n'en reçoit
     aucun ; REVIVE, à 0,782, en reçoit 0,83.

     Effet de bord bienvenu : le contraste du texte blanc devient lui aussi
     homogène, 6,1 à 6,2:1 sur les huit — bien au-dessus des 4,5 exigés.
     Absente → 0,75, valeur sûre. */
  photoVoile?: number;
  pitch: string;
  /* Meta description de la page (13/08/2026).

     Avant : `generateMetadata` resservait le pitch. Or le pitch est une
     accroche — il frappe sur la page, au-dessus du pli, une fois le contexte
     posé. Une meta description travaille sans contexte, dans une liste de
     résultats, et doit dire de quoi la page parle. Deux exercices. Absente →
     repli sur le pitch, comme avant. */
  meta?: string;
  /* Copie éditoriale des intertitres de la fiche (26/07/2026).

     Avant : les gabarits fabriquaient ces intertitres par interpolation
     (« PAYD en quatre points. », « Ce qu'on nous demande sur PAYD — répondu
     ici. »), si bien que les douze fiches se lisaient mot pour mot pareil,
     le nom du moteur près. Le chapô de la section « Ce qu'il fait » reprenait
     même le pitch déjà servi en H1 quelques centimètres plus haut.

     Maintenant : chaque moteur écrit ses propres intertitres. Les champs sont
     optionnels et les gabarits gardent leur ancienne formule en repli — un
     moteur sans bloc `sections` ne casse pas, il reste seulement générique.
     Les longueurs sont calées sur les chaînes remplacées pour que le nombre
     de lignes rendu ne bouge pas (titres ≤ 30 caractères, chapôs 120-160).

     13/08/2026 — la même correction est appliquée aux six sections qui
     restaient identiques d'une page à l'autre : « Intégrations », « En
     marche », « Sur vos outils », « Catalogue », le chapô de « Compris » et
     celui de la carte de clôture. Elles étaient figées dans le balisage des
     gabarits, donc rigoureusement mot pour mot sur les six paquets — l'effet
     copier-coller le plus visible du site. Les repli sont conservés : un
     moteur sans copie propre retombe sur l'ancienne formule générique. */
  sections?: {
    /* « Ce qu'il fait » — H2 et chapô (gabarits home et publish) */
    pointsTitre?: string;
    pointsChapo?: string;
    /* « Le détail » — chapô (gabarit home) */
    detailChapo?: string;
    /* « Pensé pour » — chapô (gabarit home) */
    cibleChapo?: string;
    /* FAQ — sous-titre (les trois gabarits) */
    faqChapo?: string;
    /* « Ce qu'il apporte » — H2 et chapô (gabarit intégration). Le chapô
       reprenait `m.benefit`, écrit pour les cartes de l'accueil : trop court
       pour tenir un chapô de section. Absent → on y retombe. */
    apportTitre?: string;
    apportChapo?: string;
    /* titres des deux blocs alternés (gabarit intégration) */
    blocTitres?: [string, string];
    /* « Intégrations » — H2 et chapô (gabarits home et publish) */
    integrationsTitre?: string;
    integrationsChapo?: string;
    /* « En marche » — H2 et chapô (gabarit home) */
    marcheTitre?: string;
    marcheChapo?: string;
    /* « Le moteur en situation » — la ligne sous le titre (gabarit home) */
    situationChapo?: string;
    /* « Sur vos outils » — la ligne sous le titre (gabarit home) */
    outilsChapo?: string;
    /* « Catalogue » — chapô du bandeau des autres moteurs (home et publish) */
    catalogueChapo?: string;
    /* « Compris » — chapô (gabarits home et publish) */
    comprisChapo?: string;
    /* carte de clôture « X est-il le bon pour vous ? » — chapô (gabarits
       intégration et publish ; le gabarit home n'a pas cette carte) */
    clotureChapo?: string;
  };
  /* Description développée du moteur. Chaîne = un seul paragraphe (moteurs
     non vitrine) ; tableau = plusieurs paragraphes développés (moteurs des
     onglets /solutions, enrichis le 23/07 à la demande de Teo). Les deux
     rendus — panneau /solutions et fiche complète — normalisent en tableau. */
  fonctionnement: string | string[];
  points: string[];
  controle: string;
  outils: string[];
  cible: string[];
  etapes: { t: string; d: string }[];
  faq: { q: string; a: string }[];
  demo: Demo;
};

export const FAMILLE_INTROS: Record<string, string> = {
  installes:
    "L'argent qui rentre mal, le fichier client qui dort, les demandes qui tombent à toute heure, la paperasse qui s'accumule : quatre postes qui usent un dirigeant, traités en continu sur des règles explicites.",
  compris:
    "Le point du matin et les verrous d'envoi ne sont pas des options : ils tournent chez tout le monde dès le premier jour, et ne figurent sur aucune ligne de facture.",
};

export const FICHES: Record<string, Fiche> = {
  CASHD: {
    photo: "/photos/payd.jpg",
    photoAlt: "Un dirigeant travaille seul à son bureau en soirée, écran allumé.",
    photoVoile: 0.79,
    pitch: "Le facturier qui se défend tout seul.",
    meta: "Vos impayés relancés chaque jour, sans que vous ayez à y penser.",
    sections: {
      pointsTitre: "Ce que CASHD fait de votre matinée.",
      pointsChapo:
        "Une relecture du facturier au réveil, un protocole gradué dans la journée, un état des encours tenu à jour en permanence.",
      detailChapo:
        "Ce que CASHD lit dans votre tableur, ce qui détermine le ton d'un message, et la limite qu'il ne franchit pas sans vous.",
      cibleChapo:
        "Les activités qui livrent d'abord et facturent ensuite. C'est là que l'encours se creuse sans bruit, et là qu'un retard oublié devient un impayé.",
      faqChapo: "Les trois questions posées à chaque installation de CASHD.",
      integrationsTitre: "Vos outils actuels suffisent.",
      integrationsChapo:
        "CASHD lit le tableur où vit votre facturation, vérifie les encaissements dans votre outil de paiement, et écrit dans la messagerie d'où partent vos relances. Aucun compte à ouvrir, aucune donnée à migrer, aucun logiciel à apprendre.",
      marcheTitre: "Une échéance dépassée, une chaîne, votre validation.",
      marcheChapo:
        "Le déclencheur est toujours un fait vérifiable de votre facturier : une facture qui franchit son échéance, un devis qui reste sans réponse. La chaîne se déroule ensuite étape par étape, et la dernière s'arrête devant vous.",
      situationChapo:
        "Ce que CASHD produit concrètement, sur une facture émise et jamais réglée.",
      outilsChapo:
        "Le moteur travaille dans vos outils actuels. Aucun n'est remplacé, aucun n'est à réapprendre.",
      catalogueChapo:
        "Un encours qui traîne n'est pas toujours le premier problème à traiter. L'audit compare ce que chaque moteur vous rapporterait, et il arrive qu'il désigne un autre.",
      comprisChapo:
        "La relance est la partie qu'on voit. Ce qui suit est livré avec, sans supplément et sans négociation.",
    },
    fonctionnement: [
      "CASHD lit chaque matin le tableur de facturation que vous tenez déjà (vos colonnes, vos habitudes, rien à changer) et en tire un échéancier vivant. Pour chaque devis, le nombre de jours écoulés sans réponse. Pour chaque facture, le retard, le montant, le client. Un règlement encaissé la veille sort de la liste avant toute action : un client qui a payé n'est jamais recontacté.",
      "Sur cette lecture s'applique un protocole gradué : rappel courtois vers J+7, relance ferme vers J+21, puis, si le silence persiste, dossier de mise en demeure constitué avec ses pièces. Les devis suivent une cadence plus resserrée, J+3 puis J+7 : un devis qui refroidit se perd plus vite qu'une facture, et se rattrape moins bien.",
      "Chaque message est écrit pour un cas précis. Le ton suit trois variables : le montant en jeu, l'ancienneté du retard, l'historique de paiement du client. Un bon payeur momentanément en retard et un mauvais payeur récidiviste ne reçoivent ni le même texte, ni la même fermeté. En parallèle, l'état de vos encours reste consultable en permanence : qui doit quoi, depuis quand, quelle action suit.",
    ],
    points: [
      "Relecture quotidienne : devis restés sans réponse (relance à J+3 puis J+7), factures dépassées (J+7 puis J+21)",
      "Messages rédigés au cas par cas, selon le montant, l'ancienneté et l'historique : jamais deux fois le même texte au même client",
      "Escalade graduée : rappel courtois, relance ferme, puis dossier de mise en demeure constitué avec ses pièces",
      "État des encours consultable à tout moment : qui doit quoi, depuis quand, quelle action suit",
    ],
    controle:
      "Aucun message ne part sans votre accord : un clic pour approuver, corriger ou suspendre. La mise en demeure exige une validation explicite, à chaque fois.",
    outils: ["Google Sheets / Excel", "Gmail / Outlook", "WhatsApp"],
    cible: ["Artisans & BTP", "Garages", "Grossistes", "Services B2B"],
    etapes: [
      {
        t: "Raccordement au facturier",
        d: "CASHD se branche sur votre tableur de facturation tel qu'il est, on ne change ni vos colonnes ni vos habitudes. Une demi-journée, historique inclus.",
      },
      {
        t: "Réglage des cadences et des tons",
        d: "Ensemble, on fixe les délais de relance, les gabarits de messages et les clients à exclure. C'est votre politique de recouvrement, écrite noir sur blanc.",
      },
      {
        t: "Premier cycle supervisé",
        d: "Les deux premières semaines, chaque message vous est soumis avant envoi. Ensuite, vous choisissez ce qui part seul et ce qui attend votre clic.",
      },
    ],
    faq: [
      {
        q: "Et si un client paie entre deux relances ?",
        a: "CASHD relit le facturier avant chaque action. Un règlement enregistré interrompt la séquence sur-le-champ : un client qui a payé ne reçoit pas de relance.",
      },
      {
        q: "Puis-je exclure certains clients ?",
        a: "Oui. Une liste blanche est établie à l'installation et modifiable à tout moment : collectivités, grands comptes, relations personnelles. Ces contacts sortent du périmètre automatique, et seul vous pouvez les y remettre.",
      },
      {
        q: "Qui écrit les messages ?",
        a: "Les gabarits sont rédigés avec vous à l'installation, puis adaptés par le moteur à chaque situation. Le ton reste le vôtre, et rien ne part sans votre relecture.",
      },
    ],
    demo: {
      type: "timeline",
      title: "Le protocole appliqué à une facture échue",
      items: [
        { k: "J 0", label: "Facture émise", sub: "suivi ouvert automatiquement" },
        { k: "J+7", label: "Rappel courtois", sub: "ton calé sur l'historique de paiement" },
        {
          k: "J+21",
          label: "Relance ferme",
          sub: "récapitulatif des sommes dues, nouvelle échéance",
        },
        {
          k: "J+30",
          label: "Mise en demeure préparée",
          sub: "transmise à votre signature, jamais envoyée seule",
        },
      ],
    },
  },
  FRONTD: {
    photo: "/photos/answr.jpg",
    photoAlt: "Les mains d'une personne qui répond à un message sur son téléphone.",
    photoVoile: 0.79,
    pitch: "Une réception qui ne dort jamais, avec votre discours, pas le sien.",
    meta: "Une demande reçue à 21 h obtient sa réponse à 21 h.",
    sections: {
      apportTitre: "Répondre à toute heure, sans jamais improviser.",
      apportChapo:
        "Une demande reçue à 21 h obtient sa réponse à 21 h, et cette réponse ne dit rien que vous n'ayez validé.",
      blocTitres: ["Répondre, puis qualifier", "Les cas transférés"],
      faqChapo:
        "Ce que le client sait, ce que le moteur s'interdit, ce que fait l'agenda : les trois questions posées à chaque installation.",
      clotureChapo:
        "L'audit gratuit chiffre ce que vous coûtent les demandes restées sans réponse, et le compare à ce que les autres moteurs vous feraient gagner.",
    },
    fonctionnement: [
      "À l'installation, on construit ensemble la base de connaissances de votre entreprise : horaires, tarifs, prestations, durées d'intervention, politique d'annulation, et les questions qui reviennent le plus souvent. FRONTD s'appuie exclusivement dessus. Il ne comble jamais un trou par une supposition : une demande hors périmètre déclenche un transfert vers vous, pas une approximation.",
      "Sur WhatsApp comme par mail, il répond en moins d'une minute à toute heure, week-ends et jours fériés compris, et commence par qualifier : devis, urgence, réclamation ou simple renseignement. Chaque type suit ensuite son circuit. S'il s'agit d'un rendez-vous, il propose un créneau réellement libre dans votre agenda, le réserve, confirme au client et programme un rappel la veille.",
      "Les situations sensibles et les mots d'urgence sont définis avec vous à l'installation, et ne sont jamais traités à l'aveugle : votre téléphone sonne immédiatement, la conversation vous est transférée avec tout son historique. Le reste tourne seul, et chaque échange reste archivé.",
      "Une fois l'affaire faite et la facture réglée, le même poste prend le relais sur votre réputation. Une demande d'avis part dans les trois jours, relancée une fois, puis une seconde si rien ne vient, avec six mois de carence par personne. Les messages sont écrits d'avance et identiques pour tout le monde : aucun tri des mécontents. C'est interdit, et ça finit toujours par se voir.",
    ],
    points: [
      "Réponse en moins d'une minute, 24 h/24, week-ends et jours fériés compris",
      "Rendez-vous posés directement dans votre agenda, avec confirmation au client et rappel la veille",
      "Qualification systématique : chaque type de demande (devis, urgence, réclamation, renseignement) suit son circuit",
      "Transfert immédiat des cas sensibles, avec l'historique complet de la conversation",
      "Demande d'avis après règlement, deux relances au maximum, six mois de carence par personne",
    ],
    controle:
      "Vous fixez la frontière : ce qui est traité seul, ce qui vous est transmis. Toutes les conversations sont archivées et consultables à tout moment.",
    outils: ["WhatsApp Business", "Gmail / Outlook", "Google Agenda", "Fiche Google Business"],
    cible: ["Garages & ateliers", "Instituts & salons", "Cabinets", "Commerces"],
    etapes: [
      {
        t: "Construction de la base",
        d: "Un entretien d'une heure suffit : prestations, tarifs, horaires, règles maison. Tout ce que le moteur a le droit de dire vient de là, et de nulle part ailleurs.",
      },
      {
        t: "Branchement des canaux",
        d: "WhatsApp Business, votre boîte mail et votre agenda sont raccordés. Vos numéros et vos adresses ne changent pas.",
      },
      {
        t: "Rodage en double écoute",
        d: "La première semaine, vous recevez copie de chaque conversation. On ajuste les réponses sur les cas réels, puis le moteur prend son rythme.",
      },
    ],
    faq: [
      {
        q: "Le client comprend-il qu'il ne parle pas à un humain ?",
        a: "La mention figure dans la première réponse, dans les termes que vous choisissez à l'installation. L'expérience montre que ce qui agace un client, ce n'est pas de parler à une machine : c'est d'attendre jusqu'à lundi.",
      },
      {
        q: "Et s'il invente une réponse ?",
        a: "Il ne peut répondre qu'à partir de la base construite avec vous. Hors de ce périmètre, il ne formule pas d'hypothèse : il transfère, avec l'historique complet de l'échange.",
      },
      {
        q: "Que se passe-t-il si deux clients demandent le même créneau ?",
        a: "La réservation s'écrit directement dans votre agenda, en temps réel. Le second créneau n'apparaît plus comme disponible, et le client se voit proposer les suivants.",
      },
    ],
    demo: {
      type: "chat",
      title: "Samedi, 21 h 47",
      sub: "L'atelier est fermé, FRONTD répond",
      messages: [
        {
          from: "client",
          text: "Bonsoir, vous êtes ouverts samedi ? C'est pour une vidange sur un Duster.",
          time: "21:47",
        },
        {
          from: "bot",
          text: "Bonsoir ! Oui, l'atelier ouvre samedi de 8 h à 13 h. Comptez environ 45 minutes pour une vidange de Duster. Je peux vous réserver samedi 9 h 30 ?",
          time: "21:47",
        },
        { from: "client", text: "Parfait pour 9h30 👍", time: "21:52" },
        {
          from: "bot",
          text: "C'est réservé, samedi 9 h 30. Vous recevrez un rappel vendredi soir. Bonne soirée !",
          time: "21:52",
        },
      ],
      note: "Rendez-vous créé dans l'agenda atelier · client confirmé",
    },
  },
  FILED: {
    photo: "/photos/offload.jpg",
    photoAlt: "Une personne attablée dépouille un document administratif.",
    photoVoile: 0.81,
    pitch: "La compta fournisseurs sans une seule ligne de saisie.",
    meta: "Vos factures fournisseurs lues, contrôlées, classées et transmises au cabinet.",
    sections: {
      integrationsTitre: "Vos outils actuels suffisent.",
      integrationsChapo:
        "FILED récupère vos pièces dans votre messagerie, quel que soit leur format (PDF, scan ou photo) et les range sur le Drive de votre entreprise. Aucun logiciel comptable à acquérir, aucune donnée à migrer.",
      comprisChapo:
        "Le classement est la partie qu'on voit. Ce qui suit est livré avec, sans supplément et sans négociation.",
      catalogueChapo:
        "Le temps passé sur la paperasse n'est pas toujours le premier poste à traiter. L'audit compare ce que chaque moteur vous rapporterait, et il arrive qu'il désigne un autre.",
      clotureChapo:
        "L'audit gratuit chiffre les heures que vous passez sur vos pièces comptables, et les compare à ce que les autres moteurs vous feraient gagner.",
      faqChapo:
        "Le cabinet, les pièces illisibles, le stockage : les trois questions posées à chaque installation de FILED.",
    },
    fonctionnement: [
      "Vous transférez vos factures fournisseurs vers une adresse dédiée : PDF reçus par mail, scans, photos de tickets prises au comptoir. FILED lit chaque pièce quel qu'en soit le format et en extrait les champs comptables : émetteur, date, montants HT, TVA et TTC, échéance, mode de règlement. La saisie manuelle disparaît, et avec elle la ressaisie du dimanche soir.",
      "Chaque extraction passe des contrôles au fil de l'eau : doublon d'une pièce déjà reçue, montant inhabituel pour ce fournisseur, taux de TVA incohérent. Ce qui est certain est classé automatiquement par fournisseur. Ce qui laisse un doute est marqué « à vérifier » et vous est signalé, jamais rangé en silence avec une erreur à l'intérieur.",
      "Tout est stocké dans une arborescence à votre nom, sur le Drive de votre entreprise. À date fixe, le dossier du mois part vers votre cabinet comptable dans le format qu'il préfère : il gagne du temps sans rien changer à ses méthodes, et vous n'avez plus à courir après les pièces manquantes.",
    ],
    points: [
      "Lecture de tous les formats : PDF natifs, scans, photos de tickets prises au comptoir",
      "Extraction des champs comptables : émetteur, date, montants HT / TVA / TTC, échéance, mode de règlement",
      "Contrôles systématiques : doublon déjà reçu, montant inhabituel pour ce fournisseur, taux de TVA incohérent",
      "Dossier mensuel classé par fournisseur, transmis au cabinet à date fixe, dans son format",
    ],
    controle:
      "Les anomalies vous sont signalées au fil de l'eau, et rien ne part vers le cabinet avant que la liste du mois soit passée sous vos yeux.",
    outils: ["Gmail / Outlook", "Google Drive", "Google Sheets / Excel"],
    cible: ["BTP & artisans", "Restauration", "Commerces", "Transport"],
    etapes: [
      {
        t: "Adresse dédiée et arborescence",
        d: "Une adresse de collecte est créée, l'arborescence de classement montée sur votre Drive. Vous transférez vos pièces, le reste suit.",
      },
      {
        t: "Calibrage sur votre historique",
        d: "Le moteur apprend vos fournisseurs récurrents sur les trois derniers mois : formats de facture, montants habituels, taux de TVA pratiqués.",
      },
      {
        t: "Accord avec le cabinet",
        d: "On cale avec votre comptable le format et la date de transmission. Le cabinet reçoit un dossier propre, toujours identique, toujours à l'heure.",
      },
    ],
    faq: [
      {
        q: "Mon comptable doit-il changer ses outils ?",
        a: "Non. Le cabinet reçoit un dossier classé dans le format qu'il utilise déjà. Il gagne du temps sans rien modifier à ses méthodes : le format et la date de transmission sont calés avec lui pendant l'installation.",
      },
      {
        q: "Une photo de ticket froissé, ça passe ?",
        a: "Dans la grande majorité des cas, oui. Quand la lecture n'est pas certaine, la pièce est marquée « à vérifier » et vous est signalée. Un doute vous remonte toujours : il n'est jamais classé en silence.",
      },
      {
        q: "Où sont stockées mes factures ?",
        a: "Sur le Drive de votre entreprise, dans une arborescence à votre nom. La lecture des pièces transite par votre espace dédié (chiffré, hébergé dans l'Union européenne) et rien n'est réutilisé à d'autres fins.",
      },
    ],
    demo: {
      type: "doc",
      title: "Photo de facture reçue à 11 h 42",
      fields: [
        ["Émetteur", "SARL Caraïbe Pièces Auto"],
        ["Date", "12/07/2026"],
        ["Montant HT", "1 240,00 €"],
        ["TVA 8,5 %", "105,40 €"],
        ["Montant TTC", "1 345,40 €"],
        ["Échéance", "11/08/2026"],
      ],
      status: "Classée → Juillet / Caraïbe Pièces Auto · aucun doublon détecté",
    },
  },
  PULSE: {
    photo: "/photos/brief.jpg",
    photoAlt: "Un ordinateur portable et une tasse de café sur une table en bois, au matin.",
    photoVoile: 0.78,
    pitch: "L'état de l'entreprise en un message, avant le premier café.",
    meta: "L'état réel de votre entreprise, en un message, à 7 h.",
    sections: {
      pointsTitre: "Ce que contient le brief.",
      /* 13/08 — le chapô annonçait « quatre blocs » et la section en aligne
         cinq depuis l'ajout du bilan hebdomadaire. Le compte est retiré
         plutôt que corrigé : il se démentira au prochain point ajouté. */
      pointsChapo:
        "Toujours le même ordre de lecture : le cash, les relances, les décisions qui vous attendent, les 48 heures qui viennent.",
      detailChapo:
        "D'où viennent les chiffres, comment ils sont hiérarchisés, et pourquoi il n'y a qu'un message par jour.",
      cibleChapo:
        "Les dirigeants qui portent quatre casquettes avant midi et n'ouvriront jamais un tableau de bord de plus.",
      faqChapo:
        "L'heure, le format, la source des chiffres : ce qu'on nous demande à chaque installation.",
      integrationsTitre: "Vos outils actuels suffisent.",
      integrationsChapo:
        "PULSE ne crée aucune donnée. Il lit ce qui existe déjà (facturier, agenda, messagerie, moteurs installés) et le restitue en un seul endroit. Aucune saisie supplémentaire n'est demandée à personne.",
      marcheTitre: "Une nuit de collecte, un message, votre lecture.",
      marcheChapo:
        "La chaîne se déclenche à heure fixe, sans événement extérieur : chaque nuit, les sources sont relues, les écarts calculés, les priorités classées. À 7 h, il ne reste qu'un message.",
      situationChapo: "Ce que PULSE produit concrètement, un mardi ordinaire.",
      outilsChapo:
        "Le moteur lit dans vos outils actuels. Aucun n'est remplacé, aucun n'est à réapprendre.",
      catalogueChapo:
        "PULSE rend compte de ce que les autres moteurs font : seul, il a moins à raconter. L'audit détermine l'ordre d'installation le plus rentable, et il commence rarement par celui-ci.",
      comprisChapo:
        "Le brief du matin est la partie qu'on voit. Ce qui suit est livré avec, sans supplément et sans négociation.",
    },
    fonctionnement: [
      "Chaque nuit, PULSE rassemble ce que vos outils et le reste du système savent déjà (encaissements, relances, agenda, retards) et le condense en un message unique, hiérarchisé, livré à 7 h. Pas un tableau de bord de plus à ouvrir : un point qui se lit comme un SMS. La limite d'un message par jour n'est pas une contrainte technique, c'est une règle : au-delà, plus personne ne les lit.",
      "Une fois par semaine, il relit ce qui s'est réellement passé et vous propose entre zéro et trois enseignements tirés de faits observés : une formulation que vous corrigez systématiquement, un délai qui ne tient jamais, une question de client qui revient sans arrêt. Vous validez ou vous refusez. Seul ce que vous acceptez entre en mémoire et sert les semaines suivantes. Rien n'est retenu dans votre dos, et ce que vous refusez est effacé.",
    ],
    points: [
      "Encaissements de la veille et évolution des encours, comparés à la semaine précédente",
      "Relances parties, réponses reçues, dossiers en attente d'une décision de votre part",
      "Les trois actions du jour classées par impact, pas une liste de vingt tâches",
      "Rendez-vous et échéances des 48 prochaines heures",
      "Un bilan hebdomadaire proposé, jamais imposé : ce que vous validez devient la règle",
    ],
    controle:
      "Le contenu et l'ordre de lecture sont fixés avec vous à l'installation, selon ce qui compte dans votre activité. Un message par jour, jamais deux.",
    outils: ["WhatsApp", "Google Sheets / Excel", "Google Agenda"],
    cible: ["Dirigeants multi-casquettes", "Gérants d'atelier", "Professions libérales"],
    etapes: [
      {
        t: "Choix des indicateurs",
        d: "On liste ce que vous vérifiez chaque matin, et ce que vous aimeriez vérifier sans jamais avoir le temps. Ça devient la trame du brief.",
      },
      {
        t: "Branchement des sources",
        d: "Tableur, agenda, moteurs déjà actifs : PULSE lit ce qui existe. Aucune saisie supplémentaire ne vous est demandée.",
      },
      {
        t: "Ajustement du format",
        d: "Après une semaine, on resserre : ce qui est utile reste, ce qui n'est jamais lu saute. Le brief converge vers votre lecture idéale.",
      },
    ],
    faq: [
      {
        q: "Puis-je changer l'heure de réception ?",
        a: "Librement : 5 h pour les lève-tôt, 7 h par défaut, ou le dimanche soir pour préparer la semaine. C'est un réglage, pas un chantier.",
      },
      {
        q: "Et si je ne le lis pas un matin ?",
        a: "Rien ne bloque. Le brief est une photographie, pas une file de validations. Les décisions en attente, elles, restent visibles le lendemain, et le surlendemain.",
      },
      {
        q: "D'où viennent les chiffres ?",
        a: "De vos propres outils : facturier, agenda, messagerie, et les moteurs installés chez vous. PULSE n'invente aucun chiffre et n'en estime aucun : chaque ligne est traçable jusqu'à sa source.",
      },
      {
        q: "Le système apprend tout seul ?",
        a: "Non. Il propose ce qu'il croit avoir compris, vous tranchez. Ce que vous refusez n'est pas conservé, et rien n'entre en mémoire sans votre accord explicite.",
      },
    ],
    demo: {
      type: "message",
      title: "PULSE · mardi 21 juillet, 7 h 00",
      lines: [
        {
          label: "Cash",
          text: "Encaissé hier : 3 240 € (Villa Kariba, Resto La Datcha). Encours : 18 750 €, en baisse de 9 % sur la semaine.",
        },
        {
          label: "Relances",
          text: "2 parties hier, 1 réponse : Garage Petit-Bourg annonce un règlement vendredi.",
        },
        {
          label: "À décider",
          text: "1. Valider la mise en demeure SCI Lauricisque · 2. Rappeler M. Sainte-Rose (devis 4 800 €) · 3. Signer le dossier Chèque TIC.",
        },
        { label: "Agenda", text: "9 h fournisseur · 14 h chantier Baie-Mahault." },
      ],
    },
  },
  RELOAD: {
    photo: "/photos/revive.jpg",
    photoAlt: "L'intérieur d'une boutique de vêtements, articles présentés en rayon.",
    photoVoile: 0.83,
    pitch: "Votre fichier client vaut plus que n'importe quelle publicité.",
    meta: "Vos anciens clients rapportent plus que vos nouvelles publicités.",
    sections: {
      apportTitre: "Réveiller le fichier sans harceler les clients.",
      apportChapo:
        "Vos clients silencieux classés par valeur, les marchés de votre zone filtrés chaque jour sur vos capacités réelles.",
      blocTitres: ["Un message par client", "Une cadence plafonnée"],
      faqChapo:
        "La taille du fichier, la pression sur les clients, les marchés publics : les trois questions posées à chaque installation.",
      clotureChapo:
        "L'audit gratuit chiffre ce qui dort dans votre fichier client, et le compare à ce que les autres moteurs vous feraient gagner.",
    },
    fonctionnement: [
      "RELOAD croise votre historique de ventes et votre fichier de contacts pour cartographier vos clients silencieux, puis les classe par valeur et par récence. On réveille d'abord ceux qui rapportaient le plus et qui viennent de décrocher, avant les occasionnels plus anciens : l'effort va là où le retour est le plus probable.",
      "Chaque client reçoit un message écrit pour lui, ancré dans son historique réel : dernier achat, dernier passage, prestation habituelle. C'est l'inverse exact d'une newsletter envoyée à tous, et c'est ce qui sépare un message qu'on ouvre d'un message qu'on supprime.",
      "Le plafond est volontaire : une sollicitation par trimestre et par client, sur WhatsApp en priorité quand le numéro existe, sinon par mail, jamais les deux. Dès qu'une réponse arrive, même négative, la séquence s'arrête et la conversation vous revient.",
      "L'autre gisement est dehors. Chaque jour, les consultations publiques de votre secteur et de votre zone sont relevées, puis écartées dès qu'elles sortent de vos capacités réelles : montant, délai, qualifications exigées. Il en reste une poignée par semaine : celles qui valent le temps que vous y passerez. Sur un territoire où la commande publique fait vivre une part importante du bâtiment, c'est un terrain que la plupart des petites entreprises ne regardent jamais, faute d'une heure à y consacrer.",
    ],
    points: [
      "Segmentation par valeur et par récence : on réveille d'abord ceux qui rapportaient le plus et qui viennent de décrocher",
      "Message individuel ancré dans l'historique réel : dernier achat, dernier passage, préférence connue",
      "Cadence plafonnée : une sollicitation par trimestre et par client, jamais davantage",
      "Arrêt immédiat dès qu'une réponse arrive, même négative : la conversation vous revient",
      "Veille quotidienne des consultations publiques de votre zone, filtrées sur vos qualifications et vos plafonds",
    ],
    controle:
      "La liste des clients à recontacter vous est soumise avant chaque vague. Un nom retiré ne sera jamais recontacté, et aucun dossier de marché ne part sans votre feu vert.",
    outils: ["Google Sheets / Excel", "WhatsApp", "Gmail / Outlook", "Plateformes de marchés publics"],
    cible: ["BTP & artisans", "Garages", "Instituts & salons", "Commerces de détail"],
    etapes: [
      {
        t: "Analyse du fichier",
        d: "RELOAD croise votre historique de ventes et votre fichier de contacts, et dresse la carte de vos dormants : qui, depuis quand, pour quelle valeur historique.",
      },
      {
        t: "Validation de la première vague",
        d: "Vous passez la liste en revue, retirez qui vous voulez, validez les gabarits. Aucun message ne part avant cette étape.",
      },
      {
        t: "Vagues suivantes en rythme",
        d: "Le moteur enchaîne au rythme convenu, mesure les retours vague après vague, et concentre l'effort sur les profils de clients qui répondent le mieux.",
      },
    ],
    faq: [
      {
        q: "Combien de clients dormants faut-il pour que ce soit rentable ?",
        a: "Cela dépend moins de la taille du fichier que de la valeur d'un client réactivé : deux cents contacts dans le bâtiment ne pèsent pas comme deux mille en commerce de détail. L'audit fait ce calcul avec vos chiffres, et vous dit franchement si la réactivation à la main reste plus simple.",
      },
      {
        q: "Mes clients vont-ils se sentir harcelés ?",
        a: "C'est précisément ce que le plafond empêche : une sollicitation par trimestre et par client, un seul canal à la fois, arrêt immédiat à la première réponse. Un client qui ne répond jamais sort du cycle au lieu d'y tourner en boucle.",
      },
      {
        q: "Je n'ai jamais répondu à un marché public. C'est jouable ?",
        a: "La veille ne dépose pas les dossiers à votre place : elle vous évite de passer à côté. Les consultations hors de vos qualifications ou de vos plafonds sont écartées avant de vous parvenir, et rien ne part sans votre feu vert.",
      },
    ],
    demo: {
      type: "chat",
      title: "Cliente inactive depuis 8 mois",
      sub: "Institut Beauté Kréol, réactivation RELOAD",
      messages: [
        {
          from: "bot",
          text: "Bonjour Mme Larcher, ici Beauté Kréol. Votre dernier soin visage remonte à janvier : votre créneau habituel du samedi matin est libre ce mois-ci, avec 10 % fidélité. On vous le réserve ?",
          time: "10:02",
        },
        { from: "client", text: "Ah oui pourquoi pas ! Samedi 10h c'est possible ?", time: "10:34" },
        {
          from: "bot",
          text: "C'est réservé, samedi 10 h. Au plaisir de vous revoir !",
          time: "10:35",
        },
      ],
      note: "Cliente réactivée, rendez-vous en agenda, fiche mise à jour",
    },
  },
  /* VAULT — écrit le 05/08/2026, sans reprise d'une fiche existante : le
     socle n'avait jamais été présenté au client, alors que c'est le seul
     argument qu'un concurrent local ne peut pas copier en une semaine. Tout
     ce qui est décrit ici existe et tourne — les verrous vivent dans la base
     de données, pas dans les automatisations. */
  VAULT: {
    pitch: "Ce que le système refuse d'envoyer, et pourquoi il ne peut pas.",
    meta: "Les envois que le système refuse, et pourquoi il ne peut pas passer outre.",
    sections: {
      pointsTitre: "Ce qui ne partira jamais.",
      pointsChapo:
        "Quatre situations qu'aucun réglage, aucune erreur de configuration et aucune consigne mal formulée ne peuvent autoriser.",
      detailChapo:
        "Où vivent les garde-fous, pourquoi leur emplacement n'est pas un détail, et ce qui reste tracé une fois qu'un message est parti.",
      cibleChapo:
        "Toutes les entreprises équipées, sans exception et sans supplément. Le socle ne se choisit pas : il est posé le premier jour, avant le premier moteur.",
      faqChapo: "Le contrôle, la sortie, les données : les trois questions posées à chaque audit.",
      integrationsTitre: "Le socle, pas une option.",
      integrationsChapo:
        "VAULT ne se branche pas à côté des autres moteurs : il s'installe en dessous. Tout ce que CASHD, RELOAD, FRONTD ou FILED préparent passe par lui avant de partir. Un moteur mal configuré ne peut pas le contourner : le contrôle est en dessous de lui, pas à côté.",
      marcheTitre: "Un envoi préparé, douze contrôles, votre décision.",
      marcheChapo:
        "Entre le moment où un moteur prépare un message et celui où il part, douze vérifications s'exécutent dans la base de données. Un message qui échoue à l'une d'elles n'est pas reporté à plus tard : il n'est jamais écrit.",
      situationChapo:
        "Ce que VAULT arrête concrètement, sur une journée ordinaire de relances.",
      outilsChapo:
        "Le moteur contrôle ce qui sort de vos outils actuels. Aucun n'est remplacé, aucun n'est à réapprendre.",
      catalogueChapo:
        "VAULT ne s'installe jamais seul : il encadre les moteurs que vous choisissez. L'audit désigne celui par lequel commencer, et le socle vient avec.",
      comprisChapo:
        "Les verrous sont la partie qu'on voit. Ce qui suit est livré avec, sans supplément et sans négociation.",
    },
    fonctionnement: [
      "Chaque message préparé passe par votre file de validation : vous approuvez, vous corrigez le texte, ou vous laissez tomber. Rien ne part derrière votre dos. Et le réglage qui autoriserait le contraire n'est pas laissé à la main d'un installateur pressé : c'est une décision prise avec vous, poste par poste, après une période de rodage.",
      "En dessous, douze verrous vivent dans la base de données elle-même, pas dans les automatisations qui l'utilisent. La différence est tout sauf théorique : une automatisation buggée, mal configurée ou mal instruite ne peut pas écrire un envoi interdit : la base le refuse avant qu'il existe. Un client qui a réglé, un client qui a répondu « stop », un dimanche à 23 h, deux messages coup sur coup à la même personne, une relance pour douze euros : ce ne sont pas des consignes, ce sont des impossibilités.",
      "Enfin, tout ce qui part s'inscrit dans un journal qui ne peut être ni modifié ni supprimé, y compris par nous. Vous savez à tout moment ce qui a été envoyé, à qui, quel jour, sous quelle formulation, et vous pouvez le prouver. Cela devient très concret le jour où un client affirme n'avoir jamais été relancé.",
    ],
    points: [
      "Validation avant envoi : chaque message vous est soumis, vous approuvez, corrigez ou annulez",
      "Un « stop » client vaut retrait immédiat et définitif, sur tous les canaux et tous les moteurs à la fois",
      "Douze verrous inscrits dans la base : client déjà réglé, hors horaires, montant dérisoire, double envoi, plafond quotidien",
      "Journal immuable de tout ce qui est parti : consultable, exportable, opposable",
    ],
    controle:
      "Un seul réglage coupe l'ensemble du système, immédiatement, sans passer par nous. C'est le premier bouton qu'on vous montre à l'installation, avant même de parler de ce que ça rapporte.",
    outils: ["Votre espace dédié", "Gmail / Outlook", "WhatsApp"],
    cible: ["Toutes les entreprises équipées", "Sans supplément", "Dès le premier jour"],
    etapes: [
      {
        t: "Vos interdits, écrits noir sur blanc",
        d: "Qui ne doit jamais être contacté automatiquement, quels sujets vous reviennent toujours, quels horaires sont exclus. C'est le premier bloc de l'entretien d'installation, et le plus décisif.",
      },
      {
        t: "Rodage sans rien envoyer",
        d: "Pendant deux semaines, tout tourne et rien ne sort : les messages sont préparés et relus, jamais expédiés. Vous voyez exactement ce que le système aurait écrit.",
      },
      {
        t: "Bascule un poste à la fois",
        d: "Les relances d'abord, puis les autres, à raison d'un par semaine. On vérifie la bonne réception sur une vraie boîte avant d'aller plus loin.",
      },
    ],
    faq: [
      {
        q: "Comment j'arrête tout, tout de suite ?",
        a: "Un seul réglage, dans votre espace, coupe l'ensemble des envois immédiatement, sans nous appeler, sans délai. Ce qui était en attente reste en attente : rien ne se perd, rien ne repart seul.",
      },
      {
        q: "Et si le système se trompe malgré tout ?",
        a: "Sur les douze cas verrouillés, il ne peut pas se tromper : le refus vient de la base, pas d'une consigne. Sur le reste, tout ce qui a été refusé, arrêté ou mal compris est consigné, et vous le retrouvez dans le point du matin.",
      },
      {
        q: "Le jour où j'arrête, il se passe quoi ?",
        a: "Vos données vous sont remises intégralement, et effacées de nos serveurs sur simple demande. Vous restez propriétaire de vos clients, de vos factures et de votre historique : c'est écrit dans le contrat, pas seulement sur cette page.",
      },
    ],
    /* 13/08 — le titre annonçait « Envois refusés » sur une liste dont la
       troisième ligne attend au contraire votre validation, et le pied
       comptait trois refus là où la liste en montre deux. Titre et pied
       distinguent maintenant ce que le système arrête de ce qui vous revient. */
    demo: {
      type: "list",
      title: "Envois arrêtés, journée du 20 juillet",
      items: [
        {
          text: "SARL Bel-Air · facture réglée hier soir, relance annulée",
          badge: "Refusé",
          tone: "off",
        },
        {
          text: "M. Sainte-Rose · a répondu avant-hier, dossier en pause 14 jours",
          badge: "En pause",
          tone: "warn",
        },
        {
          text: "Villa Kariba · relance de niveau 2 préparée, en attente de vous",
          badge: "À valider",
          tone: "ok",
        },
      ],
      footer:
        "Sur 14 envois préparés, 2 arrêtés par le système et 1 qui attend votre décision",
    },
  },
};
