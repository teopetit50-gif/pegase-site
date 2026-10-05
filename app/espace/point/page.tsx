import type { Metadata } from "next";
import PointDuMatin from "@/components/espace/point/PointDuMatin";

/* ══════════════════════════════════════════════════════════════════════
   /espace/point — le point du matin du jour (05/10/2026, session A3)

   La coquille et la session viennent du layout (app/espace/layout.tsx,
   lot 19) ; la page ne rend que l'écran. Le point est lu par la porte
   lire_point (points_du_jour + points_du_jour_lignes), en lecture
   seule ; l'exemple reproduit un point remis à 7 h.
   ══════════════════════════════════════════════════════════════════════ */

export const metadata: Metadata = {
  title: "Point du matin",
  description: "Le point du matin du jour : ce qui a bougé pendant la nuit, ce qui attend, ce qui va bien.",
};

export default function PagePoint() {
  return <PointDuMatin />;
}
