import type { Metadata } from "next";
import { Suspense } from "react";
import Automatisations from "@/components/espace3/Automatisations";

/* /espace3/automatisations — le journal des exécutions de Plain (Workflows › Runs)
   au 1:1 (28/10/2026) : une ligne par exécution d'un module, les états en onglets,
   le détail dans le panneau de droite. Les filtres et l'exécution ouverte vivent
   dans l'adresse (?onglet=, ?module=, ?declencheur=, ?run=), d'où le Suspense. */

export const metadata: Metadata = {
  title: "Automatisations",
};

export default function Page() {
  return (
    <Suspense>
      <Automatisations />
    </Suspense>
  );
}
