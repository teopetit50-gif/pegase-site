import type { Metadata } from "next";
import { notFound } from "next/navigation";
import PageOmega, { type Onglet } from "@/components/omega/PageOmega";

export const metadata: Metadata = { title: "Vidéos" };

const ONGLETS: [string, string][] = [
  ["", "Mode d'emploi et calendrier"],
  ["general", "Général"],
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

const onglets: Onglet[] = ONGLETS.map(([cle, libelle]) => ({ slug: cle ? `videos-${cle}` : "videos", libelle, href: cle ? `/omega/videos/${cle}` : "/omega/videos" }));

export default async function Page({ params }: { params: Promise<{ produit?: string[] }> }) {
  const { produit } = await params;
  if (produit && produit.length > 1) notFound();
  const cle = produit?.[0] ?? "";
  if (!ONGLETS.some(([c]) => c === cle)) notFound();
  return <PageOmega slug={cle ? `videos-${cle}` : "videos"} titre="Vidéos" onglets={onglets} />;
}
