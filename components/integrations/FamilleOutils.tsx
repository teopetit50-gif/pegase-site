"use client";

/* ══════════════════════════════════════════════════════════════════════
   Une famille d'outils, REPLIÉE par défaut — 07/08/2026, Teo :
   « mettre tout le logo etc c'est trop, tu en mets un par section, et un
   bouton voir plus avec un fondu ».

   Repliée, la famille n'affiche que sa première carte (Google Sheets pour
   « Tableur & base »). Les autres ne sont pas masquées en CSS : elles ne
   sont pas montées du tout — c'est la seule façon d'alléger réellement la
   page, un display:none coûte le même DOM. À leur place, une tuile douce
   occupe les colonnes restantes : les pastilles des outils cachés s'y
   éteignent vers la droite (le fondu), et elle EST le bouton.

   Deux garde-fous repris de ServicesTabs, tous deux nés d'un bug :
   — aucun [data-reveal] sur les cartes dépliées. ScrollTrigger ne capture
     que ce qui existe au montage ; une carte injectée au clic resterait
     figée à l'opacité de départ, donc invisible.
   — leur entrée est une animation CSS, jamais un état d'opacité piloté par
     React. Si elle ne s'exécute pas, la carte est visible quand même.
   ══════════════════════════════════════════════════════════════════════ */

import { useId, useState } from "react";
import { ScrollTrigger } from "gsap/ScrollTrigger";

export type Outil = {
  title: string;
  hex: string;
  path: string;
  famille: string;
  role: string;
};

function Logo({ outil, taille = 26 }: { outil: Outil; taille?: number }) {
  return (
    <svg viewBox="0 0 24 24" width={taille} height={taille} fill={`#${outil.hex}`} aria-hidden>
      <path d={outil.path} />
    </svg>
  );
}

/* Carte 270×261 de la référence — inchangée, seule l'entrée diffère selon
   qu'elle est présente au montage (data-reveal, GSAP) ou injectée au clic
   (.o-outil-entre, CSS). */
function Carte({ outil, rang }: { outil: Outil; rang?: number }) {
  const injectee = rang !== undefined;
  return (
    <div
      data-reveal={injectee ? undefined : ""}
      className={`o-card flex flex-col p-[30px]${injectee ? " o-outil-entre" : ""}`}
      style={injectee ? { animationDelay: `${rang * 55}ms` } : undefined}
    >
      <span
        className="flex h-[60px] w-[60px] shrink-0 items-center justify-center rounded-full border border-[#f4f4f5] bg-white"
        aria-hidden
      >
        <Logo outil={outil} />
      </span>
      <p className="mt-6 text-[16px] font-medium leading-[28.8px] text-[#09090b]">
        {outil.title}
      </p>
      <p className="o-small !leading-[25.2px]">{outil.famille}</p>
      <p className="o-body mt-3 flex-1">{outil.role}</p>
    </div>
  );
}

function ChevronBas({ ouvert }: { ouvert: boolean }) {
  return (
    <svg
      width={13}
      height={13}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2.2}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={`o-plus-chev${ouvert ? " o-plus-chev--haut" : ""}`}
      aria-hidden
    >
      <path d="m6 9 6 6 6-6" />
    </svg>
  );
}

export default function FamilleOutils({
  famille,
  outils,
  className,
}: {
  famille: string;
  outils: Outil[];
  className?: string;
}) {
  const [ouvert, setOuvert] = useState(false);
  const id = useId();

  const caches = outils.slice(1);
  const replie = !ouvert && caches.length > 0;

  const basculer = () => {
    setOuvert((v) => !v);
    /* la page s'allonge ou se raccourcit : sans ce refresh, les starts des
       reveals situés plus bas restent calés sur l'ancienne hauteur */
    requestAnimationFrame(() => ScrollTrigger.refresh());
  };

  return (
    <section aria-labelledby={id} className={className}>
      <div className="flex items-baseline gap-3">
        <h2 id={id} data-reveal className="o-h5">
          {famille}
        </h2>
        <span className="o-small !text-[13px]">{outils.length}</span>
      </div>

      <div className="mt-6 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
        <Carte outil={outils[0]} />

        {!replie && caches.map((o, i) => <Carte key={o.title} outil={o} rang={i} />)}

        {replie && (
          <button
            type="button"
            onClick={basculer}
            aria-expanded={false}
            aria-label={
              caches.length === 1
                ? `Voir l'autre outil de la famille ${famille}`
                : `Voir les ${caches.length} autres outils de la famille ${famille}`
            }
            data-reveal
            className="o-plus lg:col-span-3"
          >
            <span className="o-plus-apercu">
              {caches.map((o) => (
                <span key={o.title} className="o-plus-chip">
                  <Logo outil={o} taille={16} />
                  {o.title}
                </span>
              ))}
            </span>
            <span className="o-plus-cta">
              Voir plus
              <ChevronBas ouvert={false} />
            </span>
          </button>
        )}
      </div>

      {ouvert && caches.length > 0 && (
        <button type="button" onClick={basculer} aria-expanded className="o-moins mt-5">
          Réduire
          <ChevronBas ouvert />
        </button>
      )}
    </section>
  );
}
