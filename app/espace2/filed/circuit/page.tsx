import type { Metadata } from "next";
import { Circuit } from "@/components/espace2/filed/Fonctions";

/* /espace2/filed/circuit — FILED, le circuit de validation (page de fonction, 21/10/2026). */

export const metadata: Metadata = {
  title: "Circuit de validation",
  description: "FILED : qui approuve quoi, les factures en attente d'approbation, les délégations et les dernières décisions.",
};

export default function Page() {
  return <Circuit />;
}
