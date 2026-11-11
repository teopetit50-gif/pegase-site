/* ══════════════════════════════════════════════════════════════════════
   Tamila sur le dessin Radius — les briques communes (11/11/2026)

   Recopiées classe pour classe du HTML servi par le modèle
   (https://radius.nextjsshop-preview.workers.dev/, relevé dans le
   scratchpad de la session) :
   · `Conteneur` : la colonne de 1500 px des sections (px 16 / 24 / 32 /
     48) ; `large` donne celle de 1280 px de la barre, du héros et du
     bandeau (max-w-7xl, px 16 / 24 / 32) ;
   · `Amorce`, `Titre`, `Chapo` : le trio de tête de chaque section ;
   · `Halo` : les deux anneaux qui entourent chaque fenêtre d'exemple —
     un cadre blanc à 25 % de 8 px, et un filet blanc voilé de gauche à
     droite (`mask-image`), au rayon de la fenêtre + 8 px ;
   · `Visuel` : la vignette 4:3 des cartes « pourquoi » et « outils » —
     le fond passé en caractères (public/secteurs-avocats/fond.jpg, voir
     page.tsx) et son voile en deux dégradés ;
   · `Trait` : une ligne icône + titre + texte des listes « plan » et
     « rapport » ; `Pastille` : le carré d'icône des grilles ;
   · `Avatar` : le signe de Tamila ou les initiales d'un rôle dans les
     fils de messages (le modèle montrait des portraits Unsplash : ici,
     aucun visage inventé).
   ══════════════════════════════════════════════════════════════════════ */
import Image from "next/image";
import type { CSSProperties, ReactNode } from "react";
import { Glyphe } from "./marque";

export const FOND = "/secteurs-avocats/fond.jpg";

export function Conteneur({ children, large = false, className = "" }: { children: ReactNode; large?: boolean; className?: string }) {
  return (
    <div className={`${large ? "mx-auto max-w-7xl px-4 sm:px-6 lg:px-8" : "mx-auto max-w-[1500px] px-4 sm:px-6 md:px-8 lg:px-12"} ${className}`}>
      {children}
    </div>
  );
}

/* la section standard du modèle : filet haut, fond #fafaf9, respiration 64 → 112 px */
export const SECTION = "border-t border-[#e5e5e3] bg-[#fafaf9] py-16 sm:py-20 md:py-24 lg:py-28 scroll-mt-16 sm:scroll-mt-[72px]";

export function Amorce({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <p className={`text-sm font-normal text-[#524f49] sm:text-base ${className}`}>{children}</p>;
}

export function Titre({ id, children, className = "" }: { id: string; children: ReactNode; className?: string }) {
  return (
    <h2 id={id} className={`text-2xl font-normal leading-[1.2] tracking-[-0.015em] text-[#0f0e0d] sm:text-3xl md:text-4xl lg:text-[2.4rem] ${className}`}>
      {children}
    </h2>
  );
}

export function Chapo({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <p className={`text-sm leading-normal text-[#524f49] sm:text-base ${className}`}>{children}</p>;
}

export function Halo({ rayon = "0.5rem", sombre = false }: { rayon?: string; sombre?: boolean }) {
  const r = `calc(${rayon} + 8px)`;
  return (
    <>
      <span aria-hidden="true" className="pointer-events-none absolute -inset-2 border-[8px] border-white/25" style={{ borderRadius: r }} />
      <span
        aria-hidden="true"
        className={`pointer-events-none absolute -inset-2 border ${sombre ? "border-[#71717b]/50" : "border-white"}`}
        style={{ borderRadius: r, WebkitMaskImage: "linear-gradient(90deg, #fff, transparent)", maskImage: "linear-gradient(90deg, #fff, transparent)" }}
      />
    </>
  );
}

export function Visuel({ children, arrondi = true }: { children: ReactNode; arrondi?: boolean }) {
  return (
    <div className="pointer-events-none relative aspect-[4/3] select-none overflow-hidden rounded-md bg-[#f2f1f0]">
      <Image alt="" fill sizes="(max-width: 768px) 100vw, (max-width: 1024px) 50vw, 33vw" className="object-cover" src={FOND} />
      <div
        className={`pointer-events-none absolute inset-0 ${arrondi ? "rounded-md" : ""}`}
        style={{ background: "linear-gradient(135deg,rgba(255,255,255,0.18),transparent 50%),linear-gradient(135deg,transparent 50%,rgba(0,0,0,0.06))" }}
      />
      {children}
    </div>
  );
}

export function Pastille({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <div className={`grid h-9 w-9 shrink-0 place-items-center rounded-md bg-[#f2f1f0] text-[#0f0e0d] sm:h-10 sm:w-10 ${className}`}>{children}</div>;
}

export function Trait({ icone, titre, texte, premier = false }: { icone: ReactNode; titre: string; texte: string; premier?: boolean }) {
  return (
    <div className={`flex items-start gap-4 py-5 sm:py-6 ${premier ? "" : "border-t border-[#e5e5e3]"}`}>
      <Pastille>{icone}</Pastille>
      <div className="flex min-w-0 flex-col gap-2 sm:gap-3">
        <h3 className="text-base font-medium leading-[1.3] text-[#0f0e0d] sm:text-lg">{titre}</h3>
        <p className="text-sm leading-relaxed text-[#524f49]">{texte}</p>
      </div>
    </div>
  );
}

/* l'avatar d'un fil : le signe pour Tamila, deux lettres pour un rôle */
export function Avatar({ de, className = "h-7 w-7 rounded-md" }: { de: string; className?: string }) {
  const tamila = de === "Tamila";
  return (
    <div className={`inline-flex shrink-0 items-center justify-center overflow-hidden bg-[#f2f1f0] ${className}`}>
      {tamila ? <Glyphe className="size-4 text-[#0f0e0d]" /> : <span className="text-[10px] font-medium text-[#524f49]">{de.slice(0, 2).toUpperCase()}</span>}
    </div>
  );
}

export type Message = { de: string; heure: string; texte: string; mention?: string };

/* le fil de messages du modèle (fenêtre « diagnostics » / « ask-radius ») */
export function Fil({ titre, messages, icone }: { titre: string; messages: Message[]; icone: ReactNode }) {
  return (
    <div className="grid h-full grid-rows-[auto_1fr] overflow-hidden rounded-tl-lg bg-[#fafaf9] shadow-sm ring-1 ring-white/60">
      <div className="flex items-center gap-1.5 border-b border-[#e5e5e3] px-3 py-2">
        {icone}
        <span className="text-[11px] font-medium text-[#0f0e0d] sm:text-xs md:text-sm">{titre}</span>
      </div>
      <div className="flex flex-col gap-3 py-3">
        {messages.map((m, i) => (
          <div key={i} className="flex flex-row items-start gap-2 px-3">
            <Avatar de={m.de} />
            <div className="flex min-w-0 flex-col">
              <div className="flex items-baseline gap-1.5 text-[11px] font-medium text-[#0f0e0d] sm:text-xs md:text-sm">
                {m.de}
                <span className="text-[10px] font-normal text-[#6e6a65] sm:text-[11px]">{m.heure}</span>
              </div>
              <p className="text-[11px] leading-normal text-[#524f49] sm:text-xs md:text-sm">
                {m.mention ? <span className="font-medium text-[#0f0e0d]">{m.mention} </span> : null}
                {m.texte}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export const STYLE_PLEIN: CSSProperties = { position: "absolute", height: "100%", width: "100%", left: 0, top: 0, right: 0, bottom: 0 };
