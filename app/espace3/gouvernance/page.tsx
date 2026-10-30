import type { Metadata } from "next";
import Gouvernance from "@/components/espace3/pages/Gouvernance";

export const metadata: Metadata = { title: "Gouvernance et journal" };

export default function Page() {
  return <Gouvernance />;
}
