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
      r: "La pièce est traitée comme les autres, et l'adresse d'envoi est reprise telle quelle sur la ligne d'achat. C'est le contenu de la facture qui décide du fournisseur, pas l'expéditeur.",
    },
    {
      q: "Le fournisseur n'a pas mis de numéro sur sa facture.",
      r: "La pièce part en anomalie pour champ manquant. Sans numéro, aucun contrôle de doublon ne tient, et une facture réglée deux fois se découvre au relevé.",
    },
    {
      q: "Le montant est dans le corps du message, la pièce jointe est vide.",
      r: "Le message part en anomalie avec sa mention, et personne ne le classe au jugé. Vous savez qu'une facture est arrivée sans son document, et vous réclamez la pièce.",
    },
    {
      q: "Le fournisseur envoie une photo au lieu d'un PDF.",
      r: "La pièce part en anomalie plutôt que d'être devinée. Un montant lu de travers entre en comptabilité et ne se découvre qu'au bilan : c'est le risque que ce refus écarte.",
    },
    {
      q: "Les totaux de la facture ne tombent pas juste.",
      r: "Le classement s'arrête dès que l'écart entre le hors taxes, la TVA et le total dépasse cinq centimes. La pièce attend une vérification humaine plutôt que d'entrer avec un montant faux.",
    },
    {
      q: "La facture est libellée dans une autre devise.",
      r: "Les montants sont lus tels qu'ils figurent sur la pièce, sans conversion. La contre-valeur en euros reste à la charge de votre comptabilité.",
    },
    {
      q: "La facture porte un taux de TVA inhabituel.",
      r: "Le contrôle porte sur la cohérence entre le hors taxes, la TVA et le total, quel que soit le taux. Un taux exotique passe s'il tombe juste, et s'arrête sinon.",
    },
    {
      q: "La même facture arrive deux fois, par deux canaux différents.",
      r: "Le doublon est reconnu même après un renommage ou un nouveau scan. La seconde copie est écartée et reste consultable.",
    },
    {
      q: "Un même fichier contient plusieurs factures.",
      r: "La pièce part en anomalie plutôt que d'être classée sur la première facture lue. Le découpage automatique n'existe pas encore, et l'annoncer coûterait plus cher que de le dire.",
    },
    {
      q: "Le total de la facture est à zéro.",
      r: "La pièce est mise en attente. Un total nul vient presque toujours d'une lecture ratée, et le classer reviendrait à perdre la facture.",
    },
    {
      q: "Le fournisseur n'existe pas encore dans votre comptabilité.",
      r: "La pièce est classée avec le nom lu sur la facture, et c'est votre comptabilité qui crée la fiche. Le système n'écrit rien dans votre plan comptable.",
    },
    {
      q: "La pièce arrive longtemps après sa date d'émission.",
      r: "Elle est classée avec ses deux dates, celle de la facture et celle de sa réception. L'écart se voit, et c'est à votre comptabilité de décider de l'exercice.",
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
      titre: "Des seuils de validation par montant",
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
