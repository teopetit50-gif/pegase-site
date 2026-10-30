import type { Metadata } from "next";
import Directions from "@/components/espace3/pages/Directions";

export const metadata: Metadata = { title: "Les directions" };

export default function Page() {
  return <Directions />;
}
