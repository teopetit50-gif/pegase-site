import type { Metadata } from "next";
import { Suspense } from "react";
import Pilotage from "@/components/espace2/tiroma/Pilotage";

/* /espace2/tiroma/pilotage — Pilotage (02/11/2026, refonte des pages
   métiers) : la page Insights › Reporting de Plain. Devis acceptés,
   signé sans rendez-vous, manqués, occupation et objectifs des fauteuils,
   réinscription, synthèse de la semaine, devis à relancer. */

export const metadata: Metadata = {
  title: "Pilotage du cabinet",
  description: "Devis acceptés, plans signés sans rendez-vous, rendez-vous manqués, réinscription, occupation et objectifs des fauteuils, synthèse de la semaine.",
};

export default function PagePilotage() {
  return (
    <Suspense>
      <Pilotage />
    </Suspense>
  );
}
