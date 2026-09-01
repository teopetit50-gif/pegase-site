import type { Metadata } from "next";
import Link from "next/link";
import PageShell from "@/components/PageShell";
import PageMotion from "@/components/PageMotion";
import Grille from "@/components/tarifs/Grille";
import { COMPRIS } from "@/lib/paliers";

/* ══════════════════════════════════════════════════════════════════════
   /tarifs — v4 « La grille publique » (28/08/2026)

   REMPLACE ENTIÈREMENT la v3 « Comment nous chiffrons » (clone
   scale.com/careers, aucun montant affiché). Décision Teo des 27-28/08,
   modèle commercial arrêté : pour ceux qui tiennent leurs outils —
   indépendants, TPE, PME — les prix sont PUBLICS, l'achat est direct, et
   la conversion est la réservation de la réunion d'installation
   (/installation). L'ancienne règle « aucun montant » ne survit que pour
   les structures où plusieurs services valident : leur porte est l'audit
   (/reserver-un-audit), sans prix affiché — le devis sort des volumes.

   La séparation ne se fait PAS par la taille (« grande entreprise ») mais
   par QUI VALIDE — le vrai déterminant du coût d'installation. Les deux
   portes sont posées en haut de page, avant la grille.

   Le design quitte le monde .tf (scale.com) pour le monde .resa de
   /reserver-un-audit — le clone de la page pricing de Qonto, construit
   précisément pour vendre des paliers. Une page de prix dans le langage
   d'une page de prix. La v3 (lib/tarifs.ts, bloc .tf) part avec ce
   commit ; ses photos restent dans public/photos pour un autre usage.

   PAIEMENT : rien en ligne aujourd'hui (pas encore de compte pro). La
   couture est prévue dans components/tarifs/Grille.tsx — une étape
   s'insérera entre le choix des postes et la réunion, sans refonte.
   ══════════════════════════════════════════════════════════════════════ */

export const metadata: Metadata = {
  title: "Tarifs | Omega.AI",
  description:
    "Un poste 59 €, trois postes 89 €, tout Omega 119 € par mois — sans engagement, installation comprise, satisfait ou remboursé 30 jours. Et pour les structures où plusieurs services valident : un audit d'abord, un devis ensuite.",
};

/* Ce qu'on ne facture jamais — resserré depuis la v3 (six cartes), qui le
   tenait de /commercial/facturer-omega.md. Quatre survivent : les deux
   retirées (« pas de surcoût si le mois s'emballe », « devis en une
   page ») redisaient le sans-engagement et la réunion d'installation. */
/* ——— la FAQ tarifs — les questions qu'une page de prix doit prendre de
   front, mêmes règles éditoriales que la FAQ de la page audit. ——— */
const FAQ_TARIFS: { q: string; r: string[] }[] = [
  {
    q: "Puis-je changer de palier ensuite ?",
    r: [
      "Oui, à tout moment et sans frais de changement : le prix suit simplement le nombre de postes en service. On ajoute un poste quand les chiffres du premier le justifient — c'est même le chemin qu'on recommande.",
    ],
  },
  {
    q: "Comment se passe le paiement ?",
    r: [
      "Rien ne se paie en ligne. Tout se règle à la réunion d'installation, et l'abonnement ne démarre qu'une fois le système en route chez vous. L'abonnement est mensuel, sans engagement : vous prévenez, le mois en cours va à son terme, les envois s'arrêtent.",
    ],
  },
  {
    q: "Qu'est-ce que le prix comprend, exactement ?",
    r: [
      "Le fonctionnement des postes choisis, le point du matin, les verrous de validation, vos corrections et le suivi. La réunion d'installation est comprise : on branche vos outils ensemble, en visio, écran partagé.",
      "Un raccordement particulier — un logiciel rare, un historique à reprendre — est chiffré avant tout engagement, jamais découvert en cours de route.",
    ],
  },
  {
    q: "Et si ça ne me convient pas ?",
    r: [
      "Trente jours pour être remboursé, sans justification à fournir. Au-delà, l'abonnement reste mensuel et résiliable à tout moment — et vos données repartent avec vous, export complet compris.",
    ],
  },
  {
    q: "Le Chèque TIC s'applique-t-il ici ?",
    r: [
      "Le dispositif de la Région Guadeloupe finance de 40 à 80 % d'un projet numérique, jusqu'à 10 000 €, pour une entreprise éligible. Il porte sur l'installation, pas sur l'abonnement. Votre éligibilité est vérifiée à la réunion d'installation, et si un dossier se justifie, nous le montons avec vous.",
    ],
  },
  {
    q: "Plusieurs services se partagent le travail chez nous — cette grille nous concerne ?",
    r: [
      "Probablement pas : quand plusieurs personnes valident, chacune sur son poste, un prix affiché serait un mensonge. Votre porte est l'audit — on mesure vos volumes, et le devis en sort. Il est gratuit dans ses deux premiers formats.",
    ],
  },
];

const JAMAIS: { titre: string; texte: string }[] = [
  {
    titre: "Pas de prix par personne",
    texte:
      "Le prix ne dépend pas du nombre de gens qui s'en servent chez vous. Embaucher ne coûte rien de plus.",
  },
  {
    titre: "Aucune commission au résultat",
    texte:
      "Pas de pourcentage sur les sommes encaissées. Nous avons intérêt à relancer juste, pas à relancer fort.",
  },
  {
    titre: "Aucun engagement de durée",
    texte:
      "L'abonnement est mensuel. Vous prévenez, le mois va à son terme, les envois s'arrêtent. Rien n'est payé d'avance.",
  },
  {
    titre: "Vos données repartent avec vous",
    texte:
      "L'export complet vous est remis à la sortie, sans condition et sans frais. Ce qui est à vous reste à vous.",
  },
];

export default function TarifsPage() {
  return (
    <PageShell>
      <PageMotion />

      <div className="resa">
        {/* ═══ 1 — titre court : l'aiguillage vit sur /commencer (28/08),
               cette page ne parle plus qu'aux indépendants et TPE-PME.
               La porte « organisations » n'existe plus qu'en mention
               discrète, tout en bas. ═══ */}
        <section data-monde="clair" className="r-wrap pb-2 pt-12 sm:pt-14">
          <h1 className="r-h1 max-w-[17ch]">Des prix publics, une installation comprise</h1>
          <p className="r-lead mt-6 max-w-[58ch]">
            Pour les indépendants, TPE et PME&nbsp;: vous choisissez vos postes, vous réservez la
            réunion d&apos;installation, et le système démarre sous votre œil. Sans engagement,
            satisfait ou remboursé trente jours.
          </p>
        </section>

        {/* ═══ 2 — la grille ═══ */}
        <section id="grille" data-monde="clair" className="r-blanc">
          <div className="r-wrap py-14 sm:py-16">
            <h2 className="r-h2 max-w-[18ch]">Choisissez vos postes</h2>
            <p className="r-body mt-4 max-w-[58ch]">
              Quatre postes s&apos;installent sur les outils que vous avez déjà — mail, tableur,
              WhatsApp. Quel que soit le palier,{" "}
              <Link href={`/offres/${COMPRIS[0].slug}`} className="r-lien !text-[15px]">
                {COMPRIS[0].system} · {COMPRIS[0].nom.toLowerCase()}
              </Link>{" "}
              et{" "}
              <Link href={`/offres/${COMPRIS[1].slug}`} className="r-lien !text-[15px]">
                {COMPRIS[1].system} · {COMPRIS[1].nom.toLowerCase()}
              </Link>{" "}
              tournent d&apos;office : savoir où vous en êtes et la certitude que rien ne part sans
              vous ne sont pas des options.
            </p>

            {/* 01/09 (Teo) — le « + » à droite de la grille : la vitrine
                qui va avec les postes, à prix public elle aussi, vit sur
                /tarifs/site. v3 le même jour (second croquis Teo, « la
                colonne ne rend pas bien ») : l'épure — une carte haute au
                lavis du dégradé de la page site, un grand + centré, deux
                lignes en bas. Rien d'autre : le résumé encombrait. Tout
                le bloc est UN lien ; en dessous de 1360px il redevient le
                bandeau compact sous la grille. Pas d'aria-label : le nom
                accessible est le texte visible (WCAG 2.5.3). */}
            <div className="mt-10 flex flex-col gap-4 min-[1360px]:flex-row min-[1360px]:items-stretch min-[1360px]:gap-6">
              <div className="min-w-0 flex-1">
                <Grille />
              </div>
              <Link href="/tarifs/site" className="rv-plus">
                <span className="rv-plus-signe" aria-hidden>
                  +
                </span>
                <span className="rv-plus-texte">
                  Le site qui va avec
                  <span className="rv-plus-sous">Vitrine à prix public</span>
                </span>
              </Link>
            </div>

            <p className="r-note mt-6 max-w-3xl">
              Prix TTC, grille en vigueur au 01/09/2026 — le prix affiché au moment de votre demande
              est celui qui vous est confirmé à l&apos;installation. L&apos;installation elle-même
              (mise en route sur vos outils, rodage sous votre œil) est comprise dans la réunion
              pour les quatre postes standard&nbsp;; un raccordement particulier est chiffré avant
              tout engagement.
            </p>
          </div>
        </section>

        {/* ═══ 3 — ce qu'on ne facture jamais ═══ */}
        <section data-monde="clair" className="r-wrap py-14 sm:py-16">
          <h2 className="r-h3 max-w-[22ch]">Ce que nous ne facturons jamais</h2>
          <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {JAMAIS.map((j) => (
              <div key={j.titre} data-reveal className="rounded-2xl bg-white p-6">
                <h3 className="text-[15px] font-semibold leading-[21px] text-[#050505]">
                  {j.titre}
                </h3>
                <p className="mt-2.5 text-[13.5px] leading-[20px] text-[#3d3d3d]">{j.texte}</p>
              </div>
            ))}
          </div>
        </section>

        {/* ═══ 4 — Chèque TIC, sur bande sombre ═══ */}
        <section id="cheque-tic" className="r-nuit">
          <div className="r-wrap py-14 sm:py-16">
            <div className="flex flex-col gap-8 lg:flex-row lg:items-end lg:justify-between">
              <div className="max-w-[60ch]">
                <p className="r-note !text-[#a1a1aa]">Chèque TIC — Région Guadeloupe</p>
                <h2 className="r-h3 mt-4">De 40 à 80 % d&apos;un projet numérique financés</h2>
                <p className="mt-5 text-[15px] leading-[24px] text-[#d4d4d8]">
                  La Région Guadeloupe finance de 40 à 80&nbsp;% d&apos;un projet de transformation
                  numérique, dans la limite de 10&nbsp;000&nbsp;€, pour une entreprise éligible.
                  Votre éligibilité est vérifiée à la réunion d&apos;installation — et si un dossier
                  se justifie, nous le montons avec vous.
                </p>
              </div>
              <a href="#grille" className="r-btn r-btn--blanc shrink-0">
                Choisir mes postes
              </a>
            </div>
          </div>
        </section>

        {/* ═══ 4bis — la FAQ tarifs (28/08, 2ᵉ passe) — mêmes replis .r-faq
               que la page audit ═══ */}
        <section data-monde="clair" className="r-blanc">
          <div className="r-wrap py-14 sm:py-16">
            <div className="grid gap-8 lg:grid-cols-[379px_1fr] lg:gap-16">
              <h2 className="r-h3 lg:sticky lg:top-28 lg:self-start">
                Questions sur les prix
              </h2>
              <div>
                {FAQ_TARIFS.map((f) => (
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

        {/* ═══ 5 — la mention discrète de l'autre porte (28/08) : pour qui
               s'est trompé d'aiguillage, sans re-poser deux portes ici. ═══ */}
        <section data-monde="clair" className="r-wrap py-9">
          <p className="r-note mx-auto max-w-xl text-center !text-[13px]">
            Plusieurs services se partagent le travail chez vous&nbsp;? Cette grille n&apos;est pas
            votre porte&nbsp;: votre prix sort d&apos;un audit.{" "}
            <Link href="/reserver-un-audit" className="underline underline-offset-4 hover:text-[#050505]">
              Réserver un échange
            </Link>
          </p>
        </section>
      </div>
    </PageShell>
  );
}
