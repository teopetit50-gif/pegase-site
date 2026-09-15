import type { Metadata } from "next";
import PageShell from "@/components/PageShell";
import PageLegale, { type SectionLegale } from "@/components/legal/PageLegale";
import { COURRIEL, TELEPHONE_AFFICHE } from "@/lib/reservation";

/* ══════════════════════════════════════════════════════════════════════
   /mentions-legales

   30/07 — le téléphone est ajouté : l'article 6-III-1 de la LCEN l'exige,
   et il ne figurait nulle part. Il vient de la même constante que le reste
   du site (lib/reservation), donc changer le numéro le change partout.

   L'adresse contact@pegase.gp a été retirée : la loi demande un moyen de
   contact « direct et effectif », or le domaine pegase.gp n'est ni
   enregistré ni délégué — une adresse qui rebondit ne remplit pas cette
   condition. Elle sera remise le jour où le domaine existera.

   04/08 — page complétée sur tout ce qui est VÉRIFIABLE : hébergeur,
   hébergement des données dans l'UE, mesure d'audience sans cookie, liens
   sortants (la page /modeles en ouvre vingt et un vers des démonstrations
   tierces — vingt-deux jusqu'au 06/08, AssetX retiré depuis), crédits photo,
   responsabilité, droit applicable.

   08/09 — l'adresse contact@omegaai.fr est ajoutée (éditeur, données
   personnelles) : elle existe désormais (redirection OVH) et reçoit.
   15/09 — les deux mentions manquantes (identité légale de l'éditeur et
   directeur de la publication) ne sont plus affichées du tout : elles
   étaient rendues sous la forme « [à compléter] », ce qu'un visiteur lit
   comme un site inachevé. Décision de Teo : la société n'est pas encore
   immatriculée ([[creation-societe-omega]]), on ne met donc rien plutôt
   qu'un trou visible.
   ⚠ CE N'EST PAS SOLDÉ : la LCEN (art. 6 III) impose toujours ces
   mentions. Le jour de l'immatriculation, remettre ici la forme
   juridique, le SIRET, l'adresse du siège, le capital, la TVA
   intracommunautaire si assujetti, et le nom du directeur de la
   publication. Ne jamais inventer une de ces valeurs en attendant.

   15/09 — FORME SEULEMENT, PAS UN MOT DU FOND. La page était restée sur
   l'ancien thème sombre (text-white, text-muted, border-line-soft) alors
   que le site est passé au monde clair : « Mentions légales » dans le
   pied de page ouvrait une page d'un autre site. Elle passe au monde
   `.resa` — celui de /contact, son voisin dans le pied de page — et
   gagne ce qui manque à un texte de onze sections : un sommaire d'ancres
   et une colonne de lecture de 600 px. Toute la mise en page vit
   désormais dans components/legal/PageLegale.tsx, et ce fichier ne garde
   que le fond juridique. Seul ajout aux données : une clé `id` par
   section, qui est l'ancre du <h2> — aucun texte, aucun ordre, aucune
   date n'a bougé.
   ══════════════════════════════════════════════════════════════════════ */

export const metadata: Metadata = {
  title: "Mentions légales | Omega.AI",
  description:
    "Mentions légales du site Omega.AI : éditeur, hébergement, données personnelles, propriété intellectuelle.",
};

const SECTIONS: SectionLegale[] = [
  {
    id: "editeur",
    h: "Éditeur du site",
    p: `Le site est édité par Omega.AI, entreprise établie en France, dont l'activité est la conception et le déploiement de systèmes d'automatisation pour les entreprises et les organisations. Téléphone : ${TELEPHONE_AFFICHE}. E-mail : ${COURRIEL}.`,
  },
  {
    id: "hebergement-du-site",
    /* ⚠ SEULE EXCEPTION à la règle « on ne nomme jamais nos outils » : la
       LCEN (art. 6 III) impose de publier le nom et l'adresse de
       l'hébergeur du site. Ce nom-là ne peut pas être remplacé par une
       formule générique sans mettre les mentions légales en défaut — et il
       ne dit rien de la stack qui fait tourner les moteurs. */
    h: "Hébergement du site",
    p: "Le site est hébergé par Vercel Inc., 440 N Barranca Ave #4133, Covina, CA 91723, États-Unis, vercel.com.",
  },
  {
    id: "hebergement-des-donnees",
    h: "Hébergement des données de nos clients",
    p: "Les données traitées dans le cadre de nos prestations (factures, relances, échanges clients), sont hébergées sur une base de données située dans l'Union européenne (Francfort, Allemagne). Chaque entreprise cliente dispose d'un espace cloisonné : les données d'un client ne sont jamais mélangées à celles d'un autre, ni revendues, ni utilisées pour entraîner un modèle. Ce site vitrine, lui, ne stocke aucune donnée de ses visiteurs.",
  },
  {
    id: "mesure-audience",
    h: "Mesure d'audience",
    p: "La fréquentation du site est mesurée par un outil de statistiques qui ne dépose aucun cookie et ne construit aucun profil publicitaire. C'est la raison pour laquelle ce site n'affiche pas de bandeau de consentement : il n'y a rien à consentir. Aucune donnée de navigation n'est cédée à un tiers.",
  },
  {
    id: "donnees-personnelles",
    h: "Données personnelles",
    p: `Les informations que vous transmettez lors d'une demande d'audit ou d'une prise de contact (nom, entreprise, coordonnées, contexte de votre demande), servent uniquement à traiter cette demande. Elles ne sont ni cédées ni vendues. Conformément au Règlement général sur la protection des données (RGPD) et à la loi Informatique et Libertés, vous disposez d'un droit d'accès, de rectification, d'effacement, de limitation et d'opposition : il s'exerce en nous écrivant à ${COURRIEL} ou au ${TELEPHONE_AFFICHE}. Vous pouvez également introduire une réclamation auprès de la CNIL (cnil.fr).`,
  },
  {
    id: "propriete-intellectuelle",
    h: "Propriété intellectuelle",
    p: "L'ensemble des contenus du site (textes, noms des offres (CASHD, RELOAD, FRONTD, FILED, PULSE, VAULT), éléments graphiques et code), est la propriété de Omega.AI. Toute reproduction, même partielle, sans autorisation écrite préalable est interdite. Les données de démonstration présentées sur ce site (tableaux de bord, conversations, montants, noms d'entreprises), sont fictives.",
  },
  {
    id: "modeles-et-liens-sortants",
    h: "Modèles de sites et liens sortants",
    p: "La page « Modèles de sites » présente des gabarits acquis sous licence par Omega.AI et déployés à des fins de démonstration. Les noms, marques et contenus qui y figurent appartiennent à leurs auteurs respectifs et ne sont montrés qu'à titre d'aperçu du design : ce ne sont ni des réalisations livrées à des clients, ni des références commerciales. Le site comporte par ailleurs des liens vers ces démonstrations et vers des sites tiers ; Omega.AI n'exerce aucun contrôle sur leur contenu et ne saurait en être tenue responsable.",
  },
  {
    id: "credits-photographiques",
    h: "Crédits photographiques",
    p: "Les photographies utilisées sur le site proviennent d'Unsplash et sont couvertes par la licence Unsplash, qui en autorise l'usage commercial. Les auteurs et les liens vers les clichés originaux sont listés dans le fichier de crédits du site.",
  },
  {
    id: "responsabilite",
    h: "Responsabilité",
    p: "Les informations publiées sur ce site sont fournies à titre indicatif et peuvent évoluer. Elles ne constituent ni un conseil juridique, ni un conseil comptable, ni un engagement contractuel : seules les conditions convenues par écrit dans un devis ou un contrat engagent Omega.AI. Les montants d'aides publiques éventuellement cités, dont le Chèque TIC, sont soumis aux conditions et aux plafonds fixés par l'organisme qui les attribue, et sont vérifiés au cas par cas pendant l'audit.",
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
        maj="Dernière mise à jour : 8 septembre 2026."
        sections={SECTIONS}
      />
    </PageShell>
  );
}
