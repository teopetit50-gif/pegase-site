import type { Metadata } from "next";
import PageShell from "@/components/PageShell";
import Cadre from "@/components/charte/Cadre";
import PageLegale, { type SectionLegale } from "@/components/legal/PageLegale";
import { COURRIEL } from "@/lib/reservation";
import { titreSite } from "@/components/espace2/portail";

/* ══════════════════════════════════════════════════════════════════════
   /conditions-generales — conditions générales de vente et d'utilisation

   27/11/2026 — PREMIÈRE VERSION. Teo : « fais tout ça, choisis le mieux et
   mets sur le site ». Le site n'avait que des mentions légales ; un ERP
   qui traite les données de ses clients doit publier ses conditions, et
   le contrat de sous-traitance qui les accompagne
   (/sous-traitance-donnees).

   D'OÙ VIENNENT LES FAITS. Tout ce qui décrit l'offre est recopié de la
   page /tarifs du 27/11 (ERX à 34,90 € HT par utilisateur et par mois,
   packs installés une fois, IA à la pièce, analyse préalable à 390 € HT
   remboursée si le client signe, 50 Go inclus puis 15 € HT par tranche de
   25 Go, carte ou SEPA, rien n'est débité avant la fin de l'installation)
   et de /vos-donnees (Francfort, validation avant envoi, journal, export
   sans frais, aucun entraînement). Si un prix change sur /tarifs, il
   change ici le même jour.

   CE QUI A ÉTÉ CHOISI (aucune page ne le disait ; Teo a délégué le choix) :
     · ERX au mois, sans durée minimale sauf devis, résiliable à tout
       moment avec effet à la fin du mois en cours. Cohérent avec /tarifs,
       qui renvoie les « conditions de sortie » au devis.
     · Support : réponse au plus tard le jour ouvré suivant.
     · Disponibilité : un OBJECTIF de 99,5 % par mois, pas une garantie
       assortie de pénalités.
     · Responsabilité plafonnée aux sommes HT payées sur les douze derniers
       mois, dommages indirects exclus, sauf faute lourde ou dolosive.
     · L'analyse préalable est remboursée si le devis est signé dans les
       trois mois suivant sa remise.
     · Omega peut citer le client comme référence, sauf refus écrit.
     · Omega peut arrêter l'abonnement ou un module avec trois mois de
       préavis ; une installation abandonnée se paie au prorata.
     · Prélèvement SEPA annoncé au moins deux jours avant l'échéance.
     · Aucun envoi automatique : rien ne part sans validation (comme
       /vos-donnees). Si un jour le produit en propose, réécrire « service »
       et « responsabilite » ici, et « securite » dans l'accord.
     Relecture du 27/11 (agent relecteur) appliquée. Restent à trancher par
     un avocat : le plafond de responsabilité (douze mois, peut-être trop bas
     face à une perte de données) et l'intitulé du tribunal.
     ⚠ /tarifs ne dit pas encore « en dehors de l'analyse préalable » ni le
     délai de trois mois pour le remboursement de l'analyse.

   ⚠ L'ÉDITEUR. Le contrat est conclu avec ORVAL CONSULTING, la société qui
   édite le site (mêmes identifiants que /mentions-legales). Le jour où
   Omega est immatriculée, remplacer la fiche du prestataire ici, dans
   /sous-traitance-donnees et dans /mentions-legales.

   ⚠ À FAIRE RELIRE PAR UN AVOCAT. Le texte est écrit pour être juste et
   prudent, pas validé par un professionnel du droit.
   ══════════════════════════════════════════════════════════════════════ */

export const metadata: Metadata = {
  alternates: { canonical: "/conditions-generales" },
  title: titreSite("Conditions générales"),
  description:
    "Conditions générales de vente et d'utilisation d'Omega.AI : abonnement à l'ERX, installation des packs, IA à la pièce, paiement, résiliation, réversibilité, responsabilité.",
};

const SECTIONS: SectionLegale[] = [
  {
    id: "objet",
    h: "Objet et champ d'application",
    p: [
      "Les présentes conditions générales encadrent la vente et l'utilisation des offres Omega.AI\u00a0: l'abonnement à l'ERX, l'installation des packs d'automatisations, le traitement des tâches par l'IA et les développements sur mesure.",
      "Elles s'adressent exclusivement aux professionnels, c'est-à-dire aux entreprises et aux personnes qui agissent pour les besoins de leur activité. Elles s'appliquent à toute commande et prévalent sur les conditions générales d'achat du Client, sauf accord écrit contraire.",
    ],
  },
  {
    id: "prestataire",
    h: "Le prestataire",
    p: "Les offres Omega.AI sont fournies par la société ORVAL CONSULTING, désignée ci-après «\u00a0Omega\u00a0».",
    fiche: [
      ["Dénomination", "ORVAL CONSULTING"],
      ["Forme juridique", "SASU au capital de 500,00\u00a0€"],
      ["Siège social", "49 rue de Ponthieu, 75008 Paris, France"],
      ["RCS", "Paris 981 724 602"],
      ["TVA intracommunautaire", "FR66981724602"],
      ["E-mail", COURRIEL],
    ],
  },
  {
    id: "definitions",
    h: "Définitions",
    p: [
      "«\u00a0Client\u00a0»\u00a0: le professionnel qui souscrit une offre. «\u00a0Utilisateur\u00a0»\u00a0: toute personne que le Client autorise à se connecter au Service, avec un compte nominatif.",
      "«\u00a0Service\u00a0»\u00a0: l'ensemble des offres souscrites, c'est-à-dire l'ERX (le logiciel de gestion accessible en ligne et ses modules), les automatisations installées et le traitement des tâches par l'IA.",
      "«\u00a0Pack\u00a0»\u00a0: un ensemble d'automatisations installées pour le Client. «\u00a0Pièce\u00a0»\u00a0: une tâche faite par l'IA, par exemple une relance envoyée, une demande traitée ou une facture lue.",
      "«\u00a0Devis\u00a0»\u00a0: la proposition écrite acceptée par le Client, qui fixe le périmètre, les prix et les éventuelles conditions particulières. «\u00a0Données du Client\u00a0»\u00a0: les informations et documents que le Client ou ses Utilisateurs versent dans le Service, ou que le Service reçoit pour leur compte.",
    ],
  },
  {
    id: "formation-du-contrat",
    h: "Formation du contrat et documents applicables",
    p: [
      "Le contrat est formé par l'acceptation du Devis par le Client, par signature ou par validation en ligne. L'acceptation emporte celle des présentes conditions générales et de l'accord de sous-traitance des données, publié sur la page «\u00a0Sous-traitance des données\u00a0» et qui leur est annexé.",
      "En cas de contradiction, les documents s'appliquent dans l'ordre suivant\u00a0: le Devis et ses conditions particulières, puis l'accord de sous-traitance des données pour tout ce qui concerne les données personnelles, puis les présentes conditions générales.",
    ],
  },
  {
    id: "analyse-prealable",
    h: "Analyse préalable",
    p: "Avant la signature, Omega peut analyser les fichiers et les données que le Client lui confie afin de fixer le prix de l'installation et celui de la pièce. Cette analyse est facturée 390 € HT. Elle est remboursée, par déduction sur la première facture, si le Client signe le Devis qui en découle dans les trois mois suivant la remise de ce Devis. La commande de l'analyse préalable emporte acceptation des présentes conditions générales et de l'accord de sous-traitance des données. Les fichiers confiés pour l'analyse sont traités dans les conditions de cet accord, puis effacés au terme de ces trois mois si aucun contrat n'est signé.",
  },
  {
    id: "service",
    h: "Description du Service",
    p: [
      "L'ERX est un logiciel de gestion accessible en ligne. Il comprend les six modules présentés sur le site. Chaque Utilisateur dispose de son propre compte, afin que chaque validation soit attribuée à une personne identifiée. Le Client dispose de 50\u00a0Go de stockage de documents, partagés entre tous ses Utilisateurs.",
      "Les packs d'automatisations sont installés par Omega selon le périmètre du Devis\u00a0: paramétrage des automatisations choisies, règles de validation avant envoi, raccordement des outils du Client et mise en service.",
      "Les automatisations et l'IA préparent des relances, des réponses, des écritures et des contrôles. Rien n'est envoyé à un tiers sans la validation d'un Utilisateur habilité. Chaque action est inscrite au journal du Service, avec son auteur et sa date.",
    ],
  },
  {
    id: "installation",
    h: "Installation et mise en service",
    p: [
      "L'installation d'un pack dure en général de deux à quatre semaines à compter de la réunion d'installation. Ce délai suppose que le Client fournisse dans les temps les accès, les données et les validations demandés. Un retard du Client décale d'autant la mise en service.",
      "Omega notifie la mise en service par e-mail. Le Client dispose alors de huit jours ouvrés pour signaler par écrit toute anomalie qui empêche l'utilisation prévue au Devis\u00a0; Omega la corrige dans un délai raisonnable. Sans signalement dans ce délai, la mise en service est réputée acceptée.",
      "Un raccordement spécifique, comme la connexion à un logiciel peu répandu ou la reprise d'un historique, est chiffré au Devis avant tout engagement, jamais en cours de projet.",
    ],
  },
  {
    id: "prix",
    h: "Prix",
    p: [
      "L'ERX coûte 34,90 € HT par Utilisateur et par mois, dès le premier Utilisateur et sans minimum. Au-delà des 50\u00a0Go inclus, le stockage est facturé 15 € HT par mois et par tranche de 25\u00a0Go.",
      "Le prix de l'installation de chaque pack et le prix de la pièce sont fixés au Devis. Les prix «\u00a0à partir de\u00a0» affichés sur le site sont indicatifs\u00a0; seul le Devis engage.",
      "Les prix s'entendent hors taxes\u00a0; la TVA est due en sus au taux applicable. Les prix fixés au Devis restent fermes pendant la durée qu'il prévoit. Pour le reste, Omega peut faire évoluer ses prix en prévenant le Client par e-mail au moins trente jours à l'avance. Le Client qui refuse la hausse peut résilier avant son entrée en vigueur, sans frais.",
    ],
  },
  {
    id: "facturation-et-paiement",
    h: "Facturation et paiement",
    p: [
      "Le moyen de paiement, carte ou prélèvement SEPA, est enregistré sur une page sécurisée lors de la réservation de l'installation. En dehors de l'analyse préalable, rien n'est débité avant la fin de l'installation. Le Client accepte que chaque prélèvement SEPA lui soit annoncé au moins deux jours avant son échéance, par la facture ou par e-mail.",
      "L'installation d'un pack est facturée une seule fois, à la mise en service. L'ERX est facturé chaque mois, d'avance, à partir de la mise en service, selon le nombre d'Utilisateurs actifs. Les pièces sont facturées chaque mois, à terme échu, selon ce que l'IA a traité dans le mois. Les factures sont payables à réception, par prélèvement sur le moyen de paiement enregistré.",
      "Tout retard de paiement entraîne de plein droit des pénalités égales à trois fois le taux d'intérêt légal et une indemnité forfaitaire de 40 € pour frais de recouvrement (article L. 441-10 du Code de commerce). Si une facture reste impayée quinze jours après une mise en demeure par e-mail, Omega peut suspendre l'accès au Service jusqu'au paiement, sans que les Données du Client soient effacées pendant la suspension.",
    ],
  },
  {
    id: "duree-et-resiliation",
    h: "Durée et résiliation",
    p: [
      "Sauf durée d'engagement prévue au Devis, l'abonnement à l'ERX est conclu au mois et se renouvelle chaque mois. Le Client peut le résilier à tout moment par e-mail\u00a0; la résiliation prend effet à la fin du mois en cours, et le mois commencé reste dû. L'installation d'un pack achevée reste due, et les pièces traitées jusqu'à la date d'effet sont facturées. Si le Client renonce en cours d'installation, le travail déjà réalisé est facturé au prorata de son avancement, dans la limite du prix prévu au Devis.",
      "Omega peut mettre fin à l'abonnement ou cesser de fournir un module en prévenant le Client par e-mail au moins trois mois à l'avance. Le Client conserve alors son droit à l'export de ses données.",
      "Chaque partie peut résilier le contrat en cas de manquement grave de l'autre, trente jours après une mise en demeure restée sans effet, sans préjudice des dommages et intérêts auxquels elle pourrait prétendre.",
    ],
  },
  {
    id: "reversibilite",
    h: "Réversibilité et fin du contrat",
    p: [
      "Le Client peut exporter ses données à tout moment depuis le Service. À la fin du contrat, Omega lui remet sans frais, sur simple demande, un export complet de ses données dans un format standard et lisible, ainsi que la description de ses automatisations dans des fichiers lisibles.",
      "Le Client dispose de trente jours après la fin du contrat pour demander cet export, qu'Omega lui remet avant tout effacement. Passé ce délai, les Données du Client sont effacées dans les conditions de l'accord de sous-traitance des données.",
    ],
  },
  {
    id: "obligations-du-client",
    h: "Obligations du Client",
    p: [
      "Le Client garde ses identifiants confidentiels, désigne les Utilisateurs habilités à valider les envois et retire sans délai l'accès d'un Utilisateur qui quitte l'entreprise. Il répond de l'usage du Service fait avec ses comptes.",
      "Le Client garantit qu'il a le droit de traiter les données qu'il verse dans le Service, qu'il a informé les personnes concernées et que l'usage qu'il fait du Service, notamment les messages qu'il valide, respecte la loi. Il s'interdit d'y verser des données sensibles au sens de l'article 9 du RGPD, comme des données de santé, sauf accord écrit préalable qui en fixe les garanties.",
      "Le Client s'interdit d'utiliser le Service pour envoyer des messages non sollicités en violation de la loi, de chercher à en contourner les mesures de sécurité, d'en revendre l'accès ou de le décompiler, sauf dans les cas autorisés par l'article L. 122-6-1 du Code de la propriété intellectuelle.",
    ],
  },
  {
    id: "agents-et-ia",
    h: "Agents et intelligence artificielle",
    p: [
      "Ce que l'IA prépare (relances, réponses, écritures, contrôles, résumés) reste une proposition tant qu'un Utilisateur ne l'a pas validé. Ces propositions peuvent contenir des erreurs ou des omissions, et le Client les relit avant de les valider. Une proposition validée par un Utilisateur engage le Client comme s'il l'avait rédigée lui-même.",
      "Les contrôles automatiques, par exemple sur un RIB modifié ou une facture en double, réduisent un risque sans le supprimer. Ils ne dispensent pas le Client de ses propres contrôles, ni de l'avis de son expert-comptable sur ses obligations comptables et fiscales.",
      "Les Données du Client ne servent pas à entraîner un modèle d'intelligence artificielle, ni chez Omega ni chez ses fournisseurs.",
    ],
  },
  {
    id: "disponibilite-et-support",
    h: "Disponibilité et support",
    p: [
      "Omega met en œuvre les moyens raisonnables pour que le Service soit accessible en continu. Son objectif est une disponibilité de 99,5\u00a0% par mois, hors maintenance programmée\u00a0; c'est un objectif, pas une garantie assortie de pénalités. Les maintenances programmées sont annoncées au moins quarante-huit heures à l'avance quand c'est possible, et placées de préférence en dehors des heures ouvrées.",
      `Le support est joignable par e-mail (${COURRIEL}) et par WhatsApp, les jours ouvrés. Omega répond à toute demande au plus tard le jour ouvré suivant\u00a0; un incident qui bloque l'utilisation du Service est traité en priorité.`,
    ],
  },
  {
    id: "propriete-intellectuelle",
    h: "Propriété intellectuelle",
    p: [
      "Omega concède au Client, pour la durée du contrat, un droit d'utilisation du Service personnel, non exclusif et non cessible, pour les besoins de son activité. Le logiciel, les automatisations, les modèles de traitement, les instructions données à l'IA, la documentation et les marques restent la propriété d'Omega ou de ses concédants.",
      "Il en va de même pour les développements sur mesure, sauf cession expresse prévue au Devis\u00a0: le Client en a l'usage dans les mêmes conditions que le reste du Service. À la fin du contrat, il peut utiliser pour ses besoins internes les fichiers d'export de ses automatisations qui lui ont été remis.",
      "Le Client reste propriétaire des Données du Client et des documents produits avec le Service. Omega peut utiliser librement les suggestions d'amélioration que le Client lui adresse.",
    ],
  },
  {
    id: "donnees-personnelles",
    h: "Données personnelles",
    p: [
      "Pour les données personnelles contenues dans les Données du Client, le Client est responsable de traitement et Omega agit en qualité de sous-traitant, dans les conditions de l'accord de sous-traitance des données annexé aux présentes.",
      `Pour les données nécessaires à la gestion de la relation commerciale (comptes des Utilisateurs, facturation, échanges avec le support), Omega est responsable de traitement. Ces données servent uniquement à l'exécution du contrat et au respect de ses obligations légales. Elles sont conservées pendant le contrat, puis archivées le temps imposé par la loi, soit dix ans pour les pièces comptables. Les personnes concernées exercent leurs droits en écrivant à ${COURRIEL} et peuvent introduire une réclamation auprès de la CNIL.`,
    ],
  },
  {
    id: "confidentialite",
    h: "Confidentialité",
    p: "Chaque partie garde confidentielles les informations de l'autre dont elle a connaissance à l'occasion du contrat, notamment les Données du Client, les prix du Devis et le fonctionnement du Service, et ne les utilise que pour exécuter le contrat. Cette obligation dure pendant le contrat et trois ans après sa fin. Elle ne couvre pas les informations publiques ni celles qu'une autorité ou la loi oblige à communiquer.",
  },
  {
    id: "responsabilite",
    h: "Responsabilité",
    p: [
      "Omega est tenue d'une obligation de moyens. Elle n'est pas responsable des conséquences d'une proposition validée par un Utilisateur, d'une erreur dans les données fournies par le Client, ni d'une panne d'un outil tiers que le Client a raccordé au Service.",
      "Aucune partie n'est responsable envers l'autre des dommages indirects, comme une perte de chiffre d'affaires, de clientèle ou d'image. La responsabilité totale d'Omega au titre du contrat, toutes causes confondues, est limitée au montant hors taxes payé par le Client au cours des douze mois précédant le fait générateur.",
      "Ces limites ne s'appliquent ni en cas de faute lourde ou dolosive, ni aux dommages corporels, ni dans les cas où la loi les interdit.",
    ],
  },
  {
    id: "force-majeure",
    h: "Force majeure",
    p: "Aucune partie n'est responsable d'un manquement causé par un cas de force majeure au sens de l'article 1218 du Code civil. Si l'empêchement dure plus de trente jours, chaque partie peut résilier le contrat par e-mail, sans indemnité.",
  },
  {
    id: "reference-commerciale",
    h: "Référence commerciale",
    p: "Omega peut citer le nom et le logo du Client comme référence commerciale, sur son site et dans ses présentations, sans jamais en divulguer les données. Le Client peut s'y opposer à tout moment, par simple e-mail.",
  },
  {
    id: "modification",
    h: "Modification des conditions",
    p: "Omega peut modifier les présentes conditions générales. La nouvelle version est publiée sur cette page et notifiée au Client par e-mail au moins trente jours avant son entrée en vigueur. Le Client qui la refuse peut résilier le contrat avant cette date, sans frais.",
  },
  {
    id: "droit-applicable",
    h: "Droit applicable et litiges",
    p: "Le contrat est soumis au droit français. Les parties cherchent d'abord une solution amiable pendant trente jours à compter de la réclamation écrite de l'une d'elles. À défaut, lorsque le Client est commerçant, tout litige relatif au contrat relève de la compétence exclusive du tribunal des activités économiques de Paris (anciennement tribunal de commerce)\u00a0; dans les autres cas, du tribunal compétent selon le droit commun.",
  },
];

export default function ConditionsGeneralesPage() {
  return (
    <PageShell>
      <Cadre>
        <PageLegale
          titre="Conditions générales"
          maj="Version du 27 novembre 2026."
          sections={SECTIONS}
        />
      </Cadre>
    </PageShell>
  );
}
