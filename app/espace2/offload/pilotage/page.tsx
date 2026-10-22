import type { Metadata } from "next";
import { PagePilotage } from "@/components/espace2/offload/Sections";

/* /espace2/offload/pilotage — OFFLOAD, le pilotage (page de fonction, 21/10/2026). */

export const metadata: Metadata = {
  title: "Pilotage",
  description: "OFFLOAD : le chiffre remis en jeu, les taux de réponse comparés et les résultats par entité, exportables.",
};

export default function Page() {
  return <PagePilotage />;
}
