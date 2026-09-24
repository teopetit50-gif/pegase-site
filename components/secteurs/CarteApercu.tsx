"use client";

import Link from "next/link";
import type { PointerEvent, ReactNode } from "react";
import { motion, useMotionValue, useReducedMotion, useSpring, useTransform } from "motion/react";

/* ══════════════════════════════════════════════════════════════════════
   /secteurs — la carte d'aperçu qui s'incline sous la souris (24/09/2026)

   Mécanique reprise de la « 3D card » de 21st.dev (@kavikatiyar/3d-card) :
   la position du pointeur dans la carte (−0,5 → 0,5 sur chaque axe) passe
   par un ressort, puis devient rotateX / rotateY. Écarts avec l'original :

   • ±3° au lieu de ±10,5° : leur carte fait 320 px, les nôtres ~890 à
     1440 ; à 10° le bord opposé fuit de plusieurs dizaines de pixels.
   • la carte monte de 6 px au survol (même ressort), l'ombre et le zoom
     de la capture sont en CSS (.sct-apercu:hover, secteurs.css).
   • souris seulement : sur téléphone, un toucher ne fait pas pencher la
     carte avant d'ouvrir la page.
   • `prefers-reduced-motion` : ni inclinaison ni montée, seulement le
     filet et l'ombre.
   ══════════════════════════════════════════════════════════════════════ */

const RESSORT = { damping: 20, stiffness: 180, mass: 0.6 };
const ANGLE = 3;

export default function CarteApercu({
  href,
  children,
}: {
  href: string;
  children: ReactNode;
}) {
  const reduit = useReducedMotion();

  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const monte = useMotionValue(0);

  const rotateX = useTransform(useSpring(y, RESSORT), [-0.5, 0.5], [ANGLE, -ANGLE]);
  const rotateY = useTransform(useSpring(x, RESSORT), [-0.5, 0.5], [-ANGLE, ANGLE]);
  const translateY = useSpring(monte, RESSORT);

  const suivre = (e: PointerEvent<HTMLAnchorElement>) => {
    if (reduit || e.pointerType !== "mouse") return;
    const r = e.currentTarget.getBoundingClientRect();
    x.set((e.clientX - r.left) / r.width - 0.5);
    y.set((e.clientY - r.top) / r.height - 0.5);
    monte.set(-6);
  };

  const relacher = () => {
    x.set(0);
    y.set(0);
    monte.set(0);
  };

  return (
    <motion.div
      className="sct-apercu-support"
      style={reduit ? undefined : { rotateX, rotateY, y: translateY, transformPerspective: 1400 }}
    >
      <Link href={href} className="sct-apercu" onPointerMove={suivre} onPointerLeave={relacher}>
        {children}
      </Link>
    </motion.div>
  );
}
