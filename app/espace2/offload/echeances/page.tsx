import type { Metadata } from "next";
import { PageEcheances } from "@/components/espace2/offload/Sections";

/* /espace2/offload/echeances — OFFLOAD, les échéances et renouvellements (page de fonction, 21/10/2026). */

export const metadata: Metadata = {
  title: "Échéances et renouvellements",
  description: "OFFLOAD : les entretiens, contrôles et contrats qui arrivent à échéance, et le client prévenu la semaine qui précède.",
};

export default function Page() {
  return <PageEcheances />;
}
