import type { Metadata } from "next";
import APayer from "@/components/espace2/filed/APayer";

/* /espace2/filed/a-payer — « À payer » dans le nouveau design (06/10/2026). */

export const metadata: Metadata = {
  title: "À payer",
  description: "Les factures validées par FILED, par échéance : montant à payer, IBAN validé ou manquant, fournisseur bloqué.",
};

export default function PageAPayer() {
  return <APayer />;
}
