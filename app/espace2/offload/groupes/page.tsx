import type { Metadata } from "next";
import { PageGroupes } from "@/components/espace2/offload/Sections";

/* /espace2/offload/groupes — OFFLOAD, les groupes clients (page de fonction, 21/10/2026). */

export const metadata: Metadata = {
  title: "Groupes clients",
  description: "OFFLOAD : les entités d'un même client sous leur raison sociale mère, avec le chiffre consolidé.",
};

export default function Page() {
  return <PageGroupes />;
}
