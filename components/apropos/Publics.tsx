"use client";

/* « À qui on parle » — le sélecteur + la grille de /contact (À propos).
   Calque direct de qonto.com/en/customers § « Explore their experiences » :
   H2 centré, contrôle segmenté centré (piste grise, pastille active blanche
   ombrée), puis une grille de cartes ; chez Qonto ce sont des histoires
   clients, ici les moteurs de la famille sélectionnée — Omega n'a pas de
   témoignage client à afficher et refs-qonto/NOTES-DESIGN.md interdit d'en
   inventer un.

   Deux partis pris de robustesse repris de ServicesTabs (mêmes bugs déjà
   payés une fois) :
   — aucune animation d'opacité au changement d'onglet : un panneau resté à 0
     serait une page vide si le rAF est throttlé.
   — aucun [data-reveal] DANS la grille : ScrollTrigger ne capture que les
     éléments présents au montage, ceux injectés au clic resteraient figés à
     opacity 0. Le reveal est porté par le conteneur, pas par les cartes. */

import Link from "next/link";
import { useRef, useState } from "react";
import { FAMILLES } from "@/lib/content";
import { SystemLogo } from "@/components/logos";

/* pastille de famille — même code couleur que le reste du site */
const POINT: Record<string, string> = {
  defensifs: "#f78320",
  offensifs: "#2fe6a8",
  pepites: "#67caf2",
};

/* libellé court de l'onglet : « Moteurs défensifs » → « Défensifs » */
const ONGLET: Record<string, string> = {
  defensifs: "Défensifs",
  offensifs: "Offensifs",
  pepites: "Pépites",
};

/* « PAYD — relance devis & factures » → « relance devis & factures » */
const sansNom = (titre: string, nom: string) =>
  titre.startsWith(nom)
    ? titre.slice(nom.length).replace(/^\s*[ : –-]\s*/, "")
    : titre;

export default function Publics() {
  const [actif, setActif] = useState(FAMILLES[0].id);
  const refs = useRef<(HTMLButtonElement | null)[]>([]);
  const famille = FAMILLES.find((f) => f.id === actif) ?? FAMILLES[0];

  /* navigation clavier attendue d'un role="tablist" */
  const onKey = (e: React.KeyboardEvent, i: number) => {
    const suivant =
      e.key === "ArrowRight" ? i + 1 : e.key === "ArrowLeft" ? i - 1 : null;
    if (suivant === null) return;
    e.preventDefault();
    const j = (suivant + FAMILLES.length) % FAMILLES.length;
    setActif(FAMILLES[j].id);
    refs.current[j]?.focus();
  };

  return (
    <section
      data-monde="clair"
      className="monde-clair px-6 pb-20 pt-20 sm:px-10 sm:pb-28 sm:pt-28"
    >
      <h2
        data-intertitre
        className="mx-auto max-w-[20ch] text-center text-[30px] font-bold leading-[1.06] tracking-[-0.03em] text-[#0f1013] sm:text-[52px]"
      >
        Ce qu&apos;on installe
      </h2>
      <p
        data-reveal
        className="mx-auto mt-6 max-w-2xl text-center text-[16px] leading-relaxed text-[#52555c] sm:text-[18px]"
      >
        Douze moteurs, répartis en trois familles. Aucun n&apos;est un logiciel
        à adopter : chacun se branche sur les outils que vous utilisez déjà
        votre boîte mail, votre tableur, WhatsApp.
      </p>

      {/* ——— contrôle segmenté (piste grise, pastille active blanche) ——— */}
      <div
        data-reveal
        role="tablist"
        aria-label="Familles de moteurs"
        className="mx-auto mt-10 flex w-fit items-center gap-1 rounded-full bg-black/[0.055] p-1.5 sm:mt-12"
      >
        {FAMILLES.map((f, i) => {
          const on = f.id === actif;
          return (
            <button
              key={f.id}
              ref={(el) => {
                refs.current[i] = el;
              }}
              type="button"
              role="tab"
              aria-selected={on}
              aria-controls="panneau-famille"
              tabIndex={on ? 0 : -1}
              onClick={() => setActif(f.id)}
              onKeyDown={(e) => onKey(e, i)}
              className={`flex items-center gap-2 rounded-full px-4 py-2.5 text-[14px] font-medium transition sm:px-6 sm:text-[15px] ${
                on
                  ? "bg-white text-[#0f1013] shadow-[0_2px_8px_-1px_rgba(15,16,19,0.16),0_1px_3px_rgba(15,16,19,0.1)]"
                  : "text-[#52555c] hover:text-[#0f1013]"
              }`}
            >
              <span
                aria-hidden
                className="h-1.5 w-1.5 shrink-0 rounded-full"
                style={{ background: on ? POINT[f.id] : "rgba(15,16,19,0.22)" }}
              />
              {ONGLET[f.id] ?? f.tag}
            </button>
          );
        })}
      </div>

      {/* ——— le panneau : la promesse de la famille + ses quatre moteurs ——— */}
      <div
        id="panneau-famille"
        role="tabpanel"
        aria-live="polite"
        className="mx-auto mt-12 max-w-[1120px] sm:mt-14"
      >
        <p className="mx-auto max-w-3xl text-center text-[17px] leading-[1.75] text-[#52555c] sm:text-[19px]">
          {famille.desc}
        </p>

        <div className="mt-10 grid gap-5 sm:mt-12 sm:gap-6 lg:grid-cols-2">
          {famille.moteurs.map((m) => (
            <Link
              key={m.system}
              href={`/offres/${m.system.toLowerCase()}`}
              className="carte-claire carte-claire-lien group relative flex h-full flex-col rounded-[var(--radius-card)] p-7 sm:p-8"
            >
              {/* flèche cerclée en haut à droite — l'affordance Qonto */}
              <span
                aria-hidden
                className="absolute right-6 top-6 grid h-9 w-9 place-items-center rounded-full border border-black/10 text-[15px] text-[#0f1013] transition group-hover:border-black/35 sm:right-7 sm:top-7"
              >
                <span className="transition-transform duration-300 group-hover:translate-x-[2px]">
                  →
                </span>
              </span>

              <SystemLogo system={m.system} />

              <div className="mt-6 flex items-center gap-2.5">
                <span
                  aria-hidden
                  className="h-1.5 w-1.5 rounded-full"
                  style={{ background: POINT[famille.id] }}
                />
                <span className="font-mono text-[11px] uppercase tracking-[0.16em] text-black/55">
                  {famille.tag}
                </span>
              </div>

              <h3 className="mt-3 pr-12 text-[21px] font-semibold tracking-[-0.02em] text-[#0f1013] sm:text-[23px]">
                {m.system}
                <span className="font-medium text-[#52555c]">
                  {" : "}
                  {sansNom(m.title, m.system)}
                </span>
              </h3>

              <p className="mt-4 text-[15px] leading-[1.8] text-[#52555c]">
                {m.job}
              </p>

              <div className="mt-auto flex items-center justify-between gap-4 pt-7">
                <span
                  className="text-[14px] font-medium leading-snug"
                  style={{ color: "#8a6519" }}
                >
                  {m.benefit}
                </span>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
