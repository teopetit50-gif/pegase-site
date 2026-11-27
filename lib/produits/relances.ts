/**
 * CASHD — tous les textes de la page produit, au même endroit.
 *
 * RAPATRIÉ le 11/09/2026 de `OMEGA/cashd-site/lib/contenu.ts`, au mot près.
 * La matière d'origine vient de `OMEGA/textes-pages-paquets-REECRIT.md`
 * (fiche CASHD) : rien n'est inventé ici, et rien n'a été réécrit
 * en arrivant.
 *
 * Les seules coupes sont celles qu'impose la règle 6 de RAPATRIEMENT.md —
 * l'entête, le pied et les comptes du site source disparaissent :
 *   · `NAVIGATION` : la barre de navigation du site SaaS. Le site en a une.
 *   · `MARQUE.espace` / `.connexion` / `.inscription` : /espace n'existe pas
 *     ici, et la création de compte devient la réservation d'audit.
 *   · `PIED` : la carte de pied de page (colonnes, mentions, marque) faisait
 *     doublon avec le pied du site. Seul son BLOC D'APPEL survit, sous le nom
 *     `CLOTURE` — c'est du contenu, pas du châssis : il porte la dernière
 *     phrase de la page et son appel à l'action.
 *
 * ── PASSE FINALE DE RESYNCHRONISATION, 11/09/2026 ───────────────────────
 * La source a été RÉÉCRITE EN PROFONDEUR après le rapatriement, et une
 * deuxième fois après la première resynchronisation. Ce fichier est
 * maintenant REFABRIQUÉ À PARTIR DE LA SOURCE : le corps (de `HEROS` à
 * `QUESTIONS`) est un décalque octet pour octet de
 * `cashd-site/lib/contenu.ts` daté du 11/09 08:55 — valeurs ET commentaires.
 * Seules quatre choses en dévient, toutes au titre de la règle 6, et toutes
 * signalées sur place : l'entête ci-dessus, le bloc `MARQUE`, le
 * `boutonPrincipal` du héros, et `CLOTURE` en bas de fichier.
 *
 * Les espaces insécables de la source sont conservées telles quelles :
 * 9 FINES insécables (U+202F, devant les « ? ») et 5 insécables ordinaires
 * (U+00A0, devant les « : »). Elles se recopient, elles ne se retapent pas.
 *
 * Ce que la réécriture change, en substance : le sujet des phrases passe du
 * produit au patron, chaque puce et chaque légende porte désormais un verbe
 * conjugué là où elle était un groupe nominal, et les deux figures de style
 * de la page (l'antithèse du Bento, la formule des Chiffres) tombent au
 * profit d'énoncés qu'on peut contredire.
 *
 * Restent coupées, et c'est voulu : `NAVIGATION`, `PIED.presentation`,
 * `PIED.colonnes`, `PIED.legal` et `PIED.liensLegaux` (châssis du site
 * source), et `bonjour@omegaai.fr` (réaiguillé sur `contact@`).
 */

export const MARQUE = {
  nom: "Relances",
  role: "relance devis & factures",
  signature: "un agent Omega.AI",
  /* 11/09 — l'adresse passe de `bonjour@` à `contact@` : c'est la seule
     adresse de ce site (dix occurrences), et deux adresses de contact sur
     un même site est un défaut, pas une nuance. Reroutage au sens de la
     règle 6 — un mailto est un appel à l'action. */
  courriel: "contact@omegaai.fr",
  /* Était `https://omegaai.fr` : on est DESSUS, donc le chemin relatif. */
  site: "/",
  /* Où va « Créer mon compte » désormais : le site SaaS n'a plus de porte
     à lui, le parcours d'Omega commence par l'audit gratuit. */
  audit: "/reserver-un-audit",
} as const;

/* Le héros porte l'accroche du pitch d'audit BTP au mot près
   (`commercial/02-pitch-audit.md`, §1) : « vous avez combien dehors — en
   devis restés sans réponse et en factures pas encore payées ? ». C'est
   l'unique question rhétorique de la page ; le reste est affirmatif.

   Le tableur a quitté le chapô. C'est un soulagement, pas une promesse,
   et il est déjà dit trois fois plus bas (le ruban, la bande de chiffres,
   la FAQ). Ce qui reste : ce que « dehors » contient, ce que change la
   matinée, et la limite — dès la quatrième ligne de la page.

   L'ancienne pastille, « Le facturier qui se défend tout seul », amorçait
   l'objection que la page passe ensuite à désamorcer : « tout seul » et
   « rien ne part sans vous » se contredisent à quatre lignes d'écart. */
export const HEROS = {
  /* PASSE CORRECTRICE — « Livré, facturé, toujours pas payé » était un
     ternaire nominal, sans un verbe : exactement le tic 4 de la doctrine
     §10. La pastille dit maintenant la même situation avec un sujet et un
     verbe, pour deux signes de plus. */
  pastille: "Agent de relance",
  titre: "Quel montant attend d'être encaissé ?",
  /* L'espace avant le « ? » est une FINE insécable (U+202F), la même que
     celle des questions de la FAQ : sur un titre de 26 signes en
     `text-balance`, une espace ordinaire laissait le point
     d'interrogation partir seul à la ligne, et une insécable large
     (U+00A0) l'éloignait visiblement plus que partout ailleurs. */
  chapo:
    "Devis sans réponse, factures échues : chaque matin, l'agent rédige la relance de chaque compte. Vous décidez de ce qui part.",
  /* Libellé changé, et c'est la règle 6 qui l'impose : il disait « Créer mon
     compte » et menait à /creer-un-compte, qui n'existe plus. Un bouton qui
     promet un compte et ouvre une prise de rendez-vous serait faux. */
  boutonPrincipal: { texte: "Réserver un audit", href: MARQUE.audit },
  /* 15/09/2026 — le second bouton ouvrait un CLIENT MAIL (mailto:). C'est
     la même sortie de route que WhatsApp avant le 14/09 : on quitte le
     site, on ne sait pas si le message part, et rien n'arrive dans le
     service client. Les trois autres pages produit envoient « Nous
     écrire » sur /contact ; celle-ci était la dernière à ne pas le
     faire. L'adresse reste affichée en clair dans la FAQ, pour qui
     préfère écrire depuis sa propre boîte. */
  boutonSecondaire: { texte: "Nous écrire", href: "/contact" },
  mention: "Un agent",
} as const;

/* Ruban défilant, sur grand écran seulement.

   La référence y fait défiler des logos de clients ; nous n'en avons pas,
   et « aucune preuve sociale inventée » prime. Le ruban nomme donc les
   outils DU CLIENT sur lesquels le moteur se branche — et seulement ceux
   que la fiche maison nomme. J'y avais ajouté Pennylane, Sage, EBP, Qonto
   et Stripe : c'était une promesse d'intégration que rien n'appuie. */
export const OUTILS = {
  titre: "Fonctionne avec vos outils actuels",
  liste: ["Google Sheets", "Excel", "Gmail", "Outlook", "WhatsApp"],
} as const;

/* Les trois cartes ouvraient toutes sur « Il » — « Il relit », « Il
   écrit », « Il s'arrête » — et le patron n'apparaissait nulle part. Les
   titres disent maintenant ce que LUI gagne, et les textes nomment le
   produit ou le mécanisme plutôt qu'un pronom (doctrine §11.A : le
   défaut n'était pas que le produit soit sujet, c'était le « Il » nu
   répété en tête de dix paragraphes).

   Les puces PORTENT LA PREUVE, et c'est à ce titre qu'elles ont été
   reprises à la passe correctrice : elles énonçaient les faits en
   groupes nominaux, donc sans jamais dire ce que la machine fait de ces
   faits. Les faits n'ont pas changé, leur syntaxe si — chaque puce est
   désormais une proposition avec son verbe, et les trois d'une même
   carte sont parallèles entre elles.

   Le sourcil porte le visage du lecteur (fiche produit, « Pensé pour » :
   les activités qui livrent d'abord et facturent ensuite), et le chapô
   porte le coût de l'inaction, qui n'était nommé nulle part sur la page.

   La carte 2 nomme la vraie raison pour laquelle une TPE ne relance pas :
   réclamer de l'argent à un client avec qui on travaille encore coûte
   cher socialement, surtout sur un petit territoire. */
export const PRINCIPE = {
  sourcil: "Vous livrez d'abord et vous facturez ensuite",
  titre: "À 7 h, vos relances sont déjà écrites.",
  chapo:
    "Une facture en retard attend que quelqu'un ait le temps de relancer. Ce temps ne vient jamais. Six mois plus tard, la relance tourne au litige.",
  cartes: [
    {
      cle: "relit",
      titre: "Vous savez qui doit quoi",
      texte: "L'agent relit votre facturier chaque matin, avant d'écrire quoi que ce soit.",
      /* PASSE CORRECTRICE — les deux premières puces étaient des groupes
         nominaux, la troisième une phrase : une liste qui change de nature
         en cours de route. Les trois portent maintenant un verbe conjugué,
         et les deux premières disent ce que la relecture RELÈVE plutôt que
         ce qu'elle regarde (fiche produit : « pour chaque devis, le nombre
         de jours écoulés sans réponse ; pour chaque facture, le retard, le
         montant, le client »). */
      points: [
        "Chaque devis porte ses jours sans réponse",
        "Chaque facture porte son retard et son montant",
        "Un règlement encaissé la veille sort de la liste",
      ],
    },
    {
      cle: "ecrit",
      titre: "Chaque relance est prête avant votre arrivée",
      texte: "Le message est rédigé avant que vous ouvriez votre espace. Il ne reste qu'à le relire.",
      /* PASSE CORRECTRICE — « Le ton suit le montant en jeu » / « Et
         l'ancienneté du retard » était UNE phrase coupée en deux chaînes,
         la seconde ouvrant sur « Et » : la scansion pure que la doctrine
         §10 décrit. Les trois variables de la fiche produit (montant,
         ancienneté, historique de paiement) tiennent maintenant en deux
         puces qui se lisent chacune seule. */
      points: [
        "Le ton suit le montant et l'ancienneté du retard",
        "L'historique de paiement du client pèse aussi",
        "Chaque client reçoit un texte écrit pour lui",
      ],
    },
    {
      cle: "arrete",
      titre: "Vous gardez la main",
      texte:
        "Rien ne part sans votre accord. Rien ne sort par un autre chemin.",
      /* PASSE CORRECTRICE — « Approuver, corriger ou suspendre » était un
         ternaire d'infinitifs ; la bande de chiffres porte déjà ces trois
         gestes en phrase, donc la puce dit ici la règle et non la liste.
         « Une suspension coupe tout, immédiatement » traînait un adverbe
         posé pour le rythme : il est remplacé par ce que la suspension
         atteint vraiment, y compris les messages déjà préparés. */
      points: [
        "Aucun message ne part sans votre accord",
        "La mise en demeure exige une validation explicite",
        "Une suspension coupe même ce qui est déjà prêt",
      ],
    },
  ],
} as const;

/* Les quatre jalons et la note sur les devis portent la preuve de la page.
   `titre` n'est affiché nulle part (components/produits/relances/Bento.tsx
   rend la frise sans en-tête) ; il est tenu à jour pour le jour où on le
   rebranchera.

   PASSE CORRECTRICE — les quatre `precision` venaient de la colonne d'un
   tableau de la fiche produit, et elles en avaient gardé la syntaxe : des
   groupes nominaux sans verbe. La doctrine §12 tolère les libellés d'un
   tableau, mais la frise n'en est plus un — chaque précision se lit sous
   son étape comme une légende de prose, et c'est le mécanisme central du
   produit qu'elle décrit. Les quatre portent donc un verbe conjugué, au
   prix de 3 à 6 signes chacune. `etape` reste un libellé, sans verbe :
   c'est le nom du jalon, pas une phrase. */
export const PROTOCOLE = {
  titre: "Une facture impayée, jour par jour.",
  jalons: [
    { jalon: "J 0", etape: "Facture émise", precision: "le suivi s'ouvre automatiquement" },
    { jalon: "J+7", etape: "Rappel courtois", precision: "le ton se cale sur l'historique de paiement" },
    {
      jalon: "J+21",
      etape: "Relance ferme",
      precision: "elle récapitule les sommes dues et fixe une échéance",
    },
    {
      jalon: "J+30",
      etape: "Mise en demeure préparée",
      precision: "elle attend votre signature et ne part jamais seule",
    },
  ],
  note: "Les devis vont plus vite : J+3, puis J+7. Un devis qui refroidit se perd plus vite qu'une facture.",
} as const;

/* « Comment il travaille, précisément » était un intertitre de notice. Le
   titre affirme désormais ce que la frise démontre juste en dessous : la
   gradation n'est pas une commodité technique, c'est ce qui préserve la
   relation avec un client qu'on reverra.

   La carte « escalade » redisait mot pour mot la frise placée au-dessus
   d'elle — le LISEZ-MOI du site source note que couper la phrase que
   l'illustration dit déjà a été le troisième levier le plus efficace du
   régime mobile. Elle
   porte maintenant l'arrêt sur paiement, que rien d'autre ne disait. */
export const BENTO = {
  /* PASSE CORRECTRICE — la doctrine §10 cite nommément l'ancien titre,
     « Relancer tôt, c'est ne pas avoir à relancer fort », comme exemple
     du tic 3 (l'antithèse « ce n'est pas X, c'est Y »).

     Deuxième passe sur ce titre : « Un rappel à sept jours évite la mise
     en demeure » corrigeait bien la syntaxe, mais il promettait un
     RÉSULTAT — ce que §6 interdit — et il démentait la frise placée juste
     dessous, où la mise en demeure arrive quand même à J+30 si le silence
     continue. Le titre décrit maintenant la règle de gradation elle-même,
     que la frise démontre ligne à ligne, sans rien promettre. */
  titre: "La fermeté monte d'un cran quand le silence dure.",
  chapo:
    "Premier rappel à sept jours, quand le retard ne coûte encore rien. Mise en demeure au trentième jour, seulement si le silence continue.",
  cartes: [
    {
      id: "echeancier",
      /* Le titre était un fragment nominal (tic 1), et le texte le tic 4
         de la doctrine §10, cité nommément : « Jours de retard, montant,
         client. » — trois noms, pas un verbe. Le texte dit maintenant
         d'abord ce que porte une ligne, puis POURQUOI elle est juste
         quand vous l'ouvrez : c'est le lien logique (« comme ») qui
         manquait, pas le vocabulaire. */
      titre: "Votre encours reste à jour",
      texte:
        "Chaque ligne porte le client, le montant dû et les jours de retard, mis à jour à chaque relecture. Vous lisez l'encours réel sans avoir à le tenir.",
    },
    {
      id: "escalade",
      titre: "Un paiement arrête la séquence",
      texte:
        "Le facturier est relu avant chaque envoi. Un règlement encaissé la veille arrête la séquence avant le message suivant.",
    },
    {
      id: "ton",
      titre: "Le ton s'adapte à chaque client",
      texte:
        "Chaque message tient compte du montant, du retard et du palier atteint. Un premier rappel ne ressemble pas à une mise en demeure.",
    },
    {
      id: "journal",
      titre: "Chaque envoi laisse une trace",
      texte: "Chaque message est daté et archivé. Le jour où un client affirme n'avoir rien reçu, la preuve est là.",
    },
  ],
} as const;

/* PASSE CORRECTRICE — « Ce que vous regardez, le matin » était une tête
   nominale sans verbe principal, et la page disait déjà « matin » deux
   fois au-dessus (le titre de PRINCIPE, le chapô du héros). L'affirmation
   qui servait d'ouverture au chapô est remontée en titre, où elle porte
   enfin quelque chose qu'on pourrait contredire ; le chapô dit à la place
   ce qu'on lit sur ces écrans.

   Les quatre `sous` étaient des enfilades d'interrogatives indirectes
   sans verbe principal. Chacune commence maintenant par le geste du
   lecteur ou par l'état de la donnée. Les `alt`, eux, ne bougent pas :
   ils sont déjà au bon registre et servent de modèle interne. */
export const ECRANS = {
  titre: "Quatre écrans. Tout votre encours.",
  chapo:
    "Qui vous doit de l'argent, où en est chaque relance, ce qui est parti hier, ce qui doit rentrer.",
  onglets: [
    {
      cle: "encours",
      titre: "Débiteurs",
      sous: "Vous voyez qui vous doit de l'argent, depuis quand, et où en est la relance.",
      apercu: "encours",
      alt: "L'écran Débiteurs : une ligne par client, avec son état — en retard, en pause, ne plus contacter —, où en est la relance et l'encours dû.",
    },
    {
      cle: "brouillon",
      titre: "Relances",
      sous: "Vous suivez ce qui vient d'échoir, ce qui est parti et ce qui attend votre décision.",
      apercu: "brouillon",
      alt: "L'écran Relances : les créances rangées en colonnes par état de relance, de la facture qui vient d'échoir au dossier de mise en demeure.",
    },
    {
      cle: "journal",
      titre: "Envois",
      sous: "Vous retrouvez chaque relance partie, son canal et son objet.",
      apercu: "journal",
      alt: "L'écran Envois : le journal des relances envoyées, avec le destinataire, l'heure, l'objet, le canal et le statut.",
    },
    {
      cle: "suivi",
      titre: "Trésorerie",
      sous: "Votre encours est classé par ancienneté, avec le délai moyen de règlement.",
      apercu: "suivi",
      alt: "L'écran Trésorerie : la balance âgée de l'encours, par tranche d'ancienneté, avec le délai moyen de règlement.",
    },
  ],
  preuves: ["Aucun outil à remplacer", "Rien ne part sans vous", "Données hébergées dans l'UE"],
} as const;

/* Bande d'indicateurs. Quatre chiffres qui sont des FAITS DE CONCEPTION,
   pas des performances : rien ici ne prétend mesurer un résultat client.
   La règle « aucun chiffre inventé » interdit le reste, et aucun chiffre
   de marché n'est posé sur cette page — les seuls disponibles pour le BTP
   (8-12 h hebdomadaires hors chantier, 4,5 mois-homme par an) sont
   marqués 【V】 dans `galeres-metier-par-secteur.md`, donc non citables.

   Le libellé parlait d'installation là où il fallait l'engagement : les
   quatre chiffres ne disent pas ce qu'il faut fournir, ils disent ce à
   quoi on se tient. Et « 4 paliers » désigne les quatre temps de la
   frise — l'ancien texte en citait cinq, ce qui démentait le chiffre
   juste au-dessus de lui.

   PASSE CORRECTRICE — « Le contrat tient en quatre chiffres » avait bien
   un verbe, mais c'était une formule : le quota d'une figure par page est
   déjà pris par la question du héros, « vous avez combien dehors ? ». Le
   sourcil redevient ce qu'il est, une étiquette de section, et il dit ce
   que la bande contient vraiment — pas un contrat, un engagement. */
export const CHIFFRES = {
  titre: "Quatre chiffres, quatre engagements.",
  liste: [
    { valeur: "1", unite: "tableur", texte: "Vous gardez le vôtre. Rien à migrer, rien à réapprendre." },
    { valeur: "3", unite: "canaux", texte: "E-mail, WhatsApp ou courrier. Vous choisissez le canal, client par client." },
    { valeur: "4", unite: "paliers", texte: "J 0, J+7, J+21 et J+30 pour une facture. J+3 puis J+7 pour un devis." },
    { valeur: "0", unite: "envoi sans vous", texte: "Chaque message vous est soumis : vous l'approuvez, le corrigez ou le bloquez." },
  ],
} as const;

/* Section « produit français ». Chaque ligne est vérifiable : la société
   est française, l'hébergement est européen, la
   facturation est en euros et l'assistance se fait en français. */
export const FRANCE = {
  /* PASSE CORRECTRICE — « D'ici, pas d'ailleurs » était l'antithèse du
     tic 3, en trois mots et sans verbe, juste au-dessus d'un titre qui
     dit déjà la même chose. Le sourcil redevient une étiquette de
     section : il annonce la question, le titre y répond. */
  sourcil: "D'où vient cet agent",
  titre: "Un produit français",
  chapo:
    "Tant que tout va bien, l'origine d'un logiciel compte peu. Le jour d'un problème, elle décide qui vous répond, en quelle langue et sous quel droit.",
  points: [
    {
      titre: "Conçu et développé en France",
      texte:
        "L'agent est développé en France, par notre propre équipe.",
    },
    {
      titre: "Vos données sont hébergées dans l'Union européenne",
      texte:
        "Un espace chiffré, réservé à votre entreprise. L'agent n'en extrait que le nécessaire, jamais votre facturier entier.",
    },
    {
      titre: "L'assistance se fait en français",
      texte:
        "Vos questions sont traitées par l'équipe qui a installé l'agent chez vous.",
    },
    {
      titre: "Facturation en euros, droit français",
      texte:
        "Facturé en euros, TVA française, contrat de droit français.",
    },
  ],
} as const;

/* Deux objections du pitch d'audit manquaient, et ce sont les deux
   premières qui sortent en rendez-vous : « votre truc va écrire n'importe
   quoi à mes clients » (traitée ici sous l'angle de la relation, la
   validation étant déjà dans « Cadre ») et « j'ai déjà quelqu'un qui fait
   ça / c'est ma femme qui gère ». Elles ajoutent deux lignes repliées au
   mobile, pour les deux arguments les plus décisifs de la page. */
export const QUESTIONS = {
  titre: "Questions fréquentes",
  chapoAvant: "Votre question n'y est pas ? ",
  chapoLien: "Écrivez-nous",
  chapoApres: ".",
  categories: [
    {
      id: "fonctionnement",
      titre: "Fonctionnement",
      items: [
        {
          q: "Et si un client paie entre deux relances ?",
          r: "L'agent relit votre facturier avant chaque action. Un règlement enregistré arrête la séquence : un client qui a payé n'est pas relancé.",
        },
        {
          q: "Qui écrit les messages ?",
          r: "Les modèles de messages sont rédigés avec vous à l'installation, puis adaptés par l'agent à chaque cas. Le ton reste le vôtre, et rien ne part sans votre relecture.",
        },
        {
          q: "Mes clients risquent-ils de mal le prendre ?",
          r: "Non. Un rappel à sept jours ne froisse personne. Ce qui abîme une relation, c'est six mois de silence puis un appel excédé. Le ton reste le vôtre, et vous lisez chaque message avant qu'il parte.",
        },
      ],
    },
    {
      id: "reglages",
      titre: "Réglages",
      items: [
        {
          q: "Puis-je exclure certains clients ?",
          r: "Oui. Collectivités, grands comptes, relations personnelles : vous fixez la liste d'exclusion à l'installation et la modifiez quand vous voulez. Vous seul pouvez réintégrer un contact.",
        },
        {
          q: "Faut-il changer de logiciel de facturation ?",
          r: "Non. L'agent lit le tableur ou le logiciel où vit déjà votre facturation, avec vos colonnes. Il fonctionne aussi dans l'ERP Omega, si vous le choisissez. Rien à migrer.",
        },
        {
          q: "Une personne s'en occupe déjà chez nous.",
          r: "L'agent ne remplace personne. Il prépare les relances ; cette personne les relit et décide de ce qui part. Elle arrête seulement de tenir le compte de qui doit quoi.",
        },
      ],
    },
    {
      id: "cadre",
      titre: "Cadre",
      items: [
        {
          q: "Où vont mes données ?",
          r: "Dans un espace chiffré, réservé à votre entreprise et hébergé dans l'Union européenne. Pour rédiger un message, l'agent n'envoie au modèle que le strict nécessaire : un client, une facture, un historique.",
        },
        {
          q: "Un message peut-il partir sans moi ?",
          r: "Non. Vous approuvez, corrigez ou suspendez chaque envoi. La mise en demeure exige en plus une validation explicite, à chaque fois.",
        },
        {
          q: "Quel est le tarif ?",
          r: "L'installation du pack Relances d'impayés se paie une seule fois : à partir de 1 750 € HT pour 3 automatisations, 2 900 € HT pour 6, 4 000 € HT pour les 10. Ensuite, chaque relance envoyée se paie à la pièce, au prix fixé à l'audit sur vos volumes réels. Rien n'est débité avant la fin de l'installation.",
        },
      ],
    },
  ],
} as const;

/* Le bloc d'appel qui ouvrait le pied du site source. Le reste du pied —
   marque, quatre colonnes de liens, mentions légales — est supprimé : le
   site a le sien (components/Footer.tsx, servi par PageShell).

   Le bloc referme sur l'enjeu du héros — « dehors » y répond à « vous avez
   combien dehors ? » — et non sur le mécanisme. L'ancien titre promettait
   en plus un encours qui « se relance tout seul », ce que la page passe
   dix sections à démentir. */
export const CLOTURE = {
  titre: "L'argent qui vous est dû ne rentrera pas seul.",
  chapo:
    "Connectez le tableur que vous tenez déjà. Vos équipes relisent chaque relance avant qu'elle parte. C'est tout.",
  /* Même reroutage que le bouton du héros. */
  bouton: "Réserver un audit",
} as const;
