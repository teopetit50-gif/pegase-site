/* ══════════════════════════════════════════════════════════════════════
   /tarifs v4 — grille publique et catalogue des postes (28/08/2026)

   05/09/2026 (demande des associés) : la ligne « Paiement » du comparatif
   ne dit plus « tout se règle à l'installation » — moyen de paiement
   enregistré à la réservation, premier prélèvement à la mise en service
   (même promesse que la FAQ de /tarifs et la note de la grille).

   REVIREMENT ASSUMÉ, décision Teo du 27-28/08 : la v3 interdisait tout
   montant (« le prix sort de vos volumes ») ; le modèle commercial arrêté
   fait l'inverse pour les indépendants et TPE-PME — prix publics, achat
   direct, réunion d'installation incluse. L'ancienne règle ne survit que
   d'un côté : POUR LES STRUCTURES OÙ PLUSIEURS PERSONNES VALIDENT, aucun
   montant ne s'affiche — leur prix sort de l'audit, comme avant.

   ══════════════════════════════════════════════════════════════════════
   GRILLE EN VIGUEUR — 299/790/1990 €/mois (15/09/2026), plus une
   installation facturée à part : 590/790/1490 €.

   CE QU'ELLE REMPLACE. La grille du 01/09 (59/89/119) se justifiait ici
   même par « des points de prix standards » et « si l'on franchit la barre
   des 100 €, autant qu'elle rapporte ». Teo, le 15/09 : « les prix sont
   trop bas, on se base sur rien ». Vérifié — et pire : LES TROIS PALIERS
   VENDAIENT À PERTE. Un artisan coûtait 153 €/mois et se vendait 59 ; une
   PME coûtait 637 €/mois et se vendait 119.

   D'OÙ SORTENT CES TROIS NOMBRES. De PEGASE/calcul-prix.py, dont
   PEGASE/modele-cout-client.md porte la démonstration. Le coût d'un client
   n'est pas l'IA (0,65 centime la pièce, 0,3 % du prix) mais le TEMPS, et
   le temps est porté par le nombre de pièces qui reviennent à un humain.

   POURQUOI 299 ET NON 399. Le premier jet posait 399, arrondi du coût ×
   marge. Contrôle de cohérence : rapporté au plafond, ça faisait 2,66 € la
   pièce contre 1,98 et 1,99 pour les deux autres paliers — l'entrée était
   34 % plus chère à la pièce, sans raison. L'effet se voyait au
   calculateur : à 399 €, sur trois postes sur quatre, il devenait
   IMPOSSIBLE de rentabiliser le palier dès que le travail est fait par
   quelqu'un à 35 €/h chargés — il aurait fallu plus de pièces que le
   plafond du palier n'en autorise. Un palier qui ne se justifie pas à
   l'intérieur de ses propres limites n'est pas un palier. 299 = 150 × 2 €.

   ET L'INSTALLATION SORT DE L'ABONNEMENT : grille-prix-interne.md §4 et
   omega-onboarding §8 l'écrivaient déjà, le site faisait l'inverse. Effet
   de bord réparé au passage : le Chèque TIC porte sur l'installation —
   quand elle valait 0 €, l'argument n'avait aucune assiette.

   Les prix ne vivent QU'ICI ; la fonction SQL reserver_audit en garde sa
   propre copie (source de vérité de l'instantané stocké) : toute
   modification se fait AUX DEUX ENDROITS — la REMISE ANNUELLE aussi
   (0,85 dans la SQL).
   ══════════════════════════════════════════════════════════════════════

   FORMULE ANNUELLE — 02/09/2026 (Teo) : un sélecteur Mensuel | Annuel
   au-dessus des cartes, 15 % de remise sur l'annuel (10 % le 02/09, relevé le 03/09 : sous la norme du marché), l'économie mise en
   évidence « comme ça se fait ». L'annuel est facturé en une fois pour
   douze mois ; le satisfait ou remboursé 30 jours s'applique pareil. Le
   mensuel reste sans engagement, inchangé. PALIERS.prix reste le prix
   MENSUEL de référence — l'annuel se DÉRIVE (prixAnnuel & co), il ne se
   stocke pas ici. RÈGLE D'ARRONDI (02/09, relecture — la même que la
   SQL, qui est la source de vérité de l'instantané stocké) : l'équivalent
   mensuel remisé est arrondi à l'euro INFÉRIEUR, puis multiplié par 12.
   Un round(mensuel × 12 × 0,9) donnerait 637 / 961 / 1285, non
   divisibles par 12 : le client lisait « 80 €/mois — facturé 961 € par
   an » (80 × 12 ≠ 961) et la base figeait 960. Chiffres actés :
   600 / 900 / 1212 €/an, soit 50 / 75 / 101 €/mois, économie 108 / 168 /
   144 € par an.

   07/09/2026 — LE TEXTE DE LA GRILLE RÉÉCRIT (Teo : « pas très pro,
   pas assez détaillé ; le principe d'Omega c'est une machine qui construit
   des systèmes puissants »). Les noms des postes décrivaient des corvées
   (« la paperasse traitée »), les résumés étaient des slogans d'une
   ligne, les promesses des paliers du remplissage et les quatre points
   identiques d'une carte à l'autre. Désormais : un nom en nom commun,
   même grammaire pour les quatre ; un résumé qui donne le PÉRIMÈTRE —
   ce que le système lit, décide, écrit, et ce qui reste sous validation ;
   une promesse par palier qui dit ce que la machine fait à ce niveau ;
   des points propres à chaque carte, sans code interne (PULSE, VAULT
   sont dits par leur résultat). Règle intacte : chaque phrase redit un
   fait posé dans lib/content.ts — rien qui n'existe pas.

   Le critère qui sépare les deux mondes n'est pas la taille mais QUI
   VALIDE : une personne qui tient les outils → grille ; plusieurs
   services qui se partagent la validation → audit d'abord. C'est le
   déterminant réel du coût d'installation (entretiens individuels,
   points de validation — voir les formats « Entreprise & équipes »).

   08/09/2026 — TROIS CHAMPS DE PLUS, décision de l'associé :
   · Palier.teinte (« bleu » | « or » | « nuit ») : les trois têtes de
     carte de /tarifs avaient le même gris (seule « Trois postes » était
     dorée) — « on dirait que c'est la même chose ». Un poste part bleu
     calme, Trois postes garde l'or, Tout Omega arrive en nuit ;
   · Palier.badge sur « Tout Omega » (« Le plus complet ») : la dernière
     carte doit attirer, pas seulement coûter plus cher ;
   · Poste.court et SUR_MESURE.court : une ligne factuelle tirée du
     résumé long, pour les tuiles de la grille où le texte du 07/09
     prenait toute la carte. Le résumé long RESTE : la page Mon compte
     (AbonnementCarte) s'en sert, et il y a la place de le lire.

   15/09/2026 — PASSE DE REGISTRE (Teo : « trop amateur, plus pro, genre
   Qonto, des termes précis »). Les promesses de palier, les points, le
   comparatif, la carte sur mesure, le volet grande structure et tous les
   textes du calculateur passent au vocabulaire de la facturation :
   tarification à l'usage, volumétrie, échéance, périmètre, résiliation,
   réversibilité. Aucun montant, aucun plafond, aucune règle de calcul ne
   bouge — seules les chaînes affichées changent. Deux pièges vus en
   chemin : PORTES.critere avait une COPIE littérale dans
   CARTE_SUR_MESURE.note (les deux se corrigent), et l'aide de la ligne
   « Pièces comprises » disait encore « les moteurs », mot proscrit depuis
   le 14/09. Charte : OMEGA/DOCTRINE-TEXTES-SAAS.md, partie III.
   ══════════════════════════════════════════════════════════════════════ */

/* ——— les quatre postes facturables (mêmes slugs que /offres) ——— */

export type Poste = {
  id: "cashd" | "reload" | "frontd" | "filed";
  system: string;
  nom: string;
  slug: string; // page /offres/<slug>
  resume: string;
  /* 08/09 — la ligne courte des tuiles de la grille (≤ 75 caractères) */
  court: string;
};

/* 08/09/2026 — DEUX LONGUEURS DE TEXTE PAR POSTE. Le résumé long du
   07/09 (Teo) donne le périmètre complet — il sert la page Mon compte,
   où chaque poste a une carte pour lui. Dans la grille de /tarifs, ces
   quatre paragraphes empilés dans une carte de 280 px noyaient le choix
   (l'associé : « trop de texte ») : `court` en garde UNE ligne factuelle,
   tirée du résumé, sans code interne — le nom du poste fait le reste. */
export const POSTES: Poste[] = [
  {
    id: "cashd",
    system: "CASHD",
    nom: "Relance des devis et factures",
    slug: "relances-impayes",
    resume:
      "Chaque devis sans réponse et chaque facture échue sont relancés à J+3, J+7 et J+21, avec un message rédigé selon le montant, le retard et l'historique du client. Aucun envoi sans votre validation.",
    court: "Devis sans réponse et factures échues relancés à J+3, J+7 et J+21.",
  },
  {
    id: "frontd",
    system: "FRONTD",
    nom: "Réponse aux demandes clients",
    slug: "demandes-clients",
    resume:
      "Les demandes reçues par e-mail et WhatsApp (horaires, tarifs, disponibilités, rendez-vous) obtiennent une réponse à toute heure, tirée de la base de connaissances que vous avez validée. Chaque client satisfait est invité à laisser un avis.",
    court: "Réponse à toute heure aux demandes reçues par mail et WhatsApp.",
  },
  {
    id: "reload",
    system: "RELOAD",
    nom: "Relance des clients inactifs",
    slug: "nouvelles-affaires",
    resume:
      "Vos clients inactifs sont identifiés dans votre historique de ventes, classés par valeur, puis recontactés un par un. Les entretiens qui redeviennent dus et les commandes que personne n'est venu reprendre entrent dans la même liste.",
    court: "Clients inactifs recontactés, échéances et commandes en plan reprises.",
  },
  {
    id: "filed",
    system: "FILED",
    nom: "Factures fournisseurs et pièces comptables",
    slug: "factures-fournisseurs",
    resume:
      "Chaque facture fournisseur est lue quel que soit son format, ses montants extraits et contrôlés entre eux, la pièce classée par fournisseur et transmise à la comptabilité dans un dossier complet.",
    court: "Factures fournisseurs lues, contrôlées, classées, transmises à la comptabilité.",
  },
];

/* ——— la cinquième ligne des cartes (07/09/2026, Teo : « une option pour
   faire comprendre qu'Omega peut tout faire ») ———
   Pas un poste de plus : une ligne sous les quatre, dans chaque carte, qui
   dit que ce qui n'est pas dans la liste se construit aussi. Elle ne se
   coche pas — elle mène à /offres/sur-mesure, où la promesse est cadrée
   (devis avant tout engagement). Le texte redit celui de cette page. */
export const SUR_MESURE = {
  nom: "Un poste propre à votre métier",
  resume:
    "La tâche qui vous coûte le plus cher n'est pas dans la liste ? Elle se construit sur les mêmes fondations : vos outils, vos règles, votre validation. Le périmètre et le devis sont écrits avant tout engagement.",
  /* 08/09 — la ligne courte de la tuile (même règle que Poste.court) */
  court: "Une tâche hors liste ? Elle se construit sur les mêmes fondations.",
  cta: "Décrire votre cas",
  href: "/offres/sur-mesure",
};

/* 15/09/2026 — la table COMPRIS (PULSE / VAULT et leurs slugs) est retirée :
   elle n'existait que pour fabriquer les deux liens du bas de la grille, et
   le site ne montre plus que les quatre paquets qui s'installent. Ce que les
   deux faisaient est toujours dit — « le point du matin et les verrous,
   compris dès le premier jour » — mais comme une garantie, sans nom de code
   et sans page où aller. */

/* ——— la grille ——— */

export type Palier = {
  id: "un" | "trois" | "complet";
  nom: string;
  prix: number; // €/mois TTC — grille du 15/09/2026 (voir l'en-tête)
  sousPrix: string;
  /* 15/09 — LE PLAFOND DE VOLUME, la variable qui manquait à la grille : le
     nombre de pièces traitées par mois, tous postes confondus (factures lues,
     demandes reçues, relances parties, reprises de contact). C'est lui qui
     porte notre coût — une pièce sur dix revient à un humain — et la valeur
     rendue au client. Au-delà du dernier plafond, le prix sort d'un devis.
     ATTENTION : ce plafond ne vient PAS du coût technique. L'IA coûte
     0,65 centime la pièce, soit 0,3 % du prix à tous les paliers ; elle ne
     freine rien. Le plafond est celui du TEMPS HUMAIN de rattrapage. Si le
     taux d'anomalie baisse, il peut monter beaucoup, au même prix. */
  plafond: number;
  /* 15/09 — l'installation, facturée à part et une seule fois (en-tête) */
  installation: number;
  /* combien de postes le visiteur coche — null : tous, rien à choisir */
  aChoisir: number | null;
  /* 08/09 — la couleur de la tête de carte (voir l'en-tête) : trois têtes
     distinctes, la dernière en nuit pour que « Tout Omega » se voie */
  teinte: "bleu" | "or" | "nuit";
  phare?: boolean;
  badge?: string;
  promesse: string;
  points: string[];
};

export const PALIERS: Palier[] = [
  {
    id: "un",
    nom: "Un poste",
    prix: 299,
    sousPrix: "par mois, sans engagement",
    plafond: 150,
    installation: 590,
    aChoisir: 1,
    teinte: "bleu",
    promesse:
      "Un poste automatisé de bout en bout, avec validation avant chaque envoi.",
    points: [
      "Un poste au choix parmi les quatre",
      "Jusqu'à 150 pièces traitées par mois",
      "Raccordé à vos outils existants, sans migration",
    ],
  },
  {
    id: "trois",
    nom: "Trois postes",
    prix: 790,
    sousPrix: "par mois, sans engagement",
    plafond: 400,
    installation: 790,
    aChoisir: 3,
    teinte: "or",
    phare: true,
    badge: "Recommandé",
    promesse:
      "Trois postes pilotés par le même système, sur une file de validation unique.",
    points: [
      "Trois postes au choix parmi les quatre",
      "Jusqu'à 400 pièces traitées par mois",
      "File de validation et journal d'activité mutualisés",
    ],
  },
  {
    id: "complet",
    nom: "Tout Omega",
    prix: 1990,
    sousPrix: "par mois, sans engagement",
    plafond: 1000,
    installation: 1490,
    aChoisir: null,
    teinte: "nuit",
    badge: "Le plus complet", // 08/09 (associé) : la dernière carte doit attirer
    promesse:
      "Les quatre postes en service, sur l'administratif comme sur le commercial.",
    points: [
      "Les quatre postes actifs dès la mise en service",
      "Jusqu'à 1 000 pièces traitées par mois",
      "File de validation et journal d'activité mutualisés",
    ],
  },
];

/** Prix d'un choix de postes — même barème que la fonction SQL. */
export function prixPour(nb: number): number {
  if (nb <= 1) return 299;
  if (nb <= 3) return 790;
  return 1990;
}

/* ══════════════════════════════════════════════════════════════════════
   LE PRIX CONTINU (15/09/2026, Teo) — « le pricing doit évoluer et se
   modifier en fonction des dossiers ; là ça reste les mêmes prix, genre
   1990 ; c'est censé être des chiffres qui varient, ça peut être 146 €
   pour le deuxième ».

   CE QUE ÇA REMPLACE. Les trois montants de PALIERS étaient des paliers
   au sens fort : quel que soit le volume, on retombait sur 299, 790 ou
   1990. Deux clients aux volumes très différents payaient pareil, et le
   chiffre redevenait une étiquette — exactement le reproche d'origine.

   POURQUOI ÇA NE CONTREDIT RIEN. La grille arrêtée le matin même EST une
   droite : 299/150, 790/400 et 1990/1000 valent 1,99 · 1,98 · 1,99 € la
   pièce. Le prix continu ne change donc pas le barème, il l'expose. Les
   trois montants de PALIERS restent en place comme REPÈRES (ils servent
   au comparatif, à /installation et à l'instantané stocké quand aucun
   volume n'a été saisi), mais ce qui s'affiche au visiteur qui a répondu
   est désormais calculé.

   LE PLANCHER. Un client coûte du temps même à volume nul : le rituel
   hebdomadaire et le support ne dépendent pas des pièces (~85 min/mois,
   voir PEGASE/calcul-prix.py). 149 € couvre ce socle avec une marge fine.
   En dessous, chaque client ferait perdre de l'argent quel que soit son
   volume.

   LE PLAFOND. Au-delà de PLAFOND_GRILLE pièces, on sort de la grille :
   à ce volume le coût dépend de qui valide et de combien de sociétés, pas
   du nombre de pièces. C'est l'audit qui prend, comme avant.
   ══════════════════════════════════════════════════════════════════════ */

/** Ce que coûte une pièce traitée, par mois. Relevé sur la grille du
    15/09 : les trois paliers valaient 1,99 · 1,98 · 1,99 € la pièce. */
export const TARIF_PIECE = 2;

/** Le socle incompressible : rituel hebdomadaire et support ne dépendent
    pas du volume. En dessous, un client fait perdre de l'argent. */
export const PLANCHER_MENSUEL = 149;

/** Au-delà, le prix ne se calcule plus : il sort d'un audit. */
export const PLAFOND_GRILLE = 1000;

/* ══════════════════════════════════════════════════════════════════════
   RÈGLE ABSOLUE (15/09/2026, Teo) — LE VISITEUR NE VOIT JAMAIS UN GAIN
   PLUS PETIT QUE LE PRIX.

   « Faut jamais que le client voie un prix négatif, genre vous économisez
   100 mais on facture 150 : c'est impossible ça. »

   Ce que ça interdit, exactement : afficher côte à côte un montant récupéré
   et un abonnement plus cher. Une page qui fait cette soustraction devant le
   client démontre elle-même que l'offre ne vaut pas son prix.

   ET LA VARIANTE SOURNOISE, interdite au même titre : un net positif mais
   dérisoire. « = 14 € net par mois » sous un abonnement à 756 € passe tous
   les tests naïfs (le net est positif) et se lit pourtant comme un aveu.
   D'où un SEUIL, et non un simple test de signe.

   POURQUOI CE N'EST PAS QU'UN PROBLÈME D'AFFICHAGE. À 30 €/h, la valeur
   récupérée vaut ≈ 1,99 € la pièce pour un prix de 2 € la pièce : le net est
   structurellement nul. Le temps seul ne vend pas Omega à quelqu'un dont
   l'heure coûte peu — c'est un fait du modèle, pas un bug. Dans ce cas on
   n'affiche AUCUNE soustraction : on dit ce que le système fait en heures,
   et on renvoie à l'audit, qui chiffre ce que le temps ne capture pas
   (devis sans réponse, factures échues, clients jamais rappelés).

   L'invariant à tenir, testé dans PEGASE/test-regle-gain.md :
   si `viable` est faux, AUCUN montant d'économie ne s'affiche.
   ══════════════════════════════════════════════════════════════════════ */

/** La marge minimale pour qu'une soustraction ait le droit de s'afficher :
    le net doit valoir au moins ce pourcentage du prix. En dessous, l'offre
    ne se défend pas sur le temps seul, et on ne fait pas semblant. */
export const MARGE_MINIMALE = 0.15;

/** Le prix mensuel pour un volume de pièces — null au-delà de la grille.
    C'est LA fonction du prix public depuis le 15/09 ; `prixPour` ne sert
    plus qu'aux repères et aux cas où aucun volume n'a été saisi.
    Jumelle de la fonction SQL reserver_audit : toute modification se fait
    AUX DEUX ENDROITS. */
export function prixPourVolume(pieces: number): number | null {
  if (pieces <= 0) return null;
  if (pieces > PLAFOND_GRILLE) return null;
  return arrondiCommercial(
    Math.max(PLANCHER_MENSUEL, Math.round(pieces * TARIF_PIECE)),
  );
}

/** L'ARRONDI COMMERCIAL (15/09/2026, Teo) — « ça donne un chiffre genre un
    arrondi ; si c'est genre 123, bah on le met à 129 ».

    `pièces × 2` tombe toujours sur un nombre PAIR : 720, 792, 1 200. Ça ne
    se lit pas comme un prix, ça se lit comme le résultat d'un calcul — et
    un résultat de calcul, ça se discute. On monte au montant terminé par 9
    juste au-dessus : 720 → 729, 1 200 → 1 209, 149 → 149.

    TOUJOURS AU-DESSUS, jamais en dessous : le brut est ce que le volume
    coûte, on ne vend pas sous son propre calcul. L'écart vaut 9 € au plus.

    PAS de paliers d'arrondi (49/99/149/199…) : à 1 500 € la marche suivante
    aurait été 1 990, soit 490 € pris au client par le seul effet de
    l'arrondi. Une règle unique, à la dizaine, partout.

    JUMELLE DE LA FONCTION SQL reserver_audit (v3.4, appliquée le 15/09) :
    les deux ne se séparent jamais, sinon l'écran annonce 1 209 € et la base
    fige 1 200. La SQL se pose TOUJOURS en premier. */
export function arrondiCommercial(montant: number): number {
  return Math.ceil((montant + 1) / 10) * 10 - 1;
}
/** L'installation du palier correspondant — facturée à part, une seule fois,
    et non plus « comprise ». Même barème que la fonction SQL. */
export function installationPour(nb: number): number {
  if (nb <= 1) return 590;
  if (nb <= 3) return 790;
  return 1490;
}

/** Le palier qui couvre ce volume mensuel de pièces — null au-delà de la
    grille, c'est-à-dire quand le prix doit sortir d'un audit. */
export function palierPourVolume(pieces: number): Palier | null {
  return PALIERS.find((p) => pieces <= p.plafond) ?? null;
}

/** Quels postes une carte compte, quand le visiteur n'a rien coché dedans.

    Le calculateur est rempli une fois, mais les cartes « Un poste » et
    « Trois postes » ne savent pas LESQUELS. Plutôt que de les laisser
    muettes — le visiteur aurait rempli le formulaire pour voir deux cartes
    sur trois rester à « À calculer » —, on retient les postes où il a le
    plus de volume : c'est ce qu'un acheteur rationnel automatise en premier,
    et c'est le chiffre le plus haut, donc jamais une bonne surprise qu'on
    devrait retirer ensuite. Dès qu'il coche lui-même, son choix prime. */
export function postesPourCarte(
  saisie: SaisieVolumes,
  aChoisir: number | null,
  choisis: readonly string[],
): string[] {
  if (aChoisir === null) return POSTES.map((x) => x.id);
  if (choisis.length === aChoisir) return [...choisis];
  return QUESTIONS_VOLUME.map((q) => ({
    id: q.posteId,
    pieces: (saisie[q.posteId] ?? 0) * q.coefficient,
  }))
    .filter((x) => x.pieces > 0)
    .sort((a, b) => b.pieces - a.pieces)
    .slice(0, aChoisir)
    .map((x) => x.id);
}

/** Les pièces mensuelles d'une SÉLECTION de postes — c'est ce qui permet
    aux trois cartes d'afficher trois prix différents à partir des mêmes
    réponses : chacune ne compte que les postes qu'elle comprend. */
export function piecesPourPostes(saisie: SaisieVolumes, postes: readonly string[]): number {
  return Math.round(
    QUESTIONS_VOLUME.filter((q) => postes.includes(q.posteId)).reduce(
      (t, q) => t + (saisie[q.posteId] ?? 0) * q.coefficient,
      0,
    ),
  );
}

/* ——— la formule annuelle (02/09/2026) ———
   UNE seule constante à changer pour bouger la remise — et sa jumelle
   dans la fonction SQL reserver_audit (voir l'en-tête). */

export const REMISE_ANNUELLE = 0.15; // 03/09 (Teo) : 10 % → 15 %, dans la norme du marché (15-20 %)

export type Periodicite = "mensuel" | "annuel";

/** Ce qu'on facture en une fois pour douze mois : l'équivalent mensuel
    remisé arrondi à l'euro inférieur, × 12 — MÊME règle que la fonction
    SQL reserver_audit (floor(v_prix * 0.85) * 12), voir l'en-tête. */
export function prixAnnuel(mensuel: number): number {
  return Math.floor(mensuel * (1 - REMISE_ANNUELLE)) * 12;
}

/** Ce que l'annuel fait gagner sur l'année — le chiffre qu'on met en avant. */
export function economieAnnuelle(mensuel: number): number {
  return mensuel * 12 - prixAnnuel(mensuel);
}

/** Le mensuel équivalent de l'annuel — le grand chiffre de la carte. Un
    entier par construction (prixAnnuel est un multiple de 12) ; le round
    ne coûte rien et protège d'une virgule flottante capricieuse. */
export function equivalentMensuel(mensuel: number): number {
  return Math.round(prixAnnuel(mensuel) / 12);
}

/** Lit une périodicité venue de l'extérieur (paramètre d'URL, colonne) :
    tout ce qui n'est pas « annuel » retombe sur le mensuel, le défaut. */
export function lirePeriodicite(v: unknown): Periodicite {
  return v === "annuel" ? "annuel" : "mensuel";
}

/* ——— les deux portes : qui valide ? ———
   Servent le bandeau d'orientation de /tarifs et le panneau TPE de
   /reserver-un-audit. La formulation évite « petite / grosse entreprise » :
   ce qui change le prix, c'est la structure de validation. */

export const PORTES = {
  critere: "Le coût dépend de votre structure de validation, pas de votre chiffre d'affaires.",
  solo: {
    titre: "Une validation centralisée",
    texte:
      "Chez un indépendant, une TPE ou une PME, une à deux personnes voient passer les demandes, les devis et les factures, et valident ce qui part. L'estimation de cette page s'applique, et l'audit l'arrête.",
  },
  equipe: {
    titre: "Une validation répartie entre services",
    texte:
      "Quand l'accueil, la comptabilité et les opérations valident chacun sur leur périmètre, le coût dépend du nombre de jeux de règles à écrire. Le diagnostic mesure d'abord les volumes service par service, puis le devis en découle.",
  },
};

/* ——— le comparatif des paliers (05/09/2026) ———
   /tarifs reprend le DESIGN de /reserver-un-audit (demande Teo, 05/09 :
   « le même design, les infos de tarifs restent »). La page audit compare
   ses formats dans un tableau ; celui-ci compare les paliers avec les
   mêmes lignes de six colonnes. Aucune règle nouvelle : chaque cellule
   redit un fait déjà posé ailleurs sur la page (points des cartes, note
   TTC, « ce que nous ne facturons jamais », FAQ). Les montants sont
   DÉRIVÉS de PALIERS — jamais recopiés. */

export type LignePaliers = {
  libelle: string;
  aide: string;
  valeurs: [string, string, string];
};

export type FamillePaliers = {
  titre: string;
  /* les deux premières familles sont visibles, la suivante est derrière
     le bouton « Voir tous les points » — comme sur la page audit */
  repliee?: boolean;
  lignes: LignePaliers[];
};

const NBSP = " ";
const REMISE_PCT_TXT = Math.round(REMISE_ANNUELLE * 100);
const meme = (v: string): [string, string, string] => [v, v, v];
const parPalier = (f: (p: Palier, i: number) => string): [string, string, string] =>
  PALIERS.map(f) as [string, string, string];

/* 15/09, correctif — LE COMPARATIF SUIT LES VOLUMES, COMME LES CARTES.
   Ses lignes de prix lisaient `p.prix`, les trois repères de PALIERS : sous
   des cartes qui affichaient 220 / 620 / 800 €, le tableau redisait
   299 / 790 / 1 990 € et son bouton emmenait sur ce dernier montant. Il
   prend donc les prix et les volumes du haut de page. Sans volumes saisis
   la section n'est pas rendue ; les valeurs par défaut ne servent qu'aux
   repères (et au typage), elles ne s'affichent jamais devant un visiteur
   qui a répondu. */
/* 15/09, dernière passe — LE COMPARATIF NE COMPARE PLUS DES PRIX.
   Ses trois lignes de facturation (mensuel, annuel, économie) et la ligne
   d'installation n'étaient QUE des montants : elles sont sorties avec le
   reste des prix du site. Ce qui reste se compare sans euro — périmètre,
   volumétrie, engagement, réversibilité — et le paramètre `prix` a
   disparu de la signature, faute d'emploi. */
export function comparatifPaliers(
  volumes: readonly [number, number, number] = PALIERS.map((p) => p.plafond) as unknown as [
    number,
    number,
    number,
  ],
): FamillePaliers[] {
  return [
  {
    titre: "Périmètre et volumétrie",
    lignes: [
      {
        libelle: "Volume inclus",
        aide: "Toutes les unités traitées par le système : factures lues, demandes reçues, relances envoyées, reprises de contact. C'est le volume qui détermine le montant, jamais le nombre d'utilisateurs.",
        valeurs: parPalier((_p, i) => `${volumes[i].toLocaleString("fr-FR")} par mois`),
      },
      {
        libelle: "Postes en service",
        aide: "Parmi les quatre : relances, demandes clients, clients inactifs, factures fournisseurs.",
        valeurs: parPalier((p) =>
          p.aChoisir === null ? "Les quatre, en service" : `${p.aChoisir}, au choix`,
        ),
      },
      {
        libelle: "Rapport quotidien",
        aide: "Le point du matin : l'activité de la veille et les pièces qui attendent votre validation, transmises chaque matin. Compris à tous les paliers.",
        valeurs: meme("Inclus"),
      },
      {
        libelle: "Validation avant envoi",
        aide: "Aucune pièce ne part sans validation humaine. Compris à tous les paliers.",
        valeurs: meme("Inclus"),
      },
    ],
  },
  {
    titre: "Facturation et engagement",
    lignes: [
      {
        libelle: "Mensuel, sans engagement",
        aide: "La résiliation prend effet à la fin du mois en cours, date à laquelle les envois cessent.",
        valeurs: meme("Disponible"),
      },
      {
        libelle: `Annuel, −${REMISE_PCT_TXT}${NBSP}%`,
        aide: "Facturé en une fois pour douze mois, remise déduite. La garantie de remboursement sous 30 jours s'applique dans les mêmes conditions.",
        valeurs: meme("Disponible"),
      },
      {
        libelle: "Montant de l'abonnement",
        aide: "Il est indexé sur le nombre de pièces traitées et sur la part d'entre elles qui revient à un opérateur. Ces deux chiffres se relèvent à l'audit, sur vos exports.",
        valeurs: meme("Arrêté à l'audit"),
      },
      {
        libelle: "Au-delà du volume inclus",
        aide: "Vous êtes prévenu avant le dépassement : le palier supérieur s'applique, ou le périmètre est ajusté avec vous.",
        valeurs: meme("Prévenu d'avance, jamais facturé sans accord"),
      },
      {
        libelle: "Facturation par utilisateur",
        aide: "Le montant est indexé sur le volume traité, jamais sur le nombre de comptes ouverts.",
        valeurs: meme("Aucune"),
      },
      {
        libelle: "Commission au résultat",
        aide: "Aucun pourcentage n'est prélevé sur les sommes encaissées.",
        valeurs: meme("Aucune"),
      },
    ],
  },
  {
    titre: "Mise en service et réversibilité",
    repliee: true,
    lignes: [
      {
        /* 15/09/2026 — L'INSTALLATION SE FACTURE. Elle était « comprise »
           depuis le 28/08, contre notre propre doctrine : grille-prix-interne
           §4 et omega-onboarding/00-procedure-onboarding.md §8 écrivent toutes
           deux que confondre installation et abonnement revient à financer
           l'installation avec les mois suivants, donc à perdre sur un client
           qui part à trois mois. La procédure chiffre 5 h 20 au minimum ;
           « 45 min » ne décrivait que la réunion visible. */
        libelle: "Installation",
        aide: "Raccordement de vos outils, reprise de votre historique et rodage du système jusqu'au premier envoi réel. Facturée une seule fois, à la mise en service.",
        valeurs: meme("Facturée une fois, chiffrée au devis"),
      },
      {
        libelle: "Raccordement particulier",
        aide: "Un logiciel métier peu répandu, un historique volumineux à reprendre.",
        valeurs: meme("Chiffré avant tout engagement"),
      },
      {
        /* 05/09 (relecture) — la ligne disait encore « tout se règle à la
           réunion d'installation » sous une FAQ qui dit le contraire :
           même promesse que la FAQ et la note de la grille, mot pour mot */
        libelle: "Paiement",
        aide: "Carte ou prélèvement SEPA enregistré à la réservation. Aucun débit avant la fin de l'installation : le jour de la mise en service, l'installation est facturée et la première échéance d'abonnement part.",
        valeurs: meme("À la mise en service"),
      },
      {
        libelle: "Garantie de remboursement",
        aide: "Sans justification à fournir, en formule mensuelle comme annuelle.",
        valeurs: meme("30 jours"),
      },
      {
        libelle: "Changement de palier",
        aide: "Le montant suit le nombre de postes en service et le volume qu'ils traitent.",
        valeurs: meme("À tout moment, sans frais"),
      },
      {
        libelle: "Réversibilité des données",
        aide: "L'export complet vous est remis à la résiliation, sans condition et sans frais.",
        valeurs: meme("Export complet, sans frais"),
      },
      {
        /* 15/09 — la ligne avait cessé d'avoir un sens : le dispositif porte
           sur l'installation, et l'installation valait 0 €. La subvention
           n'avait aucune assiette. Elle en a une de nouveau. */
        libelle: "Chèque TIC",
        aide: "Région Guadeloupe : le dispositif finance de 40 à 80 % de l'installation selon le poste, jamais l'abonnement. L'éligibilité se vérifie avant la réservation.",
        /* 15/09, dernière passe — le reste à charge était calculé sur le prix
           d'installation : c'était le dernier montant du comparatif, et il
           part avec les autres. Le TAUX, lui, est un fait public du
           dispositif régional et peut s'écrire. */
        valeurs: meme("40 à 80 % de l'installation"),
      },
    ],
  },
  ];
}

/** Le comparatif sur les repères de PALIERS — ce que voyait la page avant
    le prix continu. Gardé pour les surfaces qui n'ont pas de volumes. */
export const COMPARATIF_PALIERS: FamillePaliers[] = comparatifPaliers();

/* ——— LA QUATRIÈME CARTE : SUR MESURE, SANS MONTANT (15/09/2026, Teo) ———

   La grille montrait trois paliers chiffrés et renvoyait le sur-mesure à
   une ligne discrète au bas de chaque carte (SUR_MESURE, 07/09). Il prend
   maintenant sa place de palier à part entière, en quatrième colonne,
   avec « Sur devis » là où les autres portent un prix.

   POURQUOI IL N'EST PAS DANS `PALIERS` : cette liste est le barème, et
   trois choses en dépendent qu'un quatrième élément casserait en silence —
   la fonction SQL reserver_audit (qui garde sa copie des trois prix),
   `prixPour`, et le comparatif, dont chaque ligne tient exactement trois
   valeurs. Le sur-mesure n'a pas de prix à comparer : toutes ses cellules
   diraient « ça dépend ». Il vit donc à côté, et la carte est rendue à
   part dans components/tarifs/Grille.tsx.

   CE QUE LA CARTE A LE DROIT DE DIRE : rien de neuf. Elle reprend le
   périmètre de /offres/sur-mesure (SUR_MESURE.resume) et le critère des
   deux portes (PORTES.critere / PORTES.equipe) — un prix ne s'affiche pas
   quand plusieurs services se partagent la validation, c'est la règle
   d'origine de la v3, restée en vigueur de ce côté-là.

   PAS DE PÉRIODICITÉ : l'interrupteur mensuel / annuel ne touche pas
   cette carte — il n'y a pas de montant à remiser. */

export type CarteSurMesure = {
  id: "sur-mesure";
  nom: string;
  promesse: string;
  /* ce qui s'affiche à la place du prix, et les deux lignes dessous */
  prixTexte: string;
  sousPrix: string;
  note: string;
  /* les deux cas qui mènent ici — même rangée que le choix des postes */
  casTitre: string;
  cas: string[];
  /* la rangée « Compris dans le palier » des autres cartes */
  pointsTitre: string;
  points: string[];
  cta: string;
  /* le lien de la ligne sous le bouton, vers la page qui cadre l'offre */
  enSavoirPlus: string;
  href: string;
};

export const CARTE_SUR_MESURE: CarteSurMesure = {
  id: "sur-mesure",
  nom: "Sur mesure",
  promesse:
    "Un périmètre hors catalogue, ou plusieurs services aux règles distinctes.",
  prixTexte: "Sur devis",
  sousPrix: "établi après diagnostic",
  note: "Le coût dépend de votre structure de validation, pas de votre chiffre d'affaires.",
  casTitre: "Périmètre concerné",
  cas: [
    "Un processus hors des quatre postes",
    "Plusieurs services aux règles de validation distinctes",
    "Un logiciel métier à raccorder",
  ],
  pointsTitre: "Inclus dans le devis",
  points: [
    "Un diagnostic qui mesure vos volumes avant tout chiffrage",
    "La même base technique : vos outils, vos règles, votre validation",
    "Périmètre, installation et tarif écrits avant tout engagement",
  ],
  cta: "Décrire le besoin",
  enSavoirPlus: "Consulter l'offre sur mesure",
  href: SUR_MESURE.href,
};

/* ——— LES DEUX MONDES, AU-DESSUS DES CARTES (15/09/2026, Teo) ———

   « Un autre bouton pour changer le truc : soit on est PME, soit grosse
   structure, ce qui changerait du coup les prix. » Le sélecteur est posé
   à côté de l'interrupteur de facturation, et il bascule la grille entre
   les DEUX PORTES déjà écrites plus haut (`PORTES`) — qui, jusqu'ici,
   n'étaient dites nulle part sur la page depuis la refonte du 14/09.

   CE QUI CHANGE, ET CE QUI NE CHANGE PAS. Côté « Grande structure », les
   quatre cartes gardent leurs postes et leurs paliers — un poste, trois,
   les quatre, ou le sur-mesure : ce sont des PÉRIMÈTRES, ils ne dépendent
   pas de la taille. Ce qui change, c'est le prix : il disparaît. C'est la
   règle d'origine, jamais levée — quand plusieurs services se partagent la
   validation, aucun montant ne s'affiche, parce que le coût d'installation
   dépend du nombre d'entretiens et de points de validation, pas du chiffre
   d'affaires.

   POURQUOI PAS UNE SECONDE GRILLE CHIFFRÉE (arbitrage du 15/09) : il
   aurait fallu inventer trois montants, et les poser AUSSI dans la
   fonction SQL reserver_audit, qui garde sa propre copie des prix. Teo a
   tranché pour la bascule vers l'audit.

   CE QUI DISPARAÎT CÔTÉ « GRANDE STRUCTURE » : l'interrupteur mensuel /
   annuel (il n'y a pas de montant à remiser), la phrase « Le quatrième
   poste pour N € de plus », et le comparatif du bas de page — ses quinze
   lignes comparent des prix, des réunions d'installation de 45 minutes et
   un satisfait ou remboursé qui n'ont pas été promis de ce côté-là. Les
   points des paliers changent pour la même raison : aucune promesse n'est
   reprise telle quelle sans avoir été posée pour ce monde. */

export type Monde = "pme" | "structure";

export const MONDES: { id: Monde; label: string }[] = [
  { id: "pme", label: "Indépendants et PME" },
  { id: "structure", label: "Groupes et multi-sites" },
];

export function lireMonde(v: unknown): Monde {
  return v === "structure" ? "structure" : "pme";
}

/* Tout ce que la grille dit d'autre quand « Grande structure » est actif.
   Chaque phrase redit un fait déjà posé : PORTES.equipe pour le critère et
   le diagnostic, le comparatif pour le point du matin et les verrous, la ligne
   « Raccordement particulier » du comparatif pour le chiffrage. */
export const GRANDE_STRUCTURE = {
  titre: "Un tarif établi après diagnostic",
  kicker: "Sur devis",
  chapo:
    "Quand l'accueil, la comptabilité et les opérations valident chacun sur leur périmètre, le coût dépend du nombre de jeux de règles à écrire, pas de votre chiffre d'affaires. Le diagnostic mesure vos volumes service par service, puis le devis en découle. Les postes, eux, restent identiques.",
  prixTexte: "Sur devis",
  sousPrix: "après le diagnostic",
  note: PORTES.critere,
  pointsTitre: "Inclus dans le devis",
  points: [
    "Un diagnostic qui mesure vos volumes service par service",
    "Les règles de validation propres à chaque service",
    "Périmètre, installation et tarif écrits avant tout engagement",
  ],
  cta: "Réserver un diagnostic",
  /* 15/09 (Teo) — SANS ancre. La destination portait `#reserver`, qui est
     la section « Réservez votre créneau » : le visiteur qui cliquait
     « Réserver un diagnostic » atterrissait en BAS de /reserver-un-audit,
     sous les formats et le comparatif — donc après tout ce qui lui dit
     quel format demander. La page commence par son <h1>,
     « Un audit à la mesure de votre organisation » : on y arrive en haut. */
  href: "/reserver-un-audit",
  /* la note de bas de grille, à la place du pavé TTC de la formule PME */
  bas: "Aucun montant n'est affiché sur ce périmètre : le diagnostic relève vos volumes et vos règles de validation, puis le périmètre, l'installation et le tarif sont écrits au devis avant tout engagement. Il est gratuit dans ses deux premiers formats, et sans engagement.",
  /* le bandeau d'orientation reprend la même destination */
  bandeau: {
    titre: "Nous identifions le format de diagnostic adapté",
    texte:
      "Décrivez votre organisation en deux lignes. Nous revenons vers vous avec le format correspondant, et le créneau se réserve en ligne.",
  },

  /* ——— LES DEUX SECTIONS QUI SUIVENT LA GRILLE (15/09/2026, seconde passe) ———

     Le sélecteur des mondes est né dans la grille, avec son état : le reste
     de la page ne le voyait pas, et disait encore « Réserver un audit » sous
     une grille qui venait d'annoncer « Réserver un diagnostic ». Rien n'était
     cassé — les deux boutons mènent à /reserver-un-audit — mais c'était deux
     vocabulaires sur un même écran. L'état vit désormais dans
     components/tarifs/monde.tsx, et ces textes avec les autres.

     CE N'EST PAS UN CHANGEMENT DE MOT. Trois affirmations de la version PME
     ne tiennent PAS de ce côté, et c'est ce qui rend ces textes nécessaires :
       1. « en trente minutes » : côté groupes, le premier format est le
          Cadrage, 45 min (PROFILS, lib/reservation.ts). Trente minutes
          n'existe que chez les indépendants ;
       2. « il est gratuit », sans réserve : gratuit dans les DEUX premiers
          formats (Cadrage, Audit process) ; l'Audit + atelier est sur devis,
          déduit de l'installation ;
       3. « votre tarif arrêté » à l'issue du rendez-vous : ici le diagnostic
          relève, et c'est le DEVIS qui arrête — même règle que la carte.
     Chaque phrase ci-dessous redit un fait déjà posé ailleurs (PROFILS pour
     les formats et leur gratuité, `points` et `bas` pour le devis) ; aucune
     promesse nouvelle n'est faite de ce côté. */
  chequeTic: {
    /* seul « à l'audit » change : l'assiette du dispositif et le plafond ne
       dépendent pas de qui valide chez le client */
    chapo:
      "Le dispositif porte sur l'installation, jamais sur l'abonnement. Éligibilité vérifiée au diagnostic, dossier monté avec vous.",
  },
  appel: {
    titre: "Votre devis part d'un cadrage de quarante-cinq minutes",
    chapo:
      "Le diagnostic relève votre volumétrie service par service, à partir de vos propres exports\u00a0: ce qui est traité chaque mois, la part qui revient à un opérateur, et les règles de validation propres à chaque service. Le périmètre, l'installation et le tarif sont ensuite écrits au devis, avant tout engagement. Il est gratuit dans ses deux premiers formats.",
    /* LA DURÉE DU CALENDRIER, et non un texte : l'agenda de cette section
       montre les jours où un créneau tient encore, et un jour montré libre
       ici doit l'être encore sur /reserver-un-audit. Côté PME c'est le
       Diagnostic (30 min) ; ici le premier format est le Cadrage (45 min).
       La clé est celle de DUREES_RDV (lib/creneaux.ts) et de PROFILS. */
    parcours: "cadrage",
    jour: "Réservez le diagnostic pour bloquer l'un d'eux.",
    /* le pied garde l'installation pour qui a déjà fait le chemin — de ce
       côté, ce chemin passe par le devis et non par un tarif affiché */
    pied: "Votre diagnostic est réalisé et votre devis établi\u00a0? La réunion d'installation se réserve directement.",
  },
};

/* ══════════════════════════════════════════════════════════════════════
   LE CALCULATEUR DE PALIER (15/09/2026, Teo)

   « Un bouton qui calcule : tu dis combien de factures tu as par mois, boum
   ça affiche un prix ; et si t'as pris Tout Omega, tu remplis les données. »

   DEUX RÈGLES qui le rendent tenable, et qu'il ne faut pas défaire :

   1. IL ORIENTE, IL NE DEVISE PAS. Il atterrit sur l'un des trois paliers
      existants, ou il sort de la grille vers l'audit. Jamais un montant
      intermédiaire : un calculateur qui sort 623 €/mois ouvre une
      négociation à chaque cas limite et rend la grille publique caduque.

   2. IL MONTRE SA CONVERSION. Personne ne sait combien de « pièces » il
      traite — tout le monde sait combien de factures il reçoit. On demande
      ce que le visiteur sait, on affiche le total intermédiaire, puis le
      palier. En rendez-vous, le chiffre se défend ligne par ligne.

   IL NE VIT QUE DU CÔTÉ « Indépendant & TPE ». Le sélecteur « plusieurs
   services valident » mène à l'audit et ne le voit jamais — même règle que
   PORTES, et même raison.

   LE CALCUL RESTE SUR L'APPAREIL. Aucun appel réseau : c'est ce qui autorise
   la phrase « aucun de ces chiffres n'est envoyé nulle part », et ça évite
   d'ouvrir une surface serveur sur un site qui n'en a presque pas. Les
   volumes saisis ne partent PAS dans la réservation : reserver_audit fige
   son propre instantané de prix, lui passer un volume déclaré créerait deux
   sources de vérité sur le même prix.
   ══════════════════════════════════════════════════════════════════════ */

export type QuestionVolume = {
  posteId: Poste["id"];
  question: string;
  aide: string;
  /* ce qui s'écrit à droite du champ */
  unite: string;
  /* ce qu'une unité saisie vaut en pièces mensuelles */
  coefficient: number;
  /* la phrase du détail du calcul, sous les champs */
  conversion: string;
  /* minutes que cette pièce coûte AUJOURD'HUI, à la main. Ces durées sont
     vérifiables par le lecteur contre sa propre expérience en une seconde —
     c'est ce qui les rend honnêtes, à défaut d'être mesurées. */
  minutes: number;
  /* 15/09/2026 — LES BORNES DU CURSEUR, posées ici parce qu'elles disent
     quelque chose du produit et pas du composant : `max` est la valeur qui,
     SEULE, dépasse tout juste le dernier plafond de la grille (1 000 pièces
     par mois). Le curseur va donc exactement de « rien » à « au-delà, c'est
     l'audit » — la dernière graduation porte un « + » et bascule le verdict
     hors grille, sans qu'on ait besoin d'écrire la règle deux fois.
     `pas` vaut max / 60 environ : assez fin pour se poser sur un chiffre
     rond, assez gros pour que le pouce ne cherche pas le pixel. */
  max: number;
  pas: number;
};

export const QUESTIONS_VOLUME: QuestionVolume[] = [
  {
    posteId: "filed",
    question: "Combien de factures fournisseurs recevez-vous par mois ?",
    aide: "Toutes sources confondues — mail, papier scanné, portail fournisseur. Une estimation suffit.",
    unite: "factures par mois",
    coefficient: 1,
    conversion: "une facture, une pièce",
    minutes: 6,
    /* 1 200 factures = 1 200 pièces */
    max: 1200,
    pas: 20,
  },
  {
    posteId: "frontd",
    question: "Combien de demandes recevez-vous par jour ?",
    aide: "Les questions qui appellent une réponse : horaires, tarifs, disponibilité, prise de rendez-vous. Mail et WhatsApp confondus.",
    unite: "demandes par jour",
    coefficient: 22,
    conversion: "22 jours ouvrés par mois",
    minutes: 5,
    /* 60 demandes par jour = 1 320 pièces par mois */
    max: 60,
    pas: 1,
  },
  {
    posteId: "cashd",
    question: "Combien de devis et de factures envoyez-vous par mois ?",
    aide: "Nous comptons les relances, pas les envois : sur dix documents, trois restent sans réponse et se relancent deux fois en moyenne.",
    unite: "documents par mois",
    coefficient: 0.6,
    conversion: "trois sur dix restent sans réponse, deux relances chacun",
    minutes: 6,
    /* 2 000 documents = 1 200 relances */
    max: 2000,
    pas: 25,
  },
  {
    posteId: "reload",
    question: "Combien de clients comptez-vous dans votre fichier ?",
    aide: "Le fichier complet, même les anciens — ce sont eux que le système va chercher. Nous comptons la part qui devient inactive chaque mois.",
    unite: "clients au total",
    coefficient: 0.02,
    conversion: "la part qui devient inactive chaque mois",
    minutes: 8,
    /* 60 000 clients au fichier = 1 200 reprises par mois */
    max: 60000,
    pas: 1000,
  },
];

/* Le système ne rend pas 100 % du temps : le client valide encore, et une
   pièce sur dix lui revient (taux d'anomalie du modèle de coût). Annoncer
   la totalité serait faux, et se verrait au premier mois. */
export const PART_RECUPEREE = 0.75;

/* ——— qui fait ce travail aujourd'hui ———
   LA question du calculateur. Le gain bascule entre 30 et 41 €/h selon le
   palier : un taux par défaut choisi au hasard rendrait tout le résultat
   faux. On demande donc qui tient les outils, et le taux s'affiche à côté
   de la réponse — le visiteur peut le contester, c'est le but. */
export type ProfilHoraire = {
  id: "dirigeant" | "temps-partiel" | "service";
  libelle: string;
  detail: string;
  taux: number; // € de l'heure, charges comprises
};

export const PROFILS_HORAIRES: ProfilHoraire[] = [
  {
    id: "dirigeant",
    libelle: "Le dirigeant, souvent hors horaires",
    detail: "coût horaire dirigeant",
    taux: 60,
  },
  {
    id: "temps-partiel",
    libelle: "Un poste administratif à temps partiel",
    detail: "coût chargé",
    taux: 35,
  },
  {
    id: "service",
    libelle: "Un service administratif dédié",
    detail: "coût chargé",
    taux: 30,
  },
];

/** Ce que le visiteur a saisi, par poste — la valeur BRUTE du champ, dans
    l'unité de la question (factures/mois, demandes/JOUR, etc.). */
export type SaisieVolumes = Partial<Record<Poste["id"], number>>;

/** Les pièces mensuelles que représente une saisie, poste par poste. */
export function piecesParPoste(saisie: SaisieVolumes) {
  return QUESTIONS_VOLUME.filter((q) => (saisie[q.posteId] ?? 0) > 0).map((q) => ({
    question: q,
    saisi: saisie[q.posteId] as number,
    pieces: (saisie[q.posteId] as number) * q.coefficient,
  }));
}

/** Le total, arrondi : on ne montre pas « 378,4 pièces ». */
export function totalPieces(saisie: SaisieVolumes): number {
  return Math.round(piecesParPoste(saisie).reduce((t, l) => t + l.pieces, 0));
}

/** Les heures que ces pièces coûtent aujourd'hui, à la main. */
export function heuresActuelles(saisie: SaisieVolumes): number {
  return piecesParPoste(saisie).reduce((t, l) => t + (l.pieces * l.question.minutes) / 60, 0);
}

/** Celles que le système rend — jamais la totalité. */
export function heuresRecuperees(saisie: SaisieVolumes): number {
  return heuresActuelles(saisie) * PART_RECUPEREE;
}

/** Les heures en journées, pour que ça se visualise : « 25,7 heures » se
    subit, « près de quatre journées » se projette. Journée de 7 heures,
    arrondie à la demi-journée. */
export function enJournees(heures: number): number {
  return Math.round((heures / 7) * 2) / 2;
}

/** Le verdict complet — tout ce que l'écran de résultat a besoin d'afficher.
    `palier` à null : le volume sort de la grille, c'est l'audit qui prend. */
export function verdictCalculateur(saisie: SaisieVolumes, taux: number) {
  const pieces = totalPieces(saisie);
  const palier = palierPourVolume(pieces);
  /* 15/09 — LE PRIX EST CALCULÉ, plus lu dans le palier. `palier` ne sert
     plus qu'à nommer la zone et à porter l'installation ; c'est
     prixPourVolume qui donne le montant, et il varie avec chaque réponse. */
  const prix = prixPourVolume(pieces);
  const actuelles = heuresActuelles(saisie);
  const recuperees = heuresRecuperees(saisie);
  const valeur = Math.round(recuperees * taux);
  return {
    pieces,
    palier,
    prix,
    heuresActuelles: actuelles,
    heuresRecuperees: recuperees,
    journees: enJournees(recuperees),
    valeurRecuperee: valeur,
    /* null quand le volume sort de la grille : il n'y a pas de prix à
       soustraire, et on n'en invente pas un. */
    net: prix === null ? null : valeur - prix,
    /* LE DRAPEAU QUI COMMANDE L'AFFICHAGE — voir la règle absolue plus haut.
       Faux : on n'affiche ni le montant récupéré, ni la soustraction, ni le
       net. Ni négatif, ni dérisoire : rien de chiffré côté économies. */
    viable: prix !== null && valeur - prix >= prix * MARGE_MINIMALE,
  };
}

/* ——— les textes du calculateur ———
   Ils vivent ici, avec les nombres qu'ils commentent, et non dans le
   composant : c'est la règle du fichier depuis le début. */

export const CALCULATEUR = {
  /* 15/09 (Teo, dans la foulée) — LES PRIX NE S'AFFICHENT PAS AVANT.
     « Je veux pas que les prix s'affichent avant d'avoir rempli le truc,
     sinon on reste sur un truc inventé. » C'est la conséquence logique de
     tout le reste : un montant posé avant que le visiteur ait donné ses
     volumes est un montant qu'on a choisi, pas un montant qui sort de son
     cas. Les cartes gardent donc leur nom, leur promesse, leurs postes et
     leur plafond — tout sauf le chiffre, qui attend ses réponses. Le
     comparatif, qui compare des prix, attend lui aussi. */
  /* 15/09, DERNIÈRE PASSE (Teo) — LE SITE N'AFFICHE PLUS AUCUN MONTANT.
     « Au pire on met aucun prix et on chiffrera à l'audit ce que ça
     coûtera au client. » C'est l'aboutissement de la décision du 15/09 au
     soir : tant qu'un montant s'affichait, il fallait le défendre — et il
     varie d'un facteur 6 selon la part des pièces qui revient à un
     opérateur, chiffre qu'aucune page ne peut connaître avant l'audit
     (voir PEGASE/benchmark-prix-marche.md, partie II).

     CE QUI RESTE : le VOLUME et les HEURES. Ce sont des faits, tirés des
     réponses du visiteur, et ils suffisent à arriver calés en rendez-vous
     — la seule fonction que Teo assigne au calculateur.
     CE QUI PART : le montant de l'abonnement, la remise annuelle, le prix
     d'installation, la soustraction et le net.
     CE QUI RESTE MALGRÉ TOUT EN EUROS : la valeur du temps récupéré.
     C'est le chiffre DU CLIENT, calculé sur SON coût horaire — pas notre
     tarif. La retirer viderait la page de son seul argument. */
  avant: {
    grand: "Répondez aux questions",
    sous: "votre volume mensuel",
    note: "Une question par poste suffit à établir le volume que le système aurait à traiter chez vous.",
  },
  /* Le bloc qui remplace les montants, en tête de page — dit UNE SEULE
     FOIS. Répétée sur chaque carte, n'importe quelle formule devient du
     remplissage, et « sur devis » trois fois de suite se lit « c'est cher
     et ils ne le disent pas ». La règle qui sauve une page sans prix :
     annoncer DE QUOI le montant dépend. C'est tout ce qui la sépare d'une
     page opaque. */
  sansPrix: {
    titre: "Le tarif est arrêté à l'audit, sur vos volumes réels.",
    texte:
      "Nous ne publions pas de grille. Le montant est indexé sur le nombre de pièces que le système traite pour vous, et sur la part d'entre elles qui revient à un opérateur — deux variables qu'aucune page ne peut connaître d'avance. L'audit les relève en trente minutes, et le devis en découle.",
    note: "Ni facturation par utilisateur, ni commission sur vos encaissements.",
  },
  /* 15/09 (Teo) — « ça peut vraiment être n'importe quel prix, c'est en
     fonction des stats précises de l'entreprise ; là ça reste une estimation
     et faut faire un audit pour chiffrer ». D'où le mot ESTIMATION partout
     où un montant s'affiche, et l'audit nommé comme ce qui le fixe. Ce n'est
     pas une précaution juridique : le calcul part de volumes DÉCLARÉS de
     mémoire, et personne ne connaît ses chiffres à la pièce près. */
  estimation: {
    etiquette: "Volume estimé",
    phrase:
      "Établi sur les ordres de grandeur que vous venez de renseigner. L'audit le relève ensuite sur vos exports, avec la part des pièces qui revient à un opérateur : c'est de ces deux chiffres que le tarif découle.",
  },
  appel: {
    titre: "Estimer votre volume",
    texte: "Le tarif est indexé sur le nombre de pièces traitées. Une question par poste suffit à établir ce volume ; l'audit l'arrête ensuite sur vos chiffres réels.",
    cta: "Estimer mon volume",
  },
  entete: {
    titre: "Vos volumes mensuels",
    texte:
      "Nous ne demandons que des ordres de grandeur dont vous disposez déjà. Le calcul s'exécute sur votre appareil : aucune de ces valeurs n'est transmise.",
  },
  qui: {
    question: "Qui traite ces pièces aujourd'hui ?",
    aide: "L'heure est valorisée à son coût employeur, charges comprises. Si votre coût réel diffère, indiquez-le : c'est celui-là qui sera retenu.",
  },
  detail: { titre: "Détail du calcul", total: "Volume retenu" },
  /* Le bloc de gain. Le montant en euros est un PLANCHER et le dit : une
     heure passée en boutique ne vaut pas ce qu'elle coûte, elle vaut ce
     qu'elle rapporte — et ça, nous ne pouvons pas le chiffrer à la place du
     client. Une page qui annonce son propre plancher se croit plus qu'une
     page qui promet un rendement. On ne écrit JAMAIS de chiffre d'affaires
     supplémentaire ici : invérifiable, impossible à tenir. */
  gain: {
    plancher:
      "Ces heures sont valorisées à leur coût, jamais à ce qu'elles produisent. Le montant obtenu est donc un plancher : une journée passée en clientèle, sur un chantier ou en atelier rapporte davantage que son coût horaire, et cette valeur-là dépend de votre activité.",
    encours:
      "Le calcul ne porte que sur le temps. Il ne comptabilise ni les devis restés sans réponse ni les factures échues qui ne sont jamais relancées, alors que ces deux postes pèsent souvent davantage. L'audit les chiffre sur vos propres encours.",
  },
  /* 15/09, dernière passe — L'ÉCRAN « PAS SUR LE TEMPS SEUL » A DISPARU,
     et avec lui le drapeau `viable`. Il existait pour empêcher d'afficher
     une soustraction dérisoire (« 105 € de temps gagné, 149 € d'abonnement »).
     Sans montant d'abonnement affiché, il n'y a plus de soustraction, donc
     plus rien à cacher : le résultat est le même pour tout le monde — un
     volume, des heures, et un bouton vers l'audit. `verdictCalculateur`
     garde `prix`, `net` et `viable` pour l'usage interne ; l'écran ne les
     lit plus. */
  horsGrille: {
    titre: "Votre volume sort du cadre standard.",
    texte:
      "Au-delà de ce seuil, le montant dépend du nombre de services qui valident, du nombre de sociétés et des logiciels à raccorder. L'audit relève ces trois variables, et le devis en découle.",
    cta: "Réserver un audit",
    souscta: "30 minutes, gratuit, sans engagement",
  },
  /* Cette phrase retire au visiteur la peur de se sur-déclarer, qui est la
     première raison pour laquelle on abandonne un calculateur en route. */
  pied: "Ces volumes orientent la discussion, ils n'engagent à rien. Le périmètre définitif est arrêté à l'audit, sur vos volumes réels : s'ils sont inférieurs à ce que vous avez déclaré, c'est le périmètre inférieur qui s'applique.",
};
