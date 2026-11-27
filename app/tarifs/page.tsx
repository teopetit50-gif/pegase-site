import type { Metadata } from "next";
import PageShell from "@/components/PageShell";
import Cadre from "@/components/charte/Cadre";
import Grille from "@/components/tarifs/Grille";
import AppelFinal from "@/components/tarifs/AppelFinal";
import FaqTarifs from "@/components/tarifs/FaqTarifs";
import ReglesFacturation, { type Regle } from "@/components/tarifs/ReglesFacturation";
import Packs from "@/components/tarifs/Packs";
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
    "L'ERX Omega coûte 34,90\u00a0€ HT par utilisateur et par mois, sans minimum. Quatre packs d'automatisations, installés à partir de 1\u00a0750\u00a0€ HT, puis l'IA à la pièce.",
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
  /* 27/11/2026 — LES PACKS REMPLACENT LES AGENTS (pitch deck du 27/11 ;
     Teo : « tout remplacer »). Plus d'agent à 199 € par mois, plus de
     forfait ni de recharges. Le prix de la pièce n'est pas écrit : il se
     fixe à l'audit (Teo, 27/11). L'ERP s'écrit « ERX », comme dans le deck. */
  {
    q: "Combien coûte Omega\u00a0?",
    r: [
      "L'ERX se paie au mois, l'installation d'un pack une seule fois, et l'IA à la pièce. L'ERX coûte 34,90\u00a0€ HT par utilisateur et par mois, dès le premier. Un pack d'automatisations s'installe à partir de 1\u00a0750\u00a0€ HT pour 3 automatisations, 2\u00a0900\u00a0€ HT pour 6 et 4\u00a0000\u00a0€ HT pour les 10.",
      "Exemple\u00a0: une entreprise de 10 utilisateurs paie 349\u00a0€ HT par mois pour l'ERX. Si elle installe trois automatisations du pack Relances, elle paie à partir de 1\u00a0750\u00a0€ HT une seule fois, puis chaque relance envoyée, au prix écrit dans son devis.",
    ],
  },
  {
    q: "Que contient un pack\u00a0?",
    r: [
      "Dix automatisations autour d'une même tâche. Il y a quatre packs\u00a0: relances d'impayés, clients dormants, demandes entrantes et factures fournisseurs.",
      "Vous en choisissez 3, 6 ou les 10. Vous pouvez commencer par un seul pack, et même par trois automatisations, puis en ajouter. Un besoin hors de ces quatre packs se construit sur mesure, sur devis.",
    ],
  },
  {
    q: "Comment se paie l'IA à la pièce\u00a0?",
    r: [
      "Une pièce, c'est une tâche faite par l'IA\u00a0: une relance envoyée, un message de reprise envoyé, une demande traitée, une facture lue. Vous ne payez que ce qui a été traité.",
      "Le prix de la pièce se fixe pendant l'audit, sur vos volumes réels. Avant la signature, notre IA analyse vos fichiers et vos données. Cette analyse coûte 390\u00a0€ HT, remboursés si vous signez. Le prix de l'installation et celui de la pièce deviennent alors fermes.",
    ],
  },
  {
    q: "Comment l'ERX est-il facturé\u00a0?",
    r: [
      "34,90\u00a0€ HT par utilisateur et par mois, dès le premier et sans minimum. Les six modules sont inclus. Aucun pourcentage sur vos encaissements.",
      "Chaque utilisateur a son propre compte, pour savoir qui a validé chaque facture. 50 Go de documents sont inclus\u00a0; au-delà, 15\u00a0€ HT par mois par tranche de 25 Go.",
    ],
  },
  {
    q: "Quelles sont les modalités de paiement\u00a0?",
    r: [
      "Le moyen de paiement, carte ou prélèvement SEPA, est enregistré sur une page sécurisée quand vous réservez l'installation. Rien n'est débité avant la fin de l'installation : la première échéance part le jour de la mise en service.",
      "L'ERX est facturé au mois, et l'IA à la pièce, sur ce qui a été traité dans le mois. L'installation d'un pack se paie une seule fois. Prix hors taxes, TVA en sus au taux applicable.",
    ],
  },
  {
    q: "Que comprend l'installation d'un pack\u00a0?",
    r: [
      "Le paramétrage des automatisations choisies par nos agents constructeurs, vos règles de validation avant envoi, le raccordement de vos outils et la mise en service, en 2 à 4 semaines. La réunion d'installation se fait avec vous, en visioconférence.",
      "Un raccordement spécifique, comme un logiciel peu répandu ou une reprise d'historique, est chiffré au devis avant tout engagement. Jamais en cours de projet.",
    ],
  },
  {
    q: "Que se passe-t-il si l'offre ne convient pas ?",
    r: [
      "L'IA se paie à la pièce\u00a0: un mois où rien n'est traité ne coûte rien. L'export complet de vos données vous est remis, sans frais.",
      "Pour l'ERX, les conditions de sortie sont écrites dans votre devis, avant tout engagement.",
    ],
  },
  {
    q: "Le Chèque TIC s'applique-t-il ici ?",
    r: [
      "Le Chèque TIC, porté par la Région Guadeloupe, finance de 40 à 80 % d'un projet numérique, jusqu'à 10 000 €, pour les entreprises qui y sont immatriculées. Il porte sur l'installation, pas sur l'abonnement. Nous vérifions votre éligibilité à l'audit et, si un dossier se justifie, nous le montons avec vous.",
    ],
  },
  {
    q: "Plusieurs services valident chez nous : cette grille s'applique-t-elle ?",
    r: [
      "En partie. Les prix sont les mêmes\u00a0: 34,90\u00a0€ HT par utilisateur et par mois pour l'ERX, et des packs installés à partir de 1\u00a0750\u00a0€ HT. Ce qui change, c'est l'installation. Quand l'accueil, la comptabilité et les opérations valident chacun sur leur périmètre, il y a autant de jeux de règles à écrire que de services, et cette charge ne s'estime pas depuis une page.",
      "Vous commencez par un diagnostic plus long : nous relevons vos volumes service par service, et le devis en découle. Il est gratuit dans ses deux premiers formats.",
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
  /* 27/11/2026 — les quatre règles suivent le pitch deck du 27/11 :
     l'ERX par personne, le pack payé une fois par palier, l'IA à la
     pièce, le prix ferme avant de signer. */
  {
    titre: "L'ERX se paie par utilisateur",
    texte:
      "34,90\u00a0€ HT par utilisateur et par mois, dès le premier et sans minimum. Le même prix pour tout le monde.",
    points: [
      "Les six modules inclus",
      "Aucun pourcentage sur vos encaissements",
    ],
  },
  {
    titre: "Un pack s'installe une fois",
    texte:
      "À partir de 1\u00a0750\u00a0€ HT pour 3 automatisations, 2\u00a0900\u00a0€ HT pour 6, 4\u00a0000\u00a0€ HT pour les 10. Rien n'est débité avant la fin de l'installation.",
    points: [
      "Installé par nos agents constructeurs, en 2 à 4 semaines",
      "L'installation peut relever du Chèque TIC, porté par la Région Guadeloupe",
    ],
  },
  {
    titre: "L'IA se paie à la pièce",
    texte:
      "Une relance envoyée, une demande traitée, une facture lue\u00a0: vous ne payez que ce que l'IA a traité dans le mois.",
    points: [
      "Le prix de la pièce est fixé à l'audit, sur vos volumes",
      "Un mois sans activité ne coûte rien",
    ],
  },
  {
    titre: "Un prix ferme avant la signature",
    texte:
      "L'audit fixe le palier de vos packs et le prix de la pièce sur vos volumes. Notre IA analyse ensuite vos fichiers et vos données\u00a0: le devis devient ferme.",
    points: [
      "Cette analyse coûte 390\u00a0€ HT, remboursés si vous signez",
      "Le sur-mesure est chiffré au devis, avant tout engagement",
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
        {/* ═══ 1 — titre et prix publics ═══ */}
        <Grille />

        {/* ═══ 2 — les quatre packs d'automatisations (pitch deck du
               27/11 : installation par palier, puis l'IA à la pièce ;
               détail dans le composant). Les agents à 199 € par mois et
               la section « Automatisations » (49 €, recharges) partent. ═══ */}
        <Packs />

        {/* ═══ 3 — comment nous chiffrons : quatre règles, en grille de
               cartes jointives ═══ */}
        <ReglesFacturation
          id="chiffrage"
          titre="Comment nous facturons"
          chapo={"Quatre règles, et chaque prix écrit avant la signature."}
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
