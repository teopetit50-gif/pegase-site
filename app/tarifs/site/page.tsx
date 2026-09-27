import type { Metadata } from "next";
import Link from "next/link";
import PageShell from "@/components/PageShell";
import PageMotion from "@/components/PageMotion";
import { Chevron } from "@/components/offres/MediaMoteurs";
import MurModeles from "@/components/tarifs/site/MurModeles";
import FaitsSite from "@/components/tarifs/site/FaitsSite";
import { MODELES } from "@/components/modeles/donnees";
import {
  FORMULES_SITE,
  MAINTENANCE_SITE_EUR,
  PRIX_MAX_SITE,
  PRIX_MIN_SITE,
  SUPPLEMENT_SITE_EUR,
  euros,
  pluriel,
  resteChequeTic,
} from "@/lib/formules-site";
import GrilleSite from "@/components/tarifs/site/GrilleSite";
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

   27/09/2026 — TROIS FORMULES (Teo : « trois prix par site, 990 pour un
   site vitrine simple, 1 990 avec x pages et allers-retours, et un
   au-dessus »). Le prix unique de 990 € n'avait aucune borne, ni pages
   ni allers-retours, et ne payait que 6,6 h de travail. La section 3
   porte maintenant <GrilleSite> (21st.dev « blueprint-tiers ») :
   Essentiel, Standard, Complet, le taux du Chèque TIC en sélecteur, SANS
   aide par défaut (le site parle à toute la France). <PrixSite> est parti
   avec l'ancienne colonne de gauche ; le cadre partagé « cadre-modeles »
   est désormais celui de la grille, et « la suite » passe dessous. Les
   montants vivent dans lib/formules-site.ts et nulle part ailleurs : la
   FAQ et la méta-description les y lisent.
   ══════════════════════════════════════════════════════════════════════ */

export const metadata: Metadata = {
  alternates: { canonical: "/tarifs/site" },
  title: "Votre site, à prix public | Omega.AI",
  description:
    `Trois formules de site catalogue, de ${euros(PRIX_MIN_SITE)} à ${euros(PRIX_MAX_SITE)}, payées une fois, sans abonnement, maintenance comprise tant qu'un poste Omega.AI est en service. ${MODELES.length} modèles en ligne.`,
};

/* ——— les quatre modèles du mur : le premier de chaque famille du
   catalogue, pour montrer quatre partis pris et non quatre variantes ——— */
const FAITS: [string, string][] = [
  [`${MODELES.length} modèles`, "tous en ligne, tous visitables"],
  ["Contenu réécrit", "à votre métier, à votre marque"],
  ["Branché sur vos systèmes", "demandes, relances, avis"],
  ["Plusieurs enseignes", "un socle commun, une vue unique"],
];

/* ——— ce que les trois formules comprennent : la bande commune de la
   grille (les différences — pages, allers-retours, mise en page — sont
   dans lib/formules-site.ts) ——— */
const COMPRIS_SITE: string[] = [
  `Un des ${MODELES.length} modèles, au choix, tous consultables`,
  "Textes réécrits à votre métier et à votre marque",
  "Vos visuels, coordonnées, horaires et points de vente en place",
  "Nom de domaine la première année, mise en ligne comprise",
  "Formulaire branché\u00a0: chaque demande entre dans votre espace",
  "Le relevé de ce que le site reçoit, chaque semaine",
];

/** « 198 €, 398 € ou 698 € » */
const enListe = (xs: string[]) =>
  xs.length < 2 ? xs.join("") : `${xs.slice(0, -1).join(", ")} ou ${xs[xs.length - 1]}`;
const restes = (taux: 40 | 80) =>
  enListe(FORMULES_SITE.map((f) => euros(resteChequeTic(f.prix, taux))));

/* ——— la FAQ site — les questions qu'un prix affiché doit prendre de front ——— */
const FAQ_SITE: { q: string; a: string }[] = [
  {
    q: "À qui appartient le site ?",
    a: "À vous, dès le premier jour. Le nom de domaine est au vôtre, les accès vous sont remis, et si nous nous quittons, le site part avec vous, fichiers et contenus compris. Rien n'est loué, rien n'est retenu. Sans maintenance, rien ne s'éteint sans prévenir : l'hébergement et le domaine passent à votre nom, et nous vous accompagnons pour la bascule.",
  },
  {
    q: "Que comprend chaque formule\u00a0?",
    a: `Les trois partent d'un modèle du catalogue, réécrit en français à votre métier et à votre marque, avec vos visuels et vos coordonnées, le nom de domaine la première année, la mise en ligne et le formulaire branché. Ce qui change, c'est l'ampleur\u00a0: ${FORMULES_SITE.map((f) => `${f.nom}, ${euros(f.prix)}, ${pluriel(f.pages, "page", "pages")} et ${pluriel(f.allersRetours, "aller-retour", "allers-retours")}`).join("\u00a0; ")}, avec en plus une mise en page adaptée pour le Complet. Les mentions légales ne comptent pas dans les pages. Au-delà, chaque page ou aller-retour de plus coûte ${euros(SUPPLEMENT_SITE_EUR)}\u00a0; un aller-retour, c'est une liste de corrections envoyée en une fois. Un besoin hors catalogue — boutique en ligne, espace membre, logiciel particulier, plusieurs enseignes sur un même socle — se chiffre sur devis, après diagnostic.`,
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
    a: `Le dispositif de la Région Guadeloupe finance de 40 à 80 % d'un projet numérique, jusqu'à 10 000 €, pour une entreprise éligible qui y est immatriculée. Il porte sur la création du site, un investissement sur facture, pas sur une mensualité. À 80 %, il reste ${restes(80)} à votre charge selon la formule\u00a0; à 40 %, ${restes(40)}. Votre éligibilité est vérifiée pendant l'audit, avant tout engagement, et si un dossier se justifie, nous le montons avec vous.`,
  },
  {
    q: "Pourquoi la maintenance est-elle comprise avec l'abonnement ?",
    a: `Parce qu'un site branché sur les systèmes vit avec eux : ce qu'il reçoit alimente la relance, les avis et le point du matin, et ce qu'il enregistre dit quoi corriger sur le site lui-même. Entretenir la vitrine fait partie du travail, et la facturer à part n'aurait pas de sens. Sans abonnement, elle reste disponible à ${euros(MAINTENANCE_SITE_EUR)} par mois, sans engagement.`,
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
                  <Link href="/reserver-un-audit" className="o-btn o-btn--primary">
                    Réserver un audit
                  </Link>
                  <Link href="/modeles" className="o-btn o-btn--ghost">
                    Voir les {MODELES.length} modèles
                    <Chevron taille={13} />
                  </Link>
                </div>
                <span className="o-flux-sous">
                  De {euros(PRIX_MIN_SITE)} à {euros(PRIX_MAX_SITE)}, une fois, pas d&apos;abonnement — plusieurs enseignes&nbsp;: sur devis, après diagnostic
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

        {/* ════════ 3 · L'OFFRE — les trois formules, puis la suite ════════
            27/09 : <GrilleSite> remplace le récapitulatif à prix unique
            (<PrixSite>) ; « la suite » passe sous la grille. */}
        <section id="offre" data-monde="clair" className="scroll-mt-24 py-[110px]">
          <div className="o-wrap">
            <EnTete
              pastille="LE PRIX"
              titre="Trois formules à prix fixe"
              chapo="La création se paie une fois. Chaque formule fixe son nombre de pages et d'allers-retours ; l'entretien, lui, est compris tant qu'un poste Omega.AI est en service chez vous."
            />

            <GrilleSite compris={COMPRIS_SITE} />

            <p data-reveal className="o-small mx-auto mt-8 max-w-[760px] text-center !text-[14px] !leading-[22px]">
              Pages comptées hors mentions légales. Au-delà de la formule&nbsp;:{" "}
              {euros(SUPPLEMENT_SITE_EUR)} la page ou l&apos;aller-retour — un aller-retour, c&apos;est
              une liste de corrections envoyée en une fois. Boutique, espace membre ou plusieurs
              enseignes&nbsp;: sur devis, après diagnostic.
            </p>

            {/* ——— la suite — le site nourrit les postes, la maintenance
                   est comprise avec eux ——— */}
            <div className="mt-24 grid grid-cols-1 items-center gap-12 lg:grid-cols-2 lg:gap-20">
              <div data-reveal className="o-card overflow-hidden">
                <JournalDemandes />
              </div>
              <div className="flex flex-col">
                <p data-reveal className="o-small !text-[14px] uppercase tracking-[0.08em]">
                  La suite
                </p>
                <h3 data-reveal className="o-h4 mt-2">
                  La maintenance&nbsp;? Comprise avec un abonnement actif.
                </h3>
                <p data-reveal className="o-body mt-4">
                  Modifications courantes, hébergement, domaine renouvelé, sauvegardes, tant qu&apos;un poste est en service chez vous. Un site branché sur vos systèmes vit avec eux&nbsp;: ce qu&apos;il reçoit alimente la relance, les avis et le point du matin, et ce qu&apos;il enregistre vous dit quoi corriger. Entretenir la vitrine fait partie du travail.
                </p>
                <p data-reveal className="o-body mt-4">
                  Sans abonnement&nbsp;: {euros(MAINTENANCE_SITE_EUR)} par mois, sans engagement. Et le
                  site vous appartient quoi qu&apos;il arrive, domaine, accès et fichiers à votre nom.
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
              Prix TTC, grille en vigueur au 27/09/2026. Le devis remis à l&apos;audit reprend le prix
              de la formule tel quel — il n&apos;existe pas de version plus chère de la même chose. Le
              Chèque TIC est un dispositif de la Région Guadeloupe, réservé aux entreprises
              éligibles&nbsp;; son taux est fixé par la Région, dossier par dossier.
            </p>
          </div>
        </section>

        {/* ════════ 4 · LE DÉROULÉ — frise de quatre étapes ════════ */}
        <section id="commande" data-monde="clair" className="scroll-mt-24 pb-[110px]">
          <div className="o-wrap">
            <EnTete
              pastille="LE DÉROULÉ"
              titre="Du modèle à la mise en ligne."
              chapo="Vous choisissez une formule et un modèle, vous déposez votre brief, nous écrivons, nous mettons en ligne et nous branchons le formulaire. Le règlement se fait avec nous, au téléphone, avant le lancement de la production."
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
