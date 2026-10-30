import type { Metadata } from "next";
import Clients from "@/components/espace3/pages/Clients";

export const metadata: Metadata = { title: "Clients du groupe" };

export default function Page() {
  return <Clients />;
}
