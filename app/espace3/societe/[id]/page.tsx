import type { Metadata } from "next";
import { notFound } from "next/navigation";
import FicheSociete from "@/components/espace3/pages/FicheSociete";
import { SOCIETES, societe } from "@/components/espace3/donnees";

export function generateStaticParams() {
  return SOCIETES.map((s) => ({ id: s.id }));
}

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  return { title: societe(id)?.nom ?? "Société" };
}

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const s = societe(id);
  if (!s) notFound();
  return <FicheSociete s={s} />;
}
