import type { Metadata } from "next";
import Coffre from "@/components/espace3/pages/Coffre";

export const metadata: Metadata = { title: "Le coffre du groupe" };

export default function Page() {
  return <Coffre />;
}
