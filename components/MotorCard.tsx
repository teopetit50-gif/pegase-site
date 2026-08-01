"use client";

/* Carte moteur signature — charte v2 : CARTE BLANCHE à ombre douce sur
   section claire (le verre sombre vit désormais côté monde sombre).
   Conservé : tilt 3D amorti + parallaxe interne, bordure spotlight accent
   qui suit le curseur, reflet diagonal (assombri), pulse d'icône, lueur
   famille en dégradé pastel (permanente sur tactile). Le ShaderGradient
   sombre est retiré (contresens sur carte claire). Textes AA sur blanc :
   accents texte assombris par famille. */

import Link from "next/link";
import dynamic from "next/dynamic";
import { useCallback, useEffect, useRef, useState } from "react";
import Reveal from "./Reveal";
import { SystemLogo } from "./logos";
import type { Moteur } from "@/lib/content";

const LiquidGlass = dynamic(() => import("liquid-glass-react"), { ssr: false });

/* Accents par famille — rgb graphique + texte assombri AA sur blanc. */
const FAMILY = {
  "text-gold": { rgb: "180, 83, 9", texte: "#b45309", logo: "text-gold" },
  "text-mint": { rgb: "4, 120, 87", texte: "#047857", logo: "text-mint" },
  "text-sky": { rgb: "3, 105, 161", texte: "#0369a1", logo: "text-sky" },
} as const;

type FamilyKey = keyof typeof FAMILY;

/* Brillance des cartes : GRIS SATIN neutre (Teo 21/07 — plus de reflets
   orange/vert par famille, un seul reflet argenté satiné pour toutes) */
const SATIN = "122, 126, 136";

const MAX_TILT = 6;
const SPRING = 0.12;

export default function MotorCard({
  moteur,
  accent,
  idx,
}: {
  moteur: Moteur;
  accent: string;
  idx: number;
}) {
  const fam = FAMILY[(accent as FamilyKey) in FAMILY ? (accent as FamilyKey) : "text-gold"];

  const cardRef = useRef<HTMLDivElement>(null);
  const sheenRef = useRef<HTMLDivElement>(null);
  const ringRef = useRef<HTMLSpanElement>(null);

  const target = useRef({ rx: 0, ry: 0, mx: 50, my: 50 });
  const current = useRef({ rx: 0, ry: 0, mx: 50, my: 50 });
  const rafId = useRef<number | null>(null);
  const hovering = useRef(false);
  const [interactive, setInteractive] = useState(false);

  useEffect(() => {
    const fine = window.matchMedia("(hover: hover) and (pointer: fine)").matches;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    setInteractive(fine && !reduced);
  }, []);

  const tick = useCallback(() => {
    const el = cardRef.current;
    if (!el) return;
    const c = current.current;
    const t = target.current;
    c.rx += (t.rx - c.rx) * SPRING;
    c.ry += (t.ry - c.ry) * SPRING;
    c.mx += (t.mx - c.mx) * 0.25;
    c.my += (t.my - c.my) * 0.25;
    el.style.transform = `rotateX(${c.rx.toFixed(3)}deg) rotateY(${c.ry.toFixed(3)}deg)`;
    el.style.setProperty("--mx", `${c.mx.toFixed(2)}%`);
    el.style.setProperty("--my", `${c.my.toFixed(2)}%`);
    const settled = Math.abs(t.rx - c.rx) < 0.01 && Math.abs(t.ry - c.ry) < 0.01;
    if (hovering.current || !settled) {
      rafId.current = requestAnimationFrame(tick);
    } else {
      el.style.transform = "";
      rafId.current = null;
    }
  }, []);

  const startLoop = useCallback(() => {
    if (rafId.current === null) rafId.current = requestAnimationFrame(tick);
  }, [tick]);

  const onPointerMove = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      if (!interactive) return;
      const el = cardRef.current;
      if (!el) return;
      const r = el.getBoundingClientRect();
      const px = (e.clientX - r.left) / r.width;
      const py = (e.clientY - r.top) / r.height;
      target.current.ry = (px - 0.5) * MAX_TILT * 2;
      target.current.rx = -(py - 0.5) * MAX_TILT * 2;
      target.current.mx = px * 100;
      target.current.my = py * 100;
      startLoop();
    },
    [interactive, startLoop]
  );

  const onPointerEnter = useCallback(() => {
    if (!interactive) return;
    hovering.current = true;
    startLoop();
    sheenRef.current?.animate(
      [
        { transform: "translateX(-220%) rotate(18deg)" },
        { transform: "translateX(320%) rotate(18deg)" },
      ],
      { duration: 950, easing: "cubic-bezier(0.25, 0.6, 0.2, 1)", delay: 60 }
    );
    ringRef.current?.animate(
      [
        { opacity: 0.4, transform: "scale(0.4)" },
        { opacity: 0, transform: "scale(1.8)" },
      ],
      { duration: 700, easing: "ease-out" }
    );
  }, [interactive, startLoop]);

  const onPointerLeave = useCallback(() => {
    if (!interactive) return;
    hovering.current = false;
    target.current.rx = 0;
    target.current.ry = 0;
    startLoop();
  }, [interactive, startLoop]);

  useEffect(
    () => () => {
      if (rafId.current !== null) cancelAnimationFrame(rafId.current);
    },
    []
  );

  return (
    <Reveal
      delay={(idx % 4) * 100}
      y={24}
      scale={0.96}
      className="w-[82vw] max-w-[340px] shrink-0 snap-center sm:w-auto sm:max-w-none"
    >
      <Link
        href={`/offres/${moteur.system.toLowerCase()}`}
        className="group block h-full [perspective:1100px]"
        aria-label={`${moteur.title} — découvrir`}
      >
        <div
          ref={cardRef}
          onPointerMove={onPointerMove}
          onPointerEnter={onPointerEnter}
          onPointerLeave={onPointerLeave}
          className="carte-claire relative h-full rounded-[var(--radius-card)] transition-shadow duration-300 [transform-style:preserve-3d] will-change-transform !shadow-[0_0_40px_-10px_rgba(15,16,19,0.20),0_0_16px_-4px_rgba(15,16,19,0.10),0_24px_48px_-18px_rgba(15,16,19,0.16)] group-hover:!shadow-[0_0_56px_-10px_rgba(15,16,19,0.28),0_0_20px_-4px_rgba(15,16,19,0.14),0_30px_60px_-20px_rgba(15,16,19,0.2)]"
          style={
            {
              "--mx": "50%",
              "--my": "50%",
              "--acc-rgb": fam.rgb,
            } as React.CSSProperties
          }
        >
          {/* ——— chrome : lueur pastel, wash, sheen (clippés) ——— */}
          <div className="pointer-events-none absolute inset-0 overflow-hidden rounded-[var(--radius-card)] [transform:translateZ(0)]">
            {/* voile nacré famille — teinte la SURFACE de la carte en continu */}
            <div
              className="absolute inset-0"
              style={{
                background: `linear-gradient(150deg, rgba(${SATIN}, 0.13) 0%, rgba(${SATIN}, 0.03) 38%, transparent 55%, rgba(${SATIN}, 0.09) 100%)`,
              }}
            />
            {/* lueur famille pastel — survol desktop, permanente sur tactile */}
            <div className="absolute inset-0 opacity-55 transition-opacity duration-700 group-hover:opacity-100 group-hover:duration-300 [@media(hover:none)]:opacity-100">
              <div
                className="card-breathe absolute inset-0"
                style={{
                  background:
                    `radial-gradient(100% 85% at 45% 108%, rgba(${SATIN}, 0.34), rgba(${SATIN}, 0.12) 50%, transparent 80%),` +
                    `radial-gradient(130% 110% at 50% 120%, rgba(${SATIN}, 0.08), transparent 72%)`,
                  filter: "blur(26px)",
                }}
              />
            </div>
            {/* réfraction liquide — desktop pointer-fine, discrète sur blanc */}
            {interactive && (
              <LiquidGlass
                elasticity={0}
                displacementScale={16}
                blurAmount={0.01}
                saturation={108}
                aberrationIntensity={0.8}
                cornerRadius={18}
                padding="0"
                className="pointer-events-none"
                style={{ position: "absolute", inset: 0, opacity: 0.3 }}
              >
                <div className="h-full w-full" />
              </LiquidGlass>
            )}
            {/* wash spotlight — halo famille qui suit le curseur */}
            <div
              className="absolute inset-0 opacity-0 transition-opacity duration-300 group-hover:opacity-100"
              style={{
                background: `radial-gradient(260px circle at var(--mx) var(--my), rgba(${SATIN}, 0.10), transparent 65%)`,
              }}
            />
            {/* reflet diagonal — assombri pour être lisible sur blanc */}
            <div
              ref={sheenRef}
              className="absolute -inset-y-10 left-0 w-[55%] [transform:translateX(-220%)_rotate(18deg)]"
              style={{
                background:
                  "linear-gradient(100deg, transparent 8%, rgba(15,16,19,0.03) 46%, rgba(15,16,19,0.055) 50%, rgba(15,16,19,0.03) 54%, transparent 92%)",
              }}
            />
          </div>

          {/* ——— bordure spotlight : liseré accent qui suit le curseur ——— */}
          <span
            aria-hidden
            className="absolute inset-0 rounded-[var(--radius-card)] p-px opacity-0 transition-opacity duration-300 group-hover:opacity-100 [transform:translateZ(1px)]"
            style={{
              background: `radial-gradient(150px circle at var(--mx) var(--my), rgba(${SATIN}, 0.8), rgba(${SATIN}, 0.12) 55%, transparent 75%)`,
              WebkitMask:
                "linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)",
              WebkitMaskComposite: "xor",
              maskComposite: "exclude",
            }}
          />

          {/* ——— contenu — parallaxe interne par translateZ ——— */}
          <div className="relative flex h-full flex-col px-6 pb-7 pt-7 [transform-style:preserve-3d] sm:px-7 sm:pb-8 sm:pt-8">
            <div className={`relative w-fit ${fam.logo} [transform:translateZ(44px)]`}>
              <span
                ref={ringRef}
                aria-hidden
                className="absolute -inset-2 rounded-full opacity-0"
                style={{ background: `radial-gradient(circle, rgba(${SATIN}, 0.35), transparent 70%)` }}
              />
              <span className="relative block transition-transform duration-300 ease-out group-hover:-rotate-3 group-hover:scale-110">
                <SystemLogo system={moteur.system} />
              </span>
            </div>
            <div className="mt-6 text-[17px] font-medium leading-snug text-[#0f1013] [transform:translateZ(28px)] sm:text-[19px]">
              <span className="metal-text-dark">{moteur.system}</span>
              {moteur.title.startsWith(moteur.system)
                ? moteur.title.slice(moteur.system.length)
                : moteur.title}
            </div>
            <p className="mt-3 text-[14px] leading-relaxed text-[#52555c] [transform:translateZ(12px)]">
              {moteur.job}
            </p>
            <div className="mt-auto pt-6 [transform-style:preserve-3d]">
              <p className="flex gap-2.5 text-[14px] font-medium leading-snug text-[#0f1013]/90 [transform:translateZ(12px)]">
                <span
                  aria-hidden
                  className="mt-[7px] h-1 w-1 shrink-0 rounded-full bg-[rgb(var(--acc-rgb))] transition-[transform,box-shadow] duration-300 group-hover:scale-150 group-hover:shadow-[0_0_10px_2px_rgba(var(--acc-rgb),0.5)]"
                />
                <span className="transition-colors duration-300 group-hover:text-black">
                  {moteur.benefit}
                </span>
              </p>
              <span
                className="mt-4 inline-flex items-center gap-1.5 text-[13px] font-medium text-black/45 transition-colors duration-300 [transform:translateZ(20px)]"
                style={{ ["--hov" as string]: fam.texte }}
              >
                <span
                  aria-hidden
                  className="transition-transform duration-300 group-hover:translate-x-1"
                >
                  →
                </span>
                <span className="group-hover:text-[var(--hov)]">découvrir</span>
              </span>
            </div>
          </div>
        </div>
      </Link>
    </Reveal>
  );
}
