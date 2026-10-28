import type { Metadata } from "next";
import { Suspense } from "react";
import Pilotage from "@/components/espace2/offload/Pilotage";

/* /espace2/offload/pilotage — OFFLOAD, le pilotage sur la page « Reporting » de
   Plain (28/10/2026) : sections repliables de cartes-graphiques, période et
   granularité dans l'adresse. Mêmes données et mêmes portes que la page d'avant. */

export const metadata: Metadata = {
  title: "Pilotage",
  description: "OFFLOAD : le chiffre remis en jeu, les taux de réponse comparés et les résultats par entité, exportables.",
};

export default function Page() {
  return (
    <Suspense>
      <Pilotage />
    </Suspense>
  );
}
