import type { Metadata } from "next";
import Decisions from "@/components/espace3/pages/Decisions";

export const metadata: Metadata = { title: "Décisions à prendre" };

export default function Page() {
  return <Decisions />;
}
