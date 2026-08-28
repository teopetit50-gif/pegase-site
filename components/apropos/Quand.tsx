"use client";

/* « Quand nous appeler ? » — calque de hyperstack.studio/a-propos § « Quand
   faire appel à Hyperstack ? » : sur-titre centré, H2 centré, rangée de
   pastilles-onglets, puis un panneau deux colonnes — visuel sombre à gauche,
   texte + liste à cocher + CTA à droite.

   Code couleur Omega : le panneau visuel passe du bleu nuit hyperstack au
   noir du site, l'orange #f78320 (--gold) prend la place de leur orange, les
   surfaces claires sont celles de la charte (.carte-claire, .monde-clair).

   Robustesse (règles ServicesTabs) : pas d'animation d'opacité au changement
   d'onglet, pas de [data-reveal] dans le panneau injecté au clic. */

import Link from "next/link";
import { useRef, useState } from "react";

type Etape = {
  cle: string;
  onglet: string;
  titre: string;
  chapo: string;
  points: string[];
  photo: string;
};

const ETAPES: Etape[] = [
  {
    cle: "audit",
    onglet: "Audit & chiffrage",
    titre: "Savoir ce que ça coûte avant de décider",
    chapo:
      "Vous sentez que quelque chose fuit (des devis sans réponse, des factures en retard, des appels manqués), mais personne n'a jamais posé le chiffre. On l'établit avec vous en trente minutes.",
    points: [
      "Passage en revue de vos outils et de vos circuits actuels",
      "Identification du point qui coûte le plus cher, pas du plus visible",
      "Chiffrage de la perte annuelle, hypothèses affichées",
      "Recommandation classée par retour sur investissement",
    ],
    photo: "/photos/histoire-constat.jpg",
  },
  {
    cle: "installation",
    onglet: "Installation",
    titre: "Brancher un moteur sur ce que vous avez déjà",
    chapo:
      "Un seul moteur à la fois, celui que l'audit a désigné. Le raccordement se fait sur votre boîte mail, votre agenda et WhatsApp : vos numéros et vos adresses ne changent pas.",
    points: [
      "Entretien d'une heure pour construire la base de connaissances",
      "Raccordement sur vos outils existants, sans migration",
      "Rodage en double écoute : copie de tout ce qui part la première semaine",
      "Vous fixez la frontière entre ce qui part seul et ce qui attend votre accord",
    ],
    photo: "/photos/regle-execution.jpg",
  },
  {
    cle: "conformite",
    onglet: "Conformité 2026",
    titre: "Être en règle avant le 1ᵉʳ septembre 2026",
    chapo:
      "Toutes les entreprises établies en France doivent pouvoir recevoir des factures électroniques au format structuré. L'échéance est datée, elle ne bougera pas, et s'y prendre en décembre coûtera plus cher.",
    points: [
      "Audit du fichier client : SIREN, adresses, mentions obligatoires",
      "Conversion de la facturation au format Factur-X",
      "Raccordement au portail public",
      "Contrôle de conformité sur chaque pièce émise",
    ],
    photo: "/photos/billd.jpg",
  },
  {
    cle: "suivi",
    onglet: "Suivi & évolution",
    titre: "Faire évoluer sans redevenir dépendant",
    chapo:
      "Un moteur installé n'est pas un moteur figé. Les règles se règlent, les circuits changent, et vous devez pouvoir en discuter sans repasser par un devis à chaque fois.",
    points: [
      "Ajustement des règles et des cadences quand votre activité bouge",
      "Ajout d'un second moteur seulement quand le premier a fait ses preuves",
      "Archivage consultable de tout ce qui a été envoyé",
      "Vous récupérez vos outils tels quels si vous arrêtez",
    ],
    photo: "/photos/regle-proximite.jpg",
  },
];

export default function Quand() {
  const [actif, setActif] = useState(ETAPES[0].cle);
  const refs = useRef<(HTMLButtonElement | null)[]>([]);
  const e = ETAPES.find((x) => x.cle === actif) ?? ETAPES[0];

  const onKey = (ev: React.KeyboardEvent, i: number) => {
    const suivant =
      ev.key === "ArrowRight" ? i + 1 : ev.key === "ArrowLeft" ? i - 1 : null;
    if (suivant === null) return;
    ev.preventDefault();
    const j = (suivant + ETAPES.length) % ETAPES.length;
    setActif(ETAPES[j].cle);
    refs.current[j]?.focus();
  };

  return (
    <section
      data-monde="clair"
      className="monde-clair px-6 pb-20 pt-4 sm:px-10 sm:pb-28"
    >
      <p
        data-reveal
        className="text-center text-[14px] text-[#52555c] sm:text-[15px]"
      >
        À chaque étape de votre entreprise, ses points de friction
      </p>
      <h2
        data-intertitre
        className="mx-auto mt-4 max-w-[20ch] text-center text-[30px] font-bold leading-[1.06] tracking-[-0.03em] text-[#0f1013] sm:text-[52px]"
      >
        Quand nous appeler ?
      </h2>

      {/* pastilles-onglets */}
      <div
        data-reveal
        role="tablist"
        aria-label="Étapes d'accompagnement"
        className="mx-auto mt-10 flex w-fit max-w-full flex-wrap items-center justify-center gap-2 sm:mt-12"
      >
        {ETAPES.map((x, i) => {
          const on = x.cle === actif;
          return (
            <button
              key={x.cle}
              ref={(el) => {
                refs.current[i] = el;
              }}
              type="button"
              role="tab"
              aria-selected={on}
              aria-controls="panneau-quand"
              tabIndex={on ? 0 : -1}
              onClick={() => setActif(x.cle)}
              onKeyDown={(ev) => onKey(ev, i)}
              className={`rounded-full border px-4 py-2.5 text-[14px] font-medium transition sm:px-5 sm:text-[15px] ${
                on
                  ? "border-transparent bg-white text-[#0f1013] shadow-[0_2px_8px_-1px_rgba(15,16,19,0.16),0_1px_3px_rgba(15,16,19,0.1)]"
                  : "border-black/10 text-[#52555c] hover:border-black/30 hover:text-[#0f1013]"
              }`}
            >
              {x.onglet}
            </button>
          );
        })}
      </div>

      {/* panneau : visuel sombre à gauche, texte à droite */}
      <div
        id="panneau-quand"
        role="tabpanel"
        aria-live="polite"
        className="mx-auto mt-12 grid max-w-[1120px] items-center gap-8 sm:mt-14 lg:grid-cols-2 lg:gap-14"
      >
        <div className="relative aspect-[4/3] w-full overflow-hidden rounded-[var(--radius-card)] bg-black">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={e.photo}
            alt=""
            className="h-full w-full object-cover opacity-70"
          />
          {/* voile noir + halo or : le panneau bleu nuit d'hyperstack, au code
              couleur Omega */}
          <div
            aria-hidden
            className="absolute inset-0"
            style={{
              background:
                "radial-gradient(70% 60% at 30% 25%, rgba(247,131,32,0.20), transparent 65%), linear-gradient(180deg, rgba(0,0,0,0.45), rgba(0,0,0,0.80))",
            }}
          />
        </div>

        <div>
          <h3 className="text-[23px] font-semibold leading-snug tracking-[-0.025em] text-[#0f1013] sm:text-[30px]">
            {e.titre}
          </h3>
          <p className="mt-4 text-[15px] leading-[1.8] text-[#52555c] sm:text-[16px]">
            {e.chapo}
          </p>
          <ul className="mt-7 space-y-3.5">
            {e.points.map((p) => (
              <li key={p} className="flex items-start gap-3">
                <span
                  aria-hidden
                  className="mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full text-[11px] font-bold text-white"
                  style={{ background: "#8a6519" }}
                >
                  ✓
                </span>
                <span className="text-[15px] leading-[1.65] text-[#0f1013]">
                  {p}
                </span>
              </li>
            ))}
          </ul>
          <Link
            href="/tarifs"
            className="mt-9 inline-flex items-center gap-2 rounded-[var(--radius-btn)] px-6 py-3.5 text-[15px] font-semibold text-white transition hover:brightness-110 active:scale-[0.97]"
            style={{ background: "#f78320" }}
          >
            Commencer
            <span aria-hidden>→</span>
          </Link>
        </div>
      </div>
    </section>
  );
}
