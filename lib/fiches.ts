/* Fiches détaillées des moteurs — contenu propre aux pages /moteurs/[system],
   volontairement distinct des descriptions courtes de l'accueil. */

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
     photo, sans casse — c'est le cas des moteurs non vitrine (BILLD, PUBLIQ,
     STAYD, COLLECT). Fichiers dans public/photos/, crédits et licence dans
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
     de lignes rendu ne bouge pas (titres ≤ 30 caractères, chapôs 120-160). */
  sections?: {
    /* « Ce qu'il fait » — H2 et chapô (gabarits home et publish) */
    pointsTitre?: string;
    pointsChapo?: string;
    /* « Le détail » — chapô (gabarit home) */
    detailChapo?: string;
    /* « Pensé pour » — chapô (gabarit home) */
    cibleChapo?: string;
    /* FAQ — sous-titre (gabarit home) */
    faqChapo?: string;
    /* « Ce qu'il apporte » — H2 (gabarit intégration) */
    apportTitre?: string;
    /* titres des deux blocs alternés (gabarit intégration) */
    blocTitres?: [string, string];
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
  defensifs:
    "L'argent qui rentre mal, les demandes qui tombent à toute heure, la paperasse qui s'accumule : quatre moteurs qui traitent ce qui use un dirigeant, en continu, sur des règles explicites.",
  offensifs:
    "Fichier client exploité, visibilité entretenue, conversations commerciales ouvertes, candidatures filtrées : quatre moteurs dont le rendement se mesure en réponses et en chiffre.",
  pepites:
    "Des chantiers plus lourds, construits pour un secteur ou une échéance réglementaire, déployés en plusieurs semaines avec un jalonnement précis.",
};

export const FICHES: Record<string, Fiche> = {
  PAYD: {
    photo: "/photos/payd.jpg",
    photoAlt: "Un dirigeant travaille seul à son bureau en soirée, écran allumé.",
    photoVoile: 0.79,
    pitch: "Le facturier qui se défend tout seul.",
    sections: {
      pointsTitre: "Ce que PAYD fait le matin.",
      pointsChapo:
        "Une relecture du facturier le matin, un protocole gradué dans la journée, et un état des encours tenu à jour en permanence.",
      detailChapo:
        "Ce que PAYD lit dans votre tableur, comment il choisit le ton d'un message, et ce qu'il ne fera jamais sans votre accord.",
      cibleChapo:
        "Les activités qui facturent après livraison et attendent leur règlement : c'est là qu'un encours se creuse sans qu'on le voie.",
      faqChapo: "Les trois questions posées à chaque installation de PAYD.",
    },
    fonctionnement: [
      "Chaque matin, PAYD relit le tableur de facturation que vous tenez déjà — sans toucher à vos colonnes ni à vos habitudes — et en tire un échéancier vivant. Pour chaque devis : depuis combien de jours il attend une réponse. Pour chaque facture : de combien elle a dépassé son échéance, pour quel montant, auprès de quel client. Un règlement encaissé la veille disparaît de la liste avant toute relance — un client qui a payé n'est jamais recontacté.",
      "Sur cette lecture, il déroule un protocole gradué : un premier rappel courtois autour de J+7, une relance plus ferme vers J+21, puis, si le silence persiste, un dossier de mise en demeure préparé avec les pièces. Les devis sans réponse suivent leur propre cadence, plus resserrée (J+3 puis J+7), parce qu'un devis qui refroidit se perd plus vite qu'une facture.",
      "Chaque message est rédigé au cas par cas — le ton suit le montant en jeu, l'ancienneté du retard et l'historique de paiement du client. Un bon payeur momentanément en retard et un mauvais payeur récidiviste ne reçoivent jamais le même texte, ni la même fermeté. En permanence, vous gardez sous les yeux l'état réel de vos encours : qui doit quoi, depuis quand, et quelle est la prochaine action prévue.",
    ],
    points: [
      "Détection quotidienne des devis sans réponse (relancés à J+3 puis J+7) et des factures échues (J+7 puis J+21)",
      "Messages rédigés au cas par cas — montant, historique, ancienneté — jamais deux fois le même texte pour le même client",
      "Escalade progressive : rappel courtois, relance ferme, puis dossier de mise en demeure préparé avec les pièces",
      "État des encours en permanence : qui doit quoi, depuis quand, et quelle est la prochaine action prévue",
    ],
    controle:
      "Chaque message part après votre validation — un clic pour approuver, corriger ou suspendre. La mise en demeure n'est jamais envoyée sans votre accord explicite.",
    outils: ["Google Sheets / Excel", "Gmail / Outlook", "WhatsApp"],
    cible: ["Artisans & BTP", "Garages", "Grossistes", "Services B2B"],
    etapes: [
      {
        t: "Raccordement au facturier",
        d: "PAYD se branche sur votre tableur de facturation tel qu'il est — on ne change ni vos colonnes ni vos habitudes. Une demi-journée, historique inclus.",
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
        a: "PAYD relit le facturier avant chaque action : un règlement enregistré stoppe immédiatement la séquence. Aucun client payé ne reçoit de relance.",
      },
      {
        q: "Puis-je exclure certains clients ?",
        a: "Oui. Une liste blanche est définie à l'installation et modifiable à tout moment — collectivités, grands comptes, proches : ils ne sont jamais relancés automatiquement.",
      },
      {
        q: "Qui écrit les messages ?",
        a: "Les gabarits sont rédigés avec vous à l'installation, puis adaptés par le moteur à chaque situation. Le ton reste le vôtre — et vous validez avant envoi.",
      },
    ],
    demo: {
      type: "timeline",
      title: "Le protocole sur une facture échue",
      items: [
        { k: "J 0", label: "Facture émise", sub: "suivi automatique activé" },
        { k: "J+7", label: "Rappel courtois", sub: "ton adapté à l'historique du client" },
        { k: "J+21", label: "Relance ferme", sub: "récapitulatif et nouvelle échéance" },
        { k: "J+30", label: "Mise en demeure préparée", sub: "envoyée uniquement après votre validation" },
      ],
    },
  },
  ANSWR: {
    photo: "/photos/answr.jpg",
    photoAlt: "Les mains d'une personne qui répond à un message sur son téléphone.",
    photoVoile: 0.79,
    pitch: "Une réception qui ne dort jamais — avec votre discours, pas le sien.",
    sections: {
      apportTitre: "Répondre à toute heure, sans improviser.",
      blocTitres: ["Répondre, puis qualifier", "Les cas transférés"],
    },
    fonctionnement: [
      "À l'installation, on construit ensemble la base de connaissances de votre entreprise : horaires, tarifs, prestations, durées d'intervention, politique d'annulation, et les questions qui reviennent le plus. ANSWR s'appuie exclusivement dessus pour répondre — il ne s'invente jamais une réponse. Une demande qui sort du périmètre déclenche un transfert vers vous plutôt qu'une approximation.",
      "Sur WhatsApp comme par mail, il répond en moins d'une minute à toute heure, weekend et jours fériés compris, et commence par qualifier la demande : devis, urgence, réclamation ou simple renseignement — chacune suit ensuite son propre circuit. Quand il s'agit d'un rendez-vous, il propose un créneau réellement libre dans votre agenda, le réserve, confirme au client et programme un rappel la veille.",
      "Les situations sensibles et les mots d'urgence, définis avec vous à l'installation, ne sont jamais traités à l'aveugle : votre téléphone sonne immédiatement et la conversation vous est transférée avec tout son historique. Le reste tourne seul, et chaque échange reste archivé et consultable.",
    ],
    points: [
      "Réponse en moins d'une minute, 24 h/24, weekend et jours fériés compris",
      "Prise de rendez-vous directement dans votre agenda, avec confirmation au client et rappel la veille",
      "Qualification des demandes : devis, urgence, réclamation, simple renseignement — chacune suit son circuit",
      "Transfert immédiat des cas sensibles vers vous, avec l'historique complet de la conversation",
    ],
    controle:
      "Vous fixez la frontière : ce que le moteur traite seul, ce qui vous est transmis. Toutes les conversations sont archivées et consultables à tout moment.",
    outils: ["WhatsApp Business", "Gmail / Outlook", "Google Agenda"],
    cible: ["Garages & ateliers", "Instituts & salons", "Cabinets", "Commerces"],
    etapes: [
      {
        t: "Construction de la base",
        d: "Un entretien d'une heure suffit : vos prestations, vos tarifs, vos horaires, vos règles. Tout ce que le moteur a le droit de dire vient de là.",
      },
      {
        t: "Branchement des canaux",
        d: "WhatsApp Business et votre boîte mail sont raccordés, l'agenda aussi. Vos numéros et adresses ne changent pas.",
      },
      {
        t: "Rodage en double écoute",
        d: "La première semaine, vous recevez copie de chaque conversation. On ajuste les réponses, puis le moteur prend son rythme de croisière.",
      },
    ],
    faq: [
      {
        q: "Et s'il ne sait pas répondre ?",
        a: "Il le dit honnêtement, prévient que quelqu'un va rappeler, et vous transfère la conversation avec tout le contexte. Il ne brode jamais.",
      },
      {
        q: "Mes clients sauront que ce n'est pas moi ?",
        a: "Le moteur répond au nom de l'entreprise, avec votre discours. Sur demande, il peut se présenter comme assistant — la transparence est votre choix, pas le nôtre.",
      },
      {
        q: "Que se passe-t-il pour une urgence ?",
        a: "Les mots et situations d'urgence sont définis à l'installation : dans ces cas, votre téléphone sonne immédiatement, conversation transférée.",
      },
    ],
    demo: {
      type: "chat",
      title: "Samedi, 21 h 47",
      sub: "L'atelier est fermé — ANSWR répond",
      messages: [
        {
          from: "client",
          text: "Bonsoir, vous êtes ouverts samedi ? C'est pour une vidange sur un Duster.",
          time: "21:47",
        },
        {
          from: "bot",
          text: "Bonsoir ! Oui, l'atelier est ouvert samedi de 8 h à 13 h. Pour une vidange de Duster, comptez environ 45 minutes. Je peux vous réserver samedi 9 h 30 ?",
          time: "21:47",
        },
        { from: "client", text: "Parfait pour 9h30 👍", time: "21:52" },
        {
          from: "bot",
          text: "C'est réservé — samedi 9 h 30. Vous recevrez un rappel vendredi soir. Bonne soirée !",
          time: "21:52",
        },
      ],
      note: "Rendez-vous créé dans l'agenda atelier · client confirmé",
    },
  },
  OFFLOAD: {
    photo: "/photos/offload.jpg",
    photoAlt: "Une personne attablée dépouille un document administratif.",
    photoVoile: 0.81,
    pitch: "La compta fournisseurs sans une seule ligne de saisie.",
    fonctionnement: [
      "Vous transférez vos factures fournisseurs — PDF reçus par mail, scans, photos de tickets prises au comptoir — vers une adresse dédiée. OFFLOAD lit chaque pièce quel qu'en soit le format et en extrait les champs comptables : émetteur, date, montants HT, TVA et TTC, échéance, mode de règlement. La saisie manuelle et la ressaisie du dimanche soir disparaissent.",
      "Chaque extraction passe des contrôles au fil de l'eau : doublon d'une pièce déjà reçue, montant inhabituel pour ce fournisseur, taux de TVA incohérent. Ce qui est certain est classé automatiquement par fournisseur ; ce qui laisse un doute est marqué « à vérifier » et vous est signalé, jamais rangé en silence avec une erreur.",
      "Tout est stocké dans une arborescence à votre nom, sur le Drive de votre entreprise. À date fixe, le dossier du mois, propre et complet, part vers votre cabinet comptable dans le format qu'il préfère : il gagne du temps sans rien changer à ses méthodes.",
    ],
    points: [
      "Lecture de tous les formats : PDF natifs, scans, photos de tickets prises au comptoir",
      "Extraction des champs clés : émetteur, date, montants HT / TVA / TTC, échéance, mode de règlement",
      "Contrôles automatiques : doublon déjà reçu, montant inhabituel pour ce fournisseur, TVA incohérente",
      "Dossier mensuel classé par fournisseur, transmis au cabinet comptable à date fixe",
    ],
    controle:
      "Les anomalies vous sont signalées au fil de l'eau, et rien n'est transmis au cabinet sans que la liste du mois soit passée sous vos yeux.",
    outils: ["Gmail / Outlook", "Google Drive", "Google Sheets / Excel"],
    cible: ["BTP & artisans", "Restauration", "Commerces", "Transport"],
    etapes: [
      {
        t: "Adresse dédiée et arborescence",
        d: "Une adresse de collecte est créée, l'arborescence de classement montée sur votre Drive. Vous transférez, c'est tout.",
      },
      {
        t: "Calibrage sur votre historique",
        d: "Le moteur apprend vos fournisseurs récurrents sur les trois derniers mois : formats, montants habituels, taux de TVA pratiqués.",
      },
      {
        t: "Accord avec le cabinet",
        d: "On cale avec votre comptable le format et la date de transmission mensuelle. Le cabinet reçoit un dossier propre, toujours pareil, toujours à l'heure.",
      },
    ],
    faq: [
      {
        q: "Mon comptable doit-il changer ses outils ?",
        a: "Non. Le cabinet reçoit un dossier classé dans le format qu'il préfère — il gagne du temps sans rien changer à ses méthodes.",
      },
      {
        q: "Une photo de ticket froissé, ça passe ?",
        a: "Dans la grande majorité des cas, oui. Quand la lecture n'est pas certaine, la pièce est marquée « à vérifier » et vous est signalée — jamais classée en silence avec un doute.",
      },
      {
        q: "Où sont stockées mes factures ?",
        a: "Sur le Drive de votre entreprise, dans une arborescence à votre nom. La lecture des pièces passe par votre espace dédié — chiffré, hébergé dans l'Union européenne — et rien n'est réutilisé à d'autres fins.",
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
  BRIEF: {
    photo: "/photos/brief.jpg",
    photoAlt: "Un ordinateur portable et une tasse de café sur une table en bois, au matin.",
    photoVoile: 0.78,
    pitch: "L'état de l'entreprise en un message, avant le premier café.",
    sections: {
      pointsTitre: "Ce que contient le brief.",
      pointsChapo:
        "Quatre blocs, toujours dans le même ordre : le cash, les relances, les décisions qui vous attendent, et les 48 heures qui viennent.",
      detailChapo:
        "D'où viennent les chiffres, comment ils sont hiérarchisés, et pourquoi il n'y a qu'un seul message par jour.",
      cibleChapo:
        "Les dirigeants qui portent plusieurs casquettes et n'ouvriront jamais un tableau de bord de plus.",
      faqChapo: "L'heure, le format, la source des chiffres : ce qu'on nous demande.",
    },
    fonctionnement:
      "BRIEF agrège chaque nuit ce que les autres moteurs et vos outils savent déjà — encaissements, relances, agenda, retards — et le condense en un message unique, hiérarchisé, livré à 7 h. Pas un tableau de bord de plus à ouvrir : un brief qui se lit comme un SMS.",
    points: [
      "Encaissements de la veille et évolution des encours, comparés à la semaine précédente",
      "Relances parties, réponses reçues, et les dossiers qui attendent une décision de votre part",
      "Les trois actions du jour classées par impact — pas une liste de vingt tâches",
      "Rendez-vous et échéances des 48 prochaines heures",
    ],
    controle:
      "Le contenu et l'ordre de lecture sont fixés avec vous à l'installation, selon ce qui compte pour votre activité. Un message par jour, jamais plus.",
    outils: ["WhatsApp", "Google Sheets / Excel", "Google Agenda"],
    cible: ["Dirigeants multi-casquettes", "Gérants d'atelier", "Professions libérales"],
    etapes: [
      {
        t: "Choix des indicateurs",
        d: "On liste ce que vous vérifiez chaque matin — et ce que vous aimeriez vérifier sans jamais avoir le temps. Ça devient la trame du brief.",
      },
      {
        t: "Branchement des sources",
        d: "Tableur, agenda, moteurs déjà actifs : BRIEF lit ce qui existe. Aucune saisie supplémentaire ne vous est demandée.",
      },
      {
        t: "Ajustement du format",
        d: "Après une semaine, on resserre : ce qui est utile reste, ce qui n'est jamais lu saute. Le brief converge vers votre lecture idéale.",
      },
    ],
    faq: [
      {
        q: "Puis-je changer l'heure de réception ?",
        a: "Oui, librement — 5 h pour les lève-tôt, 7 h par défaut, ou le dimanche soir pour préparer la semaine. C'est un réglage, pas un chantier.",
      },
      {
        q: "Et si je ne le lis pas un matin ?",
        a: "Rien ne bloque : le brief est une photographie, pas une liste de validations. Les décisions attendues, elles, restent visibles le lendemain.",
      },
      {
        q: "D'où viennent les chiffres ?",
        a: "De vos propres outils — facturier, agenda, messagerie — et des moteurs actifs. BRIEF n'invente aucun chiffre : chaque ligne est traçable à sa source.",
      },
    ],
    demo: {
      type: "message",
      title: "BRIEF — mardi 21 juillet, 7 h 00",
      lines: [
        {
          label: "Cash",
          text: "Encaissé hier : 3 240 € (Villa Kariba, Resto La Datcha). Encours : 18 750 €, en baisse de 9 % sur la semaine.",
        },
        {
          label: "Relances",
          text: "2 parties hier, 1 réponse — Garage Petit-Bourg annonce un règlement vendredi.",
        },
        {
          label: "À décider",
          text: "1. Valider la mise en demeure SCI Lauricisque · 2. Rappeler M. Sainte-Rose (devis 4 800 €) · 3. Signer le dossier Chèque TIC.",
        },
        { label: "Agenda", text: "9 h fournisseur · 14 h chantier Baie-Mahault." },
      ],
    },
  },
  REVIVE: {
    photo: "/photos/revive.jpg",
    photoAlt: "L'intérieur d'une boutique de vêtements, articles présentés en rayon.",
    photoVoile: 0.83,
    pitch: "Votre fichier client vaut plus que n'importe quelle publicité.",
    sections: {
      apportTitre: "Réveiller le fichier, sans harceler les clients.",
      blocTitres: ["Un message par client", "Une cadence plafonnée"],
    },
    fonctionnement: [
      "REVIVE croise votre historique de ventes et votre fichier de contacts pour dresser la carte de vos clients silencieux, puis les classe par valeur et par récence. On réveille d'abord ceux qui rapportaient le plus et qui viennent de décrocher, avant les occasionnels plus anciens — l'effort va là où le retour est le plus probable.",
      "Chaque client reçoit alors un message individuel, ancré dans son historique réel : dernier achat, dernier passage, prestation habituelle. C'est l'inverse d'une newsletter envoyée à tous — et c'est ce qui fait la différence entre un message qu'on ouvre et un message qu'on jette.",
      "La cadence est volontairement plafonnée : jamais plus d'une sollicitation par trimestre pour un même client, sur WhatsApp en priorité quand le numéro existe, sinon par mail — jamais les deux à la fois. Dès qu'une réponse arrive, même négative, la séquence s'arrête et la conversation vous revient.",
    ],
    points: [
      "Segmentation par valeur et par récence : on réveille d'abord ceux qui rapportaient le plus",
      "Message individuel ancré dans l'historique réel : dernier achat, dernier passage, préférence connue",
      "Cadence plafonnée : un client n'est jamais sollicité plus d'une fois par trimestre",
      "Arrêt immédiat de la séquence dès qu'une réponse arrive — la conversation vous revient",
    ],
    controle:
      "La liste des clients à recontacter vous est soumise avant chaque vague. Un nom retiré ne sera jamais recontacté.",
    outils: ["Google Sheets / Excel", "WhatsApp", "Gmail / Outlook"],
    cible: ["Instituts & salons", "Garages", "Restaurants", "Commerces de détail"],
    etapes: [
      {
        t: "Analyse du fichier",
        d: "REVIVE croise vos ventes et vos contacts pour dresser la carte des dormants : qui, depuis quand, pour quelle valeur historique.",
      },
      {
        t: "Validation de la première vague",
        d: "Vous passez la liste en revue, retirez qui vous voulez, et validez les gabarits de messages. Rien ne part avant ça.",
      },
      {
        t: "Vagues suivantes en rythme",
        d: "Le moteur enchaîne les vagues au rythme convenu, mesure les retours, et affine le ciblage sur ce qui répond le mieux.",
      },
    ],
    faq: [
      {
        q: "Je ne veux pas harceler mes clients.",
        a: "Nous non plus : un client n'est jamais sollicité plus d'une fois par trimestre, et toute réponse — même négative — stoppe la séquence définitivement.",
      },
      {
        q: "Sur quels canaux ?",
        a: "WhatsApp en priorité quand le numéro existe — c'est le canal des Antilles — sinon le mail. Jamais les deux en même temps.",
      },
      {
        q: "Et si un client demande à ne plus être contacté ?",
        a: "Il est retiré immédiatement et définitivement du fichier de sollicitation, et la demande est archivée — conformité RGPD comprise.",
      },
    ],
    demo: {
      type: "chat",
      title: "Cliente inactive depuis 8 mois",
      sub: "Institut Beauté Kréol — réactivation REVIVE",
      messages: [
        {
          from: "bot",
          text: "Bonjour Mme Larcher, ici Beauté Kréol. Votre dernier soin visage remonte à janvier — votre créneau habituel du samedi matin est disponible ce mois-ci, avec 10 % fidélité. On vous le réserve ?",
          time: "10:02",
        },
        { from: "client", text: "Ah oui pourquoi pas ! Samedi 10h c'est possible ?", time: "10:34" },
        {
          from: "bot",
          text: "C'est réservé, samedi 10 h. Au plaisir de vous revoir !",
          time: "10:35",
        },
      ],
      note: "Cliente réactivée — rendez-vous en agenda, fiche mise à jour",
    },
  },
  POSTD: {
    photo: "/photos/postd.jpg",
    photoAlt: "Un téléphone posé sur une table, utilisé pour créer du contenu.",
    photoVoile: 0.56,
    pitch: "Une présence régulière, construite sur votre vraie actualité.",
    sections: {
      pointsTitre: "Ce que POSTD produit.",
      pointsChapo:
        "Un calendrier bâti sur votre actualité réelle, des textes écrits dans votre registre, et une programmation aux heures d'audience.",
      detailChapo:
        "Comment le calendrier se construit, d'où vient la matière, et ce que vous relisez une fois par mois.",
      cibleChapo:
        "Les activités qu'on choisit parce qu'on les a vues passer : commerce, restaurant, artisan, location saisonnière.",
      faqChapo: "Photos, cadence, commentaires : les trois points qui reviennent.",
    },
    fonctionnement:
      "POSTD bâtit chaque mois un calendrier éditorial à partir de ce qui se passe réellement chez vous — chantiers livrés, arrivages, offres, saisonnalité — puis rédige les publications dans le ton défini à l'installation et les décline réseau par réseau avant de les programmer.",
    points: [
      "Calendrier mensuel fondé sur votre actualité réelle, pas sur des citations inspirantes",
      "Rédaction dans votre registre : vocabulaire, longueur, émojis ou pas — défini une fois, tenu ensuite",
      "Déclinaison par réseau : le même sujet ne s'écrit pas pareil sur Facebook, Instagram et LinkedIn",
      "Programmation aux créneaux où votre audience est réellement active",
    ],
    controle:
      "Le lot du mois vous est soumis en une relecture : vous corrigez, supprimez, réordonnez. Rien n'est publié sans validation.",
    outils: ["Instagram / Facebook", "LinkedIn", "Google Sheets"],
    cible: ["Commerces", "Restaurants", "Artisans", "Locations touristiques"],
    etapes: [
      {
        t: "Définition du registre",
        d: "Votre ton, vos sujets, vos interdits. On formalise la ligne éditoriale en une séance — c'est elle qui garantit que ça sonne comme vous.",
      },
      {
        t: "Canal photo dédié",
        d: "Un fil WhatsApp où vous envoyez photos et infos brutes au fil de la semaine. Le moteur en fait la matière du calendrier.",
      },
      {
        t: "Cycle mensuel",
        d: "Chaque fin de mois : proposition de calendrier, votre relecture, programmation. Le mois tourne ensuite sans vous.",
      },
    ],
    faq: [
      {
        q: "Qui fournit les photos ?",
        a: "Vous, sans effort particulier : une photo de chantier ou d'arrivage envoyée sur le fil dédié suffit. Le moteur cadre, recadre et légende.",
      },
      {
        q: "Combien de publications par mois ?",
        a: "La cadence est fixée ensemble selon votre activité — mieux vaut deux bons posts par semaine tenus toute l'année qu'une rafale suivie de six mois de silence.",
      },
      {
        q: "Et les commentaires ?",
        a: "POSTD publie, il ne débat pas : les commentaires et messages sont signalés pour que vous répondiez — ou traités par ANSWR si vous l'avez.",
      },
    ],
    demo: {
      type: "calendar",
      title: "Semaine du 20 juillet — programmée",
      items: [
        { day: "Lun", text: "Chantier livré à Petit-Bourg — photos avant / après", canal: "Facebook" },
        { day: "Mer", text: "Arrivage plaquettes et filtres — dispo immédiate", canal: "Instagram" },
        { day: "Ven", text: "Conseil : préparer son véhicule à la saison cyclonique", canal: "FB + IG" },
        { day: "Sam", text: "Avis client 5★ — remerciement", canal: "Instagram" },
      ],
    },
  },
  REACH: {
    photo: "/photos/reach.jpg",
    photoAlt: "Plusieurs personnes en réunion professionnelle, en pleine discussion.",
    photoVoile: 0.83,
    pitch: "La prospection qui avance pendant que l'atelier tourne.",
    sections: {
      pointsTitre: "Ce que REACH envoie.",
      pointsChapo:
        "Un fichier validé avec vous, des séquences signées de votre nom, un volume quotidien plafonné et un pipeline classé par intention.",
      detailChapo:
        "Comment le fichier cible est construit, ce que contient une séquence, et ce qui protège la réputation de votre domaine.",
      cibleChapo:
        "Les activités qui vendent à d'autres entreprises et dont le carnet se remplit par démarchage, pas par vitrine.",
      faqChapo: "Légalité, volume, signature : les trois objections habituelles.",
    },
    fonctionnement:
      "REACH constitue un fichier d'entreprises cibles — secteur, zone, taille — que vous validez avant tout envoi. Il déroule ensuite des séquences de trois à cinq messages personnalisés entreprise par entreprise, relance les silences, s'arrête dès qu'on lui répond, et classe chaque retour.",
    points: [
      "Fichier cible construit et validé avec vous avant la première campagne",
      "Messages personnalisés entreprise par entreprise — activité, actualité, point de contact pertinent",
      "Relances automatiques des non-réponses, arrêt immédiat dès qu'une réponse arrive",
      "Retours classés par intention : intéressé, à recontacter plus tard, refus — le pipeline reste lisible",
    ],
    controle:
      "Les modèles de messages sont validés par vous avant tout envoi, et le volume quotidien est plafonné pour protéger la réputation de votre domaine.",
    outils: ["Gmail / Outlook", "Google Sheets", "LinkedIn"],
    cible: ["Services B2B", "Grossistes", "BTP second œuvre", "Prestataires techniques"],
    etapes: [
      {
        t: "Ciblage validé",
        d: "Secteurs, zones, tailles d'entreprise : le fichier cible est constitué puis passé en revue avec vous, ligne par ligne si vous le souhaitez.",
      },
      {
        t: "Séquences sur mesure",
        d: "Trois à cinq messages par cible, rédigés dans votre voix, avec votre signature. Vous validez les gabarits avant le premier envoi.",
      },
      {
        t: "Pipeline entretenu",
        d: "Les retours sont classés chaque jour ; vous ne voyez que les conversations à saisir, jamais la mécanique d'envoi.",
      },
    ],
    faq: [
      {
        q: "C'est légal, la prospection à froid ?",
        a: "En B2B, oui, avec les règles que nous appliquons systématiquement : intérêt légitime documenté, identification claire, lien de désinscription et retrait immédiat sur demande.",
      },
      {
        q: "Quel volume d'envois ?",
        a: "Volontairement plafonné — quelques dizaines par jour, montée progressive — pour protéger la délivrabilité de votre domaine. La prospection est un marathon, pas un spam.",
      },
      {
        q: "Qui signe les messages ?",
        a: "Vous. Les messages partent de votre adresse, avec votre nom et votre signature — REACH est votre stylo, pas votre porte-parole.",
      },
    ],
    demo: {
      type: "list",
      title: "Pipeline — semaine 30",
      items: [
        { text: "Sarl Bâtir Nord — rendez-vous obtenu jeudi 10 h", badge: "Intéressé", tone: "ok" },
        { text: "Cabinet Mova — ouverture sans réponse", badge: "Relance J+4", tone: "warn" },
        { text: "Distri Sud — réponse reçue ce matin", badge: "À qualifier", tone: "ok" },
        { text: "Transports Kalin — refus poli", badge: "Archivé", tone: "off" },
      ],
      footer: "42 entreprises en séquence · 6 conversations ouvertes ce mois",
    },
  },
  HIRED: {
    photo: "/photos/hired.jpg",
    photoAlt: "Un entretien d'embauche dans un bureau, deux personnes face à face.",
    photoVoile: 0.82,
    pitch: "Recruter sans lire quarante CV un dimanche soir.",
    sections: {
      pointsTitre: "Ce que HIRED trie.",
      pointsChapo:
        "Des critères que vous fixez, un accusé de réception pour chaque candidat, et une shortlist argumentée plutôt qu'un score opaque.",
      detailChapo:
        "Comment la grille d'analyse se construit, ce qui est réellement évalué, et pourquoi aucun dossier n'est éliminé définitivement.",
      cibleChapo:
        "Les entreprises qui recrutent quelques postes par an et croulent sous les candidatures à chaque annonce publiée.",
      faqChapo: "Réponses aux candidats, biais, postes multiples : ce qu'on nous demande.",
    },
    fonctionnement:
      "À l'ouverture d'un poste, on définit ensemble les critères éliminatoires et ce qui compte vraiment. HIRED réceptionne ensuite chaque candidature, accuse réception, analyse CV et lettre, et vous remet une shortlist argumentée — pas un score opaque.",
    points: [
      "Critères éliminatoires et pondérations définis avec vous, poste par poste",
      "Accusé de réception envoyé à chaque candidat — votre image employeur reste soignée",
      "Analyse de l'expérience, de la stabilité et de l'adéquation réelle aux critères",
      "Shortlist de trois à cinq profils argumentée, avec les points à creuser en entretien",
    ],
    controle:
      "Le moteur présélectionne, il n'élimine jamais définitivement : la liste complète reste consultable et les critères s'ajustent en cours de recrutement.",
    outils: ["Gmail / Outlook", "Google Drive", "Google Sheets"],
    cible: ["Ateliers & garages", "BTP", "Restauration", "Commerces en croissance"],
    etapes: [
      {
        t: "Cadrage du poste",
        d: "Critères éliminatoires, compétences pondérées, signaux d'alerte : la grille d'analyse est la vôtre, formalisée en une séance.",
      },
      {
        t: "Collecte encadrée",
        d: "Une adresse de candidature dédiée, un accusé de réception systématique, et un suivi propre de chaque dossier.",
      },
      {
        t: "Shortlist et entretiens",
        d: "Vous recevez trois à cinq profils argumentés avec les questions à poser. Les entretiens restent votre terrain.",
      },
    ],
    faq: [
      {
        q: "Que reçoivent les candidats non retenus ?",
        a: "Une réponse courtoise, systématique, dans un délai correct. C'est rare — et c'est exactement pour ça que votre image employeur en sort renforcée.",
      },
      {
        q: "Comment éviter les biais ?",
        a: "Les critères sont explicites, définis par vous, appliqués uniformément — et la liste complète reste consultable : la présélection est un tri transparent, pas une boîte noire.",
      },
      {
        q: "Plusieurs postes en même temps ?",
        a: "Oui : chaque poste a sa grille et son suivi. Le moteur gère les candidatures croisées sans mélanger les dossiers.",
      },
    ],
    demo: {
      type: "list",
      title: "Poste : mécanicien confirmé — J+12",
      items: [
        { text: "M. Doresca — 8 ans d'expérience, poids lourd + VL", badge: "À recevoir", tone: "ok" },
        { text: "Mme Pierre-Louis — CAP + 3 ans, parcours stable", badge: "À recevoir", tone: "ok" },
        { text: "M. Rivat — junior, forte motivation, à former", badge: "Option", tone: "warn" },
      ],
      footer: "37 candidatures reçues · 5 présélectionnées · 37 accusés de réception envoyés",
    },
  },
  BILLD: {
    photo: "/photos/billd.jpg",
    photoAlt: "Un dossier fiscal ouvert sur un bureau, à côté d'une tasse.",
    photoVoile: 0.8,
    pitch: "La conformité menée comme un chantier, pas subie comme une angoisse.",
    sections: {
      pointsTitre: "Le chantier, dans l'ordre.",
      pointsChapo:
        "Les données d'abord, le format ensuite, le raccordement enfin — puis un contrôle automatique sur chaque facture émise.",
      detailChapo:
        "Pourquoi le blocage vient presque toujours du fichier client, et ce que la bascule change à vos habitudes de saisie.",
      cibleChapo:
        "Toutes les entreprises établies en France sont concernées au 1ᵉʳ septembre 2026. Celles qui facturent des entreprises, en premier.",
      faqChapo: "Logiciel, durée, après-bascule : les trois questions du chantier.",
    },
    fonctionnement:
      "BILLD traite l'obligation de facturation électronique dans l'ordre où elle se gagne : d'abord la qualité des données, ensuite le format, enfin le raccordement. Le chantier est jalonné, chaque étape est validée, et vos habitudes de facturation ne changent pas.",
    points: [
      "Audit du fichier client : SIREN manquants, adresses incomplètes, mentions obligatoires absentes",
      "Conversion de la facturation au format Factur-X sans changer votre façon de saisir",
      "Raccordement au portail public de facturation ou à une plateforme partenaire immatriculée",
      "Contrôle de conformité automatique sur chaque facture émise après la bascule",
    ],
    controle:
      "Chaque jalon est validé avec vous : vous savez à tout moment ce qui est conforme, ce qui reste à traiter, et ce que ça change pour vos clients.",
    outils: ["Votre outil de facturation", "Portail public de facturation", "Google Sheets / Excel"],
    cible: ["Toutes les TPE avant le 01/09/2026", "B2B facturant des entreprises"],
    etapes: [
      {
        t: "Audit des données",
        d: "Le fichier client est passé au crible : SIREN, adresses, mentions. Vous savez en quelques jours l'ampleur réelle du chantier.",
      },
      {
        t: "Bascule Factur-X",
        d: "Votre facturation est convertie au format légal, testée sur des cas réels, sans changer votre façon de travailler.",
      },
      {
        t: "Raccordement et contrôle continu",
        d: "L'entreprise est raccordée à la plateforme, et chaque facture émise passe un contrôle de conformité automatique. L'échéance devient un non-événement.",
      },
    ],
    faq: [
      {
        q: "Mon logiciel actuel peut-il suffire ?",
        a: "Souvent, oui — c'est précisément ce que l'audit établit en premier. Quand une adaptation suffit, on ne vous vend pas une migration.",
      },
      {
        q: "Combien de temps prend le chantier ?",
        a: "Quelques semaines, jalonnées : audit, nettoyage, bascule, raccordement. Commencer tôt, c'est le faire au calme — l'été 2026 sera embouteillé.",
      },
      {
        q: "Que se passe-t-il après la bascule ?",
        a: "Le contrôle devient automatique : chaque facture émise est vérifiée avant envoi, et les rejets de plateforme sont traités sans que vous les voyiez.",
      },
    ],
    demo: {
      type: "list",
      title: "Chantier conformité — CARMO Toyota",
      items: [
        { text: "Audit du fichier client — 14 SIREN complétés", badge: "Fait", tone: "ok" },
        { text: "Mentions obligatoires sur les gabarits", badge: "Fait", tone: "ok" },
        { text: "Bascule Factur-X en environnement de test", badge: "En cours", tone: "warn" },
        { text: "Raccordement au portail public", badge: "Planifié", tone: "off" },
      ],
      footer: "Échéance légale : 1ᵉʳ septembre 2026 — chantier en avance",
    },
  },
  PUBLIQ: {
    photo: "/photos/publiq.jpg",
    photoAlt: "La façade claire d'un bâtiment public sous un ciel bleu.",
    photoVoile: 0.82,
    pitch: "La commande publique à portée de TPE.",
    sections: {
      pointsTitre: "Ce que PUBLIQ surveille.",
      pointsChapo:
        "Les consultations publiées dans votre zone, filtrées sur vos capacités réelles, avec les pièces administratives déjà prêtes.",
      detailChapo:
        "Comment le filtre se règle sur vos qualifications, et où s'arrête le moteur — le mémoire technique reste votre parole.",
      cibleChapo:
        "Les TPE qui ont les compétences pour répondre, mais pas le temps de suivre les publications et de monter les dossiers.",
      faqChapo: "Mémoire technique, petits marchés, volume : ce qu'on nous demande.",
    },
    fonctionnement:
      "PUBLIQ surveille chaque jour les publications d'appels d'offres de votre secteur et de votre zone, écarte ceux qui ne correspondent pas à vos capacités réelles, et prépare les pièces administratives récurrentes du dossier. Quand une consultation vaut le coup, le dossier est déjà à moitié prêt.",
    points: [
      "Veille quotidienne des plateformes de marchés de votre secteur et de votre zone",
      "Filtrage par vos capacités réelles : montants, délais, qualifications et références exigées",
      "Pièces administratives récurrentes préparées et tenues à jour : DC1, DC2, attestations, références",
      "Alertes sur les échéances : date limite de questions, dépôt, visite de site obligatoire",
    ],
    controle:
      "Le moteur prépare, vous décidez : chaque dossier part avec votre feu vert, et le mémoire technique reste votre parole — nous le structurons, vous le signez.",
    outils: ["Plateformes de marchés publics", "Google Drive", "Gmail / Outlook"],
    cible: ["BTP & second œuvre", "Espaces verts", "Nettoyage", "Fournitures & services"],
    etapes: [
      {
        t: "Profil de capacité",
        d: "Vos qualifications, vos références, vos plafonds : le filtre qui évite de perdre du temps sur des marchés hors de portée.",
      },
      {
        t: "Coffre administratif",
        d: "DC1, DC2, attestations, références : les pièces récurrentes sont préparées une fois et tenues à jour en continu.",
      },
      {
        t: "Veille et dossiers",
        d: "Chaque matin, les consultations pertinentes tombent triées. Sur celles que vous retenez, le dossier part de 80 % préparé.",
      },
    ],
    faq: [
      {
        q: "Et le mémoire technique ?",
        a: "Il est structuré avec vous à partir de vos chantiers réels — c'est votre savoir-faire qui remporte le marché, pas un texte générique. Vous relisez, vous signez.",
      },
      {
        q: "Les petits marchés valent-ils le coup ?",
        a: "Souvent oui : sous certains seuils, la procédure est allégée et la concurrence locale faible. C'est précisément le terrain de jeu naturel d'une TPE équipée.",
      },
      {
        q: "Combien de consultations par mois ?",
        a: "Tout dépend du secteur — l'intérêt du filtre est justement là : vous ne voyez que celles qui correspondent à vos capacités, pas les trois cents autres.",
      },
    ],
    demo: {
      type: "list",
      title: "Veille du 20 juillet",
      items: [
        { text: "Rénovation sanitaires école — Lamentin — 180 k€ — dépôt 28/07", badge: "Dossier prêt", tone: "ok" },
        { text: "Entretien voirie CC Marie-Galante — 95 k€", badge: "Questions avt 22/07", tone: "warn" },
        { text: "Peinture logements SIG — Qualibat 6111 exigé", badge: "Écarté", tone: "off" },
      ],
      footer: "3 consultations pertinentes sur 47 publiées cette semaine",
    },
  },
  STAYD: {
    photo: "/photos/stayd.jpg",
    photoAlt: "Une main tend un trousseau de clés devant une entrée.",
    photoVoile: 0.78,
    pitch: "Vos locations tournent, votre téléphone se tait.",
    sections: {
      pointsTitre: "Le séjour, de bout en bout.",
      pointsChapo:
        "Le cycle complet d'un séjour, de la demande de réservation à la demande d'avis, coordination du ménage comprise.",
      detailChapo:
        "D'où viennent les réponses faites aux voyageurs, et ce qui déclenche un transfert immédiat vers vous.",
      cibleChapo:
        "Les propriétaires et conciergeries dont le téléphone sonne le soir, parce que les voyageurs, eux, ne dorment pas.",
      faqChapo: "Nombre de logements, plateformes, incidents : les trois questions.",
    },
    fonctionnement:
      "STAYD prend en charge le cycle complet d'un séjour : la demande de réservation, les questions du voyageur, les instructions d'arrivée, la coordination du ménage entre deux séjours et la collecte d'avis. Vous ne voyez passer que ce qui sort du cadre.",
    points: [
      "Réponses aux demandes et questions des voyageurs, sur toutes vos plateformes",
      "Instructions d'arrivée envoyées au bon moment : accès, codes, recommandations locales",
      "Coordination du ménage entre deux séjours, avec confirmation de passage",
      "Demande d'avis envoyée au moment où le voyageur est le plus enclin à la laisser",
    ],
    controle:
      "Les situations délicates — réclamation, dégât, demande hors cadre — vous sont transférées immédiatement avec l'historique complet.",
    outils: ["Airbnb / Booking", "WhatsApp", "Google Agenda"],
    cible: ["Propriétaires multi-logements", "Conciergeries", "Gîtes & villas"],
    etapes: [
      {
        t: "Fiches logements",
        d: "Accès, équipements, règles, recommandations locales : chaque logement a sa fiche, source unique des réponses du moteur.",
      },
      {
        t: "Branchement des plateformes",
        d: "Airbnb, Booking et vos canaux directs sont centralisés — une seule conversation par voyageur, quel que soit le canal d'origine.",
      },
      {
        t: "Routines de séjour",
        d: "Instructions d'arrivée, coordination ménage, demande d'avis : les routines se calent sur vos horaires réels et ceux de vos prestataires.",
      },
    ],
    faq: [
      {
        q: "Combien de logements peut-il gérer ?",
        a: "De un à plusieurs dizaines : chaque logement a sa fiche et son planning. C'est justement en multi-logements que le gain devient spectaculaire.",
      },
      {
        q: "Quelles plateformes sont couvertes ?",
        a: "Airbnb et Booking en standard, plus vos réservations directes par WhatsApp ou mail. Tout converge vers une seule vue par séjour.",
      },
      {
        q: "Et en cas de problème pendant un séjour ?",
        a: "Dégât, plainte, demande inhabituelle : transfert immédiat vers vous avec l'historique, et le voyageur est prévenu qu'un humain prend le relais.",
      },
    ],
    demo: {
      type: "chat",
      title: "Villa Anse-à-l'Eau — jour d'arrivée",
      sub: "Voyageur Booking — 18 h 12",
      messages: [
        {
          from: "client",
          text: "Bonjour, on aura du retard, arrivée vers 22 h — c'est possible ?",
          time: "18:12",
        },
        {
          from: "bot",
          text: "Bonsoir ! Aucun souci, l'arrivée est autonome. Le code du boîtier à clés vous sera envoyé à 20 h avec le plan d'accès et les recommandations pour dîner à proximité.",
          time: "18:13",
        },
        { from: "client", text: "Top, merci !", time: "18:15" },
      ],
      note: "Ménage confirmé 15 h · demande d'avis programmée à J+2",
    },
  },
  COLLECT: {
    photo: "/photos/collect.jpg",
    photoAlt: "Une personne travaille sur un ordinateur portable au bureau.",
    photoVoile: 0.76,
    pitch: "Le recouvrement en marque blanche, pensé pour les cabinets comptables.",
    sections: {
      pointsTitre: "Ce que le cabinet garde.",
      pointsChapo:
        "Sa marque, sa relation client, son protocole et sa facturation. Omega n'apparaît nulle part dans les échanges avec le débiteur.",
      detailChapo:
        "Comment le protocole du cabinet encadre chaque action, et où s'arrête COLLECT quand un dossier durcit.",
      cibleChapo:
        "Les cabinets comptables et centres de gestion qui veulent proposer le recouvrement sans monter un pôle interne.",
      faqChapo: "Responsabilité, marque blanche, contentieux : les trois points.",
    },
    fonctionnement:
      "COLLECT s'adresse aux cabinets : ils proposent le recouvrement à leurs clients sous leur propre marque, Omega opère en arrière-plan — relances, suivi, reporting — selon un protocole que le cabinet a validé. Le client final ne voit que son cabinet.",
    points: [
      "Service porté par la marque du cabinet — Omega reste invisible pour le client final",
      "Protocole de relance validé par le cabinet : tons, cadences, seuils d'escalade",
      "Reporting mensuel par dossier : encours, sommes récupérées, cas sensibles",
      "Facturation portée par le cabinet, marge incluse",
    ],
    controle:
      "Le cabinet garde la relation et la décision ; Omega exécute et rend compte. Un dossier se suspend à tout moment, d'un simple message.",
    outils: ["Outils du cabinet", "Gmail / Outlook", "Google Sheets"],
    cible: ["Cabinets d'expertise comptable", "Centres de gestion agréés"],
    etapes: [
      {
        t: "Protocole du cabinet",
        d: "Tons, cadences, seuils d'escalade, cas à ne jamais relancer : le protocole est celui du cabinet, écrit et signé avant le premier dossier.",
      },
      {
        t: "Habillage marque blanche",
        d: "Expéditeurs, signatures, documents : tout est aux couleurs du cabinet. Ses clients ne voient que lui.",
      },
      {
        t: "Opération et reporting",
        d: "Omega opère les relances et livre un reporting mensuel par dossier. Le cabinet facture son client, marge comprise.",
      },
    ],
    faq: [
      {
        q: "Qui est responsable vis-à-vis du client final ?",
        a: "Le cabinet — c'est son service et sa marque. Le protocole qu'il a validé encadre chaque action de Omega, et tout est traçable.",
      },
      {
        q: "La marque blanche est-elle vraiment invisible ?",
        a: "Oui : adresses d'envoi, signatures et documents sont au nom du cabinet. Omega n'apparaît nulle part dans les échanges avec le débiteur.",
      },
      {
        q: "Et si un dossier part au contentieux ?",
        a: "COLLECT s'arrête à la relance amiable et à la mise en demeure : au-delà, le dossier est remis proprement — pièces et historique — au conseil choisi par le cabinet.",
      },
    ],
    demo: {
      type: "list",
      title: "Reporting cabinet — juillet",
      items: [
        { text: "Dossier BTP Nord — encours 12 400 €", badge: "8 200 € récupérés", tone: "ok" },
        { text: "Dossier Resto Bord de Mer — 3 150 €", badge: "Échéancier accepté", tone: "ok" },
        { text: "Dossier Distri Ouest — 6 900 €", badge: "Escalade validée", tone: "warn" },
      ],
      footer: "Reporting mensuel envoyé au cabinet — marge cabinet incluse",
    },
  },
};
