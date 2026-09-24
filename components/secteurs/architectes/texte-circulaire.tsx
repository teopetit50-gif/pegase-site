"use client";
/* ══════════════════════════════════════════════════════════════════════
   Lorani (agences d'architecture) — texte-circulaire.tsx
   COPIÉ le 24/09/2026 à 14 h 57 de `OMEGA/dossieros-site/src/components/
   ui/circular-text.tsx`. Rien ne change dans le code : couleur et police viennent de Heros.tsx (#262626, police réellement calculée sur la page).
   Ce qu'en disait la source :
   ══════════════════════════════════════════════════════════════════════ */
/* Texte circulaire tournant du héros — port du composant de la référence (mots séparés par ⁕, diamètre 320,
   Syne 24 px, accélération au survol). Les largeurs de lettres sont mesurées au canvas pour répartir les angles. */
import React, { useEffect, useLayoutEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import { motion, useMotionValue, useAnimationFrame, animate, type AnimationPlaybackControls } from "framer-motion";

const DEF_WORDS = ["CIRCULAR", "TEXT"];
const DEF_FONT: CSSProperties = {
  fontFamily: "Syne",
  fontWeight: 400,
  fontSize: "24px",
  letterSpacing: "0.02em",
  lineHeight: "1em",
  textAlign: "center",
};
const perTurn = (sec: number) => (!Number.isFinite(sec) || sec <= 0 ? 0 : 360 / sec);
function widths(chars: string[], size: number, weight: string, family: string) {
  if (typeof document === "undefined") return chars.map((c) => (c === " " ? 0.35 * size : 0.55 * size));
  const ctx = document.createElement("canvas").getContext("2d");
  if (!ctx) return chars.map((c) => (c === " " ? 0.35 * size : 0.55 * size));
  ctx.font = `${weight} ${size}px ${family}`;
  return chars.map((c) => ctx.measureText(c === " " ? " " : c).width);
}
const total = (chars: string[], size: number, weight: string, family: string) =>
  widths(chars, size, weight, family).reduce((a, b) => a + b, 0);

function layout(
  words: string[],
  sep: string,
  circ: number,
  size: number,
  weight: string,
  family: string,
  spacing: number,
) {
  const sp = Math.max(0, spacing);
  const s = (sep && sep.length ? sep : "⁕").trim() || "⁕";
  const unit = `${words.join(` ${s} `)} ${s} `;
  const chars = Array.from(unit);
  if (!chars.length || circ <= 0)
    return { letters: [] as string[], letterSpacingPx: sp, content: "", angles: [] as number[] };
  let u = Math.max(1, Math.ceil(circ / Math.max(total(chars, size, weight, family) + sp * chars.length, 1)));
  u = Math.min(u, 48);
  const per = (w: number, n: number) => (n <= 0 ? sp : (circ - w) / n);
  let m = unit.repeat(u),
    h = Array.from(m),
    p = total(h, size, weight, family),
    g = per(p, h.length);
  while (g < sp && u > 1) {
    u -= 1;
    m = unit.repeat(u);
    h = Array.from(m);
    p = total(h, size, weight, family);
    g = per(p, h.length);
  }
  if (g < sp) g = Math.max(0, g);
  const x = Math.max(2.5 * sp, 0.75 * size);
  while (g > x && u < 48) {
    const nu = u + 1,
      nm = unit.repeat(nu),
      nh = Array.from(nm),
      np = total(nh, size, weight, family),
      ng = per(np, nh.length);
    if (ng < sp) break;
    u = nu;
    m = nm;
    h = nh;
    p = np;
    g = ng;
  }
  const b = widths(h, size, weight, family);
  const v = b.reduce((a, c) => a + c, 0) + g * h.length;
  const angles: number[] = [];
  let w = 0;
  for (let i = 0; i < h.length; i++) {
    const t = b[i] ?? 0;
    const r = w + t / 2;
    angles.push(v > 0 ? (r / v) * 360 : 0);
    w += t + g;
  }
  return { letters: h, letterSpacingPx: g, content: m, angles };
}

export interface CircularTextProps {
  words?: string[];
  separator?: string;
  diameter?: number;
  font?: CSSProperties;
  color?: string;
  onHover?: "speed" | "pause" | "scale" | "none";
  hoverScale?: number;
  hoverSpeed?: number;
  transition?: { duration?: number; delay?: number };
  style?: CSSProperties;
}

export default function CircularText({
  words = DEF_WORDS,
  separator = "⁕",
  diameter = 320,
  font = DEF_FONT,
  color = "#FFFFFF",
  onHover = "speed",
  hoverScale = 0.8,
  hoverSpeed = 5,
  transition = { duration: 20, delay: 0 },
  style,
}: CircularTextProps) {
  const box = useRef<HTMLDivElement>(null);
  const [dim, setDim] = useState({ width: diameter, height: diameter });
  const rot = useMotionValue(0);
  const sc = useMotionValue(1);
  const speedRef = useRef(0);
  const paused = useRef(false);
  const startAt = useRef(0);
  const ctrl = useRef<AnimationPlaybackControls | null>(null);
  const dur =
    Number.isFinite(transition?.duration ?? 20) && (transition?.duration ?? 20) > 0 ? (transition?.duration ?? 20) : 0;
  const delay = Number.isFinite(transition?.delay ?? 0) && (transition?.delay ?? 0) > 0 ? (transition?.delay ?? 0) : 0;
  const size = typeof font.fontSize === "number" ? font.fontSize : parseFloat(String(font.fontSize ?? "24")) || 24;
  const ls =
    typeof font.letterSpacing === "number"
      ? font.letterSpacing
      : (() => {
          const v = String(font.letterSpacing ?? "");
          if (!v) return 0;
          if (v.endsWith("em")) return (parseFloat(v) || 0) * size;
          return parseFloat(v) || 0;
        })();
  const weight = typeof font.fontWeight === "number" ? String(font.fontWeight) : (font.fontWeight as string) || "900";
  const family = (String(font.fontFamily ?? "").split(",")[0] || "").trim().replace(/['"]/g, "") || "sans-serif";
  const A = Math.max(100, diameter);
  useLayoutEffect(() => {
    const e = box.current;
    if (!e) return;
    const set = (w: number, h: number) => {
      const r = Math.max(0, Math.floor(w)),
        n = Math.max(0, Math.floor(h));
      setDim((d) =>
        d.width === r && d.height === n ? d : r < 2 || n < 2 ? { width: A, height: A } : { width: r, height: n },
      );
    };
    set(e.clientWidth, e.clientHeight);
    const ro = new ResizeObserver((en) => {
      const r = en[0];
      if (r) set(r.contentRect.width, r.contentRect.height);
    });
    ro.observe(e);
    return () => ro.disconnect();
  }, [A]);
  const P = Math.max(0, Math.min(dim.width, dim.height));
  const I = P > 0 ? Math.min(A, P) : A;
  const F = Math.max(8, I / 2 - 0.55 * size);
  const circ = 2 * Math.PI * F;
  const list = useMemo(() => {
    const w = (words ?? [])
      .map((x) => x.trim())
      .filter(Boolean)
      .slice(0, 10);
    return w.length ? w : DEF_WORDS;
  }, [words]);
  const { letters, letterSpacingPx, content, angles } = useMemo(
    () => layout(list, separator, circ, size, weight, family, ls),
    [list, separator, circ, size, weight, family, ls],
  );
  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches || dur <= 0) {
      speedRef.current = 0;
      paused.current = true;
      startAt.current = 0;
      ctrl.current?.stop();
      sc.set(1);
      return;
    }
    paused.current = false;
    speedRef.current = perTurn(dur);
    startAt.current = delay > 0 ? performance.now() + 1000 * delay : 0;
    ctrl.current?.stop();
    sc.set(1);
  }, [dur, delay, content, onHover, sc]);
  useAnimationFrame((_, dt) => {
    if (paused.current || speedRef.current === 0 || (startAt.current > 0 && performance.now() < startAt.current))
      return;
    startAt.current = 0;
    const s = Math.min(dt, 64) / 1000;
    const n = (rot.get() + speedRef.current * s) % 360;
    rot.set(n < 0 ? n + 360 : n);
  });
  useEffect(() => () => ctrl.current?.stop(), []);
  const spring = (to: number) => {
    ctrl.current?.stop();
    ctrl.current = animate(sc, to, { type: "spring", damping: 20, stiffness: 300 });
  };
  const enter = () => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches || !onHover || onHover === "none" || dur <= 0)
      return;
    const hs = Number.isFinite(hoverSpeed) ? Math.min(8, Math.max(1, hoverSpeed)) : 5;
    if (onHover === "speed") {
      paused.current = false;
      speedRef.current = perTurn(hs);
      spring(1);
    } else if (onHover === "pause") {
      paused.current = true;
      spring(1);
    } else if (onHover === "scale") {
      paused.current = false;
      speedRef.current = perTurn(hs);
      spring(Number.isFinite(hoverScale) ? hoverScale : 0.8);
    }
  };
  const leave = () => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches || dur <= 0) return;
    paused.current = false;
    speedRef.current = perTurn(dur);
    spring(1);
  };
  return (
    <div
      ref={box}
      style={{
        width: "100%",
        height: "100%",
        minWidth: A,
        minHeight: A,
        position: "relative",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        overflow: "hidden",
        ...style,
      }}
    >
      <div
        onPointerEnter={enter}
        onPointerLeave={leave}
        style={{
          position: "relative",
          width: I,
          height: I,
          flexShrink: 0,
          borderRadius: "50%",
          cursor: "pointer",
          touchAction: "manipulation",
          userSelect: "none",
        }}
      >
        <motion.div
          style={{
            ...font,
            letterSpacing: `${letterSpacingPx}px`,
            position: "absolute",
            inset: 0,
            width: "100%",
            height: "100%",
            borderRadius: "50%",
            color,
            textAlign: "center",
            transformOrigin: "center center",
            willChange: "transform",
            pointerEvents: "none",
            rotate: rot,
            scale: sc,
          }}
        >
          {letters.map((ch, i) => {
            const deg = angles[i] ?? 0,
              a = (deg * Math.PI) / 180,
              x = F * Math.cos(a),
              y = F * Math.sin(a);
            const t = `translate(-50%, -50%) translate(${x}px, ${y}px) rotate(${deg + 90}deg)`;
            return (
              <span
                key={`${ch}-${i}`}
                aria-hidden="true"
                style={{
                  position: "absolute",
                  top: "50%",
                  left: "50%",
                  display: "inline-block",
                  lineHeight: 1,
                  transform: t,
                  WebkitTransform: t,
                }}
              >
                {ch === " " ? " " : ch}
              </span>
            );
          })}
          <span
            style={{
              position: "absolute",
              width: 1,
              height: 1,
              padding: 0,
              margin: -1,
              overflow: "hidden",
              clip: "rect(0, 0, 0, 0)",
              whiteSpace: "nowrap",
              borderWidth: 0,
            }}
          >
            {content}
          </span>
        </motion.div>
      </div>
    </div>
  );
}
