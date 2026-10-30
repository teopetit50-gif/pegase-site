import type { Metadata } from "next";
import Demander from "@/components/espace3/pages/Demander";

export const metadata: Metadata = { title: "Demander au groupe" };

export default function Page() {
  return <Demander />;
}
