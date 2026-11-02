import type { Metadata } from "next";
import { Suspense } from "react";
import PageContrat from "@/components/espace2/tavaro/PageContrat";

/* /espace2/tavaro/contrats/<id> — le dossier d'un contrat de location, sur la
   page d'un ticket de Linear (02/11/2026, refonte des pages métiers). */

export const metadata: Metadata = {
  title: "Contrat de location",
  description: "Le contrat, ses états des lieux, le chiffrage du retour, ses factures, ses avoirs et le fil du dossier.",
};

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return (
    <Suspense>
      <PageContrat id={decodeURIComponent(id)} />
    </Suspense>
  );
}
