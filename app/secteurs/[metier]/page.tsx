import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { SECTEURS, secteur } from "@/lib/secteurs";

/* ══════════════════════════════════════════════════════════════════════════
   /secteurs/<slug> — le site du SaaS, tel qu'il est déployé (24/09/2026).

   Le cadre couvre tout l'écran, AU-DESSUS de l'en-tête d'Omega (qui vit dans
   app/layout.tsx et ne se retire pas page par page) : la page doit montrer
   le design du SaaS à l'identique, en-tête du SaaS compris. Deux en-têtes
   empilés, c'est ce qu'il ne faut pas voir. Le pourquoi du cadre plutôt
   qu'une copie du code est écrit en tête de lib/secteurs.ts.

   `dynamicParams = false` : un slug absent de la table rend un 404, pas un
   cadre vide.
   ══════════════════════════════════════════════════════════════════════ */

export const dynamicParams = false;

export function generateStaticParams() {
  return SECTEURS.map((s) => ({ metier: s.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ metier: string }>;
}): Promise<Metadata> {
  const s = secteur((await params).metier);
  if (!s) return {};
  return {
    title: `${s.saas} · ${s.metier} | Omega.AI`,
    description: s.texte,
    alternates: { canonical: `/secteurs/${s.slug}` },
  };
}

export default async function PageSecteur({
  params,
}: {
  params: Promise<{ metier: string }>;
}) {
  const s = secteur((await params).metier);
  if (!s) notFound();
  return (
    <main>
      <h1 className="sr-only">
        {s.saas}, pour les {s.metier.toLowerCase()}
      </h1>
      <iframe
        src={s.url}
        title={`${s.saas}, le site`}
        className="fixed inset-0 z-[200] h-[100dvh] w-full border-0 bg-white"
      />
    </main>
  );
}
