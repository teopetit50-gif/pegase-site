import type { Metadata } from "next";
import Campagnes from "@/components/espace3/pages/Campagnes";

export const metadata: Metadata = { title: "Campagnes" };

export default function Page() {
  return <Campagnes />;
}
