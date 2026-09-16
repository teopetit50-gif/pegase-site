import type { Metadata } from "next";
import Lien from "@/components/Lien";
import PageShell from "@/components/PageShell";
import { MODELES } from "@/components/modeles/donnees";
import PageMotion from "@/components/PageMotion";
import CartesPortes from "@/components/commencer/CartesPortes";
import { lienContact } from "@/lib/reservation";

/* ══════════════════════════════════════════════════════════════════════
   /commencer — l'aiguillage (28/08/2026)

   Demande Teo : les deux portes posées en haut de /tarifs rendaient la
   page confuse. Désormais TOUS les « Commencer » du site mènent ici : une
   page à décision unique, deux grandes cartes, rien d'autre. Le visiteur
   se qualifie lui-même et part directement au bon endroit :

     · « Indépendants & TPE-PME »        → /tarifs (côté « PME »)
     · « Organisations & équipes »       → /tarifs?monde=structure
     · « Découvrir nos sites » (01/09)   → /tarifs/site (l'offre site ;
                                            depuis le 02/09, plus /modeles)

   15/09/2026 — LA PORTE « ORGANISATIONS » NE SAUTE PLUS /tarifs. Elle
   menait droit à /reserver-un-audit, parce qu'il y avait alors DEUX
   modèles commerciaux : prix publics et achat direct d'un côté, aucun
   montant et devis de l'autre. Les deux commits du jour ont supprimé cette
   raison : /tarifs n'affiche plus de barème (elle estime, l'audit fixe) et
   elle a reçu le sélecteur des deux mondes (MONDES / GRANDE_STRUCTURE de
   lib/paliers.ts), que `?monde=structure` ouvre directement du bon côté.
   Une organisation voit donc maintenant les mêmes postes et le même
   périmètre que tout le monde, en « Sur devis », avant d'aller réserver —
   /reserver-un-audit reste l'arrivée unique, atteinte depuis la grille.
   Le CTA le dit : on arrive sur des postes, pas sur un formulaire.

   Le mot retenu pour l'autre monde est « organisation » — jamais
   « grosse entreprise » : ce qui sépare les deux n'est pas la taille mais
   la structure de validation, et personne n'aime être rangé par taille.

   Chaque page de destination porte une mention DISCRÈTE de l'autre porte
   (bas de page) pour qui s'est trompé — c'est ici que la clarté se joue,
   pas en doublant les portes partout.

   05/09/2026 — les trois cartes reprennent les « LinkCard » de la page
   d'accueil de scale.com (demande Teo, capture à l'appui) : carte grise,
   tuile blanche avec pictogramme, titre fin, texte calé en bas, bouton
   gris qui passe au noir au survol. Trois colonnes égales, plus de « + »
   ni de badge — la référence n'en a pas, et le bouton dit déjà où l'on
   va. Les points « c'est vous si » sont fondus dans le paragraphe. Le
   relevé au style calculé est en tête du bloc `.cm-*` de globals.css.
   Les teintes des pictogrammes sont celles de la référence, et elles
   gardent l'histoire du dégradé : brun chaud pour le départ (prix
   publics), violet pour l'arrivée (sur mesure), bleu ardoise pour les
   sites. Les pastilles « prix publics / sur mesure » ne partent donc
   plus d'ici : sur /tarifs et /reserver-un-audit elles arrivent avec
   leur page (Partage sans appariement), le cadre de la carte sites
   voyage toujours jusqu'à /tarifs/site.
   ══════════════════════════════════════════════════════════════════════ */

export const metadata: Metadata = {
  alternates: { canonical: "/commencer" },
  title: "Par où commencer | Omega.AI",
  description:
    "Deux façons de démarrer avec Omega.AI : un diagnostic sur mesure là où plusieurs services valident, un audit court pour les TPE-PME.",
};


const PORTES = [
  {
    id: "orga",
    teinte: "violet",
    icone: "plusieurs",
    titre: "Organisations & équipes",
    texte:
      /* 15/09 — la phrase opposait « volumes mesurés » à « grille » : la
         grille n'existe plus, les deux portes chiffrent sur les volumes. Ce
         qui les sépare, c'est la profondeur du diagnostic. */
      "Plusieurs services se partagent le travail, comme l'accueil, la comptabilité et les opérations, et plusieurs personnes valident, chacune sur son poste. Le diagnostic mesure vos volumes service par service, et le devis en découle.",
    cta: "Voir les postes",
    /* 15/09 — la grille, ouverte côté « Grande structure » (voir l'en-tête).
       Le href porte une query : il ne figure donc PAS dans la table PORTES
       de lib/transitions, et `data-porte` reste vide sur cette carte. C'est
       voulu — au retour, <Arrivee> ne connaît que le pathname (`/tarifs`) et
       ne peut apparier qu'UNE carte : celle des prix publics garde la pose
       de l'objet, celle-ci fait sa montée normale. */
    href: "/tarifs?monde=structure",
  },
  {
    id: "tpe",
    teinte: "chaud",
    icone: "seul",
    titre: "Indépendants & TPE-PME",
    texte:
      "Une personne, parfois deux, tient les demandes, les devis et les factures, voit passer tout ce qui entre et sort, et valide seule ce qui part vers les clients. Ses outils sont la messagerie, un tableur, WhatsApp et la caisse.",
    cta: "Estimer mon prix",
    href: "/tarifs",
  },
];

const SITE = {
  teinte: "bleu",
  icone: "site",
  titre: "Découvrir nos sites",
  texte:
    `Pour les entreprises sans site, ou dont le site n'apporte aucune demande : ${MODELES.length} modèles en ligne, tous consultables. Vous choisissez l'allure, nous réécrivons tout le contenu pour votre métier, et le formulaire alimente vos postes dès le premier jour.`,
  cta: "Voir les offres",
  href: "/tarifs/site",
};

export default function CommencerPage() {
  return (
    <PageShell>
      <PageMotion />
      <div className="resa">
        <section data-monde="clair" className="r-wrap pb-20 pt-14 sm:pb-28 sm:pt-20">
          {/* 01/09 — transitions : [data-arrivee] = rôles de la cascade
              d'arrivée (components/Arrivee.tsx) ; les pastilles et le cadre
              bordeaux sont des objets PARTAGÉS (components/Partage.tsx) qui
              voyagent jusqu'à la page d'arrivée, et reviennent au retour. */}
          <div data-arrivee="titre" className="mx-auto max-w-3xl text-center">
            <h1 className="r-h1">Par où commencer&nbsp;?</h1>
            <p className="r-lead mx-auto mt-5 max-w-[46ch]">
              Une seule question décide de la suite&nbsp;: chez vous,{" "}
              <strong className="font-semibold text-[#050505]">qui valide ce qui part&nbsp;?</strong>
            </p>
          </div>

          <CartesPortes portes={PORTES} site={SITE} />

          <p data-arrivee="colonne" className="r-note mx-auto mt-10 max-w-md text-center">
            Vous hésitez entre les deux&nbsp;? Décrivez votre situation en deux lignes{" "}
            <Lien
              href={lienContact("avant")}
              className="underline underline-offset-4 hover:text-[#050505]"
            >
              dans le formulaire de contact
            </Lien>{" "}
            , nous vous répondons le jour même.
          </p>
        </section>
      </div>
    </PageShell>
  );
}
