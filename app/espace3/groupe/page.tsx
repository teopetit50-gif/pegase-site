import type { Metadata } from "next";
import Groupe from "@/components/espace3/pages/Groupe";

export const metadata: Metadata = { title: "Le groupe sur une page" };

export default function Page() {
  return <Groupe />;
}
