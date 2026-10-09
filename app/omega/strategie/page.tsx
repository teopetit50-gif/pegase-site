import type { Metadata } from "next";
import PageOmega from "@/components/omega/PageOmega";

export const metadata: Metadata = { title: "Stratégie" };

export default function Page() {
  return <PageOmega slug="strategie" titre="Stratégie" />;
}
