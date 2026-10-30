import type { Metadata } from "next";
import Echeances from "@/components/espace3/pages/Echeances";

export const metadata: Metadata = { title: "Échéances et risques" };

export default function Page() {
  return <Echeances />;
}
