import type { Metadata } from "next";
import { notFound } from "next/navigation";
import AVenir from "@/components/espace2/AVenir";
import { MODULES, moduleDe } from "@/components/espace2/modules";

/* Les modules pas encore redessinés : leur vue d'ensemble renvoie vers
   l'écran actuel. FILED a ses propres pages (./filed). */

export const dynamicParams = false;

export function generateStaticParams() {
  return MODULES.filter((m) => m.cle !== "filed").map((m) => ({ module: m.cle }));
}

export async function generateMetadata({ params }: { params: Promise<{ module: string }> }): Promise<Metadata> {
  const m = moduleDe((await params).module);
  return { title: m ? `${m.nom} · ${m.libelle}` : "Module" };
}

export default async function PageModule({ params }: { params: Promise<{ module: string }> }) {
  const m = moduleDe((await params).module);
  if (!m) notFound();
  return <AVenir titre={m.libelle} description={m.description} ancien={m.ancien} />;
}
