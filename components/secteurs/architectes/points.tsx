"use client";
/* ══════════════════════════════════════════════════════════════════════
   Lorani (agences d'architecture) — points.tsx
   COPIÉ le 24/09/2026 à 14 h 57 de `OMEGA/dossieros-site/src/components/
   ui/dot-board.tsx`. Rien ne change : la bande passe ses propres couleurs (Bande.tsx).
   Ce qu'en disait la source :
   ══════════════════════════════════════════════════════════════════════ */
/* Bande de points entre les sections — le plateau statique du composant « snake » de la référence
   (animated:false, cellSize 5, gap 1, rounded 20, boardColor rgba(128,128,128,0.14)). */
import React, { useEffect, useRef, type CSSProperties } from "react";

export default function DotBoard({
  cellSize = 5,
  gap = 1,
  rounded = 20,
  boardColor = "rgba(128, 128, 128, 0.14)",
  style,
}: {
  cellSize?: number;
  gap?: number;
  rounded?: number;
  boardColor?: string;
  style?: CSSProperties;
}) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const c = ref.current;
    if (!c) return;
    const ctx = c.getContext("2d");
    if (!ctx) return;
    const draw = () => {
      const dpr = Math.min(2, window.devicePixelRatio || 1);
      const w = Math.max(1, Math.round(c.clientWidth)),
        h = Math.max(1, Math.round(c.clientHeight));
      c.width = Math.round(w * dpr);
      c.height = Math.round(h * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      const step = cellSize + gap;
      const cols = Math.max(4, Math.floor((w + gap) / step)),
        rows = Math.max(4, Math.floor((h + gap) / step));
      const cw = Math.max(1, (w - gap * (cols - 1)) / cols),
        ch = Math.max(1, (h - gap * (rows - 1)) / rows);
      const r = (Math.min(cw, ch) / 2) * (Math.min(20, Math.max(0, rounded)) / 20);
      ctx.clearRect(0, 0, w, h);
      ctx.beginPath();
      for (let y = 0; y < rows; y++)
        for (let x = 0; x < cols; x++) {
          const px = x * (cw + gap),
            py = y * (ch + gap);
          if (r > 0 && typeof ctx.roundRect === "function") ctx.roundRect(px, py, cw, ch, r);
          else ctx.rect(px, py, cw, ch);
        }
      ctx.fillStyle = boardColor;
      ctx.fill();
    };
    draw();
    const ro = new ResizeObserver(draw);
    ro.observe(c);
    return () => ro.disconnect();
  }, [cellSize, gap, rounded, boardColor]);
  return (
    <div
      style={{
        ...style,
        position: "relative",
        overflow: "hidden",
        width: "100%",
        height: "100%",
        boxSizing: "border-box",
      }}
    >
      <canvas ref={ref} style={{ width: "100%", height: "100%", display: "block" }} />
    </div>
  );
}
