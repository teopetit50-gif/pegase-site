/* ══════════════════════════════════════════════════════════════════════
   FRONTD — catalogue de capacités, cas limites, échelle groupe (14/09/2026)

   Remplace les trois cartes de `CAPACITES` sur la page (réception,
   qualification, avis). Elles disent l'essentiel de la promesse, mais
   trois cartes ne montrent pas une étendue : une direction des opérations
   y voit un répondeur écrit, pas un système d'accueil.

   La colonne `atteste` : voir l'en-tête de `types.ts`. Tout ce qui est à
   `false` est écrit et pas construit, à trancher avant tout partage.
   ══════════════════════════════════════════════════════════════════════ */

import type { BlocCasLimites, BlocEchelle, Catalogue } from "./types";

export const CATALOGUE: Catalogue = {
  etiquette: "Le périmètre",
  titre: "Tout ce que FRONTD prend en charge.",
  chapo:
    "Une demande entrante traverse cinq étapes avant d'être traitée : elle arrive, elle est comprise, elle reçoit une réponse, elle se transforme en rendez-vous ou elle remonte. Voici ce que le système tient à chacune.",
  mention:
    "Le système ne répond jamais hors de la base de connaissances que vous avez validée. Tout ce qui sort de ce périmètre est transféré à vos équipes, avec la fiche de son escalade.",
  familles: [
    {
      nom: "Canaux et réception",
      icone: "inbox",
      lignes: [
        { t: "Les messages arrivent par votre messagerie et par le formulaire de votre site.", atteste: true },
        { t: "Le formulaire de votre site entre dans le même circuit que les autres canaux.", atteste: true },
        { t: "La messagerie instantanée du site est tenue aux mêmes règles que le reste.", atteste: false },
        { t: "Les messages reçus sur les réseaux sociaux rejoignent la même file.", atteste: false },
        { t: "Un appel non décroché est transcrit, puis traité comme une demande écrite.", atteste: false },
        { t: "Un accusé de réception part dans la minute, sous votre signature.", atteste: true },
        { t: "Les pièces jointes sont conservées et rattachées à la demande.", atteste: false },
        { t: "Vos horaires d'ouverture sont cités dans les réponses, tels que vous les avez écrits.", atteste: true },
      ],
    },
    {
      nom: "Compréhension et qualification",
      icone: "brain",
      lignes: [
        { t: "Le client est reconnu à partir de son numéro ou de son adresse avant toute réponse.", atteste: false },
        { t: "Son contrat, son historique et ses interventions passées sont lus en même temps.", atteste: false },
        { t: "Chaque demande est classée par type avant d'entrer dans un circuit.", atteste: true },
        { t: "Chaque demande est aiguillée selon sa catégorie, d'après les règles posées à l'installation.", atteste: true },
        { t: "Une demande qui relève de deux services est orientée vers le premier concerné.", atteste: false },
        { t: "L'urgence est détectée sur le fond du message, pas sur la présence d'un mot.", atteste: true },
        { t: "Une même demande reçue sur deux canaux est reconnue comme un seul dossier.", atteste: false },
        { t: "La langue du client est identifiée dès le premier message.", atteste: false },
      ],
    },
    {
      nom: "Réponse et connaissances",
      icone: "message",
      lignes: [
        { t: "La réponse est tirée de la base de connaissances construite avec vos équipes.", atteste: true },
        { t: "Hors de cette base, le système ne formule aucune hypothèse et transfère.", atteste: true },
        { t: "La base est versionnée : chaque règle porte sa date et son auteur.", atteste: false },
        { t: "Une modification de tarif ou d'horaire s'applique à la réponse suivante.", atteste: false },
        { t: "Le ton, la signature et les formules se règlent entité par entité.", atteste: false },
        { t: "Les réponses se font en plusieurs langues, avec le même périmètre de contenu.", atteste: false },
        { t: "La mention d'une réponse automatisée figure dans les termes que vous choisissez.", atteste: false },
        { t: "Chaque échange reste archivé, transféré ou non, et reste consultable.", atteste: true },
      ],
    },
    {
      nom: "Rendez-vous et agenda",
      icone: "calendar",
      lignes: [
        { t: "Les demandes de rendez-vous sont qualifiées, puis transmises au service concerné.", atteste: true },
        { t: "Chaque demande est enregistrée avec son canal, son type et l'heure de son arrivée.", atteste: true },
        { t: "Un rappel part avant la date, sur le canal par lequel le client a écrit.", atteste: false },
        { t: "Le client replanifie ou annule par le même canal, sans appeler personne.", atteste: false },
        { t: "La durée proposée dépend du type d'intervention demandé.", atteste: false },
        { t: "Les ressources et les personnes indisponibles sont exclues des créneaux proposés.", atteste: false },
        { t: "Un rendez-vous demandé hors périmètre est transmis à la personne qui peut le poser.", atteste: true },
      ],
    },
    {
      nom: "Escalade et astreinte",
      icone: "bell",
      lignes: [
        { t: "Chaque type de demande porte un délai de traitement que vous fixez.", atteste: false },
        { t: "Le délai dépassé fait remonter la demande au responsable du service.", atteste: false },
        { t: "Une urgence déclenche l'appel de l'astreinte, selon le tour de garde en cours.", atteste: false },
        { t: "Une réclamation est identifiée comme telle et sort du traitement courant.", atteste: false },
        { t: "Un client en litige ouvert ne reçoit aucune réponse automatisée.", atteste: false },
        { t: "La demande de parler à une personne est honorée sans discussion.", atteste: false },
        { t: "Une demande hors périmètre est transférée avec la fiche de son escalade.", atteste: true },
      ],
    },
    {
      nom: "Pilotage",
      icone: "chart",
      lignes: [
        { t: "Le volume de demandes se lit par canal, par service et par heure de la journée.", atteste: false },
        { t: "Le délai de première réponse est mesuré, demande par demande.", atteste: false },
        { t: "La part des demandes traitées sans intervention humaine est suivie dans le temps.", atteste: false },
        { t: "Les sujets qui reviennent sont remontés, et ils nourrissent la base de connaissances.", atteste: false },
        { t: "Les avis obtenus après intervention sont comptés par service et par site.", atteste: false },
        { t: "Chaque tableau s'exporte vers un tableur, à la demande ou à date fixe.", atteste: false },
      ],
    },
  ],
};

export const CAS_LIMITES: BlocCasLimites = {
  etiquette: "Les cas tordus",
  titre: "Ce qui arrive vraiment sur une ligne d'accueil.",
  chapo:
    "Douze situations que vos équipes reconnaîtront, et ce que le système en fait. Aucune ne se règle en répondant quand même.",
  cas: [
    {
      q: "Le client écrit en créole, ou dans une langue étrangère.",
      r: "La langue est identifiée et la réponse part dans la même langue, avec le contenu de votre base. Si la langue n'est pas couverte, l'échange est transféré.",
    },
    {
      q: "La même demande arrive par messagerie et par WhatsApp.",
      r: "Les deux messages sont reconnus comme un seul dossier. Le client reçoit une réponse, pas deux, sur le canal qu'il a utilisé en dernier.",
    },
    {
      q: "Deux clients demandent le même créneau à la même minute.",
      r: "Les deux demandes sont enregistrées avec leur heure d'arrivée, puis transmises au service qui tient le planning. C'est lui qui tranche, et le second client reçoit une proposition de remplacement.",
    },
    {
      q: "Le client a un litige ouvert avec vous.",
      r: "Aucune réponse automatisée ne part. L'échange est transféré au responsable qui suit le dossier, avec tout l'historique.",
    },
    {
      q: "La question porte sur un prix qui n'est pas dans la base.",
      r: "Le système ne l'invente pas. Il dit que le point sera vérifié, puis transfère la demande à la personne qui peut répondre.",
    },
    {
      q: "Le message est une réclamation, pas une demande.",
      r: "Elle est identifiée comme telle et sort du traitement courant. Le client reçoit un accusé, et le responsable du service est prévenu.",
    },
    {
      q: "Le client menace d'aller voir ailleurs.",
      r: "Le ton du message est pris en compte et la demande remonte immédiatement. Ce cas ne se traite pas par une réponse type.",
    },
    {
      q: "Le message ne contient qu'une photo, sans un mot.",
      r: "La pièce est conservée et rattachée au dossier. Le système demande la précision qui manque plutôt que de supposer la demande.",
    },
    {
      q: "Le client répond trois semaines plus tard sur le même fil.",
      r: "Le fil est repris là où il s'était arrêté, avec son historique. Le client n'a rien à réexpliquer.",
    },
    {
      q: "La demande relève d'un autre service que celui qui l'a reçue.",
      r: "Elle est routée vers le service compétent selon les règles définies avec vous, et le client en est informé.",
    },
    {
      q: "Le numéro qui écrit n'est rattaché à aucun client connu.",
      r: "La demande est traitée comme celle d'un prospect, sur le périmètre public de votre base. Aucune donnée de compte n'est communiquée.",
    },
    {
      q: "Le client demande à parler à une personne.",
      r: "La demande est honorée sans insister. L'échange est transféré et le client sait à qui il parle désormais.",
    },
  ],
};

export const ECHELLE: BlocEchelle = {
  etiquette: "À l'échelle d'un groupe",
  titre: "Plusieurs services, plusieurs sites, une seule porte d'entrée.",
  chapo:
    "Ce qui change quand les demandes n'arrivent plus sur un téléphone mais sur une organisation, avec des horaires, des astreintes et des engagements de délai.",
  cartes: [
    {
      icone: "users",
      titre: "Une entité, un périmètre",
      texte:
        "Chaque société, site ou service a sa base de connaissances, ses horaires et sa signature. Une direction lit le consolidé, un responsable de site ne voit que le sien.",
    },
    {
      icone: "route",
      titre: "Des rôles et un routage",
      texte:
        "Le type de demande décide du service qui la reçoit. Les règles de routage se définissent avec vous, et une demande ne reste jamais sans destinataire.",
    },
    {
      icone: "scale",
      titre: "Des délais tenus, pas espérés",
      texte:
        "Chaque type de demande porte son délai de traitement. Le dépassement fait remonter le dossier, et le manquement se mesure au lieu de se découvrir.",
    },
    {
      icone: "lock",
      titre: "Un journal opposable",
      texte:
        "Chaque message reçu, chaque réponse envoyée et chaque transfert s'inscrivent dans un journal qui ne se modifie pas. Le jour où un client conteste, la preuve est là.",
    },
    {
      icone: "landmark",
      titre: "Un raccordement au système existant",
      texte:
        "Le système se place derrière vos canaux actuels et écrit dans vos agendas. Vos clients continuent d'écrire au même numéro et à la même adresse qu'hier.",
    },
    {
      icone: "chart",
      titre: "Des indicateurs par entité",
      texte:
        "Volume par canal, délai de première réponse, demandes transférées et sujets récurrents se lisent par site et en consolidé, avec un export daté.",
    },
  ],
};
