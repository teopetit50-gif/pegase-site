import type { Metadata } from "next";
import { notFound } from "next/navigation";
import PagePub from "@/components/pub/PagePub";
import { ACCROCHES } from "@/lib/pub";

/* /p/<slug> — pages d'atterrissage des annonces (21/09/2026).
   Statiques, une par accroche de lib/pub.ts, hors index. */

export function generateStaticParams() {
  return ACCROCHES.map((a) => ({ slug: a.slug }));
}

export const dynamicParams = false;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const a = ACCROCHES.find((x) => x.slug === slug);
  if (!a) return {};
  return {
    title: `${a.titre} | Omega.AI`,
    description: a.chapo,
    robots: { index: false, follow: false },
  };
}

export default async function PubPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const a = ACCROCHES.find((x) => x.slug === slug);
  if (!a) notFound();
  return <PagePub a={a} />;
}
