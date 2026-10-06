import type { Metadata } from "next";
import EcranTamila from "@/components/espace/tamila/EcranTamila";

/* ══════════════════════════════════════════════════════════════════════
   /espace/tamila — les dossiers du cabinet (05/10/2026, session B4)

   La coquille et la session viennent du layout (app/espace/layout.tsx) ;
   la page ne rend que l'écran, qui lit l'exemple ou la base réelle selon
   l'interrupteur. Les dossiers sont chiffrés : la phrase du cabinet se
   tape dans l'écran et ne quitte pas le navigateur.
   ══════════════════════════════════════════════════════════════════════ */

export const metadata: Metadata = {
  title: "Dossiers du cabinet",
  description: "Les dossiers Tamila du cabinet : parties, délais de procédure calculés et confirmés, audiences, murailles, exports et clôture.",
};

export default function PageTamila() {
  return <EcranTamila />;
}
