import type { Metadata } from "next";
import { Suspense } from "react";
import Retours from "@/components/espace2/tavaro/Retours";

/* /espace2/tavaro/retours — les contrats et leur retour chiffré, sur l'Inbox de Linear (02/11/2026). */

export const metadata: Metadata = {
  title: "Retours à facturer",
  description: "Les contrats de location : retours à chiffrer, propositions devant l'agence, factures bloquées, et le dossier du contrat ouvert à droite.",
};

export default function Page() {
  return (
    <Suspense>
      <Retours />
    </Suspense>
  );
}
