import type { Metadata } from "next";
import PageShell from "@/components/PageShell";
import Cadre from "@/components/charte/Cadre";
import Grille from "@/components/tarifs/Grille";
import AppelFinal from "@/components/tarifs/AppelFinal";
import FaqTarifs from "@/components/tarifs/FaqTarifs";
import ReglesFacturation, { type Regle } from "@/components/tarifs/ReglesFacturation";
import Automatisations from "@/components/tarifs/Automatisations";
import { MondeProvider } from "@/components/tarifs/monde";
import "@/components/charte/pages/tarifs.css";

/* ══════════════════════════════════════════════════════════════════════
   /tarifs — v4 « La grille publique » (28/08/2026)

   REMPLACE ENTIÈREMENT la v3 « Comment nous chiffrons » (clone
   scale.com/careers, aucun montant affiché). Décision Teo des 27-28/08,
   modèle commercial arrêté : pour ceux qui tiennent leurs outils —
   indépendants, TPE, PME — les prix sont PUBLICS, l'achat est direct, et
   la conversion est la réservation de la réunion d'installation
   (/installation). L'ancienne règle « aucun montant » ne survit que pour
   les structures où plusieurs services valident : leur porte est l'audit
   (/reserver-un-audit), sans prix affiché — le devis sort des volumes.

   La séparation ne se fait PAS par la taille (« grande entreprise ») mais
   par QUI VALIDE — le vrai déterminant du coût d'installation. Les deux
   portes sont posées en haut de page, avant la grille.

   Le design quitte le monde .tf (scale.com) pour le monde .resa de
   /reserver-un-audit — le clone de la page pricing de Qonto, construit
   précisément pour vendre des paliers. Une page de prix dans le langage
   d'une page de prix. La v3 (lib/tarifs.ts, bloc .tf) part avec ce
   commit ; ses photos restent dans public/photos pour un autre usage.

   PAIEMENT : rien en ligne aujourd'hui (pas encore de compte pro). La
   couture est prévue dans components/tarifs/Grille.tsx — une étape
   s'insérera entre le choix des postes et la réunion, sans refonte.
   → 05/09 (demande des associés : « enlève la mention paiement à
   l'installation, ça va porter à confusion ») : le client enregistre son
   moyen de paiement — carte ou prélèvement SEPA — à la réservation, sur
   /installation ; rien n'est débité avant la fin de l'installation, le
   premier prélèvement part le jour de la mise en service. La FAQ
   « Comment se passe le paiement ? », la règle « Aucun engagement
   caché », le chapô du CTA final et la mention légale de la grille
   disent désormais cela — plus « tout se règle à l'installation ».

   05/09 — LE DESIGN DE /reserver-un-audit, COLLÉ (Teo : « quand on clique
   sur Indépendants & TPE, le design doit être le même que celui
   d'Organisations & équipes ; les infos de tarifs restent »). La page
   suit désormais l'ordre exact de la page audit, section pour section :
     1-3. titre, quatre colonnes (colonne de gauche + trois cartes à tête
          grise / dorée), bandeau d'orientation, comparatif — tout dans
          components/tarifs/Grille.tsx, comme reservation/Formules.tsx ;
     3bis. « Ce que nous ne facturons jamais » dans les cartes blanches
          du « Comment se passe l'audit » (note, H2, étiquette, titre) ;
     4.   (supprimée le 15/09 — voir la note en bas de ce bloc) ;
     7.   CTA final centré, avec la voie WhatsApp et la mention discrète
          de l'autre porte — la page audit finit pareil ;
     8.   la FAQ, en dernier.
   → 14/09 (Teo : « ces sections sont mal faites, récupère des composants
   sur 21st.dev ») : les sections 4, 7 et 8 sont des reprises 21st.dev,
   chacune dans components/tarifs/ avec ses écarts en tête — ChequeTic
   (stats-2, puis stats-section-with-text le 15/09), AppelFinal
   (call-to-action), FaqTarifs (faqs-02).

   → 15/09, fin de journée : LA SECTION 4 EST SUPPRIMÉE (Teo, après deux
   passes sur sa composition et une sur sa couleur : « supprime cette
   section finalement »). La page perd sa seule bande sombre et enchaîne
   désormais le chiffrage sur l'appel final. Le Chèque TIC n'est PAS
   retiré du site pour autant — il reste dit à trois endroits : la FAQ de
   cette page (« Le Chèque TIC s'applique-t-il ici ? », qui porte les
   mêmes faits : 40 à 80 %, 10 000 €, assiette sur l'installation), la
   ligne d'engagement « l'installation peut relever du Chèque TIC », et
   l'article de blog cheque-tic-financement. C'est ce qui permet de le
   supprimer sans perdre l'information ni l'incise « Région Guadeloupe ».
   Le composant et sa feuille sont supprimés avec elle ; ils se relisent
   dans l'historique si la section doit revenir.
   Le simulateur et les engagements (5, 6) n'ont pas d'équivalent tarifs
   et ne sont pas meublés. Les textes de la page sont inchangés ; les
   seuls ajouts sont ceux que les emplacements du design imposaient
   (bandeau d'orientation, CTA final, cellules du comparatif) et ils
   redisent des faits déjà posés ici.
   ══════════════════════════════════════════════════════════════════════ */

export const metadata: Metadata = {
  alternates: { canonical: "/tarifs" },
  title: "Tarifs | Omega.AI",
  description:
    "Le logiciel de gestion Omega coûte 34,90\u00a0€ HT par personne et par mois, sans minimum. Chaque agent IA coûte à partir de 69\u00a0€ HT par mois, et son prix est fixé à l'audit.",
};

/* 03/09 (relecture de la formule annuelle) — la page disait encore
   « mensuel, rien n'est payé d'avance » à cinq endroits alors que l'annuel
   est justement facturé d'avance pour douze mois : un client qui lit
   « rien n'est payé d'avance » puis reçoit une facture de 900 € a un motif
   de contestation. Chaque phrase distingue désormais les deux formules.
   Textes à valider par Teo. */

/* Ce qu'on ne facture jamais — resserré depuis la v3 (six cartes), qui le
   tenait de /commercial/facturer-omega.md. Quatre survivent : les deux
   retirées (« pas de surcoût si le mois s'emballe », « devis en une
   page ») redisaient le sans-engagement et la réunion d'installation. */
/* ——— la FAQ tarifs — les questions qu'une page de prix doit prendre de
   front, mêmes règles éditoriales que la FAQ de la page audit. ——— */
const FAQ_TARIFS: { q: string; r: string[] }[] = [
  /* 15/09/2026 — les deux premières questions sont nouvelles, et elles
     sont premières. La page n'affiche plus un barème : elle estime. Sans
     ces réponses, l'absence de montant se lit comme une rétention
     d'information — le reproche le plus cher qu'une page de prix puisse
     encaisser.
     15/09, passe de registre (Teo : « trop amateur, plus pro, genre
     Qonto, des termes précis ») : questions et réponses reformulées en
     vocabulaire de facturation — unité facturable, volumétrie, échéance,
     résiliation, réversibilité. Aucun fait nouveau, aucune promesse de
     plus : seul le registre change. */
  /* 25/11/2026 — LES PRIX DEVIENNENT PUBLICS (« Nos prix », v7, et sa note
     du 24/11). Les questions « Pourquoi aucun tarif fixe » et « Quand
     connaîtrai-je le montant » partent : le logiciel a désormais un prix
     écrit, seuls les agents et l'installation sortent de l'audit. Le
     paiement à l'année n'est plus proposé tant que les associés ne l'ont
     pas tranché. */
  {
    q: "Combien coûte Omega\u00a0?",
    r: [
      "Le logiciel et les agents se paient chacun au mois, et l'installation une seule fois. Le logiciel de gestion coûte 34,90\u00a0€ HT par personne et par mois, dès la première personne. Chaque agent IA coûte à partir de 69\u00a0€ HT par mois, selon le travail qu'il fait pour vous. L'installation coûte dès 1\u00a0200\u00a0€ HT pour le logiciel et dès 290\u00a0€ HT par agent.",
      "Exemple\u00a0: une entreprise de 10 personnes paie 349\u00a0€ HT par mois pour le logiciel de gestion. S'y ajoute le prix de ses agents, écrit au devis.",
    ],
  },
  {
    q: "Quand connaîtrai-je le prix de mes agents\u00a0?",
    r: [
      "Il est fixé pendant l'audit. Le prix d'un agent dépend du volume qu'il traite\u00a0: factures lues, demandes reçues, relances envoyées. Deux entreprises de même taille n'ont pas le même volume, et ce prix se fixe donc sur vos chiffres.",
      "Avant que vous signiez, l'IA analyse vos fichiers et l'état de vos données. Cette analyse coûte 390\u00a0€ HT, remboursés si vous signez. Le prix de vos agents et de votre installation devient alors ferme.",
    ],
  },
  {
    q: "Comment le logiciel de gestion est-il chiffré\u00a0?",
    r: [
      "Il coûte 34,90\u00a0€ HT par personne et par mois, dès la première personne et sans minimum. Les six modules de gestion sont compris, et nous ne prenons jamais de pourcentage sur vos encaissements.",
      "Chaque personne a son propre compte. En comptabilité, il faut savoir qui a validé chaque facture\u00a0: un compte partagé ferait perdre cette trace. 50\u00a0Go de documents sont compris\u00a0; au-delà, chaque tranche de 25\u00a0Go coûte 15\u00a0€ HT par mois.",
    ],
  },
  {
    q: "Que se passe-t-il si un agent dépasse son forfait\u00a0?",
    r: [
      "Vous êtes prévenu quand il atteint 75\u00a0%, puis 90\u00a0% de son forfait. Au-delà du forfait, chaque pièce est facturée à part\u00a0: 0,12\u00a0€ HT le mail, 0,90\u00a0€ HT la facture, 1,20\u00a0€ HT la relance, 6\u00a0€ HT le document.",
      "L'agent ne change de palier qu'après trois mois de suite au-dessus de son forfait. Vous pouvez ajouter un agent à tout moment, et la remise est de 10\u00a0% dès 3 agents, de 15\u00a0% dès 5. Nos prix sont revus une fois par an, jamais en cours d'année.",
    ],
  },
  {
    q: "Quelles sont les modalités de paiement\u00a0?",
    r: [
      "Le moyen de paiement, carte ou prélèvement SEPA, est enregistré sur une page sécurisée, au moment de réserver la réunion d'installation. Aucun débit n'intervient avant la fin de celle-ci\u00a0: la première échéance part le jour de la mise en service.",
      "Les agents sont facturés au mois, sans engagement\u00a0: la résiliation prend effet à la fin du mois en cours. Nos prix sont hors taxes, et la TVA s'y ajoute au taux qui s'applique à votre entreprise.",
    ],
  },
  {
    q: "Que comprend l'abonnement des agents\u00a0?",
    r: [
      "L'exploitation des postes retenus, le rapport quotidien, les règles de validation avant envoi, la prise en compte de vos corrections et le suivi. La réunion d'installation est comprise dans le forfait d'installation : nous raccordons vos outils ensemble, en visioconférence, écran partagé.",
      "Un raccordement spécifique, tel qu'un logiciel métier peu répandu ou une reprise d'historique, est chiffré au devis avant tout engagement, jamais découvert en cours de projet.",
    ],
  },
  {
    q: "Que se passe-t-il si l'offre ne convient pas ?",
    r: [
      "Pour les agents, le remboursement est intégral pendant trente jours à compter de la mise en service, sans justification à fournir. Au-delà, leur formule mensuelle reste résiliable à tout moment, et l'export complet de vos données vous est remis, sans condition et sans frais.",
      "Pour le logiciel de gestion, les conditions de sortie sont écrites dans votre devis, avant tout engagement.",
    ],
  },
  {
    q: "Le Chèque TIC s'applique-t-il ici ?",
    r: [
      "Le dispositif de la Région Guadeloupe finance de 40 à 80 % d'un projet de transformation numérique, dans la limite de 10 000 €, pour une entreprise éligible. Son assiette est l'installation, jamais l'abonnement. Votre éligibilité est vérifiée à l'audit, et si un dossier se justifie, nous le montons avec vous.",
    ],
  },
  {
    q: "Plusieurs services valident chez nous : cette grille s'applique-t-elle ?",
    r: [
      "En partie seulement. Les prix sont les mêmes\u00a0: 34,90\u00a0€ HT par personne et par mois pour le logiciel, à partir de 69\u00a0€ HT par mois pour chaque agent. Ce qui change, c'est l'installation. Quand l'accueil, la comptabilité et les opérations valident chacun sur leur périmètre, il y a autant de jeux de règles à écrire que de services, et cette charge ne s'estime pas depuis une page.",
      "Votre point d'entrée est le diagnostic, dans un format plus long : nous relevons votre volumétrie service par service, et le devis en découle. Il est gratuit dans ses deux premiers formats.",
    ],
  },
];

/* ——— « Comment nous chiffrons » (15/09) ———
   Quatre étapes, dans l'ordre : l'unité, le volume, la part qui revient à
   un opérateur, le devis. Aucune affirmation nouvelle — chaque point
   redit un fait déjà posé ailleurs sur la page (le bloc de tête, la FAQ,
   le comparatif, la note sous le calculateur). C'est la règle maison, et
   elle compte double ici : une page qui explique son chiffrage sans
   donner de chiffre ne tient que si rien n'y est inventé.

   CE QU'ON NE DIT PAS : les repères internes du taux de reprise (9 % au
   mieux, 14 % en moyenne — PEGASE/benchmark-prix-marche.md). Ce sont nos
   chiffres de coût, pas ceux du client, et les publier inviterait à
   négocier sur une moyenne de marché plutôt que sur SA mesure. */
const CHIFFRAGE: Regle[] = [
  /* 25/11/2026 — les quatre règles suivent désormais les prix publics :
     le logiciel par personne, les agents au travail fait, le prix ferme
     avant de signer, l'installation payée une fois. */
  {
    titre: "Le logiciel se paie par personne",
    texte:
      "Il coûte 34,90\u00a0€ HT par personne et par mois, dès la première personne et sans minimum. Le prix est le même pour tous.",
    points: [
      "Les six modules de gestion compris",
      "Jamais un pourcentage sur les sommes que vous encaissez",
    ],
  },
  {
    titre: "Chaque agent est payé au travail qu'il fait",
    texte:
      "Il coûte à partir de 69\u00a0€ HT par mois, selon le volume qu'il traite\u00a0: factures lues, demandes reçues, relances envoyées.",
    points: [
      "Deux entreprises de même taille n'ont pas le même volume",
      "−10\u00a0% dès 3 agents, −15\u00a0% dès 5",
    ],
  },
  {
    titre: "Le prix est ferme avant de signer",
    texte:
      "L'audit fixe le prix de vos agents selon votre volume. L'IA analyse ensuite vos fichiers et l'état de vos données\u00a0: le prix de vos agents et de votre installation devient alors ferme.",
    points: [
      "Cette analyse coûte 390\u00a0€ HT, remboursés si vous signez",
      "Vous êtes prévenu quand un agent atteint 75\u00a0%, puis 90\u00a0% de son forfait",
    ],
  },
  {
    titre: "L'installation se paie une fois",
    texte:
      "Pour le logiciel, elle coûte 1\u00a0200, 2\u00a0400 ou 4\u00a0900\u00a0€ HT selon la taille de votre entreprise\u00a0; pour chaque agent, 290, 590 ou 1\u00a0190\u00a0€ HT. Pour les agents, rien n'est débité avant la fin de leur installation.",
    points: [
      "Elle peut relever du Chèque TIC, porté par la Région Guadeloupe, pour les entreprises qui y sont immatriculées",
      "Les agents restent mensuels, sans engagement",
    ],
  },
];

export default function TarifsPage() {
  return (
    <PageShell>
      {/* 25/11/2026 — la charte de l'accueil (docs/charte-accueil.md, § 4.2,
          ligne 5) : la page passe dans <Cadre> (fond #f5f5f2, Google Sans,
          marges hachurées), les sections sont jointives et séparées par des
          filets, la FAQ et l'appel final passent aux composants du kit.
          Plus de PageMotion : aucune apparition au défilement. Le dessin
          propre à la page : components/charte/pages/tarifs.css, sous
          `.charte .tf-page`. */}
      <Cadre>
      {/* 15/09, seconde passe — LE SÉLECTEUR DES DEUX MONDES COMMANDE
          TOUTE LA PAGE, plus seulement la grille. Il est né le 15/09 dans
          components/tarifs/Grille avec son état ; le Chèque TIC et l'appel
          final, sur le même écran, disaient encore « Réserver un audit »
          sous une grille passée au « diagnostic ». Le provider ne rend rien
          et ne rend pas cette page cliente : les sections lui sont passées
          en `children`, et le monde s'y lit par useSyncExternalStore
          (instantané serveur « pme »), donc /tarifs reste STATIQUE. */}
      <MondeProvider>
      <div className="resa tf-page">
        {/* ═══ 1 et 2 — titre et prix publics, puis les agents ═══ */}
        <Grille />

        {/* ═══ 2 bis — les automatisations : installation une fois, puis
               l'IA à la pièce en recharges (Teo, 25/11, document « Prix des
               automatisations » ; détail dans le composant) ═══ */}
        <Automatisations />

        {/* ═══ 3 — comment nous chiffrons : quatre règles, en grille de
               cartes jointives ═══ */}
        <ReglesFacturation
          id="chiffrage"
          titre="Comment nous chiffrons"
          chapo={"Quatre règles, du logiciel à l'installation : ce que vous payez, et ce qui fixe chaque prix."}
          regles={CHIFFRAGE}
        />

        {/* ═══ 4 — l'appel final, avec l'agenda des créneaux d'audit ═══ */}
        <div id="reserver">
          <AppelFinal />
        </div>

        {/* ═══ 5 — la FAQ tarifs, en dernier (elle porte l'ancre #faq) ═══ */}
        {/* la FAQ ne bascule PAS : sa dernière question s'adresse
            explicitement aux structures à validation répartie et les nomme
            depuis le côté PME — c'est une passerelle vers l'autre monde,
            pas un texte à traduire. Les règles de facturation non plus :
            leurs quatre règles valent aux deux, et aucune ne nomme l'audit. */}
        <FaqTarifs items={FAQ_TARIFS} />
      </div>
      </MondeProvider>
      </Cadre>
    </PageShell>
  );
}
