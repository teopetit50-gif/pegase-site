"use client";
/* ══════════════════════════════════════════════════════════════════════
   Tavaro — GrilleModules.tsx

   COPIÉ le 24/09/2026 à 14 h 58 de `OMEGA/rentalos-site/src/components/
   grille-moteurs.tsx`. La grille était déjà claire.

   CONVERSIONS (source en Tailwind v3) :
   · échelle d'espacement EN PIXELS : `py-64` → `py-[64px]`, `p-10` →
     `p-[10px]`, `md:p-14`, `mb-24`, `gap-8/12`, `px-4/12`, `py-8`,
     `mt-4`, `scroll-mt-80`, `md:scroll-mt-64`, `group-hover:translate-x-2`
     et `-translate-y-2` → les mêmes en `[Npx]` ; `mt-6` restait sur
     l'échelle par défaut ;
   · `md:py-100` RETIRÉ : la clé 100 n'existe ni dans l'échelle de la
     source ni dans celle de Tailwind v3, l'utilitaire n'était pas émis
     (absent de la feuille compilée de rentalos-site.vercel.app). En v4,
     `py-100` vaudrait 25 rem : 400 px de marge qui n'ont jamais existé ;
   · `text-gray-500/600/950`, `border-gray-950/15` → les hexadécimaux de
     la palette v3 (#6b7280, #4b5563, #030712) : la v4 les a redessinés
     en oklch, un ton plus froids ;
   · `text-primary`, `focus-visible:outline-primary` → #1E3A8A ;
   · `rounded-8` → `rounded-[8px]` ; `blur-0` → `blur-[0px]` ;
   · `transition-[opacity,transform,filter]` de l'aperçu flottant →
     + `translate,scale` : la v4 pose `scale-[0.97]` dans la propriété
     `scale`, que `transform` ne couvre plus — sans cela l'aperçu
     sauterait d'échelle au lieu de glisser ;
   · la variante maison `touch-device:` (plugin du tailwind.config) →
     `[@media(pointer:coarse)]:`.

   MARQUE : la pastille de chaque module posait `/marque.svg` → `SigneTuile`,
   le logo officiel (marque.tsx), 18 px puis 22 px dès md.
   Les cases sont des ancres de la page (#solutions, #a-propos) : inchangées.

   REPORT DU 24/09 À 17 h 03 (seconde copie du disque) : la source est
   passée de 12 à 20 modules (textes.ts). La grille n'a rien à changer :
   2 colonnes puis 4 dès md, 20 cases = 10 rangées puis 5 rangées pleines ;
   la case « à venir » (Plan de flotte, n° 20) ferme la dernière rangée.
   ══════════════════════════════════════════════════════════════════════ */
import { useCallback, useEffect, useRef, useState } from "react";
import { MOTEURS } from "./textes";
import { SigneTuile } from "./marque";

/** « 01 / Moteurs » : la grille de la référence (2 colonnes, 4 dès md, filets
 *  gray-950/15), une case par moteur, et l'aperçu flottant qui suit le pointeur
 *  (le PilotProductPreview de la référence, avec une fiche texte à la place de
 *  la capture d'écran du projet). */
export function GrilleMoteurs() {
  const [survol, setSurvol] = useState<number | null>(null);
  const flottant = useRef<HTMLDivElement>(null);
  const pos = useRef({ x: 0, y: 0 });

  const bouger = useCallback((e: React.MouseEvent) => {
    pos.current = { x: e.clientX, y: e.clientY };
    const el = flottant.current;
    if (!el) return;
    const w = el.offsetWidth, h = el.offsetHeight;
    const x = Math.min(window.innerWidth - w - 16, e.clientX + 24);
    const y = Math.min(window.innerHeight - h - 16, e.clientY + 24);
    el.style.transform = `translate3d(${x}px, ${y}px, 0)`;
  }, []);
  useEffect(() => { if (survol === null && flottant.current) flottant.current.style.transform = ""; }, [survol]);

  const m = survol !== null ? MOTEURS.liste[survol] : null;

  return (
    <section id="moteurs" className="relative scroll-mt-[80px] py-[64px] md:scroll-mt-[64px]" aria-labelledby="moteurs-title">
      <div className="page-container wide">
        <div className="px-[clamp(6px,1vw,16px)]">
          <div onMouseMove={bouger} onMouseLeave={() => setSurvol(null)}>
            <div className="mb-[24px] max-w-[680px]">
              <h2 id="moteurs-title" className="section-label">{MOTEURS.etiquette}</h2>
            </div>
            <div className="grid grid-cols-2 border-l border-t border-[#030712]/15 md:grid-cols-4">
              {MOTEURS.liste.map((mo, i) => {
                const attenue = survol !== null && survol !== i;
                return (
                  <a
                    key={mo.numero}
                    aria-label={`${mo.nom} : ${mo.role}`}
                    href={mo.aVenir ? "#a-propos" : "#solutions"}
                    onMouseEnter={() => setSurvol(i)}
                    onFocus={() => setSurvol(i)}
                    onBlur={() => setSurvol(null)}
                    className={`group relative flex min-h-[112px] min-w-0 flex-col overflow-hidden border-b border-r border-[#030712]/15 p-[10px] transition-[background-color,filter,opacity] duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] focus-visible:z-10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-[#1E3A8A] motion-reduce:transition-colors motion-reduce:duration-300 md:min-h-[160px] md:p-[14px] ${attenue ? "opacity-40 blur-[1px]" : "opacity-100 blur-[0px]"}`}
                  >
                    <div className="relative z-10 flex min-h-0 flex-1 flex-col">
                      <div className="flex items-start justify-between gap-[12px]">
                        <span className="font-mono text-[12px] tabular-nums text-[#6b7280]">{mo.numero}</span>
                        <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true" className="text-[#030712] transition-transform duration-500 group-hover:translate-x-[2px] group-hover:-translate-y-[2px]">
                          <path d="M3.5 12.5 12.5 3.5M5.5 3.5h7v7" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                      </div>
                      <div className="flex flex-1 items-center justify-center px-[4px] py-[8px]">
                        {mo.vedette ? (
                          <h3 className="max-w-full text-center text-[clamp(15px,1.55vw,24px)] font-medium leading-[0.95] tracking-[-0.05em] text-[#030712]">{mo.nom}</h3>
                        ) : (
                          <span className={`inline-flex items-center gap-[8px] rounded-[8px] bg-[var(--accent-soft)]/70 px-[12px] py-[8px] ${mo.aVenir ? "opacity-60" : ""}`}>
                            <SigneTuile className="h-[18px] w-[18px] md:h-[22px] md:w-[22px]" />
                            <span className="f-syne text-[11px] font-semibold uppercase tracking-[0.12em] text-[#1E3A8A] md:text-[12px]">{mo.nom}</span>
                          </span>
                        )}
                      </div>
                      <p className="hidden truncate text-[10px] leading-relaxed text-[#4b5563] md:block">{mo.role}</p>
                    </div>
                  </a>
                );
              })}
            </div>
            <div
              ref={flottant}
              aria-hidden="true"
              className="[@media(pointer:coarse)]:hidden pointer-events-none fixed left-0 top-0 z-50 hidden w-[min(420px,38vw)] will-change-transform md:block"
            >
              <div className={`overflow-hidden border border-black/15 bg-white shadow-[0_24px_80px_rgba(15,23,42,0.2)] transition-[opacity,transform,translate,scale,filter] duration-[400ms] ease-[cubic-bezier(0.22,1,0.36,1)] motion-reduce:transition-opacity motion-reduce:duration-200 ${m ? "scale-100 opacity-100 blur-[0px]" : "scale-[0.97] opacity-0 blur-[4px]"}`}>
                <div className="relative aspect-[16/10] overflow-hidden bg-[#E8F1FF]">
                  {m ? (
                    <div className="absolute inset-0 flex flex-col justify-between p-[7%]">
                      <div className="flex items-center justify-between">
                        <span className="PilotProductPreview_url">tavaro · {m.nom.toLowerCase().replace(/\s+/g, "-")}</span>
                        <span className="font-mono text-[11px] tracking-[0.12em] text-[#6b7280]">{m.numero}</span>
                      </div>
                      <div>
                        <div className="f-syne text-[clamp(28px,3vw,44px)] font-semibold leading-none tracking-[-0.03em] text-[#1E3A8A]">{m.chiffre}</div>
                        <div className="mt-6 text-[13px] text-[#4b5563]">{m.chiffreLegende}</div>
                      </div>
                      <div>
                        <div className="text-[15px] font-medium tracking-[-0.02em] text-[#030712]">{m.role}</div>
                        <p className="mt-[4px] text-[12.5px] leading-[1.45] text-[#4b5563]">{m.detail}</p>
                      </div>
                    </div>
                  ) : null}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
