import type { Metadata } from "next";
import { Suspense } from "react";
import Pilotage from "@/components/espace2/tamila/Pilotage";

/* /espace2/tamila/pilotage — marge, charge, séries, dossiers sans diligence et pièces attendues, sur Insights de Plain (30/10/2026, refonte des pages métiers) */

export const metadata: Metadata = {
  title: "Pilotage du cabinet",
  description: "La marge par dossier, la charge par personne, les dossiers en série, ceux sans diligence et les pièces attendues.",
};

export default function PagePilotage() {
  return (
    <Suspense>
      <Pilotage />
    </Suspense>
  );
}
