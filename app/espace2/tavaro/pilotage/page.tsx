import type { Metadata } from "next";
import { Suspense } from "react";
import Pilotage from "@/components/espace2/tavaro/Pilotage";

/* /espace2/tavaro/pilotage — Pilotage (02/11/2026, pages manquantes) : la page
   Insights › Reporting de Plain. Les quatre indicateurs promis par le site :
   part facturée des retours, délai de remise en location, délai de la
   dépanneuse, véhicules à sortir. */

export const metadata: Metadata = {
  title: "Pilotage de la location",
  description: "Part facturée des retours, délai de remise en location, délai de la dépanneuse, véhicules à sortir, par agence.",
};

export default function PagePilotage() {
  return (
    <Suspense>
      <Pilotage />
    </Suspense>
  );
}
