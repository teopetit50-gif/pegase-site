import type { Metadata } from "next";
import { Suspense } from "react";
import ReglesUrgences from "@/components/espace2/reput/ReglesUrgences";

/* /espace2/reput/urgences — REPUT, urgences et escalade sur la liste des
   workflows de Plain (28/10/2026) : une règle d'escalade par ligne, les
   gravités en onglets, les demandes de chaque règle dans la carte au milieu.
   Mêmes données que la page d'avant (components/espace2/reput/Urgences.tsx). */

export const metadata: Metadata = {
  title: "Urgences et escalade",
  description: "REPUT : les urgences, réclamations, litiges et demandes à reprendre en main, chacune avec son délai.",
};

export default function Page() {
  return (
    <Suspense>
      <ReglesUrgences />
    </Suspense>
  );
}
