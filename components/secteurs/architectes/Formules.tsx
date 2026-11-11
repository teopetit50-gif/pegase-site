/* ═══════════════════════════════════════════════════════════════════════
   Lorani (agences d'architecture) — Formules.tsx, « 06 — Formules »

   COPIÉ le 24/09/2026 de `OMEGA/dossieros-site/src/components/sections/
   13-pricing.tsx` : quatre colonnes bordées, huit à quatorze puces par
   formule, aucun prix public (« Sur audit »), boutons vers l'audit.

   11/11/2026 — REFAIT EN COMPACT. Teo : « la partie formule, c'est beaucoup
   trop chiant et long à lire… un composant que tu vas chercher sur 21st.dev
   ou dans la galerie… plus petit et professionnel ». Dessin repris du
   `pricing-one` de meschacirung (21st.dev, bibliothèque idees-21st) : des
   cartes arrondies à filet, le nom, la mention de prix en gros, une phrase,
   le bouton, un filet pointillé, puis CINQ puces au plus, à coche fine. La
   formule mise en avant (Cabinet) prend le fond #fafafa, l'ombre et le
   bouton étoilé de la page ; les autres, le bouton à filet. Les puces
   reprennent les contrôles de la copie, condensés : chaque formule dit
   d'abord qu'elle contient la précédente, puis ce qu'elle ajoute. Toujours
   aucun montant sur la page (lorani-v2.md : Découverte à prix fixe,
   remboursée sous trois points confirmés ; les autres sur audit).
   ═══════════════════════════════════════════════════════════════════════ */
/* eslint-disable @next/next/no-img-element -- planche décorative à 22 % d'opacité, masquée en CSS : pas d'optimiseur. */
import React from "react";
import Link from "next/link";
import { Check } from "lucide-react";
import StarButton from "./bouton-etoile";
import { CONTACT } from "./textes";

type Formule = {
  titre: string;
  pour: string;
  prix: string;
  /** La formule mise en avant : fond #fafafa, ombre et bouton étoilé. */
  avant?: boolean;
  lignes: string[];
};

const FORMULES: Formule[] = [
  {
    titre: "Découverte",
    pour: "Un dossier déjà clos, pour juger sans abonnement",
    prix: "Prix fixe",
    lignes: [
      "Un permis instruit ou un DCE attribué, relu en entier",
      "Planches, CCTP et DPGF croisés entre eux",
      "Chaque point avec la page, la valeur lue et la correction",
      "Rapport PDF annoté et Excel, en quelques heures",
      "Remboursé si moins de trois points confirmés",
    ],
  },
  {
    titre: "Agence",
    pour: "Agences de 1 à 5 personnes",
    prix: "Sur audit",
    lignes: [
      "Tout Découverte, sur toutes vos opérations",
      "Permis, accessibilité, ERP et RE2020",
      "PLU, servitudes et risques lus depuis l'adresse",
      "Calendrier du permis jusqu'à la purge des recours",
      "Revérification à chaque indice",
    ],
  },
  {
    titre: "Cabinet",
    pour: "Agences de 6 à 20 personnes",
    prix: "Sur audit",
    avant: true,
    lignes: [
      "Tout Agence",
      "Analyse des offres et métré contre la DPGF",
      "Visa des fiches techniques et des décennales",
      "Situations, décomptes et ordres de service",
      "Journal des décisions, utilisateurs sans supplément",
    ],
  },
  {
    titre: "Groupement",
    pour: "Plus de 20 personnes, groupements, maîtres d'ouvrage",
    prix: "Sur audit",
    lignes: [
      "Tout Cabinet",
      "Bureaux d'études invités, fonds de plan croisés",
      "Comptes rendus et réserves jusqu'à la fin de la GPA",
      "DOE, défense décennale, registre des visas",
      "Contrôles définis avec vous, accès sans limite",
    ],
  },
];

const BOUTON_FILET =
  "inline-flex h-9 w-full items-center justify-center rounded-[6px] border border-[#e5e5e5] bg-white px-4 text-sm font-medium text-[#0a0a0a] transition-colors hover:bg-[#f5f5f5] focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#a1a1a1]";

export default function Formules() {
  return (
    <div id="pricing" className="scroll-mt-24">
      <section className="relative isolate py-16 md:py-20">
        <div
          aria-hidden="true"
          data-reveal="1"
          className="pointer-events-none absolute inset-x-0 top-0 -z-10 overflow-hidden h-[280px] md:h-[260px] lg:h-[290px] [mask-image:linear-gradient(to_bottom,black_62%,transparent)]"
        >
          <img
            alt=""
            loading="lazy"
            decoding="async"
            width="1600"
            height="922"
            src="/secteurs-architectes/plans/piscine.webp"
            className="absolute -top-[90px] right-[-2%] w-[min(66%,940px)] max-w-none select-none opacity-[0.22] [mask-image:radial-gradient(ellipse_62%_62%_at_58%_46%,black_32%,transparent_80%)] max-md:top-0 max-md:right-[-42%] max-md:w-[118%] max-md:opacity-[0.13]"
          />
        </div>
        <div className="mx-auto max-w-7xl px-6">
          <div className="max-w-xl">
            <span className="mb-5 block font-mono text-[11px] uppercase tracking-[0.22em] text-[#0a0a0a]/40">06 — Formules</span>
            <h2 className="text-[#737373] text-balance text-4xl font-medium tracking-tight">
              <span className="text-[#0a0a0a]">Un dossier à prix fixe pour juger,</span> puis un prix par taille d&apos;agence
            </h2>
            <p className="mt-4 text-[15px] leading-[1.55] text-[#737373]">
              Chaque formule contient la précédente. Le prix se fixe à l&apos;audit, sur le nombre d&apos;opérations et la taille de
              l&apos;agence : rien de public, rien de surprenant.
            </p>
          </div>

          <div className="mt-12 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            {FORMULES.map((f) => (
              <div
                key={f.titre}
                className={`flex flex-col rounded-[12px] border p-6 ${
                  f.avant ? "border-[#0a0a0a]/15 bg-[#fafafa] shadow-lg shadow-gray-950/5" : "border-[#e5e5e5] bg-white"
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <h3 className="text-[17px] font-medium text-[#0a0a0a]">{f.titre}</h3>
                  {f.avant ? (
                    <span className="rounded-full bg-[#0a0a0a] px-2.5 py-0.5 text-[11px] font-medium text-white">Recommandée</span>
                  ) : null}
                </div>
                <span className="my-3 block text-2xl font-semibold tracking-tight text-[#0a0a0a]">{f.prix}</span>
                <p className="min-h-[2.6em] text-sm leading-[1.4] text-[#737373]">{f.pour}</p>

                <div className="mt-5">
                  {f.avant ? (
                    <StarButton href={CONTACT.audit} className="w-full">
                      Réserver un audit
                    </StarButton>
                  ) : (
                    <Link className={BOUTON_FILET} href={CONTACT.audit}>
                      Réserver un audit
                    </Link>
                  )}
                </div>

                <hr className="my-5 border-dashed border-[#e5e5e5]" />

                <ul className="list-outside space-y-3 text-sm text-[#525252]">
                  {f.lignes.map((l) => (
                    <li key={l} className="flex items-start gap-2">
                      <Check className="mt-1 size-3 shrink-0 text-[#0a0a0a]" strokeWidth={2.5} aria-hidden />
                      {l}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
