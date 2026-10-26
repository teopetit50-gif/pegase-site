import type { Metadata } from "next";
import Urgences from "@/components/espace2/reput/Urgences";

/* /espace2/reput/urgences — REPUT, urgences et escalade (page de fonction, 21/10/2026). */

export const metadata: Metadata = {
  title: "Urgences et escalade",
  description: "REPUT : les urgences, réclamations, litiges et demandes à reprendre en main, chacune avec son délai.",
};

export default function Page() {
  return <Urgences />;
}
