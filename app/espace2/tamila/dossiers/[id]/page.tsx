import type { Metadata } from "next";
import { Suspense } from "react";
import EcranTamila from "@/components/espace/tamila/EcranTamila";
import Habille from "@/components/espace2/Habille";
import PageDossier from "@/components/espace2/tamila/PageDossier";

/* /espace2/tamila/dossiers/[id] — la page d'un dossier (02/11/2026, refonte des pages métiers) : copie 1:1 de
   la page d'une Initiative de Linear. Seule page qui ouvre un dossier (lecture tracée au journal des accès).
   C'est là que mènent les demandes à valider (aiguillage.ts, tamila_dossier). « ?ancien=1 » rend l'écran d'avant. */

export const metadata: Metadata = {
  title: "Dossier",
  description: "Un dossier du cabinet : échéances, procédure, pièces, honoraires et conformité.",
};

type Params = Record<string, string | string[] | undefined>;

export default async function PageUnDossier({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<Params> }) {
  const [{ id }, q] = await Promise.all([params, searchParams]);
  if (q.ancien === "1") {
    return (
      <Habille>
        <EcranTamila />
      </Habille>
    );
  }
  return (
    <Suspense>
      <PageDossier id={id} />
    </Suspense>
  );
}
