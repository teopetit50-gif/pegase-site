/* ══════════════════════════════════════════════════════════════════════
   RELOAD — catalogue de capacités, cas limites, échelle groupe (14/09/2026)

   Remplace les quatre tuiles de `CHIFFRES` sur la page (« 7 h 30 »,
   « 60 / 100 », « 1 seul », « Arrêt ») : quatre faits de conception, justes
   mais qui décrivent la machine au lieu de son étendue. Le graphique du
   même bloc, lui, RESTE sur la page — il montre ce que devient un fichier
   client que personne ne rappelle, et c'est le seul endroit où le coût de
   l'inaction se voit.

   La colonne `atteste` : voir l'en-tête de `types.ts`. Tout ce qui est à
   `false` est écrit et pas construit, à trancher avant tout partage.
   ══════════════════════════════════════════════════════════════════════ */

import type { BlocCasLimites, BlocEchelle, Catalogue } from "./types";

export const CATALOGUE: Catalogue = {
  etiquette: "Le périmètre",
  titre: "Tout ce que RELOAD prend en charge.",
  chapo:
    "Deux gisements, un seul système : les comptes qui n'achètent plus, et les marchés publics de votre zone. Voici ce qu'il lit, ce qu'il écarte et ce qu'il vous laisse décider.",
  mention:
    "Les annonces de marchés publics proviennent des publications réglementaires françaises et européennes, qui sont ouvertes et gratuites. Le système ne dépose aucun dossier à votre place.",
  familles: [
    {
      nom: "Lecture du fichier client",
      icone: "search",
      lignes: [
        { t: "Le système croise votre historique de ventes et votre fichier de contacts.", atteste: true },
        { t: "Chaque compte est classé par la date de son dernier contact, au-delà d'un seuil que vous fixez.", atteste: true },
        { t: "La fréquence d'achat habituelle d'un compte est mesurée, puis son décrochage détecté.", atteste: false },
        { t: "Les comptes sont priorisés par valeur attendue, pas par ordre alphabétique.", atteste: false },
        { t: "Les doublons de fiches sont rapprochés quand deux lignes désignent le même client.", atteste: false },
        { t: "Les entités d'un même groupe client sont regroupées sous une raison sociale mère.", atteste: false },
        { t: "Un tableur sans colonne de date est exploité à partir des dates de facture.", atteste: false },
        { t: "Les contrats et les équipements installés sont suivis jusqu'à leur échéance.", atteste: false },
      ],
    },
    {
      nom: "Campagnes et cadence",
      icone: "megaphone",
      lignes: [
        { t: "Chaque message reprend la dernière prestation du compte et le temps écoulé depuis.", atteste: true },
        { t: "Les règles de ton, les interdits et les tournures sont écrits avant la première vague.", atteste: true },
        { t: "Les règles de ton et de contenu s'écrivent en français, sans case à cocher.", atteste: true },
        { t: "Un compte reçoit deux messages en tout, espacés d'au moins trois jours.", atteste: true },
        { t: "Une réponse, même négative, arrête la séquence et vous rend la conversation.", atteste: true },
        { t: "Les comptes déjà contactés par un commercial sont écartés de la vague en cours.", atteste: false },
        { t: "Les messages partent par courriel, depuis la boîte de votre entreprise.", atteste: true },
        { t: "Les vagues s'enchaînent au rythme convenu, et chaque exécution laisse son bilan.", atteste: true },
      ],
    },
    {
      nom: "Veille des marchés publics",
      icone: "landmark",
      lignes: [
        { t: "Le bulletin officiel des marchés publics est relevé chaque matin à 7 h 30.", atteste: true },
        { t: "Le journal de l'Union européenne est relevé au même rythme pour les seuils élevés.", atteste: false },
        { t: "Les filtres portent sur vos départements, vos montants et vos qualifications.", atteste: true },
        { t: "La recherche s'élargit aux intitulés voisins, parce que l'acheteur n'emploie pas vos mots.", atteste: false },
        { t: "Chaque annonce est notée sur le métier, la capacité et le délai de réponse.", atteste: true },
        { t: "En dessous du seuil de note que vous fixez, l'annonce ne vous parvient pas.", atteste: true },
        { t: "Les marchés en cours qui arrivent à renouvellement sont repérés avant leur publication.", atteste: false },
        { t: "Une annonce déjà vue n'est jamais présentée une seconde fois.", atteste: true },
      ],
    },
    {
      nom: "Analyse d'une consultation",
      icone: "scan",
      lignes: [
        { t: "Le dossier de consultation est téléchargé et lu dès la publication.", atteste: false },
        { t: "Les pièces à produire sont listées, et les manquantes signalées.", atteste: false },
        { t: "Les critères de jugement et leur pondération sont extraits du règlement.", atteste: false },
        { t: "L'allotissement est détaillé, lot par lot, avec les montants estimés.", atteste: false },
        { t: "Les dates limites entrent dans votre agenda, avec une alerte avant échéance.", atteste: false },
        { t: "L'historique public des attributions donne les titulaires sortants et leurs prix.", atteste: false },
        { t: "Une co-traitance est suggérée quand un lot dépasse vos capacités seules.", atteste: false },
        { t: "Les consultations hors de vos qualifications sont écartées avant de vous parvenir.", atteste: true },
      ],
    },
    {
      nom: "Garde-fous commerciaux",
      icone: "shield",
      lignes: [
        { t: "Un compte suivi en direct par un commercial est exclu du cycle automatique.", atteste: false },
        { t: "Le commercial en charge reprend la main sur un compte d'un seul geste.", atteste: false },
        { t: "Aucun prix ni aucun délai n'est avancé dans un message sans que vous l'ayez écrit.", atteste: true },
        { t: "Une demande d'arrêt vaut retrait immédiat et définitif du cycle.", atteste: true },
        { t: "Les listes d'exclusion se tiennent par compte, par secteur et par commercial.", atteste: false },
        { t: "Le système s'arrête de lui-même au premier doute, et vous le signale.", atteste: true },
        { t: "Chaque message parti reste au journal, daté et consultable.", atteste: true },
      ],
    },
    {
      nom: "Pilotage",
      icone: "chart",
      lignes: [
        { t: "Le chiffre d'affaires remis en jeu se lit vague par vague.", atteste: false },
        { t: "Les comptes réactivés sont suivis jusqu'à leur première commande.", atteste: false },
        { t: "Le taux de réponse se compare par segment, par canal et par message.", atteste: false },
        { t: "Les consultations retenues, déposées et gagnées alimentent un tableau de suivi.", atteste: false },
        { t: "Les résultats se lisent par entité, par site et en consolidé.", atteste: false },
        { t: "Chaque tableau s'exporte vers un tableur, à la demande ou à date fixe.", atteste: false },
      ],
    },
  ],
};

export const CAS_LIMITES: BlocCasLimites = {
  etiquette: "Les cas tordus",
  titre: "Ce qui arrive vraiment quand on réveille un fichier client.",
  chapo:
    "Douze situations que vos commerciaux connaissent, et ce que le système en fait. Aucune ne se règle en envoyant le message quand même.",
  cas: [
    {
      q: "Le compte a déjà été appelé la semaine dernière par un commercial.",
      r: "Le dernier contact connu est lu avant toute sollicitation. Si un échange récent figure dans vos outils, le compte sort de la vague en cours.",
    },
    {
      q: "L'entreprise cliente a cessé son activité.",
      r: "Le message revient en échec et le compte passe en vérification. Il ne repart dans aucune vague tant que son état n'est pas tranché.",
    },
    {
      q: "L'interlocuteur a quitté l'entreprise depuis la dernière commande.",
      r: "La réponse d'absence est reconnue et le compte est signalé comme à réattribuer. Le système ne devine pas le successeur.",
    },
    {
      q: "Le même groupe apparaît sous trois raisons sociales.",
      r: "Les trois fiches sont rapprochées sous une entité mère. Le plafond de sollicitation s'applique au groupe, pas à chaque ligne.",
    },
    {
      q: "L'annonce publiée n'emploie pas le vocabulaire de votre métier.",
      r: "La recherche couvre les intitulés voisins et les codes d'activité proches. L'annonce remonte avec le motif de son rapprochement.",
    },
    {
      q: "La consultation sort de vos qualifications.",
      r: "Elle est écartée avant de vous parvenir, sur la base des qualifications que vous avez déclarées. Vous pouvez consulter ce qui a été écarté.",
    },
    {
      q: "Le délai de réponse est intenable pour vos équipes.",
      r: "Le délai entre dans la note de l'annonce. En dessous de votre seuil, elle n'apparaît pas, et vous savez pourquoi.",
    },
    {
      q: "Le marché est réservé à une catégorie d'entreprises dont vous ne relevez pas.",
      r: "La réservation est lue dans l'avis et l'annonce est écartée. Elle reste consultable si vous voulez vérifier.",
    },
    {
      q: "Votre fichier client est un tableur sans colonne de date.",
      r: "Les dates sont reconstituées à partir de l'historique de facturation. Si rien ne permet de dater un compte, il est présenté à part.",
    },
    {
      q: "Deux fiches désignent manifestement le même client.",
      r: "Le rapprochement est proposé avec les éléments qui le fondent. La fusion n'a lieu qu'après votre accord.",
    },
    {
      q: "Le client a demandé à ne plus être sollicité.",
      r: "Le retrait est immédiat et vaut sur tous les canaux. Seule une personne de votre équipe peut le remettre dans le circuit.",
    },
    {
      q: "Un commercial veut reprendre la main sur un compte en cours de vague.",
      r: "Le compte sort du cycle sur-le-champ, y compris si un message était préparé. L'historique de la vague reste attaché à la fiche.",
    },
  ],
};

export const ECHELLE: BlocEchelle = {
  etiquette: "À l'échelle d'un groupe",
  titre: "Plusieurs entités, plusieurs commerciaux, une seule règle du jeu.",
  chapo:
    "Ce qui change quand la réactivation ne dépend plus d'une personne mais d'une direction commerciale, sur plusieurs sociétés et plusieurs territoires.",
  cartes: [
    {
      icone: "users",
      titre: "Une entité, un périmètre",
      texte:
        "Chaque société, agence ou territoire a son fichier, ses comptes et ses commerciaux. Une direction commerciale lit le consolidé, un responsable d'agence ne voit que le sien.",
    },
    {
      icone: "handshake",
      titre: "Des comptes attribués",
      texte:
        "Chaque compte porte son commercial. Les comptes stratégiques restent suivis en direct et sortent du cycle automatique, sans exception à demander.",
    },
    {
      icone: "scale",
      titre: "Des règles de sollicitation",
      texte:
        "Le plafond par compte, la durée de quarantaine et les secteurs exclus sont des réglages, pas des habitudes. Chaque changement reste daté et attribué.",
    },
    {
      icone: "lock",
      titre: "Un journal opposable",
      texte:
        "Chaque message parti, chaque annonce écartée et chaque retrait s'inscrivent dans un journal qui ne se modifie pas. Vous savez ce qui a été dit, à qui, et quand.",
    },
    {
      icone: "landmark",
      titre: "Un raccordement au système existant",
      texte:
        "Le système lit votre outil de gestion commerciale ou votre tableur, et y réécrit l'état de chaque compte. Là où un connecteur manque, l'échange passe par dépôt de fichiers.",
    },
    {
      icone: "chart",
      titre: "Des indicateurs par entité",
      texte:
        "Comptes réactivés, chiffre remis en jeu, consultations retenues et déposées se lisent par entité et en consolidé, avec un export daté.",
    },
  ],
};
