import type { Metadata } from "next";
import { Suspense } from "react";
import ParcAtelier from "@/components/espace2/tavaro/ParcAtelier";

/* /espace2/tavaro/parc — remises en location, immobilisations, entretiens, rappels, Crit'Air et
   contrôle technique, sur le Board de Linear (02/11/2026). */

export const metadata: Metadata = {
  title: "Parc et atelier",
  description: "Les véhicules à remettre en location, immobilisés, en entretien ou sous rappel du constructeur, et leur conformité.",
};

export default function Page() {
  return (
    <Suspense>
      <ParcAtelier />
    </Suspense>
  );
}
