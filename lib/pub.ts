import type { Accroche } from "@/components/pub/PagePub";

/* Les accroches testées en pub (strategie-acquisition-2026-09-21.md §3),
   une page chacune sous /p/<slug>. Ajouter une entrée = une page.

   « appels-manques » décrit VOCAL v0, construit et jamais publié : la
   campagne ne se lance qu'une fois le numéro et le renvoi testés sur le
   terrain (verrous dans quel-saas-lancer-reflexion-21-09). La page existe
   pour que le test de l'accroche ne dépende pas du produit. */
export const ACCROCHES: Accroche[] = [
  {
    slug: "appels-manques",
    kicker: "Appels manqués",
    titre: "Chaque appel manqué vous revient par SMS, avec le numéro.",
    chapo:
      "Quand la ligne est prise ou le téléphone posé, l'appelant reçoit un message et vous recevez une fiche. Rien à installer sur votre téléphone, aucun changement de numéro.",
    bouton: "Voir ça en 30 minutes",
    cePasse: [
      {
        titre: "L'appelant reçoit un SMS",
        texte: "« Nous avons vu votre appel, nous vous rappelons. » À votre nom, dans la minute.",
      },
      {
        titre: "Vous recevez la fiche",
        texte: "Le numéro, l'heure, et le message s'il en laisse un. Par SMS ou par e-mail, au choix.",
      },
      {
        titre: "Le soir, le compte",
        texte: "Combien d'appels ont sonné dans le vide dans la journée, et lesquels ont été rappelés.",
      },
    ],
    etapes: [
      {
        titre: "Un renvoi sur votre ligne",
        texte: "Un code à composer une fois sur votre téléphone. Cinq secondes, réversible.",
      },
      {
        titre: "Le message à votre nom",
        texte: "Nous réglons le texte du SMS et l'adresse où arrivent les fiches.",
      },
      {
        titre: "Le premier appel le jour même",
        texte: "La première fiche arrive dès le premier appel manqué. Rien d'autre à faire.",
      },
    ],
    note: "Le renvoi se désactive à tout moment depuis votre téléphone. Le message envoyé est un message de service, jamais une relance commerciale.",
  },
  {
    slug: "boite-mail",
    kicker: "Documents reçus",
    titre: "Votre boîte mail se classe toute seule.",
    chapo:
      "Factures, contrats, devis, courriers : chaque pièce reçue est lue, rangée au bon endroit et transmise à la personne qui doit l'avoir. Vous n'ouvrez plus les pièces jointes une par une.",
    bouton: "Voir ça en 30 minutes",
    cePasse: [
      {
        titre: "Lue",
        texte: "Le fournisseur, le montant, la date d'échéance sont relevés sur chaque pièce.",
      },
      {
        titre: "Rangée",
        texte: "Un dossier par fournisseur et par mois. Une pièce se retrouve en une recherche.",
      },
      {
        titre: "Transmise",
        texte: "Au comptable ou à la personne qui valide, sans copier-coller ni transfert à la main.",
      },
    ],
    etapes: [
      {
        titre: "L'accès à la boîte",
        texte: "En lecture seulement, sur l'adresse qui reçoit les documents. Rien n'est envoyé depuis.",
      },
      {
        titre: "Le classement démarre",
        texte: "Sur les mails du jour, puis sur l'historique si vous le souhaitez.",
      },
      {
        titre: "Le récapitulatif",
        texte: "Chaque semaine, ce qui est arrivé, ce qui arrive à échéance, ce qui manque.",
      },
    ],
    note: "Rien n'est écrit à vos fournisseurs ni à vos clients. Ça lit, ça range, ça transmet en interne.",
    produit: { href: "/offres/factures-fournisseurs", libelle: "Le détail du poste" },
  },
  {
    slug: "demandes",
    kicker: "Demandes entrantes",
    titre: "Chaque demande reçoit une réponse le jour même.",
    chapo:
      "Formulaire du site, e-mail, message : chaque demande entrante est lue, qualifiée et reçoit un premier retour. Vous voyez d'un coup d'œil celles qui attendent votre décision.",
    bouton: "Voir ça en 30 minutes",
    cePasse: [
      {
        titre: "Reçue",
        texte: "Quel que soit le canal, elle arrive dans une seule file, avec l'heure et la personne.",
      },
      {
        titre: "Qualifiée",
        texte: "Ce que la personne veut, pour quand, et le budget quand elle le dit. Trié par urgence.",
      },
      {
        titre: "Répondue",
        texte: "Un premier retour part à votre nom. La suite reste entre vos mains.",
      },
    ],
    etapes: [
      {
        titre: "Les canaux branchés",
        texte: "Le formulaire du site et l'adresse e-mail. Les autres canaux au cas par cas.",
      },
      {
        titre: "Le premier retour relu",
        texte: "Vous validez le texte du message de service avant qu'il ne parte à quiconque.",
      },
      {
        titre: "La file, chaque matin",
        texte: "Ce qui est arrivé, ce qui a reçu son retour, ce qui attend une décision de vous.",
      },
    ],
    note: "Le premier retour est un message de service, relu par vous avant la mise en place. Aucun engagement n'est pris à votre place.",
    produit: { href: "/offres/demandes-clients", libelle: "Le détail du poste" },
  },
];
