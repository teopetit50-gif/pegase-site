import type { Metadata } from "next";
import Automatisations from "@/components/espace2/Automatisations";

export const metadata: Metadata = {
  title: "Automatisations",
};

export default function Page() {
  return <Automatisations />;
}
