import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Article from "@/components/espace3/formation/Article";
import { PAGES } from "@/components/espace3/formation/pages";

/* les pages de la formation après le guide de démarrage (29/10/2026) :
   « Bien démarrer » et une page par module. Contenu : components/espace3/
   formation/pages.ts ; une page ajoutée là existe ici sans autre retouche. */

type Params = { params: Promise<{ page: string }> };

export function generateStaticParams() {
  return Object.keys(PAGES)
    .filter((cle) => cle !== "guide")
    .map((page) => ({ page }));
}

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { page } = await params;
  return { title: PAGES[page] ? `${PAGES[page].titre} · Formation` : "Formation" };
}

export default async function Page({ params }: Params) {
  const { page } = await params;
  if (page === "guide" || !PAGES[page]) notFound();
  return <Article page={PAGES[page]} />;
}
