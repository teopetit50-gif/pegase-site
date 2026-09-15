/* Tout le texte de la page produit RELOAD vit ici (/offres/nouvelles-affaires).
 *
 * ── Recentrage du 15/09/2026 ─────────────────────────────────────────────
 * Décision de Teo : « on s'en balec de la partie marchés publics, refais tous
 * les textes, focus uniquement sur les relances ». La moitié PUBLIQ (veille
 * du bulletin officiel des marchés publics) DISPARAÎT de la page, texte et
 * structure. Ce qui reste est un système à un seul geste : RELOAD relit le
 * fichier client et propose les relances à envoyer.
 *
 * Ce qui a été supprimé, et qu'il ne faut pas réintroduire par inadvertance :
 * le bulletin officiel des annonces, les départements surveillés, la note de
 * pertinence sur 100 et son seuil à 60, les mots-clés de secteur, les
 * épingles à numéro de département, deux des cinq secteurs, quatre questions
 * de FAQ, et la cellule « source officielle française » de la section
 * `#france`, qui citait le bulletin. Le catalogue de capacités du bloc
 * `#perimetre` a suivi, dans `lib/produits/capacites/reprise.ts`.
 *
 * LES TROIS RELANCES, qui tiennent désormais toute la page. Elles se
 * relaient dans cet ordre partout, et aucune section n'en oublie une :
 *   1. le compte qui n'a plus commandé (classé par valeur et par récence) ;
 *   2. l'échéance qui redevient due (entretien annuel, contrôle, révision,
 *      renouvellement — galeres-metier-par-secteur.md §27 motif 6) ;
 *   3. l'affaire restée en plan (la pièce arrivée que personne ne vient
 *      chercher, l'appareil réparé jamais repris — §5 et §15 du même
 *      document). C'est l'exemple que Teo a donné : « genre relance pièce ».
 *
 * LA FRONTIÈRE AVEC CASHD, à ne pas franchir en réécrivant. CASHD relance
 * les DEVIS et les FACTURES — de l'argent déjà demandé. RELOAD relance des
 * affaires qui n'ont jamais été chiffrées : un compte qui a cessé de
 * commander, une échéance qui revient, une commande que personne n'est venu
 * reprendre. Si un texte d'ici se met à parler de devis sans réponse ou
 * d'impayé, il vend CASHD, et les deux pages se cannibalisent.
 *
 * LES DEUX CADENCES sont réelles et se distinguent : la LECTURE du fichier
 * est quotidienne (7 h 30), l'ENVOI de la vague hebdomadaire (mardi 9 h).
 *
 * Aucune preuve sociale inventée : pas de client nommé, pas de chiffre de
 * traction. Aucune marque de véhicule ni d'enseigne n'est citée.
 *
 * ── Le registre, qui ne bouge pas ────────────────────────────────────────
 * Partie III de OMEGA/DOCTRINE-TEXTES-SAAS.md (registre grands comptes), qui
 * s'applique PAR-DESSUS les parties I et II. Les six règles de la partie II
 * tiennent toujours : toute phrase de prose a un sujet et un verbe conjugué,
 * deux propositions portent deux verbes, le lien logique s'écrit (donc, puis,
 * quand, parce que, ce qui), un bloc fait 2 à 3 phrases dans l'ordre ce que
 * c'est → ce que ça fait → ce qui vous reste, et une seule figure de style
 * par page — le quota est dépensé par « Il en manque une ? » sous la FAQ.
 *
 * Vocabulaire du registre : SYSTÈME (jamais « moteur »), organisation,
 * direction, service, entité, compte, périmètre, validation, traçabilité,
 * messagerie (jamais « boîte mail »), Omega.AI. Proscrits : patron, la
 * boîte, tout seul, galère, « on » (→ nous), « ça » (→ cela), tutoiement,
 * exclamation, chute aphoristique, ternaire sans verbe, fragment nominal en
 * prose. Restent nominaux, parce que ce sont des étiquettes : les règles de
 * la palette, les épingles, les bulles de conversation, les libellés de
 * tuile et d'onglet.
 *
 * ── Écarts assumés avec OMEGA/reload-site ────────────────────────────────
 * Ce fichier est l'ex-`lib/contenu.ts` du site SaaS, rapatrié le 11/09/2026.
 * Ne viennent pas : `MENU` et `PIED` (le site a les siens), ni
 * `MARQUE.espace` / `MARQUE.courriel`, qui n'étaient lus que par ce pied.
 * `MARQUE.bailleurLien` passe en chemin relatif — ici nous SOMMES omegaai.fr.
 * `APPEL.bouton.lien` est réaiguillé sur /reserver-un-audit.
 *
 * ⚠ Les deux arbres ont divergé le 14/09 (passe grands comptes) : ce fichier
 * n'est plus une copie au mot près de `reload-site`. Le recentrage du 15/09 a
 * été fait des deux côtés, chacun dans son registre. C'est ICI que vit la
 * page que voient les visiteurs ; reload-site est la vitrine SaaS d'origine,
 * qui a vocation à disparaître (RAPATRIEMENT.md).
 */

export const MARQUE = {
  nom: "RELOAD",
  bailleur: "un système Omega.AI",
  /* Sur le site source, la signature d'éditeur était réduite au seul logo,
     lien vers omegaai.fr. Ici on EST omegaai.fr : le lien devient relatif, et
     il perd son `target="_blank"` — on n'ouvre pas un onglet pour aller chez
     soi. `espace` et `courriel` ne sont pas repris. */
  bailleurLien: "/",
};

export const HEROS = {
  /* Deux lignes à TOUTES les largeurs, comme la référence (72 px à 390,
     96 px à 768, 120 px de 1024 à 1440). Sous 640 le titre est plafonné à
     20 rem : au-delà d'une vingtaine de signes par ligne il passe à trois
     lignes et la composition casse. Remesurer la hauteur du h1 à 390 après
     toute retouche — c'est là que cela lâche en premier.
     Le titre porte 20 et 18 signes, contre 18 et 17 à la version « deux
     listes » : c'est la limite haute. Il affirme quelque chose qu'on peut
     contredire, et c'est la prémisse du système, qui ne fait rien d'autre
     que relire ce fichier. Repli prêt si une retouche le fait déborder :
     « Vos comptes inactifs / attendent un mot. » (19 et 17 signes).
     Vocabulaire : « base clients », « CRM », « ERP », « DMS » plutôt que
     « fichier », demandé par Teo le 15/09 — le lecteur est une direction,
     pas un artisan. Les catégories d'outils se nomment (CRM, ERP, DMS) ;
     les MARQUES, jamais : une marque citée est une promesse d'intégration
     que rien n'appuie. */
  titre: ["Votre base clients", "n'est jamais relue."],
  /* LA scène de la page, et la seule que la doctrine autorise. Deux des trois
     relances y passent, chacune en une phrase conjuguée : le compte qui
     s'éteint sans que personne le voie, et la pièce que personne ne vient
     chercher. La troisième, l'échéance qui redevient due, est portée par la
     section des fonctionnalités et par la carte du message. */
  chapo:
    "Un compte qui commandait deux fois par an cesse de commander, et le service s'en aperçoit à la clôture, quand sa ligne a disparu du chiffre. La pièce commandée pour lui dort encore au magasin. RELOAD relit votre base clients chaque matin et vous dit à qui écrire.",
  /* 15/09/2026 — LES DEUX BOUTONS DU HÉROS MENAIENT AU MÊME ENDROIT.
     Ils portaient tous les deux « /contact » : le principal et le
     secondaire d'un héros de page produit ouvraient le même formulaire,
     et aucune des deux portes n'était celle du parcours (Teo, 14/09 sur
     /modeles : « c'est censé renvoyer vers la prise d'audit »). CASHD,
     FRONTD et FILED disent tous « Réserver un audit » en principal ;
     RELOAD était la seule des quatre à ne jamais le proposer avant sa
     clôture, tout en bas. Le libellé change avec la destination : un
     bouton qui promet « vos premières relances » et ouvre un agenda
     serait faux (règle 6 du rapatriement). */
  secondaire: { texte: "Poser une question", lien: "/contact" },
  principal: { texte: "Réserver un audit", lien: "/reserver-un-audit" },
};

/* Bandeau d'outils : les outils du CLIENT, jamais notre pile. */
export const OUTILS = {
  /* La première phrase part de ce que le lecteur possède déjà, la seconde dit
     ce que RELOAD en fait. La réponse à « encore un logiciel à déployer » est
     zéro logiciel, et c'est elle qu'on écrit ici.
     ATTENTION AU GABARIT : ce texte tient dans une colonne de 20 rem à partir
     de lg. Au-delà de ~150 signes il passe à cinq lignes et fait grandir le
     bandeau. */
  phrase:
    "Votre historique de ventes vit dans un CRM, un ERP ou un tableur, et vos clients écrivent à votre messagerie. RELOAD lit les deux, donc vous ne déployez rien.",
  /* Un seul mot par case : les cases font 5 à 7 rem, « Google Sheets » y
     passe à la ligne et chevauche ses voisines. */
  noms: ["Gmail", "Outlook", "Sheets", "Excel", "CSV"],
};

/* Grand bloc citation, révélé mot à mot au défilement. La référence y met un
   faux client ; on y met le problème que le système règle. */
export const MANIFESTE = {
  /* Le mot à mot défile sur 200 vh : à partir d'une trentaine de mots, la
     révélation devient trop lente à lire. Celle-ci en fait 25. La cause est
     écrite (« parce que »), et la phrase ne contient aucune antithèse — le
     quota de figures de la page est dépensé sous la FAQ. */
  phrase:
    "Un client ne part presque jamais chez un concurrent : il cesse de penser à vous, parce que personne ne lui a écrit entre-temps.",
  signature: "Le problème que RELOAD règle",
  /* La règle interdit d'inventer une preuve, pas de se taire sur ce qu'on n'a
     pas. La phrase dit qui parle, et rien de plus. */
  precision: "Nous parlons ici en notre nom",
};

export const FONCTIONNALITES = {
  /* Le titre et sa suite sont rendus dans le MÊME h2 (TitreSection) : leur
     SOMME doit tenir sous ~150 signes, budget mesuré sur la référence. Ici
     40 + 100 = 140. C'est la suite qui nomme les trois relances, une fois
     pour toutes ; le reste de la page s'y adosse sans les redire en bloc. */
  titre: "Une relance se lit dans votre historique.",
  suite:
    "RELOAD y cherche le compte qui n'a plus commandé, l'entretien redevenu dû et l'affaire restée en plan.",

  /* ── Carte 1 · la lecture du fichier ────────────────────────────────── */
  carteCarte: {
    /* 7 h 30 est l'heure réelle de la lecture, pas une scène mise en décor :
       c'est pour cela qu'elle survit à la règle « une scène par page ». Les
       trois épingles portent les trois relances, dans l'ordre de la suite. */
    titre: "À 7 h 30, votre liste de relances est prête.",
    suite:
      "RELOAD lit votre CRM et votre historique de facturation pendant la nuit, puis il ne garde que les comptes dont le silence dépasse votre délai.",
    epingles: [
      /* Le champ `drapeau` portait un numéro de département ; il porte
         maintenant la durée du silence, rendue à gauche de l'étiquette.
         Garder ces valeurs COURTES : l'étiquette est en `whitespace-nowrap`
         et celle posée à 68 % sort du cadre au-delà de ~30 signes au total. */
      { gauche: "18%", haut: "38%", delai: 0, drapeau: "18 mois", texte: "Entretien sauté deux fois" },
      { gauche: "44%", haut: "24%", delai: 200, drapeau: "6 sem.", texte: "Pièce arrivée, jamais posée" },
      { gauche: "68%", haut: "46%", delai: 400, drapeau: "3 ans", texte: "4 200 € puis plus rien" },
    ],
  },
  cartePalette: {
    titre: "Vous décidez qui reçoit une relance.",
    /* Les huit lignes ci-dessous sont des réglages d'interface, pas de la
       prose : elles restent nominales, la doctrine l'autorise. La suite, elle,
       porte trois verbes conjugués. */
    suite:
      "Vous fixez le délai de silence et le montant qui mérite un message, puis tout ce qui sort de ces bornes est écarté avant de vous parvenir.",
    intitule: "Règles de vos relances",
    espaceReserve: "Filtrer la base clients…",
    /* `code` est rendu dans une pastille de 5 × 5 en 8 px : au-delà de trois
       ou quatre signes il déborde. */
    lignes: [
      { code: "12m", texte: "Sans commande depuis douze mois" },
      { code: "€€", texte: "Au moins 300 € d'achats cumulés" },
      { code: "RDV", texte: "Entretien annuel redevenu dû" },
      { code: "PCE", texte: "Pièce arrivée, jamais reprise" },
      { code: "1/T", texte: "Un message par trimestre au plus" },
      { code: "@", texte: "Par courriel, depuis votre adresse" },
      { code: "×", texte: "Jamais un compte en litige" },
      { code: "1×", texte: "Jamais deux fois le même compte" },
    ],
  },

  /* Ce bloc porte la règle du parc, et il la porte à l'endroit exact où
     l'objection naît : juste avant les deux cartes qui montrent le système en
     train d'écrire. Ne pas durcir en « rien ne part jamais sans vous » : ce
     serait faux au bout de trois semaines. C'est le seul texte que le
     recentrage du 15/09 laisse intact, parce qu'il ne parlait déjà que de
     relances. */
  citation: {
    texte:
      "« Vos règles de ton, vos interdits et vos tournures sont écrits avant la première vague. Le système n'en sort pas, et il s'arrête au premier doute. »",
    signataire: "La règle qui ne se négocie pas",
    role: "Sur RELOAD comme sur tout le système Omega.AI",
  },

  /* ── Carte 3 · la consigne en français ──────────────────────────────── */
  carteLangue: {
    titre: "Vous dictez les règles en français.",
    suite:
      "Vous n'avez aucune case à cocher : une phrase suffit, et le système l'applique ensuite à chaque relance.",
    /* `role: "moteur"` est une clé technique de composant, pas un mot rendu :
       elle ne se renomme pas (doctrine partie III, §18). */
    echanges: [
      { role: "vous" as const, texte: "Ne relance jamais un compte en litige." },
      { role: "moteur" as const, texte: "Compris — ces fiches sont écartées." },
      { role: "vous" as const, texte: "Ne propose aucune remise aux anciens clients." },
      { role: "moteur" as const, texte: "Aucune remise dans les relances." },
    ],
  },
  /* Le message montré ici est un exemple de rédaction, pas un client. Il
     s'ancre sur une ligne du fichier (date, référence, montant) ET sur un
     motif daté — l'entretien qui redevient dû, §27 motif 6. Une relance sans
     motif, c'est « cela fait un moment que nous ne vous avons pas vu » :
     personne n'y répond. Les dix-huit mois sont cohérents avec la date du
     15/09/2026 ; si cette date change, refaire le compte. Aucune marque de
     véhicule n'est citée, ici ni ailleurs. */
  carteTrace: {
    titre: "Chaque client reçoit son propre message.",
    suite:
      "Le système y reprend la date, la référence et le montant de sa dernière ligne de facturation, ce qui est l'inverse d'un publipostage envoyé à toute la base.",
    phrase: "Bonjour Martin, je retrouve votre",
    phraseCitee: "passage du 14 mars 2025, réf. 4821, 615 €",
    nbSources: 3,
    fin: " : l'entretien annuel qui va avec est à refaire. Je vous garde un créneau ?",
  },
};

export const CHIFFRES = {
  titre: "Une base clients que personne ne relance s'éteint par paliers.",
  suite: "La courbe ci-dessous se lit sur n'importe quel historique de ventes.",
  /* `cellules` N'EST PLUS RENDU sur cette page depuis le 14/09 : les quatre
     tuiles ont été remplacées par le bloc `#perimetre`
     (components/produits/reprise/Perimetre.tsx). La clé est conservée pour
     que le composant `Chiffres` reste interchangeable avec celui du site
     source, et ses quatre valeurs ont été recentrées avec le reste : plus de
     note sur 100, et les deux cadences réelles à la place. */
  cellules: [
    { valeur: "7 h 30", libelle: "La base clients est relue chaque matin" },
    { valeur: "Mardi 9 h", libelle: "La vague de la semaine part" },
    { valeur: "1 seul", libelle: "Un message par compte à la fois" },
    { valeur: "Arrêt", libelle: "Une réponse arrête la séquence" },
  ],
  graphique: {
    intitule: "Ce que devient une base clients que personne ne relance",
    mention: "Exemple de lecture, pas les données d'un client",
    series: [
      { tranche: "0–30 j", actifs: 186, dormants: 0 },
      { tranche: "1–3 mois", actifs: 142, dormants: 24 },
      { tranche: "3–6 mois", actifs: 71, dormants: 96 },
      { tranche: "6–12 mois", actifs: 28, dormants: 174 },
      { tranche: "1–2 ans", actifs: 9, dormants: 221 },
      { tranche: "+ 2 ans", actifs: 3, dormants: 268 },
    ],
  },
};

/* La référence met quatre faux témoignages. On met des secteurs à la place,
   sans personne inventée. Les cinq perdent le même chiffre pour cinq raisons
   différentes, et les trois relances se répartissent entre eux : l'après-vente
   porte l'échéance, le négoce et le bâtiment le compte qui s'éteint, la
   climatisation le contrat qui meurt, le conseil la mission close.
   Les clés `cle` sont des identifiants d'onglet internes, pas des slugs de
   route : `tp` (travaux publics) est devenu `negoce` avec le recentrage. */
export const METIERS = {
  /* Le titre défend le lecteur avant de lui montrer ce qu'il rate : c'est la
     seule façon de faire lire cinq onglets à quelqu'un qui va s'y
     reconnaître. Et l'impératif de la suite sert la mécanique de la section :
     on choisit son cas, on ne le regarde pas défiler. */
  titre: "Personne ne laisse partir un client par négligence.",
  suite:
    "Ces cinq secteurs perdent le même chiffre pour cinq raisons différentes. Ouvrez celui qui vous concerne.",
  /* Chaque secteur porte trois blocs, et le troisième — « ce qui reste chez
     vous » — n'est pas une précaution juridique : c'est ce qui rend les deux
     autres crédibles. Une grille toute verte ne se croit pas. Il dit aussi la
     frontière posée dans `galeres-metier-par-secteur.md` §0 : l'état des
     choses (planning, stock, atelier, caisse) reste au logiciel métier. */
  blocs: {
    echappe: "Ce qui vous échappe",
    cherche: "Ce que RELOAD va chercher",
    reste: "Ce qui reste chez vous",
  },
  secteurs: [
    {
      cle: "apresvente",
      nom: "Après-vente",
      secteur: "Concession & après-vente",
      icone: "atelier" as const,
      echappe:
        "La révision d'un client tombe pendant un mois chargé, personne ne l'appelle, et il finit par la faire dans un centre auto en passant.",
      cherche:
        "RELOAD suit les entretiens qui arrivent à échéance, puis il repère les comptes silencieux et les commandes que personne n'a reprises.",
      reste:
        "Votre planning d'atelier et votre stock de pièces restent dans votre DMS, parce que RELOAD ne s'y substitue pas : il le lit, puis il écrit ailleurs.",
    },
    {
      cle: "negoce",
      nom: "Négoce",
      secteur: "Commerce de gros & négoce",
      icone: "negoce" as const,
      echappe:
        "Un compte qui commandait tous les mois espace ses commandes, puis il s'arrête. Personne ne l'appelle, parce que rien n'a été réclamé et que le chiffre global tient encore.",
      cherche:
        "RELOAD mesure la fréquence de commande habituelle de chaque compte dans votre ERP, puis il signale ceux qui décrochent avant que le trimestre le montre.",
      reste:
        "Vos conditions tarifaires, vos encours et l'attribution de vos comptes restent dans votre ERP, parce que RELOAD y lit sans jamais y écrire.",
    },
    {
      cle: "clim",
      nom: "Climatisation",
      secteur: "Climatisation & froid",
      icone: "froid" as const,
      echappe:
        "L'entretien annuel saute une année, puis il saute la suivante, et le contrat s'éteint sans que personne l'ait jamais résilié.",
      cherche:
        "RELOAD tient la liste de vos installations et la date à laquelle l'entretien de chacune redevient dû, puis il écrit au client la semaine d'avant.",
      reste: "Vous gardez l'intervention, le déplacement et le prix que vous facturez.",
    },
    {
      cle: "batiment",
      nom: "Bâtiment",
      secteur: "Entreprise générale du bâtiment",
      icone: "chantier" as const,
      echappe:
        "Vous avez livré un chantier il y a trois ans. Le client engage une nouvelle tranche cette année, et il consulte quelqu'un d'autre parce qu'il ne vous a plus vu depuis la réception.",
      cherche:
        "RELOAD reprend vos chantiers réceptionnés, puis il propose un mot aux clients dont le dernier passage remonte à plus longtemps que le délai que vous fixez.",
      reste:
        "Vous fixez vos prix, vous choisissez vos équipes et vous décidez d'y retourner ou non.",
    },
    {
      cle: "conseil",
      nom: "Conseil",
      secteur: "Cabinet de conseil",
      icone: "bureau" as const,
      echappe:
        "La facture est soldée et le dossier se referme. Six mois plus tard, le client rappelle un concurrent qui, lui, avait écrit.",
      cherche:
        "RELOAD repère les missions closes depuis assez longtemps pour qu'une prise de contact se justifie, sans insistance.",
      reste: "Vous choisissez ce que vous souhaitez leur proposer, et à quel prix.",
    },
  ],
};

/* Ce ne sont pas des questions inventées pour remplir un accordéon : ce sont
   celles du pitch d'audit et de la fiche produit. Les quatre questions sur
   les marchés publics ont été retirées le 15/09 et remplacées par quatre
   questions de relance. */
export const QUESTIONS = {
  titre: "Les questions posées à chaque rendez-vous.",
  /* « Il en manque une ? » est la SEULE figure courte qui reste sur la page,
     et c'est aussi l'unique question rhétorique que la doctrine autorise :
     elle amorce le lien « Écrivez-nous », elle ne cherche pas un effet. Ne
     rien ajouter du même ordre ailleurs sans retirer celle-ci. */
  suite: "Il en manque une ?",
  lienTexte: "Écrivez-nous",
  lien: "/contact",
  items: [
    {
      q: "Qu'est-ce que RELOAD, concrètement ?",
      r: "RELOAD lit votre base clients tous les matins, et il en sort trois listes : les comptes qui n'ont plus commandé depuis le délai que vous fixez, les entretiens qui redeviennent dus, et les affaires restées en plan comme une pièce arrivée que personne n'est venu chercher. Pour chacun, il rédige un message ancré sur son dernier passage, et ce message part de votre adresse. Vous ne changez pas d'outil, puisque tout vous arrive dans votre messagerie.",
    },
    {
      q: "Nos clients vont-ils se sentir sollicités de trop près ?",
      r: "C'est précisément ce que le plafond empêche : un message par compte et par trimestre, un seul canal à la fois, jamais les deux. Dès qu'une réponse arrive, même négative, la séquence s'arrête et la conversation revient à votre commercial. Un compte qui ne répond jamais sort du cycle au lieu d'y tourner en boucle, parce qu'une base clients s'épuise vite.",
    },
    {
      q: "Combien de comptes faut-il dans la base pour que cela se justifie ?",
      r: "Cela dépend moins de la volumétrie que de ce que vaut un compte réactivé : deux cents comptes dans le bâtiment ne pèsent pas comme deux mille en commerce de détail. Nous faisons ce calcul avec vos chiffres pendant le diagnostic, avant tout engagement, et si la relance à la main reste plus simple chez vous, nous vous le disons.",
    },
    {
      q: "Nos données sont réparties entre un CRM, un ERP et des dossiers papier. Est-ce exploitable ?",
      r: "Un export CSV de votre CRM ou de votre ERP suffit pour commencer, et un tableur fait aussi l'affaire. Ce qu'il faut sur chaque ligne, c'est un identifiant de compte, une date et un montant, parce que le reste se déduit. Ce qui dort sur papier n'entre pas de lui-même, donc nous arbitrons ensemble ce qui vaut la peine d'être saisi.",
    },
    {
      q: "RELOAD peut-il écrire n'importe quoi à nos clients ?",
      r: "Non, et c'est la première question qui nous est posée. Vous posez les règles en français, comme le ton, les sujets interdits, les remises ou la longueur, et elles s'appliquent à chaque message : jamais un prix ni un délai inventé, jamais de tutoiement. Vos équipes relisent la première vague nom par nom, puis vous décidez ce qui part seul et ce qui attend votre accord.",
    },
    {
      q: "Que se passe-t-il si quelque chose déraille ?",
      r: "Le système s'arrête de lui-même. Un compte ne reçoit jamais deux relances, un nom que vous avez retiré ne revient dans aucune vague, chaque envoi est horodaté dans un journal, et au premier doute la coupure est automatique. Nous préférons un mardi sans vague à un mardi où le même client reçoit deux messages.",
    },
  ],
};

/* Section imposée par Teo : la page doit dire que le produit est français.
   Trois affirmations, toutes vérifiables — et rien de plus. Deux mentions
   sont interdites ici, et pour la même raison : une phrase fausse sur cette
   section-là se retourne contre nous plus vite que partout ailleurs.
   — « hébergé en France » : les fonctions tournent dans l'Union européenne,
     pas sur le territoire ;
   — « vos données ne quittent jamais l'Europe », sous quelque formulation
     que ce soit : la rédaction des messages passe par un prestataire.
   La cellule du milieu disait « source officielle française » et citait le
   bulletin des marchés publics : elle est tombée avec la moitié PUBLIQ, le
   15/09. Ce qui la remplace est vrai sans elle — la langue des relances.
   ⚠ La clé d'icône `source` devient `langue` : voir le tableau ICONES de
   components/produits/reprise/Francais.tsx. */
export const FRANCAIS = {
  titre: "Ce produit est écrit en France.",
  suite:
    "Omega.AI en est l'éditeur et en assure la maintenance. Le contrat précise où vont vos données et ce que nous en faisons.",
  cellules: [
    {
      icone: "editeur" as const,
      titre: "Édité en France",
      texte:
        "Omega.AI conçoit et maintient ce produit en France, donc quand vous écrivez, une personne de l'équipe vous répond.",
    },
    {
      icone: "langue" as const,
      titre: "Écrit en français",
      texte:
        "Les relances sont rédigées en français, dans le vocabulaire de votre secteur, et vos équipes les relisent avant qu'elles partent.",
    },
    {
      /* Ancien intitulé : « Vos données restent en Europe ». Il disait la
         deuxième mention interdite sans l'écrire — rien ne garantit qu'une
         donnée ne sorte jamais de l'UE, la rédaction des messages passe par
         un prestataire. Ce qu'on peut tenir : le lieu d'hébergement, la
         non-revente, la liste des prestataires au contrat, et la sortie. */
      icone: "donnees" as const,
      titre: "Vos clients restent les vôtres",
      texte:
        "Vos données sont hébergées dans l'Union européenne et ne sont jamais revendues. La liste des prestataires est annexée au contrat, et si vous arrêtez, tout vous est restitué puis effacé.",
    },
  ],
};

/* En bas de page, répéter l'ouverture ne referme rien : ce titre dit le coût
   de ne rien faire, qui est le seul argument qui reste à cet endroit. */
export const APPEL = {
  titre: "Demain, vos anciens clients ne penseront toujours pas à vous",
  texte:
    "Ils ne vous en voudront pas, parce qu'ils vous auront simplement oublié. La seule chose qui peut changer d'ici là, c'est que quelqu'un relise enfin votre base clients.",
  /* Réaiguillé sur le parcours du site : le site source envoyait sur son
     propre /contact, qui n'existe pas ici sous cette forme. */
  bouton: { texte: "Commencer", lien: "/reserver-un-audit" },
};
