import type { Metadata } from "next";
import Consommation from "@/components/espace3/pages/Consommation";

export const metadata: Metadata = { title: "Consommation et coûts de l'IA" };

export default function Page() {
  return <Consommation />;
}
