import type { Metadata } from "next";
import PageShell from "@/components/PageShell";
import Cadre from "@/components/charte/Cadre";
import PageLegale, { type SectionLegale } from "@/components/legal/PageLegale";
import { COURRIEL } from "@/lib/reservation";
import { titreSite } from "@/components/espace2/portail";

/* ══════════════════════════════════════════════════════════════════════
   /sous-traitance-donnees — l'accord de sous-traitance (article 28 du RGPD)

   27/11/2026 — PREMIÈRE VERSION, annexée aux conditions générales
   (/conditions-generales). Les services achats des groupes la demandent
   avant de signer ; /vos-donnees annonçait déjà « ce que le contrat
   garantit » sans qu'aucun contrat ne soit publié.

   La trame suit la liste obligatoire de l'article 28.3 du RGPD. Les
   garanties décrites (Francfort, cloisonnement, chiffrement, jetons
   nominatifs, journal, validation avant envoi, aucun entraînement,
   rétention de 30 jours au plus chez le fournisseur de modèles) sont
   celles que /vos-donnees publie déjà : rien de neuf n'est promis.

   ⚠ LES NOMS DES SOUS-TRAITANTS NE SONT PAS PUBLIÉS, comme sur
   /vos-donnees (« on ne nomme jamais nos outils ») : la page décrit des
   catégories, et la liste nominative, avec pays et garanties, est annexée
   au contrat signé et communiquée sur demande. Cette annexe doit exister
   avant la première signature.

   ⚠ CE QUI EST CHOISI ET DOIT ÊTRE TENU :
     · notification d'une violation de données sous 48 heures ;
     · effacement 30 jours après la fin du contrat, sauvegardes comprises
       (c'était le délai « écrit au contrat » que /vos-donnees annonçait
       sans contrat) — vérifier que la rotation des sauvegardes de la base
       le permet ;
     · préavis de 30 jours avant tout nouveau sous-traitant ultérieur.
     · Les transferts hors UE sont décrits sans affirmer de région : la
       région de l'instance qui fait tourner les moteurs n'a jamais été
       relevée (note de /vos-donnees).

   ⚠ À FAIRE RELIRE PAR UN AVOCAT.
   ══════════════════════════════════════════════════════════════════════ */

export const metadata: Metadata = {
  alternates: { canonical: "/sous-traitance-donnees" },
  title: titreSite("Sous-traitance des données"),
  description:
    "Accord de sous-traitance des données d'Omega.AI (article 28 du RGPD) : description du traitement, sécurité, sous-traitants, violations de données, effacement et audits.",
};

const SECTIONS: SectionLegale[] = [
  {
    id: "objet",
    h: "Objet",
    p: [
      "Le présent accord fixe les conditions dans lesquelles ORVAL CONSULTING, qui fournit les offres Omega.AI et qui est désignée ci-après «\u00a0Omega\u00a0», traite des données personnelles pour le compte du Client, conformément à l'article 28 du Règlement général sur la protection des données (RGPD).",
      "Il est annexé aux conditions générales et accepté en même temps qu'elles. Les termes définis dans les conditions générales ont ici le même sens. Pour tout ce qui concerne les données personnelles, le présent accord prévaut sur les conditions générales.",
    ],
  },
  {
    id: "roles",
    h: "Rôle des parties",
    p: "Pour les données personnelles contenues dans les Données du Client, le Client est responsable de traitement\u00a0: il détermine les finalités et les moyens de leur traitement. Omega est sous-traitant\u00a0: elle les traite uniquement pour fournir le Service. Pour les données de gestion de la relation commerciale (comptes des Utilisateurs, facturation, support), Omega est responsable de traitement, et le présent accord ne s'applique pas.",
  },
  {
    id: "description-du-traitement",
    h: "Description du traitement",
    p: [
      "Nature des opérations\u00a0: hébergement et stockage des données\u00a0; lecture et analyse de documents et de messages par l'IA\u00a0; préparation de relances, de réponses, d'écritures et de contrôles\u00a0; envoi des messages validés par le Client\u00a0; journalisation des actions\u00a0; sauvegarde\u00a0; export et effacement.",
      "Finalité\u00a0: fournir au Client le Service souscrit, c'est-à-dire la gestion de ses ventes, de ses achats, de son stock, de sa banque, de sa comptabilité et de ses échanges avec ses clients et ses fournisseurs, ainsi que l'analyse préalable de ses fichiers.",
      "Personnes concernées\u00a0: les clients, prospects, fournisseurs, salariés et Utilisateurs du Client, ainsi que leurs contacts.",
      "Catégories de données\u00a0: identité et coordonnées (nom, fonction, e-mail, téléphone, adresse)\u00a0; données commerciales et comptables (devis, commandes, factures, montants, échéances, historique des échanges)\u00a0; coordonnées bancaires des tiers, comme un RIB de fournisseur\u00a0; contenu des e-mails, des messages WhatsApp et des pièces jointes reçus sur les outils raccordés\u00a0; données de connexion et journal des actions des Utilisateurs.",
      "Le Service n'est pas destiné aux données sensibles au sens de l'article 9 du RGPD, comme les données de santé. Elles ne peuvent y être versées qu'après un accord écrit qui en fixe les garanties.",
      "Durée\u00a0: le temps du contrat, puis le délai d'effacement prévu à l'article «\u00a0Fin du traitement\u00a0».",
    ],
  },
  {
    id: "instructions",
    h: "Instructions du Client",
    p: "Omega ne traite les données que sur instruction documentée du Client. Ces instructions sont constituées par le contrat, le paramétrage du Service et les validations des Utilisateurs. Omega n'utilise les données pour aucune autre finalité, ne les vend pas et ne les utilise pas pour entraîner un modèle. Si une instruction lui paraît contraire au RGPD ou à une autre règle de protection des données, Omega en informe immédiatement le Client. Si le droit de l'Union ou d'un État membre l'oblige à un traitement, elle en informe le Client au préalable, sauf si ce droit l'interdit.",
  },
  {
    id: "confidentialite",
    h: "Confidentialité",
    p: "Seules les personnes qui en ont besoin pour fournir le Service, l'installer ou en assurer le support accèdent aux données. Elles sont tenues à la confidentialité par contrat ou par une obligation légale, et sont informées des règles de protection des données.",
  },
  {
    id: "securite",
    h: "Sécurité",
    p: [
      "Omega met en œuvre les mesures techniques et organisationnelles appropriées prévues par l'article 32 du RGPD, et notamment les suivantes.",
      "Hébergement de la base de données dans l'Union européenne, à Francfort (Allemagne), sans réplication de la base hors de l'Union. Espace cloisonné pour chaque Client\u00a0: ses données ne sont jamais mélangées à celles d'un autre.",
      "Chiffrement des échanges en transit (TLS) et des données au repos. Accès par jetons nominatifs, révocables sur simple demande, et accès du personnel limité au besoin.",
      "Validation par un Utilisateur habilité avant tout envoi à un tiers. Journal de chaque action (date, agent, décision, destinataire), consultable et exportable par le Client.",
      "Sauvegardes régulières de la base. Fournisseurs de modèles d'IA engagés à ne pas entraîner leurs modèles sur les données et à ne pas les conserver plus de trente jours, sauf obligation légale.",
      "Lorsque le Devis prévoit une installation sur les serveurs du Client, l'hébergement et les sauvegardes relèvent du Client.",
      "Omega revoit ces mesures pour suivre l'état de l'art. Elle peut les faire évoluer, à condition de ne jamais abaisser le niveau de protection.",
    ],
  },
  {
    id: "sous-traitants-ulterieurs",
    h: "Sous-traitants ultérieurs",
    p: [
      "Le Client autorise Omega à faire appel à des sous-traitants ultérieurs pour les catégories suivantes\u00a0: l'hébergement de la base de données, l'orchestration des automatisations et la fourniture des modèles d'intelligence artificielle. Les outils que le Client utilisait déjà et qu'il raccorde au Service, comme sa messagerie ou son compte WhatsApp, restent sous sa responsabilité et ne sont pas des sous-traitants d'Omega.",
      "La liste nominative des sous-traitants ultérieurs, avec leur pays et les garanties qui encadrent leur intervention, est annexée au contrat et communiquée sur simple demande.",
      "Omega informe le Client par e-mail au moins trente jours avant d'ajouter ou de remplacer un sous-traitant ultérieur. Le Client peut s'y opposer pour un motif légitime lié à la protection des données. Si aucune solution n'est trouvée, il peut résilier le Service concerné sans frais avant l'entrée en vigueur du changement.",
      "Omega impose à chaque sous-traitant ultérieur, par contrat, des obligations de protection des données au moins équivalentes à celles du présent accord, et reste pleinement responsable envers le Client de leur respect.",
    ],
  },
  {
    id: "transferts",
    h: "Transferts hors de l'Union européenne",
    p: "La base de données du Client est hébergée dans l'Union européenne. Si un sous-traitant ultérieur traite des données hors de l'Espace économique européen, ou peut y accéder depuis un pays tiers, le transfert n'a lieu que s'il est encadré par une décision d'adéquation de la Commission européenne, comme le cadre de protection des données UE–États-Unis, ou par les clauses contractuelles types adoptées par la Commission. La liste nominative indique, pour chaque sous-traitant, le pays et la garantie applicables.",
  },
  {
    id: "droits-des-personnes",
    h: "Droits des personnes concernées",
    p: "Si une personne s'adresse directement à Omega pour exercer ses droits (accès, rectification, effacement, limitation, opposition, portabilité), Omega transmet sa demande au Client sans délai et n'y répond pas elle-même, sauf instruction du Client. Elle aide le Client à répondre, notamment grâce aux fonctions d'export, de modification et d'effacement du Service.",
  },
  {
    id: "violations-de-donnees",
    h: "Violations de données",
    p: "Omega notifie au Client toute violation de données personnelles dans un délai maximal de quarante-huit heures après en avoir pris connaissance, par e-mail à l'adresse de contact du Client. La notification décrit, dès qu'elles sont connues, la nature de la violation, les catégories et le nombre approximatif de personnes et de données concernées, ses conséquences probables et les mesures prises ou proposées. Omega aide le Client à notifier la CNIL et, le cas échéant, les personnes concernées.",
  },
  {
    id: "assistance",
    h: "Assistance au Client",
    p: "Omega aide le Client, en lui fournissant les informations dont elle dispose, à garantir la sécurité des traitements, à réaliser une analyse d'impact relative à la protection des données lorsqu'elle est requise et, le cas échéant, à consulter la CNIL.",
  },
  {
    id: "fin-du-traitement",
    h: "Fin du traitement",
    p: [
      "À la fin du contrat, Omega remet au Client, sur sa demande et sans frais, un export complet de ses données dans un format standard, dans les conditions de l'article «\u00a0Réversibilité et fin du contrat\u00a0» des conditions générales.",
      "Trente jours après la fin du contrat, ou plus tôt si le Client le demande par écrit, Omega efface les Données du Client, sauvegardes comprises, et le confirme par écrit sur demande. Seules sont conservées les données que le droit de l'Union ou d'un État membre impose à Omega de garder, et pendant la durée qu'il fixe.",
    ],
  },
  {
    id: "documentation-et-audits",
    h: "Documentation et audits",
    p: [
      "Omega tient le registre des traitements qu'elle effectue pour le compte de ses clients (article 30.2 du RGPD). Elle met à la disposition du Client les informations nécessaires pour démontrer le respect du présent accord.",
      "Le Client peut faire réaliser un audit une fois par an, ou à tout moment après une violation de données, en prévenant Omega au moins trente jours à l'avance. L'audit est mené par le Client ou par un auditeur indépendant, qui n'est pas un concurrent d'Omega et qui est tenu à la confidentialité. Il se déroule pendant les heures ouvrées, sans perturber le Service ni donner accès aux données d'autres clients. Ses frais sont à la charge du Client.",
    ],
  },
  {
    id: "responsabilite",
    h: "Responsabilité",
    p: "Chaque partie répond des obligations que le RGPD lui impose. Entre les parties, la responsabilité au titre du présent accord est régie par l'article «\u00a0Responsabilité\u00a0» des conditions générales, sans préjudice des droits que les personnes concernées tiennent du RGPD.",
  },
  {
    id: "contact",
    h: "Contact",
    p: `Toute question sur le présent accord, toute demande de la liste nominative des sous-traitants ultérieurs et toute notification s'adressent à ${COURRIEL}. Les garanties d'Omega sont également détaillées sur la page «\u00a0Où vont vos données\u00a0».`,
  },
];

export default function SousTraitanceDonneesPage() {
  return (
    <PageShell>
      <Cadre>
        <PageLegale
          titre="Sous-traitance des données"
          maj="Accord de sous-traitance (article 28 du RGPD), annexé aux conditions générales. Version du 27 novembre 2026."
          sections={SECTIONS}
        />
      </Cadre>
    </PageShell>
  );
}
