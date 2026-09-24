"use client";
/* Tavaro — FondPapier.tsx. COPIÉ tel quel le 24/09/2026 à 14 h 58 de
   `OMEGA/rentalos-site/src/components/fond-papier.tsx`. Le fond était déjà
   BLANC (#ffffff, voile blanc à 78 %) : rien à repeindre. Le paquet
   `@paper-design/shaders-react` est installé sur ce site (0.0.80 ici,
   0.0.81 dans la source : même composant `Dithering`, mêmes réglages). */
/** Fond du hero : le shader « Dithering » de Paper Design (@paper-design/shaders-react,
 *  MIT) vu à travers un masque de traits verticaux — exactement la recette de la
 *  référence (composant PaperDesignBackground lu dans son bundle, 23/09/2026) :
 *  themeMode light, shape lines, intensity .74, colorStrength .62,
 *  effectStrength .46, patternScale 1.2, pixelSize 4, whiteTop .78.
 *  D'où : couleur avant mix(#9bb4e8, #2f5fd4, .677) = #527bdb, vitesse .427,
 *  traits de 1,92 px tous les 14,4 px, voile blanc à 78 %, grain à 7,3 %. */
import { useEffect, useState } from "react";
import { Dithering } from "@paper-design/shaders-react";

const AVANT = "#527bdb";
const MASQUE = "repeating-linear-gradient(90deg, #000 0 1.92px, transparent 1.92px 14.4px)";
const VOILE = [
  "radial-gradient(ellipse 68% 48% at 50% 24%, #ffffff 0%, rgba(255,255,255,0.9) 28%, rgba(255,255,255,0.4) 48%, transparent 70%)",
  "linear-gradient(180deg, #ffffff 0%, rgba(255,255,255,0.88) 44%, rgba(255,255,255,0.28) 78%, transparent 96%)",
].join(", ");
const GRAIN =
  "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='120' height='120' viewBox='0 0 120 120'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='1.25' numOctaves='2' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.11'/%3E%3C/svg%3E\")";

function shaderPermis() {
  if (typeof window === "undefined") return false;
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return false;
  if (window.matchMedia("(max-width: 767px)").matches) return false;
  const c = (navigator as Navigator & { connection?: { saveData?: boolean } }).connection;
  return !(c && c.saveData);
}

export function FondPapier() {
  const [actif, setActif] = useState(false);
  useEffect(() => {
    const maj = () => setActif(shaderPermis());
    maj();
    const a = window.matchMedia("(prefers-reduced-motion: reduce)");
    const b = window.matchMedia("(max-width: 767px)");
    a.addEventListener("change", maj);
    b.addEventListener("change", maj);
    return () => { a.removeEventListener("change", maj); b.removeEventListener("change", maj); };
  }, []);

  return (
    <div id="paper-bg-parallax" className="pointer-events-none absolute inset-0 overflow-hidden transition-colors duration-500" style={{ backgroundColor: "#ffffff" }}>
      <div className="absolute inset-0" style={{ WebkitMaskImage: MASQUE, maskImage: MASQUE, WebkitMaskSize: "100% 100%", maskSize: "100% 100%", WebkitMaskRepeat: "repeat", maskRepeat: "repeat" }}>
        <div className="absolute inset-[-10%]">
          {actif ? (
            <Dithering
              colorBack="#ffffff00"
              colorFront={AVANT}
              speed={0.427}
              shape="simplex"
              type="4x4"
              size={4}
              scale={1.2}
              rotation={0}
              offsetX={0}
              offsetY={0}
              style={{ height: "100%", width: "100%" }}
            />
          ) : (
            <div aria-hidden="true" className="absolute inset-0" style={{ background: `radial-gradient(70% 55% at 50% 70%, ${AVANT}22, transparent 72%)` }} />
          )}
        </div>
      </div>
      <div aria-hidden="true" className="absolute inset-0" style={{ background: VOILE }} />
      <div aria-hidden="true" className="absolute inset-0" style={{ backgroundImage: GRAIN, backgroundSize: "cover", opacity: 0.07308, mixBlendMode: "multiply" }} />
    </div>
  );
}
