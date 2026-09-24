"use client";
/* ══════════════════════════════════════════════════════════════════════
   Lorani (agences d'architecture) — revelation.tsx
   COPIÉ le 24/09/2026 à 14 h 57 de `OMEGA/dossieros-site/src/components/
   ui/focus-reveal.tsx`. Seul changement : l'ordre « random » (inutilisé ici, le héros révèle depuis le début)
   tirait `Math.random()` pendant le rendu, que la règle react-hooks/purity du site refuse ; il devient un mélange
   déterministe.
   Ce qu'en disait la source :
   ══════════════════════════════════════════════════════════════════════ */
/* Focus Reveal — titre révélé lettre à lettre (flou 12 px, échelle 1,45 → 1), port du composant de la référence. */
import React, { useMemo } from "react";
import { motion, useReducedMotion } from "framer-motion";

const EASE: [number, number, number, number] = [0.215, 0.61, 0.355, 1];
export interface FocusRevealProps {
  text: string;
  as?: "h1" | "h2" | "h3" | "p" | "span";
  className?: string;
  blur?: number;
  staggerFrom?: "start" | "end" | "center" | "random";
  duration?: number;
  delay?: number;
  stagger?: number;
}

export default function FocusReveal({
  text,
  as = "h1",
  className = "",
  blur = 20,
  staggerFrom = "start",
  duration = 0.3,
  delay = 0,
  stagger = 0.035,
}: FocusRevealProps) {
  const reduced = useReducedMotion() === true;
  const chars = useMemo(() => text.split(""), [text]);
  const b = Math.min(Math.max(blur, 0), 20);
  const delays = useMemo(() => {
    const n = chars.length,
      st = reduced ? 0 : stagger;
    if (staggerFrom === "random") {
      const idx = Array.from({ length: n }, (_, i) => i);
      for (let i = n - 1; i > 0; i--) {
        // mélange DÉTERMINISTE (même ordre au serveur et au client, rendu pur) : la source tirait Math.random()
        const j = (i * 7919 + 13) % (i + 1);
        [idx[i], idx[j]] = [idx[j], idx[i]];
      }
      return idx.map((k) => delay + k * st);
    }
    if (staggerFrom === "end") return Array.from({ length: n }, (_, i) => delay + (n - 1 - i) * st);
    if (staggerFrom === "center") {
      const c = (n - 1) / 2;
      return Array.from({ length: n }, (_, i) => delay + Math.abs(i - c) * st);
    }
    return Array.from({ length: n }, (_, i) => delay + i * st);
  }, [chars.length, reduced, staggerFrom, delay, stagger]);
  const words = useMemo(() => {
    const out: { chars: string[]; start: number }[] = [];
    let k = 0;
    for (const w of text.split(/(\s+)/)) {
      if (!w.length) continue;
      const cs = w.split("");
      out.push({ chars: cs, start: k });
      k += cs.length;
    }
    return out;
  }, [text]);
  const Tag = motion[as];
  const init = reduced ? { opacity: 0 } : { opacity: 0, scale: 1.45, filter: `blur(${b}px)` };
  const anim = reduced ? { opacity: 1 } : { opacity: 1, scale: 1, filter: "blur(0px)" };
  return (
    <Tag aria-label={text} className={className} style={{ margin: 0, display: "block", width: "100%" }}>
      {words.map((w, wi) => {
        const space = w.chars.every((c) => /\s/.test(c));
        return (
          <span key={wi} className={space ? undefined : "inline-block whitespace-nowrap"} aria-hidden="true">
            {w.chars.map((c, ci) => {
              const i = w.start + ci;
              return (
                <motion.span
                  key={i}
                  className="inline-block will-change-[transform,opacity,filter]"
                  initial={init}
                  animate={anim}
                  transition={{ type: "tween", duration: reduced ? 0.15 : duration, delay: delays[i] ?? 0, ease: EASE }}
                >
                  {c === " " ? " " : c}
                </motion.span>
              );
            })}
          </span>
        );
      })}
    </Tag>
  );
}
