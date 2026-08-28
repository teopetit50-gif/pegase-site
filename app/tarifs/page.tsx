import type { Metadata } from "next";
import Link from "next/link";
import PageShell from "@/components/PageShell";
import PageMotion from "@/components/PageMotion";
import Grille from "@/components/tarifs/Grille";
import { COMPRIS, PORTES } from "@/lib/paliers";

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
    "Un poste 59 €, trois postes 85 €, tout Omega 105 € par mois — sans engagement, installation comprise, satisfait ou remboursé 30 jours. Et pour les structures où plusieurs services valident : un audit d'abord, un devis ensuite.",
};

/* Ce qu'on ne facture jamais — resserré depuis la v3 (six cartes), qui le
   tenait de /commercial/facturer-omega.md. Quatre survivent : les deux
   retirées (« pas de surcoût si le mois s'emballe », « devis en une
   page ») redisaient le sans-engagement et la réunion d'installation. */
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
        {/* ═══ 1 — titre + les deux portes ═══ */}
        <section data-monde="clair" className="r-wrap pb-10 pt-12 sm:pb-12 sm:pt-14">
          <h1 className="r-h1 max-w-[17ch]">Des prix publics, une installation comprise</h1>
          <p className="r-lead mt-6 max-w-[58ch]">
            {PORTES.critere} Une personne qui tient ses outils choisit ses postes ci-dessous et
            réserve son installation en ligne. Une structure où plusieurs services valident passe
            d&apos;abord par l&apos;audit — son prix sort de ses volumes, pas d&apos;une grille.
          </p>

          <div className="mt-10 grid gap-4 md:grid-cols-2">
            <a
              href="#grille"
              className="group flex h-full flex-col rounded-2xl bg-white p-7 transition-shadow hover:shadow-[0_2px_16px_rgba(5,5,5,0.08)] sm:p-8"
            >
              <div className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[#616161]">
                Porte 1 · la grille
              </div>
              <h2 className="r-h4 mt-3">{PORTES.solo.titre}</h2>
              <p className="mt-3 flex-1 text-[15px] leading-[23px] text-[#3d3d3d]">
                {PORTES.solo.texte}
              </p>
              <span className="r-lien mt-5 self-start">Voir la grille ↓</span>
            </a>

            <Link
              href="/reserver-un-audit"
              className="group flex h-full flex-col rounded-2xl bg-[#050505] p-7 transition-opacity hover:opacity-[0.94] sm:p-8"
            >
              <div className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[#a1a1aa]">
                Porte 2 · l&apos;audit
              </div>
              <h2 className="r-h4 mt-3 !text-white">{PORTES.equipe.titre}</h2>
              <p className="mt-3 flex-1 text-[15px] leading-[23px] text-[#d4d4d8]">
                {PORTES.equipe.texte}
              </p>
              <span className="mt-5 self-start text-[16px] font-medium leading-[24px] text-white underline decoration-[rgba(255,255,255,0.35)] underline-offset-4 group-hover:decoration-white">
                Réserver un audit →
              </span>
            </Link>
          </div>
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

            <div className="mt-10">
              <Grille />
            </div>

            <p className="r-note mt-6 max-w-3xl">
              Prix TTC, grille en vigueur au 28/08/2026 — le prix affiché au moment de votre demande
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
        <section className="r-nuit">
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
              <Link href="/installation" className="r-btn r-btn--blanc shrink-0">
                Réserver l&apos;installation
              </Link>
            </div>
          </div>
        </section>
      </div>
    </PageShell>
  );
}
