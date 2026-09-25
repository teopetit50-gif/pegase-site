"use client";

import { useEffect, useRef, type CSSProperties, type ReactNode } from "react";

/* ══ l'apparition de la référence ═════════════════════════════════════
   concurrence.com pose `opacity: 0; transform: translateY(20px)` sur ses
   blocs et les révèle au premier regard (framer-motion, whileInView,
   une fois). Même chose ici, en CSS (distribution.css, [data-nm-apparait])
   et un IntersectionObserver : « attente » → « vu ».
   `effet` : « monte » (défaut), « fondu » (opacité seule), « zoom »
   (scale 0,95 → 1, leur vidéo du partenariat), « trait » (scaleY des
   filets verticaux). */
export default function Apparait({
  children,
  className,
  style,
  effet = "monte",
  delai = 0,
}: {
  children?: ReactNode;
  className?: string;
  style?: CSSProperties;
  effet?: "monte" | "fondu" | "zoom" | "trait";
  delai?: number;
}) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(
      ([e]) => {
        if (!e.isIntersecting) return;
        window.setTimeout(() => el.setAttribute("data-nm-apparait", "vu"), delai);
        io.disconnect();
      },
      { rootMargin: "0px 0px -8% 0px" }
    );
    io.observe(el);
    return () => io.disconnect();
  }, [delai]);
  return (
    <div
      ref={ref}
      data-nm-apparait="attente"
      data-nm-effet={effet}
      className={effet === "trait" ? `nm-trait-v ${className ?? ""}` : className}
      style={style}
    >
      {children}
    </div>
  );
}

/* leurs filets verticaux de bord de colonne : un conteneur absolu et le
   trait qui se trace de haut en bas */
export function Filet({ cote = "gauche", couleur, className = "" }: { cote?: "gauche" | "droite"; couleur: string; className?: string }) {
  return (
    <div className={`absolute ${cote === "gauche" ? "left-0" : "right-0"} top-0 h-full ${className}`}>
      <Apparait effet="trait" style={{ background: couleur }} />
    </div>
  );
}
