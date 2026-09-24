"use client";
/* ══════════════════════════════════════════════════════════════════════
   Lorani (agences d'architecture) — rayons.tsx
   COPIÉ le 24/09/2026 à 14 h 57 de `OMEGA/dossieros-site/src/components/
   ui/rays.tsx`. Rien ne change dans le code : Appel.tsx passe le fond blanc et les traits d'encre.
   Ce qu'en disait la source :
   ══════════════════════════════════════════════════════════════════════ */
/* Rayons de l'appel à l'action — port du composant canvas de la référence (module 41147) :
   76 arcs qui suivent la souris, lueur 10, vitesse 6. */
import React, { useEffect, useRef, type CSSProperties } from "react";

const map = (v: number, a: number, b: number, c: number, d: number) => ((v - a) / (b - a)) * (d - c) + c;
const TAU = 2 * Math.PI;
function rgb(s: string) {
  const m = s.match(/rgba?\(([^)]+)\)/i);
  if (m) {
    const [r, g, b] = m[1].split(",").map((x) => parseInt(x.trim(), 10));
    return { r, g, b };
  }
  let h = s.replace(/^#/, "");
  if (h.length === 3) h = h[0] + h[0] + h[1] + h[1] + h[2] + h[2];
  return h.length >= 6
    ? { r: parseInt(h.slice(0, 2), 16), g: parseInt(h.slice(2, 4), 16), b: parseInt(h.slice(4, 6), 16) }
    : { r: 255, g: 255, b: 255 };
}

export default function Rays({
  backgroundColor = "#0A0A0A",
  lineColor = "rgb(255, 255, 255)",
  lineWidth = 1.5,
  lineCount = 76,
  speed = 6,
  glow = 10,
  interactive = true,
  style,
}: {
  backgroundColor?: string;
  lineColor?: string;
  lineWidth?: number;
  lineCount?: number;
  speed?: number;
  glow?: number;
  interactive?: boolean;
  style?: CSSProperties;
}) {
  const box = useRef<HTMLDivElement>(null);
  const cv = useRef<HTMLCanvasElement>(null);
  const mouse = useRef({ y: 0, targetY: 0 });
  useEffect(() => {
    const b = box.current,
      c = cv.current;
    if (!b || !c) return;
    const ctx = c.getContext("2d", { alpha: false });
    if (!ctx) return;
    const st = { w: 0, h: 0, dpr: 1, visible: true, page: true, id: 0, frame: 0 };
    const size = () => {
      const dpr = window.devicePixelRatio || 1,
        r = b.getBoundingClientRect();
      st.w = r.width;
      st.h = r.height;
      st.dpr = dpr;
      c.width = r.width * dpr;
      c.height = r.height * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    const { r, g, b: bl } = rgb(lineColor);
    const draw = () => {
      const { w, h } = st;
      const m = mouse.current;
      m.y += (m.targetY - m.y) * 0.1;
      ctx.fillStyle = backgroundColor;
      ctx.fillRect(0, 0, w, h);
      const mobile = w < 768,
        x = 55000 / glow;
      ctx.save();
      ctx.lineWidth = lineWidth;
      ctx.translate(w / 2, h + (mobile ? 60 : 40));
      const wv = interactive ? map(m.y, 0, h, 1.2, -1.2) : 0;
      const j = st.frame * (map(Math.max(320, Math.min(1440, w)), 320, 1440, 0.002, 0.0005) * (speed / 5));
      const k = w / 2,
        N = mobile ? Math.round(0.6 * lineCount) : lineCount;
      for (let e = 0; e < N; e++) {
        let rr = map(e, 0, N, 0, Math.PI) + j;
        rr %= Math.PI;
        const i = (Math.tan(rr) - wv) * h,
          s = Math.abs(i) / 2,
          l = -h / 2 + i / 2;
        const o = Math.max(0, Math.min(255, map(Math.abs(i), 0, x, -20, 255))) / 255;
        if (o <= 0) continue;
        ctx.strokeStyle = `rgba(${r}, ${g}, ${bl}, ${o})`;
        if (s > 499999.5) {
          ctx.beginPath();
          ctx.moveTo(-k, -h / 2);
          ctx.lineTo(k, -h / 2);
          ctx.stroke();
          continue;
        }
        const d = Math.acos(Math.min(1, (k + 50) / s)),
          cnt = Math.max(Math.ceil(s / 120), 200);
        for (const [a0, a1] of [
          [d, Math.PI - d],
          [Math.PI + d, TAU - d],
        ] as const) {
          const n = a1 - a0,
            steps = Math.max(Math.ceil((n / TAU) * cnt), 60),
            dt = n / steps;
          ctx.beginPath();
          for (let q = 0; q <= steps; q++) {
            const ang = a0 + dt * q,
              px = Math.cos(ang) * s,
              py = l + Math.sin(ang) * s;
            if (q === 0) ctx.moveTo(px, py);
            else ctx.lineTo(px, py);
          }
          ctx.stroke();
        }
      }
      ctx.restore();
    };
    const tick = () => {
      st.frame += 1;
      draw();
      st.id = requestAnimationFrame(tick);
    };
    const start = () => {
      if (!st.id && st.visible && st.page) st.id = requestAnimationFrame(tick);
    };
    const stop = () => {
      if (st.id) {
        cancelAnimationFrame(st.id);
        st.id = 0;
      }
    };
    size();
    mouse.current.targetY = st.h / 2;
    mouse.current.y = st.h / 2;
    const io = new IntersectionObserver(
      (en) => {
        st.visible = en[0]?.isIntersecting ?? true;
        if (st.visible && st.page) start();
        else stop();
      },
      { threshold: 0 },
    );
    io.observe(b);
    const vis = () => {
      st.page = document.visibilityState === "visible";
      if (st.visible && st.page) start();
      else stop();
    };
    let t: ReturnType<typeof setTimeout>;
    const rs = () => {
      clearTimeout(t);
      t = setTimeout(size, 100);
    };
    let rect = b.getBoundingClientRect();
    let pending = 0;
    const mm = (e: MouseEvent) => {
      if (st.visible) mouse.current.targetY = e.clientY - rect.top;
    };
    const sc = () => {
      if (!pending)
        pending = requestAnimationFrame(() => {
          rect = b.getBoundingClientRect();
          pending = 0;
        });
    };
    window.addEventListener("resize", rs, { passive: true });
    document.addEventListener("visibilitychange", vis);
    if (interactive) {
      document.addEventListener("mousemove", mm, { passive: true });
      window.addEventListener("scroll", sc, { passive: true });
    }
    start();
    return () => {
      stop();
      io.disconnect();
      clearTimeout(t);
      window.removeEventListener("resize", rs);
      document.removeEventListener("visibilitychange", vis);
      document.removeEventListener("mousemove", mm);
      window.removeEventListener("scroll", sc);
      if (pending) cancelAnimationFrame(pending);
    };
  }, [backgroundColor, lineColor, lineWidth, lineCount, speed, glow, interactive]);
  return (
    <div
      ref={box}
      aria-hidden="true"
      style={{ ...style, position: "relative", width: "100%", height: "100%", overflow: "hidden" }}
    >
      <canvas ref={cv} style={{ width: "100%", height: "100%", display: "block" }} />
    </div>
  );
}
