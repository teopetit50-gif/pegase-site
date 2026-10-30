import type { Metadata } from "next";
import { Suspense } from "react";
import CircuitEditeur from "@/components/espace3/filed/CircuitEditeur";

/* /espace3/filed/circuit — FILED, le circuit de validation sur l'éditeur de
   workflow de Plain (28/10/2026) : le canevas dessine les règles (qui
   approuve quoi, à partir de quel montant), les approbations et les
   délégations ; le panneau liste les étapes et les validations. Mêmes
   données et mêmes gestes que la page de fonction d'avant
   (components/espace3/filed/Fonctions.tsx › Circuit). */

export const metadata: Metadata = {
  title: "Circuit de validation",
  description: "FILED : qui approuve quoi, les factures en attente d'approbation, les délégations et les dernières décisions.",
};

export default function Page() {
  return (
    <Suspense>
      <CircuitEditeur />
    </Suspense>
  );
}
