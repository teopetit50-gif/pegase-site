import type { Metadata } from "next";
import { Suspense } from "react";
import TableauAffaires from "@/components/espace3/offload/TableauAffaires";

/* /espace3/offload/affaires — OFFLOAD, les affaires restées en plan, sur la
   vue « Board » de Linear (28/10/2026, la troisième page de chaque SaaS).
   Elle remplace la page de fonction du 21/10 (Sections.tsx, PageAffaires) :
   une colonne par statut d'une affaire, la carte ouverte en ?id= à droite,
   les filtres en ?filtre=. Mêmes portes : offload_affaires_liste, et les
   gestes offload_decider_affaire et offload_retirer_affaire. */

export const metadata: Metadata = {
  title: "Affaires restées en plan",
  description: "OFFLOAD : les commandes non reprises et les interventions non retirées, avec la valeur immobilisée.",
};

export default function Page() {
  return (
    <Suspense>
      <TableauAffaires />
    </Suspense>
  );
}
