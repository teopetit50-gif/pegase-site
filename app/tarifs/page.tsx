import type { Metadata } from "next";
import PageShell from "@/components/PageShell";
import PageMotion from "@/components/PageMotion";
import Grille from "@/components/tarifs/Grille";
import ChequeTic from "@/components/tarifs/ChequeTic";
import AppelFinal from "@/components/tarifs/AppelFinal";
import FaqTarifs from "@/components/tarifs/FaqTarifs";
import ReglesFacturation, { type Regle } from "@/components/tarifs/ReglesFacturation";
import { REMISE_ANNUELLE } from "@/lib/paliers";

/* 03/09 — le taux de la remise annuelle écrit en toutes lettres dans les
   textes de la page : dérivé de la constante, jamais recopié à la main. */
const REMISE_PCT = Math.round(REMISE_ANNUELLE * 100);

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
     4.   Chèque TIC sur bande sombre (H2 au lieu de H3) ;
     7.   CTA final centré, avec la voie WhatsApp et la mention discrète
          de l'autre porte — la page audit finit pareil ;
     8.   la FAQ, en dernier.
   → 14/09 (Teo : « ces sections sont mal faites, récupère des composants
   sur 21st.dev ») : les sections 4, 7 et 8 sont des reprises 21st.dev,
   chacune dans components/tarifs/ avec ses écarts en tête — ChequeTic
   (stats-2), AppelFinal (call-to-action), FaqTarifs (faqs-02). Les textes
   n'ont pas bougé ; seuls les trois chiffres du Chèque TIC sont sortis du
   paragraphe pour devenir des tuiles.
   Le simulateur et les engagements (5, 6) n'ont pas d'équivalent tarifs
   et ne sont pas meublés. Les textes de la page sont inchangés ; les
   seuls ajouts sont ceux que les emplacements du design imposaient
   (bandeau d'orientation, CTA final, cellules du comparatif) et ils
   redisent des faits déjà posés ici.
   ══════════════════════════════════════════════════════════════════════ */

export const metadata: Metadata = {
  title: "Tarifs | Omega.AI",
  description:
    `Tarification à l'usage pour un, trois ou quatre postes automatisés sous validation humaine. Le montant est indexé sur le volume traité : cette page l'estime, l'audit l'arrête sur vos chiffres. Facturation mensuelle sans engagement, −${REMISE_PCT} % en annuel, installation facturée séparément et éligible au Chèque TIC, remboursement sous 30 jours.`,
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
  {
    q: "Pourquoi aucun tarif fixe n'est-il affiché ?",
    r: [
      "Parce que l'abonnement est indexé sur un volume, et qu'aucun volume n'est identique d'une entreprise à l'autre. Deux sociétés du même secteur et du même effectif n'émettent pas le même nombre de factures et ne reçoivent pas le même nombre de demandes. Un tarif unique reviendrait à faire financer par les unes la volumétrie des autres.",
      "Ce que nous publions à la place, c'est la règle de calcul complète : le montant suit le nombre de pièces traitées, jamais le nombre d'utilisateurs ni un pourcentage sur vos encaissements. Renseignez votre volumétrie en haut de page et l'estimation s'affiche ; l'audit la valide sur vos chiffres réels, et le tarif figure au devis avant tout engagement.",
    ],
  },
  {
    q: "L'estimation affichée correspond-elle au tarif final ?",
    r: [
      "C'est un ordre de grandeur, calculé sur les volumes que vous venez de saisir. Sa précision est celle de vos déclarations, et rares sont les dirigeants qui connaissent de mémoire le nombre de factures relancées le mois précédent.",
      "L'audit travaille sur vos exports, pas sur une estimation : il relève la volumétrie réelle, le taux de pièces qui reviennent à un opérateur, et ce qui n'est pas comptabilisé aujourd'hui. Le montant qui en sort est celui du devis, et il ne varie plus.",
    ],
  },
  {
    q: "Le palier est-il modifiable en cours de contrat ?",
    r: [
      "Oui, à tout moment et sans frais de changement : le montant suit les postes en service et le volume qu'ils traitent. L'ajout d'un poste se décide sur les chiffres du premier, et c'est la trajectoire que nous recommandons.",
    ],
  },
  {
    q: "Quelles sont les modalités de paiement ?",
    r: [
      "Aucun paiement n'est possible depuis cette page, et les montants affichés restent des estimations : le tarif est arrêté à l'audit, sur vos chiffres réels. Le moyen de paiement, carte ou prélèvement SEPA, est enregistré ensuite sur une page sécurisée, au moment de réserver la réunion d'installation. Aucun débit n'intervient avant la fin de celle-ci : la première échéance part le jour de la mise en service.",
      `En formule mensuelle, sans engagement : la résiliation prend effet à la fin du mois en cours, date à laquelle les envois cessent. En formule annuelle, les douze mois sont facturés en une fois le jour de la mise en service, à −${REMISE_PCT} %.`,
    ],
  },
  {
    q: "Que comprend l'abonnement ?",
    r: [
      "L'exploitation des postes retenus, le rapport quotidien, les règles de validation avant envoi, la prise en compte de vos corrections et le suivi. La réunion d'installation est comprise dans le forfait d'installation : nous raccordons vos outils ensemble, en visioconférence, écran partagé.",
      "Un raccordement spécifique, tel qu'un logiciel métier peu répandu ou une reprise d'historique, est chiffré au devis avant tout engagement, jamais découvert en cours de projet.",
    ],
  },
  {
    q: "Que se passe-t-il si l'offre ne convient pas ?",
    r: [
      "Le remboursement est intégral pendant trente jours à compter de la mise en service, sans justification à fournir, en formule mensuelle comme annuelle. Au-delà, la formule mensuelle reste résiliable à tout moment et l'annuelle court jusqu'à son terme. Dans les deux cas, l'export complet de vos données vous est remis, sans condition et sans frais.",
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
      "En partie seulement. Les quatre postes et la règle de calcul sont identiques ; ce qui change, c'est l'installation. Quand l'accueil, la comptabilité et les opérations valident chacun sur leur périmètre, il y a autant de jeux de règles à écrire que de services, et cette charge ne s'estime pas depuis une page.",
      "Votre point d'entrée est le diagnostic, dans un format plus long : nous relevons votre volumétrie service par service, et le devis en découle. Il est gratuit dans ses deux premiers formats.",
    ],
  },
];

const JAMAIS: Regle[] = [
  {
    titre: "Aucune facturation par utilisateur",
    texte: "Le montant est indexé sur le volume traité, jamais sur le nombre de comptes ouverts.",
    points: [
      "Un utilisateur supplémentaire n'entraîne aucun surcoût",
      "Seuls les postes en service et leur volume entrent dans le calcul",
    ],
  },
  {
    titre: "Aucune commission au résultat",
    texte: "Aucun pourcentage n'est prélevé sur les sommes encaissées.",
    points: [
      "Le montant ne varie pas selon les sommes recouvrées",
      "L'échéance du mois est connue à l'avance",
    ],
  },
  {
    titre: "Aucun engagement caché",
    texte: "Aucun débit n'intervient avant la fin de l'installation.",
    points: [
      "Formule mensuelle\u00a0: résiliable à tout moment, le mois en cours allant à son terme",
      "Formule annuelle\u00a0: douze mois facturés en une fois, le jour de la mise en service",
    ],
  },
  {
    titre: "Réversibilité garantie",
    texte: "L'export complet vous est remis à la résiliation, sans condition et sans frais.",
    points: [
      "Vos données restent votre propriété, dans un format réutilisable",
      "Les envois cessent à la date de résiliation",
    ],
  },
];

export default function TarifsPage() {
  return (
    <PageShell>
      <PageMotion />

      <div className="resa">
        {/* ═══ 1 à 3 — titre, paliers, orientation, comparatif ═══ */}
        <Grille />

        {/* ═══ 3bis — ce qu'on ne facture jamais — 14/09, seconde passe :
               la composition « how-it-works » (en-tête centré, rail de
               pastilles numérotées, cartes à tuile d'icône et points)
               ═══ */}
        <section id="jamais" data-monde="clair">
          <ReglesFacturation
            titre="Ce que nous ne facturons jamais"
            chapo="Quatre règles de facturation, applicables à tous les paliers et aux deux formules."
            regles={JAMAIS}
          />
        </section>

        {/* ═══ 4 — Chèque TIC, sur bande sombre — trois tuiles à grands
               chiffres (14/09, reprise stats-2) ═══ */}
        <section id="cheque-tic" className="r-nuit">
          <ChequeTic />
        </section>

        {/* ═══ 7 — CTA final — la carte sombre encadrée (14/09, reprise
               call-to-action de @mokshithgujjeti) ═══ */}
        <section id="reserver" data-monde="clair">
          <AppelFinal />
        </section>

        {/* ═══ 8 — la FAQ tarifs, en dernier — deux colonnes, accordéon
               Radix (14/09, reprise faqs-02 de @ln-dev7) ═══ */}
        <section id="faq" data-monde="clair">
          <FaqTarifs items={FAQ_TARIFS} />
        </section>
      </div>
    </PageShell>
  );
}
