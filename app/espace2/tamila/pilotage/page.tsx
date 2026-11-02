import type { Metadata } from "next";
import { Suspense } from "react";
import EcranTamila from "@/components/espace/tamila/EcranTamila";
import Habille from "@/components/espace2/Habille";
import Pilotage from "@/components/espace2/tamila/Pilotage";

/* /espace2/tamila/pilotage — le pilotage du cabinet (02/11/2026, refonte des pages métiers) : copie 1:1
   d'Insights › Reporting de Plain. Atterrissage des lignes E11-E14 (pièces attendues, expertise).
   « ?ancien=1 » rend l'écran d'avant. */

export const metadata: Metadata = {
  title: "Pilotage du cabinet",
  description: "Marge par dossier, charge par personne, séries, dossiers sans diligence et pièces attendues.",
};

type Params = Record<string, string | string[] | undefined>;

export default async function PagePilotage({ searchParams }: { searchParams: Promise<Params> }) {
  if ((await searchParams).ancien === "1") {
    return (
      <Habille>
        <EcranTamila />
      </Habille>
    );
  }
  return (
    <Suspense>
      <Pilotage />
    </Suspense>
  );
}
