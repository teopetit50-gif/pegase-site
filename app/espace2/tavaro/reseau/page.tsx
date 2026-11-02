import type { Metadata } from "next";
import { Suspense } from "react";
import Reseau from "@/components/espace2/tavaro/Reseau";

/* /espace2/tavaro/reseau — flotte, plan de flotte, transferts, audit et 2027 : les décisions de la
   direction, sur la liste des Initiatives de Linear (02/11/2026). */

export const metadata: Metadata = {
  title: "Réseau et flotte",
  description: "La flotte véhicule par véhicule, le plan de flotte, les transferts entre agences, l'audit des retours et la préparation à la facture électronique.",
};

export default function Page() {
  return (
    <Suspense>
      <Reseau />
    </Suspense>
  );
}
