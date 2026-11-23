import type { Metadata } from "next";
import PageShell from "@/components/PageShell";
import PageLegale, { type SectionLegale } from "@/components/legal/PageLegale";
import { COURRIEL, TELEPHONE_AFFICHE } from "@/lib/reservation";
import { titreSite } from "@/components/espace2/portail";

/* ══════════════════════════════════════════════════════════════════════
   /mentions-legales

   23/11/2026 — LA PAGE REVIENT. Elle avait été retirée le 15/09 (commit
   d9e8acb) parce que la société n'était pas immatriculée et qu'une page
   sans identité légale se lisait comme un site inachevé. Décision de Teo
   du 23/11 : l'éditeur du site est ORVAL CONSULTING, la SASU de Yacer
   Zozi, qui en est le directeur de la publication. Les identifiants sont
   ceux que la société publie elle-même sur orvalconsulting.com
   (/mentions-legales, relevés le 23/11/2026) — aucun n'est inventé.

   La trame suit celle d'Orval (éditeur en fiche, directeur de la
   publication, hébergeur, propriété intellectuelle, marques de tiers,
   responsabilité, données, droit applicable) ; les sections propres à ce
   site (hébergement des données, mesure d'audience, modèles, crédits
   photo) reviennent du texte du 08/09, revérifiées une à une.

   ⚠ CE QUI EST VOLONTAIREMENT NEUTRE. La propriété des contenus, des
   noms d'offres et du code n'est attribuée à personne nommément : l'éditeur
   légal est Orval Consulting, le produit est celui d'Omega, et la page ne
   tranche pas cette question à leur place. Même raison pour le téléphone
   et l'e-mail : ce sont ceux du site (lib/reservation), pas ceux d'Orval.

   ⚠ LE JOUR OÙ OMEGA EST IMMATRICULÉE : remplacer la fiche EDITEUR et le
   directeur de la publication par ceux de la nouvelle société, et rien
   d'autre.

   Le nom de l'hébergeur est la SEULE exception à la règle « on ne nomme
   jamais nos outils » : la LCEN (art. 6 III) impose de le publier avec
   son adresse.

   Un site dédié à un logiciel (NEXT_PUBLIC_PORTAIL) ne sert pas cette
   page : elle est dans PAGES_OMEGA (next.config.ts).
   ══════════════════════════════════════════════════════════════════════ */

export const metadata: Metadata = {
  alternates: { canonical: "/mentions-legales" },
  title: titreSite("Mentions légales"),
  description:
    "Mentions légales du site omegaai.fr : éditeur, directeur de la publication, hébergement, données personnelles, propriété intellectuelle.",
};

const SECTIONS: SectionLegale[] = [
  {
    id: "editeur",
    h: "Éditeur du site",
    p: "Le site omegaai.fr, qui présente les offres Omega.AI, est édité par la société ORVAL CONSULTING.",
    fiche: [
      ["Dénomination", "ORVAL CONSULTING"],
      ["Forme juridique", "SASU (société par actions simplifiée unipersonnelle) au capital de 500,00 €"],
      ["Siège social", "49 rue de Ponthieu, 75008 Paris, France"],
      ["SIREN", "981 724 602"],
      ["SIRET (siège)", "981 724 602 00017"],
      ["RCS", "Paris 981 724 602"],
      ["TVA intracommunautaire", "FR66981724602"],
      ["Téléphone", TELEPHONE_AFFICHE],
      ["E-mail", COURRIEL],
    ],
  },
  {
    id: "directeur-de-la-publication",
    h: "Directeur de la publication",
    p: "Yacer Zozi, président d'ORVAL CONSULTING.",
  },
  {
    id: "hebergement-du-site",
    h: "Hébergement du site",
    p: "Le site est hébergé par Vercel Inc., 440 N Barranca Ave #4133, Covina, CA 91723, États-Unis (vercel.com).",
  },
  {
    id: "hebergement-des-donnees",
    h: "Hébergement des données de nos clients",
    p: "Les données traitées dans le cadre de nos prestations (factures, documents de gestion, échanges avec les clients) sont hébergées sur une base de données située dans l'Union européenne (Francfort, Allemagne). Chaque entreprise cliente dispose d'un espace cloisonné : ses données ne sont ni mélangées à celles d'un autre client, ni revendues, ni utilisées pour entraîner un modèle. Le détail figure sur la page « Où vont vos données ».",
  },
  {
    id: "mesure-audience",
    h: "Mesure d'audience",
    p: "La fréquentation du site est mesurée par un outil de statistiques qui ne dépose aucun cookie et ne construit aucun profil publicitaire. C'est pourquoi ce site n'affiche pas de bandeau de consentement : aucun traceur soumis au consentement n'y est déposé. Aucune donnée de navigation n'est cédée à un tiers.",
  },
  {
    id: "donnees-personnelles",
    h: "Données personnelles",
    p: `Les informations que vous transmettez lors d'une demande d'audit ou d'une prise de contact (nom, entreprise, coordonnées, contexte de votre demande) servent uniquement à traiter cette demande. Elles ne sont ni cédées ni vendues. Conformément au Règlement général sur la protection des données (RGPD) et à la loi Informatique et Libertés, vous disposez d'un droit d'accès, de rectification, d'effacement, de limitation et d'opposition. Ces droits s'exercent en nous écrivant à ${COURRIEL} ou au ${TELEPHONE_AFFICHE}. Vous pouvez également introduire une réclamation auprès de la CNIL (cnil.fr).`,
  },
  {
    id: "propriete-intellectuelle",
    h: "Propriété intellectuelle",
    p: "L'ensemble des éléments qui composent ce site (structure, textes, noms et signes des offres, illustrations, photographies, vidéos, charte graphique et code) est protégé par le droit de la propriété intellectuelle. Toute reproduction, représentation, modification ou adaptation, totale ou partielle, par quelque procédé que ce soit, est interdite sans autorisation écrite préalable. Le nom « Omega.AI », son logotype et les noms des offres ne peuvent être utilisés sans accord écrit. Les données de démonstration présentées sur ce site (tableaux de bord, conversations, montants, noms d'entreprises) sont fictives.",
  },
  {
    id: "marques-de-tiers",
    h: "Marques de tiers",
    p: "Les noms de logiciels, de sociétés et les marques cités sur ce site, notamment ceux des outils auxquels nos moteurs se connectent, appartiennent à leurs détenteurs respectifs. Ils ne sont mentionnés qu'à titre descriptif et n'impliquent ni affiliation, ni approbation, ni partenariat.",
  },
  {
    id: "modeles-et-liens-sortants",
    h: "Modèles de sites et liens sortants",
    p: "La page « Modèles de sites » présente des gabarits acquis sous licence et déployés à des fins de démonstration. Les noms, marques et contenus qui y figurent appartiennent à leurs auteurs respectifs et ne sont montrés qu'à titre d'aperçu du design : ce ne sont ni des réalisations livrées à des clients, ni des références commerciales. Le site comporte également des liens vers ces démonstrations et vers des sites tiers ; le contenu des sites tiers n'engage que leurs éditeurs.",
  },
  {
    id: "credits-photographiques",
    h: "Crédits photographiques",
    p: `Les photographies utilisées sur le site proviennent d'Unsplash et sont couvertes par la licence Unsplash, qui en autorise l'usage commercial. La liste des auteurs et les liens vers les clichés originaux sont communiqués sur simple demande à ${COURRIEL}.`,
  },
  {
    id: "responsabilite",
    h: "Responsabilité",
    p: "Les informations publiées sur ce site sont fournies à titre indicatif et peuvent être modifiées à tout moment. L'éditeur s'efforce d'en assurer l'exactitude et la mise à jour, sans garantir qu'elles soient exemptes d'erreur ou d'omission. Elles ne constituent ni un conseil juridique, ni un conseil comptable, ni un engagement contractuel : seules les conditions convenues par écrit dans un devis ou un contrat ont valeur d'engagement. Les montants d'aides publiques éventuellement cités sont soumis aux conditions et aux plafonds fixés par l'organisme qui les attribue, et sont vérifiés au cas par cas lors de l'audit.",
  },
  {
    id: "droit-applicable",
    h: "Droit applicable",
    p: "Le présent site et les mentions qui y figurent sont soumis au droit français. En cas de litige, et à défaut de résolution amiable, les tribunaux français sont seuls compétents.",
  },
];

export default function MentionsLegalesPage() {
  return (
    <PageShell>
      <PageLegale
        titre="Mentions légales"
        maj="Dernière mise à jour : 23 novembre 2026."
        sections={SECTIONS}
      />
    </PageShell>
  );
}
