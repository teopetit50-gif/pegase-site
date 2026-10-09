import type { Metadata } from "next";
import { notFound } from "next/navigation";
import PageOmega, { type Onglet } from "@/components/omega/PageOmega";

export const metadata: Metadata = { title: "Vendre" };

const ONGLETS: [string, string][] = [
  ["", "Méthode"],
  ["fiches", "Toutes les fiches"],
  ["cashd", "CASHD"],
  ["reput", "REPUT"],
  ["filed", "FILED"],
  ["offload", "OFFLOAD"],
  ["daliro", "Daliro"],
  ["tavaro", "Tavaro"],
  ["lorani", "Lorani"],
  ["tamila", "Tamila"],
  ["tiroma", "Tiroma"],
  ["varelo", "Varelo"],
];

const onglets: Onglet[] = ONGLETS.map(([cle, libelle]) => ({ slug: cle ? `vendre-${cle}` : "vendre", libelle, href: cle ? `/omega/vendre/${cle}` : "/omega/vendre" }));

export default async function Page({ params }: { params: Promise<{ fiche?: string[] }> }) {
  const { fiche } = await params;
  if (fiche && fiche.length > 1) notFound();
  const cle = fiche?.[0] ?? "";
  if (!ONGLETS.some(([c]) => c === cle)) notFound();
  return <PageOmega slug={cle ? `vendre-${cle}` : "vendre"} titre="Vendre" onglets={onglets} />;
}
