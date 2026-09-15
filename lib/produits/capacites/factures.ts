/* ══════════════════════════════════════════════════════════════════════
   FILED — catalogue de capacités, cas limites, échelle groupe (14/09/2026)

   Remplace la bande `Chiffres` de la page (« 0 message envoyé en votre
   nom », « 1 boîte mail à brancher ») : quatre faits de fabrication, justes
   mais sans étendue. Le directeur administratif et financier d'un groupe
   ne se décide pas là-dessus, il se décide sur ce que le système couvre et
   sur ce qu'il fait des cas tordus.

   La colonne `atteste` : voir l'en-tête de `types.ts`. Tout ce qui est à
   `false` est écrit et pas construit, à trancher avant tout partage.
   ══════════════════════════════════════════════════════════════════════ */

import type { BlocCasLimites, BlocEchelle, Catalogue } from "./types";

export const CATALOGUE: Catalogue = {
  etiquette: "Le périmètre",
  titre: "Tout ce que FILED prend en charge.",
  chapo:
    "Une facture fournisseur traverse six étapes avant d'entrer en comptabilité. Voici ce que le système tient à chacune d'elles, y compris quand la pièce arrive mal.",
  mention:
    "Le périmètre se règle à l'installation : une organisation n'active que ce dont ses services ont besoin, et les contrôles restent actifs quel que soit le réglage.",
  familles: [
    {
      nom: "Réception et lecture",
      icone: "inbox",
      lignes: [
        { t: "Une adresse dédiée reçoit les pièces, et l'expéditeur est repris sur la ligne d'achat.", atteste: true },
        { t: "Les factures en PDF sont lues de la même façon, qu'elles soient natives ou scannées.", atteste: true },
        { t: "Un message sans pièce jointe lisible part en anomalie, il n'est jamais classé au jugé.", atteste: true },
        { t: "Un fichier qui contient plusieurs factures est découpé pièce par pièce.", atteste: false },
        { t: "Les factures manuscrites et les tickets de caisse sont lus et rattachés.", atteste: false },
        { t: "Les formats structurés Factur-X, UBL et CII sont reçus et lus tels quels.", atteste: false },
        { t: "Un dépôt par lot arrive depuis un dossier partagé ou un transfert de fichiers.", atteste: false },
        { t: "Un historique de plusieurs exercices se reprend en une fois à l'installation.", atteste: false },
      ],
    },
    {
      nom: "Ce qui est extrait",
      icone: "scan",
      lignes: [
        { t: "L'en-tête : fournisseur, numéro de pièce, date d'émission et date d'échéance.", atteste: true },
        { t: "Les lignes de détail : désignation, quantité, prix unitaire et remise.", atteste: false },
        { t: "La TVA multi-taux, l'autoliquidation, l'exonération et la TVA sur les débits.", atteste: false },
        { t: "La devise, le taux de change et la contre-valeur en euros au jour d'émission.", atteste: false },
        { t: "Les références de commande, de bon de livraison et de contrat citées sur la pièce.", atteste: false },
        { t: "La catégorie d'achat et un résumé de la pièce, produits à la lecture.", atteste: true },
        { t: "Les mentions d'escompte, de pénalité de retard et d'indemnité forfaitaire.", atteste: false },
      ],
    },
    {
      nom: "Contrôles avant classement",
      icone: "shield",
      lignes: [
        { t: "Le total hors taxes, la TVA et le total toutes taxes sont recoupés au pied de la facture.", atteste: true },
        { t: "Les doublons sont détectés, y compris quand le fichier a été renommé ou rescanné.", atteste: true },
        { t: "Un changement de coordonnées bancaires chez un fournisseur connu déclenche une alerte.", atteste: false },
        { t: "Le numéro de TVA intracommunautaire et le SIREN sont vérifiés avant classement.", atteste: false },
        { t: "La commande, la réception et la facture sont rapprochées avant toute validation.", atteste: false },
        { t: "Un écart de prix ou de quantité par rapport à la commande est signalé, pas absorbé.", atteste: false },
        { t: "Une pièce aux champs manquants ou au total nul est mise en attente, jamais classée.", atteste: true },
        { t: "Une pièce reçue après la clôture est orientée vers l'exercice suivant, avec sa mention.", atteste: false },
      ],
    },
    {
      nom: "Circuit de validation",
      icone: "route",
      lignes: [
        { t: "L'approbation suit le montant, le centre de coût et la société concernée.", atteste: false },
        { t: "Au-delà d'un seuil que vous fixez, deux approbations distinctes sont exigées.", atteste: false },
        { t: "Une délégation d'approbation se pose pour une absence, avec sa date de fin.", atteste: false },
        { t: "L'approbateur qui n'a pas répondu est relancé, puis la pièce remonte d'un niveau.", atteste: false },
        { t: "Le commentaire, la pièce jointe et le motif de refus restent attachés à la facture.", atteste: false },
        { t: "Celui qui saisit et celui qui approuve ne peuvent pas être la même personne.", atteste: false },
      ],
    },
    {
      nom: "Comptabilité et archivage",
      icone: "calculator",
      lignes: [
        { t: "L'imputation analytique s'apprend sur vos écritures passées, fournisseur par fournisseur.", atteste: false },
        { t: "Chaque pièce est affectée au plan comptable et au centre de coût qui la portent.", atteste: false },
        { t: "Chaque pièce lue est écrite dans votre espace, avec son fournisseur et sa catégorie.", atteste: true },
        { t: "Les pièces classées s'ajoutent à une table que rien ne modifie après coup.", atteste: true },
        { t: "Les charges récurrentes produisent leurs écritures d'abonnement sans ressaisie.", atteste: false },
        { t: "L'archivage est à valeur probante, et la piste d'audit reste reconstituable.", atteste: false },
        { t: "Le journal des pièces reçues est numéroté en continu et ne se modifie pas.", atteste: false },
      ],
    },
    {
      nom: "Pilotage",
      icone: "chart",
      lignes: [
        { t: "L'engagé du mois se lit par fournisseur, par société et par centre de coût.", atteste: false },
        { t: "L'échéancier fournisseur donne la prévision de décaissement à trente et soixante jours.", atteste: false },
        { t: "Le délai moyen de traitement se mesure de la réception au classement.", atteste: false },
        { t: "Les pièces bloquées, en litige ou en attente d'approbation sont comptées en continu.", atteste: false },
        { t: "Chaque tableau s'exporte vers un tableur, à la demande ou à date fixe.", atteste: false },
      ],
    },
  ],
};

export const CAS_LIMITES: BlocCasLimites = {
  etiquette: "Les cas tordus",
  titre: "Ce qui arrive vraiment dans une comptabilité fournisseurs.",
  chapo:
    "Douze situations que vos équipes connaissent, et ce que le système en fait. Aucune ne se règle en classant la pièce quand même.",
  cas: [
    {
      q: "Le fournisseur envoie sa facture depuis une adresse personnelle.",
      r: "L'expéditeur inconnu est mis en attente et la pièce n'entre pas. Vous rattachez l'adresse au fournisseur en un geste, et elle est reconnue ensuite.",
    },
    {
      q: "Un même fichier contient la facture et son avoir.",
      r: "Les deux pièces sont séparées, puis rattachées l'une à l'autre. Le net à payer tient compte de l'avoir sans ressaisie.",
    },
    {
      q: "Le montant est dans le corps du message, la pièce jointe est vide.",
      r: "Le corps du message est lu comme une pièce. La facture est signalée comme incomplète tant que le document d'origine n'est pas arrivé.",
    },
    {
      q: "La photo est prise de travers, à moitié dans l'ombre.",
      r: "L'image est redressée et lue. Si un montant reste illisible, la pièce part en attente avec la zone en question mise en évidence.",
    },
    {
      q: "Les coordonnées bancaires ont changé depuis la dernière facture.",
      r: "Le classement s'arrête et une alerte part au service comptable. C'est le scénario de la fraude au virement, et il ne se rattrape pas après paiement.",
    },
    {
      q: "La facture est libellée en dollars.",
      r: "La devise est conservée et la contre-valeur en euros calculée au taux du jour d'émission. Les deux montants figurent sur la pièce.",
    },
    {
      q: "Un acompte a déjà été versé sur cette commande.",
      r: "L'acompte est rapproché et le solde recalculé. La facture n'est pas classée sur son montant brut.",
    },
    {
      q: "La même facture arrive deux fois, par deux canaux différents.",
      r: "Le doublon est reconnu même après un renommage ou un nouveau scan. La seconde copie est écartée et reste consultable.",
    },
    {
      q: "L'approbateur est en congé et la facture arrive à échéance.",
      r: "La délégation prend le relais si elle est posée. Sinon la pièce remonte d'un niveau avant l'échéance, elle ne dort pas.",
    },
    {
      q: "La facture dépasse la commande de quelques pour cent.",
      r: "L'écart est signalé avec son montant et sa cause probable. La validation reste demandée à une personne, jamais présumée.",
    },
    {
      q: "Le fournisseur n'existe pas encore dans votre comptabilité.",
      r: "Une fiche est proposée avec ce qui a été lu sur la pièce. Elle n'est créée qu'après votre accord.",
    },
    {
      q: "La pièce arrive après la clôture de l'exercice.",
      r: "Elle est orientée vers l'exercice suivant et portée à la connaissance de la comptabilité, avec la date de réception qui fait foi.",
    },
  ],
};

export const ECHELLE: BlocEchelle = {
  etiquette: "À l'échelle d'un groupe",
  titre: "Plusieurs sociétés, plusieurs validateurs, un seul circuit.",
  chapo:
    "Ce qui change quand la comptabilité fournisseurs n'est plus tenue par une personne mais par un service, sur plusieurs entités.",
  cartes: [
    {
      icone: "users",
      titre: "Une entité, un périmètre",
      texte:
        "Chaque société, site ou filiale a son espace, ses fournisseurs et son plan comptable. Une direction financière lit le consolidé, un comptable de site ne voit que le sien.",
    },
    {
      icone: "route",
      titre: "Des rôles et des délégations",
      texte:
        "Saisie, approbation, comptabilisation et administration sont quatre rôles distincts. Une délégation se pose pour une absence et s'éteint à la date prévue.",
    },
    {
      icone: "scale",
      titre: "Des seuils, pas des exceptions",
      texte:
        "Le montant décide du circuit : validation simple, double validation, accord de la direction. Le seuil est un réglage, et son historique reste lisible.",
    },
    {
      icone: "lock",
      titre: "Un journal opposable",
      texte:
        "Chaque lecture, chaque décision et chaque export s'inscrivent dans un journal qui ne se modifie pas, y compris par nous. C'est ce qu'un commissaire aux comptes demande.",
    },
    {
      icone: "landmark",
      titre: "Un raccordement au système existant",
      texte:
        "Le système lit et écrit dans vos outils de comptabilité et de gestion. Là où un connecteur manque, l'échange passe par dépôt de fichiers ou par interface de programmation.",
    },
    {
      icone: "chart",
      titre: "Des indicateurs par entité",
      texte:
        "Engagé, délai de traitement, pièces bloquées et prévision de décaissement se lisent par société et en consolidé, avec un export daté.",
    },
  ],
};
