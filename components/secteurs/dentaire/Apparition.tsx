"use client";
/* ══════════════════════════════════════════════════════════════════════
   Apparition — `C_m7` de la source : le bloc monte de 48 px et s'allume
   quand il entre dans la fenêtre (IntersectionObserver, seuil 8 %, marge
   basse −60 px), une seule fois par défaut. Classes et durées recopiées.

   ⚠ En recette headless, un bloc qui porte `opacity-100` mais dont le
   style calculé vaut encore 0 est une transition GELÉE (aucune image
   produite), pas un observateur en panne : voir pieges.md de la skill.
   ══════════════════════════════════════════════════════════════════════ */
import { useEffect, useRef, useState, type ReactNode } from "react";

const DUREES = { fast: "duration-500", normal: "duration-700", slow: "duration-1000" } as const;
const DEPARTS = {
  up: "translate-y-12",
  down: "-translate-y-12",
  left: "-translate-x-12",
  right: "translate-x-12",
} as const;

type Props = {
  children: ReactNode;
  className?: string;
  /* délai de la transition, en millisecondes */
  delay?: number;
  direction?: keyof typeof DEPARTS;
  duration?: keyof typeof DUREES;
  once?: boolean;
};

export default function Apparition({
  children,
  className = "",
  delay = 0,
  direction = "up",
  duration = "normal",
  once = true,
}: Props) {
  const [visible, setVisible] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([entree]) => {
        if (entree.isIntersecting) {
          setVisible(true);
          if (once) obs.disconnect();
        } else if (!once) {
          setVisible(false);
        }
      },
      { threshold: 0.08, rootMargin: "0px 0px -60px 0px" },
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [once]);

  return (
    <div
      ref={ref}
      className={`transition-all ${DUREES[duration]} ease-out will-change-transform ${
        visible ? "translate-x-0 translate-y-0 opacity-100" : `opacity-0 ${DEPARTS[direction]}`
      } ${className}`}
      style={{ transitionDelay: `${delay}ms` }}
    >
      {children}
    </div>
  );
}
