import type { Metadata } from "next";
import Link from "next/link";
import PageShell from "@/components/PageShell";
import PageMotion from "@/components/PageMotion";
import Formules from "@/components/reservation/Formules";
import Simulateur from "@/components/reservation/Simulateur";
import {
  CANAL_LABEL_PHRASE,
  CANAL_VALEUR,
  COMPLEMENTS,
  FAQ,
  lienContact,
  lienReservation,
} from "@/lib/reservation";

/* ══════════════════════════════════════════════════════════════════════
   /reserver-un-audit — « Réserver un audit » (26/07/2026)

   Quatrième page de référence demandée par Teo : la page tarifs de Qonto
   (qonto.com/en/pricing, profil « solo », facturation annuelle). Mêmes
   sections dans le même ordre, mêmes proportions, même typographie —
   relevé au computed style sur viewport 1280, tokens dans le bloc `.resa`
   de globals.css.

   Ce qui change : le SUJET. On ne compare pas des abonnements, on fait
   choisir un format d'audit et réserver un créneau. Textes, formats et
   chiffres sont ceux de Omega.

   Deux emplacements de la référence n'ont PAS d'équivalent honnête ici et
   ont été remplacés plutôt que meublés (règle refs-qonto/NOTES-DESIGN.md,
   « aucun chiffre de preuve sociale inventé, aucun avis client ») :
     · la colonne « Loved & trusted by +600,000 businesses » + note
       Trustpilot → les deux faits qui décident vraiment (c'est gratuit,
       c'est finançable par le Chèque TIC) ;
     · le carrousel de témoignages clients → les engagements du protocole
       d'audit, cités tels qu'ils sont tenus.

   Le chrome reste celui du site : header caméléon (les sections claires
   portent data-monde="clair") et footer sombre hérités de PageShell.
   ══════════════════════════════════════════════════════════════════════ */

export const metadata: Metadata = {
  title: "Réserver un audit — Omega",
  description:
    "Trois formats d'audit pour mesurer ce que votre difficulté principale vous coûte : impayés, demandes perdues, heures de saisie. Gratuit à partir de 30 minutes, sans engagement, avec vérification de l'éligibilité au Chèque TIC.",
};

/* Les engagements tenus, à la place des témoignages de la référence. Ce
   sont des phrases que Omega applique — pas des citations attribuées à
   des clients qui n'existent pas. */
const ENGAGEMENTS: { texte: string; sous: string }[] = [
  {
    texte:
      "« Aucun audit ne se termine par une plaquette. Il se termine par un montant en euros ou en heures par mois, vérifiable dans vos propres documents. »",
    sous: "Protocole d'audit — chiffrage",
  },
  {
    texte:
      "« Si le calcul ne justifie pas d'installer un moteur, la recommandation est de ne rien installer. C'est une conclusion valable, et elle arrive. »",
    sous: "Protocole d'audit — recommandation",
  },
];

/* Le déroulé en trois temps — même méthode quel que soit le format, seule
   la profondeur change. Écrit ici comme ENGAGEMENTS : du texte tenu, pas
   des promesses. (31/07 — ajout suite à la révision éditoriale « audit
   d'abord » : la page vendait des formats sans jamais dire comment
   l'entretien se déroule.) */
const DEROULE: { etape: string; titre: string; texte: string }[] = [
  {
    etape: "Étape 1",
    titre: "On écoute",
    texte:
      "Pas de démo, pas de plaquette. Vous racontez votre journée telle qu'elle se passe : ce qui prend du temps, ce qui se perd, où vivent vos informations. En équipe, les entretiens sont individuels — en groupe, on se censure.",
  },
  {
    etape: "Étape 2",
    titre: "On met à plat",
    texte:
      "Chaque flux est cartographié tel qu'il fonctionne vraiment : ce qui entre, ce qui se fait, ce qui sort — et où ça frotte. Ce qui vivait de tête est posé noir sur blanc, sur un document que tout le monde peut regarder et corriger.",
  },
  {
    etape: "Étape 3",
    titre: "On chiffre et on classe",
    texte:
      "Chaque piste est posée sur deux axes : ce qu'elle rapporte, ce qu'elle demande. La recommandation commence par le meilleur retour — avec son indicateur de mesure — et dit aussi ce qu'il ne faut pas automatiser.",
  },
];

export default function ReserverUnAuditPage() {
  return (
    <PageShell>
      {/* couche motion commune : lenis + reveals GSAP */}
      <PageMotion />

      <div className="resa">
        {/* ═══ 1 à 3 — formules, orientation, comparatif ═══ */}
        <Formules />

        {/* ═══ 3bis — le déroulé, trois temps sur fond gris ═══ */}
        <section id="deroule" data-monde="clair" className="r-wrap py-14 sm:py-20">
          <p className="r-note">
            Le même déroulé quel que soit le format — seule la profondeur change.
          </p>
          <h2 className="r-h2 mt-6 max-w-[18ch]">Comment se passe l&apos;audit</h2>

          <div className="mt-10 grid gap-5 md:grid-cols-3">
            {DEROULE.map((d) => (
              <div
                key={d.etape}
                data-reveal
                className="flex h-full flex-col rounded-2xl bg-white p-7 sm:p-9"
              >
                <div className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[#616161]">
                  {d.etape}
                </div>
                <h3 className="r-h4 mt-3">{d.titre}</h3>
                <p className="mt-4 text-[15px] leading-[23px] text-[#3d3d3d]">
                  {d.texte}
                </p>
              </div>
            ))}
          </div>
        </section>

        {/* ═══ 4 — compléments, sur bande sombre ═══ */}
        <section id="complements" className="r-nuit">
          <div className="r-wrap py-14 sm:py-20">
            <p className="r-note">
              Les compléments s&apos;ajoutent à un format existant. Ils ne se
              réservent pas seuls et sont chiffrés pendant l&apos;audit.
            </p>
            <h2 className="r-h2 mt-6 max-w-[18ch]">Compléter votre audit</h2>

            <div className="mt-10 grid gap-5 md:grid-cols-2">
              {COMPLEMENTS.map((c) => (
                <div
                  key={c.titre}
                  data-reveal
                  className="flex h-full flex-col rounded-2xl border border-[#27272a] bg-[#141417] p-7 sm:p-9"
                >
                  <h3 className="r-h4">{c.titre}</h3>
                  <p className="mt-4 flex-1 text-[15px] leading-[24px] text-[#d4d4d8]">
                    {c.texte}
                  </p>
                  <div className="mt-7 text-[14px] leading-[22px] text-[#a1a1aa]">
                    {c.conditions}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ═══ 5 — simulateur ═══ */}
        <Simulateur />

        {/* ═══ 6 — engagements (emplacement des témoignages) ═══ */}
        <section id="engagements" data-monde="clair" className="r-blanc">
          <div className="r-wrap py-14 sm:py-20">
            <h2 className="r-h3 max-w-[20ch]">Ce qui est écrit noir sur blanc</h2>
            <div className="mt-10 grid gap-5 md:grid-cols-2">
              {ENGAGEMENTS.map((e) => (
                <blockquote
                  key={e.sous}
                  data-reveal
                  className="flex h-full flex-col rounded-2xl bg-[#f5f5f5] p-7 sm:p-9"
                >
                  <p className="font-[family-name:var(--font-jakarta)] text-[21px] font-medium leading-[31px] tracking-[-0.01em] text-[#050505] sm:text-[23px] sm:leading-[34px]">
                    {e.texte}
                  </p>
                  <footer className="mt-6 text-[14px] leading-[22px] text-[#616161]">
                    {e.sous}
                  </footer>
                </blockquote>
              ))}
            </div>
          </div>
        </section>

        {/* ═══ 7 — CTA final ═══ */}
        <section id="reserver" data-monde="clair" className="r-wrap py-16 sm:py-24">
          <div className="mx-auto max-w-3xl text-center">
            <h2 className="r-h2">Réservez votre créneau en deux minutes</h2>
            <p className="r-lead mx-auto mt-6 max-w-[54ch]">
              Le bouton ouvre WhatsApp avec le message déjà rédigé : il ne vous
              reste qu&apos;à compléter votre activité, votre commune et la difficulté
              qui vous coûte le plus cher. On répond le jour même avec des
              créneaux — et rien d&apos;autre.
            </p>
            <div className="mt-9 flex flex-wrap items-center justify-center gap-3">
              <a
                href={lienReservation("Audit complet (90 min)")}
                className="r-btn r-btn--noir"
              >
                Réserver l&apos;audit gratuit
              </a>
            </div>
            <p className="r-note mt-5">
              Ou directement — {CANAL_LABEL_PHRASE} :{" "}
              <a
                href={lienContact("Audit gratuit")}
                className="underline underline-offset-4 hover:text-[#050505]"
              >
                {CANAL_VALEUR}
              </a>
            </p>
          </div>
        </section>

        {/* ═══ 8 — FAQ ═══ */}
        <section id="faq" data-monde="clair" className="r-blanc">
          <div className="r-wrap py-14 sm:py-20">
            <div className="grid gap-8 lg:grid-cols-[379px_1fr] lg:gap-16">
              <h2 className="r-h3 lg:sticky lg:top-28 lg:self-start">
                Questions fréquentes
              </h2>
              <div>
                {FAQ.map((f) => (
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
                      {f.r.map((p, i) => (
                        <p
                          key={i}
                          className={`text-[15px] leading-[26px] text-[#3d3d3d] ${
                            i > 0 ? "mt-4" : ""
                          }`}
                        >
                          {p}
                        </p>
                      ))}
                    </div>
                  </details>
                ))}
              </div>
            </div>
          </div>
        </section>
      </div>
    </PageShell>
  );
}
