"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { motion, useMotionValue, useScroll, useSpring, useTransform } from "motion/react";

/* ══ les cartes blanches de la référence ══════════════════════════════
   Relevé au défilement, 20 px par 20 px (CDP, 1440 × 900, 24/09), sur
   concurrence.com : la marge latérale est LINÉAIRE et suit la position de
   la carte, puis passe par un RESSORT (elle garde un temps de retard et
   rattrape quand on s'arrête) —
   • en sortant, selon son BAS : 0 px quand le bas passe le bord de
     l'écran, 32 px quand il atteint 48 % de la hauteur (4 / 17 / 25 / 32
     px à 846 / 666 / 546 / 426 px) ;
   • en entrant, selon son HAUT : 32 px tant qu'il est sous 95 % de la
     hauteur, 0 quand il atteint 40 %.
   Même mécanique que la leur (framer-motion, ici motion/react) :
   useScroll sur la carte → useTransform → useSpring → marges. Rien sous
   1024 : sur téléphone la carte reste pleine largeur.
   Teo, 24/09 : « elle dézoome pas encore au même moment et de la bonne
   façon » — la version d'avant suivait une courbe, sans ressort. */
export default function CarteBlanche({ className = "", children }: { className?: string; children: ReactNode }) {
  const ref = useRef<HTMLElement>(null);
  /* le palier dans une valeur animée, pour que la transformation le lise */
  const large = useMotionValue(0);
  useEffect(() => {
    const mq = window.matchMedia("(min-width: 1024px)");
    const poser = () => large.set(mq.matches ? 1 : 0);
    poser();
    mq.addEventListener("change", poser);
    return () => mq.removeEventListener("change", poser);
  }, [large]);

  const { scrollYProgress: sortie } = useScroll({ target: ref, offset: ["end end", "end 0.48"] });
  const { scrollYProgress: entree } = useScroll({ target: ref, offset: ["start 0.95", "start 0.4"] });
  const brut = useTransform(() => (large.get() ? 32 * Math.max(sortie.get(), 1 - entree.get()) : 0));
  const marge = useSpring(brut, { stiffness: 220, damping: 34, mass: 0.7 });

  return (
    <motion.section
      ref={ref}
      data-header-theme="default"
      className={`nm-carte ${className}`}
      style={{ marginLeft: marge, marginRight: marge }}
    >
      {children}
    </motion.section>
  );
}
