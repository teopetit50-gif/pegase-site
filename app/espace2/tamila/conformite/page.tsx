import type { Metadata } from "next";
import { Suspense } from "react";
import EcranTamila from "@/components/espace/tamila/EcranTamila";
import Habille from "@/components/espace2/Habille";
import Conformite from "@/components/espace2/tamila/Conformite";

/* /espace2/tamila/conformite — la conformité du cabinet (02/11/2026, refonte des pages métiers) : copie 1:1
   des Tasks de Plain. Atterrissage des lignes E4 et E7 du point du matin. « ?ancien=1 » rend l'écran d'avant. */

export const metadata: Metadata = {
  title: "Conformité du cabinet",
  description: "Conflits d'intérêts sans décision, vigilance LCB-FT, parties à contrôler et temps proposé à la saisie.",
};

type Params = Record<string, string | string[] | undefined>;

export default async function PageConformite({ searchParams }: { searchParams: Promise<Params> }) {
  if ((await searchParams).ancien === "1") {
    return (
      <Habille>
        <EcranTamila />
      </Habille>
    );
  }
  return (
    <Suspense>
      <Conformite />
    </Suspense>
  );
}
