"use client";

/* « Ce qu'ils en disent » — calque de qonto.com/en/customers § « Customer
   story spotlight » : grande citation, attribution nom + rôle + entreprise,
   pagination « 1 sur 3 » avec puces cliquables.

   Se remplit depuis SPOTLIGHT (lib/temoignages.ts) et NE S'AFFICHE PAS tant
   que le tableau est vide. Une citation ne se pose ici que si la personne
   l'a réellement dite et accepté qu'elle soit publiée avec son nom — voir
   l'en-tête de lib/temoignages.ts. */

import { useState } from "react";
import { SPOTLIGHT } from "@/lib/temoignages";

export default function Spotlight() {
  const [i, setI] = useState(0);

  if (SPOTLIGHT.length === 0) return null;
  const c = SPOTLIGHT[Math.min(i, SPOTLIGHT.length - 1)];

  return (
    <section
      data-monde="clair"
      className="monde-clair px-6 pb-20 sm:px-10 sm:pb-28"
    >
      <div className="mx-auto max-w-[1120px]">
        <h2
          data-intertitre
          className="text-[24px] font-bold tracking-[-0.025em] text-[#0f1013] sm:text-[34px]"
        >
          Ce qu&apos;ils en disent
        </h2>

        <div
          data-reveal
          className="carte-claire mt-8 rounded-[var(--radius-card)] p-8 sm:mt-10 sm:p-14"
        >
          <div className="flex items-center justify-between gap-6">
            <span className="num font-mono text-[12px] uppercase tracking-[0.16em] text-black/45">
              {Math.min(i, SPOTLIGHT.length - 1) + 1} sur {SPOTLIGHT.length}
            </span>
            {SPOTLIGHT.length > 1 && (
              <div className="flex items-center gap-2">
                {SPOTLIGHT.map((x, j) => (
                  <button
                    key={x.cle}
                    type="button"
                    onClick={() => setI(j)}
                    aria-label={`Témoignage ${j + 1} — ${x.entreprise}`}
                    aria-current={j === i}
                    className={`h-2 rounded-full transition-all duration-300 ${
                      j === i
                        ? "w-7 bg-[#0f1013]"
                        : "w-2 bg-black/20 hover:bg-black/40"
                    }`}
                  />
                ))}
              </div>
            )}
          </div>

          <blockquote className="mt-8 text-[22px] font-medium leading-[1.35] tracking-[-0.02em] text-[#0f1013] sm:mt-10 sm:text-[34px]">
            <span aria-hidden style={{ color: "#8a6519" }}>
              «{" "}
            </span>
            {c.citation}
            <span aria-hidden style={{ color: "#8a6519" }}>
              {" "}
              »
            </span>
          </blockquote>

          <div className="mt-10 flex flex-wrap items-center gap-3 border-t border-black/[0.08] pt-7">
            <span className="grid h-10 w-10 place-items-center rounded-full bg-black/[0.06] text-[13px] font-semibold text-[#0f1013]">
              {c.nom
                .split(" ")
                .map((m) => m[0])
                .slice(0, 2)
                .join("")}
            </span>
            <div>
              <div className="text-[15px] font-semibold text-[#0f1013]">
                {c.nom}
              </div>
              <div className="text-[13px] text-black/50">
                {c.role} — {c.entreprise}
                {c.secteur ? ` · ${c.secteur}` : ""}
              </div>
            </div>
            {c.moteur && (
              <span className="ml-auto rounded-full border border-black/10 px-2.5 py-1 font-mono text-[10px] uppercase tracking-[0.14em] text-black/55">
                {c.moteur}
              </span>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
