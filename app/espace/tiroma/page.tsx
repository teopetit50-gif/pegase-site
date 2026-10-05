import type { Metadata } from "next";
import EcranTiroma from "@/components/espace/tiroma/EcranTiroma";

/* ══════════════════════════════════════════════════════════════════════
   /espace/tiroma — le cabinet dentaire (05/10/2026, session B3)

   La coquille et la session viennent du layout (app/espace/layout.tsx) ;
   la page ne rend que l'écran, qui lit l'exemple ou la base réelle selon
   l'interrupteur (portes de lecture b3_02 à b3_05, tables tiroma_* sous
   RLS, portes publiques d'installation, de branchement et de mode).
   ══════════════════════════════════════════════════════════════════════ */

export const metadata: Metadata = {
  title: "Cabinet dentaire",
  description: "Le cabinet lu en une page : créneaux à sauver, plans sans rendez-vous, vérifications avant les rendez-vous, charge des fauteuils.",
};

export default function PageTiroma() {
  return <EcranTiroma />;
}
