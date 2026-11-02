import type { Metadata } from "next";
import { Suspense } from "react";
import VueOperations from "@/components/espace2/varelo/VueOperations";

/* /espace2/varelo/operations — réserves à émettre et reportings dus (02/11/2026) : Linear,
   Board, au 1:1. « ?reception=<id> » et « ?echeance=<id> » ouvrent les gestes de la carte. */

export const metadata: Metadata = {
  title: "Opérations du groupe",
  description: "Les réserves à émettre aux transporteurs et les reportings dus, rangés par état, avec leur date limite.",
};

export default function PageOperations() {
  return (
    <Suspense>
      <VueOperations />
    </Suspense>
  );
}
