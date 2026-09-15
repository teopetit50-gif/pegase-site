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

   ── Recentrage du 15/09/2026 ────────────────────────────────────────────
   Les familles « Veille des marchés publics » et « Analyse d'une
   consultation » ont été retirées avec la moitié PUBLIQ du produit, et
   remplacées par les deux relances qui manquaient : « Échéances et
   renouvellements » et « Affaires restées en plan ».

   ⚠ TOUTES les lignes des deux familles neuves sont à `atteste: false`, et
   ce n'est pas de la prudence : elles relèvent du moteur CYCLE
   (`plans-et-decisions/galeres-metier-par-secteur.md` §28), qui n'est PAS
   construit. Seul REVIVE l'est, et c'est lui qui porte « Lecture du fichier
   client » et « Campagnes et cadence ». Ne pas passer une de ces lignes à
   `true` sans avoir vu le moteur tourner.
   ══════════════════════════════════════════════════════════════════════ */

import type { BlocCasLimites, BlocEchelle, Catalogue } from "./types";

export const CATALOGUE: Catalogue = {
  etiquette: "Le périmètre",
  titre: "Tout ce que RELOAD prend en charge.",
  chapo:
    "Trois relances, un seul système : le compte qui n'a plus commandé, l'échéance qui redevient due et l'affaire restée en plan. Voici ce qu'il lit, ce qu'il écarte et ce qu'il vous laisse décider.",
  mention:
    "Le système lit votre CRM, votre historique de facturation et vos fiches d'intervention, et rien d'autre. Il n'écrit dans aucun de ces outils, ne crée aucun rendez-vous et n'engage aucun prix à votre place.",
  familles: [
    {
      nom: "Lecture de la base clients",
      icone: "search",
      lignes: [
        { t: "Le système croise votre historique de facturation et le référentiel clients de votre CRM.", atteste: true },
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
        { t: "Un compte sans réponse reçoit un second message, puis il sort du cycle.", atteste: true },
        { t: "Les règles de ton et de contenu s'écrivent en français, sans case à cocher.", atteste: true },
        { t: "Un compte reçoit deux messages en tout, espacés d'au moins trois jours.", atteste: true },
        { t: "Une réponse, même négative, arrête la séquence et vous rend la conversation.", atteste: true },
        { t: "Les comptes déjà contactés par un commercial sont écartés de la vague en cours.", atteste: false },
        { t: "Les messages partent par courriel, depuis la boîte de votre entreprise.", atteste: true },
        { t: "Les vagues s'enchaînent au rythme convenu, et chaque exécution laisse son bilan.", atteste: true },
      ],
    },
    {
      /* Moteur CYCLE (§28) — écrit, pas construit. Aucune ligne à `true`. */
      nom: "Échéances et renouvellements",
      icone: "calendar",
      lignes: [
        { t: "Les entretiens, révisions et contrôles périodiques sont suivis jusqu'à leur échéance.", atteste: false },
        { t: "Chaque échéance est datée à partir de la dernière intervention enregistrée.", atteste: false },
        { t: "Le client est prévenu la semaine qui précède, pas le jour où l'échéance tombe.", atteste: false },
        { t: "Une échéance déjà honorée ailleurs sort du cycle dès que la date est connue.", atteste: false },
        { t: "Les contrats d'entretien qui s'éteignent faute de reconduction sont signalés.", atteste: false },
        { t: "Les équipements installés sont rattachés au compte qui les exploite.", atteste: false },
        { t: "Un parc réparti sur plusieurs sites se lit site par site et en consolidé.", atteste: false },
        { t: "Les échéances réglementaires sont distinguées des échéances commerciales.", atteste: false },
      ],
    },
    {
      /* Moteur CYCLE (§28) — écrit, pas construit. Aucune ligne à `true`. */
      nom: "Affaires restées en plan",
      icone: "bell",
      lignes: [
        { t: "Les commandes arrivées qu'aucun client n'est venu reprendre sont listées.", atteste: false },
        { t: "Les interventions terminées et non retirées sont relancées après le délai que vous fixez.", atteste: false },
        { t: "Le stock immobilisé par une commande non reprise est chiffré.", atteste: false },
        { t: "Une pièce commandée pour un compte inactif est rattachée à sa fiche.", atteste: false },
        { t: "Les affaires closes sans suite sont distinguées de celles qui attendent encore.", atteste: false },
        { t: "Un compte relancé deux fois sans réponse passe en décision manuelle.", atteste: false },
        { t: "La relance de retrait ne porte aucune mention de paiement, qui relève de CASHD.", atteste: false },
        { t: "Le magasin voit en une liste ce qui dort et depuis combien de temps.", atteste: false },
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
        { t: "Les échéances honorées et les commandes reprises alimentent un tableau de suivi.", atteste: false },
        { t: "Les résultats se lisent par entité, par site et en consolidé.", atteste: false },
        { t: "Chaque tableau s'exporte vers un tableur, à la demande ou à date fixe.", atteste: false },
      ],
    },
  ],
};

export const CAS_LIMITES: BlocCasLimites = {
  etiquette: "Les cas tordus",
  titre: "Ce qui arrive vraiment quand on réactive une base clients.",
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
      q: "Le client a fait son entretien ailleurs le mois dernier.",
      r: "L'échéance est close dès que la date figure dans vos fiches. Tant qu'aucune trace n'existe, le compte reste en attente et n'est pas relancé une seconde fois.",
    },
    {
      q: "La pièce commandée est arrivée, mais le client ne répond plus.",
      r: "Le compte reçoit une relance de retrait, puis une seule autre après le délai que vous fixez. Ensuite il passe en décision manuelle, avec le montant immobilisé en regard.",
    },
    {
      q: "Le compte a une facture en retard chez vous.",
      r: "Il sort de la vague de relance commerciale, parce qu'une relance d'impayé et une relance commerciale ne se croisent jamais. Le recouvrement relève de CASHD, pas d'ici.",
    },
    {
      q: "Deux entités du même groupe ont chacune leur échéance.",
      r: "Chaque entité garde ses échéances, parce qu'elles portent sur des équipements distincts. Le plafond de sollicitation, lui, s'applique au groupe.",
    },
    {
      q: "L'export de votre CRM ne porte aucune colonne de date.",
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
        "Chaque société, agence ou territoire a son périmètre, ses comptes et ses commerciaux. Une direction commerciale lit le consolidé, un responsable d'agence ne voit que le sien.",
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
        "Chaque message parti, chaque compte écarté et chaque retrait s'inscrivent dans un journal qui ne se modifie pas. Vous savez ce qui a été dit, à qui, et quand.",
    },
    {
      icone: "landmark",
      titre: "Un raccordement au système existant",
      texte:
        "Le système lit votre CRM ou votre ERP, et y réécrit l'état de chaque compte. Là où un connecteur manque, l'échange passe par export et dépôt de fichiers.",
    },
    {
      icone: "chart",
      titre: "Des indicateurs par entité",
      texte:
        "Comptes réactivés, chiffre remis en jeu, échéances honorées et commandes reprises se lisent par entité et en consolidé, avec un export daté.",
    },
  ],
};
