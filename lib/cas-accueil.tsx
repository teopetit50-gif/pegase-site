import {
  ArrowLeftRight,
  Cable,
  FileSearch,
  MessagesSquare,
  Receipt,
  RefreshCw,
  Scale,
  ShieldCheck,
  Sunrise,
} from "lucide-react";
import type { CasUsage } from "@/components/ui/cas-colonnes";

/* ══════════════════════════════════════════════════════════════════════
   LES NEUF CAS DE L'ACCUEIL (15/09/2026)

   Ils remplissent le bloc à trois colonnes de `CasColonnes`, le gabarit de
   témoignages de 21st.dev, à la place des neuf faux clients de l'original.

   POURQUOI PAS DES TÉMOIGNAGES. Omega n'a aucun avis réel à publier. Teo a
   d'abord demandé d'en inventer pour voir le rendu, puis d'en retirer les
   noms de sociétés ; une citation signée d'une personne qui n'existe pas
   reste un faux avis, et un faux avis sur un site commercial est une
   pratique commerciale trompeuse — pas une licence artistique. La maquette
   à neuf faux clients est restée sur le banc, éteinte hors de lui
   (`omega-site-v3/lib/temoignages-essai.ts`).

   CE QUI REMPLACE QUOI, carte par carte — la règle du parc, déjà appliquée
   en bas de /offres/sur-mesure :
   · la citation → la SITUATION, telle qu'elle se présente avant l'audit,
     sans guillemets : rien n'est mis dans la bouche de personne ;
   · l'avatar → une icône, même diamètre ;
   · le nom → le POSTE que le système tient ;
   · la fonction → la FAMILLE DE SECTEUR, c'est-à-dire chez qui la
     situation est typique — jamais chez qui c'est installé.

   LE NEUVIÈME EST LE CAS ÉCARTÉ : celui où l'audit conclut qu'il n'y a
   rien à installer. Un mur de témoignages n'a jamais de mauvais avis ;
   une liste de situations honnête en a un, et c'est ce qui la rend
   crédible.

   AUCUN FAIT NOUVEAU. Les neuf situations sortent de ce que les pages
   produit décrivent déjà (relances à J+7 et J+21, file de validation,
   point du matin, lecture et écriture dans les outils en place, cadrage
   avant devis). Rien n'est chiffré ici : pas de « 30 % de retards en
   moins » — aucun de ces chiffres n'existe.
   ══════════════════════════════════════════════════════════════════════ */

export const CAS_ACCUEIL: CasUsage[] = [
  {
    icone: <Receipt strokeWidth={1.5} />,
    texte:
      "Des factures échues relancées quand quelqu'un y pense — donc deux clients dans la même situation traités à deux rythmes différents.",
    nature: "Relance des devis et factures",
    secteur: "Négoce & distribution",
  },
  {
    icone: <MessagesSquare strokeWidth={1.5} />,
    texte:
      "Des demandes qui arrivent le samedi et attendent le lundi soir qu'on ait le temps de les lire, pendant que le client en appelle un autre.",
    nature: "Réponse aux demandes clients",
    secteur: "Services aux entreprises",
  },
  {
    icone: <RefreshCw strokeWidth={1.5} />,
    texte:
      "Un fichier de clients qui n'ont plus rien commandé depuis deux ans, que personne n'a le temps de reprendre un par un.",
    nature: "Clients inactifs",
    secteur: "Transport & logistique",
  },
  {
    icone: <FileSearch strokeWidth={1.5} />,
    texte:
      "Des factures fournisseurs reçues en PDF, ressaisies à la main avant d'être transmises au cabinet comptable.",
    nature: "Factures fournisseurs",
    secteur: "Bâtiment & travaux",
  },
  {
    icone: <Sunrise strokeWidth={1.5} />,
    texte:
      "Ouvrir la journée sans savoir ce qui est parti la veille, ce qui attend une décision, ni ce qui a été refusé avant d'être envoyé.",
    nature: "Le point du matin",
    secteur: "Toutes tailles",
  },
  {
    icone: <ShieldCheck strokeWidth={1.5} />,
    texte:
      "Un message parti au mauvais client, une seule fois, et des mois à refaire la confiance. Rien ne part sans passer la file de validation.",
    nature: "Validation avant envoi",
    secteur: "Plusieurs services qui valident",
  },
  {
    icone: <Cable strokeWidth={1.5} />,
    texte:
      "Un outil de plus à ouvrir chaque matin, quand les équipes travaillent déjà dans la messagerie, le tableur et l'agenda.",
    nature: "Intégration sans migration",
    secteur: "PME déjà équipées",
  },
  {
    icone: <ArrowLeftRight strokeWidth={1.5} />,
    texte:
      "Deux logiciels qui ne se parlent pas, et la même information ressaisie deux fois par jour par deux personnes différentes.",
    nature: "Pont entre deux outils",
    secteur: "Industrie & production",
  },
  {
    /* ⚠ LE CAS ÉCARTÉ — ne pas le retirer pour « faire plus positif ».
       C'est lui qui distingue ce bloc d'un mur de témoignages, et c'est la
       même phrase qu'on dit au cadrage. */
    icone: <Scale strokeWidth={1.5} />,
    texte:
      "Sur de petits volumes, l'audit conclut parfois qu'aucun poste ne se rentabilise. On le dit avant de commencer, pas après.",
    nature: "Ce qu'on n'installe pas",
    secteur: "Le cas écarté",
  },
];
