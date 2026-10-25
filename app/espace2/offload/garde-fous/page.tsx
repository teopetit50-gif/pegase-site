import type { Metadata } from "next";
import { PageGardeFous } from "@/components/espace2/offload/Sections";

/* /espace2/offload/garde-fous — OFFLOAD, les garde-fous (page de fonction, 21/10/2026). */

export const metadata: Metadata = {
  title: "Garde-fous",
  description: "OFFLOAD : l'arrêt au premier doute, les règles écrites en français et les messages retenus.",
};

export default function Page() {
  return <PageGardeFous />;
}
