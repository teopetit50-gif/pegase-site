import type { Metadata } from "next";
import Link from "next/link";
import PageShell from "@/components/PageShell";
import PageMotion from "@/components/PageMotion";
import Partage from "@/components/Partage";
import { Chevron } from "@/components/offres/MediaMoteurs";
import MurModeles from "@/components/tarifs/site/MurModeles";
import FaitsSite from "@/components/tarifs/site/FaitsSite";
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
  title: "Votre site, à prix public | Omega.AI",
  description:
    "Le site catalogue : 990 € une fois, pas d'abonnement, 198 € restant à charge si le Chèque TIC finance 80 %. Maintenance offerte tant qu'un poste Omega.AI est en service chez vous. Vingt et un modèles, tous en ligne, contenu réécrit à votre métier.",
};

/* ——— les quatre modèles du mur : le premier de chaque famille du
   catalogue, pour montrer quatre partis pris et non quatre variantes ——— */
const FAITS: [string, string][] = [
  ["21 modèles", "tous en ligne, tous visitables"],
  ["Contenu réécrit", "en français, à votre métier"],
  ["Branché aux postes", "devis, relance, avis"],
  ["Chèque TIC", "vérifié pendant l'audit"],
];

/* ——— ce que les 990 € comprennent ——— */
const COMPRIS_SITE: string[] = [
  "Un modèle au choix : les vingt et un sont en ligne, tous consultables",
  "Contenu intégralement réécrit en français, à votre métier",
  "Vos photos, vos coordonnées, vos horaires en place",
  "Nom de domaine la première année, mise en ligne comprise",
  "Formulaire prêt à connecter à vos postes : devis, relance, avis",
];

/* ——— la FAQ site — les questions qu'un prix affiché doit prendre de front ——— */
const FAQ_SITE: { q: string; a: string }[] = [
  {
    q: "À qui appartient le site ?",
    a: "À vous, dès le premier jour. Le nom de domaine est au vôtre, les accès vous sont remis, et si nous nous quittons, le site part avec vous, fichiers compris. Rien n'est loué, rien n'est retenu. Sans maintenance, rien ne s'éteint sans prévenir : l'hébergement et le domaine passent à votre nom, et nous vous accompagnons pour la bascule.",
  },
  {
    q: "Que comprennent les 990 €, exactement ?",
    a: "Le modèle choisi dans le catalogue, la réécriture intégrale du contenu en français et à votre métier, vos photos et coordonnées en place, le nom de domaine la première année, la mise en ligne, et le formulaire prêt à connecter : dès qu'un poste Omega.AI est en service chez vous, chaque demande reçue entre dans le circuit devis, relance, avis. Un besoin hors catalogue, comme une boutique en ligne, un espace membre ou un logiciel particulier, se chiffre sur devis, à l'audit.",
  },
  {
    q: "Le Chèque TIC, concrètement ?",
    a: "Le dispositif de la Région Guadeloupe finance de 40 à 80 % d'un projet numérique, jusqu'à 10 000 €, pour une entreprise éligible. Il porte sur la création du site, un investissement sur facture, pas sur une mensualité. À 80 %, il reste 198 € à votre charge ; à 40 %, 594 €. Votre éligibilité est vérifiée pendant l'audit, avant tout engagement, et si un dossier se justifie, nous le montons avec vous.",
  },
  {
    q: "Pourquoi la maintenance est-elle offerte avec l'abonnement ?",
    a: "Parce qu'un site connecté aux systèmes vit avec eux : les demandes qu'il reçoit alimentent la relance, les avis, le point du matin. Entretenir la vitrine fait partie du travail, et la facturer à part n'aurait pas de sens. Sans abonnement, elle reste disponible à 19 € par mois, sans engagement.",
  },
  {
    q: "Et si aucun modèle ne me plaît ?",
    a: "Le catalogue est fait pour être parcouru : chaque modèle est en ligne, pas en capture. Si aucun ne convient, décrivez ce que vous souhaitez : un site sur mesure se chiffre sur devis, à l'audit, comme tout besoin hors catalogue.",
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
                <span className="o-pill o-pill--xs">DÉCOUVRIR NOS SITES</span>
              </div>
              <h1 data-arrivee="titre" className="o-h1 mt-4 max-w-[760px]">
                Votre site, au même prix pour tout le monde.
              </h1>
              <p data-arrivee="chapo" className="o-lead mt-[15px] max-w-[650px]">
                Vingt et un modèles, tous en ligne, tous consultables. Vous choisissez l&apos;allure, nous réécrivons tout le contenu pour votre métier, et dès qu&apos;un poste est en service chez vous, le formulaire l&apos;alimente. Le prix est public, comme celui de la grille.
              </p>
              <div data-arrivee="bloc" className="mt-[25px] flex flex-col items-center">
                <div className="flex flex-wrap items-center justify-center gap-3">
                  <Link href="/site/commande" className="o-btn o-btn--primary">
                    Commander le site
                  </Link>
                  <Link href="/modeles" className="o-btn o-btn--ghost">
                    Voir les 21 modèles
                    <Chevron taille={13} />
                  </Link>
                </div>
                <span className="o-flux-sous">
                  990&nbsp;€ une fois, pas d&apos;abonnement — le Chèque TIC vérifié à l&apos;audit
                </span>
              </div>
            </div>

            {/* le mur — quatre modèles réels, chacun dans un cadre de
                navigateur qui s'incline sous le pointeur. C'est la maquette de
                cette page : ce qu'on achète se voit. */}
            <MurModeles />

            <p data-reveal className="o-small mt-8 text-center">
              Et dix-sept autres, rangés par usage.{" "}
              <Link href="/modeles" className="o-link !text-[14px]">
                Parcourir les 21 modèles
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
              titre="Un prix, une aide, une suite."
              chapo="La création se paie une fois, comme un investissement, celui que le Chèque TIC peut financer. La suite est comprise : tant qu'un poste Omega.AI est en service chez vous, la vitrine est entretenue."
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
                  Un des vingt et un modèles du catalogue, réécrit pour votre métier, en ligne sous votre nom. Hors catalogue, comme une boutique en ligne, un espace membre ou un logiciel particulier, le site se chiffre sur devis, à l&apos;audit.
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
                  La maintenance&nbsp;? Offerte avec un abonnement actif.
                </h3>
                <p data-reveal className="o-body mt-4">
                  Modifications courantes, hébergement, domaine renouvelé, sauvegardes, tant qu&apos;un poste est en service chez vous. Un site connecté aux systèmes vit avec eux&nbsp;: les demandes qu&apos;il reçoit alimentent la relance, les avis et le point du matin. Entretenir la vitrine fait partie du travail.
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
              chapo="Vous choisissez un modèle, vous déposez votre brief, nous écrivons et mettons en ligne. Rien à payer en ligne aujourd'hui : nous vous appelons pour régler et lancer la production."
            />
            <EtapesDefilantes />
          </div>
        </section>

        {/* ════════ 5 · CE QUE LES AUTRES VITRINES N'ONT PAS — bande nuit ════════ */}
        <section className="o-nuit relative py-[110px]">
          <div className="o-wrap relative">
            <div className="grid grid-cols-1 items-center gap-12 lg:grid-cols-2 lg:gap-20">
              <div>
                <div data-reveal>
                  <span className="o-pill o-pill--xs o-pill--dark">
                    CE QUE LES AUTRES VITRINES N&apos;ONT PAS
                  </span>
                </div>
                <h2 data-reveal className="o-h2 mt-4">
                  Un site connecté, pas une vitrine inerte.
                </h2>
                <p data-reveal className="o-lead mt-5">
                  Un site qui reçoit trois demandes par semaine et n&apos;en transforme aucune coûte plus cher qu&apos;il ne rapporte. Ici, chaque demande entre dans le circuit. La vitrine alimente les postes, et c&apos;est pour cette raison qu&apos;elle est entretenue avec eux.
                </p>
                <div data-reveal className="mt-8 flex flex-wrap gap-3">
                  <Link href="/modeles" className="o-btn o-btn--primary">
                    Parcourir les 21 modèles
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
              chapo="Les cinq questions qu'un prix affiché doit traiter clairement, avec les réponses que nous donnons."
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
