import type { Metadata } from "next";
import Link from "next/link";
import PageShell from "@/components/PageShell";
import PageMotion from "@/components/PageMotion";
import Partage from "@/components/Partage";
import { Chevron } from "@/components/offres/MediaMoteurs";
import MurModeles from "@/components/tarifs/site/MurModeles";
import FaitsSite from "@/components/tarifs/site/FaitsSite";
import { MODELES } from "@/components/modeles/donnees";
import PrixSite from "@/components/tarifs/site/PrixSite";
import JournalDemandes from "@/components/tarifs/site/JournalDemandes";
import EtapesDefilantes from "@/components/tarifs/site/EtapesDefilantes";
import CircuitNuit from "@/components/tarifs/site/CircuitNuit";
import FaqSite from "@/components/tarifs/site/FaqSite";
import ClotureSite from "@/components/tarifs/site/ClotureSite";

/* ══════════════════════════════════════════════════════════════════════
   /tarifs/site — l'offre site à prix public (01/09/2026)

   Jusqu'ici le site se vendait uniquement sur devis, à l'audit. Décision
   Teo du 01/09 : prix public, comme la grille des postes — 990 € le site
   catalogue, présenté avec son reste à charge Chèque TIC (198 € si 80 %
   financés), et la maintenance OFFERTE tant qu'un abonnement Omega est
   actif (19 €/mois sinon). Le site n'est pas un produit isolé : c'est la
   porte d'entrée de la grille — d'où le « + » posé à droite des paliers
   sur /tarifs, qui mène ici.

   /modeles reste la galerie et continue de ne PAS vendre : ses CTA ne
   changent pas. Cette page-ci assume le prix ; l'achat passe par
   /site/commande (02/09 : modèle → compte → brief, on appelle pour
   régler), et le Chèque TIC continue de se vérifier à l'audit — règle
   « qui valide » inchangée : les organisations restent sur devis.

   07/09 — REFONTE (Teo : « la page qui s'affiche est trop cheap »). La v2
   du 01/09 vivait dans le monde .resa (la grille de Qonto) avec ses
   propres couleurs — carte à filet orange, encart rose, bande violette —
   et rien de ce qui fait la finition du reste du site. Une première
   passe avait collé le design de /tarifs ; Teo : « non, tu l'as copié mot
   pour mot, je voulais que tu t'inspires — l'écriture, les espaces, les
   trucs qu'on utilise — de l'accueil, de nos offres, des intégrations ».

   La page est donc réécrite dans le monde de l'ACCUEIL et de /offres
   (.offres, classes o-*), avec ses gestes :
     · hero centré — pastille o-pill, o-h1, o-lead, deux o-btn, sous-note
       — sur la trame pointillée de /offres et /integrations ;
     · sous le hero, ce que l'accueil met à la place de sa maquette de
       tableau de bord : ici QUATRE MODÈLES RÉELS du catalogue, dans leur
       cadre de navigateur (components/modeles/MiniSite) — une page qui
       vend un site doit montrer des sites, pas des prix ;
     · la bande de faits, comme « Branché sur les outils » ;
     · l'offre en deux blocs « maquette + étiquette + titre + texte » —
       le geste des bénéfices de l'accueil : la maquette du prix est un
       récapitulatif de commande où le Chèque TIC se soustrait ligne à
       ligne, celle de la suite est le journal des demandes reçues ;
     · la frise d'étapes sous filet, numéros gris (le « déroulé ») ;
     · la bande nuit avec sa carte sombre (l'« échéance » de l'accueil) ;
     · la FAQ o-faq-item et la clôture au noir.
   Les faits sont ceux de la v2 ; les seuls textes nouveaux sont ceux
   que ces emplacements imposaient (étapes, légendes des maquettes), et
   ils redisent ce qui est déjà posé ici ou sur /site/commande.

   Transitions (02/09) : le cadre bordeaux de la carte « Découvrir nos
   sites » de /commencer est un objet PARTAGÉ (« cadre-modeles ») — il se
   pose sur la maquette du prix (Partage as="div", sans data-reveal :
   l'objet doit être visible à l'arrivée). Pastille, titre, chapô et
   boutons entrent en cascade ([data-arrivee], components/Arrivee.tsx).

   14/09/2026 — REFONTE par composants repris (chantier « fais comme tu le
   sens, je veux des beaux trucs bien développés et pro »). Même ordre de
   sections, mêmes textes, mêmes liens ; ce qui change est la matière :
     1. mur        → <MurModeles>       (Aceternity « 3D card » + le cadre
                                         Safari de Magic UI : les quatre
                                         vitrines s'inclinent sous le pointeur)
     2. faits      → <FaitsSite>        (Tailark « stats two » ; le « 21 » se
                                         compte à l'arrivée, <CompteurFait>)
     3. prix       → <PrixSite>         (Tailark « pricing » : trois taux de
                                         Chèque TIC, le reste à charge glisse)
        la suite   → <JournalDemandes>  (Magic UI « animated list » : les
                                         quatre lignes entrent l'une après
                                         l'autre)
     4. déroulé    → <EtapesDefilantes>
     5. bande nuit → <CircuitNuit>      (Magic UI « border beam » : un
                                         faisceau fait le tour de la carte)
     6. FAQ        → <FaqSite>          (Tailark « faqs three », accordéon
                                         Radix : une seule réponse ouverte)
     7. clôture    → <ClotureSite>      (shadcnblocks cta13)
   Chaque composant porte son en-tête ORIGINE / POURQUOI ICI / CE QUI EST
   JETÉ / ÉCARTS ASSUMÉS et sa feuille CSS scopée sous `.offres`. Les
   maquettes locales (BarreFenetre, MaqCommande, MaqDemandes) et les
   constantes ETAPES, CIRCUIT, VITRINE sont parties avec elles : leur
   contenu vit désormais dans le composant qui le rend.
   ══════════════════════════════════════════════════════════════════════ */

export const metadata: Metadata = {
  alternates: { canonical: "/tarifs/site" },
  title: "Votre site, à prix public | Omega.AI",
  description:
    `Le site catalogue : 990 € une fois, pas d'abonnement, maintenance comprise tant qu'un poste Omega.AI est en service. ${MODELES.length} modèles en ligne.`,
};

/* ——— les quatre modèles du mur : le premier de chaque famille du
   catalogue, pour montrer quatre partis pris et non quatre variantes ——— */
const FAITS: [string, string][] = [
  [`${MODELES.length} modèles`, "tous en ligne, tous visitables"],
  ["Contenu réécrit", "à votre métier, à votre marque"],
  ["Branché sur vos systèmes", "demandes, relances, avis"],
  ["Plusieurs enseignes", "un socle commun, une vue unique"],
];

/* ——— ce que les 990 € comprennent ——— */
const COMPRIS_SITE: string[] = [
  `Un modèle au choix : les ${MODELES.length} sont en ligne, tous consultables`,
  "Contenu intégralement réécrit en français, à votre métier et à votre marque",
  "Vos visuels, vos coordonnées, vos horaires, vos points de vente en place",
  "Nom de domaine la première année, mise en ligne comprise",
  "Formulaire branché sur vos postes : chaque demande entre dans votre espace, relance et avis compris",
  "Le relevé de ce que le site reçoit : d'où viennent les demandes, ce qui revient le plus souvent",
];

/* ——— la FAQ site — les questions qu'un prix affiché doit prendre de front ——— */
const FAQ_SITE: { q: string; a: string }[] = [
  {
    q: "À qui appartient le site ?",
    a: "À vous, dès le premier jour. Le nom de domaine est au vôtre, les accès vous sont remis, et si nous nous quittons, le site part avec vous, fichiers et contenus compris. Rien n'est loué, rien n'est retenu. Sans maintenance, rien ne s'éteint sans prévenir : l'hébergement et le domaine passent à votre nom, et nous vous accompagnons pour la bascule.",
  },
  {
    q: "Que comprennent les 990 €, exactement ?",
    a: "Le modèle choisi dans le catalogue, la réécriture intégrale du contenu en français, à votre métier et à votre marque, vos visuels et vos coordonnées en place, le nom de domaine la première année, la mise en ligne, et le formulaire branché : dès qu'un poste Omega.AI est en service chez vous, chaque demande reçue entre dans le circuit devis, relance, avis, et le relevé de ce que le site reçoit vous revient chaque semaine. Un besoin hors catalogue — boutique en ligne, espace membre, logiciel particulier, plusieurs enseignes sur un même socle — se chiffre sur devis, après diagnostic.",
  },
  {
    q: "Que devient ce que le site enregistre ?",
    a: "Cela vous appartient, et cela reste lisible : les demandes reçues, la page d'où elles viennent, ce qui est cherché sans être trouvé, ce qui n'aboutit pas. Vous le lisez en clair dans votre espace, pas en courbes d'audience. Ça sert à deux choses : corriger ce que le site dit mal, et déclencher ce qui doit l'être — un devis relancé, un client déjà venu qui revient sur une gamme, une demande hors catalogue signalée au responsable. Rien n'est revendu ni cédé ; le détail du traitement est sur la page « Où vont vos données ».",
  },
  {
    q: "Nous avons plusieurs enseignes. Et nous ?",
    a: "Le socle est le même, posé autant de fois qu'il y a d'enseignes : chacune garde son allure, son domaine et ses textes, et vous lisez l'ensemble au même endroit — demandes reçues, devis en cours, règlements, avis, par enseigne ou consolidés. Les règles de relance s'écrivent une fois et s'appliquent partout, avec les exceptions que vous posez. Ce périmètre-là ne se commande pas en ligne : il commence par une enseigne pilote et se chiffre après un diagnostic.",
  },
  {
    q: "Le Chèque TIC, concrètement ?",
    a: "Le dispositif de la Région Guadeloupe finance de 40 à 80 % d'un projet numérique, jusqu'à 10 000 €, pour une entreprise éligible qui y est immatriculée. Il porte sur la création du site, un investissement sur facture, pas sur une mensualité. À 80 %, il reste 198 € à votre charge ; à 40 %, 594 €. Votre éligibilité est vérifiée pendant l'audit, avant tout engagement, et si un dossier se justifie, nous le montons avec vous.",
  },
  {
    q: "Pourquoi la maintenance est-elle comprise avec l'abonnement ?",
    a: "Parce qu'un site branché sur les systèmes vit avec eux : ce qu'il reçoit alimente la relance, les avis et le point du matin, et ce qu'il enregistre dit quoi corriger sur le site lui-même. Entretenir la vitrine fait partie du travail, et la facturer à part n'aurait pas de sens. Sans abonnement, elle reste disponible à 19 € par mois, sans engagement.",
  },
  {
    q: "Et si aucun modèle ne convient ?",
    a: "Le catalogue est fait pour être parcouru : chaque modèle est en ligne, pas en capture. Si aucun ne convient, décrivez ce que vous attendez — une charte à respecter, une arborescence imposée, un espace client à part. Un site dessiné pour vous se chiffre sur devis, après diagnostic, comme tout besoin hors catalogue.",
  },
];


/* ——— en-tête de section : pastille, titre, chapô, centrés — le même
   que l'accueil et /offres ——— */
function EnTete({ pastille, titre, chapo }: { pastille: string; titre: string; chapo: string }) {
  return (
    <div className="flex flex-col items-center text-center">
      <div data-reveal>
        <span className="o-pill o-pill--xs">{pastille}</span>
      </div>
      <h2 data-reveal className="o-h2 mt-4 max-w-[600px]">
        {titre}
      </h2>
      <p data-reveal className="o-lead mt-4 max-w-[650px]">
        {chapo}
      </p>
    </div>
  );
}

export default function TarifsSitePage() {
  return (
    <PageShell>
      <PageMotion />

      <div className="offres">
        {/* ════════ 1 · HERO — centré, sur la trame pointillée ════════ */}
        <section data-monde="clair" className="relative overflow-hidden pt-[40px] sm:pt-[81px]">
          <div
            aria-hidden
            className="o-dots o-dots-fade pointer-events-none absolute inset-x-0 top-0 h-[600px]"
          />

          <div className="o-wrap relative">
            <div className="flex flex-col items-center pt-[60px] text-center">
              <div data-arrivee="titre">
                <span className="o-pill o-pill--xs">VOTRE SITE</span>
              </div>
              <h1 data-arrivee="titre" className="o-h1 mt-4 max-w-[760px]">
                Un site vitrine à prix public, connecté à vos systèmes
              </h1>
              <p data-arrivee="chapo" className="o-lead mt-[15px] max-w-[650px]">
                {MODELES.length} modèles, tous en ligne, tous consultables. Vous choisissez l&apos;allure, nous réécrivons tout le contenu à votre métier et à votre marque. Ce qui arrive ensuite — demandes, devis, relances, avis — entre directement dans vos systèmes.
              </p>
              <div data-arrivee="bloc" className="mt-[25px] flex flex-col items-center">
                <div className="flex flex-wrap items-center justify-center gap-3">
                  <Link href="/site/commande" className="o-btn o-btn--primary">
                    Commander le site
                  </Link>
                  <Link href="/modeles" className="o-btn o-btn--ghost">
                    Voir les {MODELES.length} modèles
                    <Chevron taille={13} />
                  </Link>
                </div>
                <span className="o-flux-sous">
                  990&nbsp;€ une fois, pas d&apos;abonnement — plusieurs enseignes&nbsp;: sur devis, après diagnostic
                </span>
              </div>
            </div>

            {/* le mur — quatre modèles réels, chacun dans un cadre de
                navigateur qui s'incline sous le pointeur. C'est la maquette de
                cette page : ce qu'on achète se voit. */}
            <MurModeles />

            <p data-reveal className="o-small mt-8 text-center">
              Et {MODELES.length - 4} autres, rangés par usage.{" "}
              <Link href="/modeles" className="o-link !text-[14px]">
                Parcourir les {MODELES.length} modèles
                <Chevron taille={12} />
              </Link>
            </p>
          </div>
        </section>

        {/* ════════ 2 · LES FAITS — la bande sous le mur ════════ */}
        <section data-monde="clair" className="pb-[40px] pt-[80px]">
          <div className="o-wrap">
            <FaitsSite faits={FAITS} />
          </div>
        </section>

        {/* ════════ 3 · L'OFFRE — le prix et la suite, en deux blocs ════════ */}
        <section id="offre" data-monde="clair" className="scroll-mt-24 py-[110px]">
          <div className="o-wrap">
            <EnTete
              pastille="LE PRIX"
              titre="Le prix, l'aide régionale et ce qui est compris ensuite"
              chapo="La création se paie une fois, comme un investissement — celui que le Chèque TIC peut financer. Ce qui vient après est compris : tant qu'un poste Omega.AI est en service chez vous, la vitrine est entretenue, et ce qu'elle reçoit alimente vos systèmes."
            />

            <div className="mt-16 grid grid-cols-1 gap-14 lg:grid-cols-2 lg:gap-20">
              {/* ——— le prix — la maquette est l'objet partagé qui arrive
                     de /commencer ——— */}
              <div className="flex flex-col">
                <Partage
                  nom="cadre-modeles"
                  share="voyage-modeles"
                  as="div"
                  className="o-card overflow-hidden"
                >
                  <PrixSite />
                </Partage>
                <p data-reveal className="o-small mt-8 !text-[14px] uppercase tracking-[0.08em]">
                  Le prix
                </p>
                <h3 data-reveal className="o-h4 mt-2">
                  990&nbsp;€, une fois. Pas d&apos;abonnement.
                </h3>
                <p data-reveal className="o-body mt-4">
                  Un des {MODELES.length} modèles du catalogue, réécrit pour votre métier, en ligne sous votre nom. Le même prix pour une entreprise de trois personnes et pour une direction de groupe. Le catalogue contient aussi des gabarits de boutique et d&apos;espace membre : le dessin est compris, mais leur mécanique — paiement, stock, comptes — et les montages à plusieurs enseignes se chiffrent sur devis, après diagnostic.
                </p>
                <ul data-reveal className="mt-6 space-y-2.5">
                  {COMPRIS_SITE.map((t) => (
                    <li key={t} className="o-small flex gap-3 !text-[15px] !leading-[24px]">
                      <span aria-hidden className="mt-[11px] h-1 w-1 shrink-0 rounded-full bg-[#09090b]" />
                      {t}
                    </li>
                  ))}
                </ul>
                <div data-reveal className="mt-8 flex flex-wrap items-center gap-x-6 gap-y-3">
                  <Link href="/site/commande" className="o-btn o-btn--primary">
                    Commander le site
                  </Link>
                  <Link href="/modeles" className="o-link !text-[15px]">
                    Voir les modèles d&apos;abord
                    <Chevron taille={13} />
                  </Link>
                </div>
              </div>

              {/* ——— la suite — le site nourrit les postes, la maintenance
                     est comprise avec eux ——— */}
              <div className="flex flex-col">
                <div data-reveal className="o-card overflow-hidden">
                  <JournalDemandes />
                </div>
                <p data-reveal className="o-small mt-8 !text-[14px] uppercase tracking-[0.08em]">
                  La suite
                </p>
                <h3 data-reveal className="o-h4 mt-2">
                  La maintenance&nbsp;? Comprise avec un abonnement actif.
                </h3>
                <p data-reveal className="o-body mt-4">
                  Modifications courantes, hébergement, domaine renouvelé, sauvegardes, tant qu&apos;un poste est en service chez vous. Un site branché sur vos systèmes vit avec eux&nbsp;: ce qu&apos;il reçoit alimente la relance, les avis et le point du matin, et ce qu&apos;il enregistre vous dit quoi corriger. Entretenir la vitrine fait partie du travail.
                </p>
                <p data-reveal className="o-body mt-4">
                  Sans abonnement&nbsp;: 19&nbsp;€ par mois, sans engagement. Et le site vous appartient quoi qu&apos;il arrive, domaine, accès et fichiers à votre nom.
                </p>
                <div data-reveal className="mt-8 flex flex-wrap items-center gap-x-6 gap-y-3">
                  <Link href="/tarifs" className="o-btn o-btn--ghost">
                    Voir les postes
                    <Chevron taille={13} />
                  </Link>
                  <Link href="/reserver-un-audit" className="o-link !text-[15px]">
                    Vérifier l&apos;éligibilité au Chèque TIC
                    <Chevron taille={13} />
                  </Link>
                </div>
              </div>
            </div>

            <p data-reveal className="o-small mx-auto mt-14 max-w-[760px] text-center !text-[13px] !leading-[20px]">
              Prix TTC, offre en vigueur au 01/09/2026. Le devis remis à l&apos;audit reprend ce
              prix tel quel pour un site catalogue — il n&apos;existe pas de version plus chère de
              la même chose. Le Chèque TIC est un dispositif de la Région Guadeloupe, réservé
              aux entreprises éligibles&nbsp;; son taux est fixé par la Région, dossier par
              dossier.
            </p>
          </div>
        </section>

        {/* ════════ 4 · LE DÉROULÉ — frise de quatre étapes ════════ */}
        <section id="commande" data-monde="clair" className="scroll-mt-24 pb-[110px]">
          <div className="o-wrap">
            <EnTete
              pastille="LE DÉROULÉ"
              titre="Du modèle à la mise en ligne."
              chapo="Vous choisissez un modèle, vous déposez votre brief, nous écrivons, nous mettons en ligne et nous branchons le formulaire. Rien à payer en ligne aujourd'hui : nous vous appelons pour régler et lancer la production."
            />
            <EtapesDefilantes />
          </div>
        </section>

        {/* ════════ 5 · CE QUI SUIT LA DEMANDE — bande nuit ════════
            15/09 (Teo) : la section s'intitulait « CE QUE LES AUTRES VITRINES
            N'ONT PAS » et ouvrait sur le coût d'un site qui ne transforme
            rien. Elle disait le produit par le défaut des autres ; elle dit
            maintenant ce que celui-ci fait d'une demande. */}
        <section className="o-nuit relative py-[110px]">
          <div className="o-wrap relative">
            <div className="grid grid-cols-1 items-center gap-12 lg:grid-cols-2 lg:gap-20">
              <div>
                <div data-reveal>
                  <span className="o-pill o-pill--xs o-pill--dark">
                    CE QUI SUIT LA DEMANDE
                  </span>
                </div>
                <h2 data-reveal className="o-h2 mt-4">
                  Une surface branchée sur vos systèmes.
                </h2>
                <p data-reveal className="o-lead mt-5">
                  Chaque demande reçue entre dans le circuit, à trois demandes par semaine comme à trois cents&nbsp;: accusé de réception, devis, relance, facture et demande d&apos;avis. Ce que le site enregistre au passage revient à vos équipes en clair, ce qui permet de corriger une page ou une gamme sur des faits. La vitrine est donc entretenue en même temps que les systèmes qu&apos;elle alimente.
                </p>
                <div data-reveal className="mt-8 flex flex-wrap gap-3">
                  <Link href="/modeles" className="o-btn o-btn--primary">
                    Parcourir les {MODELES.length} modèles
                  </Link>
                  <Link href="/offres" className="o-btn o-btn--ghost">
                    Ce qui se déploie
                    <Chevron taille={13} />
                  </Link>
                </div>
              </div>
              <CircuitNuit />
            </div>
          </div>
        </section>

        {/* ════════ 6 · FAQ ════════ */}
        <section id="faq" data-monde="clair" className="py-[110px]">
          <div className="o-wrap">
            <EnTete
              pastille="QUESTIONS"
              titre="Questions sur le site."
              chapo="Les questions qu'un prix affiché doit traiter clairement, avec les réponses que nous donnons."
            />
            <FaqSite questions={FAQ_SITE} />
          </div>
        </section>

        {/* ════════ 7 · CTA — clôture au noir ════════ */}
        <section className="o-nuit relative py-[120px]">
          <ClotureSite />
        </section>
      </div>
    </PageShell>
  );
}
