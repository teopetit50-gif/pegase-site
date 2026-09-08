import type { Metadata } from "next";
import Link from "next/link";
import PageShell from "@/components/PageShell";
import PageMotion from "@/components/PageMotion";
import Partage from "@/components/Partage";
import MiniSite from "@/components/modeles/MiniSite";
import { CATEGORIES, parCategorie } from "@/components/modeles/donnees";
import { Chevron } from "@/components/offres/MediaMoteurs";
import { CANAL_VALEUR } from "@/lib/reservation";

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
   ══════════════════════════════════════════════════════════════════════ */

export const metadata: Metadata = {
  title: "Votre site, à prix public | Omega.AI",
  description:
    "Le site catalogue : 990 € une fois, pas d'abonnement — 198 € restant à charge si le Chèque TIC finance 80 %. Maintenance offerte tant qu'un poste Omega tourne chez vous. Vingt et un modèles, tous en ligne, contenu réécrit à votre métier.",
};

/* ——— les quatre modèles du mur : le premier de chaque famille du
   catalogue, pour montrer quatre partis pris et non quatre variantes ——— */
const VITRINE = CATEGORIES.map((c) => parCategorie(c.cle)[0]);

/* ——— les quatre faits sous le mur — les mêmes que /modeles ——— */
const FAITS: [string, string][] = [
  ["21 modèles", "tous en ligne, tous visitables"],
  ["Contenu réécrit", "en français, à votre métier"],
  ["Branché aux postes", "devis, relance, avis"],
  ["Chèque TIC", "vérifié pendant l'audit"],
];

/* ——— ce que les 990 € comprennent ——— */
const COMPRIS_SITE: string[] = [
  "Un modèle au choix — les vingt et un sont en ligne, tous visitables",
  "Contenu intégralement réécrit en français, à votre métier",
  "Vos photos, vos coordonnées, vos horaires en place",
  "Nom de domaine la première année, mise en ligne comprise",
  "Formulaire prêt à brancher sur vos postes — devis, relance, avis",
];

/* ——— le déroulé, tel que /site/commande l'annonce lui-même ——— */
const ETAPES = [
  {
    n: "01",
    titre: "Le modèle",
    sousTitre: "Choisir l'allure, pas le métier",
    texte:
      "Les vingt et un modèles sont en ligne, en vrai : vous les visitez, vous retenez celui qui vous ressemble. Le design change, la mécanique derrière ne change pas.",
  },
  {
    n: "02",
    titre: "Le brief",
    sousTitre: "Votre métier, vos photos, vos horaires",
    texte:
      "Depuis votre compte, sans quitter la page. Rien à payer en ligne aujourd'hui : on vous appelle pour régler et lancer la production.",
  },
  {
    n: "03",
    titre: "L'écriture",
    sousTitre: "Tout le contenu, réécrit en français",
    texte:
      "Chaque page est réécrite à votre métier, vos coordonnées et vos photos en place. Rien de ce que montre le modèle ne reste tel quel.",
  },
  {
    n: "04",
    titre: "La mise en ligne",
    sousTitre: "Sous votre nom, domaine compris",
    texte:
      "Le site vous appartient dès le premier jour. Dès qu'un poste tourne chez vous, chaque demande reçue entre dans le circuit.",
  },
];

/* ——— ce qui suit le clic — la bande nuit ——— */
const CIRCUIT = [
  ["01", "Accusé de réception en deux minutes, sous votre signature."],
  ["02", "Devis relancé à J+3 et J+7, facture suivie jusqu'au règlement."],
  ["03", "Avis demandé une fois le travail fait — jamais avant."],
];

/* ——— la FAQ site — les questions qu'un prix affiché doit prendre de front ——— */
const FAQ_SITE: { q: string; a: string }[] = [
  {
    q: "À qui appartient le site ?",
    a: "À vous, dès le premier jour. Le nom de domaine est au vôtre, les accès vous sont remis, et si nous nous quittons, le site part avec vous — fichiers compris. Rien n'est loué, rien n'est retenu. Sans maintenance, rien ne s'éteint sans prévenir : l'hébergement et le domaine passent à votre nom, et on vous accompagne pour la bascule.",
  },
  {
    q: "Que comprennent les 990 €, exactement ?",
    a: "Le modèle choisi dans le catalogue, la réécriture intégrale du contenu en français et à votre métier, vos photos et coordonnées en place, le nom de domaine la première année, la mise en ligne — et le formulaire prêt à brancher : dès qu'un poste Omega tourne chez vous, chaque demande reçue entre dans le circuit devis, relance, avis. Un besoin hors catalogue — boutique en ligne, espace membre, logiciel particulier — se chiffre sur devis, à l'audit.",
  },
  {
    q: "Le Chèque TIC, concrètement ?",
    a: "Le dispositif de la Région Guadeloupe finance de 40 à 80 % d'un projet numérique, jusqu'à 10 000 €, pour une entreprise éligible. Il porte sur la création du site — un investissement sur facture — pas sur une mensualité. À 80 %, il reste 198 € à votre charge ; à 40 %, 594 €. Votre éligibilité est vérifiée pendant l'audit, avant tout engagement, et si un dossier se justifie, nous le montons avec vous.",
  },
  {
    q: "Pourquoi la maintenance est-elle offerte avec l'abonnement ?",
    a: "Parce qu'un site branché aux moteurs vit avec eux : les demandes qu'il reçoit alimentent la relance, les avis, le point du matin. Entretenir la vitrine fait partie du travail — la facturer à part n'aurait pas de sens. Sans abonnement, elle reste disponible à 19 € par mois, sans engagement.",
  },
  {
    q: "Et si aucun modèle ne me plaît ?",
    a: "Le catalogue est fait pour être parcouru : chaque modèle est en ligne, en vrai, pas en capture. Si rien n'accroche, décrivez ce que vous voulez — un site sur mesure se chiffre sur devis, à l'audit, comme tout besoin hors catalogue.",
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

/* ——— la barre de fenêtre des maquettes (trois pastilles + titre), celle
   de la maquette de /offres ——— */
function BarreFenetre({ titre }: { titre: string }) {
  return (
    <div className="flex items-center gap-2.5 border-b border-black/[0.06] bg-[#fbfbfb] px-4 py-2.5">
      <span className="flex gap-1.5">
        {[0, 1, 2].map((k) => (
          <i key={k} className="block h-[7px] w-[7px] rounded-full bg-black/[0.12]" />
        ))}
      </span>
      <span className="text-[11.5px] font-semibold text-[#52525b]">{titre}</span>
    </div>
  );
}

/* ——— maquette du prix : le récapitulatif de commande, où l'aide se
   soustrait ligne à ligne — le format le plus honnête pour une aide ——— */
function MaqCommande() {
  return (
    <>
      <BarreFenetre titre="Omega.AI : votre commande" />
      <div className="px-5 py-4 sm:px-6">
        <div className="flex items-center justify-between gap-4 py-3">
          <div className="min-w-0">
            <div className="text-[13px] font-medium text-[#09090b]">Site catalogue</div>
            <div className="text-[11.5px] text-[#a1a1aa]">un modèle, réécrit à votre métier</div>
          </div>
          <span className="num shrink-0 text-[13px] font-medium text-[#09090b]">990 €</span>
        </div>
        <div className="flex items-center justify-between gap-4 border-t border-black/[0.06] py-3">
          <div className="min-w-0">
            <div className="text-[13px] font-medium text-[#09090b]">Chèque TIC à 80 %</div>
            <div className="text-[11.5px] text-[#a1a1aa]">Région Guadeloupe · si vous êtes éligible</div>
          </div>
          <span className="num shrink-0 text-[13px] font-medium text-[#09090b]">− 792 €</span>
        </div>
        <div className="flex items-end justify-between gap-4 border-t border-black/[0.12] pt-4">
          <div>
            <div className="text-[11.5px] font-semibold text-[#52525b]">Restant à votre charge</div>
            <div
              className="num mt-1 text-[30px] font-semibold leading-none tracking-[-0.03em] text-[#09090b]"
              style={{ fontFamily: "var(--font-jakarta)" }}
            >
              198 €
            </div>
          </div>
          <span className="rounded-full bg-[#ecfdf3] px-2.5 py-1 text-[11.5px] font-medium text-[#15803d]">
            Éligibilité vérifiée à l&apos;audit
          </span>
        </div>
        <p className="mt-4 text-[12.5px] leading-[1.6] text-[#71717a]">
          Le prix est le même pour tout le monde. Sans l&apos;aide, ou à 40&nbsp;%, il reste
          990&nbsp;€ ou 594&nbsp;€ — jamais plus.
        </p>
      </div>
    </>
  );
}

/* ——— maquette de la suite : le journal des demandes reçues par le site,
   le même geste que le journal de l'accueil ——— */
function MaqDemandes() {
  const lignes = [
    ["09:14", "Demande de devis · toiture", "accusé de réception envoyé"],
    ["09:16", "Réponse WhatsApp · horaires samedi", "sous votre signature"],
    ["J+3", "Devis DV-0891 · Ti Punch", "relancé"],
    ["J+7", "Facture FA-2418 · Garage Lémard", "réglée, avis demandé"],
  ];
  return (
    <>
      <BarreFenetre titre="Omega.AI : demandes reçues par le site" />
      <div className="space-y-1.5 px-4 py-3.5">
        {lignes.map(([h, t, e]) => (
          <div
            key={t}
            className="flex items-center gap-3 rounded-[9px] border border-black/[0.05] bg-[#fcfcfc] px-3 py-2.5"
          >
            <span className="num w-9 shrink-0 text-[11.5px] text-[#a1a1aa]">{h}</span>
            <span className="min-w-0 flex-1 truncate text-[12.5px] font-medium text-[#09090b]">{t}</span>
            {/* l'état se cache sous 640 px : à trois colonnes sur 327 px de
                large, c'est le titre qui se tronquait, et c'est lui qui compte */}
            <span className="hidden shrink-0 text-[11.5px] text-[#a1a1aa] sm:inline">{e}</span>
          </div>
        ))}
      </div>
    </>
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
                Vingt et un modèles, tous en ligne, tous visitables. Vous choisissez
                l&apos;allure, on réécrit tout le contenu à votre métier — et dès qu&apos;un poste
                tourne chez vous, le formulaire l&apos;alimente. Le prix est public, comme celui
                de la grille.
              </p>
              <div data-arrivee="bloc" className="mt-[25px] flex flex-col items-center">
                <div className="flex flex-wrap items-center justify-center gap-3">
                  <Link href="/site/commande" className="o-btn o-btn--primary">
                    Commander mon site
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

            {/* le mur — quatre modèles réels, dans leur cadre de navigateur,
                chacun cliquable vers sa démo en ligne. C'est la maquette de
                cette page : ce qu'on achète se voit. */}
            <div
              data-arrivee="collage"
              className="mt-12 grid grid-cols-2 gap-4 sm:mt-14 lg:grid-cols-4 lg:gap-5"
            >
              {VITRINE.map((m, i) => (
                <a
                  key={m.slug}
                  href={m.demo}
                  target="_blank"
                  rel="noopener noreferrer"
                  title={`${m.nom} : ${m.style}`}
                  className="group block"
                >
                  <MiniSite
                    m={m}
                    ton="clair"
                    priority={i < 2}
                    sizes="(max-width: 640px) 45vw, (max-width: 1024px) 45vw, 22vw"
                    className="transition-transform duration-300 ease-out group-hover:-translate-y-1"
                  />
                  <div className="mt-3 flex items-baseline justify-between gap-3 px-0.5">
                    <span className="text-[14px] font-medium text-[#09090b]">{m.nom}</span>
                    <span className="o-small hidden truncate !text-[13px] !leading-[20px] sm:inline">
                      {m.style}
                    </span>
                  </div>
                </a>
              ))}
            </div>
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
            <div className="grid grid-cols-2 gap-x-6 gap-y-8 lg:grid-cols-4">
              {FAITS.map(([fort, doux]) => (
                <div key={fort} data-reveal className="text-center">
                  <p className="o-h5 !text-[20px] !leading-[28px]">{fort}</p>
                  <p className="o-small mt-1 !text-[13.5px] !leading-[20px]">{doux}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ════════ 3 · L'OFFRE — le prix et la suite, en deux blocs ════════ */}
        <section id="offre" data-monde="clair" className="scroll-mt-24 py-[110px]">
          <div className="o-wrap">
            <EnTete
              pastille="LE PRIX"
              titre="Un prix, une aide, une suite."
              chapo="La création se paie une fois — c'est un investissement, celui que le Chèque TIC sait financer. La suite, elle, est comprise : tant qu'un poste Omega tourne chez vous, la vitrine est entretenue."
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
                  <MaqCommande />
                </Partage>
                <p data-reveal className="o-small mt-8 !text-[14px] uppercase tracking-[0.08em]">
                  Le prix
                </p>
                <h3 data-reveal className="o-h4 mt-2">
                  990&nbsp;€, une fois. Pas d&apos;abonnement.
                </h3>
                <p data-reveal className="o-body mt-4">
                  Un des vingt et un modèles du catalogue, réécrit à votre métier, en ligne sous
                  votre nom. Hors catalogue — boutique en ligne, espace membre, logiciel
                  particulier — c&apos;est sur devis, à l&apos;audit.
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
                    Commander mon site
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
                  <MaqDemandes />
                </div>
                <p data-reveal className="o-small mt-8 !text-[14px] uppercase tracking-[0.08em]">
                  La suite
                </p>
                <h3 data-reveal className="o-h4 mt-2">
                  La maintenance&nbsp;? Offerte avec un abonnement actif.
                </h3>
                <p data-reveal className="o-body mt-4">
                  Modifications courantes, hébergement, domaine renouvelé, sauvegardes — tant
                  qu&apos;un poste tourne chez vous. Un site branché aux moteurs vit avec eux&nbsp;:
                  les demandes qu&apos;il reçoit alimentent la relance, les avis, le point du matin.
                  Entretenir la vitrine fait partie du travail.
                </p>
                <p data-reveal className="o-body mt-4">
                  Sans abonnement&nbsp;: 19&nbsp;€ par mois, sans engagement. Et le site vous
                  appartient, quoi qu&apos;il arrive — domaine, accès et fichiers à votre nom.
                </p>
                <div data-reveal className="mt-8 flex flex-wrap items-center gap-x-6 gap-y-3">
                  <Link href="/tarifs" className="o-btn o-btn--ghost">
                    Voir les postes
                    <Chevron taille={13} />
                  </Link>
                  <Link href="/reserver-un-audit" className="o-link !text-[15px]">
                    Vérifier mon éligibilité au Chèque TIC
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
              chapo="Vous choisissez un modèle, vous déposez votre brief, on écrit et on met en ligne. Rien à payer en ligne aujourd'hui : on vous appelle pour régler et lancer la production."
            />
            <div className="mt-14 grid grid-cols-1 gap-10 sm:grid-cols-2 lg:grid-cols-4 lg:gap-8">
              {ETAPES.map((e) => (
                <div key={e.n} data-reveal className="flex flex-col">
                  <span aria-hidden className="h-px w-full bg-[#e4e4e7]" />
                  <span
                    className="mt-4 text-[12px] font-semibold tracking-[0.12em] text-[#a1a1aa]"
                    style={{ fontVariantNumeric: "tabular-nums" }}
                  >
                    {e.n}
                  </span>
                  <h3 className="o-h5 mt-3">{e.titre}</h3>
                  <p className="mt-2 text-[15px] font-semibold leading-[24px] text-[#18181b]">
                    {e.sousTitre}
                  </p>
                  <p className="o-small mt-2 !text-[15px] !leading-[24px]">{e.texte}</p>
                </div>
              ))}
            </div>
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
                  Un site branché, pas une vitrine qui dort.
                </h2>
                <p data-reveal className="o-lead mt-5">
                  Un site qui reçoit trois demandes par semaine et n&apos;en transforme aucune coûte
                  plus cher qu&apos;il ne rapporte. Ici, chaque demande entre dans le circuit. La
                  vitrine nourrit les postes — c&apos;est pour ça qu&apos;elle est entretenue avec
                  eux.
                </p>
                <div data-reveal className="mt-8 flex flex-wrap gap-3">
                  <Link href="/modeles" className="o-btn o-btn--primary">
                    Parcourir les 21 modèles
                  </Link>
                  <Link href="/offres" className="o-btn o-btn--ghost">
                    Ce qui s&apos;installe
                    <Chevron taille={13} />
                  </Link>
                </div>
              </div>
              <div data-reveal className="rounded-[20px] border border-white/[0.1] bg-[#18181b] p-8 sm:p-10">
                <p className="text-[11.5px] font-semibold uppercase tracking-[0.1em] text-[#a1a1aa]">
                  Ce qui suit le clic
                </p>
                <ul className="mt-5 divide-y divide-white/[0.08]">
                  {CIRCUIT.map(([n, t]) => (
                    <li key={n} className="flex gap-5 py-4 first:pt-0 last:pb-0">
                      <span
                        className="mt-[3px] text-[12px] font-semibold tracking-[0.12em] text-[#71717a]"
                        style={{ fontVariantNumeric: "tabular-nums" }}
                      >
                        {n}
                      </span>
                      <span className="o-body !text-[#d4d4d8]">{t}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </section>

        {/* ════════ 6 · FAQ ════════ */}
        <section id="faq" data-monde="clair" className="py-[110px]">
          <div className="o-wrap">
            <EnTete
              pastille="QUESTIONS"
              titre="Questions sur le site."
              chapo="Les cinq qu'un prix affiché doit prendre de front, avec les réponses qu'on donne en vrai."
            />
            <div className="mx-auto mt-12 max-w-[800px]">
              {FAQ_SITE.map((f) => (
                <details key={f.q} className="o-faq-item">
                  <summary>
                    {f.q}
                    <span className="o-faq-croix" aria-hidden>
                      <svg
                        width="18"
                        height="18"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth={1.8}
                        strokeLinecap="round"
                      >
                        <path d="M12 5v14M5 12h14" />
                      </svg>
                    </span>
                  </summary>
                  <p className="o-body pb-6 pr-10">{f.a}</p>
                </details>
              ))}
            </div>
          </div>
        </section>

        {/* ════════ 7 · CTA — clôture au noir ════════ */}
        <section className="o-nuit relative py-[120px]">
          <div className="o-wrap relative flex flex-col items-center text-center">
            <h2 data-reveal className="o-h2 max-w-[620px]">
              Commandez votre site en deux minutes.
            </h2>
            <p data-reveal className="o-lead mt-5 max-w-[600px]">
              Un modèle, votre brief, et on écrit tout à votre métier. Rien à payer en ligne
              aujourd&apos;hui&nbsp;: on vous appelle pour régler, et le Chèque TIC se vérifie
              avant tout engagement.
            </p>
            <div data-reveal className="mt-9 flex flex-wrap justify-center gap-3">
              <Link href="/site/commande" className="o-btn o-btn--primary">
                Commander mon site
              </Link>
              <a href="/contact" className="o-btn o-btn--ghost">
                Nous joindre
              </a>
            </div>
            <p data-reveal className="o-small mt-5 !text-[13px]">
              {CANAL_VALEUR} — on vous répond le jour même.
            </p>
            {/* la mention discrète de l'autre porte : pour qui s'est trompé
                d'aiguillage, sans re-poser deux portes ici */}
            <p data-reveal className="o-small mt-8 max-w-[520px] !text-[13px] !leading-[20px]">
              Plusieurs services se partagent le travail chez vous&nbsp;? Votre site s&apos;inscrit
              dans un ensemble qui se mesure d&apos;abord&nbsp;: votre prix sort d&apos;un audit.{" "}
              <Link href="/reserver-un-audit" className="underline underline-offset-4 hover:text-white">
                Réserver un échange
              </Link>
            </p>
          </div>
        </section>
      </div>
    </PageShell>
  );
}
