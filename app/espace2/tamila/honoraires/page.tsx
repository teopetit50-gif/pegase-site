import type { Metadata } from "next";
import { Suspense } from "react";
import EcranTamila from "@/components/espace/tamila/EcranTamila";
import Habille from "@/components/espace2/Habille";
import Honoraires from "@/components/espace2/tamila/Honoraires";

/* /espace2/tamila/honoraires — les honoraires du cabinet (02/11/2026, refonte des pages métiers) : copie 1:1
   de la liste Accounts de Plain. Atterrissage des lignes E8 et E9 du point du matin (?filtre=signaux).
   « ?ancien=1 » rend l'écran d'avant. */

export const metadata: Metadata = {
  title: "Honoraires du cabinet",
  description: "Par dossier : convention, temps non facturé, à facturer, provisions, reste dû, et ce qui demande un geste.",
};

type Params = Record<string, string | string[] | undefined>;

export default async function PageHonoraires({ searchParams }: { searchParams: Promise<Params> }) {
  if ((await searchParams).ancien === "1") {
    return (
      <Habille>
        <EcranTamila />
      </Habille>
    );
  }
  return (
    <Suspense>
      <Honoraires />
    </Suspense>
  );
}
