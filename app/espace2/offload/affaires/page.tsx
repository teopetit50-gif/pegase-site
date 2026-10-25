import type { Metadata } from "next";
import { PageAffaires } from "@/components/espace2/offload/Sections";

/* /espace2/offload/affaires — OFFLOAD, les affaires restées en plan (page de fonction, 21/10/2026). */

export const metadata: Metadata = {
  title: "Affaires restées en plan",
  description: "OFFLOAD : les commandes non reprises et les interventions non retirées, avec la valeur immobilisée.",
};

export default function Page() {
  return <PageAffaires />;
}
