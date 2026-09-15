"use client";

import { useRef } from "react";
import "./flow-cards.css";

/* ══════════════════════════════════════════════════════════════════════
   flow-cards — les étapes en cartes monochromes animées (14/09/2026)

   Reprise de `bento-monochrome-1` de @larsen66 (21st.dev) : une grille de
   cartes, chacune avec son rang, une pastille de phase, un titre, un
   texte, et à droite un pictogramme abstrait qui bouge en boucle — une
   aiguille qui tourne, deux traits qui se relaient, une onde, des anneaux
   qui s'élargissent. Une lueur suit le pointeur sur la carte survolée.
   C'est du noir et blanc de bout en bout : c'est pour ça qu'il est pris.

   15/09 — MONDE CLAIR. Cartes `--o-soft` (#fafafa) sur la page blanche,
   filet au survol `#d4d4d8`, disque du pictogramme blanc. Le trait du
   pictogramme et la lueur au pointeur passent à l'encre dans
   `flow-cards.css` (`--fc-stroke`, `--fc-trail`, `--fc-glow`) : le
   composant n'en connaît que les noms.

   Remplace « Le détail » de /offres/sur-mesure : trois paragraphes de
   500 signes dans des cartes numérotées, plus une quatrième carte qui
   répétait le texte « Vous gardez la main » déjà affiché dans le hero.
   Les quatre ÉTAPES de la fiche (`etapes`), que le gabarit n'affichait
   nulle part depuis le 26/07, prennent leur place : cadrage, devis,
   construction, mise en service — c'est exactement ce que le troisième
   paragraphe racontait en prose.

   Ce qui a été jeté, et pourquoi :
   • Le détecteur de thème (MutationObserver, matchMedia, localStorage) et
     le bouton jour/nuit : la page a un seul monde, point.
   • Le bandeau de métriques (« 19 days », « 99.5% ») et le pied
     (« Copy layout tokens ») : chiffres de démonstration, rien à afficher
     ici sans inventer.
   • La ligne de statistique en bas de chaque carte (« Scope commit ·
     48 hrs ») : même raison — aucun délai ne s'annonce sur ce site.
   • Le fond quadrillé pleine page : la section vit dans la colonne du
     site, sur le fond de la page.
   • La feuille injectée dans <head> devient `flow-cards.css`.
   • L'apparition par IntersectionObserver devient `data-reveal`.

   Deux points de mise en œuvre :
   • UNE SEULE MISE EN PAGE à toutes les largeurs : rang et phase à
     gauche, pictogramme à droite, sur une même ligne ; le titre et le
     texte dessous. L'original posait rang | corps | pictogramme en trois
     colonnes à partir de `lg` et les EMPILAIT dessous : à 390 px chaque
     carte faisait quatre rangées (le rang seul sur la sienne, le
     pictogramme seul sur la sienne) — 500 px par étape, 1 988 px de
     section. Même contenu sur une ligne d'en-tête : ~300 px par carte.
   • Composant CLIENT pour la lueur au pointeur (deux variables CSS posées
     au `mousemove`). Rien d'autre ne justifie le client ; les icônes sont
     du CSS pur, donc aucune fonction ne traverse la frontière serveur →
     client.
   • `border` toujours coloré : en Tailwind v4, `border` seul peint en
     `currentColor`.
   ══════════════════════════════════════════════════════════════════════ */

export type VarianteFlux = "orbit" | "relay" | "wave" | "spark";

export type EtapeFlux = {
  rang: string;
  meta: string;
  titre: string;
  texte: string;
  variante: VarianteFlux;
};

function CarteFlux({ etape }: { etape: EtapeFlux }) {
  const ref = useRef<HTMLElement>(null);

  const suivre = (e: React.MouseEvent<HTMLElement>) => {
    const el = ref.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    el.style.setProperty("--fc-x", `${e.clientX - r.left}px`);
    el.style.setProperty("--fc-y", `${e.clientY - r.top}px`);
  };
  const quitter = () => {
    const el = ref.current;
    if (!el) return;
    el.style.removeProperty("--fc-x");
    el.style.removeProperty("--fc-y");
  };

  return (
    <article
      ref={ref}
      data-reveal
      className="fc-card group relative overflow-hidden rounded-[24px] border border-[var(--o-line)] bg-[var(--o-soft)] p-6 transition-colors duration-500 hover:border-[#d4d4d8] sm:p-8"
      onMouseMove={suivre}
      onMouseLeave={quitter}
    >
      <div className="relative z-10 flex items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <span className="text-[12px] uppercase tracking-[0.3em] text-[var(--o-text)] opacity-50">
            {etape.rang}
          </span>
          <span className="inline-flex items-center rounded-full border border-[var(--o-line)] px-3 py-1 text-[10px] uppercase tracking-[0.35em] text-[var(--o-muted)]">
            {etape.meta}
          </span>
        </div>
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full border border-[var(--o-line)] bg-white lg:h-14 lg:w-14">
          <span className="fc-icon" data-variant={etape.variante}>
            <span />
          </span>
        </div>
      </div>
      <h3 className="o-h5 relative z-10 mt-5">{etape.titre}</h3>
      <p className="o-body relative z-10 mt-2.5 !text-[15px] !leading-[1.7]">{etape.texte}</p>
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-500 group-hover:opacity-100"
        style={{
          background:
            "radial-gradient(220px circle at var(--fc-x, 50%) var(--fc-y, 50%), var(--fc-glow), transparent 68%)",
        }}
      />
    </article>
  );
}

export function FlowCards({ etapes }: { etapes: EtapeFlux[] }) {
  return (
    <div className="grid grid-cols-1 gap-5 md:grid-cols-2 md:gap-6 xl:gap-8">
      {etapes.map((e) => (
        <CarteFlux key={e.rang} etape={e} />
      ))}
    </div>
  );
}
