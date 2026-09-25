/* ══════════════════════════════════════════════════════════════════════
   Tamila (cabinets d'avocats) — textes.ts

   COPIÉ le 24/09/2026 à 13 h 37 (heure de la Guadeloupe) de
   `OMEGA/cabinetos-site/src/contenu/textes.ts`. Le texte n'est pas retouché
   ici : à 14 h 23, la session qui réécrit les textes de la source (registre
   de cabinet) a reporté ses changements dans ce fichier et dans
   Matieres.tsx (neuf phrases, et les émojis des matières retirés) ; la
   page suit donc la source de 14 h 23. Un prochain changement de texte se
   fait dans les deux fichiers, pas seulement dans la source.
   Ce qui change :
   · CONTACT.audit valait `https://omegaai.fr/reserver` : on est sur
     omegaai.fr, tous les appels mènent à /reserver-un-audit (règle 6),
     « Soumettre un dossier » compris. Les boutons le rendent en <Link>.
   · CONTACT.mail, LIENS, NAV et PIED servaient l'entête et le pied du site
     source, qui ne viennent pas (ceux d'Omega servent) : retirés.
   ══════════════════════════════════════════════════════════════════════ */

/* Tous les textes de la page. Source du fond : plans-et-decisions/secteurs/cabinets-avocats-2026-09.md (§4 et §6).
   Registre (réécriture du 24/09, demande de Teo) : celui d'un cabinet — vouvoiement, vocabulaire du métier
   (pièces, bordereau de communication, diligences, convention d'honoraires), phrases complètes au verbe
   conjugué (OMEGA/DOCTRINE-TEXTES-SAAS.md, partie II : ni fragments, ni ternaires, ni antithèses en série).
   Règles maison : aucun client, logo, avis ni chiffre de traction inventé ; aucun prix public ; nos outils
   jamais nommés ; données des cartes étiquetées « exemple ».
   Souveraineté — DÉCISION DE TEO DU 24/09/2026 : Tamila aura un hébergeur français et les pièces restent en
   France (stockage ET lecture). Par exception à la doctrine §6 (qui vaut pour les autres SaaS), on écrit donc
   « hébergé en France » et « vos pièces restent en France ». L'infrastructure du produit doit s'y conformer. */

export const CONTACT = {
  audit: "/reserver-un-audit",
};

export const HERO = {
  badge: "NOUVEAU",
  annonce: "Tamila suit désormais vos délais d'appel",
  titreAvant: "Une pièce reçue hier peut",
  titreMot: "contredire",
  titreApres: "tout votre dossier",
  texte: "Tamila la rapproche de vos faits dès son arrivée et vous signale ce qu'elle change. Pour chaque dossier, vous disposez d'une chronologie dont chaque fait renvoie à sa pièce, des contradictions relevées entre pièces et d'un bordereau rapproché de vos conclusions.",
  bouton: "Réserver un audit",
  legende: "Palais de justice de Paris, boulevard du Palais. À l'écran, des conclusions et leur dossier de faits (exemple).",
};

export const PIECES = {
  avant: "Chaque pièce est lue, même",
  mot: "manuscrite",
  apres: "",
  familles: ["Conclusions", "Bordereaux", "Pièces adverses", "Expertises", "Pré-rapports", "Constats", "Courriels", "Avis RPVA", "Scans"],
};

export const FONCTIONNALITES = {
  titreL1: "À l'audience, un fait vaut",
  titreL2: "ce que vaut",
  titreMot: "sa pièce",
  texte: "Tamila reconstitue les faits à partir de chaque pièce, même scannée, et renvoie chacun d'eux à la page qui le fonde. Vous vérifiez chaque fait avant de vous en servir.",
  cartes: [
    { titre: "Pièces adverses du jour", texte: "Avant l'audience, vous savez ce que les pièces reçues hier changent à votre dossier de faits." },
    { titre: "Chronologie sourcée", texte: "Chaque fait est daté, résumé et rattaché à la page de sa pièce." },
    { titre: "Bordereau contrôlé", texte: "Chaque prétention est rapprochée des pièces invoquées et de leur numérotation." },
    { titre: "Contradictions relevées", texte: "Quand deux pièces divergent, Tamila les présente côte à côte et vous laisse trancher." },
    { titre: "Secret professionnel", texte: "L'éditeur est français, et vos pièces sont hébergées en France." },
  ],
};

export const POINT = {
  titreL1: "Les échéances du cabinet se suivent",
  titreMot: "dossier par dossier",
  texte: "Chaque matin à 7 h, avant votre première audience, un courriel réunit les délais de procédure de la semaine, les pièces que le cabinet attend encore, les forfaits dépassés et les dossiers sans diligence, chacun avec l'action à engager.",
  cartes: [
    {
      titre: "Forfaits dépassés",
      texte: "Le temps passé est rapporté à la convention d'honoraires.",
      valeur: "3 dossiers",
      tendance: "2 factures à émettre",
      colonnes: ["Dossier", "Mode", "Temps", "Consommé"],
      lignes: [
        ["Bail", "Forfait", "14 h", "132 %"],
        ["Licenciement", "Forfait", "9 h", "104 %"],
        ["Construction", "Convention", "31 h", "87 %"],
      ],
    },
    {
      titre: "Sans diligence",
      texte: "Ces dossiers n'ont connu aucun acte depuis trente jours.",
      valeur: "7 dossiers",
      tendance: "2 avec audience en octobre",
      colonnes: ["Dossier", "Acte", "Jours", "Audience"],
      lignes: [
        ["Succession", "Courriel", "46 j", "—"],
        ["Copropriété", "Conclusions", "38 j", "14 oct."],
        ["Travail", "RDV", "33 j", "21 oct."],
      ],
    },
    {
      titre: "Délais de procédure",
      texte: "Les délais sont lus dans les avis RPVA et classés du plus proche au plus lointain.",
      valeur: "4 délais",
      tendance: "1 cette semaine",
      colonnes: ["Dossier", "Acte attendu", "Échéance", "Reste"],
      lignes: [
        ["Construction", "Conclusions d'appel", "2 oct.", "8 j"],
        ["Bail", "Conclusions d'intimé", "19 oct.", "25 j"],
        ["Travail", "Appel incident", "6 nov.", "43 j"],
      ],
    },
    {
      titre: "Ce que le cabinet attend",
      texte: "Le cabinet attend encore des pièces du client, des pré-rapports de l'expert et des pièces citées par le confrère.",
      valeur: "5 attentes",
      tendance: "2 dires à rendre en octobre",
      colonnes: ["Dossier", "Attendu de", "Objet", "Date"],
      lignes: [
        ["Construction", "Expert", "Dires sur le pré-rapport", "14 oct."],
        ["Succession", "Client", "Relevés bancaires", "21 j"],
        ["Copropriété", "Confrère", "Pièce n° 12 citée", "18 j"],
      ],
    },
  ],
  exemple: "Exemple",
};

export const CONNEXIONS = {
  titre: "Vos outils restent en place",
  bouton: "Voir les garanties",
  outils: ["Messagerie", "Agenda", "Dossiers partagés", "Logiciel métier", "Pièces scannées", "Exports"],
};

/* Section « Secret professionnel ». Chaque engagement est une clause du contrat proposé au cabinet ;
   rien n'y décrit une certification que nous n'avons pas. Références : loi n° 71-1130 du 31 décembre 1971,
   art. 66-5 ; Règlement intérieur national de la profession d'avocat (RIN), art. 2 ; RGPD, art. 28. */
export const SECRET = {
  titreAvant: "Confier vos pièces à un logiciel engage",
  titreMot: "votre secret professionnel",
  texte: "Vos pièces relèvent de l'article 66-5 de la loi du 31 décembre 1971. Tamila les héberge et les lit en France, chez un hébergeur français, et chacun de nos engagements figure dans le contrat que vous signez.",
  badge: "Français, hébergé en France",
  accroche: "Le contrat précise les dossiers que Tamila lit, le lieu où les pièces sont conservées et la date de leur effacement.",
  faits: [
    ["Éditeur", "France"],
    ["Droit applicable", "Français"],
    ["Hébergement", "France, hébergeur français"],
    ["Lecture des pièces", "En France"],
    ["Statut", "Sous-traitant, art. 28 RGPD"],
  ],
  engagements: [
    { titre: "Vous choisissez les dossiers lus", texte: "Tamila ne lit que les dossiers que vous lui ouvrez, un par un, et ne parcourt jamais votre messagerie de lui-même." },
    { titre: "Aucun entraînement sur vos pièces", texte: "Vos pièces ne servent à entraîner aucun modèle, ni le nôtre ni celui d'un fournisseur. Cette exclusion est une clause du contrat." },
    { titre: "Effacement à la clôture", texte: "Lorsque vous clôturez un dossier, ses pièces et son dossier de faits sont effacés. Vous conservez l'export que vous avez téléchargé." },
    { titre: "Vos pièces restent en France", texte: "Les pièces sont chiffrées pendant leur transfert et pendant leur conservation. Elles ne quittent jamais la France." },
    { titre: "Chaque accès est journalisé", texte: "Le journal indique qui a consulté quel dossier, et à quelle date. Vous pouvez l'exporter à tout moment." },
    { titre: "Aucune écriture dans vos outils", texte: "Tamila dispose d'un accès en lecture seule : il n'envoie aucun message, ne communique aucune pièce et ne modifie rien dans votre logiciel." },
  ],
  mention: "Loi n° 71-1130 du 31 décembre 1971, art. 66-5 · RIN, art. 2 · RGPD, art. 28",
};

export const FORMULES = {
  titreAvant: "Un seul prix pour",
  titreMot: "tout le cabinet",
  texte: "Le tarif est fixé à l'issue d'un audit mené sur l'un de vos dossiers, une fois que vous avez jugé le dossier de faits sur pièces.",
  bascule: ["Contentieux", "Dommage corporel"],
  plans: [
    {
      id: "pre-lecture",
      titre: "Pré-lecture",
      desc: "Pour le cabinet qui veut aborder chaque audience avec un dossier de faits complet, dont chaque fait renvoie à sa pièce.",
      prix: "Sur audit",
      bouton: "Réserver un audit",
      note: { Contentieux: "Réalisé pendant l'audit, sur un dossier réel", "Dommage corporel": "Réalisé pendant l'audit, sur un dossier réel" },
      inclut: {
        Contentieux: ["Dossier de faits daté et sourcé", "Contradictions entre pièces", "Bordereau contrôlé (art. 768)", "Dispositif contre motifs (art. 954)", "Prétentions nouvelles et concentration en appel", "Pièces citées jamais communiquées, sommation prête", "Dires à l'expert préparés sur le pré-rapport", "Trous de la chronologie et faits contredits", "Index des personnes et faits classés par moyen", "Questions posées au dossier", "Premier jet de l'exposé des faits", "Dossier de plaidoirie et renvois cliquables", "Pièces adverses du jour", "Pièces scannées et manuscrites", "Export Word et PDF", "Hébergement en France"],
        "Dommage corporel": ["Chronologie des soins", "Interruptions de soins repérées", "Nomenclature Dintilhac pré-remplie", "Écarts entre rapports d'expertise", "Dires à l'expert préparés sur le pré-rapport", "Source de chaque poste de préjudice", "Questions posées au dossier médical", "Premier jet de l'exposé des faits", "Pièces médicales scannées", "Export Word et PDF", "Effacement à la clôture"],
      },
    },
    {
      id: "cabinet",
      titre: "Cabinet",
      desc: "Pour l'associé qui veut connaître chaque matin l'état des honoraires forfaitaires, des dossiers en sommeil et de la charge de chaque collaborateur.",
      prix: "Sur audit",
      bouton: "Réserver un audit",
      note: { Contentieux: "Tarif par cabinet, fixé à l'audit", "Dommage corporel": "Tarif par cabinet, fixé à l'audit" },
      inclut: {
        Contentieux: ["L'ensemble de la pré-lecture", "Point du matin à 7 h", "Délais d'appel lus dans l'avis RPVA", "Pièces attendues du client et de l'expert", "Forfaits dépassés", "Marge par dossier", "Contentieux en série comparés", "Dossiers sans diligence", "Charge par avocat", "Temps passé proposé à la saisie", "Lecture seule de vos outils"],
        "Dommage corporel": ["L'ensemble de la pré-lecture", "Point du matin à 7 h", "Délais d'appel lus dans l'avis RPVA", "Pièces attendues du client et de l'expert", "Conventions et forfaits", "Marge par dossier", "Dossiers en série comparés", "Dossiers sans diligence", "Charge par avocat", "Temps passé proposé à la saisie", "Lecture seule de vos outils"],
      },
    },
  ],
};

export const MATIERES = {
  avant: "Pour toutes les matières où l'on plaide",
  mot: "sur pièces",
  liste: [
    ["", "Civil"], ["", "Commercial"], ["", "Prud'hommes"], ["", "Construction"],
    ["", "Corporel"], ["", "Baux"], ["", "Famille"], ["", "Assurances"],
    ["", "Copropriété"], ["", "Consommation"], ["", "Successions"], ["", "Bancaire"],
    ["", "Administratif"], ["", "Transport"], ["", "Santé"], ["", "Brevets"],
    ["", "Rural"], ["", "Sociétés"], ["", "Recouvrement"],
  ] as [string, string][],
  plus: "Et d'autres",
};

export const APPEL = {
  titreAvant: "Jugez-en sur",
  titreMot: "un dossier déjà plaidé",
  texte: "Lors de l'audit, vous nous confiez les pièces d'un dossier clos, puis vous comparez le dossier de faits obtenu à celui que vous aviez constitué,",
  texteSuite: "sans rien installer.",
  bouton: "Réserver un audit",
  legende: "Palais de justice de Paris, cour du Mai",
};
