import type { Metadata } from "next";
import { Suspense } from "react";
import FicheIntervenant from "@/components/espace2/daliro/FicheIntervenant";

/* /espace2/daliro/equipes/<t:id | e:id> — la fiche d'un intervenant, ouverte depuis la liste des Équipes (05/11/2026). */

export const metadata: Metadata = {
  title: "Intervenant",
  description: "Un intervenant : ses passages faits et à venir, leurs confirmations, ses chantiers.",
};

export default async function Page({ params }: { params: Promise<{ cle: string }> }) {
  const { cle } = await params;
  return (
    <Suspense>
      <FicheIntervenant cle={decodeURIComponent(cle)} />
    </Suspense>
  );
}
