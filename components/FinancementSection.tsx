import Link from "next/link";
import Reveal from "./Reveal";

/* Chiffres confirmés 01/08/2026 (fiche Infogreffe màj 23/06/2026) : 40-80 % selon poste, 10 000€/an,
   3 devis */

/* Section « Chèque TIC » — v4 ÉDITORIALE (22/07). Composant AUTONOME : il
   porte son monde clair, ses marges et son CTA ; le déplacer = déplacer la
   seule ligne <FinancementSection /> dans une page.

   v4 : le reçu chiffré (exemple 5 000 → 1 000 €, barre de répartition,
   liste des 3 conditions) est RETIRÉ à la demande de Teo. Il ne reste que
   l'explication du dispositif, en prose développée — chapô + trois volets +
   calendrier — reprise de l'article cheque-tic-financement, rien d'inventé.
   Les faits que portait la carte survivent dans le texte : le plafond de
   10 000 €/an est dans le chapô, les 3 devis dans « Comment le dossier se
   monte », l'éligibilité guadeloupéenne dans « Qui peut en bénéficier ».

   Plus aucune animation propre ici : les blocs arrivent par Reveal comme le
   reste du site. */

/* Les trois volets du dispositif — prose développée, source : article
   cheque-tic-financement (lib/content.ts). */
const VOLETS: { titre: string; texte: string }[] = [
  {
    titre: "Qui peut en bénéficier",
    texte:
      "Le dispositif s'adresse aux très petites entreprises immatriculées en Guadeloupe, à jour de leurs obligations sociales et fiscales. Les critères précis (effectif, chiffre d'affaires, secteurs prioritaires, plafonds), sont fixés par la Région et évoluent selon les enveloppes votées. Votre éligibilité est vérifiée dès l'audit, avant tout engagement de votre part, jamais après.",
  },
  {
    titre: "Ce que la subvention couvre",
    texte:
      "La subvention porte sur les dépenses du projet numérique lui-même : l'installation du moteur, son raccordement à vos outils existants, l'accompagnement à la prise en main. Sur une installation devisée, la part restant à votre charge est ramenée à une fraction du montant total : ce qui modifie entièrement le calcul de retour sur investissement d'un moteur de relance ou d'un réceptionniste automatique.",
  },
  {
    titre: "Comment le dossier se monte",
    texte:
      "Un dossier de subvention réclame des pièces administratives, trois devis, une description technique du projet et de son impact attendu. C'est précisément le travail que la plupart des dirigeants repoussent, et c'est pour cette raison que nous le prenons en charge : rédaction du dossier, mise au format attendu par la Région, suivi de l'instruction jusqu'à la décision.",
  },
];

export default function FinancementSection() {
  return (
    <section id="financement" data-monde="clair" className="monde-clair">
      <div className="px-6 py-16 sm:px-10 sm:py-24">
        {/* ——— en-tête ——— */}
        <Reveal>
          <div className="flex items-center gap-2.5 font-mono text-[12px] uppercase tracking-[0.18em] text-black/50">
            <span aria-hidden className="h-1.5 w-1.5 rounded-[2px] bg-gold" />
            Financement
          </div>
        </Reveal>
        <Reveal delay={90}>
          <h2 className="mt-5 max-w-3xl text-[28px] font-bold leading-[1.08] tracking-[-0.025em] text-[#0f1013] sm:text-[44px]">
            Jusqu&apos;à 10 000 € de votre installation, financés par la Région.
          </h2>
        </Reveal>
        <Reveal delay={180}>
          <p className="mt-6 max-w-2xl text-[16px] leading-relaxed text-[#52555c] sm:text-[18px]">
            Le Chèque TIC est le dispositif par lequel la Région Guadeloupe
            soutient la transformation numérique des petites entreprises. Il
            finance de 40 à 80 % du coût d&apos;un projet numérique selon le
            poste, dans la limite de 10 000 € par an. Un projet
            d&apos;automatisation Omega.AI : installation d&apos;un moteur,
            raccordement à vos outils, formation : entre précisément dans le
            champ de ce dispositif.
          </p>
        </Reveal>

        {/* ——— les trois volets, en prose ——— */}
        <div className="mt-14 max-w-3xl">
          {VOLETS.map((v, i) => (
            <Reveal key={v.titre} delay={i * 90}>
              <div
                className={`border-t py-8 ${
                  i === 0 ? "border-black/[0.14]" : "border-black/[0.08]"
                }`}
              >
                <h3 className="text-[19px] font-bold leading-snug tracking-[-0.02em] text-[#0f1013] sm:text-[22px]">
                  {v.titre}
                </h3>
                <p className="mt-3 text-[15px] leading-[1.8] text-[#52555c] sm:text-[16px]">
                  {v.texte}
                </p>
              </div>
            </Reveal>
          ))}
          <Reveal delay={270}>
            <div className="border-t border-black/[0.08] py-8">
              <p className="text-[15px] leading-[1.8] text-[#52555c] sm:text-[16px]">
                Le calendrier joue son rôle : les enveloppes régionales sont
                votées puis consommées, et les dossiers déposés tôt dans
                l&apos;exercice sont instruits plus vite. Si votre entreprise
                est éligible, chaque mois d&apos;attente est un mois de
                subvention potentiellement perdue, et un mois de problème non
                traité.
              </p>
            </div>
          </Reveal>
        </div>
      </div>

      {/* ——— clôture pleine largeur ——— */}
      <div className="px-6 pb-16 sm:px-10 sm:pb-24">
        <Reveal>
          <div className="flex flex-col gap-6 border-t border-black/[0.08] pt-10 sm:flex-row sm:items-center sm:justify-between">
            <p className="max-w-xl text-[16px] leading-relaxed text-[#0f1013] sm:text-[17px]">
              Un audit gratuit détermine votre éligibilité et le montant
              finançable.
            </p>
            <Link
              href="/tarifs"
              className="shrink-0 self-start rounded-[var(--radius-btn)] bg-black px-7 py-3.5 text-[16px] font-semibold text-[#f4f1ec] transition hover:bg-black/85 active:scale-[0.97] shadow-[0_0_46px_-2px_rgba(15,16,19,0.55),0_14px_30px_-8px_rgba(15,16,19,0.42)] sm:self-auto"
            >
              Commencer
            </Link>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
