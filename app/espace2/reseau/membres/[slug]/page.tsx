import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { MEMBRES } from "@/components/espace2/reseau/membres";
import { FicheMembre } from "@/components/espace2/reseau/membres-fiche";

/* /espace2/reseau/membres/<slug> — la fiche d'un membre du Réseau Omega
   (02/11/2026) : activité, commune, entrée dans le réseau, ce qu'il propose
   et cherche, badges vérifiés par la donnée, « Écrire » et « Demander une
   mise en relation » (components/espace2/reseau/membres-fiche.tsx). Un
   identifiant inconnu donne la page introuvable. */

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const m = MEMBRES.find((x) => x.slug === slug);
  return { title: m ? `${m.nom} · Membres du réseau` : "Membre introuvable" };
}

export default async function Page({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  if (!MEMBRES.some((m) => m.slug === slug)) notFound();
  return <FicheMembre slug={slug} />;
}
