/* ══════════════════════════════════════════════════════════════════════
   FILED — tout le texte de la page, en un seul endroit.

   RAPATRIÉ LE 11/09/2026 depuis OMEGA/filed-site/lib/contenu.ts, où il
   servait la page d'accueil du site SaaS autonome. Le site disparaît,
   sa page d'accueil devient /offres/factures-fournisseurs. Le texte est
   repris AU MOT PRÈS : les seules coupes sont celles qu'impose la
   règle 6 du rapatriement (entête, pied, comptes) — voir ci-dessous.

   DEUX RÈGLES qui priment sur la ressemblance avec la référence :

   1. AUCUNE PREUVE SOCIALE INVENTÉE. La référence place ici deux
      témoignages clients signés, avec des chiffres de résultat. FILED
      n'a pas encore de client : la section est REMPLACÉE (voir
      GARDE_FOUS) par ce que le système refuse de faire — qui est vrai,
      vérifiable, et argumente mieux.

   2. AUCUN MONTANT INVENTÉ. Les paliers ci-dessous portent `prix: null`
      tant que Teo n'a pas tranché. La page affiche alors « à définir ».
      Renseigner `prix` et `periode` suffit à publier la grille.
   ══════════════════════════════════════════════════════════════════════ */

/* `omegaLien` et `bandeau` sont partis avec l'entête et le pied du site
   source (règle 6). Le lien vers omegaai.fr n'a plus de sens sur
   omegaai.fr, et la signature Ω non plus : le site EN EST un.
   Il reste le nom du produit et son endossement, tous deux affichés dans
   le héros de la page. */
export const MARQUE = {
  nom: "FILED",
  endos: "un système Omega",
};

/* La barre de navigation d'ancres du site source (NAV) est partie avec
   son entête : le site a la sienne, et deux barres l'une sur l'autre
   n'ont jamais fait une page. Les sept ancres (#principe, #garde-fous,
   #fonctionnement, #francais, #suivi, #tarifs, #questions) existent
   toujours sur la page — elles servent les boutons secondaires. */

/* Le héros porte LA SCÈNE, pas le sommaire des fonctions.

   Avant : « Vos factures fournisseurs / lues, contrôlées, classées » —
   un titre où le lecteur n'apparaît pas, suivi d'une file d'infinitifs
   sans sujet. « Le dimanche soir » dormait tout en bas de la page, dans
   FINAL, alors que c'est la seule phrase du site qui se voit.

   `para1` n'a PAS été touché : c'est déjà la bonne phrase, et c'est elle
   qui distingue vraiment — les concurrents demandent un logiciel. */
export const HERO = {
  titre1: "Vous ne ressaisirez",
  titre2: "plus une seule facture.",
  para1: "Vous connectez une boîte mail. C'est la seule chose à faire.",
  para2: "FILED lit chaque pièce qui arrive, recoupe ses montants et la classe jusqu'au dossier de votre cabinet.",
  cta1: "COMMENCER",
  /* « VOIR UNE DÉMO » promettait une démo qui n'existe pas : le bouton
     descend à #principe, qui est la suite de la page. */
  cta2: "VOIR LE DÉROULÉ",
};

/* Le bandeau qui défile sous le héros.

   La référence y aligne des logos de partenaires. FILED ne se branche
   aujourd'hui qu'à une boîte mail : afficher un mur d'intégrations
   promettrait des branchements qui n'existent pas. On y met donc ce qui
   est vrai — ce que le système sait recevoir et lire.

   Le composant accepte aussi des logos (nœuds React) : le jour où des
   intégrations existent, c'est cette liste qu'on remplace, rien d'autre. */
export const BANDEAU = [
  "PDF",
  "Scan",
  "Photo prise sur le parking",
  "Pièce jointe",
  "Montant écrit dans le corps du mail",
  "Facture-X",
  "Ticket de caisse froissé",
  "Avoir",
  "Relevé",
  "Note de frais",
  "Facture écrite à la main",
  "Plusieurs pièces dans un même fichier",
];

/* Le titre nomme la situation du lecteur avant la solution : c'est ce
   désordre-là qui l'amène ici, pas l'élégance d'un classement.

   Le champ `points` a été SUPPRIMÉ le 11/09 : il n'était plus affiché
   nulle part depuis que les trois paragraphes du principe sont devenus
   les quatre tuiles de `components/Chiffres.tsx`. Il portait pourtant la
   meilleure phrase du parc — « PDF, scan, photo de travers, montant
   écrit dans le corps du mail » —, qui n'était donc lue par personne.
   Elle est remontée au BANDEAU et dans le détail de la tuile
   « formats reconnus ». Ne pas réintroduire de texte mort ici. */
export const PRINCIPE = {
  /* ⚠️ 28 signes par ligne : au-delà, le titre casse à 390 px et laisse
     un mot orphelin. Mesuré le 11/09 — « n'importe quoi, n'importe
     quand. » (32) donnait « quand. » tout seul sur sa ligne. */
  titre1: "Vos fournisseurs envoient",
  titre2: "n'importe quoi de partout.",
  para:
    "Vous branchez une boîte mail une fois, puis tout ce qui tombe dedans en ressort classé au bon fournisseur. Vous récupérez vos dimanches soir.",
};

/* Les libellés des quatre cartes ne sont plus ici : la grille a été
   refaite sur l'implémentation de la référence et les porte elle-même
   (`components/Bento.tsx`), parce qu'ils sont indissociables de la
   maquette qui les accompagne. Ce fichier reste la source du reste. */
export const FONCTIONNEMENT = {
  /* L'ancien titre décrivait le mécanisme (« le classement tient parce
     qu'il est vérifié ») et l'ancien chapô portait l'affirmation. Les
     deux ont été échangés : le titre affirme, le chapô nomme le coût. */
  titre1: "Vos comptes ne reçoivent",
  titre2: "que des pièces vérifiées.",
  para:
    "Une pièce mal rangée ne se découvre qu'au bilan. FILED recoupe donc le HT, la TVA et le TTC de chaque facture, et ne la classe que si les trois montants tombent juste.",
};

export const SUIVI = {
  titre1: "Vous savez ce qui va sortir",
  titre2: "avant que le relevé arrive.",
  para:
    "Chaque pièce lue s'ajoute au total engagé du mois, fournisseur par fournisseur, et ce qui attend encore votre validation reste visible à part. Vous n'avez donc aucun tableur à tenir à côté.",
};

export const FRANCAIS = {
  titre1: "Un produit français,",
  titre2: "et ça se vérifie.",
  para:
    "Les quatre faits ci-dessous sont écrits noir sur blanc, et vous pouvez nous les opposer à tout moment. Nous ne promettons rien de plus que ce qui y est écrit.",
};

/* Paliers — structure arrêtée, montants à trancher par Teo. */
export const PALIERS = [
  {
    nom: "Découverte",
    prix: null as string | null,
    periode: "/ mois",
    pitch: "Pour voir ce que ça donne sur vos vraies factures.",
    cta: "Commencer",
    lignes: [
      "20 factures par mois",
      "Une boîte mail connectée",
      "Classement par fournisseur",
      "Export mensuel pour le cabinet",
      "Historique de trois mois",
    ],
  },
  {
    nom: "Standard",
    prix: null as string | null,
    periode: "/ mois",
    pitch: "Pour une entreprise qui reçoit ses factures de partout.",
    cta: "Commencer",
    entete: "Tout Découverte, plus :",
    lignes: [
      "100 factures par mois",
      "Deux boîtes mail connectées",
      "Recoupement HT / TVA / TTC",
      "Transmission directe au cabinet",
      "Historique de douze mois",
      "Assistance par mail",
    ],
  },
  {
    nom: "Entreprise",
    prix: null as string | null,
    periode: "/ mois",
    pitch: "Pour une comptabilité qui ne peut pas attendre le trimestre.",
    cta: "Commencer",
    entete: "Tout Standard, plus :",
    lignes: [
      "500 factures par mois",
      "Boîtes mail illimitées",
      "File de validation partagée",
      "Catégories d'achat sur mesure",
      "Historique complet",
      "Journal de tout ce qui a été lu",
      "Assistance prioritaire",
    ],
  },
  {
    nom: "Cabinet",
    prix: "Sur mesure",
    periode: "",
    pitch: "Pour un cabinet qui range les pièces de tous ses dossiers.",
    cta: "Nous écrire",
    entete: "Tout Entreprise, plus :",
    lignes: [
      "Un espace par dossier client",
      "Vue d'ensemble sur tous les dossiers",
      "Marque du cabinet",
      "Reversement sur les abonnements",
      "Interlocuteur dédié",
    ],
  },
];

/* REMPLACE la section témoignages de la référence. Rien d'inventé :
   ce sont les règles du système, pas des avis de clients.

   SA PLACE EN DEUXIÈME SECTION A ÉTÉ CONSERVÉE — mais son texte a été
   retourné. Reproche du 11/09 : « on rassure quelqu'un qu'on n'a pas
   encore convaincu ». C'était juste du titre, pas de la position : le
   principe vient de demander au lecteur de brancher sa messagerie sur sa
   comptabilité, et l'objection naît LÀ, pas trois écrans plus bas.
   Ce qui clochait, c'était le ton défensif d'un intertitre de notice.
   Le refus est donc devenu une affirmation — « FILED lit vos
   comptes sans y toucher. » — parce que c'est l'argument le plus fort
   du produit, pas seulement une précaution. La passe correctrice du
   11/09 au soir a remplacé les deux « Il » nus du titre par le nom du
   produit (doctrine §11.A) : le pronom en tête de paragraphe répété
   donnait une notice d'appareil.

   Déplacer cette section casserait par ailleurs deux décisions déjà
   prises : l'alternance composant · texte, et la preuve avant le prix
   (voir LISEZ-MOI). */
export const GARDE_FOUS = {
  titre1: "FILED lit",
  titre2: "vos comptes sans y toucher.",
  para:
    "Un système branché sur votre comptabilité doit d'abord prouver ce qu'il refuse de faire. Les deux limites ci-dessous ne se désactivent nulle part, parce qu'elles tiennent à la façon dont le produit est construit.",
  cartes: [
    {
      titre: "Il n'écrit à personne.",
      texte:
        "FILED n'envoie aucun message en votre nom, ni à vos clients, ni à vos fournisseurs, ni à votre banque. Ses accès s'arrêtent à la lecture, donc il ne peut pas payer à votre place.",
      court: "FILED n'envoie aucun message en votre nom, et ses accès s'arrêtent à la lecture.",
      faits: [
        "Zéro message envoyé en votre nom",
        "Aucun accès à vos moyens de paiement",
      ],
    },
    {
      titre: "Aucune pièce n'est effacée.",
      texte:
        "Un doublon est mis de côté au lieu d'être effacé, et un montant douteux attend votre œil avant d'être classé. Vos fichiers d'origine restent tels que vous les avez reçus, donc vous pouvez tout récupérer quand vous voulez.",
      court: "Un doublon est mis de côté au lieu d'être effacé, et vos fichiers d'origine sont conservés.",
      faits: [
        "Chaque pièce gardée dans son format d'origine",
        "Un journal de tout ce qui a été lu",
      ],
    },
  ],
};

/* Fait réglementaire — repris de la position déjà publiée par Omega :
   on ne vend pas de mise en conformité. Ne pas durcir ce texte. */
export const CONFORMITE = {
  titre: "Facturation électronique",
  texte:
    "Depuis le 1ᵉʳ septembre 2026, toute entreprise établie en France doit pouvoir recevoir des factures électroniques. FILED ne vend pas cette mise en conformité : le raccordement relève de votre outil de facturation.",
};

/* La FAQ. Chaque réponse est vérifiable sur le produit — aucune ne
   promet ce qui n'existe pas. Deux d'entre elles disent explicitement ce
   que FILED NE fait PAS : c'est ce qu'un acheteur cherche
   d'abord, et c'est ce qui évite un client déçu au premier mois. */
export const FAQ = {
  titre1: "Ce qu'on nous demande",
  titre2: "avant de signer.",
  para: "Les réponses sont courtes, et si la vôtre n'y est pas, écrivez-nous.",
  questions: [
    {
      q: "Qu'est-ce qu'il faut installer ?",
      r: "Rien. Vous connectez une boîte mail, et c'est tout. Aucun logiciel de facturation à brancher, aucun fichier client à importer, aucune extension à poser sur votre ordinateur.",
    },
    {
      q: "Et si mon fournisseur envoie une photo prise de travers ?",
      r: "Elle est lue quand même. PDF, scan, photo, pièce jointe, ou montant écrit directement dans le corps du mail : le format est le problème de votre fournisseur, pas le vôtre.",
    },
    {
      /* Ajoutée le 11/09. C'est l'objection la plus fréquente et elle
         n'était nulle part : le comptable est le premier frein cité en
         rendez-vous. La réponse vient de la fiche produit. */
      q: "Mon comptable doit-il changer ses outils ?",
      r: "Non. Il reçoit un dossier classé dans le format qu'il utilise déjà, à la date convenue avec lui pendant l'installation. Il gagne du temps sans rien changer à ses méthodes.",
    },
    {
      q: "Est-ce qu'il écrit à mes clients ou à mes fournisseurs ?",
      r: "Jamais. Il lit, recoupe, classe et transmet à votre cabinet. Il n'envoie aucun message en votre nom et n'a accès à aucun moyen de paiement.",
    },
    {
      q: "Que se passe-t-il s'il se trompe sur un montant ?",
      r: "Il ne classe pas. HT, TVA et TTC sont recoupés entre eux ; si les trois ne tombent pas juste, la pièce est mise de côté et vous est signalée. Rien n'entre en silence dans votre comptabilité.",
    },
    {
      q: "Où sont mes factures ?",
      r: "Sur des serveurs situés dans l'Union européenne. Vos fichiers d'origine sont conservés tels quels, vous pouvez les récupérer ou tout effacer quand vous voulez.",
    },
    {
      q: "Est-ce que ça me met en conformité pour la facturation électronique ?",
      r: "Non, et personne ne devrait vous le vendre comme ça. Le raccordement à une plateforme immatriculée relève de votre outil de facturation et de votre comptable. FILED lit et classe ce qui vous arrive, quel que soit le canal.",
    },
    {
      q: "Je peux arrêter quand ?",
      r: "Quand vous voulez, sans préavis. Vous repartez avec vos pièces.",
    },
  ],
};

/* « Arrêtez de ressaisir. Le dimanche soir aussi. » était la meilleure
   phrase du site — et elle était enterrée tout en bas. Elle a été
   remontée au HÉROS, où elle travaille. La clôture ne pouvait donc plus
   la redire : elle prend l'autre moitié du pitch d'audit, celle que
   personne d'autre n'écrit sur une vitrine — « si ça ne vaut pas le coup
   chez vous, je vous le dis aussi et je m'en vais »
   (commercial/02-pitch-audit.md, §4). Un refus juste avant le bouton
   vaut mieux qu'une relance de plus. */
export const FINAL = {
  titre1: "Ne branchez rien",
  titre2: "si vos pièces sont déjà rangées.",
  para:
    "Si elles arrivent de partout et finissent en pile sur un coin de bureau, une boîte mail connectée suffit à remettre l'ensemble en ordre.",
};

/* ══════════════════════════════════════════════════════════════════════
   PIED — SUPPRIMÉ AU RAPATRIEMENT (règle 6).

   Le site source portait son propre pied de page : quatre colonnes de
   liens, dont dix pointaient sur `https://omegaai.fr/...`. Ce site EST
   omegaai.fr, et PageShell fournit déjà son pied. Le garder aurait posé
   deux pieds l'un sur l'autre, et des liens absolus vers la page qu'on
   est en train de lire.

   Ce que le pied disait, et où c'est passé :
     · l'accroche produit              → dit par le héros
     · les 6 ancres « Produit »        → les sections existent toujours,
                                         atteignables au défilement
     · Omega / Les autres systèmes     → /offres, dans le pied du site
     · Espace client                   → https://app.omegaai.fr, inchangé,
                                         c'est le cockpit — mais il vit
                                         dans l'entête du site, pas ici
     · Contact                         → /contact, dans le pied du site
     · Confidentialité / Conditions    → /vos-donnees, /mentions-legales,
                                         tous deux dans le pied du site
     · « État du service »             → pointait sur `#`, un lien mort ;
                                         il ne revient pas.
   ══════════════════════════════════════════════════════════════════════ */
