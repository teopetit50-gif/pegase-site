"use client";
/* ══════════════════════════════════════════════════════════════════════
   Tamila (cabinets d'avocats) — carte-magique.tsx

   COPIÉ le 24/09/2026 à 13 h 37 de `OMEGA/cabinetos-site/src/components/ui/
   magic-card.tsx`. Mécanique inchangée (lueur qui suit le pointeur, liseré
   dégradé sky → bleu). Ce qui change :
   · `bg-background` (le fond intérieur, inset 1 px) → `bg-[#ffffff]` ;
     `bg-border` → `bg-[#e6e6e6]` ; `hsl(var(--border))` du liseré, écrit
     dans un gabarit hors de portée de l'outil, → `#e6e6e6`. Sur le blanc,
     c'est CE liseré d'un pixel qui découpe la carte : blanc sur blanc,
     elle n'existerait plus sans lui.
   · La lueur au pointeur garde son bleu à 10 % : une lueur bleue sur le
     blanc lit comme sur le noir (un voile), sans rien alourdir.
   · `cn` vient de `@/lib/cn`.
   ══════════════════════════════════════════════════════════════════════ */

import { useCallback, useEffect, useRef } from "react";
import { motion, useMotionTemplate, useMotionValue } from "framer-motion";
import { cn } from "@/lib/cn";

/* MagicCard — Magic UI (@dillionverma sur 21st.dev), version exacte du bundle de la référence (module 8728).
   Réglages de la référence : gradientColor rgba(59,130,246,0.1), de #38bdf8 à #3b82f6. Depuis le 24/09 au soir
   (registre d'un cabinet, avocats.css) : le vert de Tamila, lueur à 6 %, liseré de #4f7a62 à #193a29. */
interface MagicCardProps {
  children?: React.ReactNode;
  className?: string;
  gradientSize?: number;
  gradientColor?: string;
  gradientOpacity?: number;
  gradientFrom?: string;
  gradientTo?: string;
}

export function MagicCard({
  children,
  className,
  gradientSize = 200,
  gradientColor = "rgba(25,58,41,0.06)",
  gradientOpacity = 0.8,
  gradientFrom = "#4f7a62",
  gradientTo = "#193a29",
}: MagicCardProps) {
  const cardRef = useRef<HTMLDivElement>(null);
  const mouseX = useMotionValue(-gradientSize);
  const mouseY = useMotionValue(-gradientSize);

  const handleMouseMove = useCallback(
    (e: MouseEvent) => {
      if (cardRef.current) {
        const { left, top } = cardRef.current.getBoundingClientRect();
        mouseX.set(e.clientX - left);
        mouseY.set(e.clientY - top);
      }
    },
    [mouseX, mouseY],
  );

  const handleMouseOut = useCallback(
    (e: MouseEvent) => {
      if (!e.relatedTarget) {
        document.removeEventListener("mousemove", handleMouseMove);
        mouseX.set(-gradientSize);
        mouseY.set(-gradientSize);
      }
    },
    [handleMouseMove, mouseX, gradientSize, mouseY],
  );

  const handleMouseEnter = useCallback(() => {
    document.addEventListener("mousemove", handleMouseMove);
    mouseX.set(-gradientSize);
    mouseY.set(-gradientSize);
  }, [handleMouseMove, mouseX, gradientSize, mouseY]);

  useEffect(() => {
    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseout", handleMouseOut);
    document.addEventListener("mouseenter", handleMouseEnter);
    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseout", handleMouseOut);
      document.removeEventListener("mouseenter", handleMouseEnter);
    };
  }, [handleMouseEnter, handleMouseMove, handleMouseOut]);

  useEffect(() => {
    mouseX.set(-gradientSize);
    mouseY.set(-gradientSize);
  }, [gradientSize, mouseX, mouseY]);

  const lueur = useMotionTemplate`
            radial-gradient(${gradientSize}px circle at ${mouseX}px ${mouseY}px, ${gradientColor}, transparent 100%)
          `;
  const liseré = useMotionTemplate`
            radial-gradient(${gradientSize}px circle at ${mouseX}px ${mouseY}px,
              ${gradientFrom}, 
              ${gradientTo}, 
              #e5e1d8 100%
            )
          `;

  return (
    <div ref={cardRef} className={cn("group relative flex size-full rounded-xl", className)}>
      <div className="absolute inset-px z-10 rounded-xl bg-[#ffffff]" />
      <div className="relative z-30 w-full">{children}</div>
      <motion.div
        className="pointer-events-none absolute inset-px z-10 rounded-xl opacity-0 transition-opacity duration-300 group-hover:opacity-100"
        style={{ background: lueur, opacity: gradientOpacity }}
      />
      <motion.div
        className="pointer-events-none absolute inset-0 rounded-xl bg-[#e5e1d8] duration-300 group-hover:opacity-100"
        style={{ background: liseré }}
      />
    </div>
  );
}
