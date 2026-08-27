/* ══════════════════════════════════════════════════════════════════════
   Pré-audits personnalisés — /audit/[slug] (02/08/2026)

   Une page par prospect, préparée AVANT l'entretien de découverte et
   envoyée par WhatsApp avec le lien de réservation. Le principe vient du
   protocole d'audit : on ne vend pas, on montre — la page nomme les
   douleurs du métier, donne trois remèdes utilisables le jour même sans
   Omega, et seulement ensuite les moteurs qui répondent.

   Règles tenues ici comme partout (NOTES-DESIGN) :
     · aucun chiffre inventé — les montants sont remplacés par « ce qu'on
       mesurera ensemble », le chiffrage se fait pendant l'entretien ;
     · vouvoiement, registre opérationnel-précis, zéro catchphrase ;
     · pages NON indexées (robots noindex sur la route) et absentes du
       sitemap : ce sont des documents de travail privés, pas des pages
       publiques.

   Ajouter un prospect = ajouter une entrée AUDITS + redéployer. Le slug
   fait office de clé d'accès : pour un vrai prospect, le suffixer d'un
   code court non devinable (ex. « carmo-k7f2 »), jamais le nom seul.
   ══════════════════════════════════════════════════════════════════════ */

export type Douleur = {
  titre: string;
  texte: string;
  /* ce que l'audit chiffrera — à la place de tout chiffre inventé */
  mesure: string;
};

export type Remede = {
  titre: string;
  texte: string;
  /* le prompt prêt à coller dans ChatGPT ou Claude — la valeur donnée
     avant toute vente, copiable en un clic */
  prompt: string;
  /* le moteur qui fait la même chose en continu, pour le renvoi en bas
     de carte (« Le moteur qui le fait tout seul : PAYD ») */
  moteur?: string;
};

export type MoteurReco = {
  /* code du paquet tel que dans lib/content.ts (CASHD, FRONTD…) */
  system: string;
  /* slug de sa page — /offres/relances-impayes, etc. */
  slug: string;
  raison: string;
  douleurs: string; /* « douleurs 1 et 2 » — le renvoi lisible */
};

export type Audit = {
  slug: string;
  entreprise: string;
  activite: string;
  commune: string;
  /* date de préparation, déjà formatée (« 2 août 2026 ») */
  date: string;
  /* true = bandeau « page d'exemple » : contenus génériques au métier,
     aucune entreprise réelle derrière */
  demo?: boolean;
  /* « ce qu'on pense avoir compris » — 2 à 4 phrases, corrigées à l'oral
     pendant l'entretien, c'est le but */
  intro: string;
  douleurs: Douleur[];
  remedes: Remede[];
  moteurs: MoteurReco[];
};

export const AUDITS: Audit[] = [
  {
    slug: "demo-btp",
    entreprise: "Constructions Alizés",
    activite: "Entreprise générale du bâtiment",
    commune: "Zone d'activité",
    date: "2 août 2026",
    demo: true,
    intro:
      "Une équipe en chantier la journée, la gestion le soir : les devis, les relances et la saisie passent après le métier, parce qu'il faut bien que le métier passe d'abord. Rien de cassé, mais du chiffre part chaque mois par les mêmes trous, et personne n'a le temps de les mesurer. Cette page prépare l'entretien : elle dit ce qu'on pense avoir compris, et vous nous corrigez à l'oral.",
    douleurs: [
      {
        titre: "Les devis partent, le suivi s'arrête",
        texte:
          "Un devis envoyé vit rarement une relance organisée : le chantier en cours prend le dessus, la relance se fait quand on y pense, souvent tard, parfois jamais. Le client, lui, a reçu d'autres devis entre-temps, et c'est fréquemment le premier qui rappelle qui signe.",
        mesure:
          "Le nombre de devis restés sans réponse sur les trois derniers mois, leur montant cumulé, et le délai moyen entre l'envoi et la première relance.",
      },
      {
        titre: "Les factures attendent la fin du chantier",
        texte:
          "La relance d'impayé se déclenche à la reprise administrative (le soir, le week-end), pas à la date d'échéance. Chaque semaine de décalage s'ajoute au retard de paiement, et une relance écrite sous pression sort plus sèche qu'il ne faudrait avec un client qu'on veut garder.",
        mesure:
          "L'encours échu au jour de l'audit, le retard de paiement moyen constaté sur six mois, et la trésorerie que ça immobilise.",
      },
      {
        titre: "Les demandes arrivent partout, les réponses le soir",
        texte:
          "Appels pendant le chantier, WhatsApp personnel, boîte mail : chaque canal a ses demandes, aucun ne trace ce qui est resté sans réponse. Une demande de devis qui attend quarante-huit heures est une demande qui a eu le temps d'aller voir ailleurs.",
        mesure:
          "Sur deux semaines : le nombre de demandes entrantes par canal, et combien attendent plus de vingt-quatre heures avant une première réponse.",
      },
      {
        titre: "La saisie fournisseurs se paie en week-ends",
        texte:
          "Les factures fournisseurs s'accumulent en pochette ou en pièces jointes, puis se saisissent d'un bloc : un travail d'écran pris sur le temps personnel, où l'erreur de saisie coûte cher et où la pièce égarée se découvre au bilan.",
        mesure:
          "Les heures par mois passées à saisir et classer, et le nombre de pièces manquantes à la dernière clôture.",
      },
    ],
    remedes: [
      {
        titre: "Relancer les devis en attente, dix minutes",
        texte:
          "Listez vos devis sans réponse depuis plus de huit jours. Collez le prompt ci-dessous dans ChatGPT ou Claude, remplacez les crochets, envoyez le résultat par WhatsApp ou par mail. Le message relance sans mettre la pression.",
        prompt:
          "Tu écris pour une entreprise du bâtiment. Rédige un court message de suivi (quatre phrases maximum, vouvoiement, ton cordial et direct, sans jargon commercial) pour un devis resté sans réponse : client [NOM], devis [OBJET] envoyé le [DATE], montant [MONTANT] €. Termine par une question simple qui appelle une réponse, par exemple : souhaitez-vous qu'on cale la date d'intervention ? Pas d'objet de mail, pas de formule pompeuse, pas de « j'espère que vous allez bien ».",
        moteur: "PAYD",
      },
      {
        titre: "Le compte rendu de chantier, dicté",
        texte:
          "Après une visite, dictez ce que vous avez vu dans votre téléphone, clavier vocal ou mémo transcrit, puis collez le texte brut avec ce prompt. Vous obtenez un compte rendu propre, à envoyer au client ou à garder au dossier.",
        prompt:
          "Voici mes notes dictées après une visite de chantier, en vrac : [COLLER LES NOTES]. Transforme-les en compte rendu structuré : chantier, date, constat, décisions prises, prochaines étapes avec qui fait quoi, points de vigilance. Garde mes mots, n'ajoute rien que je n'ai pas dit, et signale entre crochets ce qui manque.",
      },
      {
        titre: "Le point trésorerie du lundi",
        texte:
          "Copiez trois colonnes de votre tableur (client, montant, échéance), et collez-les avec ce prompt. Vous obtenez l'ordre de relance de la semaine. C'est exactement ce qu'un moteur fera ensuite chaque matin, tout seul.",
        prompt:
          "Voici mes factures en attente (client, montant, date d'échéance) : [COLLER LES LIGNES]. Classe-les en trois groupes : en retard (de la plus ancienne à la plus récente), à échéance cette semaine, à venir. Pour chaque facture en retard, indique le nombre de jours de retard et propose une phrase de relance adaptée à l'ancienneté : cordiale sous quinze jours, ferme au-delà de trente.",
        moteur: "PAYD",
      },
    ],
    moteurs: [
      {
        system: "CASHD",
        slug: "relances-impayes",
        raison:
          "Relance vos devis puis vos factures aux intervalles que vous choisissez, avec des messages que vous validez. La relance part à la date d'échéance : pas quand la journée le permet enfin.",
        douleurs: "douleurs 1 et 2",
      },
      {
        system: "FRONTD",
        slug: "demandes-clients",
        raison:
          "Reçoit les demandes (mail, WhatsApp), dans une seule file, répond aux questions simples sans jamais donner de prix ni de délai, et vous transmet le reste. Plus rien n'attend quarante-huit heures.",
        douleurs: "douleur 3",
      },
      {
        system: "FILED",
        slug: "factures-fournisseurs",
        raison:
          "Lit les factures fournisseurs reçues par mail, en extrait les montants et les range au journal d'achats : prêtes pour le cabinet, sans écran le dimanche.",
        douleurs: "douleur 4",
      },
    ],
  },
];

export function auditParSlug(slug: string): Audit | undefined {
  return AUDITS.find((a) => a.slug === slug);
}
