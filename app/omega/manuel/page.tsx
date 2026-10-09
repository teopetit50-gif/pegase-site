import type { Metadata } from "next";
import PageOmega from "@/components/omega/PageOmega";

export const metadata: Metadata = { title: "Manuel" };

export default function Page() {
  return <PageOmega slug="manuel" titre="Manuel" />;
}
