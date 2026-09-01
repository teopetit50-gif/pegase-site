import type { Metadata } from "next";
import Link from "next/link";
import PageShell from "@/components/PageShell";
import PageMotion from "@/components/PageMotion";

/* ══════════════════════════════════════════════════════════════════════
   /tarifs/site — l'offre site à prix public (01/09/2026)

   Jusqu'ici le site se vendait uniquement sur devis, à l'audit. Décision
   Teo du 01/09 : prix public, comme la grille des postes — 990 € le site
   catalogue, présenté avec son reste à charge Chèque TIC (198 € si 80 %
   financés), et la maintenance OFFERTE tant qu'un abonnement Omega est
   actif (19 €/mois sinon). Le site n'est pas un produit isolé : c'est la
   porte d'entrée de la grille — d'où le « + » posé à droite des paliers
   sur /tarifs, qui mène ici.

   Même monde .resa que /tarifs, mêmes cartes, même dégradé orange →
   violet : une page de prix dans le langage des pages de prix. Les têtes
   de carte reprennent les teintes rv-palier--un/trois/complet ; ici pas
   de sélection, les cartes sont statiques (Server Component, aucun état).

   /modeles reste la galerie et continue de ne PAS vendre : ses CTA ne
   changent pas. Cette page-ci assume le prix ; l'achat, lui, passe
   toujours par l'audit gratuit (le devis site sort de là, Chèque TIC
   vérifié séance tenante) — règle « qui valide » inchangée : les
   organisations restent sur devis sans montant.
   ══════════════════════════════════════════════════════════════════════ */

export const metadata: Metadata = {
  title: "Votre site, à prix public | Omega.AI",
  description:
    "Le site catalogue : 990 € une fois, pas d'abonnement — souvent 198 € restant à charge avec le Chèque TIC. Maintenance offerte tant qu'un poste Omega tourne chez vous. Vingt et un modèles, tous en ligne, contenu réécrit à votre métier.",
};

type CarteSite = {
  id: "un" | "trois" | "complet";
  nom: string;
  prix: string;
  sousPrix: string;
  phare?: boolean;
  badge?: string;
  promesse: string;
  points: string[];
  cta: { href: string; label: string; noir?: boolean };
};

const CARTES: CarteSite[] = [
  {
    id: "un",
    nom: "Le site catalogue",
    prix: "990 €",
    sousPrix: "une fois — pas d'abonnement",
    promesse: "Un des vingt et un modèles du catalogue, réécrit à votre métier, en ligne.",
    points: [
      "Un modèle au choix — les vingt et un sont en ligne, tous visitables",
      "Contenu intégralement réécrit en français, à votre métier",
      "Nom de domaine la première année, mise en ligne comprise",
      "Formulaire branché aux moteurs — devis, relance, avis",
    ],
    cta: { href: "/modeles", label: "Choisir votre modèle" },
  },
  {
    id: "trois",
    nom: "Avec le Chèque TIC",
    prix: "198 €",
    sousPrix: "restant à charge, si 80 % financés",
    phare: true,
    badge: "Si vous êtes éligible",
    promesse: "La Région Guadeloupe finance de 40 à 80 % du projet — on monte le dossier avec vous.",
    points: [
      "De 40 à 80 % du projet financés, jusqu'à 10 000 €",
      "Éligibilité vérifiée pendant l'audit, avant tout engagement",
      "Dossier monté avec vous, devis fournis",
      "Le même site, les mêmes livrables — seul le reste à charge change",
    ],
    cta: { href: "/commencer", label: "Vérifier mon éligibilité", noir: true },
  },
  {
    id: "complet",
    nom: "La maintenance",
    prix: "0 €",
    sousPrix: "avec un abonnement Omega actif",
    promesse: "Tant qu'un poste tourne chez vous, la vitrine est entretenue — modifications comprises.",
    points: [
      "Modifications courantes comprises — textes, photos, horaires",
      "Hébergement, domaine renouvelé, sauvegardes",
      "Sans abonnement : 19 €/mois, sans engagement",
      "Le site vous appartient — il part avec vous, quoi qu'il arrive",
    ],
    cta: { href: "/tarifs", label: "Voir les postes" },
  },
];

/* ——— la FAQ site — les questions qu'un prix affiché doit prendre de
   front, mêmes replis .r-faq que /tarifs et la page audit. ——— */
const FAQ_SITE: { q: string; r: string[] }[] = [
  {
    q: "À qui appartient le site ?",
    r: [
      "À vous, dès le premier jour. Le nom de domaine est au vôtre, les accès vous sont remis, et si nous nous quittons, le site part avec vous — fichiers compris. Rien n'est loué, rien n'est retenu.",
    ],
  },
  {
    q: "Que comprennent les 990 €, exactement ?",
    r: [
      "Le modèle choisi dans le catalogue, la réécriture intégrale du contenu en français et à votre métier, vos photos et coordonnées en place, le nom de domaine la première année, la mise en ligne, et le branchement du formulaire aux moteurs — chaque demande reçue entre dans le circuit devis, relance, avis.",
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
          <h1 className="r-h1 max-w-[19ch]">Votre site, au même prix pour tout le monde</h1>
          <p className="r-lead mt-6 max-w-[58ch]">
            Vingt et un modèles, tous en ligne, tous visitables. Vous choisissez l&apos;allure, on
            réécrit tout le contenu à votre métier — et le formulaire alimente vos postes dès le
            premier jour. Le prix est public, comme celui de la grille.
          </p>
        </section>

        {/* ═══ 2 — les trois cartes : création, Chèque TIC, maintenance ═══ */}
        <section id="offre" data-monde="clair" className="r-blanc">
          <div className="r-wrap py-14 sm:py-16">
            <h2 className="r-h2 max-w-[18ch]">Un prix, une aide, une suite</h2>
            <p className="r-body mt-4 max-w-[58ch]">
              La création se paie une fois — c&apos;est un investissement, celui que le Chèque TIC
              sait financer. La suite, elle, est comprise&nbsp;: tant qu&apos;un poste Omega tourne
              chez vous, la vitrine est entretenue.
            </p>

            <div className="mt-10 grid gap-4 lg:grid-cols-3">
              {CARTES.map((c) => (
                <div
                  key={c.id}
                  className={`r-carte rv-palier--${c.id} ${c.phare ? "r-carte--phare" : ""}`}
                >
                  <div className="r-carte-tete !min-h-0">
                    <div className="flex items-start justify-between gap-3">
                      <h3 className="font-[family-name:var(--font-jakarta)] text-[26px] font-semibold leading-[34px] tracking-[-0.02em] text-[#050505] sm:text-[28px] sm:leading-[36px]">
                        {c.nom}
                      </h3>
                      {c.badge ? <span className="r-badge mt-1.5">{c.badge}</span> : null}
                    </div>

                    <div className="mt-3 flex flex-wrap items-baseline gap-x-2 gap-y-1">
                      <span
                        className={`num rv-prix rv-prix--${c.id} text-[36px] font-semibold leading-[44px] sm:text-[40px] sm:leading-[48px]`}
                      >
                        {c.prix}
                      </span>
                      <span className="text-[12px] leading-[18px] text-[#050505]">{c.sousPrix}</span>
                    </div>

                    <p className="mt-4 text-[15px] leading-[22px] text-[#050505]">{c.promesse}</p>
                  </div>

                  <div className="flex flex-1 flex-col px-3 pt-4">
                    <ul className="space-y-3">
                      {c.points.map((t) => (
                        <li
                          key={t}
                          className="flex gap-2 text-[13.5px] leading-[20px] text-[#3d3d3d]"
                        >
                          <span
                            aria-hidden
                            className="mt-[8px] h-1 w-1 shrink-0 rounded-full bg-[#050505]"
                          />
                          {t}
                        </li>
                      ))}
                    </ul>

                    <div className="mt-6 flex flex-1 flex-col justify-end">
                      <Link
                        href={c.cta.href}
                        className={`r-btn w-full ${c.cta.noir ? "r-btn--noir" : "r-btn--fil"}`}
                      >
                        {c.cta.label}
                      </Link>
                    </div>
                  </div>
                </div>
              ))}
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
                  rappel dans les deux minutes, devis relancé à J+3 et J+7, facture suivie, avis
                  demandé. La vitrine nourrit les postes — c&apos;est pour ça qu&apos;elle est
                  entretenue avec eux.
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
