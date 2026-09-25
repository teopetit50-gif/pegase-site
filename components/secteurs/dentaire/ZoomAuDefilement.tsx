"use client";
/* `C_fh` de la source : la section Écrans entre à 86 % de sa taille, coins
   arrondis, et s'ouvre à pleine largeur, coins droits, pendant que son
   haut monte du bas de la fenêtre jusqu'à 45 % de sa hauteur.
   25/09 (Teo, « trop arrondi ») : 40 px au départ dans la source, 6 px ici,
   l'arrondi des cartes de l'accueil (voir app/secteurs/arrondis.css). */
import { motion, useScroll, useTransform } from "framer-motion";
import { useRef, type ReactNode } from "react";

export default function ZoomAuDefilement({ children }: { children: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start end", "start 45%"] });
  const echelle = useTransform(scrollYProgress, [0, 1], [0.86, 1]);
  const arrondi = useTransform(scrollYProgress, [0, 1], [6, 0]);

  return (
    <div ref={ref} data-monde="clair" className="bg-white">
      <motion.div style={{ scale: echelle, borderRadius: arrondi }} className="overflow-hidden">
        {children}
      </motion.div>
    </div>
  );
}
