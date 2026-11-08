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

   08/11/2026 — TAMILA ÉLARGIE (Teo : « reformule les deux pages avec la
   nouvelle idée »). Le produit ne s'arrête plus au dossier de faits : il
   vérifie le dossier entier, de la première pièce à l'archivage, selon le
   brief docs/briefs-saas/tamila-v2.md. Ce que la page dit de plus :
   · les textes et les arrêts cités sont vérifiés (ils existent, ils sont
     en vigueur, ils disent ce qu'on leur fait dire) ;
   · les conclusions adverses et les expertises sont rapprochées des pièces ;
   · les dossiers répétitifs sont vérifiés contre les modèles du cabinet,
     par lot — Tamila ne rédige rien ;
   · tout ce qui est relevé et décidé est daté dans un journal d'audit
     exportable ;
   · la formule d'entrée devient « Découverte » : un dossier déjà plaidé,
     à prix fixe, sans abonnement, remboursé si moins de trois points sont
     confirmés. Toujours aucun montant sur la page (règle maison).
   Le site source OMEGA/cabinetos-site n'a pas suivi : la page d'Omega est
   la version de référence.
   ══════════════════════════════════════════════════════════════════════ */

/* Tous les textes de la page. Source du fond : plans-et-decisions/secteurs/cabinets-avocats-2026-09.md (§4 et §6),
   puis docs/briefs-saas/tamila-v2.md (08/11).
   Registre (réécriture du 24/09, demande de Teo) : celui d'un cabinet — vouvoiement, vocabulaire du métier
   (pièces, bordereau de communication, diligences, convention d'honoraires), phrases complètes au verbe
   conjugué (OMEGA/DOCTRINE-TEXTES-SAAS.md, partie II : ni fragments, ni ternaires, ni antithèses en série).
   Règles maison : aucun client, logo, avis ni chiffre de traction inventé ; aucun prix public ; nos outils
   jamais nommés ; données des cartes étiquetées « exemple ».
   Souveraineté — DÉCISION DE TEO DU 24/09/2026 : Tamila a un hébergeur français, les pièces sont stockées en
   France. Par exception à la doctrine §6 (qui vaut pour les autres SaaS), on écrit donc « hébergé en France ».
   DÉCISION DE TEO DU 28/09/2026 : les pièces sont lues par le meilleur modèle, qui n'est servi qu'en Europe,
   sans aucune conservation. La page dit donc « stockées en France, lues en Europe ». L'infrastructure du
   produit doit s'y conformer. */

export const CONTACT = {
  audit: "/reserver-un-audit",
};

export const HERO = {
  badge: "NOUVEAU",
  annonce: "Textes et arrêts cités : désormais vérifiés",
  titreAvant: "Le dossier entier,",
  titreMot: "vérifié",
  titreApres: "de la première pièce à l'audience",
  texte: "Tamila lit tout ce que contient le dossier : vos conclusions et celles du confrère, les pièces des deux parties, les textes et les arrêts cités, le contrat, le rapport d'expertise. Elle rattache chaque fait à sa pièce et à sa page, vérifie que chaque référence existe, est en vigueur et dit ce qu'on lui fait dire, puis consigne ce qu'elle a relevé et ce que vous en avez décidé dans un journal daté.",
  bouton: "Réserver un audit",
  legende: "Palais de justice de Paris, boulevard du Palais. À l'écran, des conclusions et leur dossier de faits (exemple).",
};

export const PIECES = {
  avant: "Chaque pièce est lue, même",
  mot: "manuscrite",
  apres: "",
  familles: ["Conclusions", "Bordereaux", "Pièces adverses", "Expertises", "Contrats", "Constats", "Textes cités", "Arrêts cités", "Scans"],
};

export const FONCTIONNALITES = {
  titreL1: "À l'audience, un fait vaut",
  titreL2: "ce que vaut",
  titreMot: "sa pièce",
  texte: "Tamila reconstitue les faits à partir de chaque pièce, vérifie chaque référence citée et renvoie chaque point à la page qui le fonde. Un point sans preuve n'est pas affiché ; vous tranchez sur ce qui reste.",
  cartes: [
    { titre: "Pièces adverses à l'arrivée", texte: "Chaque pièce reçue est rapprochée de votre dossier de faits le jour même : ce qu'elle confirme, ce qu'elle contredit, et ce qu'elle appelle comme réponse." },
    { titre: "Chronologie sourcée", texte: "Chaque fait est daté, résumé et rattaché à la page de sa pièce. Les trous de la chronologie et les faits contredits sont signalés." },
    { titre: "Bordereau et références contrôlés", texte: "Chaque prétention est rapprochée des pièces invoquées (art. 768). Chaque texte et chaque arrêt cités sont vérifiés : ils existent, ils sont en vigueur, ils disent ce qu'on leur fait dire." },
    { titre: "Contradictions relevées, preuve à l'appui", texte: "Quand deux pièces divergent, ou quand les conclusions adverses contredisent une pièce du dossier, Tamila les présente côte à côte, avec la page, et vous laisse trancher." },
    { titre: "Journal d'audit et secret professionnel", texte: "Tout ce que Tamila relève et tout ce que vous en décidez est daté, rattaché à sa pièce et exportable en un dossier scellé. Vos pièces sont chiffrées sur votre poste et conservées en France." },
  ],
};

export const POINT = {
  titreL1: "Chaque matin, l'état de vérification",
  titreMot: "de tous vos dossiers",
  texte: "Chaque matin à 7 h, avant votre première audience, un courriel réunit, dossier par dossier, les délais de la semaine, les pièces que le cabinet attend encore, les références à corriger et les points de conformité à lever, chacun avec l'action à engager.",
  cartes: [
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
    {
      titre: "Références à corriger",
      texte: "Chaque texte et chaque arrêt cités dans les écritures sont vérifiés : existence, version en vigueur, portée.",
      valeur: "6 références",
      tendance: "2 dans des conclusions à déposer",
      colonnes: ["Dossier", "Référence", "État", "Action"],
      lignes: [
        ["Bail", "L. 145-41", "Modifié", "À corriger"],
        ["Travail", "Soc. 2019", "Dépassé", "À lire"],
        ["Construction", "1792-4-1", "Valide", "Aucune"],
      ],
    },
    {
      titre: "Conformité du dossier",
      texte: "Bordereaux, pièces communiquées, accès aux pièces : les points de conformité de chaque dossier, et la piste d'audit prête à exporter.",
      valeur: "3 points",
      tendance: "1 sommation prête",
      colonnes: ["Dossier", "Contrôle", "Pièces", "Action"],
      lignes: [
        ["Copropriété", "Bordereau", "2", "Sommation"],
        ["Succession", "Pièce citée", "1", "Relancer"],
        ["Bail", "Accès", "12", "Exporter"],
      ],
    },
  ],
  exemple: "Exemple",
};

export const CONNEXIONS = {
  titre: "Vos outils restent en place",
  bouton: "Voir les garanties",
  outils: ["Messagerie", "Agenda", "Dossiers partagés", "Logiciel de cabinet", "Pièces scannées", "Exports"],
};

/* Section « Secret professionnel ». Chaque engagement est une clause du contrat proposé au cabinet ;
   rien n'y décrit une certification que nous n'avons pas. Références : loi n° 71-1130 du 31 décembre 1971,
   art. 66-5 ; Règlement intérieur national de la profession d'avocat (RIN), art. 2 ; RGPD, art. 28. */
export const SECRET = {
  titreAvant: "Confier vos pièces à un logiciel engage",
  titreMot: "votre secret professionnel",
  texte: "Vos pièces relèvent de l'article 66-5 de la loi du 31 décembre 1971. Tamila les chiffre sur votre poste, les conserve dans l'Union européenne, et les lit en Europe, sans rien en conserver. Chacun de nos engagements figure dans le contrat que vous signez.",
  badge: "Français, hébergé dans l'UE",
  accroche: "Le contrat précise les dossiers que Tamila lit, le lieu où les pièces sont conservées et la date de leur effacement.",
  faits: [
    ["Éditeur", "France"],
    ["Droit applicable", "Français"],
    ["Hébergement", "France, hébergeur français"],
    ["Lecture des pièces", "En Europe, sans conservation"],
    ["Statut", "Sous-traitant, art. 28 RGPD"],
  ],
  engagements: [
    { titre: "Vous choisissez les dossiers lus", texte: "Tamila ne lit que les dossiers que vous lui ouvrez, un par un, et ne parcourt jamais votre messagerie ni votre base de clients de lui-même." },
    { titre: "Aucun entraînement sur vos pièces", texte: "Vos pièces ne servent à entraîner aucun modèle, ni le nôtre ni celui d'un fournisseur. Cette exclusion est une clause du contrat." },
    { titre: "Effacement à la clôture", texte: "Lorsque vous clôturez un dossier, ses pièces et son dossier de faits sont effacés. Vous conservez le dossier de clôture et le journal que vous avez exportés." },
    { titre: "Stockées en France, lues en Europe", texte: "Les pièces sont chiffrées pendant leur transfert et pendant leur conservation. Elles sont conservées en France. Leur lecture se fait dans l'Union européenne, et aucune copie n'y est gardée." },
    { titre: "Chaque accès est journalisé", texte: "Le journal indique qui a consulté quel dossier, ce qui a été relevé et ce que vous en avez décidé, à quelle date. Vous pouvez l'exporter à tout moment." },
    { titre: "Aucune écriture dans vos outils", texte: "Tamila dispose d'un accès en lecture seule : il n'envoie aucun message, ne communique aucune pièce, ne rédige aucun acte et ne modifie rien dans votre logiciel." },
  ],
  mention: "Loi n° 71-1130 du 31 décembre 1971, art. 66-5 · RIN, art. 2 · RGPD, art. 28",
};

export const FORMULES = {
  titreAvant: "Un dossier pour juger,",
  titreMot: "puis tout le cabinet",
  texte: "Le premier dossier est vérifié à prix fixe, sans abonnement : vous jugez sur pièces. Le tarif du cabinet est fixé ensuite, à l'issue de cet audit.",
  bascule: ["Contentieux", "Dommage corporel"],
  plans: [
    {
      id: "decouverte",
      titre: "Découverte",
      desc: "Pour le cabinet qui veut juger Tamila sur un dossier déjà plaidé, vérifié de bout en bout : faits, pièces, références, conformité.",
      prix: "Prix fixe",
      bouton: "Réserver un audit",
      note: { Contentieux: "Un dossier, sans abonnement, réalisé pendant l'audit", "Dommage corporel": "Un dossier, sans abonnement, réalisé pendant l'audit" },
      inclut: {
        Contentieux: ["Dossier de faits daté et sourcé", "Contradictions entre pièces, côte à côte", "Bordereau contrôlé (art. 768)", "Dispositif contre motifs (art. 954)", "Textes cités : existence et version en vigueur", "Arrêts cités : existence et portée", "Prétentions nouvelles et concentration en appel", "Pièces citées jamais communiquées, sommation prête", "Conclusions adverses rapprochées des pièces", "Dires à l'expert préparés sur le pré-rapport", "Trous de la chronologie et faits contredits", "Index des personnes et faits classés par moyen", "Rapport de cohérence et tableau des références", "Journal d'audit du dossier, exportable", "Pièces scannées et manuscrites", "Export Word et PDF", "Remboursé si moins de trois points confirmés"],
        "Dommage corporel": ["Chronologie des soins", "Interruptions de soins repérées", "Nomenclature Dintilhac pré-remplie", "Écarts entre rapports d'expertise", "Rapport d'expertise confronté à la mission", "Dires à l'expert préparés sur le pré-rapport", "Source de chaque poste de préjudice", "Textes et arrêts cités vérifiés", "Questions posées au dossier médical", "Journal d'audit du dossier, exportable", "Pièces médicales scannées", "Export Word et PDF", "Remboursé si moins de trois points confirmés"],
      },
    },
    {
      id: "cabinet",
      titre: "Cabinet",
      desc: "Pour le cabinet qui veut chaque dossier vérifié en continu, de la première pièce à l'archivage, et une piste d'audit prête en cas de contrôle.",
      prix: "Sur audit",
      bouton: "Réserver un audit",
      note: { Contentieux: "Tarif par cabinet, fixé à l'audit", "Dommage corporel": "Tarif par cabinet, fixé à l'audit" },
      inclut: {
        Contentieux: ["Tout ce que contient Découverte, sur tous vos dossiers", "Pièces adverses rapprochées le jour de leur arrivée", "Références re-vérifiées à chaque nouveau dépôt", "Dossiers répétitifs vérifiés contre vos modèles, par lot", "Point du matin à 7 h", "Délais lus dans les avis RPVA", "Pièces attendues du client, de l'expert et du confrère", "Piste d'audit du cabinet, export scellé", "Dossier de clôture et archivage daté", "Forfaits dépassés et dossiers sans diligence", "Charge par avocat", "Lecture seule de vos outils"],
        "Dommage corporel": ["Tout ce que contient Découverte, sur tous vos dossiers", "Pièces médicales rapprochées le jour de leur arrivée", "Références re-vérifiées à chaque nouveau dépôt", "Dossiers en série vérifiés contre vos modèles", "Point du matin à 7 h", "Délais lus dans les avis RPVA", "Pièces attendues du client et de l'expert", "Piste d'audit du cabinet, export scellé", "Dossier de clôture et archivage daté", "Conventions et forfaits suivis", "Charge par avocat", "Lecture seule de vos outils"],
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
  texte: "Lors de l'audit, vous nous confiez les pièces d'un dossier clos. Vous comparez le rapport de cohérence, les références vérifiées et le dossier de faits à ce que le cabinet avait constitué,",
  texteSuite: "sans rien installer.",
  bouton: "Réserver un audit",
  legende: "Palais de justice de Paris, cour du Mai",
};
