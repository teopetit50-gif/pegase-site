import type { Metadata } from "next";
import Link from "next/link";
import PageShell from "@/components/PageShell";
import PageMotion from "@/components/PageMotion";
import Formules from "@/components/reservation/Formules";
import Simulateur from "@/components/reservation/Simulateur";
import Engagements from "@/components/reservation/Engagements";
import { MODELES } from "@/components/modeles/donnees";
import { POSTES } from "@/lib/paliers";
import {
  ModeleRetenu,
  EstimationRetenue,
  BoutonReservation,
} from "@/components/reservation/ModeleUrl";
import {
  COURRIEL,
  FAQ,
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

   16/09/2026 — DEUX SECTIONS SUPPRIMÉES (Teo : « supprime ces deux
   sections »). Le déroulé en trois temps (« Comment se passe l'audit »,
   #deroule) et les compléments (« Compléter votre audit », #complements)
   ne sont plus sur la page. Rien ne pointait sur leurs ancres — vérifié
   par grep avant la coupe.

   Dans la foulée, la page est ENTIÈREMENT CLAIRE. Le comparatif était la
   dernière bande sombre ; une fois seul de son espèce au milieu de sept
   sections claires, il ne faisait plus un rythme mais un trou (Teo :
   « trop sombre cette section »). Il repasse dans le monde clair — le
   détail du retournement est en tête de ComparerFormats.css. Le rythme
   est désormais porté par les fonds de bande (#f5f5f5 de `.resa` ↔
   `.r-blanc`) et par les cartes, comme sur la référence Qonto.
   `.resa .r-nuit` reste écrit dans globals.css : plus rien ne le porte
   sur cette page, mais c'est la gamme de référence si on y remet un jour
   une bande sombre.
   Le texte des compléments est retiré de lib/reservation.ts avec eux ;
   les trois temps se relisent dans l'historique (commit f40e687).

   Le chrome reste celui du site : header caméléon (les sections claires
   portent data-monde="clair") et footer sombre hérités de PageShell.
   ══════════════════════════════════════════════════════════════════════ */

export const metadata: Metadata = {
  alternates: { canonical: "/reserver-un-audit" },
  title: "Réserver un audit | Omega.AI",
  description:
    "Trois formats d'audit, gratuits à partir du cadrage de 45 minutes, pour mesurer ce que votre processus le plus coûteux représente. Sans engagement.",
};


/* ══════════════════════════════════════════════════════════════════════
   15/09/2026 — ?modele=<slug> EST ENFIN LU, ET LA PAGE RESTE STATIQUE.

   « Choisir ce modèle » (les cartes de /modeles et le mur de
   /tarifs/site) menait ici depuis le 14/09 avec le modèle en paramètre,
   « pour le jour où le formulaire le lira ». Personne ne le lisait : la
   page l'ignorait, ses boutons repartaient sur /reserver sans lui, et le
   choix se perdait — ces boutons valaient « Réserver un audit ».

   Il est maintenant annoncé en tête de page et repart avec chaque bouton
   de réservation, jusqu'au message de la demande (voir PriseDeCreneau).

   La première version lisait `searchParams` : la page passait en ƒ,
   rendue à chaque visite pour une ligne de rappel. Elle est revenue en ○
   le jour même — le paramètre se lit au montage, côté client
   (components/reservation/ModeleUrl.tsx), et le serveur ne fournit que
   la table slug → nom pour que rien d'inventé ne s'affiche. C'est cette
   table, et elle seule, qui vérifie le slug. */
const NOMS_MODELES: Record<string, string> = Object.fromEntries(
  MODELES.map((m) => [m.slug, m.nom]),
);

/* 15/09/2026 — les noms des quatre postes, fournis par le SERVEUR au
   rappel d'estimation. Même raison que pour les modèles : la vérification
   se fait côté client, mais la table des noms n'a pas à entrer dans le
   paquet d'une page d'entrée — ici elle est minuscule, et le motif reste
   le même d'un rappel à l'autre. */
const NOMS_POSTES: Record<string, string> = Object.fromEntries(
  POSTES.map((p) => [p.id, `${p.system} · ${p.nom}`]),
);

export default function ReserverUnAuditPage() {
  return (
    <PageShell>
      {/* couche motion commune : lenis + reveals GSAP */}
      <PageMotion />

      <div className="resa">
        {/* ═══ 0 — ce que le visiteur apporte : le modèle de site retenu,
               et l'estimation faite sur /tarifs ═══ */}
        <ModeleRetenu noms={NOMS_MODELES} />
        <EstimationRetenue noms={NOMS_POSTES} />

        {/* ═══ 1 à 3 — formules, orientation, comparatif ═══ */}
        <Formules />

        {/* ═══ 4 — simulateur ═══ */}
        <Simulateur />

        {/* ═══ 5 — engagements (emplacement des témoignages) ═══ */}
        <section id="engagements" data-monde="clair" className="r-blanc">
          <div className="r-wrap py-14 sm:py-20">
            <h2 className="r-h3 max-w-[20ch]">Ce qui est écrit noir sur blanc</h2>
            <Engagements />
          </div>
        </section>

        {/* ═══ 6 — CTA final ═══ */}
        <section id="reserver" data-monde="clair" className="r-wrap py-16 sm:py-24">
          <div className="mx-auto max-w-3xl text-center">
            <h2 className="r-h2">Réservez votre créneau en deux minutes</h2>
            <p className="r-lead mx-auto mt-6 max-w-[54ch]">
              L&apos;agenda montre les créneaux réellement libres, en heure de
              Guadeloupe. Vous en choisissez un, il est bloqué à l&apos;instant même, et vous recevez la confirmation le jour même, avec le lien de la visioconférence.
            </p>
            <div className="mt-9 flex flex-wrap items-center justify-center gap-3">
              <BoutonReservation formule="process" className="r-btn r-btn--noir">
                Réserver l&apos;audit gratuit
              </BoutonReservation>
            </div>
            {/* 15/09/2026 — l'adresse reste affichée, elle n'est plus un
                lien `mailto:` : plus rien sur le site n'ouvre un client
                mail. Qui préfère écrire depuis sa boîte copie l'adresse ;
                qui veut écrire depuis le site a /contact dans l'entête et
                le pied, et le bandeau d'orientation plus haut.
                Le `mailto:` ne subsiste que là où il est la bonne réponse : la carte « Écrire » de /contact, que le visiteur a choisie, et les voies de SECOURS (formulaire ou agenda en panne). */}
            <p className="r-note mt-5">
              Ou par e-mail : <span className="text-[#050505]">{COURRIEL}</span>
            </p>
            {/* la mention discrète de l'autre porte (28/08) — symétrique de
                celle qui clôt /tarifs */}
            <p className="r-note mx-auto mt-8 max-w-xl !text-[13px]">
              {/* 15/09 — la mention disait « un audit n'est pas nécessaire
                  pour commencer : les prix sont publics ». Sur la page qui
                  vend l'audit, c'était l'inviter à ne pas le faire — et
                  c'est faux depuis que le prix sort des volumes. */}
              Vous voulez un ordre de grandeur avant de réserver&nbsp;?{" "}
              <Link href="/tarifs" className="underline underline-offset-4 hover:text-[#050505]">
                Estimez votre prix
              </Link>{" "}
              en répondant à une question par poste.
            </p>
          </div>
        </section>

        {/* ═══ 7 — FAQ ═══ */}
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
