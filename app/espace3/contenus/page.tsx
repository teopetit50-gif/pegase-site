import type { Metadata } from "next";
import Contenus from "@/components/espace3/pages/Contenus";

export const metadata: Metadata = { title: "Contenus" };

export default function Page() {
  return <Contenus />;
}
