import type { Metadata } from "next";
import { Suspense } from "react";
import PageDossier from "@/components/espace2/tamila/PageDossier";

/* /espace2/tamila/dossiers/<id> — la page d'un dossier, sur la page d'une
   Initiative de Linear (30/10/2026) : onglets Procédure, Pièces, Honoraires,
   Conformité (?onglet=, ?partie=), identité et décisions dans le volet. */

export const metadata: Metadata = {
  title: "Dossier",
  description: "La page d'un dossier du cabinet : délais et audiences, pièces et lectures, honoraires, conflits d'intérêts, murailles, exports et journal des accès.",
};

export default async function PageDossierTamila({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return (
    <Suspense>
      <PageDossier id={id} />
    </Suspense>
  );
}
