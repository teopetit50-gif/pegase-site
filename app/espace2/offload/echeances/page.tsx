import type { Metadata } from "next";
import { Suspense } from "react";
import BoiteEcheances from "@/components/espace2/offload/BoiteEcheances";

/* /espace2/offload/echeances — OFFLOAD, les échéances et renouvellements, sur
   la boîte de réception de Linear (« Inbox », 28/10/2026, demande de Teo : la
   seconde page de chaque SaaS refaite sur l'Inbox). Elle remplace la page de
   fonction du 21/10 (Sections.tsx, PageEcheances) : une ligne par échéance à
   gauche, l'échéance ouverte en ?id= à droite, les filtres en ?filtre=. Mêmes
   portes : offload_echeances_tableau, offload_parc_compte, et le geste
   offload_noter_intervention. */

export const metadata: Metadata = {
  title: "Échéances et renouvellements",
  description: "OFFLOAD : les entretiens, contrôles et contrats qui arrivent à échéance, et le client prévenu la semaine qui précède.",
};

export default function Page() {
  return (
    <Suspense>
      <BoiteEcheances />
    </Suspense>
  );
}
