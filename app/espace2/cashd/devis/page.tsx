import type { Metadata } from "next";
import { Devis } from "@/components/espace2/cashd/Fonctions";

/* /espace2/cashd/devis — CASHD, les devis sans réponse (page de fonction, 21/10/2026). */

export const metadata: Metadata = {
  title: "Devis sans réponse",
  description: "CASHD : les devis envoyés qui attendent une réponse, et l'étape de leurs rappels.",
};

export default function Page() {
  return <Devis />;
}
