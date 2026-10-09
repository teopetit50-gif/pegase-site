import type { Metadata } from "next";
import AccueilOmega from "@/components/omega/AccueilOmega";
import { lireLignes } from "@/lib/omega/donnees";

export const metadata: Metadata = { title: "Vue d'ensemble" };

export default async function Page() {
  return <AccueilOmega lignes={await lireLignes()} />;
}
