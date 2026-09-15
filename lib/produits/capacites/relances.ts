/* ══════════════════════════════════════════════════════════════════════
   CASHD — catalogue de capacités, cas limites, échelle groupe (14/09/2026)

   Remplace la bande `CHIFFRES` de la page (« 1 tableur », « 3 canaux »,
   « 4 paliers », « 0 envoi sans vous ») : quatre faits de fabrication,
   justes mais sans étendue. Ils disent ce que le système s'interdit, ils
   ne disent rien de ce qu'il couvre. Un directeur administratif et
   financier de groupe ne se décide pas sur une promesse de sobriété, il
   se décide sur le périmètre tenu et sur le sort réservé aux cas tordus —
   le litige, l'avoir, l'échéancier, le règlement sans référence.

   La colonne `atteste` : voir l'en-tête de `types.ts`. Elle est à `true`
   uniquement sur ce que la page CASHD affirme déjà (`lib/produits/
   relances.ts`) ou sur ce qui en découle directement. Tout le reste est
   ÉCRIT MAIS PAS CONSTRUIT, et se tranche ligne à ligne avant tout
   partage. En cas de doute, la ligne est restée à `false`.
   ══════════════════════════════════════════════════════════════════════ */

import type { BlocCasLimites, BlocEchelle, Catalogue } from "./types";

export const CATALOGUE: Catalogue = {
  etiquette: "Le périmètre",
  titre: "Tout ce que CASHD prend en charge.",
  chapo:
    "Une créance traverse six étapes entre son émission et son encaissement. Voici ce que le système tient à chacune d'elles, y compris quand le client conteste, paie en plusieurs fois ou ne répond plus.",
  mention:
    "Le périmètre se règle à l'installation : une organisation n'active que ce dont ses services ont besoin. Quel que soit le réglage, aucun message ne part sans la validation d'une personne.",
  familles: [
    {
      nom: "Suivi de l'encours",
      icone: "search",
      lignes: [
        { t: "Le système relit votre facturier chaque matin, avant d'écrire la moindre relance.", atteste: true },
        { t: "Chaque devis porte le nombre de jours écoulés depuis son envoi.", atteste: true },
        { t: "Chaque facture porte son montant dû, son retard et le compte concerné.", atteste: true },
        { t: "Un règlement encaissé la veille sort de la liste du jour.", atteste: true },
        { t: "La balance âgée range l'encours par tranche d'ancienneté, compte par compte.", atteste: false },
        { t: "Chaque ligne indique l'état de la relance et le palier suivant.", atteste: true },
        { t: "Un échéancier négocié remplace l'échéance d'origine, et le suivi épouse ses termes.", atteste: false },
        { t: "Les devis sans réponse sont suivis au même titre que les factures échues.", atteste: true },
      ],
    },
    {
      nom: "Relance et escalade",
      icone: "megaphone",
      lignes: [
        { t: "Une facture échue suit trois paliers : deux relances, puis la mise en demeure.", atteste: true },
        { t: "Un devis sans réponse est relancé au troisième jour, puis sept jours après ce rappel.", atteste: true },
        { t: "La fermeté du message suit le palier atteint, du rappel à la mise en demeure.", atteste: true },
        { t: "Chaque message reprend le secteur du compte, sa référence, son montant et son retard.", atteste: true },
        { t: "Les relances partent par courriel, depuis la boîte de votre entreprise.", atteste: true },
        { t: "Au-delà d'un montant que vous fixez, la relance remonte à la direction avant l'envoi.", atteste: true },
        { t: "Chaque facture suit sa propre séquence, avec son palier et son échéance.", atteste: true },
        { t: "Les envois respectent les jours ouvrés, les jours fériés locaux et vos fenêtres horaires.", atteste: false },
        { t: "Les comptes export reçoivent leur relance dans leur langue de facturation.", atteste: false },
      ],
    },
    {
      nom: "Litiges et exceptions",
      icone: "scale",
      lignes: [
        { t: "Une contestation écrite bascule la facture en litige et la sort du cycle.", atteste: false },
        { t: "Le commercial en charge du compte est notifié dès l'ouverture du litige.", atteste: false },
        { t: "Une facture contestée sur une seule ligne laisse le reste en relance.", atteste: false },
        { t: "La reprise des relances demande une décision, jamais un simple délai écoulé.", atteste: false },
        { t: "Le contact de facturation reçoit les relances, le contact commercial reçoit les alertes.", atteste: false },
        { t: "Un compte se met en pause ou sort du périmètre à tout moment.", atteste: true },
        { t: "La mise en demeure est préparée, puis elle attend une validation explicite.", atteste: true },
        { t: "Le dossier de litige réunit les pièces, les envois et les accusés de réception.", atteste: false },
        { t: "Le courrier recommandé électronique est préparé quand la créance l'exige.", atteste: false },
      ],
    },
    {
      nom: "Encaissement et rapprochement",
      icone: "wallet",
      lignes: [
        { t: "Un règlement enregistré interrompt la séquence avant le prochain envoi.", atteste: true },
        { t: "Les règlements partiels sont imputés, et le solde dû continue d'être suivi.", atteste: false },
        { t: "Le lettrage rapproche chaque encaissement de la facture qu'il solde.", atteste: false },
        { t: "Les écritures bancaires sont rapprochées de l'encours, jour après jour.", atteste: false },
        { t: "Un virement sans référence est proposé au rapprochement avec les factures probables.", atteste: false },
        { t: "Les avoirs et les acomptes sont déduits avant tout calcul du solde dû.", atteste: false },
        { t: "Les pénalités de retard et l'indemnité forfaitaire de recouvrement sont calculées.", atteste: false },
        { t: "Un lien de paiement accompagne la relance et s'éteint dès le règlement.", atteste: false },
        { t: "Les factures en devise étrangère sont suivies dans leur devise et en euros.", atteste: false },
      ],
    },
    {
      nom: "Risque client",
      icone: "shield",
      lignes: [
        { t: "Un plafond d'encours se fixe par compte, à partir de son historique.", atteste: false },
        { t: "Le dépassement du plafond déclenche une alerte avant toute nouvelle commande.", atteste: false },
        { t: "Une commande au-delà du plafond est bloquée jusqu'à la décision d'un responsable.", atteste: false },
        { t: "Vos règles de communication et vos interdits sont repris dans chaque message.", atteste: true },
        { t: "Un compte qui se dégrade est signalé avant que le retard s'installe.", atteste: false },
        { t: "Un compte se met en pause, et il n'y revient que sur votre décision.", atteste: true },
        { t: "Le dossier destiné à l'assurance-crédit est constitué avec les pièces exigées.", atteste: false },
        { t: "Le dossier de recouvrement judiciaire est remis complet à qui vous désignez.", atteste: false },
      ],
    },
    {
      nom: "Pilotage",
      icone: "chart",
      lignes: [
        { t: "Le délai moyen de règlement se mesure compte par compte.", atteste: false },
        { t: "La prévision d'encaissement est établie à trente et à soixante jours.", atteste: false },
        { t: "Chaque relance partie est datée et consignée, avec son objet et son destinataire.", atteste: true },
        { t: "Le taux de réponse aux relances se suit palier par palier.", atteste: false },
        { t: "Les créances en litige, en pause et en recouvrement sont comptées en continu.", atteste: false },
        { t: "Chaque tableau s'exporte vers un tableur, à la demande ou à date fixe.", atteste: false },
        { t: "Les seuils et les cadences se modifient, et chaque changement reste daté.", atteste: false },
      ],
    },
  ],
};

export const CAS_LIMITES: BlocCasLimites = {
  etiquette: "Les cas tordus",
  titre: "Ce qui arrive vraiment quand on relance un client.",
  chapo:
    "Douze situations que vos équipes connaissent, et ce que le système en fait. Aucune ne se règle en envoyant la relance quand même.",
  cas: [
    {
      q: "Le client a payé hier soir, et la relance était prête.",
      r: "Le facturier est relu avant chaque envoi, donc le règlement de la veille retire le compte de la liste du jour. La relance préparée est abandonnée avant d'atteindre la file de validation.",
    },
    {
      q: "Le client conteste une seule ligne de la facture.",
      r: "La ligne contestée bascule en litige et le commercial du compte en est averti. Le reste de la facture continue son cycle, au montant qui n'est pas discuté.",
    },
    {
      q: "Le client demande à régler en plusieurs fois.",
      r: "L'échéancier se saisit avec ses dates et ses montants, puis il remplace l'échéance d'origine. Une échéance manquée relance le cycle, les autres ne déclenchent rien.",
    },
    {
      q: "Votre interlocuteur a quitté l'entreprise du client.",
      r: "Le rejet du message ou la réponse d'absence définitive signale l'adresse. Le compte passe en attente de contact et vous désignez le nouvel interlocuteur avant toute reprise.",
    },
    {
      q: "Deux filiales du même groupe client doivent être relancées séparément.",
      r: "Chaque entité juridique porte son propre compte, son encours et son contact de facturation. Le consolidé du groupe reste lisible, mais aucune relance ne mélange les deux.",
    },
    {
      q: "Un virement arrive sans aucune référence de facture.",
      r: "Le montant est rapproché des factures ouvertes du compte, et les correspondances probables vous sont proposées. Tant que l'imputation n'est pas tranchée, la séquence du compte est suspendue.",
    },
    {
      q: "Le montant restant dû est de quelques euros.",
      r: "Un seuil de relance se fixe par entité, et les soldes en dessous sortent du cycle automatique. Ils restent visibles dans l'encours, et vous décidez de les abandonner ou de les réclamer.",
    },
    {
      q: "Le client est aussi l'un de vos fournisseurs.",
      r: "Le compte est signalé comme réciproque et sort du cycle automatique. La compensation relève d'une décision de la direction financière, jamais d'une relance partie seule.",
    },
    {
      q: "Le dossier est passé entre les mains d'un avocat.",
      r: "Le compte bascule en recouvrement et toute relance commerciale cesse, y compris celle qui était déjà rédigée. Les pièces, les envois et les accusés sont réunis dans un dossier remis à qui vous désignez.",
    },
    {
      q: "Le client demande expressément l'arrêt des relances.",
      r: "La demande met le compte hors périmètre et la mention reste attachée à sa fiche. Seule une personne habilitée peut l'y remettre, et le journal garde la trace des deux décisions.",
    },
    {
      q: "Le devis a été accepté de vive voix, sans retour écrit.",
      r: "Le devis reste en attente de réponse et continue sa cadence, puisque rien ne l'atteste. Vous consignez l'accord oral, ce qui arrête la relance et ouvre le suivi de la facturation à venir.",
    },
    {
      q: "La facture attend un bon de commande chez le client.",
      r: "Le motif de blocage est consigné et la relance vise le service qui doit émettre ce bon, pas la comptabilité. Le décompte du retard continue pendant ce temps, et il reste lisible.",
    },
  ],
};

export const ECHELLE: BlocEchelle = {
  etiquette: "À l'échelle d'un groupe",
  titre: "Plusieurs sociétés, plusieurs équipes, un seul encours.",
  chapo:
    "Ce qui change quand le recouvrement n'est plus tenu par une personne mais par un service crédit, sur plusieurs entités et plusieurs marchés.",
  cartes: [
    {
      icone: "users",
      titre: "Une entité, un périmètre",
      texte:
        "Chaque société, filiale ou site a son encours, ses comptes clients et ses règles de gestion. Une direction financière lit le consolidé, un chargé de recouvrement ne voit que son portefeuille.",
    },
    {
      icone: "route",
      titre: "Des rôles et des délégations",
      texte:
        "Suivi, validation des relances, gestion des litiges et administration sont quatre rôles distincts. Une délégation se pose pour une absence et s'éteint à la date prévue.",
    },
    {
      icone: "scale",
      titre: "Des seuils de relance par montant",
      texte:
        "Le montant et le palier décident de qui valide : le chargé de compte, le responsable crédit, la direction financière. La mise en demeure exige toujours une validation explicite.",
    },
    {
      icone: "lock",
      titre: "Un journal opposable",
      texte:
        "Chaque relance, chaque suspension et chaque décision de litige s'inscrivent dans un journal qui ne se modifie pas, y compris par nous. Le jour où un client affirme n'avoir rien reçu, la preuve est datée.",
    },
    {
      icone: "landmark",
      titre: "Un raccordement au système existant",
      texte:
        "Le système lit votre facturation et vos encaissements là où ils vivent déjà, tableur compris. Là où un connecteur manque, l'échange passe par dépôt de fichiers ou par interface de programmation.",
    },
    {
      icone: "chart",
      titre: "Des indicateurs par entité",
      texte:
        "Encours, balance âgée, délai moyen de règlement et prévision d'encaissement se lisent par société et en consolidé, avec un export daté.",
    },
  ],
};
