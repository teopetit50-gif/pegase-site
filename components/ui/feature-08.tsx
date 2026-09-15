"use client";

import type { ReactNode } from "react";

/* ══════════════════════════════════════════════════════════════════════
   feature-08 — les cases arpentées (14/09/2026)

   Reprise de `feature-08` de Hirael (@hirael, MIT · Mohammad Shehadeh,
   21st.dev) : des cartes sans coin, dont les quatre filets DÉPASSENT du
   cadre de 16 px comme des traits de construction, deux croix de visée
   posées à cheval sur les angles, une pastille d'icône, et un projecteur
   qui suit le pointeur. Une feuille de relevé, pas une carte marketing.

   Remplace « Ce qui vient avec le moteur » de /offres/sur-mesure : quatre
   `o-card-plate` grises 2 × 2, indiscernables des quatre cartes de la
   section « Le détail » juste au-dessus. Ici la coquille est
   différente de tout ce qui précède, à texte inchangé.

   Quatre écarts avec l'original :

   1. LES JETONS shadcn (`bg-background`, `bg-border`, `text-warm`,
      `--warm-glow`) n'existent pas : filets `--o-line`, fond blanc,
      projecteur à l'encre #09090b à 4,5 % — la charte est monochrome, le
      « warm » de Hirael n'a pas d'équivalent et n'en aura pas.
      15/09 — passage au monde clair : le fond `#0d0d10` devient
      `bg-white`, le projecteur blanc devient un projecteur d'encre (sur
      blanc, un halo blanc n'existe pas), et la pastille d'icône prend
      `--o-soft` avec un filet qui se ferme en `#a1a1aa` au survol.
   2. LES ICÔNES ARRIVENT EN JSX, pas en composant. Ce fichier est CLIENT
      (le projecteur lit `pointermove`) ; un composant d'icône EST une
      fonction, et passer une fonction d'un composant serveur à un
      composant client fait un 500 — vu deux fois sur ce site
      (`fonction-serveur-vers-composant-client`). L'appelant rend
      `<Icone />` lui-même et le passe en `ReactNode`.
   3. `Badge` et l'en-tête de section retirés : la page a son propre
      en-tête (`EnTete`), commun à toutes les sections.
   4. Grille 2 colonnes dès `sm`, pas 3 à `lg` : il y a quatre cases, et
      quatre en trois colonnes laisse une orpheline.
   ══════════════════════════════════════════════════════════════════════ */

export type CaseArpentee = {
  icone: ReactNode;
  titre: string;
  texte: string;
};

function Croix({ position }: { position: "haut" | "bas" }) {
  return (
    <svg
      aria-hidden
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1"
      strokeLinecap="round"
      className={
        "pointer-events-none absolute z-10 h-3.5 w-3.5 shrink-0 text-[var(--o-muted)] " +
        (position === "haut"
          ? "left-0 top-0 -translate-x-1/2 -translate-y-1/2"
          : "bottom-0 right-0 translate-x-1/2 translate-y-1/2")
      }
    >
      <path d="M5 12h14" />
      <path d="M12 5v14" />
    </svg>
  );
}

function Carte({ c }: { c: CaseArpentee }) {
  const suivre = (e: React.PointerEvent<HTMLDivElement>) => {
    const r = e.currentTarget.getBoundingClientRect();
    e.currentTarget.style.setProperty("--mx", `${e.clientX - r.left}px`);
    e.currentTarget.style.setProperty("--my", `${e.clientY - r.top}px`);
  };
  return (
    <div
      data-reveal
      onPointerMove={suivre}
      className="group relative flex h-full flex-col justify-start gap-5 bg-white px-6 pb-6 pt-7 sm:gap-6 sm:px-7 sm:pb-7 sm:pt-8"
    >
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-300 group-hover:opacity-100"
        style={{
          background:
            "radial-gradient(circle 200px at var(--mx, 50%) var(--my, 50%), rgba(9,9,11,0.045), transparent 70%)",
        }}
      />
      <div className="absolute -inset-y-4 -left-px w-px bg-[var(--o-line)]" />
      <div className="absolute -inset-y-4 -right-px w-px bg-[var(--o-line)]" />
      <div className="absolute -inset-x-4 -top-px h-px bg-[var(--o-line)]" />
      <div className="absolute -inset-x-4 -bottom-px h-px bg-[var(--o-line)]" />
      <Croix position="haut" />
      <Croix position="bas" />

      <div className="relative z-10 flex w-fit items-center justify-center rounded-md border border-[var(--o-line)] bg-[var(--o-soft)] p-3 text-[var(--o-text)] transition-colors duration-300 group-hover:border-[#a1a1aa] [&>svg]:h-5 [&>svg]:w-5">
        {c.icone}
      </div>
      <div className="relative z-10 flex flex-col gap-2">
        <h3
          className="text-[18px] font-semibold tracking-[-0.02em] text-[var(--o-text)]"
          style={{ fontFamily: "var(--font-jakarta)" }}
        >
          {c.titre}
        </h3>
        <p className="o-body !text-[15px] !leading-[1.7]">{c.texte}</p>
      </div>
    </div>
  );
}

export function Feature08({ cases }: { cases: CaseArpentee[] }) {
  return (
    <div className="mx-auto grid w-full max-w-[1040px] grid-cols-1 gap-8 px-4 sm:grid-cols-2">
      {cases.map((c) => (
        <Carte key={c.titre} c={c} />
      ))}
    </div>
  );
}
