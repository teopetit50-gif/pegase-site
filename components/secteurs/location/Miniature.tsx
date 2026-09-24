"use client";
/* Tavaro — Miniature.tsx. COPIÉ tel quel le 24/09/2026 à 14 h 58 de
   `OMEGA/rentalos-site/src/components/ui/miniature.tsx`. Ses règles
   (`.miniature`, `.miniature__bloc`) sont dans location.css, sous
   `.p-location`. */
/** Miniature — « le schéma garde sa forme sur mobile » (règle maison du 16/09/2026,
 *  composant Ajuste du site Omega). Le contenu est rendu à sa largeur NATURELLE
 *  d'ordinateur (`naturel` px) et, sous 768 px, réduit d'un bloc par `transform: scale`
 *  pour tenir dans le cadre ; la hauteur du cadre suit (une transformation ne change
 *  pas le flux, sans ça un trou reste dessous). Au-dessus de 768 px, rien ne change.
 *  Le bloc intérieur est un conteneur CSS (`container: maquette / inline-size`) :
 *  les paliers des maquettes se déclenchent sur sa largeur, pas sur la fenêtre. */
import { useEffect, useRef } from "react";

export function Miniature({ naturel = 1040, children, className = "" }: { naturel?: number; children: React.ReactNode; className?: string }) {
  const cadre = useRef<HTMLDivElement>(null);
  const bloc = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const c = cadre.current, b = bloc.current;
    if (!c || !b) return;
    const maj = () => {
      const k = Math.min(1, c.clientWidth / naturel);
      c.style.setProperty("--mn-k", String(k));
      c.style.setProperty("--mn-h", `${b.offsetHeight}px`);
    };
    const ro = new ResizeObserver(maj);
    ro.observe(c); ro.observe(b);
    maj();
    return () => ro.disconnect();
  }, [naturel]);
  return (
    <div ref={cadre} className={`miniature ${className}`} style={{ "--mn-l": `${naturel}px` } as React.CSSProperties}>
      <div ref={bloc} className="miniature__bloc">{children}</div>
    </div>
  );
}
