import type { Metadata } from "next";
import PageShell from "@/components/PageShell";
import { CANAL_VALEUR } from "@/lib/reservation";

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

   ⚠ DEUX TROUS RESTENT, ET ILS NE PEUVENT PAS ÊTRE COMBLÉS SANS TEO :
   l'identité légale de l'éditeur (forme juridique, SIRET, adresse du
   siège, capital s'il y a société, TVA intracommunautaire si assujetti) et
   le nom du directeur de la publication. Ce sont des mentions à valeur
   juridique : inventer un numéro ou une adresse publierait une fausse
   information sur un site commercial. Ils restent donc affichés comme
   manquants — moins grave qu'un faux, et ça se voit, ce qui évite de les
   oublier.
   ══════════════════════════════════════════════════════════════════════ */

export const metadata: Metadata = {
  title: "Mentions légales | Omega.AI",
  description:
    "Mentions légales du site Omega.AI : éditeur, hébergement, données personnelles, propriété intellectuelle.",
};

const MANQUE = "[à compléter]";

const SECTIONS: { h: string; p: string }[] = [
  {
    h: "Éditeur du site",
    p: `Le site est édité par Omega.AI, entreprise établie en Guadeloupe, dont l'activité est la conception et l'installation d'automatisations pour les très petites entreprises. Forme juridique, numéro SIRET, adresse du siège et, le cas échéant, capital social et numéro de TVA intracommunautaire : ${MANQUE}. Téléphone : ${CANAL_VALEUR}.`,
  },
  {
    h: "Directeur de la publication",
    p: `Le directeur de la publication est le représentant légal de Omega.AI : ${MANQUE}.`,
  },
  {
    /* ⚠ SEULE EXCEPTION à la règle « on ne nomme jamais nos outils » : la
       LCEN (art. 6 III) impose de publier le nom et l'adresse de
       l'hébergeur du site. Ce nom-là ne peut pas être remplacé par une
       formule générique sans mettre les mentions légales en défaut — et il
       ne dit rien de la stack qui fait tourner les moteurs. */
    h: "Hébergement du site",
    p: "Le site est hébergé par Vercel Inc., 440 N Barranca Ave #4133, Covina, CA 91723, États-Unis, vercel.com.",
  },
  {
    h: "Hébergement des données de nos clients",
    p: "Les données traitées dans le cadre de nos prestations (factures, relances, échanges clients), sont hébergées sur une base de données située dans l'Union européenne (Francfort, Allemagne). Chaque entreprise cliente dispose d'un espace cloisonné : les données d'un client ne sont jamais mélangées à celles d'un autre, ni revendues, ni utilisées pour entraîner un modèle. Ce site vitrine, lui, ne stocke aucune donnée de ses visiteurs.",
  },
  {
    h: "Mesure d'audience",
    p: "La fréquentation du site est mesurée par un outil de statistiques qui ne dépose aucun cookie et ne construit aucun profil publicitaire. C'est la raison pour laquelle ce site n'affiche pas de bandeau de consentement : il n'y a rien à consentir. Aucune donnée de navigation n'est cédée à un tiers.",
  },
  {
    h: "Données personnelles",
    p: `Les informations que vous transmettez lors d'une demande d'audit ou d'une prise de contact (nom, entreprise, coordonnées, contexte de votre demande), servent uniquement à traiter cette demande. Elles ne sont ni cédées ni vendues. Conformément au Règlement général sur la protection des données (RGPD) et à la loi Informatique et Libertés, vous disposez d'un droit d'accès, de rectification, d'effacement, de limitation et d'opposition : il s'exerce en nous écrivant au ${CANAL_VALEUR}. Vous pouvez également introduire une réclamation auprès de la CNIL (cnil.fr).`,
  },
  {
    h: "Propriété intellectuelle",
    p: "L'ensemble des contenus du site (textes, noms des offres (CASHD, RELOAD, FRONTD, FILED, PULSE, VAULT), éléments graphiques et code), est la propriété de Omega.AI. Toute reproduction, même partielle, sans autorisation écrite préalable est interdite. Les données de démonstration présentées sur ce site (tableaux de bord, conversations, montants, noms d'entreprises), sont fictives.",
  },
  {
    h: "Modèles de sites et liens sortants",
    p: "La page « Modèles de sites » présente des gabarits acquis sous licence par Omega.AI et déployés à des fins de démonstration. Les noms, marques et contenus qui y figurent appartiennent à leurs auteurs respectifs et ne sont montrés qu'à titre d'aperçu du design : ce ne sont ni des réalisations livrées à des clients, ni des références commerciales. Le site comporte par ailleurs des liens vers ces démonstrations et vers des sites tiers ; Omega.AI n'exerce aucun contrôle sur leur contenu et ne saurait en être tenue responsable.",
  },
  {
    h: "Crédits photographiques",
    p: "Les photographies utilisées sur le site proviennent d'Unsplash et sont couvertes par la licence Unsplash, qui en autorise l'usage commercial. Les auteurs et les liens vers les clichés originaux sont listés dans le fichier de crédits du site.",
  },
  {
    h: "Responsabilité",
    p: "Les informations publiées sur ce site sont fournies à titre indicatif et peuvent évoluer. Elles ne constituent ni un conseil juridique, ni un conseil comptable, ni un engagement contractuel : seules les conditions convenues par écrit dans un devis ou un contrat engagent Omega.AI. Les montants d'aides publiques éventuellement cités, dont le Chèque TIC, sont soumis aux conditions et aux plafonds fixés par l'organisme qui les attribue, et sont vérifiés au cas par cas pendant l'audit.",
  },
  {
    h: "Droit applicable",
    p: "Le présent site et les mentions qui y figurent sont soumis au droit français. En cas de litige, et à défaut de résolution amiable, les tribunaux français sont seuls compétents.",
  },
];

export default function MentionsLegalesPage() {
  return (
    <PageShell>
      <div className="border-b border-line-soft px-6 pb-16 pt-14 sm:px-10 sm:pb-20 sm:pt-28">
        <div className="mx-auto max-w-3xl">
          <h1 className="text-[27px] font-medium tracking-[-0.02em] text-white sm:text-[44px]">
            Mentions légales
          </h1>
          <p className="mt-5 text-[14px] text-muted">Dernière mise à jour : 4 août 2026.</p>
          <div className="mt-10 space-y-10">
            {SECTIONS.map((s) => (
              <div key={s.h}>
                <h2 className="text-[20px] font-medium text-white">{s.h}</h2>
                <p className="mt-3 text-[15px] leading-[1.85] text-muted">{s.p}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </PageShell>
  );
}
