/* ══════════════════════════════════════════════════════════════════════
   Tout le texte de la page vit ici, et nulle part ailleurs.

   Source : OMEGA/textes-pages-paquets-REECRIT.md, fiche « 3. FRONTD —
   /offres/demandes-clients ». Rien n'est inventé pour meubler une section :
   là où la référence pose une preuve sociale (témoignages nominatifs,
   compteurs de traction, logos de clients), on garde la géométrie et on met
   du vrai de même forme — voir LISEZ-MOI.md, « Écarts assumés ».

   ── RAPATRIEMENT 11/09/2026 ──────────────────────────────────────────
   Ce fichier est l'ex-`lib/contenu.ts` du site autonome OMEGA/frontd-site,
   dont la page d'accueil devient /offres/demandes-clients sur omegaai.fr.
   Le texte est repris AU MOT PRÈS. Trois coupes, et seulement trois, toutes
   imposées par la règle 6 du contrat (omega-site-v3/RAPATRIEMENT.md) :

     · `NAV`       — l'entête du site source disparaît, celle d'omegaai.fr
                     la remplace ; ses six ancres n'ont plus de barre.
     · `PIED`      — son pied de page disparaît de même : components/Footer
                     est celui du site, et la signature Ω n'a plus de sens
                     sur un site qui EST Omega. Sa phrase (« Il répond quand
                     vous avez fermé… ») et sa mention de bas de page
                     partent avec lui ; la mention « exemples » est déjà
                     portée deux fois dans la page, par METIERS et JOURNEE.
     · `CONNEXION` — la page /connexion du site source n'existe plus. Le
                     compte se prenait déjà sur omegaai.fr : on y est.

   Et les liens absolus vers omegaai.fr deviennent des chemins relatifs — on
   EST omegaai.fr. `app.omegaai.fr` reste absolu : c'est le cockpit, un
   autre domaine.

   ── RESYNCHRONISATION 11/09/2026, 09 h ───────────────────────────────
   La source a été réécrite en profondeur après le rapatriement (chapôs
   remis en phrases complètes, produit rendu à son nom au lieu d'un « il »
   nu, titres pourvus d'un verbe conjugué). Les 26 valeurs concernées ont
   été RÉ-EXTRAITES DE LA SOURCE PAR SCRIPT et réinjectées telles quelles,
   avec leurs commentaires d'origine : c'est la seule façon de ne pas
   aplatir les espaces fines insécables (U+202F dans « 21 h 47 », « 9 h 30 »)
   ni les insécables avant les deux-points. Les commentaires de ce fichier
   sont donc ceux de la source, sauf ceux qui portent un écart du port.

   Deux écarts SURVIVENT à la resynchronisation, et il ne faut pas les
   défaire en relisant la source :

     · Les quatre appels à l'action disent « Réserver un audit » et pointent
       sur `MARQUE.audit`, là où la source dit « Créer un compte » (voir le
       commentaire de `MARQUE` juste dessous).
     · Les trois teintes de cartes, `bg-soft-green` / `-purple` / `-pink`,
       naissaient du `@theme` du site source. Ce `@theme` n'existe pas ici,
       et une utilitaire absente ne peint rien EN SILENCE : elles sont
       écrites en valeur arbitraire (`bg-[#edf4ea]`…). Même règle pour
       `shadow-integration` et `animate-marquee`, devenues des règles de
       app/offres/demandes-clients/accueil.css.
   ══════════════════════════════════════════════════════════════════════ */

export const MARQUE = {
  nom: "FRONTD",
  role: "demandes entrantes & avis",
  signature: "un système Omega.AI",
  espace: "https://app.omegaai.fr",
  audit: "/reserver-un-audit",
  /* Un seul compte pour tous les systèmes Omega. Le site source renvoyait
     vers `https://omegaai.fr/connexion` parce qu'il était ailleurs ; ici le
     domaine tombe et le chemin ne bouge pas — /connexion existe, et
     ?mode=creation y ouvre directement la création.

     11/09 — les quatre boutons « Créer un compte » de cette page sont
     repassés sur `audit`. Un compte créé tout seul n'ouvre rien : FRONTD
     exige la fiche de connaissances de l'entreprise (neuf sujets,
     une heure d'entretien) avant de répondre à qui que ce soit en son nom.
     C'était d'ailleurs la consigne d'origine du produit — « réserver un
     audit » et non « commencer ». `creation` reste déclaré : c'est la
     porte à rouvrir le jour où une inscription libre-service existe.

     15/09 (matin) — cette porte est FERMÉE pour tout le site : /connexion
     ne crée plus de compte et ?mode=creation redirige sur
     /reserver-un-audit.
     15/09 (soir) — /connexion N'EXISTE PLUS du tout. Les deux constantes
     sont retirées plutôt que laissées à pointer sur un 404 : la seule
     porte de connexion du parc est app.omegaai.fr. */
} as const;

export const HERO = {
  etiquette: "Demandes entrantes & avis",
  titre: "Une demande reçue à 21 h obtient sa réponse à 21 h",
  /* Le titre est le meilleur du parc : intact. Le chapô, lui, posait la
     scène en deux morceaux soudés (« Vous êtes sous un capot, ou déjà
     couché. ») puis finissait sur une chute sans verbe principal — c'est la
     scansion relevée le 11/09. La scène est désormais une subordonnée, le
     lien temporel est écrit (« Pendant que »), et le garde-fou termine en
     phrase complète. Les canaux ont leur section, la minute revient dans
     APPORT. */
  chapo:
    "Pendant que vos équipes sont en intervention ou que le service est fermé, votre client reçoit sa réponse, et elle ne dit rien que vous n'ayez validé.",
  principal: { libelle: "Réserver un audit", href: MARQUE.audit },
  secondaire: { libelle: "Voir ce que FRONTD répond", href: "#apport" },
};

/* Le ruban de la référence fait défiler des logos de clients. FRONTD n'a
   pas de client sous ce nom, et « aucune preuve sociale inventée » prime.
   Le ruban porte donc les demandes elles-mêmes, annoncées comme des
   exemples — c'est ce que le moteur lit toute la journée. */
export const BANDEAU = {
  intro: ["Ce qui arrive", "le soir et le week-end", ", exemples"],
  items: [
    "« Vous livrez sur la zone industrielle ? »",
    "« Votre prix pour 40 palettes ? »",
    "« Vous avez un créneau cette semaine ? »",
    "« Ce modèle est encore en stock ? »",
    "« C'est urgent, vous répondez quand ? »",
  ],
};

/* ── Le coût ─────────────────────────────────────────────────────────
   Cette section ne décrit plus le produit : elle porte le COÛT de ne rien
   faire, le seul temps que la page n'avait nulle part. Son titre et son
   chapô sont la phrase qui dormait au milieu de METIERS, en position de
   citation décorative — c'est l'argument central du produit, il est
   maintenant en deuxième position de lecture, juste après le héros.

   « trois autres entreprises » : illustration d'un scénario, PAS une mesure.
   Aucune source publique ne la chiffre, et il ne faut pas la défendre comme
   une donnée — si un jour elle doit être chiffrée, il faudra la sourcer ou
   l'enlever.

   Les deux compteurs de la référence (« 350K+ » et « 4.8 ») étaient de la
   traction commerciale ; ils restent deux faits de conception, mais dits du
   point de vue du lecteur — ce que SON client attend, ce qu'il ne risque
   pas. */
export const APPORT = {
  etiquette: "Le coût de l'attente",
  titre: "Une demande lue le lundi à 9 h n'est plus une demande",
  chapo:
    "Pendant ce temps, le client a écrit à trois autres entreprises, et le premier qui lui a répondu a pris l'affaire.",
  bouton: { libelle: "Réserver un audit", href: MARQUE.audit },
  faits: [
    {
      chiffre: "< 1 min",
      texte:
        "C'est ce que votre client attend, le dimanche comme le 15 août.",
    },
    {
      chiffre: "0",
      texte:
        "Réponse inventée : quand il ne sait pas, il transfère à vos équipes.",
    },
  ],
};

/* Le titre se rend en trois morceaux (début gris, les DEUX mots en sombre,
   puis liaison + fin en sombre) : la forme n'accepte pas un troisième mot,
   `titreMots[0]` et `[1]` sont lus en dur dans le composant. Il portait une
   énumération de fonctions dont le produit était le sujet, puis deux
   indépendantes soudées à la virgule (« Il est 21 h 47, vous avez fermé. »).
   La scène est maintenant une subordonnée de temps, et le client reste
   sujet de la principale.

   Les trois cartes disaient « Répondre… », « Trier… », « Demander… » —
   trois infinitifs de notice. Chacune affirme maintenant quelque chose du
   point de vue du patron ou de son client. La règle de densité du 10/09
   (une phrase par carte, jamais deux) est levée le 11/09 : le correctif de
   doctrine demande deux à trois phrases par bloc — ce que c'est, ce que ça
   fait, ce qui vous reste. Tenue à une seule phrase, chaque carte se
   réécrivait en fragment sans verbe. */
export const CAPACITES = {
  etiquette: "Ce que FRONTD fait",
  titreDebut: "Quand un client écrit à 21 h 47, il obtient",
  titreMots: ["sa réponse", "son créneau"],
  titreLiaison: "et",
  titreFin: "son rappel la veille.",
  cartes: [
    {
      teinte: "bg-[#edf4ea]",
      etiquette: "Réception",
      titre: "La réponse part avant la réouverture",
      texte:
        "FRONTD lit le message dès qu'il arrive, puis répond dans la minute à partir de la base que vous avez construite avec nous. Vos équipes relisent l'échange le lendemain.",
      panneau: "conversation",
    },
    {
      teinte: "bg-[#ebebfc]",
      etiquette: "Qualification",
      titre: "Une urgence ne finit pas dans la file d'attente",
      texte:
        "Chaque demande est d'abord qualifiée, puis elle suit le circuit que vous avez défini pour son type. Quand elle est urgente, le téléphone de l'astreinte sonne.",
      panneau: "tri",
    },
    {
      teinte: "bg-[#f7eff7]",
      etiquette: "Avis",
      titre: "L'avis se demande quand le client est content",
      texte:
        "La demande d'avis part dans les trois jours qui suivent le règlement, puis elle est relancée deux fois au maximum. La même personne n'est plus sollicitée avant six mois.",
      panneau: "avis",
    },
  ],
};

/* Le titre disait « Installé… » : le produit en sujet, dès le premier mot,
   dans la section qui répond à l'objection « encore un logiciel à
   apprendre ». C'est le lecteur qui ne change rien, c'est donc lui le sujet.
   Les trois étapes portaient des noms de phase (« Construction de la
   base ») ; leurs libellés disent maintenant ce que le patron vit — une
   heure, un branchement, une semaine.

   Le 11/09, le chapô et les trois textes ont été repris : c'étaient des
   énumérations de noms sans un seul verbe, alors que c'est ici que se
   trouve l'information la plus utile de la page — ce qu'on attend du client
   et ce qui se passe quand. Les libellés d'étape, eux, restent nominaux :
   ce sont des étiquettes de tuile, pas de la prose. */
export const ETAPES = {
  etiquette: "Installation",
  titre: "Vous ne changez ni vos numéros, ni vos habitudes",
  chapo:
    "L'installation demande une heure d'entretien, puis le branchement de vos canaux, et une semaine de rodage pendant laquelle vos équipes relisent chaque réponse.",
  bouton: { libelle: "Réserver un audit", href: MARQUE.audit },
  etapes: [
    {
      numero: "01",
      titre: "Une heure d'entretien",
      texte:
        "Nous construisons ensemble la base de votre entreprise : tarifs, horaires, durées d'intervention, règles internes. Rien d'autre ne sera dit à un client.",
    },
    {
      numero: "02",
      titre: "L'intégration",
      texte:
        "Nous connectons WhatsApp Business, votre messagerie et votre agenda, si bien que vos clients continuent d'écrire au même numéro qu'hier.",
    },
    {
      numero: "03",
      titre: "Une semaine en double",
      texte:
        "Vos équipes reçoivent copie de chaque réponse la première semaine, et nous corrigeons sur des cas réels. FRONTD prend ensuite son rythme sur les postes que vous ouvrez.",
    },
  ],
};

/* La référence pose six logos d'éditeurs (Github, Slack, Stripe…). On ne
   réutilise pas les marques d'un tiers, et un bandeau d'outils nomme ceux
   DU CLIENT : ce sont les quatre canaux de la fiche, écrits en toutes
   lettres et dessinés au trait, jamais en logo. */
export const CANAUX = {
  etiquette: "Canaux",
  /* Le titre et le chapô disaient la MÊME chose deux fois (« il se branche
     là où vos clients écrivent » / « il se place derrière les canaux que
     vous utilisez »). Le défaut n'était pas d'avoir le produit pour sujet —
     §11.A de la doctrine l'autorise, et c'est la seule façon de dire ce
     qu'il fait — mais de le dire deux fois, et avec « il » nu. Le titre
     répond donc à l'objection du pitch d'audit telle qu'elle se dit en
     rendez-vous (« encore un logiciel à apprendre… »), et le chapô nomme le
     mécanisme.

     Le 11/09, l'anaphore publicitaire du titre (« Zéro… zéro… ») est
     déposée, et le chapô perd sa chute de quatre mots (« Vous n'ouvrez
     rien. »). Le titre ne parle plus de numéros : c'est le titre d'ETAPES
     qui porte ce point (« ni vos numéros, ni vos habitudes »), et les
     répéter à deux sections d'écart faisait doublon.

     Contrainte de gabarit : les quatre tuiles de Canaux.tsx sont posées en
     absolu à `top-39` et `top-82`, donc le bloc centré ne doit pas gagner
     de ligne — le chapô tient en deux lignes à `max-w-lg`. */
  titre: "Vous n'avez aucun logiciel de plus à ouvrir",
  chapo:
    "FRONTD se place derrière les canaux que vous utilisez déjà, puis répond à partir de votre base.",
  bouton: { libelle: "Voir l'installation", href: "#etapes" },
  /* Deux libellés, comme la référence : la pastille flottante est centrée
     sur sa tuile, donc un nom long déborde sur le bouton du centre — les
     deux emplacements intérieurs prennent le nom court, la liste sous `xl`
     donne le nom complet. */
  tuiles: [
    { nom: "WhatsApp Business", court: "WhatsApp Business", icone: "bulle" },
    { nom: "Fiche Google Business", court: "Fiche Google Business", icone: "etoile" },
    { nom: "Google Agenda", court: "Agenda", icone: "agenda" },
    { nom: "Gmail / Outlook", court: "Mail", icone: "enveloppe" },
  ],
};

/* La maçonnerie de témoignages est conservée au pixel. Les quatre personnes
   nommées et leurs portraits disparaissent : la grande carte porte le
   problème, les trois petites portent trois situations, et les secteurs
   sont ceux de la fiche. */
/* ── Pour qui ────────────────────────────────────────────────────────
   La maçonnerie de cartes de la référence tenait debout sur un écran large
   et s'empilait mal sur un téléphone : quatre pavés à la file, dont un noir
   qui n'annonçait rien. Remplacée par un segmented control — un métier à la
   fois, une demande, ce qui en sort. Les quatre métiers sont ceux de la
   fiche ; les demandes sont des exemples, et la dernière montre le
   garde-fou : hors de la base, il transfère au lieu de supposer. */
export const METIERS = {
  etiquette: "Pour qui",
  /* Le titre affirme quelque chose qu'un lecteur peut contredire (« si,
     j'ai quelqu'un le soir » — et celui-là n'est pas notre client), et il
     désigne les quatre onglets posés juste dessous. Le 11/09 il a repris un
     verbe conjugué : « Quatre métiers sans personne pour répondre le soir »
     était un groupe nominal, pas une phrase.

     Le chapô n'est plus « Une demande lue le lundi à 9 h… » : cette phrase
     est remontée en titre d'APPORT, à la deuxième place de la page, là où
     elle porte. Sa remplaçante vient de la matière — galeres-metier §17,
     dépannage d'urgence : « rater un appel, c'est le dépannage qui part chez
     le confrère, définitivement ». Elle ouvrait sur « il n'y a pas de
     deuxième chance », un aphorisme de plus sur une page qui en comptait
     déjà deux ; elle dit maintenant le mécanisme exact du §17 — le client
     ne laisse pas de message, et il ne rappelle pas. */
  titre: "Personne ne répond en dehors des heures d'ouverture",
  citation:
    "Dans l'urgence, le client ne laisse pas de message : il appelle le suivant sur la liste, et il ne rappelle pas.",
  mention: "Exemples de demandes",
  secteurs: [
    {
      cle: "apres-vente",
      nom: "Après-vente",
      icone: "cle",
      heure: "Samedi 21 h 47",
      demande: "Un de nos véhicules est immobilisé, vous avez un créneau ?",
      issue: "Créneau réservé, rappel la veille",
      transfert: false,
    },
    {
      cle: "industrie",
      nom: "Industrie",
      icone: "industrie",
      heure: "Dimanche 10 h",
      demande: "Vous pouvez livrer 40 palettes la semaine prochaine ?",
      issue: "Demande qualifiée, transmise au commercial",
      transfert: false,
    },
    {
      cle: "cabinets",
      nom: "Cabinets",
      icone: "mallette",
      heure: "Mardi 6 h 30",
      demande: "Vos honoraires pour un premier rendez-vous ?",
      issue: "Répondu depuis la base construite avec vous",
      transfert: false,
    },
    {
      cle: "reseaux",
      nom: "Réseaux",
      icone: "boutique",
      heure: "Jeudi 23 h 05",
      demande: "Vous avez ce modèle en stock à l'entrepôt ?",
      issue: "Transféré : la réponse n'est pas dans sa base",
      transfert: true,
    },
  ],
} as const;

/* ── La journée ──────────────────────────────────────────────────────
   Le flux qui défile dans `components/Journee.tsx`. `dehors` = hors
   horaires ; `transfert` = ce qui passe la main au patron au lieu d'être
   traité seul. Des exemples, pas le relevé d'un client. */
export const JOURNEE = {
  etiquette: "La journée",
  /* « l'atelier » enfermait toute la section dans le garage. Et le chapô
     annonçait ce que la pile montre déjà (« chaque demande trouve sa
     réponse ») : il dit maintenant ce qu'on ne verrait pas sans lui — les
     quatre demandes sont TOUTES hors horaires, ce que le lecteur peut
     vérifier sur les cartes à côté. */
  titre: "Vos clients écrivent quand le service est fermé",
  chapo: "Aucune de ces quatre demandes n'est arrivée pendant vos heures d'ouverture.",
  mention: "Exemples de demandes, pas le relevé d'un client",
  demandes: [
    {
      heure: "6 h 30",
      canal: "Mail",
      texte: "Quel délai pour une révision ?",
      issue: "Répondu à 6 h 31",
      dehors: true,
      transfert: false,
    },
    {
      heure: "21 h 47",
      canal: "WhatsApp",
      texte: "Un de nos véhicules est immobilisé, vous avez un créneau ?",
      issue: `Rendez-vous posé samedi 9 h 30`,
      dehors: true,
      transfert: false,
    },
    {
      heure: "23 h 05",
      canal: "WhatsApp",
      texte: "Mon pare-brise est fissuré, c'est urgent.",
      issue: "Transféré : l'astreinte est appelée",
      dehors: true,
      transfert: true,
    },
    {
      heure: "Dimanche",
      canal: "Mail",
      texte: `Je peux passer lundi à 18 h ?`,
      issue: "Créneau réservé, rappel la veille",
      dehors: true,
      transfert: false,
    },
  ],
} as const;

export const QUESTIONS = {
  etiquette: "Questions",
  /* « Les questions qu'on nous pose » n'affirmait rien. Le titre dit qu'il y
     a des objections et qu'on ne les esquive pas — c'est exactement ce que
     fait la liste.

     Cette FAQ est le bon registre du site, et elle a servi de modèle au
     correctif du 11/09 : phrases complètes, mécanisme expliqué, rien à
     reformuler. Quatre retouches de détail seulement — l'antithèse « ce
     n'est pas X, c'est Y » de la première réponse, le « Il » nu en tête de
     la deuxième, la réponse d'un seul mot à la quatrième, et le fragment
     sans verbe qui ouvrait la cinquième. Le reste vient de la fiche et ne
     se retouche pas ; en particulier « aucun tri des mécontents », qui ne
     s'affaiblit sous aucun prétexte. */
  titre: "Les objections que nous entendons, et nos réponses",
  items: [
    {
      q: "Le client comprend-il qu'il ne parle pas à un humain ?",
      r: "La mention figure dans la première réponse, dans les termes que vous choisissez à l'installation. Un client s'accommode de parler à une machine. Ce qui l'agace, c'est d'attendre jusqu'à lundi.",
    },
    {
      q: "Et si FRONTD invente une réponse ?",
      r: "FRONTD ne peut répondre qu'à partir de la base construite avec vous. Hors de ce périmètre, il ne formule pas d'hypothèse : il transfère la demande à vos équipes, avec la fiche de son escalade.",
    },
    {
      q: "Que se passe-t-il si deux clients demandent le même créneau ?",
      r: "La réservation s'écrit directement dans votre agenda, en temps réel. Le second créneau n'apparaît plus comme disponible, et le client se voit proposer les suivants.",
    },
    {
      q: "Qui décide de ce qui part seul ?",
      r: "C'est vous qui fixez la frontière. Les premières semaines, tout vous est soumis avant envoi. Ensuite, vous décidez poste par poste ce qui part seul et ce qui attend votre accord. Chaque échange, transféré ou non, reste archivé et consultable.",
    },
    {
      q: "Et les avis, comment sont-ils demandés ?",
      r: "La demande part dans les trois jours qui suivent le règlement, avec deux relances au maximum et six mois de carence par personne. Les messages sont écrits d'avance et identiques pour tout le monde : aucun tri des mécontents. C'est interdit, et cela finit toujours par se voir.",
    },
  ],
} as const;

export const CLOTURE = {
  etiquette: MARQUE.signature,
  titre: `${MARQUE.nom} est-il adapté à votre organisation ?`,
  principal: { libelle: "Réserver un audit", href: MARQUE.audit },
  /* 15/09 (soir) — le bouton disait « Se connecter » et menait à
     /connexion, page supprimée : Teo, « plus rien sur le site ne doit
     renvoyer à une page de connexion ». Le second geste d'une clôture qui
     vend un système est d'aller voir ce qu'il coûte, pas d'entrer dans un
     compte. */
  secondaire: { libelle: "Estimer mon prix", href: "/tarifs" },
} as const;

export const CIRCUITS_FIGURE = {
  etiquette: "Le tri",
  noeud: "Qualification",
  entrees: ["WhatsApp", "Mail"],
  sorties: [
    { nom: "Devis", suite: "chiffré", transfere: false },
    { nom: "Renseignement", suite: "répondu", transfere: false },
    { nom: "Urgence", suite: "transféré", transfere: true },
    { nom: "Réclamation", suite: "transféré", transfere: true },
  ],
  mention: "Schéma des quatre circuits définis à l'installation",
} as const;

/* ── La bande « produit français » ───────────────────────────────────
   Trois faits vérifiables, et rien de plus. Ce qui est écrit ici est
   aligné sur les mentions légales d'omegaai.fr : entreprise française,
   droit français, et données hébergées dans l'UNION EUROPÉENNE — pas en
   France. Ne pas « améliorer » ce dernier point : ce serait faux.
   Et on ne nomme jamais la région : le produit se vend comme français,
   pas comme guadeloupéen (Teo, 15/09). */
export const FRANCAIS = {
  etiquette: "Produit français",
  /* « en France » voisine dangereusement avec l'hébergement — qui est
     européen, pas français : c'est pour ça que les deux faits sont séparés.
     Nommer la région est INTERDIT depuis le 15/09 (Teo) — le produit se
     vend comme français.

     Le 11/09, le titre a pris un sujet et un verbe (« Conçu, installé et
     suivi… » était une série de participes, pas une phrase), et les trois
     faits sont passés du fragment à la phrase complète. « installé » est
     tombé pour tenir dans la longueur du titre d'origine : la règle des
     10 % prime, et l'installation a sa section. Nommer « FRONTD »
     en sujet aurait porté le titre à +18 %, donc c'est « Tout » qui le
     prend.

     Le contenu, lui, ne bouge pas d'un mot : entreprise française,
     droit français, hébergement dans l'UNION EUROPÉENNE. Jamais « hébergé en France », jamais « vos données ne
     quittent jamais l'Europe » — les deux sont faux, et ce sont des
     interdits du parc. */
  titre: "Tout est conçu et suivi depuis la France",
  faits: [
    {
      cle: "Éditeur",
      titre: "Une entreprise française",
      texte:
        "L'entreprise est établie en France, donc elle relève du droit français.",
    },
    {
      cle: "Données",
      titre: "Hébergées dans l'Union européenne",
      texte:
        "Chaque entreprise a son espace cloisonné, et rien n'y est jamais revendu.",
    },
    {
      cle: "Langue",
      titre: "Écrit et parlé en français",
      texte:
        "Les réponses emploient le vocabulaire de votre métier, et le suivi se fait au téléphone.",
    },
  ],
  lien: { libelle: "Où vont vos données", href: "/vos-donnees" },
} as const;

/* La conversation de la fiche, jouée telle quelle dans le panneau du haut.
   Rien n'est retouché : c'est le scénario écrit dans le texte source. */
export const CONVERSATION = {
  contexte: "Samedi, 21 h 47",
  sousTitre: "Le service est fermé, FRONTD répond",
  messages: [
    {
      de: "client",
      heure: "21:47",
      texte: "Bonsoir, un de nos utilitaires est immobilisé. Vous avez un créneau samedi ?",
    },
    {
      de: "moteur",
      heure: "21:47",
      texte:
        "Bonsoir ! Oui, l'atelier reçoit samedi de 8 h à 13 h. Comptez environ 45 minutes pour un diagnostic. Je peux vous réserver samedi 9 h 30 ?",
    },
    { de: "client", heure: "21:52", texte: "Parfait pour 9h30 👍" },
    {
      de: "moteur",
      heure: "21:52",
      texte:
        "C'est réservé, samedi 9 h 30. Vous recevrez un rappel vendredi soir. Bonne soirée !",
    },
  ],
  issue: "Rendez-vous créé dans l'agenda du service · client confirmé",
};
