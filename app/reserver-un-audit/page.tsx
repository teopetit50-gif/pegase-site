import type { Metadata } from "next";
import Link from "next/link";
import PageShell from "@/components/PageShell";
import PageMotion from "@/components/PageMotion";
import Formules from "@/components/reservation/Formules";
import Simulateur from "@/components/reservation/Simulateur";
import Complements from "@/components/reservation/Complements";
import Engagements from "@/components/reservation/Engagements";
import DerouleAudit from "@/components/reservation/DerouleAudit";
import { MODELES } from "@/components/modeles/donnees";
import {
  COURRIEL,
  FAQ,
  lienCourriel,
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
  title: "Réserver un audit | Omega.AI",
  description:
    "Trois formats d'audit pour mesurer ce que votre processus le plus coûteux représente : impayés, demandes perdues, heures de saisie. Gratuit à partir de 30 minutes, sans engagement, avec vérification de l'éligibilité au Chèque TIC.",
};

/* Le déroulé en trois temps — même méthode quel que soit le format, seule
   la profondeur change. Écrit ici comme ENGAGEMENTS : du texte tenu, pas
   des promesses. (31/07 — ajout suite à la révision éditoriale « audit
   d'abord » : la page vendait des formats sans jamais dire comment
   l'entretien se déroule.) */
const DEROULE: { etape: string; titre: string; texte: string }[] = [
  {
    etape: "Étape 1",
    titre: "Nous écoutons",
    texte:
      "Ni démonstration ni plaquette. Vous décrivez votre journée telle qu'elle se déroule : ce qui prend du temps, ce qui se perd, où vivent vos informations. En équipe, les entretiens sont individuels, parce qu'en groupe chacun se censure.",
  },
  {
    etape: "Étape 2",
    titre: "Nous cartographions",
    texte:
      "Chaque flux est cartographié tel qu'il fonctionne réellement : ce qui entre, ce qui se fait, ce qui sort, et où il se bloque. Ce qui n'existait que dans les têtes est posé noir sur blanc, sur un document que chacun peut consulter et corriger.",
  },
  {
    etape: "Étape 3",
    titre: "Nous chiffrons et classons",
    texte:
      "Chaque piste est posée sur deux axes : ce qu'elle rapporte, ce qu'elle demande. La recommandation commence par le meilleur retour, avec son indicateur de mesure, et dit aussi ce qu'il ne faut pas automatiser.",
  },
];

/* ══════════════════════════════════════════════════════════════════════
   15/09/2026 — ?modele=<slug> EST ENFIN LU.

   « Choisir ce modèle » (les 21 cartes de /modeles et le mur de
   /tarifs/site) menait ici depuis le 14/09 avec le modèle en paramètre,
   « pour le jour où le formulaire le lira ». Personne ne le lisait : la
   page l'ignorait, ses boutons repartaient sur /reserver sans lui, et le
   choix se perdait — les 21 boutons valaient « Réserver un audit ».

   Il est maintenant annoncé en tête de page et repart avec chaque bouton
   de réservation, jusqu'au message de la demande (voir PriseDeCreneau).
   Le slug est vérifié contre MODELES comme sur /site/commande : un
   paramètre inventé est ignoré, jamais affiché.

   LE PRIX : la page passe en rendu dynamique (ƒ) — elle lit
   searchParams. C'est le même prix que /reserver depuis le 15/09, et
   elle n'a ni données ni session à charger : le rendu reste du HTML.
   ══════════════════════════════════════════════════════════════════════ */

export default async function ReserverUnAuditPage({
  searchParams,
}: {
  searchParams: Promise<{ modele?: string }>;
}) {
  const demande = ((await searchParams).modele ?? "").trim();
  const modeleChoisi = MODELES.find((m) => m.slug === demande);
  const modele = modeleChoisi?.slug;

  return (
    <PageShell>
      {/* couche motion commune : lenis + reveals GSAP */}
      <PageMotion />

      <div className="resa">
        {/* ═══ 0 — le modèle de site retenu, s'il y en a un ═══
            Une ligne, pas une carte : c'est un rappel, pas une étape. Elle
            ne s'affiche que si le slug existe vraiment. */}
        {modeleChoisi ? (
          <section data-monde="clair" className="r-wrap pt-10 sm:pt-12">
            <p className="r-note">
              Modèle de site retenu&nbsp;:{" "}
              <strong className="font-medium text-[#050505]">{modeleChoisi.nom}</strong>{" "}
              — il part avec votre demande, et reste modifiable jusqu&apos;à la
              livraison.{" "}
              <Link href="/modeles" className="underline underline-offset-4 hover:text-[#050505]">
                Changer de modèle
              </Link>
            </p>
          </section>
        ) : null}

        {/* ═══ 1 à 3 — formules, orientation, comparatif ═══ */}
        <Formules modele={modele} />

        {/* ═══ 3bis — le déroulé, trois temps sur fond gris ═══ */}
        <section id="deroule" data-monde="clair" className="r-wrap py-14 sm:py-20">
          <p className="r-note">
            Le même déroulé quel que soit le format : seule la profondeur change.
          </p>
          <h2 className="r-h2 mt-6 max-w-[18ch]">Comment se passe l&apos;audit</h2>

          <DerouleAudit temps={DEROULE} />
        </section>

        {/* ═══ 4 — compléments, sur bande sombre ═══ */}
        <section id="complements" className="r-nuit">
          <div className="r-wrap py-14 sm:py-20">
            <p className="r-note">
              Les compléments s&apos;ajoutent à un format existant. Ils ne se
              réservent pas seuls et sont chiffrés pendant l&apos;audit.
            </p>
            <h2 className="r-h2 mt-6 max-w-[18ch]">Compléter votre audit</h2>

            <Complements />
          </div>
        </section>

        {/* ═══ 5 — simulateur ═══ */}
        <Simulateur modele={modele} />

        {/* ═══ 6 — engagements (emplacement des témoignages) ═══ */}
        <section id="engagements" data-monde="clair" className="r-blanc">
          <div className="r-wrap py-14 sm:py-20">
            <h2 className="r-h3 max-w-[20ch]">Ce qui est écrit noir sur blanc</h2>
            <Engagements />
          </div>
        </section>

        {/* ═══ 7 — CTA final ═══ */}
        <section id="reserver" data-monde="clair" className="r-wrap py-16 sm:py-24">
          <div className="mx-auto max-w-3xl text-center">
            <h2 className="r-h2">Réservez votre créneau en deux minutes</h2>
            <p className="r-lead mx-auto mt-6 max-w-[54ch]">
              L&apos;agenda montre les créneaux réellement libres, en heure de
              Guadeloupe. Vous en choisissez un, il est bloqué à l&apos;instant même, et vous recevez la confirmation le jour même, avec le lien de la visioconférence.
            </p>
            <div className="mt-9 flex flex-wrap items-center justify-center gap-3">
              <Link
                href={lienReservation("process", modele)}
                className="r-btn r-btn--noir"
              >
                Réserver l&apos;audit gratuit
              </Link>
            </div>
            <p className="r-note mt-5">
              Ou par e-mail :{" "}
              <a
                href={lienCourriel("Audit gratuit")}
                className="underline underline-offset-4 hover:text-[#050505]"
              >
                {COURRIEL}
              </a>
            </p>
            {/* la mention discrète de l'autre porte (28/08) — symétrique de
                celle qui clôt /tarifs */}
            <p className="r-note mx-auto mt-8 max-w-xl !text-[13px]">
              Vous tenez vos outils seul&nbsp;? Un audit n&apos;est pas nécessaire pour commencer&nbsp;: les prix sont publics.{" "}
              <Link href="/tarifs" className="underline underline-offset-4 hover:text-[#050505]">
                Voir la grille
              </Link>
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
