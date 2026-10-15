import type { Metadata } from "next";
import EcranLorani from "@/components/espace/lorani/EcranLorani";

/* ══════════════════════════════════════════════════════════════════════
   /espace/lorani — le calendrier des permis (05/10/2026, session B5)

   La coquille et la session viennent du layout (app/espace/layout.tsx) ;
   la page ne rend que l'écran, qui lit l'exemple ou la base réelle selon
   l'interrupteur. ?permis=<id> et ?projet=<id> ouvrent un dossier : ce
   sont les liens que portent les alertes et le point du matin.
   ══════════════════════════════════════════════════════════════════════ */

export const metadata: Metadata = {
  title: "Calendrier des permis",
  description: "Chaque permis suivi jusqu'à la purge des recours : délai d'instruction, pièces réclamées, décision tacite, affichage, recours des tiers.",
};

export default function PageLorani() {
  return <EcranLorani />;
}
