import type { Metadata } from "next";
import EcranFiled from "@/components/espace/filed/EcranFiled";

/* ══════════════════════════════════════════════════════════════════════
   /espace/filed — les documents reçus (05/10/2026, session A3)

   La coquille et la session viennent du layout (app/espace/layout.tsx,
   lot 19) ; la page ne rend que l'écran, qui lit l'exemple ou la base
   réelle selon l'interrupteur. L'URL signée des pièces est
   fabriquée par l'action serveur de ./actions.ts.
   ══════════════════════════════════════════════════════════════════════ */

export const metadata: Metadata = {
  title: "Documents reçus",
  description: "Les documents reçus par FILED : numéro, contrôles, motif officiel, pièce en regard et corrections.",
};

export default function PageFiled() {
  return <EcranFiled />;
}
