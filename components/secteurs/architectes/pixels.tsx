"use client";
/* ══════════════════════════════════════════════════════════════════════
   Lorani (agences d'architecture) — pixels.tsx
   COPIÉ le 24/09/2026 à 14 h 57 de `OMEGA/dossieros-site/src/components/
   ui/pixel-canvas.tsx`. Rien ne change dans le code : les couleurs viennent des appelants (Heros.tsx, Produit.tsx), qui passent la palette CLAIRE.
   Ce qu'en disait la source :
   ══════════════════════════════════════════════════════════════════════ */
/* Pixel Canvas — port de l'implémentation de la référence (bundle 33350), elle-même dérivée du
   composant « Pixel Canvas » de Serafim sur 21st.dev. Paramètres identiques (gap, pixelSize, speed,
   appearFrom, trigger, replay, transition…). */
import React, { useEffect, useRef, type CSSProperties } from "react";

class Pixel {
  width: number;
  height: number;
  ctx: CanvasRenderingContext2D;
  x: number;
  y: number;
  color: string;
  speed: number;
  size = 0;
  sizeStep: number;
  minSize: number;
  maxSizeInteger: number;
  maxSize: number;
  delay: number;
  counter = 0;
  counterStep: number;
  isIdle = false;
  isReverse = false;
  isShimmer = false;
  growStart: number | null = null;
  shrinkStart: number | null = null;
  shrinkFrom = 0;
  constructor(
    canvas: HTMLCanvasElement,
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    color: string,
    speed: number,
    delay: number,
    pixelSize: number,
  ) {
    this.width = canvas.width;
    this.height = canvas.height;
    this.ctx = ctx;
    this.x = x;
    this.y = y;
    this.color = color;
    this.speed = this.rand(0.1, 0.9) * speed;
    const half = pixelSize / 2;
    this.sizeStep = 0.4 * Math.random() * half;
    this.minSize = 0.5 * half;
    this.maxSizeInteger = pixelSize;
    this.maxSize = this.rand(this.minSize, pixelSize);
    this.delay = delay;
    this.counterStep = 4 * Math.random() + (this.width + this.height) * 0.01;
  }
  rand(a: number, b: number) {
    return Math.random() * (b - a) + a;
  }
  draw() {
    const o = 0.5 * this.maxSizeInteger - 0.5 * this.size;
    this.ctx.fillStyle = this.color;
    this.ctx.fillRect(this.x + o, this.y + o, this.size, this.size);
  }
  appear(now: number, dur: number, ease: (t: number) => number) {
    this.isIdle = false;
    this.shrinkStart = null;
    if (this.counter <= this.delay) {
      this.counter += this.counterStep;
      return;
    }
    if (!this.isShimmer) {
      if (this.growStart === null) this.growStart = now;
      const p = dur > 0 ? Math.min(1, (now - this.growStart) / dur) : 1;
      this.size = ease(p) * this.maxSize;
      if (p >= 1) this.isShimmer = true;
    }
    if (this.isShimmer) this.shimmer();
    this.draw();
  }
  disappear(now: number, dur: number, ease: (t: number) => number) {
    this.isShimmer = false;
    this.counter = 0;
    this.growStart = null;
    if (this.size <= 0) {
      this.isIdle = true;
      this.shrinkStart = null;
      return;
    }
    if (this.shrinkStart === null) {
      this.shrinkStart = now;
      this.shrinkFrom = this.size;
    }
    const p = dur > 0 ? Math.min(1, (now - this.shrinkStart) / dur) : 1;
    this.size = this.shrinkFrom * (1 - ease(p));
    if (p >= 1) this.size = 0;
    this.draw();
  }
  shimmer() {
    if (this.size >= this.maxSize) this.isReverse = true;
    else if (this.size <= this.minSize) this.isReverse = false;
    this.size += this.isReverse ? -this.speed : this.speed;
  }
}

function bezier(x1: number, y1: number, x2: number, y2: number) {
  const a = 3 * x1,
    i = 3 * (x2 - x1) - a,
    s = 1 - a - i,
    l = 3 * y1,
    o = 3 * (y2 - y1) - l,
    d = 1 - l - o;
  const cx = (t: number) => ((s * t + i) * t + a) * t,
    dx = (t: number) => (3 * s * t + 2 * i) * t + a;
  return (t: number) => {
    if (t <= 0) return 0;
    if (t >= 1) return 1;
    let u = t;
    for (let k = 0; k < 8; k++) {
      const r = cx(u) - t,
        n = dx(u);
      if (Math.abs(r) < 1e-5 || n === 0) break;
      u -= r / n;
    }
    return ((d * u + o) * u + l) * u;
  };
}
const EASES: Record<string, [number, number, number, number]> = {
  linear: [0, 0, 1, 1],
  easeIn: [0.42, 0, 1, 1],
  easeOut: [0, 0, 0.58, 1],
  easeInOut: [0.42, 0, 0.58, 1],
};

export interface PixelCanvasProps {
  colors?: string[];
  gap?: number;
  pixelSize?: number;
  speed?: number;
  appearFrom?: "top" | "bottom" | "left" | "right" | "middle";
  trigger?: "hover" | "enter" | "auto";
  position?: "top" | "bottom" | "left" | "right" | "middle";
  replay?: boolean;
  transition?: { duration?: number; ease?: string | number[] };
  backgroundColor?: string;
  padding?: number;
  borderColor?: string;
  borderWidth?: number;
  radius?: number;
  autoPlay?: boolean;
  style?: CSSProperties;
  canvasStyle?: CSSProperties;
}

export default function PixelCanvas({
  colors = ["#fecdd3", "#fda4af", "#e11d48"],
  gap = 6,
  pixelSize = 2,
  speed = 80,
  appearFrom = "middle",
  trigger = "hover",
  position = "middle",
  replay = true,
  transition = { duration: 0.8, ease: "easeOut" },
  backgroundColor = "#000000",
  padding = 0,
  borderColor = "#27272a",
  borderWidth = 1,
  radius = 25,
  autoPlay = false,
  style,
  canvasStyle,
}: PixelCanvasProps) {
  const box = useRef<HTMLDivElement>(null);
  const cv = useRef<HTMLCanvasElement>(null);
  const pixels = useRef<Pixel[]>([]);
  const raf = useRef<number | null>(null);
  const played = useRef(false);
  const last = useRef(0);
  const mode = autoPlay ? "auto" : trigger;

  useEffect(() => {
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const e = transition?.ease;
    const ease =
      Array.isArray(e) && e.length === 4
        ? bezier(e[0], e[1], e[2], e[3])
        : typeof e === "string" && EASES[e]
          ? bezier(...EASES[e])
          : bezier(0, 0, 0.58, 1);
    const dur = (transition?.duration ?? 0.8) * 1000;
    const palette = colors.length ? colors : ["#fecdd3"];
    const build = () => {
      const c = cv.current,
        b = box.current;
      if (!c || !b) return;
      const w = Math.floor(b.clientWidth || b.getBoundingClientRect().width || c.clientWidth || 0);
      const h = Math.floor(b.clientHeight || b.getBoundingClientRect().height || c.clientHeight || 0);
      if (w < 1 || h < 1) return;
      const ctx = c.getContext("2d");
      if (!ctx) return;
      c.width = w;
      c.height = h;
      c.style.width = "100%";
      c.style.height = "100%";
      const g = Math.max(1, Math.round(gap) || 1);
      const list: Pixel[] = [];
      let k = 0;
      for (let x = 0; x < w; x += g)
        for (let y = 0; y < h; y += g) {
          const col = palette[k % palette.length];
          k++;
          let delay: number;
          if (reduced) delay = 0;
          else if (appearFrom === "top") delay = y;
          else if (appearFrom === "bottom") delay = h - y;
          else if (appearFrom === "left") delay = x;
          else if (appearFrom === "right") delay = w - x;
          else {
            const dx = x - w / 2,
              dy = y - h / 2;
            delay = Math.sqrt(dx * dx + dy * dy);
          }
          list.push(
            new Pixel(
              c,
              ctx,
              x,
              y,
              col,
              speed <= 0 || reduced ? 0 : speed >= 100 ? 0.2 : 0.002 * speed,
              delay,
              Math.max(0.1, pixelSize),
            ),
          );
        }
      pixels.current = list;
    };
    const drawAll = () => {
      const ctx = cv.current?.getContext("2d");
      if (!ctx || !cv.current) return;
      ctx.clearRect(0, 0, cv.current.width, cv.current.height);
      for (const p of pixels.current) {
        p.size = p.maxSize;
        p.draw();
      }
    };
    const loop = (m: "appear" | "disappear") => {
      raf.current = requestAnimationFrame(() => loop(m));
      const now = performance.now();
      const dt = now - last.current;
      if (dt < 1000 / 60) return;
      last.current = now - (dt % (1000 / 60));
      const ctx = cv.current?.getContext("2d");
      if (!ctx || !cv.current) return;
      ctx.clearRect(0, 0, cv.current.width, cv.current.height);
      let idle = true;
      for (const p of pixels.current) {
        p[m](now, dur, ease);
        if (!p.isIdle) idle = false;
      }
      if (idle && raf.current !== null) cancelAnimationFrame(raf.current);
    };
    const start = (m: "appear" | "disappear") => {
      if (m === "appear" && !replay && played.current) return;
      if (m === "appear") played.current = true;
      if (raf.current !== null) cancelAnimationFrame(raf.current);
      raf.current = requestAnimationFrame(() => loop(m));
    };
    played.current = false;
    build();
    if (mode === "auto") start("appear");
    const ro = new ResizeObserver(() => {
      const was = played.current;
      build();
      if (was && !replay) drawAll();
      else if (mode === "auto" || mode === "enter") start("appear");
    });
    if (box.current) ro.observe(box.current);
    let io: IntersectionObserver | null = null;
    if (mode === "enter" && box.current) {
      io = new IntersectionObserver(
        (en) => {
          const t = en[0];
          if (!t) return;
          if (t.isIntersecting) start("appear");
          else if (replay) start("disappear");
        },
        { threshold: 0.15 },
      );
      io.observe(box.current);
    }
    const b = box.current;
    const enter = () => start("appear"),
      leave = () => {
        if (replay) start("disappear");
      };
    if (mode === "hover" && b) {
      b.addEventListener("mouseenter", enter);
      b.addEventListener("mouseleave", leave);
    }
    return () => {
      ro.disconnect();
      io?.disconnect();
      if (raf.current !== null) cancelAnimationFrame(raf.current);
      if (b) {
        b.removeEventListener("mouseenter", enter);
        b.removeEventListener("mouseleave", leave);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gap, speed, pixelSize, JSON.stringify(colors), appearFrom, mode, replay]);

  const place =
    position === "top"
      ? "start"
      : position === "bottom"
        ? "end"
        : position === "left"
          ? "center start"
          : position === "right"
            ? "center end"
            : "center";
  return (
    <div
      ref={box}
      tabIndex={-1}
      style={{
        position: "relative",
        width: "100%",
        height: "100%",
        minWidth: 80,
        minHeight: 80,
        overflow: "hidden",
        boxSizing: "border-box",
        padding,
        background: backgroundColor,
        display: "grid",
        placeItems: place,
        border: `${borderWidth}px solid ${borderColor}`,
        borderRadius: radius,
        isolation: "isolate",
        userSelect: "none",
        ...style,
      }}
    >
      <canvas
        ref={cv}
        style={{ position: "absolute", inset: 0, width: "100%", height: "100%", display: "block", ...canvasStyle }}
      />
    </div>
  );
}
