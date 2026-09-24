"use client";
/* ══════════════════════════════════════════════════════════════════════
   Lorani (agences d'architecture) — grille-3d.tsx
   COPIÉ le 24/09/2026 à 14 h 57 de `OMEGA/dossieros-site/src/components/
   ui/grid-3d.tsx`. Rien ne change dans le code : fond, filets et couleurs viennent des appelants (Heros.tsx, Compteurs.tsx), en clair.
   Ce qu'en disait la source :
   ══════════════════════════════════════════════════════════════════════ */
/* Grille 3D à cases qui s'allument sous le pointeur — port de la référence (composant « ek » du bundle) :
   perspective 1000 px, rotation X/Y, projection du pointeur sur le plan, case allumée + cases qui s'éteignent en 1 s. */
import React, { useCallback, useLayoutEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import { motion } from "framer-motion";

export interface Grid3DProps {
  backgroundColor?: string;
  boxSize?: number;
  borderWidth?: number;
  borderColor?: string;
  rotate?: { x?: number; y?: number };
  colors?: string[];
  style?: CSSProperties;
}
type Cell = { id: number; row: number; col: number; color: string };

export default function Grid3D({
  backgroundColor = "rgba(0,0,0,1)",
  boxSize = 40,
  borderWidth = 2,
  borderColor = "rgba(255,255,255,0.2)",
  rotate = { x: 0, y: 0 },
  colors = ["#FFFFFF", "#FFC2E3", "#DEFFEA", "#A68F1F", "#A85E5E", "#DFC2FF"],
  style,
}: Grid3DProps) {
  const box = useRef<HTMLDivElement>(null);
  const [rows, setRows] = useState(35);
  const [cols, setCols] = useState(35);
  const rx = rotate?.x ?? 0,
    ry = rotate?.y ?? 0;
  const palette = useMemo(() => (colors.length ? colors : ["#FFFFFF"]), [colors]);
  const measure = useCallback(() => {
    const e = box.current;
    if (!e) return;
    const w = e.clientWidth || e.offsetWidth || 1,
      h = e.clientHeight || e.offsetHeight || 1;
    setCols(Math.max(1, Math.ceil(w / boxSize)));
    setRows(Math.max(1, Math.ceil(h / boxSize)));
  }, [boxSize]);
  useLayoutEffect(() => {
    measure();
    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
  }, [measure]);
  const W = cols * boxSize,
    Hh = rows * boxSize;
  const border = borderWidth ? `${borderWidth}px solid ${borderColor}` : undefined;
  const [lit, setLit] = useState<Cell | null>(null);
  const [fading, setFading] = useState<Cell[]>([]);
  const counter = useRef(0);
  const push = useCallback((c: Cell) => setFading((l) => (l.some((x) => x.id === c.id) ? l : [...l, c])), []);
  const leave = useCallback(
    () =>
      setLit((c) => {
        if (c) push(c);
        return null;
      }),
    [push],
  );
  const move = useCallback(
    (ev: React.PointerEvent) => {
      const e = box.current;
      if (!e) return;
      const r = e.getBoundingClientRect();
      const proj = (px: number, py: number, degY: number, degX: number, d = 1000) => {
        const a = (degY * Math.PI) / 180,
          b = (degX * Math.PI) / 180,
          ca = Math.cos(a),
          sa = Math.sin(a),
          cb = Math.cos(b),
          sb = Math.sin(b);
        const u = d * ca - px * sa * cb,
          f = px * sb,
          m = d * sa * sb - py * sa * cb,
          h = d * cb + py * sb,
          p = u * h - f * m;
        if (!isFinite(p) || Math.abs(p) < 1e-6) return null;
        const g = px * d,
          x = py * d;
        return { x: (g * h - f * x) / p, y: (u * x - g * m) / p };
      };
      const pt = proj(ev.clientX - r.left - r.width / 2, ev.clientY - r.top - r.height / 2, ry, rx);
      if (!pt) return leave();
      const cx = pt.x + W / 2,
        cy = pt.y + Hh / 2,
        col = Math.floor(cx / boxSize),
        row = Math.floor(cy / boxSize);
      if (col < 0 || col >= cols || row < 0 || row >= rows) return leave();
      setLit((c) =>
        c && c.row === row && c.col === col
          ? c
          : (c && push(c),
            { id: ++counter.current, row, col, color: palette[Math.floor(Math.random() * palette.length)] }),
      );
    },
    [rx, ry, W, Hh, boxSize, cols, rows, palette, leave, push],
  );
  useLayoutEffect(() => {
    if (!fading.length) return;
    const t = setTimeout(() => setFading((l) => l.slice(1)), 1000);
    return () => clearTimeout(t);
  }, [fading]);
  const grid = useMemo(
    () =>
      Array(rows)
        .fill(1)
        .map((_, i) => (
          <div
            key={`row-${i}`}
            style={{ display: "flex", borderLeft: border, borderBottom: i === rows - 1 ? border : undefined }}
          >
            {Array(cols)
              .fill(1)
              .map((__, j) => (
                <div
                  key={`col-${j}`}
                  style={{
                    width: boxSize,
                    height: boxSize,
                    flexShrink: 0,
                    boxSizing: "border-box",
                    borderRight: border,
                    borderTop: border,
                  }}
                />
              ))}
          </div>
        )),
    [rows, cols, boxSize, border],
  );
  const cellStyle = (c: Cell): CSSProperties => ({
    position: "absolute",
    left: c.col * boxSize,
    top: c.row * boxSize,
    width: boxSize,
    height: boxSize,
    backgroundColor: c.color,
    pointerEvents: "none",
  });
  return (
    <div
      ref={box}
      onPointerMove={move}
      onPointerLeave={leave}
      style={{ ...style, position: "relative", width: "100%", height: "100%", overflow: "hidden", backgroundColor }}
    >
      <div style={{ position: "absolute", width: 20, height: 20, opacity: 0, pointerEvents: "none" }} />
      <div
        style={{
          position: "absolute",
          inset: 0,
          perspective: "1000px",
          perspectiveOrigin: "center center",
          transformStyle: "preserve-3d",
        }}
      >
        <div
          style={{
            transform: `translate(-50%, -50%) rotateY(${ry}deg) rotateX(${rx}deg)`,
            position: "absolute",
            left: "50%",
            top: "50%",
            display: "flex",
            flexDirection: "column",
            transformOrigin: "center center",
            width: W,
            height: Hh,
            zIndex: 0,
          }}
        >
          {grid}
          {fading.map((c) => (
            <motion.div
              key={`f-${c.id}`}
              initial={{ opacity: 1 }}
              animate={{ opacity: 0 }}
              transition={{ duration: 1 }}
              style={cellStyle(c)}
            />
          ))}
          {lit && (
            <motion.div
              key={`l-${lit.id}`}
              initial={{ opacity: 1 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0 }}
              style={cellStyle(lit)}
            />
          )}
        </div>
      </div>
    </div>
  );
}
