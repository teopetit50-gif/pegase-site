/* Tout le texte de la page produit RELOAD vit ici (ex-lib/contenu.ts
 * de OMEGA/reload-site). Changer le produit = changer ce fichier.
 *
 * RELOAD est un paquet à DEUX moitiés, comme annoncé sur pegase-site
 * (lib/content.ts, slug « nouvelles-affaires ») : les marchés publics de votre
 * zone, et les clients qui ne sont pas revenus. Les marchés passent en titre —
 * c'est la phrase qu'une entreprise tape dans un moteur de recherche ; les
 * dormants sont un argument de rendez-vous, pas une requête.
 *
 * Aucune preuve sociale inventée : pas de client nommé, pas de chiffre de
 * traction. Les chiffres du bandeau sont des faits de conception des moteurs.
 *
 * ── Passe de réécriture du 11/09/2026 ────────────────────────────────────
 * Selon OMEGA/DOCTRINE-TEXTES-SAAS.md. Trois décisions qui tiennent tout le
 * fichier, à ne pas défaire sans les relire :
 *
 * 1. Le mot « gisement » est banni. Il tenait les deux moitiés ensemble, mais
 *    c'est de l'oral de séminaire — au dépôt on ne le dit pas. Ce qui les
 *    tient désormais, c'est le geste commun : LIRE deux listes que personne
 *    n'ouvre. D'où le titre des fonctionnalités et le h1.
 * 2. Les deux moitiés ne se partagent pas les sections, elles se relaient.
 *    Marchés d'abord partout (c'est la requête qu'on tape), dormants ensuite
 *    (c'est l'argument qui se raconte). Aucune section ne parle des deux à la
 *    fois, sauf le h1 et l'appel.
 * 3. Aucun chiffre de marché sur cette page — donc aucune source à tracer.
 *    Les seuls nombres sont des faits de conception (7 h 30, 60/100) ou des
 *    exemples explicitement étiquetés comme tels. Si un chiffre public entre
 *    ici un jour, il porte sa source et sa date en commentaire, sans quoi
 *    personne ne pourra le défendre dans six mois.
 *
 * ── Passe correctrice du 11/09/2026 au soir ──────────────────────────────
 * Selon la partie II de la même doctrine (§10 à §14). La première passe avait
 * supprimé les verbes pour éviter que le produit soit sujet : « Vos prix, vos
 * co-traitants, et la décision de répondre. » La page entière se lisait au
 * rythme, pas au sens. Quatre décisions qui tiennent le fichier :
 *
 * 4. Toute phrase de prose porte un sujet et un verbe conjugué, et deux
 *    propositions portent deux verbes. Ne pas réintroduire de fragment
 *    nominal dans un texte de corps, même court, même joli.
 * 5. Le lien logique s'écrit (donc, puis, quand, parce que, ce qui, comme).
 *    Deux bouts juxtaposés à la virgule laissent le lecteur deviner : c'est
 *    exactement ce que Teo a refusé.
 * 6. RELOAD peut être sujet d'un verbe actif — c'est la seule façon de
 *    dire ce qu'il fait. Ce qui reste interdit : « Il » nu en tête de
 *    paragraphe, plus d'une fois par section.
 * 7. Une figure de style par page, toutes catégories confondues. Le quota
 *    est dépensé par « Il en manque une ? », sous la FAQ, et par rien
 *    d'autre : les antithèses (« ce n'est pas de la prospection, c'est de la
 *    lecture »), les ternaires nominaux et les chutes aphoristiques ont tous
 *    été convertis en phrases. Avant d'en réintroduire une, il faut donc en
 *    retirer une. Restent autorisés sans verbe, parce que ce sont des
 *    étiquettes et non de la prose : les filtres, les épingles, les bulles de
 *    conversation, les intitulés de colonne et les libellés du menu.
 *
 * ─────────────────────────────────────────────────────────────────────────
 * 11/09/2026 — RAPATRIEMENT (RAPATRIEMENT.md). Ce fichier est l'ex-
 * `lib/contenu.ts` de OMEGA/reload-site, repris AU MOT PRÈS — commentaires
 * de doctrine compris, c'est eux qui empêchent de défaire les décisions
 * ci-dessus par inadvertance. Les seules coupes sont celles qu'impose la
 * règle 6, et elles ne retirent aucune phrase de la page :
 *   · `MENU` — le menu de l'entête du site source, qui ne vient pas (le
 *     site a le sien) ;
 *   · `PIED` — son pied de page, idem ;
 *   · `MARQUE.espace` (app.omegaai.fr) et `MARQUE.courriel`, qui n'étaient
 *     lus que par ce pied.
 * `MARQUE.bailleurLien` passait par https://omegaai.fr : ici c'est chez
 * nous, donc le chemin relatif. Seul autre écart : `APPEL.bouton.lien`,
 * réaiguillé sur /reserver-un-audit (voir sa note).
 *
 * ⚠ Le texte de cette page ne se réécrit PAS ici : il se réécrit dans
 * OMEGA/reload-site/lib/contenu.ts, et on le reporte. Toute retouche
 * directe rouvre l'écart que la reprise du 11/09 vient de refermer.
 *
 * Report du 11/09/2026 au soir : la source a été réécrite en profondeur
 * après le rapatriement (passe correctrice, points 4 à 7 ci-dessus). Elle
 * a été reportée ici intégralement, par reconstruction depuis les octets de
 * `lib/contenu.ts` — les coupes et les deux écarts ci-dessus sont inchangés,
 * et aucun bloc nouveau n'est apparu : la structure des clés est identique.
 * ───────────────────────────────────────────────────────────────────────── */

export const MARQUE = {
  nom: "RELOAD",
  bailleur: "un système Omega",
  /* Sur le site source, la signature d'éditeur était réduite au seul logo,
     lien vers omegaai.fr — le nom du produit contient déjà la maison, et
     l'écrire une deuxième fois disait « Omega » trois fois dans la même
     barre. Ici on EST omegaai.fr : le lien devient relatif, et il perd son
     `target="_blank"` — on n'ouvre pas un onglet pour aller chez soi.
     `espace` et `courriel` ne sont pas repris : ils n'étaient lus que par le
     pied du site source, que le pied du site remplace. */
  bailleurLien: "/",
  /* Le champ `promesse` a été retiré du site source le 11/09/2026 : il
     n'était rendu nulle part. Ici, la phrase de présentation du produit est
     la `description` de app/offres/nouvelles-affaires/page.tsx, et elle
     seule — pas app/layout.tsx, qui porte celle du site entier. */
};

export const HEROS = {
  /* Deux lignes à TOUTES les largeurs, comme la référence (72 px à 390,
     96 px à 768, 120 px de 1024 à 1700). Sous 640 le titre est plafonné à
     20 rem : au-delà d'une vingtaine de signes par ligne il passe à trois
     lignes et la composition casse. Remesurer la hauteur du h1 à 390 après
     toute retouche — c'est là que ça lâche en premier. */
  /* Le titre ne nomme AUCUN des deux moteurs : ce qui se vend ici, c'est ce
     qu'ils ont en commun — du chiffre d'affaires qui existe déjà et que
     personne ne va chercher. Nommer « les marchés publics » en premier
     faisait passer le paquet pour un outil de veille d'appels d'offres.
     Contrainte de composition inchangée : deux lignes, ~20 signes chacune.
     Le 11/09 au soir, « Rien à prospecter. / Tout est déjà là. » a sauté :
     deux fragments posés pour le rythme, dont le premier n'avait pas de
     verbe. La phrase actuelle est une seule proposition, sujet + verbe, à
     longueur strictement égale (18 et 17 signes) — le gabarit ne bouge pas.
     « Les deux listes » sont reprises telles quelles par le chapô juste en
     dessous : ne pas casser ce renvoi en réécrivant l'un sans l'autre. */
  titre: ["Votre chiffre dort", "dans deux listes."],
  /* Deux scènes avant toute explication, une par moitié du paquet : le marché
     qu'on apprend trop tard (§27 motif 2 et la carte TP plus bas), le client
     qui s'en va sans rien reprocher (§27 motif 6). Le chapô ne reprend PAS
     l'idée du manifeste — il glisse juste en dessous, la redite se verrait.
     C'est LA scène de la page, et la seule : la doctrine en autorise une, ici
     ou dans la section du problème, jamais en chute de bloc. Les deux scènes
     étaient des phrases sans verbe principal ; elles sont conjuguées. */
  chapo:
    "Un marché de voirie paraît dans la commune d'à côté, et vous l'apprenez le jour où il est clos. Un client de dix ans fait sa révision ailleurs. RELOAD lit ces deux listes chaque matin et ne vous laisse que la décision.",
  /* Les deux boutons mènent à /contact, qui propose de montrer ce que le
     moteur aurait remonté la semaine passée : le libellé promet ça, pas une
     démo qui n'existe pas — et l'icône du secondaire est une enveloppe. */
  secondaire: { texte: "Poser une question", lien: "/contact" },
  principal: { texte: "Voir votre première liste", lien: "/contact" },
};

/* Bandeau d'outils : les outils du CLIENT, jamais notre pile. */
export const OUTILS = {
  /* La première phrase part de ce que le lecteur possède déjà, la seconde dit
     ce que RELOAD en fait : « se branche sur ce que vous avez déjà » se
     lit sur n'importe quel site d'éditeur. La réponse du pitch à « encore un
     logiciel à apprendre » est zéro logiciel, et c'est elle qu'on écrit ici.
     Version du 11/09 au soir : « vos clients dans votre boîte mail » était
     l'exemple que Teo a cité — la virgule y remplaçait le verbe. Les deux
     moitiés ont chacune le leur, et « donc » écrit le lien.
     ATTENTION AU GABARIT : ce texte tient dans une colonne de 20 rem à partir
     de lg (lg:max-w-xs dans BandeauOutils.tsx). Au-delà de ~150 signes il
     passe à cinq lignes et fait grandir le bandeau. */
  phrase: "Votre fichier client tient dans un tableur et vos clients vous écrivent dans votre boîte mail. RELOAD lit les deux, donc vous n'installez rien.",
  /* Un seul mot par case : les cases font 5 à 7 rem, « Google Sheets » y
     passe à la ligne et chevauche ses voisines. */
  noms: ["Gmail", "Outlook", "Sheets", "Excel", "CSV"],
};

/* Grand bloc citation, révélé mot à mot au défilement. La référence y met un
   faux client ; on y met le problème que le produit règle. */
export const MANIFESTE = {
  /* Passe correctrice : la phrase était bâtie en antithèse (« ce n'est pas
     celui qu'on a perdu, c'est celui qu'on n'a jamais vu passer »), et la
     doctrine n'en autorise qu'une par page — dépensée nulle part ailleurs
     désormais. Le sens est le même, la cause est écrite (« parce que »).
     Le mot à mot défile sur 200 vh (Manifeste.tsx) : à partir d'une
     trentaine de mots, la révélation devient trop lente à lire. */
  phrase:
    "Le chiffre d'affaires qui vous manque n'a presque jamais été perdu chez un concurrent : personne n'a eu le temps d'aller le chercher.",
  signature: "Le problème que RELOAD règle",
  /* L'ancienne mention disait « le produit n'a pas encore de références » :
     c'est vrai, mais l'écrire en grand sous le héros dessert la page sans
     servir la règle — la règle interdit d'inventer une preuve, pas de se
     taire sur ce qu'on n'a pas. La phrase dit maintenant qui parle, et elle
     le dit sans antithèse depuis le 11/09 au soir : « ce n'est pas un client
     qui parle, c'est nous » était la même figure que la citation juste
     au-dessus, à deux lignes d'intervalle. */
  precision: "Nous parlons ici en notre nom",
};

export const FONCTIONNALITES = {
  /* Le titre doit affirmer quelque chose qu'on puisse contredire, et tenir
     les deux moitiés d'un seul geste : lire le bulletin, lire le facturier.
     Il enchaîne sur le h1 — « deux listes » — au lieu de le répéter.
     Passe correctrice : « Ce n'est pas de la prospection, c'est de la
     lecture. » était une antithèse, et la suite alignait deux fragments sans
     verbe. Les deux listes sont maintenant nommées par une phrase chacune, et
     la troisième dit pourquoi personne ne les ouvre (fiche produit : « faute
     d'une heure à y consacrer »). Le titre et sa suite sont rendus dans le
     MÊME h2 (TitreSection, jusqu'à text-4xl) : ce bloc a gagné ~30 % de
     signes, il est à remesurer aux cinq largeurs. */
  titre: "Tout commence par la lecture de deux listes.",
  suite:
    "La première est le bulletin des marchés publics, et la seconde est votre fichier client.",

  /* ── Moitié « marchés publics » ─────────────────────────────────────── */
  carteCarte: {
    /* « Consultation » est le mot de l'acheteur public, pas celui du patron :
       au dépôt on dit « un marché ». Et l'heure passe en tête — c'est le seul
       particulier de la carte, les épingles font le reste. 7 h 30 n'est pas
       une scène mise en décor mais l'heure réelle du relevé, celle du bandeau
       de chiffres : c'est pour ça qu'elle survit à la règle « une scène par
       page ». Passe correctrice : la suite était une énumération de compléments
       sans verbe ; elle dit maintenant ce que le moteur fait de sa nuit.
       Titre et suite coulent dans le MÊME paragraphe (Intitule). */
    titre: "À 7 h 30, votre liste du jour est prête.",
    suite:
      "RELOAD lit le bulletin pendant la nuit, puis il ne retient que les marchés parus dans vos départements et dans votre métier.",
    epingles: [
      { gauche: "18%", haut: "38%", delai: 0, drapeau: "971", texte: "Voirie · 84 k€ · clôture 12/10" },
      { gauche: "44%", haut: "24%", delai: 200, drapeau: "972", texte: "Second œuvre · 220 k€" },
      { gauche: "68%", haut: "46%", delai: 400, drapeau: "971", texte: "Entretien annuel · 31 k€" },
    ],
  },
  cartePalette: {
    titre: "Vous décidez de ce qui passe.",
    /* Les huit lignes ci-dessous sont des réglages d'interface, pas de la
       prose : elles restent nominales, la doctrine l'autorise. La suite, elle,
       était un ternaire nominal suivi d'une chute — trois verbes maintenant. */
    suite:
      "Vous fixez vos départements, vos montants et le délai qu'il vous faut pour répondre, puis tout ce qui sort de ces bornes est écarté avant de vous parvenir.",
    intitule: "Filtres de votre veille",
    espaceReserve: "Filtrer les annonces…",
    lignes: [
      { code: "971", texte: "Guadeloupe et îles du Nord" },
      { code: "972", texte: "Martinique" },
      { code: "VRD", texte: "Voirie et réseaux divers" },
      { code: "€€", texte: "Montant entre 30 et 300 k€" },
      { code: "≥60", texte: "Pertinence supérieure à 60 / 100" },
      { code: "21j", texte: "Au moins trois semaines pour répondre" },
      { code: "PA", texte: "Procédure adaptée uniquement" },
      { code: "×", texte: "Jamais deux fois la même annonce" },
    ],
  },

  /* Ce bloc portait une deuxième maxime sur le chiffre qui se perd — c'est
     déjà le sujet du manifeste, en mieux dit, à trois sections d'ici. Deux
     philosophies sur une page, c'en est une de trop. Il porte maintenant la
     règle du parc, et il la porte à l'endroit exact où l'objection naît :
     juste avant les deux cartes qui montrent le moteur en train d'écrire.
     Formulation vérifiée sur la fiche produit — la première vague est relue
     nom par nom, la suite se règle poste par poste. Ne pas durcir en « rien
     ne part jamais sans vous » : ce serait faux au bout de trois semaines. */
  citation: {
    texte:
      "« Vous relisez la première vague nom par nom. Ensuite, c'est vous qui décidez ce qui part seul et ce qui attend votre accord. »",
    signataire: "La règle qui ne se négocie pas",
    role: "Sur RELOAD comme sur tout le système Omega",
  },

  /* ── Moitié « clients dormants » ────────────────────────────────────── */
  carteLangue: {
    titre: "Vous dictez les règles en français.",
    suite:
      "Vous n'avez aucune case à cocher : une phrase suffit, et le moteur l'applique ensuite à chaque message.",
    echanges: [
      { role: "vous" as const, texte: "Écarte tout ce qui dépasse 300 k€." },
      { role: "moteur" as const, texte: "Compris — filtre posé sur le montant." },
      { role: "vous" as const, texte: "Ne propose jamais de remise aux anciens clients." },
      { role: "moteur" as const, texte: "Aucune remise dans les reprises de contact." },
    ],
  },
  /* Le message montré ici est un exemple de rédaction, pas un client. Il
     s'ancre sur une ligne du facturier (date, référence, montant) ET sur un
     motif de reprise daté — l'entretien qui redevient dû, §27 motif 6. Une
     reprise sans motif, c'est « cela fait un moment qu'on ne vous a pas vu » :
     personne n'y répond. Les dix-huit mois sont cohérents avec la date citée
     au 11/09/2026 ; si cette date change, refaire le compte. */
  carteTrace: {
    titre: "Chaque client reçoit son propre message.",
    suite:
      "Le moteur y reprend la date, la référence et le montant de sa dernière commande, ce qui donne l'inverse exact d'une lettre envoyée à tout le fichier.",
    phrase:
      "Bonjour Martin, je retrouve votre",
    phraseCitee: "commande du 14 mars 2025, réf. 4821, 615 €",
    nbSources: 3,
    fin: " : le contrôle annuel qui va avec est à refaire. Je vous garde un créneau ?",
  },
};

/* Faits de conception des moteurs, pas des chiffres de traction. */
export const CHIFFRES = {
  /* L'affirmation était en sous-titre et l'intitulé de notice en titre : on
     les échange. Le 15 août remplace « les jours où personne ne regarde » —
     même idée, un particulier à la place d'une abstraction.
     Passe correctrice : « Quatre règles écrites dans le moteur, pas quatre
     promesses. » était une antithèse posée en titre ; le titre dit maintenant
     ce que le moteur fait de ces règles. Les quatre libellés de tuiles ont
     chacun sujet et verbe, à longueur constante — ce sont les chaînes les
     plus contraintes du fichier (text-sm sous un chiffre en text-4xl). */
  titre: "Le moteur applique quatre règles qu'il ne sait pas contourner.",
  suite: "Elles valent le 15 août comme un mardi ordinaire.",
  cellules: [
    { valeur: "7 h 30", libelle: "Le relevé part chaque matin" },
    { valeur: "60 / 100", libelle: "En dessous, l'annonce est écartée" },
    { valeur: "1 seul", libelle: "Un client ne reçoit qu'un message" },
    { valeur: "Arrêt", libelle: "Au premier doute, rien ne part" },
  ],
  graphique: {
    intitule: "Ce que devient un fichier client qu'on ne rappelle jamais",
    mention: "Exemple de lecture — pas les données d'un client",
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

/* La référence met quatre faux témoignages. On met des métiers à la place,
   sans personne inventée : deux qui ratent des marchés, trois qui laissent
   partir des clients — les deux moitiés du paquet, dans cet ordre. */
export const METIERS = {
  /* Le titre défend le lecteur avant de lui montrer ce qu'il rate : c'est la
     seule façon de faire lire cinq onglets à quelqu'un qui va s'y reconnaître.
     Et l'impératif de la suite sert la mécanique de la section — on choisit
     son cas, on ne le regarde pas défiler (voir l'écart 6 du LISEZ-MOI).
     Passe correctrice : « Personne n'est négligent. Tout le monde est
     occupé. » disait la même chose en deux aphorismes, et la suite ouvrait
     sur un fragment sans verbe principal. La défense du lecteur tient
     maintenant en une phrase. */
  titre: "Personne ne laisse filer une affaire par négligence.",
  suite: "Deux de ces métiers passent à côté de marchés publics et trois laissent partir des clients ; ouvrez celui qui vous concerne.",
  /* Les quatre cartes du carrousel d'origine deviennent des onglets, plus une
     cinquième entrée. Chaque métier porte trois blocs, et le troisième — « ce
     qui reste chez vous » — n'est pas une précaution juridique : c'est ce qui
     rend les deux autres crédibles. Une grille toute verte ne se croit pas.
     Le troisième bloc dit aussi la frontière posée dans
     `plans-et-decisions/galeres-metier-par-secteur.md` §0 : l'état des choses
     (planning, stock, atelier, caisse) reste au logiciel métier. */
  blocs: {
    echappe: "Ce qui vous échappe",
    cherche: "Ce qu'on va chercher",
    reste: "Ce qui reste chez vous",
  },
  secteurs: [
    {
      cle: "tp",
      nom: "Travaux publics",
      secteur: "Travaux publics · VRD",
      icone: "chantier" as const,
      echappe:
        "Vous entendez parler d'un marché trois semaines après sa publication, par quelqu'un qui l'a vu passer, et le délai de réponse ne tient déjà plus.",
      cherche:
        "RELOAD relève chaque matin les marchés de vos départements, puis il écarte tout ce qui sort de vos qualifications.",
      reste:
        "Vous décidez d'y aller et vous montez le dossier : le moteur vous met l'annonce sous les yeux, mais il ne répond jamais à votre place.",
    },
    {
      cle: "batiment",
      nom: "Bâtiment",
      secteur: "Entreprise générale du bâtiment",
      icone: "batiment" as const,
      echappe:
        "Un lot paraît sous un intitulé que vous ne surveillez pas, et comme le mot n'est pas le vôtre, l'annonce ne remonte jamais jusqu'à vous.",
      cherche:
        "Le moteur élargit la recherche aux intitulés voisins des vôtres, parce que l'acheteur public n'emploie pas toujours vos mots.",
      reste: "Vous fixez vos prix, vous choisissez vos co-traitants et vous décidez de répondre ou non.",
    },
    {
      cle: "garage",
      nom: "Après-vente",
      secteur: "Concession & après-vente",
      icone: "atelier" as const,
      echappe:
        "Un client qui venait tous les deux ans cesse de venir, sans rien dire à personne. Vous vous en apercevez en fin d'année, quand sa ligne a disparu du chiffre.",
      cherche:
        "Le moteur suit les révisions et les contrôles qui arrivent à échéance, et il repère les clients qui ne sont pas revenus depuis le délai que vous fixez.",
      reste:
        "Votre planning d'atelier et votre stock de pièces restent où ils sont, parce que RELOAD ne remplace pas votre logiciel métier.",
    },
    {
      cle: "clim",
      nom: "Climatisation",
      secteur: "Climatisation & froid",
      icone: "froid" as const,
      echappe:
        "L'entretien annuel saute une année, puis il saute la suivante, et le contrat s'éteint sans que personne l'ait jamais résilié.",
      cherche:
        "Le moteur tient la liste de vos installations et la date à laquelle l'entretien de chacune redevient dû.",
      reste: "Vous gardez l'intervention, le déplacement et le prix que vous facturez.",
    },
    {
      cle: "conseil",
      nom: "Conseil",
      secteur: "Cabinet de conseil",
      icone: "bureau" as const,
      echappe:
        "La facture est soldée et le dossier se referme. Six mois plus tard, le client rappelle un concurrent qui, lui, avait écrit.",
      cherche:
        "Le moteur repère les missions closes depuis assez longtemps pour qu'un mot se justifie, sans que vous deveniez insistant.",
      reste: "Vous choisissez ce que vous avez envie de leur proposer, et à quel prix.",
    },
  ],
};

/* Ce ne sont pas des questions inventées pour remplir un accordéon : ce sont
   celles du pitch d'audit (commercial/02-pitch-audit.md §3) et de la fiche
   produit. Le titre le dit — ça vaut mieux qu'un « questions fréquentes »
   qu'aucun lecteur ne croit. */
export const QUESTIONS = {
  titre: "On nous pose ces questions à chaque rendez-vous.",
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
      r: "RELOAD lit deux listes à votre place, tous les matins. La première rassemble les marchés publics parus dans vos départements, et vous ne recevez que ceux qui passent vos filtres. La seconde est votre propre fichier client : le moteur y repère les clients qui ne sont pas revenus depuis le délai que vous fixez, puis il rédige la reprise de contact, qui part de votre adresse. Vous ne changez pas d'outil, puisque tout vous arrive dans votre boîte mail.",
    },
    {
      q: "D'où viennent les annonces de marchés publics ?",
      r: "Elles viennent du bulletin officiel des annonces de marchés publics, la publication réglementaire française, qui est ouverte et gratuite. RELOAD n'a aucun accès privilégié : tout ce qu'il remonte, vous pourriez le trouver vous-même. Sa seule utilité tient à la régularité, puisqu'il le fait tous les matins, avec votre vocabulaire métier, sans jamais sauter un jour.",
    },
    {
      /* Question reprise de la fiche produit (textes-pages-paquets-REECRIT.md,
         slug « nouvelles-affaires »). C'est elle qui décide un artisan qui n'a
         jamais répondu à un marché — et elle porte la limite du produit. */
      q: "Je n'ai jamais répondu à un marché public. C'est jouable ?",
      r: "Le moteur ne dépose aucun dossier à votre place, puisque son travail s'arrête à vous éviter de passer à côté. Les marchés hors de vos qualifications ou de vos plafonds sont écartés avant de vous parvenir, et ce qui reste vous arrive avec le lien vers l'avis officiel. Le montage du dossier, le prix et la décision d'y aller restent chez vous — c'est un travail que personne ne peut faire à votre place.",
    },
    {
      q: "Comment savoir qu'une annonce me concerne vraiment ?",
      r: "Chaque annonce retenue est notée de 0 à 100 sur votre métier, vos capacités et le délai de réponse. En dessous de votre seuil — 60 par défaut — elle n'apparaît pas. Au-dessus, elle vous arrive avec le motif de la note et le lien vers l'avis officiel, pour que vous puissiez juger vous-même.",
    },
    {
      q: "Est-ce que RELOAD peut écrire n'importe quoi à mes clients ?",
      r: "Non, et c'est la première chose qu'on nous demande. Vous posez les règles en français — le ton, les sujets interdits, les remises, la longueur — et elles s'appliquent à chaque message : jamais un prix ni un délai inventé, jamais de tutoiement. Vous relisez la première vague nom par nom ; ensuite, vous décidez ce qui part seul et ce qui attend votre accord, et vous pouvez tout couper en un mot.",
    },
    {
      q: "Que se passe-t-il si quelque chose déraille ?",
      r: "Les moteurs s'arrêtent tout seuls. Une annonce déjà vue n'est jamais représentée, un client ne reçoit jamais deux reprises, chaque incident est horodaté dans un journal, et au premier doute la coupure est automatique. Nous préférons un matin sans relevé à un matin où le même client reçoit deux messages.",
    },
  ],
};

/* Section imposée par Teo : le site doit dire que le produit est français.
   Trois affirmations, toutes vérifiables — et rien de plus. Deux mentions
   sont interdites ici, et pour la même raison : une phrase fausse sur cette
   section-là se retourne contre nous plus vite que partout ailleurs.
   — « hébergé en France » : les fonctions tournent en Europe, pas sur le
     territoire ;
   — « vos données ne quittent jamais l'Europe », sous quelque formulation
     que ce soit : la rédaction des messages passe par un prestataire. */
export const FRANCAIS = {
  /* Passe correctrice du 11/09 au soir : la suite était la seconde phrase
     citée par Teo. Ses trois propositions avaient pourtant chacune un verbe —
     le défaut était le ternaire lui-même, trois bouts alignés à la virgule
     qu'on lit au rythme et non au sens. Elle fait maintenant deux phrases.
     Le titre, lui, était une antithèse nominale (« écrit ici, pas traduit
     d'ailleurs ») : c'est le tic n° 3 de la doctrine. */
  titre: "Ce produit est écrit en France.",
  suite: "Omega l'édite depuis la Guadeloupe, et les annonces viennent du bulletin officiel français. Le contrat dit où vont vos données.",
  cellules: [
    {
      icone: "editeur" as const,
      titre: "Édité en France",
      texte: "Omega conçoit et maintient ce produit en Guadeloupe, donc quand vous écrivez, c'est quelqu'un d'ici qui vous répond.",
    },
    {
      icone: "source" as const,
      titre: "Source officielle française",
      texte: "Les annonces viennent du bulletin officiel des marchés publics, qui est une publication réglementaire, ouverte et gratuite. Personne ne s'interpose entre cette source et vous.",
    },
    {
      /* Ancien intitulé : « Vos données restent en Europe ». Il disait la
         deuxième mention interdite sans l'écrire — rien ne garantit qu'une
         donnée ne sorte jamais de l'UE, la rédaction des messages passe par
         un prestataire. Ce qu'on peut tenir : le lieu d'hébergement, la
         non-revente, la liste des prestataires au contrat, et la sortie. */
      icone: "donnees" as const,
      titre: "Vos clients restent les vôtres",
      texte: "Vos données sont hébergées en Europe et ne sont jamais revendues. La liste des prestataires est annexée au contrat, et si vous arrêtez, on vous rend tout puis on efface.",
    },
  ],
};

/* L'ancien titre reprenait le h1 mot pour mot (« tout est déjà là ») : en bas
   de page, répéter l'ouverture ne referme rien. Celui-ci dit le coût de ne
   rien faire, qui est le seul argument qui reste à cet endroit. */
export const APPEL = {
  titre: "Demain matin, les annonces paraîtront quand même",
  texte:
    "Et vos anciens clients ne vous en voudront pas, parce qu'ils vous auront simplement oublié. La seule chose qui peut changer d'ici demain, c'est que quelqu'un lise ces deux listes à votre place.",
  /* 11/09 — RÈGLE 6, réaiguillage. Le seul bouton de la page qui promette
     d'engager quelque chose part sur la porte de conversion du site, comme
     les trois autres pages produit : /reserver-un-audit. Le libellé ne
     bouge pas — chez Omega, commencer, c'est l'audit (même choix que les
     boutons « Commencer » de FILED). Les autres boutons restent sur
     /contact : « Poser une question », « Voir votre première liste » et
     « Écrivez-nous » ne promettent pas d'acheter, et /contact propose
     précisément de montrer ce que le moteur aurait remonté la semaine
     passée. */
  bouton: { texte: "Commencer", lien: "/reserver-un-audit" },
};
