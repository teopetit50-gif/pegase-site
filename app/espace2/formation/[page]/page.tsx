import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { PageFormationVue } from "@/components/espace2/formation/Formation";
import { PAGES } from "@/components/espace2/formation/pages";

/* les pages de la formation (29/10/2026 ; le guide y est depuis le 03/11, visuel « B + C ») :
   « Bien démarrer » et une page par module. Contenu : components/espace2/
   formation/pages.ts ; une page ajoutée là existe ici sans autre retouche. */

type Params = { params: Promise<{ page: string }> };

export function generateStaticParams() {
  return Object.keys(PAGES).map((page) => ({ page }));
}

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { page } = await params;
  return { title: PAGES[page] ? `${PAGES[page].titre} · Formation` : "Formation" };
}

export default async function Page({ params }: Params) {
  const { page } = await params;
  if (!PAGES[page]) notFound();
  return <PageFormationVue page={PAGES[page]} />;
}
