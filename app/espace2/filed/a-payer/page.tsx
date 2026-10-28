import type { Metadata } from "next";
import { Suspense } from "react";
import BoiteAPayer from "@/components/espace2/filed/BoiteAPayer";

/* /espace2/filed/a-payer — « À payer » sur la boîte de réception de Linear
   (28/10/2026, demande de Teo : la seconde page de chaque SaaS sur l'Inbox
   de Linear). La liste des factures validées à gauche, la facture choisie
   (?id=) à droite ; mêmes données, mêmes règles et même « Noter un
   paiement » que l'écran d'avant (APayer, 06/10/2026). */

export const metadata: Metadata = {
  title: "À payer",
  description: "Les factures validées par FILED, par échéance : montant à payer, IBAN validé ou manquant, fournisseur bloqué.",
};

export default function PageAPayer() {
  return (
    <Suspense>
      <BoiteAPayer />
    </Suspense>
  );
}
