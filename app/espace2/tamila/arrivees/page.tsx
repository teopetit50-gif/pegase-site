import type { Metadata } from "next";
import { Suspense } from "react";
import EcranTamila from "@/components/espace/tamila/EcranTamila";
import Habille from "@/components/espace2/Habille";
import Arrivees from "@/components/espace2/tamila/Arrivees";

/* /espace2/tamila/arrivees — les avis RPVA reçus par courriel, à rattacher (02/11/2026, refonte des pages
   métiers) : copie 1:1 du Triage de Linear. Atterrissage des lignes E5 et E15 du point du matin.
   « ?ancien=1 » rend l'écran d'avant. */

export const metadata: Metadata = {
  title: "Arrivées",
  description: "Les avis RPVA reçus par courriel : rattachés à leur dossier (pièces chiffrées dans le navigateur) ou écartés.",
};

type Params = Record<string, string | string[] | undefined>;

export default async function PageArrivees({ searchParams }: { searchParams: Promise<Params> }) {
  if ((await searchParams).ancien === "1") {
    return (
      <Habille>
        <EcranTamila />
      </Habille>
    );
  }
  return (
    <Suspense>
      <Arrivees />
    </Suspense>
  );
}
