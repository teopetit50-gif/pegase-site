import type { Metadata } from "next";
import Link from "next/link";
import PageShell from "@/components/PageShell";
import PageMotion from "@/components/PageMotion";
import Grille from "@/components/tarifs/Grille";
import { REMISE_ANNUELLE } from "@/lib/paliers";
import { CANAL_LABEL_PHRASE, CANAL_VALEUR, lienContact } from "@/lib/reservation";

/* 03/09 — le taux de la remise annuelle écrit en toutes lettres dans les
   textes de la page : dérivé de la constante, jamais recopié à la main. */
const REMISE_PCT = Math.round(REMISE_ANNUELLE * 100);

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
   → 05/09 (demande des associés : « enlève la mention paiement à
   l'installation, ça va porter à confusion ») : le client enregistre son
   moyen de paiement — carte ou prélèvement SEPA — à la réservation, sur
   /installation ; rien n'est débité avant la fin de l'installation, le
   premier prélèvement part le jour de la mise en service. La FAQ
   « Comment se passe le paiement ? », la règle « Aucun engagement
   caché », le chapô du CTA final et la mention légale de la grille
   disent désormais cela — plus « tout se règle à l'installation ».

   05/09 — LE DESIGN DE /reserver-un-audit, COLLÉ (Teo : « quand on clique
   sur Indépendants & TPE, le design doit être le même que celui
   d'Organisations & équipes ; les infos de tarifs restent »). La page
   suit désormais l'ordre exact de la page audit, section pour section :
     1-3. titre, quatre colonnes (colonne de gauche + trois cartes à tête
          grise / dorée), bandeau d'orientation, comparatif — tout dans
          components/tarifs/Grille.tsx, comme reservation/Formules.tsx ;
     3bis. « Ce que nous ne facturons jamais » dans les cartes blanches
          du « Comment se passe l'audit » (note, H2, étiquette, titre) ;
     4.   Chèque TIC sur bande sombre (H2 au lieu de H3) ;
     7.   CTA final centré, avec la voie WhatsApp et la mention discrète
          de l'autre porte — la page audit finit pareil ;
     8.   la FAQ, en dernier.
   Le simulateur et les engagements (5, 6) n'ont pas d'équivalent tarifs
   et ne sont pas meublés. Les textes de la page sont inchangés ; les
   seuls ajouts sont ceux que les emplacements du design imposaient
   (bandeau d'orientation, CTA final, cellules du comparatif) et ils
   redisent des faits déjà posés ici.
   ══════════════════════════════════════════════════════════════════════ */

export const metadata: Metadata = {
  title: "Tarifs | Omega.AI",
  description:
    `Un poste 59 €, trois postes 89 €, tout Omega 119 € par mois — sans engagement en mensuel, −${REMISE_PCT} % en annuel, installation comprise, satisfait ou remboursé 30 jours. Et pour les structures où plusieurs services valident : un audit d'abord, un devis ensuite.`,
};

/* 03/09 (relecture de la formule annuelle) — la page disait encore
   « mensuel, rien n'est payé d'avance » à cinq endroits alors que l'annuel
   est justement facturé d'avance pour douze mois : un client qui lit
   « rien n'est payé d'avance » puis reçoit une facture de 900 € a un motif
   de contestation. Chaque phrase distingue désormais les deux formules.
   Textes à valider par Teo. */

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
      "Vous enregistrez votre moyen de paiement — carte ou prélèvement SEPA — au moment de réserver la réunion d'installation, sur une page sécurisée. Rien n'est débité avant la fin de l'installation : le premier prélèvement part le jour où vos modules sont en service.",
      `En mensuel, sans engagement : vous résiliez à tout moment, le mois en cours va à son terme, les envois s'arrêtent. En annuel, les douze mois sont facturés en une fois, le jour de la mise en service, à −${REMISE_PCT} %.`,
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
      "Trente jours à partir de la mise en service pour être remboursé, sans justification à fournir, en mensuel comme en annuel : ce qui a été prélevé vous est rendu. Au-delà, le mensuel reste résiliable à tout moment ; l'annuel court jusqu'à son terme — et dans les deux cas vos données repartent avec vous, export complet compris.",
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
    titre: "Aucun engagement caché",
    texte:
      "Rien n'est débité avant la fin de l'installation. En mensuel, sans engagement : vous prévenez, le mois va à son terme, les envois s'arrêtent. En annuel, les douze mois sont facturés en une fois, le jour de la mise en service, avec les mêmes trente jours satisfait ou remboursé.",
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
        {/* ═══ 1 à 3 — titre, paliers, orientation, comparatif ═══ */}
        <Grille />

        {/* ═══ 3bis — ce qu'on ne facture jamais, quatre cartes blanches
               sur fond gris (l'emplacement du « déroulé » de la page
               audit) ═══ */}
        <section id="jamais" data-monde="clair" className="r-wrap py-14 sm:py-20">
          <p className="r-note">
            Quatre règles, valables quel que soit le palier.
          </p>
          <h2 className="r-h2 mt-6 max-w-[18ch]">Ce que nous ne facturons jamais</h2>

          <div className="mt-10 grid gap-5 md:grid-cols-2 lg:grid-cols-4">
            {JAMAIS.map((j, i) => (
              <div
                key={j.titre}
                data-reveal
                className="flex h-full flex-col rounded-2xl bg-white p-7 sm:p-9"
              >
                <div className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[#616161]">
                  Règle {i + 1}
                </div>
                <h3 className="r-h4 mt-3">{j.titre}</h3>
                <p className="mt-4 text-[15px] leading-[23px] text-[#3d3d3d]">{j.texte}</p>
              </div>
            ))}
          </div>
        </section>

        {/* ═══ 4 — Chèque TIC, sur bande sombre ═══ */}
        <section id="cheque-tic" className="r-nuit">
          <div className="r-wrap py-14 sm:py-20">
            <div className="flex flex-col gap-8 lg:flex-row lg:items-end lg:justify-between">
              <div className="max-w-[60ch]">
                <p className="r-note">Chèque TIC — Région Guadeloupe</p>
                <h2 className="r-h2 mt-6 max-w-[18ch]">
                  De 40 à 80 % d&apos;un projet numérique financés
                </h2>
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

        {/* ═══ 7 — CTA final ═══ */}
        <section id="reserver" data-monde="clair" className="r-wrap py-16 sm:py-24">
          <div className="mx-auto max-w-3xl text-center">
            <h2 className="r-h2">Réservez l&apos;installation en deux minutes</h2>
            <p className="r-lead mx-auto mt-6 max-w-[54ch]">
              Vous choisissez vos postes, vous réservez la réunion d&apos;installation en
              ligne, vous enregistrez votre moyen de paiement — et le système démarre sous
              votre œil. Rien n&apos;est débité avant la fin de l&apos;installation&nbsp;: le
              premier prélèvement part le jour où vos modules sont en service.
            </p>
            <div className="mt-9 flex flex-wrap items-center justify-center gap-3">
              <a href="#grille" className="r-btn r-btn--noir">
                Choisir mes postes
              </a>
            </div>
            <p className="r-note mt-5">
              Ou directement : {CANAL_LABEL_PHRASE} :{" "}
              <a
                href={lienContact("Tarifs Omega")}
                className="underline underline-offset-4 hover:text-[#050505]"
              >
                {CANAL_VALEUR}
              </a>
            </p>
            {/* la mention discrète de l'autre porte (28/08) : pour qui
                s'est trompé d'aiguillage, sans re-poser deux portes ici —
                symétrique de celle qui clôt /reserver-un-audit */}
            <p className="r-note mx-auto mt-8 max-w-xl !text-[13px]">
              Plusieurs services se partagent le travail chez vous&nbsp;? Cette grille n&apos;est pas
              votre porte&nbsp;: votre prix sort d&apos;un audit.{" "}
              <Link href="/reserver-un-audit" className="underline underline-offset-4 hover:text-[#050505]">
                Réserver un échange
              </Link>
            </p>
          </div>
        </section>

        {/* ═══ 8 — la FAQ tarifs (28/08, 2ᵉ passe) — mêmes replis .r-faq
               que la page audit ═══ */}
        <section id="faq" data-monde="clair" className="r-blanc">
          <div className="r-wrap py-14 sm:py-20">
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
      </div>
    </PageShell>
  );
}
