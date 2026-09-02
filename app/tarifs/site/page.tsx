import type { Metadata } from "next";
import Link from "next/link";
import PageShell from "@/components/PageShell";
import PageMotion from "@/components/PageMotion";
import Partage from "@/components/Partage";

/* ══════════════════════════════════════════════════════════════════════
   /tarifs/site — l'offre site à prix public (01/09/2026)

   Jusqu'ici le site se vendait uniquement sur devis, à l'audit. Décision
   Teo du 01/09 : prix public, comme la grille des postes — 990 € le site
   catalogue, présenté avec son reste à charge Chèque TIC (198 € si 80 %
   financés), et la maintenance OFFERTE tant qu'un abonnement Omega est
   actif (19 €/mois sinon). Le site n'est pas un produit isolé : c'est la
   porte d'entrée de la grille — d'où le « + » posé à droite des paliers
   sur /tarifs, qui mène ici.

   DESIGN v2 (01/09, Teo : « même ton, pas une copie conforme ») : la
   première version reprenait les trois cartes de palier de /tarifs — la
   revue avait d'ailleurs noté qu'on lisait « 198 € » comme une formule
   moins chère. Ici le monde .resa reste (typo, boutons, teintes du
   dégradé orange → violet), mais la structure raconte UN produit sous
   trois angles : la carte produit (blanche, filet, l'accent en dégradé),
   le décompte Chèque TIC façon devis (fond rose, les lignes qui se
   soustraient — le format le plus honnête pour une aide), et la bande
   maintenance (fond violet clair, horizontale : c'est une suite, pas une
   formule). Les trois chiffres clés gardent la progression de la grille :
   990 orange, 198 rose, « Offerte » violet.

   /modeles reste la galerie et continue de ne PAS vendre : ses CTA ne
   changent pas. Cette page-ci assume le prix ; l'achat, lui, passe
   toujours par l'audit gratuit (le devis site sort de là, Chèque TIC
   vérifié séance tenante) — règle « qui valide » inchangée : les
   organisations restent sur devis sans montant.

   02/09 (Teo) — l'ACHAT EN LIGNE. Cette page devient la destination de
   la carte « Découvrir nos sites » de /commencer, et son CTA principal
   n'envoie plus vers la galerie : « Commander mon site » → /site/commande
   (modèle → compte → brief → paiement, Stripe plus tard). La bande sombre
   garde « Parcourir les 21 modèles » → /modeles : la galerie reste le
   lieu de découverte. Le Chèque TIC continue de se vérifier à l'audit.

   Transitions (02/09) : le cadre bordeaux de /commencer est un objet
   PARTAGÉ (« cadre-modeles ») — il voyageait jusqu'au hero de /modeles,
   il se pose désormais sur la carte produit ci-dessous (Partage as="div",
   sans data-reveal : l'objet doit être visible à l'arrivée). Titre, chapô
   et l'intertitre de l'offre entrent en cascade ([data-arrivee], voir
   components/Arrivee.tsx), comme sur /tarifs.
   ══════════════════════════════════════════════════════════════════════ */

export const metadata: Metadata = {
  title: "Votre site, à prix public | Omega.AI",
  description:
    "Le site catalogue : 990 € une fois, pas d'abonnement — 198 € restant à charge si le Chèque TIC finance 80 %. Maintenance offerte tant qu'un poste Omega tourne chez vous. Vingt et un modèles, tous en ligne, contenu réécrit à votre métier.",
};

/* ——— ce que les 990 € comprennent — la liste de la carte produit ——— */
const COMPRIS_SITE: string[] = [
  "Un modèle au choix — les vingt et un sont en ligne, tous visitables",
  "Contenu intégralement réécrit en français, à votre métier",
  "Vos photos, vos coordonnées, vos horaires en place",
  "Nom de domaine la première année, mise en ligne comprise",
  "Formulaire prêt à brancher sur vos postes — devis, relance, avis",
];

/* ——— la FAQ site — les questions qu'un prix affiché doit prendre de
   front, mêmes replis .r-faq que /tarifs et la page audit. ——— */
const FAQ_SITE: { q: string; r: string[] }[] = [
  {
    q: "À qui appartient le site ?",
    r: [
      "À vous, dès le premier jour. Le nom de domaine est au vôtre, les accès vous sont remis, et si nous nous quittons, le site part avec vous — fichiers compris. Rien n'est loué, rien n'est retenu.",
      "Sans maintenance, rien ne s'éteint sans prévenir : les fichiers et les accès vous sont remis, l'hébergement et le domaine passent à votre nom, et on vous accompagne pour la bascule.",
    ],
  },
  {
    q: "Que comprennent les 990 €, exactement ?",
    r: [
      "Le modèle choisi dans le catalogue, la réécriture intégrale du contenu en français et à votre métier, vos photos et coordonnées en place, le nom de domaine la première année, la mise en ligne — et le formulaire prêt à brancher : dès qu'un poste Omega tourne chez vous, chaque demande reçue entre dans le circuit devis, relance, avis.",
      "Un besoin hors catalogue — boutique en ligne, espace membre, logiciel particulier — se chiffre sur devis, à l'audit.",
    ],
  },
  {
    q: "Le Chèque TIC, concrètement ?",
    r: [
      "Le dispositif de la Région Guadeloupe finance de 40 à 80 % d'un projet numérique, jusqu'à 10 000 €, pour une entreprise éligible. Il porte sur la création du site — un investissement sur facture — pas sur une mensualité. À 80 %, il reste 198 € à votre charge ; à 40 %, 594 €.",
      "Votre éligibilité est vérifiée pendant l'audit, avant tout engagement, et si un dossier se justifie, nous le montons avec vous.",
    ],
  },
  {
    q: "Pourquoi la maintenance est-elle offerte avec l'abonnement ?",
    r: [
      "Parce qu'un site branché aux moteurs vit avec eux : les demandes qu'il reçoit alimentent la relance, les avis, le point du matin. Entretenir la vitrine fait partie du travail — la facturer à part n'aurait pas de sens. Sans abonnement, elle reste disponible à 19 € par mois, sans engagement.",
    ],
  },
  {
    q: "Et si aucun modèle ne me plaît ?",
    r: [
      "Le catalogue est fait pour être parcouru : chaque modèle est en ligne, en vrai, pas en capture. Si rien n'accroche, décrivez ce que vous voulez — un site sur mesure se chiffre sur devis, à l'audit, comme tout besoin hors catalogue.",
    ],
  },
];

export default function TarifsSitePage() {
  return (
    <PageShell>
      <PageMotion />

      <div className="resa">
        {/* ═══ 1 — titre ═══ */}
        <section data-monde="clair" className="r-wrap pb-2 pt-12 sm:pt-14">
          <h1 data-arrivee="titre" className="r-h1 max-w-[19ch]">
            Votre site, au même prix pour tout le monde
          </h1>
          <p data-arrivee="chapo" className="r-lead mt-6 max-w-[58ch]">
            Vingt et un modèles, tous en ligne, tous visitables. Vous choisissez l&apos;allure, on
            réécrit tout le contenu à votre métier — et dès qu&apos;un poste tourne chez vous, le
            formulaire l&apos;alimente. Le prix est public, comme celui de la grille.
          </p>
        </section>

        {/* ═══ 2 — l'offre : la carte produit, le décompte TIC, la bande
               maintenance. Un produit sous trois angles — pas trois
               formules. ═══ */}
        <section id="offre" data-monde="clair" className="r-blanc">
          <div className="r-wrap py-14 sm:py-16">
            <h2 data-arrivee="bloc" className="r-h2 max-w-[18ch]">Un prix, une aide, une suite</h2>
            <p data-arrivee="bloc" className="r-body mt-4 max-w-[58ch]">
              La création se paie une fois — c&apos;est un investissement, celui que le Chèque TIC
              sait financer. La suite, elle, est comprise&nbsp;: tant qu&apos;un poste Omega tourne
              chez vous, la vitrine est entretenue.
            </p>

            <div className="mt-10 grid gap-4 lg:grid-cols-[1fr_379px] lg:gap-6">
              {/* ——— la carte produit — l'objet partagé qui arrive de
                     /commencer (02/09) ——— */}
              <Partage
                nom="cadre-modeles"
                share="voyage-modeles"
                as="div"
                className="flex flex-col rounded-[20px] border border-[#e3e3e3] bg-white p-7 sm:p-9"
              >
                <div
                  aria-hidden
                  className="h-1 w-16 rounded-full bg-[linear-gradient(90deg,#ea580c,#7c3aed)]"
                />
                <p className="mt-6 text-[11px] font-semibold uppercase tracking-[0.08em] text-[#616161]">
                  Le prix
                </p>
                <h3 className="mt-1.5 font-[family-name:var(--font-jakarta)] text-[28px] font-semibold leading-[36px] tracking-[-0.02em] text-[#050505] sm:text-[32px] sm:leading-[40px]">
                  Le site catalogue
                </h3>
                <div className="mt-4 flex flex-wrap items-baseline gap-x-2.5 gap-y-1">
                  <span className="num rv-prix rv-prix--un text-[44px] font-semibold leading-[52px] sm:text-[48px] sm:leading-[56px]">
                    990&nbsp;€
                  </span>
                  <span className="text-[13px] leading-[18px] text-[#3d3d3d]">
                    une fois — pas d&apos;abonnement
                  </span>
                </div>
                <p className="mt-4 max-w-[48ch] text-[15px] leading-[23px] text-[#050505]">
                  Un des vingt et un modèles du catalogue, réécrit à votre métier, en ligne sous
                  votre nom. Hors catalogue&nbsp;: sur devis, à l&apos;audit.
                </p>

                <ul className="mt-7 space-y-3 border-t border-[#ececec] pt-6">
                  {COMPRIS_SITE.map((t) => (
                    <li
                      key={t}
                      className="flex gap-2.5 text-[14px] leading-[21px] text-[#3d3d3d]"
                    >
                      <span
                        aria-hidden
                        className="mt-[9px] h-1 w-1 shrink-0 rounded-full bg-[#050505]"
                      />
                      {t}
                    </li>
                  ))}
                </ul>

                <div className="mt-8 flex flex-1 flex-col justify-end gap-3 sm:flex-row sm:items-center sm:justify-start sm:gap-6">
                  <Link href="/site/commande" className="r-btn r-btn--noir sm:min-w-[240px]">
                    Commander mon site
                  </Link>
                  <Link href="/modeles" className="r-lien !text-[15px] text-center sm:text-left">
                    Voir les modèles d&apos;abord
                  </Link>
                </div>
              </Partage>

              {/* ——— le décompte Chèque TIC, façon devis ——— */}
              <aside
                data-reveal
                className="flex flex-col rounded-[20px] bg-[linear-gradient(150deg,#fff0f0_0%,#ffdbe4_55%,#f7c7e3_100%)] p-7"
              >
                <div className="flex items-center justify-between gap-3">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[#616161]">
                    L&apos;aide
                  </p>
                  <span className="r-badge">Si vous êtes éligible</span>
                </div>
                <h3 className="mt-1.5 font-[family-name:var(--font-jakarta)] text-[22px] font-semibold leading-[29px] tracking-[-0.02em] text-[#050505]">
                  Le Chèque TIC
                </h3>
                <p className="mt-3 text-[14px] leading-[21px] text-[#050505]">
                  La Région Guadeloupe finance de 40 à 80&nbsp;% d&apos;un projet numérique, jusqu&apos;à
                  10&nbsp;000&nbsp;€. Sur un site catalogue, le compte est vite fait&nbsp;:
                </p>

                <dl className="mt-5 rounded-[12px] bg-white/75 px-5 py-2">
                  <div className="flex items-baseline justify-between gap-4 py-2.5 text-[14px] leading-[20px] text-[#050505]">
                    <dt>Site catalogue</dt>
                    <dd className="num shrink-0">990&nbsp;€</dd>
                  </div>
                  <div className="flex items-baseline justify-between gap-4 border-t border-[#05050514] py-2.5 text-[14px] leading-[20px] text-[#050505]">
                    <dt>Chèque TIC à 80&nbsp;%</dt>
                    <dd className="num shrink-0">−&nbsp;792&nbsp;€</dd>
                  </div>
                  <div className="flex items-baseline justify-between gap-4 border-t border-[#050505] py-3">
                    <dt className="text-[14px] font-semibold leading-[20px] text-[#050505]">
                      Restant à votre charge
                    </dt>
                    <dd className="num rv-prix rv-prix--trois shrink-0 text-[24px] font-semibold leading-[30px]">
                      198&nbsp;€
                    </dd>
                  </div>
                </dl>

                <p className="mt-3 text-[12.5px] leading-[18px] text-[#3d3d3d]">
                  À 40&nbsp;%, il reste 594&nbsp;€. Éligibilité vérifiée pendant l&apos;audit, avant
                  tout engagement — et si un dossier se justifie, on le monte avec vous.
                </p>

                <div className="mt-6 flex flex-1 flex-col justify-end">
                  <Link href="/reserver-un-audit" className="r-btn r-btn--fil w-full">
                    Vérifier mon éligibilité
                  </Link>
                </div>
              </aside>
            </div>

            {/* ——— la bande maintenance : une suite, pas une formule ——— */}
            <div
              data-reveal
              className="mt-4 flex flex-col gap-6 rounded-[20px] bg-[linear-gradient(135deg,#f4efff_0%,#e6dbfb_60%,#d9c8f7_100%)] p-7 lg:mt-6 lg:flex-row lg:items-center lg:justify-between lg:gap-10"
            >
              <div className="max-w-[62ch]">
                <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[#616161]">
                  La suite
                </p>
                <h3 className="mt-1.5 font-[family-name:var(--font-jakarta)] text-[22px] font-semibold leading-[29px] tracking-[-0.02em] text-[#050505]">
                  La maintenance&nbsp;?{" "}
                  <span className="num rv-prix rv-prix--complet">Offerte</span> avec un abonnement
                  actif
                </h3>
                <p className="mt-2.5 text-[14px] leading-[21px] text-[#050505]">
                  Modifications courantes, hébergement, domaine renouvelé, sauvegardes — tant
                  qu&apos;un poste tourne chez vous. Sans abonnement&nbsp;: 19&nbsp;€/mois, sans
                  engagement. Et le site vous appartient, quoi qu&apos;il arrive.
                </p>
              </div>
              <Link href="/tarifs" className="r-btn r-btn--noir shrink-0">
                Voir les postes
              </Link>
            </div>

            <p className="r-note mt-6 max-w-3xl">
              Prix TTC, offre en vigueur au 01/09/2026. Le devis remis à l&apos;audit reprend ce
              prix tel quel pour un site catalogue — il n&apos;existe pas de version plus chère de
              la même chose. Un besoin hors catalogue se chiffre à part, avant tout engagement.
            </p>
          </div>
        </section>

        {/* ═══ 3 — bande sombre : le site branché aux moteurs ═══ */}
        <section id="boucle" className="r-nuit">
          <div className="r-wrap py-14 sm:py-16">
            <div className="flex flex-col gap-8 lg:flex-row lg:items-end lg:justify-between">
              <div className="max-w-[60ch]">
                <p className="r-note !text-[#a1a1aa]">Ce que les autres vitrines n&apos;ont pas</p>
                <h2 className="r-h3 mt-4">Un site branché, pas une vitrine qui dort</h2>
                <p className="mt-5 text-[15px] leading-[24px] text-[#d4d4d8]">
                  Un site qui reçoit trois demandes par semaine et n&apos;en transforme aucune coûte
                  plus cher qu&apos;il ne rapporte. Ici, chaque demande entre dans le circuit&nbsp;:
                  accusé de réception en deux minutes, sous votre signature, devis relancé à J+3 et
                  J+7, facture suivie, avis demandé. La vitrine nourrit les postes — c&apos;est pour
                  ça qu&apos;elle est entretenue avec eux.
                </p>
              </div>
              <Link href="/modeles" className="r-btn r-btn--blanc shrink-0">
                Parcourir les 21 modèles
              </Link>
            </div>
          </div>
        </section>

        {/* ═══ 4 — la FAQ site ═══ */}
        <section data-monde="clair" className="r-blanc">
          <div className="r-wrap py-14 sm:py-16">
            <div className="grid gap-8 lg:grid-cols-[379px_1fr] lg:gap-16">
              <h2 className="r-h3 lg:sticky lg:top-28 lg:self-start">Questions sur le site</h2>
              <div>
                {FAQ_SITE.map((f) => (
                  <details key={f.q} className="r-faq">
                    <summary>
                      {f.q}
                      <svg
                        aria-hidden
                        className="r-faq-croix"
                        width="18"
                        height="18"
                        viewBox="0 0 18 18"
                        fill="none"
                      >
                        <path
                          d="M9 1v16M1 9h16"
                          stroke="currentColor"
                          strokeWidth="1.5"
                          strokeLinecap="round"
                        />
                      </svg>
                    </summary>
                    <div className="pb-7 pr-8">
                      {f.r.map((par, i) => (
                        <p
                          key={i}
                          className={`text-[15px] leading-[26px] text-[#3d3d3d] ${i > 0 ? "mt-4" : ""}`}
                        >
                          {par}
                        </p>
                      ))}
                    </div>
                  </details>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* ═══ 5 — la mention discrète de l'autre porte ═══ */}
        <section data-monde="clair" className="r-wrap py-9">
          <p className="r-note mx-auto max-w-xl text-center !text-[13px]">
            Plusieurs services se partagent le travail chez vous&nbsp;? Votre site s&apos;inscrit
            dans un ensemble qui se mesure d&apos;abord&nbsp;: votre prix sort d&apos;un audit.{" "}
            <Link
              href="/reserver-un-audit"
              className="underline underline-offset-4 hover:text-[#050505]"
            >
              Réserver un échange
            </Link>
          </p>
        </section>
      </div>
    </PageShell>
  );
}
