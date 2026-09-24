"use client";
/* ══════════════════════════════════════════════════════════════════════
   Lorani (agences d'architecture) — sphere.tsx
   COPIÉ le 24/09/2026 à 14 h 57 de `OMEGA/dossieros-site/src/components/
   ui/particle-sphere.tsx`. Compteurs.tsx passe la teinte des particules (#737373 au lieu de #a3a3a3). Seul changement ici : cinq `let` jamais réaffectés passent en `const` (règle eslint du site).
   Ce qu'en disait la source :
   ══════════════════════════════════════════════════════════════════════ */
/* Sphère de particules — ÉCART ASSUMÉ : la référence embarque le composant « Particle Sphere » de Limot sur Three.js
   (10 000 particules, répulsion au curseur, rotation). Ici, même image en canvas 2D sans dépendance : points sur une
   sphère projetés en perspective, éclairage par la profondeur, rotation continue, répulsion au pointeur, glissé. */
import React, { useEffect, useRef, type CSSProperties } from "react";

export interface ParticleSphereProps {
  particlesCount?: number;
  speed?: number;
  smoothing?: number;
  scale?: number;
  particleScale?: number;
  rotationDirection?: "clockwise" | "counterclockwise";
  drag?: boolean;
  dragSpeed?: number;
  cursorOn?: boolean;
  cursorRadiusUI?: number;
  cursorStrengthUI?: number;
  sphereColor?: string;
  style?: CSSProperties;
}

function rgb(s: string) {
  let h = s.replace(/^#/, "");
  if (h.length === 3) h = h[0] + h[0] + h[1] + h[1] + h[2] + h[2];
  return [parseInt(h.slice(0, 2), 16) || 255, parseInt(h.slice(2, 4), 16) || 255, parseInt(h.slice(4, 6), 16) || 255];
}

export default function ParticleSphere({
  particlesCount = 10000,
  speed = 20,
  smoothing = 7,
  scale = 10,
  particleScale = 5,
  rotationDirection = "clockwise",
  drag = true,
  dragSpeed = 5,
  cursorOn = true,
  cursorRadiusUI = 75,
  cursorStrengthUI = 10,
  sphereColor = "#a3a3a3",
  style,
}: ParticleSphereProps) {
  const box = useRef<HTMLDivElement>(null);
  const cv = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const b = box.current,
      c = cv.current;
    if (!b || !c) return;
    const ctx = c.getContext("2d");
    if (!ctx) return;
    const n = Math.max(100, Math.min(30000, particlesCount));
    // points de Fibonacci sur la sphère unité
    const pts = new Float32Array(n * 3);
    const off = new Float32Array(n * 3);
    const phi = Math.PI * (3 - Math.sqrt(5));
    for (let i = 0; i < n; i++) {
      const y = 1 - (i / (n - 1)) * 2,
        r = Math.sqrt(1 - y * y),
        t = phi * i;
      pts[i * 3] = Math.cos(t) * r;
      pts[i * 3 + 1] = y;
      pts[i * 3 + 2] = Math.sin(t) * r;
    }
    const [cr, cg, cb] = rgb(sphereColor);
    const st = {
      w: 0,
      h: 0,
      dpr: 1,
      rotY: 0,
      rotX: 0.15,
      vel: 0,
      dragging: false,
      lastX: 0,
      mx: -1e4,
      my: -1e4,
      id: 0,
      visible: true,
    };
    const size = () => {
      const r = b.getBoundingClientRect();
      st.w = r.width;
      st.h = r.height;
      st.dpr = Math.min(2, window.devicePixelRatio || 1);
      c.width = r.width * st.dpr;
      c.height = r.height * st.dpr;
      ctx.setTransform(st.dpr, 0, 0, st.dpr, 0, 0);
    };
    size();
    const dir = rotationDirection === "clockwise" ? 1 : -1;
    const base = (speed / 10) * 0.0025 * dir;
    const smooth = Math.max(0.02, 1 - (smoothing / 10) * 0.9);
    const radiusPx = () => Math.min(st.w, st.h) * 0.5 * (scale / 10);
    const draw = () => {
      const { w, h } = st;
      ctx.clearRect(0, 0, w, h);
      if (!st.dragging) st.vel += (base - st.vel) * smooth;
      st.rotY += st.vel;
      const R = radiusPx(),
        cx = w / 2,
        cy = h / 2,
        f = 2.6;
      const cy0 = Math.cos(st.rotY),
        sy0 = Math.sin(st.rotY),
        cx0 = Math.cos(st.rotX),
        sx0 = Math.sin(st.rotX);
      const rad = cursorRadiusUI,
        str = (cursorStrengthUI / 10) * 0.6;
      for (let i = 0; i < n; i++) {
        const x = pts[i * 3],
          y = pts[i * 3 + 1],
          z = pts[i * 3 + 2];
        const x1 = x * cy0 + z * sy0;
        let z1 = -x * sy0 + z * cy0;
        const y1 = y * cx0 - z1 * sx0;
        z1 = y * sx0 + z1 * cx0;
        // répulsion au pointeur (écran), lissée
        const px = cx + x1 * R * (f / (f - z1)),
          py = cy + y1 * R * (f / (f - z1));
        if (cursorOn) {
          const dx = px - st.mx,
            dy = py - st.my,
            d = Math.hypot(dx, dy);
          const target = d < rad && d > 0.001 ? ((rad - d) / rad) * str : 0;
          off[i * 3] += (target * (dx / (d || 1)) - off[i * 3]) * 0.12;
          off[i * 3 + 1] += (target * (dy / (d || 1)) - off[i * 3 + 1]) * 0.12;
        }
        const depth = (z1 + 1) / 2;
        const a = 0.08 + depth * 0.92;
        const s = (0.4 + depth * 1.2) * (particleScale / 5) * (R / 320);
        if (a < 0.1) continue;
        ctx.fillStyle = `rgba(${cr},${cg},${cb},${a.toFixed(3)})`;
        ctx.beginPath();
        ctx.arc(px + off[i * 3] * 60, py + off[i * 3 + 1] * 60, Math.max(0.35, s), 0, 6.283);
        ctx.fill();
      }
    };
    const tick = () => {
      draw();
      st.id = requestAnimationFrame(tick);
    };
    const start = () => {
      if (!st.id && st.visible) st.id = requestAnimationFrame(tick);
    };
    const stop = () => {
      if (st.id) {
        cancelAnimationFrame(st.id);
        st.id = 0;
      }
    };
    const io = new IntersectionObserver((en) => {
      st.visible = en[0]?.isIntersecting ?? true;
      if (st.visible) start();
      else stop();
    });
    io.observe(b);
    const rect = () => b.getBoundingClientRect();
    const move = (e: PointerEvent) => {
      const r = rect();
      st.mx = e.clientX - r.left;
      st.my = e.clientY - r.top;
      if (st.dragging && drag) {
        st.vel = ((e.clientX - st.lastX) * 0.0025 * dragSpeed) / 5;
        st.lastX = e.clientX;
      }
    };
    const down = (e: PointerEvent) => {
      if (!drag) return;
      st.dragging = true;
      st.lastX = e.clientX;
    };
    const up = () => {
      st.dragging = false;
    };
    const leave = () => {
      st.mx = -1e4;
      st.my = -1e4;
      st.dragging = false;
    };
    b.addEventListener("pointermove", move);
    b.addEventListener("pointerdown", down);
    window.addEventListener("pointerup", up);
    b.addEventListener("pointerleave", leave);
    const ro = new ResizeObserver(size);
    ro.observe(b);
    start();
    return () => {
      stop();
      io.disconnect();
      ro.disconnect();
      b.removeEventListener("pointermove", move);
      b.removeEventListener("pointerdown", down);
      window.removeEventListener("pointerup", up);
      b.removeEventListener("pointerleave", leave);
    };
  }, [
    particlesCount,
    speed,
    smoothing,
    scale,
    particleScale,
    rotationDirection,
    drag,
    dragSpeed,
    cursorOn,
    cursorRadiusUI,
    cursorStrengthUI,
    sphereColor,
  ]);
  return (
    <div
      ref={box}
      style={{
        ...style,
        position: "relative",
        width: "100%",
        height: "100%",
        overflow: "hidden",
        touchAction: "pan-y",
      }}
    >
      <canvas ref={cv} style={{ width: "100%", height: "100%", display: "block" }} />
    </div>
  );
}
