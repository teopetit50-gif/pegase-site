import type { Metadata } from "next";
import { Suspense } from "react";
import Opportunites from "@/components/espace2/reseau/opportunites-vue";

/* /espace2/reseau/opportunites — Réseau Omega › Opportunités : ce que le
   réseau fait gagner à l'organisation connectée. Le tableau en colonnes
   des moteurs (kit ../lin, comme OFFLOAD › Affaires), la carte ouverte au
   milieu (?id=), et « Ce que le réseau vous a apporté » (?vue=apports).
   components/espace2/reseau/opportunites-vue.tsx */

export const metadata: Metadata = {
  title: "Opportunités",
  description: "Les mises en relation, groupements de marchés publics et achats groupés que le Réseau Omega vous propose, et ce qu'il vous a déjà apporté.",
};

export default function Page() {
  return (
    <Suspense>
      <Opportunites />
    </Suspense>
  );
}
