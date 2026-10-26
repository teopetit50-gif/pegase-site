import type { Metadata } from "next";
import { Controles } from "@/components/espace2/filed/Fonctions";

/* /espace2/filed/controles — FILED, les contrôles avant classement (page de fonction, 21/10/2026). */

export const metadata: Metadata = {
  title: "Contrôles et fraude",
  description: "FILED : les pièces en anomalie, les changements de coordonnées bancaires et les fournisseurs à confirmer.",
};

export default function Page() {
  return <Controles />;
}
