"use client";

/* « Ils en parlent » — calque de qonto.com/en/customers § « Explore their
   experiences » : H2 centré, sélecteur segmenté par type de client, puis la
   grille de cartes histoires (photo, titre, méta « taille • secteur », lien
   « Lire l'histoire »).

   La section se remplit depuis lib/temoignages.ts et NE S'AFFICHE PAS tant
   que HISTOIRES est vide — la page reste donc publiable sans preuve sociale,
   et gagne cette section le jour où Teo colle ses avis. Aucun contenu n'est
   fabriqué ici.

   Robustesse (mêmes règles que Publics.tsx) : aucune animation d'opacité au
   changement d'onglet, aucun [data-reveal] dans la grille injectée au clic. */

import { useRef, useState } from "react";
import { HISTOIRES, PROFILS } from "@/lib/temoignages";

export default function Avis() {
  /* on ne garde que les onglets qui ont réellement des histoires */
  const onglets = PROFILS.filter((p) =>
    HISTOIRES.some((h) => h.profil === p.cle)
  );
  const [actif, setActif] = useState(onglets[0]?.cle ?? "");
  const refs = useRef<(HTMLButtonElement | null)[]>([]);

  /* rien à montrer → la section n'existe pas */
  if (HISTOIRES.length === 0) return null;

  /* un seul profil renseigné → pas de sélecteur, on montre tout */
  const avecOnglets = onglets.length > 1;
  const liste = avecOnglets
    ? HISTOIRES.filter((h) => h.profil === actif)
    : HISTOIRES;

  const onKey = (e: React.KeyboardEvent, i: number) => {
    const suivant =
      e.key === "ArrowRight" ? i + 1 : e.key === "ArrowLeft" ? i - 1 : null;
    if (suivant === null) return;
    e.preventDefault();
    const j = (suivant + onglets.length) % onglets.length;
    setActif(onglets[j].cle);
    refs.current[j]?.focus();
  };

  return (
    <section
      data-monde="clair"
      className="monde-clair px-6 pb-20 pt-4 sm:px-10 sm:pb-28"
    >
      <h2
        data-intertitre
        className="mx-auto max-w-[20ch] text-center text-[30px] font-bold leading-[1.06] tracking-[-0.03em] text-[#0f1013] sm:text-[52px]"
      >
        Ils en parlent
      </h2>

      {avecOnglets && (
        <div
          data-reveal
          role="tablist"
          aria-label="Types de clients"
          className="mx-auto mt-10 flex w-fit flex-wrap items-center justify-center gap-1 rounded-full bg-black/[0.055] p-1.5 sm:mt-12"
        >
          {onglets.map((p, i) => {
            const on = p.cle === actif;
            return (
              <button
                key={p.cle}
                ref={(el) => {
                  refs.current[i] = el;
                }}
                type="button"
                role="tab"
                aria-selected={on}
                aria-controls="panneau-avis"
                tabIndex={on ? 0 : -1}
                onClick={() => setActif(p.cle)}
                onKeyDown={(e) => onKey(e, i)}
                className={`rounded-full px-4 py-2.5 text-[14px] font-medium transition sm:px-6 sm:text-[15px] ${
                  on
                    ? "bg-white text-[#0f1013] shadow-[0_2px_8px_-1px_rgba(15,16,19,0.16),0_1px_3px_rgba(15,16,19,0.1)]"
                    : "text-[#52555c] hover:text-[#0f1013]"
                }`}
              >
                {p.label}
              </button>
            );
          })}
        </div>
      )}

      <div
        id="panneau-avis"
        role={avecOnglets ? "tabpanel" : undefined}
        className="mx-auto mt-12 grid max-w-[1120px] gap-5 sm:mt-14 sm:gap-6 lg:grid-cols-3"
      >
        {liste.map((h) => (
          <article
            key={h.cle}
            className="carte-claire flex h-full flex-col overflow-hidden rounded-[var(--radius-card)]"
          >
            {/* visuel — aplat teinté si aucune photo n'est fournie */}
            <div className="relative aspect-[16/10] w-full overflow-hidden bg-black/[0.06]">
              {h.photo ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={h.photo}
                  alt=""
                  className="h-full w-full object-cover"
                />
              ) : null}
              {h.moteur && (
                <span className="absolute left-4 top-4 rounded-full bg-white/95 px-3 py-1.5 font-mono text-[10px] uppercase tracking-[0.14em] text-[#0f1013] shadow-sm">
                  {h.moteur}
                </span>
              )}
            </div>

            <div className="flex flex-1 flex-col p-7">
              <h3 className="text-[19px] font-semibold leading-snug tracking-[-0.02em] text-[#0f1013] sm:text-[21px]">
                {h.titre}
              </h3>
              <p className="mt-3 text-[15px] leading-[1.8] text-[#52555c]">
                {h.resume}
              </p>
              {(h.taille || h.secteur) && (
                <div className="mt-auto pt-7 font-mono text-[11px] uppercase tracking-[0.14em] text-black/55">
                  {[h.taille, h.secteur].filter(Boolean).join(" • ")}
                </div>
              )}
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
