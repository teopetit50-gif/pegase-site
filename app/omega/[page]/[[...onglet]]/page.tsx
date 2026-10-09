import type { Metadata } from "next";
import { notFound } from "next/navigation";
import EcranOmega from "@/components/omega/EcranOmega";
import { PAGES_OMEGA } from "@/components/omega/pages";

type Params = { params: Promise<{ page: string; onglet?: string[] }>; searchParams: Promise<Record<string, string | string[] | undefined>> };

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { page } = await params;
  return { title: PAGES_OMEGA[page]?.titre ?? "Pilotage" };
}

/* tous les écrans du pilotage sauf la vue d'ensemble et l'audit : la
   correspondance avec /espace2 est dans components/omega/pages.ts */
export default async function Page({ params, searchParams }: Params) {
  const { page, onglet } = await params;
  const sp = await searchParams;
  const un = (k: string) => (typeof sp[k] === "string" ? (sp[k] as string) : undefined);
  const def = PAGES_OMEGA[page];
  if (!def || (onglet && onglet.length > 1)) notFound();
  const actif = def.onglets.find((o) => o.cle === (onglet?.[0] ?? ""));
  if (!actif) notFound();
  return <EcranOmega page={page} def={def} actif={actif} filtres={{ secteur: un("secteur"), q: un("q"), tel: un("tel"), statut: un("statut"), page: un("page") }} />;
}
