import type { Metadata } from "next";
import Link from "next/link";
import {
  AlertTriangle,
  CalendarCheck,
  Cpu,
  FileDown,
  Layers,
  Lock,
  MapPin,
  Send,
} from "lucide-react";
import PageShell from "@/components/PageShell";
import { MODELES } from "@/components/modeles/donnees";
import PageMotion from "@/components/PageMotion";
import {
  BandeauOutils,
  Chevron,
  EmblemeEurope,
  MaqPrixConnu,
  MaqJournal,
  MaqLocal,
  MaqValidation,
} from "@/components/offres/MediaMoteurs";
import PortesHover from "@/components/offres/PortesHover";
import FondSilk from "@/components/accueil/FondSilk";
import BarreAction from "@/components/accueil/BarreAction";
import FriseDeroule from "@/components/accueil/FriseDeroule";
import TableauEntrees from "@/components/accueil/TableauEntrees";
import { CasColonnes } from "@/components/ui/cas-colonnes";
import { CAS_ACCUEIL } from "@/lib/cas-accueil";
import TexteRevele from "@/components/accueil/TexteRevele";
import BentoChange, { type CarteBento } from "@/components/accueil/BentoChange";
import CartesEcheance, {
  type CarteEcheance,
} from "@/components/accueil/CartesEcheance";
import CartesPreuve, {
  type CartePreuve,
} from "@/components/accueil/CartesPreuve";
import CartesLueur, {
  type CarteLueur,
} from "@/components/accueil/CartesLueur";
import { TuilesCatalogue } from "@/components/accueil/TuilesCatalogue";
import { DecorHero, MotsReveles } from "@/components/ui/hero-section";
import TeamShowcase from "@/components/ui/team-showcase";
import { Drapeau } from "@/components/ui/drapeau";
import {
  MEMBRES,
  EQUIPE_SURTITRE,
  EQUIPE_TITRE,
  EQUIPE_CHAPO,
  EQUIPE_PIED,
} from "@/lib/equipe";
import { FAMILLES, nomPaquet } from "@/lib/content";

/* ══════════════════════════════════════════════════════════════════════
   / — la page d'accueil (30/07/2026)

   4ᵉ page de référence : ocoya.com/affiliates. Teo voulait une home qui ne
   ressemble à aucune autre page du site — or les trois références déjà
   prises (la home, features/create, features/publish, integrations/[marque])
   sont intégralement blanches, et la fiche /offres/payd rendait exactement
   les dix mêmes sections que la version précédente de ce fichier.

   /affiliates est la seule des références restantes à ALTERNER un monde
   noir et un monde clair. C'est ce contraste qu'on reprend, et lui seul
   rend la home reconnaissable au premier coup d'œil.

   Relevé au pixel sur viewport 1440 :
     hero noir #09090b, tout centré — pastille, H1 60/72 ls −1,8 sur 700 de
     large, chapô 18/28,8, deux boutons r8 en 9/15, puis une rangée de faits
     en 24 semibold qui défile ; halo circulaire de 1306 px à 5 % et filets
     de vitesse horizontaux derrière le texte.
     Sections claires : pastille 12/14,4 → H2 48/67,2 centré sur 600 →
     chapô 18/28,8 sur 650 → contenu.

   Écart assumé, demandé par Teo : « en plus développé ». La référence tient
   en 7 sections, celle-ci en compte 11 — le bandeau d'outils, le catalogue
   des douze moteurs, les articles et l'hébergement n'existent pas chez elle.

   30/07 — les deux boutons « Audit gratuit » pointaient sur /audit, hérité
   du code restauré. Or /audit est le DÉROULÉ du protocole, pas la page de
   réservation : le header, lui, envoie sur /tarifs (entrée neutre « Commencer », 28/08). Deux boutons
   du même nom menaient donc à deux endroits différents (Teo). Repointés.

   Aucun chiffre inventé : la rangée du hero ne porte que des faits
   vérifiables (le catalogue, l'échéance légale, le taux du Chèque TIC,
   l'hébergement). Omega ne publie ni nombre de clients ni euros récupérés
   tant qu'ils ne sont pas sourcés.
   ══════════════════════════════════════════════════════════════════════ */

/* 05/08 (Teo) — hero réécrit sur deux reproches précis.
   1. « TPE », « Guadeloupe », « Antilles » : le hero enfermait l'offre dans un
      département alors qu'elle vaut partout en France. Plus aucune mention
      géographique ici, et plus de sigle de segment.
   2. « Pas assez pro, que du générique, des phrases pour vendre » : l'ancien
      titre — « ce qui se répète n'a plus à passer par vous » — sonnait bien et
      ne disait rien. Un visiteur qui le lisait ne savait toujours pas ce que
      fait le produit. Le nouveau nomme les deux tâches les plus reconnaissables
      et le chapô décrit le mécanisme dans l'ordre où il se déroule : ça se
      branche, ça rédige, ça attend votre accord. Chaque affirmation est
      vérifiable ailleurs sur le site, aucune n'est une promesse de vente. */
/* 3ᵉ correction (Teo) : la version précédente ne parlait que de CASHD et de
   FRONTD — « tu parles de PAYD uniquement, je veux un texte qui parle des
   paquets ». Le hero couvre désormais les quatre qui s'installent, dans le
   même ordre que le catalogue plus bas : impayés (CASHD), clients sans
   nouvelles (RELOAD), demandes reçues (FRONTD), factures fournisseurs (FILED).
   La phrase de validation reste : c'est ce qui distingue l'offre d'un envoi
   automatique, et elle vaut pour les quatre. */
/* 07/08 (Teo) — nouveau titre et nouveau chapô, fournis tels quels. Le hero
   n'énumère plus les quatre paquets : il ouvre sur la promesse (continuité,
   rigueur, contrôle) et laisse le détail des quatre tâches à la section
   catalogue plus bas. La 3ᵉ correction ci-dessus ne décrit donc plus le texte
   en place ; elle reste là pour la raison qui l'avait motivée — ne pas
   réduire l'offre à un seul paquet — qui vaut toujours si le hero réénumère
   un jour. La pastille, elle, cite encore les trois familles. */
/* 10/09/2026 — la pastille et le chapô changent de registre, le TITRE reste
   celui de Teo (07/08).

   Pourquoi. Chacun des quatre paquets a désormais sa propre vitrine, qui
   argumente mieux que cette page ne le fera jamais : elle est entière sur un
   seul métier. Répéter ici « relances, réponses et classement » mettait deux
   pages en concurrence sur la même requête — et laissait sans réponse la
   question que pose vraiment un visiteur arrivé du pied de page d'une
   vitrine : « qui est derrière, et que faites-vous d'autre ? »

   L'ancien chapô ne répondait ni à l'une ni à l'autre : « systèmes
   intelligents », « rigueur, continuité et contrôle », « libérer du temps à
   forte valeur ajoutée » auraient tenu sur le site de n'importe quelle
   agence. Le nouveau nomme l'objet fabriqué et sur quoi il se branche —
   193 signes ramenés à 145, sous le budget d'un texte d'appel.

   Ce qui n'y figure PAS, volontairement : l'argument « les quatre systèmes
   se parlent ». Personne n'achète un écosystème ; il se joue dans l'espace
   client, une fois le premier module installé. */
/* 14/09 (Teo) — nouvelles phrases choisies pour le hero. Le titre tient sur
   deux lignes voulues (une par phrase), d'où le tableau. */
const HERO = {
  pastille: "Systèmes métiers, automatisation & intégration",
  titre: [
    "Vos équipes ont les outils.",
    "Nous construisons ce qui les fait travailler ensemble.",
  ],
  chapo:
    "Nous concevons des systèmes sur mesure qui connectent vos directions, vos équipes, vos outils et vos données afin de fluidifier les opérations, automatiser les processus critiques et améliorer le pilotage de votre organisation — sans bouleverser votre environnement existant.",
  /* 15/09/2026 (Teo, « sur mobile on comprend direct quoi, combien, pour
     qui ») — le chapô de bureau fait 40 mots, six lignes à 390 px : le
     bouton tombait sous la ligne de flottaison et le visiteur arrivait sur
     une page qui ne répond à aucune des trois questions.

     15/09, 2ᵉ passe (Teo : « dans les textes des pages on devrait
     retrouver ces infos, pas une section spécialement pour ») — la
     première version posait les trois réponses en TABLEAU sous le bouton,
     un `<dl>` encadré de trois lignes « Quoi / Pour qui / Combien ». La
     réponse y était, mais sous une forme que le reste du site n'emploie
     nulle part : une fiche d'identité collée au hero, qui se lit comme un
     encadré de notice et non comme la page. Les trois réponses sont donc
     rentrées dans les DEUX phrases qui étaient déjà là — le chapô prend le
     quoi et le pour qui, la sous-ligne du bouton prend le combien. Rien
     n'est perdu, et il n'y a plus de bloc à entretenir.

     Le bureau garde ses phrases : il a les trois réponses ailleurs
     (colonne de droite, menu), et son chapô a 40 mots pour les moyens. */
  chapoCourt:
    "Relances, demandes entrantes, réactivation, factures fournisseurs : automatisés pour les PME et les groupes multi-sites, sur vos outils actuels.",
  bouton: "Découvrir notre approche",
  sous: "Identifions les leviers à plus fort impact pour votre organisation.",
  /* le COMBIEN. Pas de montant : depuis le 15/09 le site n'affiche plus de
     grille, le tarif est arrêté à l'audit sur les volumes réels. Ce qu'on
     donne est ce qui se vérifie — la base de calcul et le délai. */
  sousCourt:
    "Tarif à l'usage, selon vos volumes. Arrêté à l'audit, en 30 minutes.",
};

/* 14/09 (Teo, soir) — le hero s'installe désormais mot à mot, mouvement
   repris du composant qu'il a collé (`components/ui/hero-section.tsx`, qui
   porte le relevé et les écarts). Il a tranché la seule question qui
   changeait le travail : le hero RESTE clair — même nuancier Silk, même
   maquette, même plancher de lisibilité —, on ne lui prend que
   l'animation.

   La cadence est calculée, pas posée à l'œil. La référence étale la
   sienne sur 6 s ; c'est un écran de démonstration. Ici la pastille part
   à 0, le titre enchaîne mot à mot, et le chapô entame sa montée quand il
   reste trois mots au titre — les deux se recouvrent, sinon on regarde un
   blanc. Tout est en place à 2,1 s.

   Le chapô, le bouton et la sous-ligne arrivent d'un BLOC. Les peindre
   mot à mot aussi (la référence le fait) portait la cascade à 5 s pour un
   paragraphe de 40 mots que personne ne lit à cette vitesse. */
const PAS_MOT = 70;
const CADENCE = {
  /* La pastille arrive d'un BLOC, là où la référence peint aussi sa
     sur-ligne mot à mot. La raison est sa forme : c'est une PILULE, avec
     un contour, un fond et un flou d'arrière-plan. Mot à mot, on regarde
     pendant une demi-seconde une gélule vide qui se remplit. La
     référence, elle, n'a qu'un texte nu à cet endroit. */
  pastille: 0,
  titre: 220,
  chapo: 1000,
  bouton: 1160,
  sous: 1280,
};

/* 05/08 — la liste FAITS est partie avec la rangée défilante du hero, retirée
   parce qu'elle faisait doublon avec la bande suivante. Elle est dans
   l'historique git si le bandeau revient. */

/* Filets de vitesse du hero — positions figées (jamais d'aléatoire au
   rendu, ça casserait l'hydratation). left/top en %.

   30/07 — les largeurs étaient en PIXELS relevés sur viewport 1440. Sur un
   téléphone de 390 px, un filet de 420 px traversait donc l'écran de bord à
   bord : on ne lisait plus des stries mais des barres horizontales en
   travers du titre (Teo). Elles sont désormais exprimées en vw — même
   largeur qu'avant à 1440 (1 vw = 14,4 px), et de courtes stries partout
   ailleurs. L'opacité, elle, est divisée sur petit écran (voir .o-trait). */
/* 05/08 — le tableau TRAITS (filets de vitesse du hero nuit) et ses règles
   de placement ont été retirés avec le hero qu'ils habillaient. Ils sont
   dans l'historique git si le hero sombre revient un jour. */


/* 07/08 (Teo) — les deux bénéfices sont réécrits, textes fournis tels quels.
   Le second change aussi d'étiquette : « Charge » devient « Temps ».

   Ces textes décrivent le résultat plutôt que le mécanisme. La cadence de
   relance (J+3 / J+7 / J+21), l'arrêt sur règlement et le garde-fou des sept
   jours ne sont donc plus énoncés ici — ils restent exposés sur la fiche
   moteur correspondante, ce qui préserve la règle maison : toute affirmation
   de cette page est vérifiable ailleurs sur le site. La note du 05/08 sur le
   chiffre d'encours guadeloupéen tombe d'elle-même, le texte n'avançant plus
   aucun chiffre.
   11/09/2026 (Teo, sur une capture de son téléphone) — « réduis la longueur
   des textes sur cette section, c'est trop long à lire spécialement sur
   mobile ». Il avait le chiffre contre lui : mesurée à 390 px, la section
   pesait 64 lignes vues, dont CINQ blocs de 5 à 7 lignes là où la méthode
   vise trois. Les textes fournis le 07/08 sont donc raccourcis — de 213 et
   218 signes à 110 et 120.

   Ce qui a été coupé est l'ILLUSTRATION, jamais l'affirmation : la liste
   d'exemples des verrous (facture déjà réglée, client qui a demandé
   l'arrêt, horaire, plafond du jour) et les deux phrases de conclusion qui
   reformulaient le bénéfice déjà énoncé par le titre de la carte. Les
   douze verrous, eux, restent nommés ici ET détaillés dans la FAQ plus bas.
   Une redondance est tombée au passage : le texte de la carte « Rien ne part
   sans que vous l'ayez vu » rappelait la file de validation que son TITRE
   énonce déjà — une ligne entière pour redire l'intitulé.
   La règle maison tient toujours : toute affirmation de cette page est
   vérifiable ailleurs sur le site. */
const BENEFICES = [
  {
    label: "Trésorerie",
    titre: "Votre chiffre d'affaires ne reste plus en attente.",
    texte:
      "Les échéances sont suivies, les relances partent au bon moment et s'arrêtent au règlement.",
    maquette: <MaqValidation />,
  },
  {
    label: "Temps",
    titre: "Vos journées retrouvent de l'espace.",
    texte:
      "Suivi, préparation, classement, réponses se font en arrière-plan. Vos équipes n'ont qu'à décider.",
    maquette: <MaqJournal />,
  },
];

/* 11/09/2026 (Teo) — la section passe au bento à cartes pointillées, qui
   demande CINQ cartes là où `BENEFICES` n'en portait que deux. Les trois
   ajoutées ne sont pas des arguments neufs : ce sont les résumés de trois
   réponses de la FAQ, plus bas sur cette même page (le contrôle avant
   envoi, les outils qu'on ne change pas, le poste unique mené jusqu'au
   bout). Le détail reste dans la FAQ ; ici c'est l'annonce.

   Les deux premières gardent leur texte d'origine ET leur maquette : ce
   sont les deux seules cartes assez hautes pour la porter, et sans elles
   la zone devenait cinq blocs de texte d'affilée.

   L'ordre des `span` suit la grille de la source : 3+2 (la 6ᵉ colonne
   reste libre pour le titre qui remonte), puis 4, puis 2+2. */
const CARTES_CHANGE: CarteBento[] = [
  {
    titre: BENEFICES[0].titre,
    texte: BENEFICES[0].texte,
    maquette: BENEFICES[0].maquette,
    span: "lg:col-span-3 lg:row-span-2",
  },
  {
    titre: BENEFICES[1].titre,
    texte: BENEFICES[1].texte,
    maquette: BENEFICES[1].maquette,
    span: "lg:col-span-2 lg:row-span-2",
  },
  {
    titre: "Rien ne part sans que vous l'ayez vu.",
    texte:
      "Douze verrous sont vérifiés juste avant l'envoi. Un seul qui saute, rien ne part.",
    span: "lg:col-span-4",
  },
  {
    titre: "Vous ne changez pas de logiciel.",
    texte:
      "Ils lisent et écrivent dans ce que vous utilisez déjà : messagerie, tableur, agenda. Rien à migrer.",
    span: "lg:col-span-2",
  },
  {
    titre: "Un poste à la fois, mené jusqu'au bout.",
    texte:
      "On met en route celui qui vous coûte le plus cher. Les autres suivent si les chiffres du premier le justifient.",
    span: "lg:col-span-2",
  },
];

/* ══════════════════════════════════════════════════════════════════════
   À L'ÉCHELLE D'UN GROUPE (12/09/2026)

   Teo : le lien va être envoyé à des directions de grands groupes du
   département. La page, elle, était écrite pour l'autre bout du marché —
   « un garage qui rate des appels », les prix publics à 59 € en clair,
   « pour les dirigeants de TPE » dans le pied du blog. Rien n'y est faux ;
   c'est le registre qui disqualifie avant qu'on ait lu l'offre.

   POURQUOI UNE SECTION, PAS UNE REFONTE. Les deux publics doivent tenir sur
   la même page : le prix public est ce qui fait vendre sans rendez-vous, et
   il ne bouge pas d'ici. Ce qui manquait, c'est la réponse aux quatre
   questions qu'une direction pose AVANT de parler du produit — comment on
   démarre sans risquer la production, ce qui empêche une automatisation
   d'écrire une bêtise à un client, où vivent les données et comment on en
   sort, et ce que ça impose au système d'information. Une par carte.

   AUCUN ARGUMENT NEUF. Les quatre existaient déjà, dispersés : le rodage à
   blanc et la bascule hebdomadaire dans la fiche VAULT, les douze verrous
   dans la FAQ, le cloisonnement et l'export dans la section hébergement,
   les outils inchangés dans le bento juste au-dessus. Ils sont ici REMONTÉS
   et dits dans la langue d'un comité de direction — un périmètre, un
   journal opposable, une sortie prévue dès le départ.

   CHAQUE CARTE MÈNE À SA PREUVE, et les quatre destinations sont
   distinctes : c'est la seule façon de tenir le registre. Une direction qui
   lit « journal que personne ne modifie » clique pour vérifier ; si le lien
   la ramène là d'où elle vient, l'argument tombe.

   CE QUI N'Y EST PAS, faute d'être vrai aujourd'hui : l'entité qui signe, le
   contrat de sous-traitance RGPD, l'engagement de niveau de service. Ce sont
   les trois premières questions d'un juriste de groupe et aucune n'a de
   réponse écrite. Elles ne s'inventent pas ici.
   ══════════════════════════════════════════════════════════════════════ */
const GROUPES: CarteLueur[] = [
  {
    label: "Déploiement",
    titre: "On commence par un périmètre, jamais par le groupe.",
    texte:
      "Une filiale, un service, une famille de comptes. Deux semaines où rien ne part, puis un poste par semaine.",
    lien: { label: "Demander un audit", href: "/reserver" },
  },
  {
    label: "Contrôle",
    titre: "Les interdits ne sont pas des consignes.",
    texte:
      "Douze contrôles vivent dans notre base, sous les automatisations : l'envoi interdit n'est pas reporté, il n'est jamais écrit.",
    /* 15/09/2026 — la carte menait à « Ce que le système refuse »
       (/offres/securite, la fiche VAULT). Les deux paquets compris ne
       s'affichent plus nulle part sur le site et aucune autre page ne
       détaille les douze contrôles : la carte reste SANS lien plutôt que
       d'envoyer vers une page qu'on ne montre plus, ou de renvoyer le
       visiteur là d'où il vient. `lien` est facultatif dans CartesLueur. */
  },
  {
    label: "Données",
    titre: "Cloisonnées, européennes, restituables.",
    texte:
      "Un espace par entreprise, hébergé dans l'Union. Tout ce qui part reste au journal. À la sortie : export, puis effacement.",
    lien: { label: "Où vont vos données", href: "/vos-donnees" },
  },
  {
    label: "Intégration",
    titre: "Votre système d'information ne bouge pas.",
    texte:
      "On lit et on écrit dans les outils en place. Aucune migration, aucun compte à créer pour vos équipes.",
    lien: { label: "Les outils compatibles", href: "/integrations" },
  },
];

/* 05/08 (Teo, « réduis cette section ») — la frise passe de cinq colonnes à
   quatre, et chaque texte de trois lignes à deux.

   Deux étapes ont fusionné plutôt que d'être supprimées : « vous gardez la
   main » (les douze verrous) et « on mesure, on ajuste » (le journal) ne sont
   pas deux moments successifs du déroulé, ce sont les deux faces d'une même
   étape — ce qui est vérifié avant l'envoi, et ce qui en est consigné après.
   Aucune information ne se perd : les verrous restent détaillés dans la FAQ
   et sur les fiches moteur, le journal dans la section « garanties ».

   Le gain n'est pas que vertical. À cinq colonnes, la grille tombait sur
   trois rangées en tablette avec un « 05 » seul sur la dernière, sans rien à
   sa droite ; à quatre, elle se referme sur deux rangées pleines. */
/* 07/08 (Teo) — le déroulé est réécrit, textes fournis tels quels. Il reste à
   quatre étapes, donc la mise en grille décrite ci-dessus ne bouge pas ; en
   revanche la fusion « verrous + journal » qu'elle justifiait n'a plus d'objet,
   la 04 étant devenue « Pilotage ». Les douze verrous restent documentés dans
   la FAQ et sur les fiches moteur, le journal dans la section « garanties » :
   rien ne se perd, mais plus rien n'y renvoie depuis ici.

   Chaque étape gagne un `sousTitre` : la source distingue le nom de l'étape
   (« Diagnostic opérationnel ») de ce qu'elle produit (« Identifier les
   processus à fort impact »), là où l'ancienne version fondait les deux en un
   seul titre. */
const ETAPES = [
  {
    n: "01",
    titre: "Diagnostic opérationnel",
    sousTitre: "Identifier les processus à fort impact",
    texte:
      "Nous analysons vos flux de travail, les points de friction et les tâches à faible valeur ajoutée afin de cibler les leviers d'amélioration les plus pertinents.",
    court:
      "Nous relevons vos flux et les tâches à faible valeur, pour cibler les leviers.",
  },
  {
    n: "02",
    titre: "Conception",
    sousTitre: "Définir un système adapté à votre organisation",
    texte:
      "Chaque solution est conçue selon vos règles métier, vos priorités et vos méthodes de travail. Aucun modèle générique : le système s'adapte à votre fonctionnement.",
    court:
      "Le système suit vos règles métier. Aucun modèle générique.",
  },
  {
    n: "03",
    titre: "Déploiement",
    sousTitre: "Intégrer sans bouleverser l'existant",
    texte:
      "Nous connectons le système à votre environnement de travail et organisons sa mise en production de manière progressive, sécurisée et maîtrisée.",
    court:
      "Nous le branchons sur vos outils, en mise en production progressive.",
  },
  {
    n: "04",
    titre: "Pilotage",
    sousTitre: "Mesurer, ajuster, faire évoluer",
    texte:
      "Les premières opérations restent sous votre contrôle. Nous affinons les règles, suivons les performances et faisons évoluer le système selon vos usages.",
    court:
      "Les premières opérations restent sous votre contrôle ; on affine les règles.",
  },
];

/* 07/08 → 15/09 — l'histoire du bloc financement, qui n'est plus là.
   Il portait le Chèque TIC, avec l'incise « porté par la Région
   Guadeloupe » remise par Teo le 07/08 : sans elle, un visiteur hexagonal
   lisait une aide qui le concernait. Le 15/09, Teo a tranché plus court —
   le dispositif sort de l'accueil (voir la première carte de GARANTIES).
   Il reste dans la FAQ de /tarifs et dans son article de blog — la
   section de /tarifs qui le portait a été supprimée le 15/09 au soir. */
/* 11/09/2026 — les deux corps de 5 et 6 lignes sont ramenés à 3, et
   l'encadré « accompagnement » disparaît : le type est désormais celui de
   `CartesLueur`, qui n'a pas de fente pour lui. Ce qui a été retiré de la
   carte « Données » (chiffrement, hébergement dans l'Union, cloisonnement en
   base) est dit juste au-dessus, dans les six cartes de `PREUVES` — c'était
   le même fait écrit deux fois à 300 px d'intervalle. */
const GARANTIES: CarteLueur[] = [
  {
    /* 15/09/2026 — cette carte portait le CHÈQUE TIC (« jusqu'à 10 000 € »).
       Décision de Teo : il sort de l'accueil. C'est une aide de la Région
       Guadeloupe posée sur un accueil national — pour la quasi-totalité des
       visiteurs, une promesse qui ne les concerne pas, et qui brouille le
       « produit français » ([[produit-francais-jamais-guadeloupeen]]).
       Il n'est pas retiré du site : il est dit dans la FAQ de /tarifs, sur
       la ligne d'engagement de l'installation et dans son article de blog,
       avec l'incise « Région Guadeloupe » qui reste obligatoire là où il
       est cité. (La bande qui lui était consacrée sur /tarifs a elle aussi
       été supprimée, le 15/09 au soir.) À la place, un argument qui vaut pour
       tout le monde et tient le même rôle dans le titre de section
       (« un investissement maîtrisé ») : le prix est connu avant qu'on
       commence. Pour revenir en arrière, le texte et la maquette MaqCheque
       sont intacts dans components/offres/MediaMoteurs.tsx. */
    label: "Engagement",
    titre: "Le prix est connu avant qu'on commence",
    texte:
      /* 15/09/2026 — la phrase disait « pour les indépendants, TPE et PME, les prix sont publics ». Le site n'affiche plus de barème : il estime sur les volumes saisis, et l'audit fixe le prix. Promettre un prix public sur l'accueil, c'est promettre un montant que plus aucune page ne porte. */
      "L'audit mesure vos volumes avant la première ligne de code : ce qui passe chaque mois, ce qui revient à quelqu'un, ce qui se perd sans être compté. Le prix en découle, il est écrit dans votre devis, et rien ne démarre sur une estimation faite au téléphone.",
    court:
      "L'audit mesure vos volumes, le prix en découle, et il est écrit dans votre devis.",
    lien: {
      label: "Comment le prix se calcule",
      href: "/tarifs",
    },
    maquette: <MaqPrixConnu />,
  },
  {
    label: "Données",
    titre: "Vos données restent les vôtres",
    texte:
      "Vous gardez vos outils de tous les jours : messagerie, tableur, WhatsApp. Le suivi vit dans un espace réservé à votre entreprise. Le jour où vous arrêtez, tout vous est remis et effacé sur demande.",
    court:
      "Vous gardez vos outils. Le jour où vous arrêtez, tout vous est remis et effacé.",
    lien: { label: "Pourquoi ce choix", href: "/blog/rgpd-donnees-locales" },
    maquette: <MaqLocal />,
  },
];

/* Les trois faits de la section « hébergement ». Aucun n'est une promesse :
   le cloisonnement est une contrainte posée en base et prouvée par un jeu
   d'invariants, le chiffrement et le coffre à secrets sont l'état réel de
   l'installation, la réversibilité est déjà écrite dans les mentions
   légales. Si l'un des trois cesse d'être vrai, il sort d'ici avant de
   devenir un argument. */
/* 07/08 (Teo) — les trois blocs sont réécrits, textes fournis tels quels, et
   réordonnés : le lieu passe en premier, le cloisonnement et le chiffrement
   fusionnent en deuxième, la réversibilité reste en troisième.

   La règle ci-dessus tient toujours — rien ici n'est faux — mais les trois
   textes sont désormais plus généraux que les précédents : « environnement
   logique distinct » à la place de la contrainte d'unicité posée en base,
   « exportées ou supprimées selon les conditions prévues contractuellement »
   à la place de l'export en format ouvert et de l'effacement sans reste. Le
   détail technique n'est pas perdu : il reste dans les mentions légales et
   dans l'article « Pourquoi ce choix ». C'est le registre de cette section
   qui change, pas les faits. */
/* 11/09/2026 (Teo, « il y a un peu trop de texte sur la page d'accueil ») —
   les trois paragraphes deviennent SIX faits d'une ligne, portés par
   `CartesPreuve`. Rien n'est retiré : le lieu, la juridiction, le
   chiffrement, le cloisonnement et la réversibilité disaient déjà ça, en
   quatre à cinq lignes chacun. La sixième carte est nouvelle à l'écran mais
   pas au fond — c'est la réserve sur l'IA, qui était en petit sous la carte.
   Le détail contractuel (« selon les conditions prévues ») reste dans les
   mentions légales ; une carte de fait n'est pas un contrat. */
const PREUVES: CartePreuve[] = [
  {
    icone: <MapPin size={19} strokeWidth={1.6} />,
    intitule: "Hébergement",
    fait: "Francfort, Allemagne",
  },
  {
    /* l'emblème de la section précédente : il vivait à 104 px en tête de
       colonne, il tient le rôle d'icône à 22. */
    icone: <EmblemeEurope taille={22} />,
    intitule: "Juridiction",
    fait: "Union européenne",
  },
  {
    icone: <Lock size={19} strokeWidth={1.6} />,
    intitule: "Chiffrement",
    fait: "Au repos et en transit",
  },
  {
    icone: <Layers size={19} strokeWidth={1.6} />,
    intitule: "Cloisonnement",
    fait: "Un espace par entreprise",
  },
  {
    icone: <FileDown size={19} strokeWidth={1.6} />,
    intitule: "Réversibilité",
    fait: "Export ou effacement",
  },
  {
    icone: <Cpu size={19} strokeWidth={1.6} />,
    intitule: "Modèles d'IA",
    fait: "Interrogés hors d'Europe",
  },
];

const FAQ = [
  {
    q: "Il faut changer de logiciel ?",
    a: "Non. Les systèmes lisent et écrivent dans ce que vous utilisez déjà : messagerie, tableur, WhatsApp, agenda, outil de facturation. Aucun compte à créer, aucune donnée à migrer, aucune colonne à renommer : vos fichiers gardent la forme qu'ils ont aujourd'hui.",
  },
  {
    q: "Qu'est-ce qui part sans que je le voie ?",
    a: "Rien, sauf si vous le décidez explicitement. Chaque message passe par une file de validation, et douze verrous sont vérifiés juste avant l'envoi : facture déjà réglée, client qui a demandé l'arrêt, message déjà parti récemment, horaire, plafond du jour. Un seul qui saute et l'envoi est refusé.",
  },
  {
    q: "On commence par combien de choses à la fois ?",
    a: "Une, le plus souvent. L'assistant tient quatre postes, mais on met en route celui qui vous coûte le plus cher, celui que vous choisissez dans la grille ou que l'audit chiffre chez les structures à plusieurs services, et nous le menons jusqu'au bout. Les autres suivent si les chiffres du premier le justifient.",
  },
  {
    /* 28/08 — la réponse v3 (« un prix affiché ici ne voudrait pas dire
       grand-chose ») niait la grille publique vers laquelle le CTA de
       cette même page envoie désormais. Réécrite pour les deux mondes. */
    q: "Combien cela coûte-t-il ?",
    a: "Le prix suit ce que le système traite pour vous : le nombre de pièces qui passent chaque mois — factures lues, demandes reçues, relances parties — et le nombre de postes en service. Vos volumes donnent votre palier sur la page Tarifs, et l'installation s'y chiffre à part, une seule fois. Pour les organisations où plusieurs services valident, la grille ne s'applique pas : les volumes se mesurent à l'audit et le devis en découle. Dans les deux cas, le prix est annoncé avant que quoi que ce soit démarre.",
  },
  {
    q: "Où sont hébergées mes données ?",
    a: "Dans un espace dédié à votre entreprise, chiffré et hébergé dans l'Union européenne, strictement séparé de celui de chaque autre client. Les modèles d'intelligence artificielle utilisés reçoivent le strict nécessaire à chaque tâche, jamais l'intégralité d'un fichier, et vous pouvez demander l'export complet ou la suppression à tout moment.",
  },
  {
    q: "Je suis concerné par la facture électronique ?",
    a: "Au 1ᵉʳ septembre 2026, toutes les entreprises établies en France doivent être en mesure de recevoir des factures au format structuré. L'émission suit au 1ᵉʳ septembre 2027 pour les TPE et PME. Nous ne vendons pas de mise en conformité, mais l'audit fait le point sur votre fichier client (SIREN, adresses, mentions obligatoires), parce que c'est de là que viennent presque toutes les factures rejetées.",
  },
];

/* 05/08/2026 — les cartes de la vitrine sont désormais les PAQUETS, pas les
   moteurs. Les quatre qui s'installent tiennent exactement dans la grille de
   quatre colonnes qui existait déjà (auparavant les quatre moteurs vedettes
   sur douze) : aucune maille ne bouge.

   15/09/2026 — les deux paquets compris, PULSE et VAULT, ne sont plus
   affichés du tout : ni carte, ni lien, ni mention nommée. Ce qu'ils font
   reste dit (l'état chaque matin, la validation avant envoi), mais comme une
   garantie comprise, jamais comme un système de plus à découvrir. */
const VEDETTES = ["CASHD", "RELOAD", "FRONTD", "FILED"];

const MOTEURS = FAMILLES.flatMap((f) => f.moteurs)
  .filter((m) => VEDETTES.includes(m.system))
  .sort((a, b) => VEDETTES.indexOf(a.system) - VEDETTES.indexOf(b.system));

/* 07/08 (Teo) — nouvelles accroches des quatre cartes du catalogue, fournies
   telles quelles, avec un sous-titre qui nomme l'objectif du système.

   Elles sont définies ICI et pas dans `lib/content.ts` à dessein. Le champ
   `benefit` des moteurs est lu à huit endroits — MotorCard, PepitesSection,
   les trois gabarits d'offre, Publics, et la fiche /offres/[system] qui s'en
   sert de pitch de repli. Le réécrire aurait changé six pages qu'on ne m'a
   pas demandé de toucher. Cette table ne vaut donc que pour la vitrine ; le
   reste du site continue de lire `benefit`.

   Corollaire à connaître : une accroche modifiée ici ne suit pas ailleurs.
   Le jour où le nouveau registre doit valoir partout, c'est `benefit` qu'il
   faut réécrire, et cette table disparaît.

   15/09/2026 (Teo) — « faut qu'on trouve des phrases plus pro et
   crocheuses ; ils lisent ça, ils se disent : wtf, ils peuvent faire ça ».

   Les huit textes précédents avaient le défaut exact que la doctrine
   (OMEGA/DOCTRINE-TEXTES-SAAS.md) décrit : voix passive et produit absent
   — « les échéances sont suivies », « les clients inactifs sont
   identifiés ». Personne n'agit dans ces phrases, donc rien n'y étonne.
   Chaque carte porte désormais un FAIT daté en intitulé, puis une phrase
   qui dit comment, puis ce qui reste au lecteur.

   AUCUN de ces faits n'est inventé pour la carte : les quatre sont repris
   mot pour mot des pages produit, où ils ont déjà passé la relecture.
     • CASHD  — lib/produits/relances.ts, PRINCIPE.titre (« À 7 h… ») et la
       carte `relit` (« relit votre facturier chaque matin »).
     • RELOAD — lib/produits/reprise.ts, HERO.chapo (le compte qui s'éteint,
       vu « à la clôture ») et carteCarte.suite (lecture de nuit, silence
       au-delà du délai).
     • FRONTD — lib/produits/accueil.ts, HERO.titre (le meilleur titre du
       parc, gardé intact) et APPORT (« répond dans la minute »).
     • FILED  — lib/produits/factures.ts, HERO : « vous connectez une
       messagerie », et le classement au bon dossier.

   ⚠ FILED N'EST PAS LA CARTE DES FACTURES (Teo, 15/09, après une première
   version qui disait « plus une seule facture ») : « on parle pas que des
   factures, c'est tous les documents, peu importe le doc que l'entreprise
   reçoit ; il sait lire et rédiger pour tout type de document ». Le paquet
   s'appelle d'ailleurs « FILED · flux documentaires » dans lib/content.ts.
   La facture fournisseur est un CAS, le plus démontrable — c'est celui que
   tient toute la page /offres/factures-fournisseurs, qui reste, elle,
   écrite au périmètre étroit (HT/TVA/TTC recoupés, journal d'achats). La
   carte et la page ne disent donc pas la même largeur : à reprendre le jour
   où la page s'élargit.

   Deux garde-fous tenus : aucune promesse de résultat (on dit ce que la
   machine FAIT, jamais ce que ça rapporte), et la validation humaine reste
   écrite dans deux cartes sur quatre — c'est elle qui rend le reste
   crédible. Les heures portent une espace fine insécable (U+202F), comme
   partout dans le parc : un « 7 h » avec une espace ordinaire casse en
   fin de ligne. */
/* 15/09/2026 — chaque accroche porte DEUX longueurs. `texte` est celle de
   bureau, inchangée ; `court` est servie sous 640 px, où la grille 2 × 2 se
   referme en une colonne et où les 150 signes de la première prennent cinq
   lignes. Ce n'est pas un résumé : on garde le VERBE (relit, écrit, classe)
   et on laisse tomber la circonstance. La promesse est la même aux deux
   longueurs — c'est la règle de la doctrine. */
const ACCROCHES_VITRINE: Record<
  string,
  { objectif: string; texte: string; court: string }
> = {
  CASHD: {
    objectif: "À 7 h, vos relances sont déjà écrites.",
    texte:
      "CASHD relit votre facturier chaque matin et rédige une relance pour chaque compte en retard. Vos équipes n'ont plus qu'à décider laquelle part.",
    court:
      "Relit le facturier chaque matin, écrit la relance. Vous décidez laquelle part.",
  },
  RELOAD: {
    objectif: "Un client qui s'éteint, vous le voyez avant la clôture.",
    texte:
      "RELOAD relit votre base et votre historique pendant la nuit, puis ne garde que les comptes dont le silence dépasse le délai que vous avez fixé.",
    court:
      "Relit votre base la nuit, remonte les comptes silencieux depuis trop longtemps.",
  },
  FRONTD: {
    objectif: "Une demande reçue à 21 h obtient sa réponse à 21 h.",
    texte:
      "FRONTD lit le message dès qu'il arrive et répond dans la minute, sans jamais sortir de ce que vous avez validé avec nous.",
    court:
      "Lit le message dès son arrivée et répond dans la minute, sur vos réponses validées.",
  },
  FILED: {
    objectif: "Vos équipes ne ressaisiront plus un seul document.",
    texte:
      "Vous connectez une messagerie, rien d'autre. FILED lit chaque document reçu, quel qu'en soit le type, le classe au bon dossier et rédige ce qui doit repartir.",
    court:
      "Lit chaque document reçu, le classe au bon dossier, rédige ce qui repart.",
  },
};

/* ——— en-tête de section, commun à toutes les sections claires ——— */
/* ══════════════════════════════════════════════════════════════════════
   LES TROIS PORTES (10/09/2026)

   La section qui manquait. La vitrine présentait quatre paquets et rien
   d'autre — or Omega vend aussi le sur-mesure et les sites, qui sont
   aujourd'hui ce qui paie. `/offres/sur-mesure` n'était atteignable que par
   un lien en bas de /offres (et n'est même pas dans le sitemap) ; les vingt
   et un modèles de sites vivaient derrière un onglet « Tarifs ». Un visiteur
   pouvait donc parcourir l'accueil entière sans apprendre que ces deux
   choses existent.

   Elles ne sont pas un lot de consolation : ce sont les deux offres qui
   EXIGENT l'audit et l'écriture des règles. Les paquets, eux, ont désormais
   leur propre vitrine et n'ont plus besoin qu'on plaide pour eux ici.

   Aucun chiffre inventé : le compte vient de MODELES.length, compte réel de
   components/modeles, et « nom de domaine compris » est ce qu'annonce déjà
   /tarifs/site. */
/* 11/09/2026 (Teo) — les trois cartes penchées de la section « échéance ».

   Elles remplacent le pavé de deux paragraphes qui occupait la colonne
   droite. Le calendrier légal y gagne : il était énoncé en prose dans la
   FAQ et nulle part ailleurs, alors que ce sont DEUX dates, pas une — la
   section n'en affichait qu'une, en gros, dans son titre.

   Les deux dates sortent de la réponse « Je suis concerné par la facture
   électronique ? » de la FAQ, plus bas sur cette même page. La troisième
   carte est le premier paragraphe du pavé retiré, resserré. Le second
   paragraphe (« nettoyer à froid / en urgence ») n'entre pas dans une
   carte : il passe en ligne sous l'escalier, rien n'est perdu.

   L'ordre d'empilement suit celui de la source : la première carte est
   AU-DESSUS, les suivantes descendent en escalier vers la droite. */
const ECHEANCES: CarteEcheance[] = [
  {
    icone: <CalendarCheck className="h-3.5 w-3.5" />,
    titre: "Recevoir",
    texte: "Toutes les entreprises établies en France.",
    bas: "1ᵉʳ septembre 2026",
    place: "[grid-area:stack] hover:-translate-y-8",
  },
  {
    icone: <Send className="h-3.5 w-3.5" />,
    titre: "Émettre",
    texte: "Les TPE et les PME.",
    bas: "1ᵉʳ septembre 2027",
    place:
      "[grid-area:stack] translate-x-8 translate-y-8 hover:-translate-y-1 sm:translate-x-12 sm:translate-y-10",
  },
  {
    icone: <AlertTriangle className="h-3.5 w-3.5" />,
    titre: "Le vrai blocage",
    texte: "SIREN manquants, adresses incomplètes, TVA approximative.",
    bas: "Votre fichier client",
    place:
      "[grid-area:stack] translate-x-16 translate-y-16 hover:translate-y-8 sm:translate-x-24 sm:translate-y-20 sm:hover:translate-y-10",
  },
];

/* ══════════════════════════════════════════════════════════════════════
   LA CITATION DU TEMPS D'ARRÊT (11/09/2026)

   Elle n'est pas écrite pour l'accueil : c'est `FAMILLES.installes.proof`,
   déjà publiée sur /offres. Lue ici plutôt que recopiée, pour qu'une
   réécriture côté `lib/content.ts` ne laisse pas deux versions de la même
   phrase en ligne. Le `type === "quote"` n'est pas décoratif : `Proof` est
   une union, une famille peut porter des chiffres à la place.

   Si la famille venait à passer aux chiffres, la section disparaît d'elle
   même plutôt que d'afficher un trou — c'est voulu : la règle maison
   interdit d'inventer une phrase pour meubler l'emplacement. */
const PREUVE_INSTALLES = FAMILLES.find((f) => f.id === "installes")?.proof;
const CITATION =
  PREUVE_INSTALLES?.type === "quote" ? PREUVE_INSTALLES : null;

const PORTES = [
  {
    nom: "Les systèmes prêts",
    objectif: "Quatre postes déjà outillés",
    texte:
      "Relances, demandes entrantes, pièces fournisseurs, affaires à reprendre. Installés en l'état, réglés sur vos règles.",
    lien: { label: "Voir les quatre", href: "/offres" },
  },
  {
    nom: "Le sur-mesure",
    objectif: "Ce qui n'existe pas encore",
    texte:
      "Un logiciel métier, un pont entre deux outils, un contrôle qui se répète. Le besoin est cadré et chiffré avant d'écrire une ligne.",
    lien: { label: "Comment se fait le cadrage", href: "/offres/sur-mesure" },
  },
  {
    nom: "Votre site",
    objectif: "Une vitrine qui tient debout",
    texte:
      `${MODELES.length} modèles en ligne, tous visitables. Contenu réécrit à votre métier, nom de domaine et mise en ligne compris.`,
    lien: { label: "Voir les modèles", href: "/modeles" },
  },
];

function EnTete({
  pastille,
  titre,
  chapo,
  court,
}: {
  /* 12/09/2026 — un noeud et plus une chaine : le sourcil de la section
     equipe porte le drapeau avant son intitule. Les onze autres appels
     passent une chaine, qui reste un noeud valide. */
  pastille: React.ReactNode;
  titre: string;
  chapo: string;
  /* 15/09/2026 — le chapô en une phrase, servi sous 768 px.
     Mesuré à 375 px : les chapôs de bureau font trois à cinq lignes, douze
     fois dans la page, soit ~1 100 px de sous-titre avant même le contenu.
     Facultative : une section sans version courte garde `chapo` partout. */
  court?: string;
}) {
  return (
    <div className="flex flex-col items-center text-center">
      <div data-reveal>
        <span className="o-pill o-pill--xs">{pastille}</span>
      </div>
      <h2 data-reveal className="o-h2 mt-4 max-w-[600px]">
        {titre}
      </h2>
      <p data-reveal className="o-lead mt-3 max-w-[650px] md:mt-4">
        {/* les deux longueurs vivent dans le DOM et s'arbitrent en CSS :
            un rendu conditionnel en JavaScript ferait clignoter la phrase
            entre le rendu serveur et l'hydratation. */}
        {court ? (
          <>
            <span className="md:hidden">{court}</span>
            <span className="hidden md:inline">{chapo}</span>
          </>
        ) : (
          chapo
        )}
      </p>
    </div>
  );
}

/* 15/09 — l'accueil prenait tout son metadata du layout, canonique
   comprise : il n'en avait donc aucune, comme 26 autres pages. Elle est
   posée ICI et pas dans le layout à dessein — une canonique posée en
   haut se propagerait telle quelle à toutes les pages qui n'en
   redéfinissent pas, et le site entier se déclarerait doublon de
   l'accueil. Le titre et la description, eux, restent hérités. */
export const metadata: Metadata = {
  alternates: { canonical: "/" },
};

export default function Home() {
  return (
    <PageShell>
      <PageMotion />
      {/* 15/09 — l'appel à l'action du téléphone, hors du flux. Le détail
          est en tête de `BarreAction`. */}
      <BarreAction />

      <div className="offres">
        {/* ════════ 1 · HERO CLAIR — clone du template Flux ════════
            05/08/2026 (Teo, « exactement comme le screen de l'autre site,
            avec exactement le même fond, tout pareil, juste tu changes les
            textes — je veux le 1:1 »).

            Référence : flux-nextjs-template.vercel.app — la démo officielle
            de Cruip, et l'un des modèles présentés sur /modeles. Relevé au
            style calculé sur viewport 1280, valeurs converties de lab() en
            hexadécimal — voir le bloc `.o-flux-*` de globals.css, qui porte le
            détail de chaque mesure.

            Le hero nuit précédent (halo WebGL + filets de vitesse `.o-deco`)
            disparaît d'ici ; TRAITS n'est plus lu par cette page. Le header
            n'a rien demandé : il PRÉLÈVE la couleur du fond sous lui et bascule
            seul en verre clair.

            Deux écarts au 1:1 :
            · un seul bouton, comme la référence : le second CTA (« Ce qu'il
              fait chez vous ») n'a pas d'équivalent chez Flux ;
            · la bande de faits est conservée sous la maquette, réencrée en
              clair — Flux y met des logos de partenaires, qu'Omega n'a pas. */}
        <section className="o-flux o-hero-anim relative overflow-hidden pb-0 pt-[48px] md:pt-[64px] lg:pt-[256px]">
          {/* 11/09/2026 (Teo) — le fond n'est plus la photo de plis du
              template Flux (`/fonds/plis-blancs.webp`) mais un nuancier
              « Silk » peint en WebGL, recette fournie telle quelle (voir
              `components/accueil/FondSilk.tsx`). Le CADRE ne bouge pas :
              même `.o-flux-fond`, donc même masque radial à deux ellipses
              — c'est lui qui fait naître la lumière au centre, et il est
              relevé sur la référence, pas inventé. Seule la source change. */}
          <div aria-hidden className="o-flux-fond">
            <FondSilk className="o-flux-toile" />
            {/* le plancher de luminosité sous le texte — voir le bloc
                `.o-flux-voile` de globals.css, qui porte le relevé de
                contraste et dit pourquoi il ne se retire pas */}
            <div className="o-flux-voile" />
          </div>

          {/* trame, filets, points flottants et lueur au
              pointeur — la couche vit ENTRE le nuancier et le texte, d'où
              son z-index 1 face au z-10 de la colonne */}
          <DecorHero />

          {/* Les `data-reveal` du hero sont retirés : c'est la cadence
              ci-dessus qui fait l'entrée maintenant.

              Ils ne servaient déjà à rien sur grand écran — PageMotion ne
              prend QUE ce qui est sous la ligne de flottaison — mais sur
              un téléphone de 390 × 700 le bouton et sa sous-ligne tombent
              dessous, et GSAP serait venu les rejouer par-dessus
              l'animation CSS, chacun avec sa propre opacité. */}
          <div className="o-wrap relative z-10 flex flex-col items-center text-center">
            <div className="o-bloc-apparait" style={{ "--o-mot-d": `${CADENCE.pastille}ms` } as React.CSSProperties}>
              {/* 05/08 (Teo) — le point de veille qui bat, repris de la
                  référence, est retiré : « enlève le point orange ». */}
              <span className="o-flux-pastille">{HERO.pastille}</span>
            </div>
            {/* Chaque ligne du titre reprend la cascade là où la
                précédente l'a laissée : sans ça les deux phrases
                partiraient ensemble et on lirait deux vagues parallèles au
                lieu d'une seule qui traverse. */}
            <h1 className="o-flux-h1 mt-5 max-w-[900px] md:mt-6">
              <MotsReveles lignes={HERO.titre} depart={CADENCE.titre} pas={PAS_MOT} />
            </h1>
            <p
              className="o-bloc-apparait o-flux-lead my-2 max-w-[760px] md:my-4 lg:my-6"
              style={{ "--o-mot-d": `${CADENCE.chapo}ms` } as React.CSSProperties}
            >
              {/* Les deux versions sont dans le DOM : c'est du texte, il
                  pèse 300 signes, et un rendu conditionnel en JavaScript
                  ferait clignoter la phrase au premier rendu. */}
              <span className="lg:hidden">{HERO.chapoCourt}</span>
              <span className="hidden lg:inline">{HERO.chapo}</span>
            </p>
            <div className="mt-4 flex flex-col items-center md:mt-6 lg:mt-8">
              {/* 14/09 : « Découvrir notre approche » menait à /commencer
                  (l'aiguillage). Il mène à la section « le déroulé » de cette
                  page, qui est littéralement l'approche. */}
              <Link
                href="#approche"
                className="o-bloc-apparait o-flux-btn"
                style={{ "--o-mot-d": `${CADENCE.bouton}ms` } as React.CSSProperties}
              >
                {HERO.bouton}
                <span aria-hidden className="o-flux-btn-rond">
                  <Chevron taille={14} />
                </span>
              </Link>
              <span
                className="o-bloc-apparait o-flux-sous"
                style={{ "--o-mot-d": `${CADENCE.sous}ms` } as React.CSSProperties}
              >
                {/* même procédé que le chapô : les deux versions dans le
                    DOM, la largeur choisit. */}
                <span className="lg:hidden">{HERO.sousCourt}</span>
                <span className="hidden lg:inline">{HERO.sous}</span>
              </span>
            </div>
          </div>

          {/* la maquette, posée en bas de cadre et coupée par le bord comme
              chez la référence — d'où `pb-0` sur la section.

              15/09/2026 — c'est enfin NOTRE écran. Jusqu'ici la page ouvrait
              sur `dashboard-hero.webp`, la capture 1:1 du gabarit Flux : un
              tableau de bord d'hôtel en anglais, en dollars, avec des
              réservations Booking.com. Teo l'avait assumée le 05/08 (« le
              1:1 ») ; il a tranché l'inverse le 15/09 — la première image
              d'un site qui vend du sur-mesure français ne peut pas être le
              produit de quelqu'un d'autre.

              La photo est prise sur l'espace client réel (pegase-dashboard,
              écran /espace/debiteurs) alimenté par le jeu de démonstration
              écrit en dur dans ce dépôt-là : aucune donnée client, que de la
              fiction. La route de prise de vue est temporaire et n'est pas
              restée dans le dépôt ; pour la refaire, voir
              [[capture-reference-contenu-substitue]] et la même méthode que
              `public/produits/relances/*`.

              Nom de fichier neuf plutôt qu'écrasé : le CDN sert l'ancienne
              image pendant des heures quand on réécrit un chemin existant. */}
          <div data-reveal className="o-flux-maquette relative z-10">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/fonds/tableau-de-bord.webp"
              alt="L'espace client Omega : qui doit de l'argent, où en est la relance, et l'encours échu au total."
              width={2160}
              height={1350}
            />
          </div>

          {/* 05/08 (Teo, « enlève ça vu qu'il y a déjà le même juste en bas »)
              — la rangée de faits défilante qui fermait le hero est retirée :
              elle faisait doublon avec ce qui suit. Le hero se termine donc sur
              la maquette, dont le bas se fond — d'où `pb-0` sur la section. */}
        </section>

        {/* ════════ 2 · LES OUTILS ════════ */}
        <section data-monde="clair" className="pb-[50px] pt-[70px]">
          <div className="o-wrap">
            <p data-reveal className="o-small text-center">
              Branché sur les outils que vous tenez déjà
            </p>
          </div>
          <div data-reveal className="mt-8">
            <BandeauOutils />
          </div>
        </section>

        {/* ════════ 3 · LE CATALOGUE — quatre cartes douces en 2 × 2 ════════
            11/09/2026 (Teo) — le catalogue et les trois portes échangent
            leur place. Il arrive donc juste après le bandeau d'outils, là
            où se tenaient les trois façons de commencer (section 6
            désormais). Ce qui change de lecture : le visiteur voit ce qui
            s'installe avant qu'on lui demande par quelle porte entrer — le
            choix de l'entrée ne se pose qu'une fois qu'on sait ce qu'il y a
            à installer. */}
        {/* Pas de `pb` : sur cette page chaque section porte SON écart, et
            celle qui suit ouvre déjà sur `py-[110px]`. Le `pb-[110px]` que
            cette section portait à sa place précédente cumulerait ici 220 px
            de blanc sous les cartes — défaut relevé à la recette du 10/09,
            très visible à 390 où il faisait une page vide entre les deux
            sections. D'où le `pt-[40px]` seul, repris tel quel de la place
            qu'occupaient les trois portes. */}
        <section
          id="catalogue"
          data-monde="clair"
          className="scroll-mt-24 pt-[40px]"
        >
          <div className="o-wrap">
            <EnTete
              pastille="CE QUI S'INSTALLE"
              titre="Chaque système agit sur un levier de performance"
              chapo="Encaissement, réactivation, demandes entrantes, documents : chaque système tient un poste précis, sur vos règles, avec un contrôle humain avant tout envoi."
              court="Quatre postes, vos règles, un contrôle humain avant chaque envoi."
            />
            {/* 11/09/2026 — les quatre systèmes prennent la grille de
                cartes douces du bloc `integrations-three` (cnblocks, via
                21st.dev) : tuile du paquet et nom sur une ligne, l'objectif
                en intitulé, l'accroche dessous, le lien calé en bas de carte.

                Elle remplace la pile de cartes collantes posée le matin même
                (`CarteCollante` / `ContainerScroll` — le fichier
                components/accueil/PileCartes reste, il n'est simplement plus
                appelé ici). Les deux corrigeaient le même défaut : la grille
                de QUATRE colonnes ne laissait à chaque carte que 285 px, de
                quoi tenir un intitulé et deux lignes. Mais la pile prenait
                quatre écrans de haut pour quatre produits, or le catalogue
                est un carrefour, pas un argumentaire — chacun a désormais sa
                propre vitrine pour ça. En 2 × 2, les quatre se voient d'un
                seul regard, avec ~490 px chacune.

                SECONDE PASSE DU 11/09, LE SOIR (Teo) : « c'est le même
                design, juste les cartes sont faites avec ce composant ». Les
                quatre cartes passent aux TUILES de `bento-grid-01`
                (@avanishverma4, 21st.dev) — chacune porte désormais une
                animation en boucle au-dessus de son intitulé, ce qui manquait
                à la grille de cartes douces : elle était juste, mais immobile,
                et la section se lisait comme un sommaire.

                Ce qui n'a PAS bougé : la grille 2 × 2 (le chapô annonce quatre
                leviers — deux tuiles hautes contre deux petites, comme sur
                /offres, diraient que deux produits comptent plus), le filet
                doré, les textes de `ACCROCHES_VITRINE`, et les quatre portes.
                `components/ui/integrations-three.tsx` reste au dépôt, plus
                personne ne l'appelle.

                Les écarts au composant d'origine — dont le passage du blanc
                sur noir à l'encre sur papier — sont documentés en tête de
                components/accueil/TuilesCatalogue.tsx. */}
            <TuilesCatalogue
              className="mt-8 md:mt-16"
              tuiles={MOTEURS.map((m) => ({
                system: m.system,
                nom: nomPaquet(m.system),
                /* Le sigle seul ne dit rien à un visiteur qui arrive :
                   l'intitulé nomme l'objectif avant le détail. Repli sur
                   `title` / `benefit` si un système entrait dans VEDETTES
                   sans avoir d'accroche vitrine. */
                objectif: ACCROCHES_VITRINE[m.system]?.objectif ?? m.title,
                texte: ACCROCHES_VITRINE[m.system]?.texte ?? m.benefit,
                court: ACCROCHES_VITRINE[m.system]?.court,
                href: `/offres/${m.slug}`,
              }))}
            />
            {/* 07/08 (Teo) — deux libellés étaient proposés : « Découvrir les
                autres systèmes » et « Voir l'ensemble de nos solutions ». Le
                premier disait vrai tant que /offres montrait DEUX paquets de
                plus que l'accueil.

                15/09/2026 (Teo) — PULSE et VAULT ne s'affichent plus : /offres
                porte les mêmes quatre systèmes, plus le sur-mesure et la mise
                en place. « Les autres systèmes » promettrait donc un catalogue
                qui n'existe pas ; le bouton nomme la destination. */}
            <div data-reveal className="mt-10 flex justify-center">
              <Link href="/offres" className="o-btn o-btn--ghost">
                Voir toutes les offres
                <Chevron taille={13} />
              </Link>
            </div>
          </div>
        </section>

        {/* ════════ 3 bis · À L'ÉCHELLE D'UN GROUPE — quatre cartes ════════
            12/09/2026. Le détail du pourquoi est sur la constante `GROUPES`.

            LA PLACE — remontée ici le 15/09/2026. Elle a d'abord fermé le
            bloc de confiance (après les garanties, 13/09) ; elle ouvre
            désormais l'argumentaire, juste après le catalogue. Arbitrage de
            Teo : l'accueil parle d'ABORD aux organisations — celles où
            plusieurs services valident, qui achètent l'audit et le
            sur-mesure — et les prix publics comme les sites viennent
            ensuite. Un visiteur voit donc ce qui s'installe, puis
            immédiatement que ça tient à l'échelle d'un groupe : périmètre
            d'essai, interdits en base, données cloisonnées, système
            d'information qui ne bouge pas.

            L'ÉCART : `pt-[110px]` et pas de `pb`. Le catalogue qui précède
            ne porte aucun écart bas, et la section suivante ouvre déjà sur
            `py-[110px]` — un `pb` ici cumulerait 220 px de blanc, défaut
            déjà relevé à cette place à la recette du 10/09.

            LE COMPOSANT est celui des garanties (`CartesLueur`), pris à
            quatre cartes au lieu de deux : sa grille est en deux colonnes,
            elle se referme donc en 2 × 2 sans un réglage. Aucune maquette
            n'est passée — ces cartes-là portent des faits contractuels, pas
            des captures d'interface. À cette place, elles ne voisinent plus
            avec une autre rangée à lueur : les garanties sont loin en bas. */}
        {/* RYTHME MOBILE (15/09) — les onze sections de cette page portent
            leur écart en `110px`, une valeur relevée pour la colonne 1200.
            À 390 px elle fait onze fois 110 px de blanc, soit 1 200 px de
            page vide sur 19 300 : la page paraît deux fois plus longue
            qu'elle n'est, et chaque section arrive après un trou. D'où le
            `62px md:110px` posé sur les onze : l'écart de bureau est
            conservé au pixel au-dessus de `md`, là où il a été recetté. */}
        <section data-monde="clair" className="pt-[62px] md:pt-[110px]">
          <div className="o-wrap">
            <EnTete
              pastille="ORGANISATIONS"
              titre="Quand plusieurs services valident, rien ne s'improvise."
              chapo="Le cadre ne change pas avec la taille : un périmètre d'essai, des règles écrites, une sortie prévue dès le départ."
              court="Périmètre d'essai, règles écrites, sortie prévue dès le départ."
            />
            <div className="mt-8 md:mt-16">
              <CartesLueur cartes={GROUPES} />
            </div>
          </div>
        </section>

        {/* ════════ 4 · CE QUE ÇA CHANGE — le bento à cartes ════════
            11/09/2026 (Teo) : « la section sur le screen doit être
            remplacée par ce composant ». Les deux colonnes symétriques
            (maquette au-dessus, label, titre, texte — deux fois) laissent
            la place au bento pointillé repris de 21st.dev. L'origine, ce
            qui en a été retiré (dont cinq liens sortants publicitaires) et
            les écarts sont dans l'en-tête de `BentoChange`.

            Pas d'`EnTete` ici : ce composant porte son titre LUI-MÊME, et
            en bas à droite. C'est le seul endroit de la page où l'ordre
            s'inverse, et c'est précisément ce qu'on est venu chercher. */}
        <section data-monde="clair" className="py-[62px] md:py-[110px]">
          <BentoChange
            cartes={CARTES_CHANGE}
            pastille="CE QUE ÇA CHANGE"
            titre="Moins de tâches. Plus de temps. Plus de marge."
            chapo="Ce que les systèmes prennent en charge, et ce qui reste entre vos mains."
          />
        </section>

        {/* ════════ 4 ter · LES NEUF CAS — trois colonnes qui remontent ════════
            15/09/2026. Le gabarit de témoignages de 21st.dev
            (`CasColonnes`, déjà en bas de /offres/sur-mesure), rempli de
            SITUATIONS et non d'avis : Omega n'a aucun client à citer, et un
            faux avis sur un site commercial est une pratique trompeuse.
            Le détail de ce qui remplace quoi est en tête de `lib/cas-accueil`.

            Teo a d'abord demandé la version à neuf faux clients « juste pour
            voir » : elle existe, elle est restée sur le banc et s'éteint
            partout ailleurs (`omega-site-v3/lib/temoignages-essai.ts`).
            Ne pas la rapatrier ici.

            15/09, Teo : « il doit être écrit nulle part des choses comme ça
            qui nous décrédibilisent ». Le chapô disait « ce ne sont pas des
            témoignages : nous n'en publions pas tant que nous n'en avons pas
            de vrais » — c'est-à-dire, en clair, « nous n'avons aucun client »,
            écrit noir sur blanc sur l'accueil. La section reste (elle ne
            prétend rien), le chapô ne dit plus que ce qu'elle EST : neuf
            situations, leur poste et leur secteur. La règle « jamais de faux
            avis » ne change pas — elle se tient en n'en publiant pas, pas en
            l'annonçant. Vérifié le 15/09 : c'était la seule phrase de ce
            genre visible sur les 21 routes.

            LA PLACE : juste après « ce que ça change », là où un visiteur se
            demande si ça marche vraiment, et avant qu'on lui dise qui on
            est. La section précédente porte son `py-[110px]`, celle-ci n'a
            donc que son écart bas. */}
        <section data-monde="clair" className="pb-[62px] md:pb-[110px]">
          <div className="o-wrap">
            <EnTete
              pastille="LES SITUATIONS"
              titre="Ce que les systèmes tiennent, et chez qui ça arrive."
              chapo="Neuf situations telles qu'elles se présentent avant l'audit, avec le poste qui les prend en charge et le secteur où elles reviennent le plus souvent."
              court="Neuf situations telles qu'elles se présentent avant l'audit, et le poste qui les tient."
            />
            <div className="mt-8 md:mt-16">
              <CasColonnes cas={CAS_ACCUEIL} />
            </div>
          </div>
        </section>

        {/* ════════ 4 bis · L'ÉQUIPE — la mosaïque de portraits ════════
            12/09/2026 (Teo) : « il faut qu'on crée une partie pour décrire
            l'équipe derrière Omega, et mets un drapeau bien français à
            côté. »

            LA PLACE — déplacée le 13/09/2026 à la demande de Teo, qui l'a
            échangée avec « À l'échelle d'un groupe ». Cette dernière est
            depuis remontée en 3 bis (15/09, l'accueil parle d'abord aux
            organisations) ; l'équipe, elle, n'a pas bougé.
            Elle est donc ici, après le bento « ce que ça change » et avant
            la frise du déroulé. Ce qu'on gagne : elle est assez haut pour
            être vue de quelqu'un qui ne descend pas la page entière, et le
            produit vient d'être montré — on dit qui le pose juste après
            avoir dit ce qu'il fait. Ce qu'on perd, et qu'il faut savoir :
            elle ne ferme plus le bloc de confiance (données, financement,
            garanties), où elle répondait à la dernière objection, celle
            qu'on ne pose pas à voix haute — à qui je parle quand ça coince.

            LE DRAPEAU est dans le sourcil (components/ui/drapeau.tsx), aux
            teintes officielles #000091 / #E1000F. Agrandi le 14/09 (Teo :
            « un drapeau un peu plus gros, qu'on voit qu'on est bien
            français ») : 24 × 16 px au lieu de 15 × 10, dans un sourcil de
            28 px — il y est donc plus haut que les capitales du texte, à
            dessein. Il dit ce que la famille
            des sites produits s'autorise — conception française, assistance
            en français, droit français — et surtout PAS « hébergé en
            France » : les données vivent à Francfort.

            LE CONTENU est dans lib/equipe.ts, avec les deux points qui y
            restent à confirmer (le rôle de Teo, la quatrième fiche) et les
            trois portraits à déposer dans /public/equipe/. Sans eux la
            mosaïque rend les initiales : la page ne se troue pas. */}
        <section data-monde="clair" className="pb-[62px] md:pb-[110px]">
          <div className="o-wrap">
            <EnTete
              pastille={
                <>
                  <Drapeau className="h-[16px] w-[24px] shrink-0 rounded-[3px]" />
                  {EQUIPE_SURTITRE}
                </>
              }
              titre={EQUIPE_TITRE}
              chapo={EQUIPE_CHAPO}
            />
            <div data-reveal className="mt-8 md:mt-14 lg:mt-16">
              <TeamShowcase membres={MEMBRES} pied={EQUIPE_PIED} />
            </div>
          </div>
        </section>

        {/* ════════ 5 · COMMENT ÇA MARCHE — frise de quatre étapes ════════ */}
        <section id="approche" data-monde="clair" className="scroll-mt-24 pb-[62px] md:pb-[110px]">
          <div className="o-wrap">
            <EnTete
              pastille="LE DÉROULÉ"
              titre="De l'analyse au déploiement."
              chapo="Une méthode structurée pour intégrer des systèmes intelligents à vos opérations, sans perturber votre organisation existante."
              court="Quatre étapes, sans interrompre vos opérations."
            />
            {/* 11/09/2026 — les quatre étapes passent de la grille plate à une
                frise dont le rail se remplit au défilement (`FriseDeroule`,
                repris de 21st.dev — l'origine et les écarts sont dans
                l'en-tête du composant).

                Ce que la grille ratait : à 1440 ses quatre colonnes se
                lisaient d'un coup, donc comme quatre options simultanées,
                alors que le déroulé est une SUITE — on ne déploie pas avant
                d'avoir conçu. La frise remet l'ordre dans la lecture.

                Le filet qui coiffait chaque colonne (05/08, en remplacement
                des pastilles rondes jugées « trop amateur ») n'est pas
                perdu : c'est devenu le rail lui-même, qui court d'un bout à
                l'autre au lieu d'être coupé en quatre. Le numéro reste en
                petit et en gris, en `tabular-nums`, comme avant. */}
            <FriseDeroule etapes={ETAPES} />
          </div>
        </section>

        {/* ════════ 6 · CE QU'ON FAIT — les trois portes ════════
            10/09/2026. Posée d'abord juste après le bandeau d'outils, avant
            tout argumentaire : c'est la première question d'un visiteur qui
            arrive du pied de page d'une vitrine produit, et elle n'avait
            aucune réponse sur cette page.

            11/09/2026 (Teo) — échangée avec le catalogue, qui prend la 3e
            place. Elle ferme désormais l'argumentaire : ce qui s'installe,
            ce que ça change, comment ça se déroule, PUIS par où commencer.
            La question reste posée avant les réserves (hébergement,
            garanties), donc toujours dans le mouvement de la décision.

            Le rendu est dans `PortesHover` — cartes `.o-card-soft` du
            catalogue, plus une surbrillance qui GLISSE d'une porte à l'autre
            au survol (reprise de la bibliothèque, voir l'en-tête du
            composant). C'est ce glissement qui distingue cette rangée de
            celle du catalogue plus haut : trois cartes qui s'allument chacune
            dans leur coin se lisent comme trois produits, un pavé qui se
            déplace se lit comme trois portes d'une même maison.

            Aucun logo système : deux des trois portes n'en ont pas, et une
            rangée où seule la première serait ornée se lit comme un défaut
            d'alignement. */}
        {/* À cette place le rythme s'inverse : la frise qui précède porte
            déjà son `pb-[110px]`, et l'hébergement qui suit n'ouvre que sur
            un `pb`. C'est donc à cette section de porter l'écart du bas —
            `pb-[110px]`, comme le catalogue le faisait ici avant l'échange,
            et pas de `pt` sous peine de cumuler 220 px sous la frise. */}
        <section data-monde="clair" className="pb-[62px] md:pb-[110px]">
          <div className="o-wrap">
            <EnTete
              pastille="CE QU'ON FAIT"
              /* Le titre a d'abord été « Un système prêt, un système à écrire,
                 ou votre site. » : à 1440 il tombait sur trois lignes dont la
                 dernière ne portait que « site. ». Les autres titres de la
                 page tiennent en deux lignes ; celui-ci dit moins et laisse
                 les trois cartes énumérer. */
              titre="Trois façons de commencer."
              chapo="Le cœur du métier est le sur-mesure : ce qui n'existe pas encore, cadré et chiffré à l'audit. Les deux autres entrées s'installent en l'état. Même exigence derrière les trois : vos règles écrites noir sur blanc, vos données en Europe, un seul interlocuteur."
              court="Le sur-mesure, les systèmes prêts, ou votre site. Mêmes garanties derrière les trois."
            />
            {/* 11/09/2026 (Teo) — la rangée de portes ne paraît qu'à partir
                de `lg`. Sous ce seuil, elle et le tableau se rendaient tous
                les deux en cartes empilées : six cartes pour trois offres,
                mêmes noms, mêmes liens, 2 808 px de section à 390 px. Le
                tableau, lui, devient ces cartes-là — c'est donc la rangée
                qui s'efface, et sa phrase descend dans les cartes par
                `textes`. Le détail est en tête de `TableauEntrees`.

                Masqué ICI et pas dans `PortesHover` : le composant n'a pas à
                connaître la page qui l'emploie, et il ne sert qu'ici. */}
            <div className="hidden lg:block">
              <PortesHover portes={PORTES} />
            </div>

            {/* 11/09/2026 — le tableau « laquelle pour moi ? ». Les trois
                portes se posaient côte à côte et s'arrêtaient là ; un
                visiteur venu du pied de page d'une vitrine produit a une
                question de plus, et une seule. Le détail de la reprise et
                l'origine de chaque valeur sont dans l'en-tête du composant.
                Pas de nouvel `EnTete` : le titre de la section (« Trois
                façons de commencer. ») coiffe déjà le tableau, et un
                deuxième intertitre à trois lignes d'intervalle aurait coûté
                plus de hauteur qu'il n'en aurait éclairci. */}
            <TableauEntrees
                textes={Object.fromEntries(PORTES.map((p) => [p.nom, p.texte]))}
              />
          </div>
        </section>

        {/* ════════ 7 · L'HÉBERGEMENT — où vivent physiquement les données ═══
            05/08/2026 (Teo). Demandée d'abord « en bas », puis déplacée le
            même jour au-dessus du catalogue. 16/08/2026 (Teo) — repassée
            en dessous : « met la partie des systèmes avant la partie vos
            données ».

            Ce qui change de lecture. Le visiteur voit désormais ce qui
            s'installe avant d'entendre où vivent les données : l'objection
            du lieu ne se pose vraiment qu'une fois qu'il sait quelles
            données il y aurait à héberger. Elle reste avant les garanties,
            donc toujours dans le mouvement des réserves, pas reléguée en
            fin de page.

            Elle ne fait pas doublon avec la carte « Données » de la section 7,
            qui répond à la question de la PROPRIÉTÉ — à qui appartiennent ces
            données, ce qu'on en fait, ce qu'il en reste le jour où le client
            part. Celle-ci répond à la question du LIEU : sur quel territoire,
            sous quel droit, et à quelle distance d'une législation étrangère.
            Ce sont deux objections différentes, elles arrivent d'ailleurs à
            deux moments différents d'un rendez-vous.

            Chaque affirmation est vérifiable et rien n'est arrondi. Francfort
            n'est pas une formule : c'est la région eu-central-1 du projet
            `omega-core-eu`, déjà déclarée telle quelle dans les mentions
            légales. Le paragraphe de réserve en pied de section n'est pas une
            précaution juridique posée à contrecœur — c'est la seule manière
            d'écrire cette section qui survive à la question suivante, celle
            que pose tout client sérieux : « et l'IA, elle tourne où ? » */}
        <section data-monde="clair" className="pb-[62px] md:pb-[110px]">
          <div className="o-wrap">
            {/* 11/09/2026 — le chapô ne répète plus les cartes. Il disait
                « hébergées en Allemagne, au sein de l'Union européenne, dans
                un environnement conforme au RGPD » : trois des six faits qui
                suivent, annoncés avant d'être énoncés. */}
            <EnTete
              pastille="HÉBERGEMENT"
              titre="Vos données restent sous juridiction européenne."
              chapo="Six faits vérifiables sur l'hébergement de vos données et sur les traitements qui leur sont appliqués."
              court="Six faits vérifiables sur l'hébergement et les traitements."
            />

            <div className="mt-8 md:mt-14">
              <CartesPreuve cartes={PREUVES} />
            </div>

            {/* La réserve reste, et elle reste en petit — mais la SIXIÈME
                carte l'annonce désormais à la même hauteur de caractères que
                les cinq autres. Ce paragraphe n'est plus l'endroit où on
                apprend que l'IA sort d'Europe : c'est celui où on lit à
                quelles conditions. */}
            <p
              data-reveal
              className="o-small mx-auto mt-7 max-w-[720px] text-center !text-[15px] !leading-[24px]"
            >
              Ils reçoivent le strict nécessaire à chaque tâche — un montant,
              une date, un nom. Jamais votre fichier client ni votre
              historique, et rien de ce qui leur est envoyé ne sert à
              entraîner un modèle.
            </p>
          </div>
        </section>

        {/* ════════ 8 · CE QUI RESTE CHEZ VOUS — deux cartes larges ════════ */}
        <section data-monde="clair" className="pb-[62px] md:pb-[110px]">
          <div className="o-wrap">
            <EnTete
              pastille="LES GARANTIES"
              titre="Un investissement maîtrisé. Des données protégées."
              chapo="Ce que ça vous engage, et ce qu'il advient de vos données. Deux réponses, dès le départ."
              court="Ce que ça vous engage, et ce qu'il advient de vos données."
            />
            {/* 11/09/2026 — les deux cartes larges passent à `CartesLueur` :
                même maquette, même destination, mais le liseré s'encre sous
                le pointeur et la carte entière est cliquable. L'origine, le
                dégradé remis en graphite et les quatre écarts à la source
                sont en tête de `components/accueil/CartesLueur.tsx`. */}
            <div className="mt-8 md:mt-16">
              <CartesLueur cartes={GARANTIES} />
            </div>
          </div>
        </section>

        {/* ════════ 8 bis · LE TEMPS D'ARRÊT — la phrase qui se peint ═══
            11/09/2026. La page enchaînait douze sections bâties à
            l'identique — pastille, titre, chapô, contenu — sans un seul
            temps de respiration. Les gabarits de vitrine mettent à cet
            endroit une citation client en grand format ; la règle maison
            l'interdit (aucune preuve sociale inventée) et propose l'échange
            exact : même forme typographique, mais le PROBLÈME que le
            produit règle. C'est ce qui est posé ici.

            Le rendu est dans `TexteRevele` (repris de 21st.dev) : la phrase
            reste collée au centre de l'écran et se peint mot à mot pendant
            qu'on descend. Volontairement HORS de `.o-wrap` — le bloc est
            collant, il lui faut la hauteur de la fenêtre, pas la colonne de
            1 200. Et volontairement sans `data-reveal` : deux animations
            d'apparition sur le même bloc se contrarient. */}
        {CITATION ? (
          <section data-monde="clair" className="pb-[62px] md:pb-[110px]">
            <TexteRevele texte={CITATION.text} signature={CITATION.sub} />
          </section>
        ) : null}

        {/* ════════ 9 · L'ÉCHÉANCE — retour au noir ════════ */}
        <section className="o-nuit relative py-[62px] md:py-[110px]">
          <div aria-hidden className="o-deco">
            <div className="o-halo" />
          </div>
          <div className="o-wrap relative">
            <div className="grid grid-cols-1 items-center gap-12 lg:grid-cols-2 lg:gap-20">
              <div>
                <div data-reveal>
                  <span className="o-pill o-pill--xs">ÉCHÉANCE LÉGALE</span>
                </div>
                <h2 data-reveal className="o-h2 mt-4">
                  1ᵉʳ septembre 2026.
                </h2>
                <p data-reveal className="o-lead mt-5">
                  À cette date, toutes les entreprises établies en France doivent
                  être en mesure de recevoir des factures électroniques au format
                  structuré. Pas un PDF par mail : un fichier qui transite par une
                  plateforme agréée.
                </p>
                <div data-reveal className="mt-8 flex flex-wrap gap-3">
                  <Link href="/commencer" className="o-btn o-btn--primary">
                    Faire le point avant l&apos;échéance
                  </Link>
                  <Link
                    href="/blog/facturation-electronique-2026"
                    className="o-btn o-btn--ghost"
                  >
                    Ce que la loi impose
                    <Chevron taille={13} />
                  </Link>
                </div>
              </div>
              {/* 11/09/2026 (Teo) — le pavé de deux paragraphes laisse la
                  place aux trois cartes penchées reprises de 21st.dev.
                  L'origine, ce qui en a été retiré et le piège de largeur
                  fixe qu'il fallait désamorcer sont dans l'en-tête de
                  `CartesEcheance`.

                  Pas de `data-reveal` sur l'escalier lui-même : les cartes
                  portent déjà une transition de 700 ms, et deux animations
                  sur le même bloc se contrarient. Il reste sur la ligne
                  qui suit. */}
              <div>
                <CartesEcheance cartes={ECHEANCES} />
                <p data-reveal className="o-small mt-2 max-w-[440px]">
                  Nettoyer sa base à froid coûte quelques heures. Le faire en
                  urgence, facture rejetée par facture rejetée, coûte des
                  semaines.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* ════════ 10 · FAQ ════════ */}
        <section data-monde="clair" className="py-[62px] md:py-[110px]">
          <div className="o-wrap">
            <EnTete
              pastille="QUESTIONS"
              titre="Ce qu'on nous demande avant de signer."
              chapo="Les six questions qui reviennent à chaque premier rendez-vous, avec les réponses qu'on donne en vrai."
              court="Les six questions de chaque premier rendez-vous."
            />
            <div className="mx-auto mt-7 max-w-[800px] md:mt-12">
              {FAQ.map((f) => (
                <details key={f.q} className="o-faq-item">
                  <summary>
                    {f.q}
                    <span className="o-faq-croix" aria-hidden>
                      <svg
                        width="18"
                        height="18"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth={1.8}
                        strokeLinecap="round"
                      >
                        <path d="M12 5v14M5 12h14" />
                      </svg>
                    </span>
                  </summary>
                  <p className="o-body pb-6 pr-10">{f.a}</p>
                </details>
              ))}
            </div>
          </div>
        </section>
      </div>
    </PageShell>
  );
}
