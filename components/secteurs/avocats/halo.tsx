"use client";
/* ══════════════════════════════════════════════════════════════════════
   Tamila (cabinets d'avocats) — halo.tsx

   COPIÉ le 24/09/2026 à 13 h 37 de `OMEGA/cabinetos-site/src/components/
   halo.tsx`. Géométrie, flou et rotation (un tour en 8 s) inchangés.

   MONDE BLANC : le dégradé conique violet → bleu → cyan (#a855f7, #3b82f6,
   #06b6d4) était une lueur SATURÉE sur le noir. Posé tel quel sur le blanc,
   le même disque flouté devient une tache colorée franche sous le titre.
   Les trois teintes sont gardées, dans leur version claire de la même
   famille (violet 300, bleu 300, cyan 300) : la lueur tourne toujours,
   elle éclaire au lieu de tacher.
   ══════════════════════════════════════════════════════════════════════ */
import { motion } from "framer-motion";

/* Le halo tournant sous l'appel final : dégradé conique, un tour en 8 s (bundle, module 9435). */
export function HaloConique() {
  return (
    <motion.div
      className="absolute -bottom-1/8 left-1/3 -translate-x-1/2 w-44 h-32 lg:h-52 lg:w-1/3 rounded-full blur-[5rem] lg:blur-[10rem] -z-10"
      style={{ background: "conic-gradient(from 0deg at 50% 50%, #d8b4fe 0deg, #93c5fd 180deg, #67e8f9 360deg)" }}
      animate={{ rotate: 360 }}
      transition={{ duration: 8, repeat: Infinity, ease: "linear" }}
    />
  );
}
