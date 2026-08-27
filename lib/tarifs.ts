/* ══════════════════════════════════════════════════════════════════════
   /tarifs — « Comment nous chiffrons » (v3, 13/08/2026)

   HISTORIQUE, parce qu'il explique la règle : cette page a d'abord été une
   grille de prix (49 / 89 / 109,99 €, clone Synth AI). Teo l'a retirée le
   jour même. La raison est la bonne et elle vaut consigne permanente :
   chez Omega le prix se déduit des volumes mesurés à l'audit, pas d'un
   barème — `OMEGA/commercial/facturer-omega.md` §1. Afficher un montant,
   c'est promettre un chiffre à quelqu'un dont on ne connaît pas encore
   les volumes, donc se préparer à se contredire au devis.

   ⚠ RÈGLE DE CE FICHIER : AUCUN MONTANT. Pas de prix de paquet, pas de
   plancher, pas de « à partir de ». La seule exception est le taux du
   Chèque TIC (40 à 80 %, plafond 10 000 €) : ce n'est pas notre chiffre,
   c'est celui de la Région Guadeloupe, il est public et vérifiable, et
   il ne nous engage sur aucun montant. La mention « Région » reste
   obligatoire — c'est une aide régionale citée sur un site national.

   ── v3 : NOUVELLE RÉFÉRENCE ────────────────────────────────────────────
   Le 13/08 Teo a demandé de remplacer entièrement la page (qui reproduisait
   `flux-nextjs-template.vercel.app/about`) par le design de
   **scale.com/careers**. Même famille que /vos-donnees, qui reproduit déjà
   scale.com/global-public-sector : les deux pages partagent donc la police
   et l'échelle typographique, relevées dans le bloc `.tf` de globals.css.

   Correspondance section par section avec la référence :
     hero plein cadre, titre géant, CTA      → « Le prix sort de vos volumes »
     « IN THE NEWS » — 3 cartes de couleur   → les trois compteurs
     « OUR CREDOS » — 6 cartes grises        → ce que nous ne facturons jamais
     « OUR BENEFITS » — 4 blocs illustrés    → une fois / chaque mois / TIC
     CTA final plein cadre                   → « Savoir ce que ça donnerait »

   ── 17/08 : `POURQUOI` ET `POSTES` SUPPRIMÉS ───────────────────────────
   Deux sections retirées le même jour, sur demande de Teo, toutes deux
   pour redite. Cinq sections au lieu de sept, c'est voulu : ne pas les
   rétablir en croyant combler un trou du relevé.

   « WHY » ne portait que des redites : le barème-chiffre-promis (déjà le
   titre du hero), les trois déterminants du prix (déjà les trois
   compteurs, juste au-dessus), « pas le nombre de personnes chez vous »
   (déjà le principe « pas de prix par utilisateur »). Ses deux phrases
   propres sont remontées en chapô des compteurs, dans `page.tsx` : le
   calcul vérifiable dans la proposition, et la recommandation de ne rien
   installer quand le comptage ne rembourse pas l'installation. L'argument
   de fond, lui, n'est pas perdu : il reste écrit en tête de ce fichier,
   où il vaut consigne.

   « OPEN POSITIONS » listait les six postes et leurs outils — ce que
   /offres et /integrations font déjà, et à partir des mêmes sources
   (FAMILLES, MOTEUR_OUTILS). C'était donc une troisième copie du même
   inventaire, à tenir à jour avec les deux autres. Son ancre `#devis`
   n'était visée par aucun lien du site, et son composant client
   `components/tarifs/Postes.tsx` est supprimé avec elle. SEUL APPORT
   PERDU : le regroupement des postes par ligne de devis (ce qui
   s'installe et se facture / ce qui vient avec). S'il faut le rétablir un
   jour, une phrase dans le chapô de `CADRE` suffit — pas une section.

   ── 14/08 : LES SIX PHOTOS REMPLACÉES ─────────────────────────────────
   Teo : « les photos font pas pro ». Au-delà du goût, deux défauts durs :
   l'ancien jeu montrait DEUX MARQUES TIERCES en gros plan (terminal
   SumUp, caisse SpotOn) — sur une page tarif ça se lit comme un
   partenariat — et son hero était un entretien d'embauche, hérité de la
   référence, qui est une page carrières.

   Le nouveau jeu est à dominante architecturale, froid, sans visage et
   SANS AUCUNE MARQUE NI TEXTE LISIBLE : c'est ce que fait la référence
   derrière son titre, et c'est ce qui laisse la place à la typographie.
   Sourcing, recadrages et candidats écartés : public/photos/CREDITS.txt.
   ══════════════════════════════════════════════════════════════════════ */

/* ——— 1. hero plein cadre ——— */

export const HERO = {
  /* deux phrases courtes, comme « Scale is growing. Grow with Us. » */
  titre: "Le prix sort de vos volumes. Pas d'un barème.",
  chapo:
    "Un devis Omega.AI tient en deux lignes : une installation, facturée une seule fois, et un abonnement mensuel sans engagement de durée. Le montant, lui, se compte dans vos propres documents pendant l'audit.",
  cta: "Réserver l'audit",
  photo: {
    src: "/photos/tarifs-hero-atrium.jpg",
    alt: "L'atrium d'un immeuble de bureaux moderne, vu d'en bas",
  },
};

/* ——— 2. les trois compteurs (les 3 cartes de couleur de la référence) ——— */

export type Compteur = {
  rang: string;
  titre: string;
  texte: string;
  lien: { libelle: string; href: string };
  /* les trois fonds de la référence, dans son ordre */
  ton: "vert" | "bleu" | "encre";
};

export const COMPTEURS: Compteur[] = [
  {
    rang: "Compteur 01",
    titre: "Le nombre de pièces traitées chaque mois",
    texte:
      "Factures émises, devis en attente, demandes entrantes. On les compte dans vos documents, on ne vous demande pas de les estimer de tête.",
    lien: { libelle: "Voir la relance", href: "/offres/relances-impayes" },
    ton: "vert",
  },
  {
    rang: "Compteur 02",
    titre: "Le nombre de postes que vous nous confiez",
    texte:
      "Un assistant qui tient la relance, l'accueil et la paperasse ne demande pas la même surveillance qu'un assistant qui n'en tient qu'un seul.",
    lien: { libelle: "Voir les postes", href: "/offres" },
    ton: "bleu",
  },
  {
    rang: "Compteur 03",
    titre: "Le temps de validation que cela vous demande",
    texte:
      "Rien ne part sans votre accord : ce que vous relisez chaque mois fait partie du service, donc du prix.",
    lien: { libelle: "Voir les verrous", href: "/offres/securite" },
    ton: "encre",
  },
];

/* ——— 3. ce que nous ne facturons jamais (les 6 cartes grises) ——— */

export type Principe = { titre: string; texte: string };

export const PRINCIPES: Principe[] = [
  {
    titre: "Pas de prix par utilisateur",
    texte:
      "Embaucher ne vous coûte rien de plus. Le prix ne dépend pas du nombre de personnes qui se servent du système, et il ne bouge pas quand votre équipe grandit.",
  },
  {
    titre: "Aucune commission au résultat",
    texte:
      "Pas de pourcentage sur les sommes encaissées après relance. C'est un choix de fond : un prestataire payé au résultat a intérêt à relancer fort, nous avons intérêt à relancer juste, y compris quand la bonne décision est de ne pas relancer du tout.",
  },
  {
    titre: "Aucun engagement de durée",
    texte:
      "L'abonnement est mensuel. Vous prévenez, le mois en cours va à son terme, les envois s'arrêtent. Rien n'est payé d'avance, donc rien n'est perdu.",
  },
  {
    titre: "Ni frais de résiliation, ni facture de sortie",
    texte:
      "Partir ne se facture pas. Il n'y a pas de pénalité, pas de solde de fin de contrat, pas de forfait de désinstallation.",
  },
  {
    titre: "Aucun surcoût si le mois s'emballe",
    texte:
      "Une saison forte ne déclenche pas de rattrapage en fin de mois. Si votre activité change durablement, on en reparle au moment du point, pas sur la facture.",
  },
  {
    titre: "Vos données repartent avec vous",
    texte:
      "L'export complet vous est remis à la sortie, sans condition et sans frais. Ce qui est entré chez nous vous appartient toujours.",
  },
];

/* ——— 4. le cadre : ce qui se paie une fois, ce qui se paie chaque mois ———
   Quatre blocs illustrés, comme les quatre « benefits » de la référence.
   Le troisième porte le SEUL chiffre de la page, et il n'est pas de nous. */

export type Bloc = {
  titre: string;
  texte: string;
  photo: { src: string; alt: string };
};

export const CADRE = {
  surTitre: "Le cadre",
  titre: "Ce qui se paie une fois, ce qui se paie chaque mois",
  chapo:
    "Deux lignes sur le devis, et nous ne les confondons jamais : c'est ce qui vous permet d'arrêter quand vous voulez sans avoir rien payé d'avance.",
  blocs: [
    {
      titre: "L'installation, une seule fois",
      texte:
        "Elle couvre l'entretien, la mise en route sur vos outils et les deux semaines de rodage pendant lesquelles le système tourne sous votre œil avant de tourner seul. Elle est facturée une fois et ne revient pas.",
      photo: {
        src: "/photos/tarifs-installation-bureau.jpg",
        alt: "Un plateau de bureaux moderne, vide, en lumière naturelle",
      },
    },
    {
      titre: "L'abonnement, chaque mois",
      texte:
        "Il couvre le fonctionnement, vos validations et le suivi : le point du matin, les corrections que vous demandez, la surveillance des envois. Sans engagement de durée.",
      photo: {
        src: "/photos/tarifs-abonnement-facade.jpg",
        alt: "La façade de verre d'un immeuble, sa trame régulière étage après étage",
      },
    },
    {
      titre: "Le Chèque TIC, de 40 à 80 % pris en charge",
      texte:
        "La Région Guadeloupe finance de 40 à 80 % d'un projet de transformation numérique, dans la limite de 10 000 €, pour une entreprise éligible. L'aide porte sur l'installation et non sur l'abonnement : deuxième raison, très concrète, de tenir les deux lignes séparées. Votre éligibilité est vérifiée pendant l'audit, et nous montons le dossier avec vous.",
      photo: {
        src: "/photos/tarifs-cheque-tic-signature.jpg",
        alt: "Deux mains signant un document posé sur un bureau",
      },
    },
    {
      titre: "Le devis tient sur une page",
      texte:
        "Une ligne d'installation, une ligne d'abonnement, la mention du Chèque TIC sous la première, et trente jours de validité pour en parler à votre comptable. Pas de grille d'options à cocher, pas de supplément découvert au troisième mois.",
      photo: {
        src: "/photos/tarifs-devis-spirale.jpg",
        alt: "L'atrium en spirale d'un bâtiment, sa verrière au centre",
      },
    },
  ] satisfies Bloc[],
};

/* ——— 5. clôture plein cadre ——— */

export const CLOTURE = {
  titre: "Savoir ce que ça donnerait chez vous.",
  texte:
    "L'audit est gratuit, dure trente minutes, et se termine par un chiffre : celui que votre situation actuelle vous coûte aujourd'hui.",
  cta: "Réserver l'audit",
  photo: {
    src: "/photos/tarifs-cloture-facade.jpg",
    alt: "La façade d'un immeuble au soleil couchant, reflets dans le verre",
  },
};
