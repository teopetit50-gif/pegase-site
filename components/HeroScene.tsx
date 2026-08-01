"use client";

import { useEffect, useRef, useState } from "react";
import type { HeroEngine } from "./heroEngine";

/* Monte la scène WebGL du hero APRÈS le premier paint (le titre fait le LCP,
   three.js arrive ensuite en chunk séparé). Fallback : dégradé statique
   élégant, conservé si WebGL est indisponible ou reduced-motion actif. */

const supportsWebGL2 = () => {
  try {
    const c = document.createElement("canvas");
    const gl = c.getContext("webgl2");
    if (!gl) return false;
    // la simulation GPGPU exige le rendu vers textures float/half-float
    return gl.getExtension("EXT_color_buffer_float") !== null ||
      gl.getExtension("EXT_color_buffer_half_float") !== null;
  } catch {
    return false;
  }
};

export default function HeroScene() {
  const hostRef = useRef<HTMLDivElement>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    if (!supportsWebGL2()) return;

    let destroyed = false;
    let engine: HeroEngine | null = null;

    const start = () => {
      if (destroyed) return;
      import("./heroEngine")
        .then((m) => m.createHeroScene(host, () => setReady(true)))
        .then((e) => {
          if (destroyed) e.destroy();
          else engine = e;
        })
        .catch(() => {
          /* le fallback statique reste affiché */
        });
    };

    // après le premier paint : le titre peint d'abord, le moteur ensuite
    const w = window as unknown as { requestIdleCallback?: (f: () => void, o?: { timeout: number }) => number };
    const raf = requestAnimationFrame(() => {
      if (w.requestIdleCallback) w.requestIdleCallback(start, { timeout: 1200 });
      else setTimeout(start, 350);
    });

    return () => {
      destroyed = true;
      cancelAnimationFrame(raf);
      engine?.destroy();
    };
  }, []);

  return (
    <div ref={hostRef} aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
      {/* fallback statique — même langage visuel que la nébuleuse */}
      <div
        className={`absolute inset-0 transition-opacity duration-1000 ${ready ? "opacity-0" : "opacity-100"}`}
        style={{
          background:
            "radial-gradient(38% 26% at 68% 58%, rgba(247,131,32,0.09), transparent 62%)," +
            "radial-gradient(52% 36% at 66% 56%, rgba(255,255,255,0.04), transparent 66%)," +
            "radial-gradient(24% 18% at 72% 60%, rgba(224,179,65,0.06), transparent 70%)",
        }}
      />
    </div>
  );
}
