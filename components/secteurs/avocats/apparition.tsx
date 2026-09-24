"use client";
/* ══════════════════════════════════════════════════════════════════════
   Tamila (cabinets d'avocats) — apparition.tsx

   COPIÉ le 24/09/2026 à 13 h 37 de `OMEGA/cabinetos-site/src/components/ui/
   animation-container.tsx`. Aucune couleur. Seul `cn` change de maison
   (`@/lib/cn`, le helper des reprises shadcn du site).
   ══════════════════════════════════════════════════════════════════════ */
import { motion } from "framer-motion";
import { cn } from "@/lib/cn";

/* AnimationContainer de la référence (module 4594) : fondu + montée de 20 px, ressort, une seule fois. */
export default function AnimationContainer({
  children,
  className,
  delay = 0.2,
  reverse,
  simple,
}: {
  children: React.ReactNode;
  className?: string;
  delay?: number;
  reverse?: boolean;
  simple?: boolean;
}) {
  return (
    <motion.div
      className={cn("w-full h-full", className)}
      initial={{ opacity: 0, y: reverse ? -20 : 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ delay, duration: simple ? 0.2 : 0.4, type: simple ? "keyframes" : "spring", stiffness: simple ? 100 : undefined }}
    >
      {children}
    </motion.div>
  );
}
