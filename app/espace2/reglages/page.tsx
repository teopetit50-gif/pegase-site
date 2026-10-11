import type { Metadata } from "next";
import Reglages from "@/components/espace2/Reglages";

export const metadata: Metadata = {
  title: "Réglages",
};

export default function PageReglages() {
  return <Reglages />;
}
