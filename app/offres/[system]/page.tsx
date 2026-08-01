import type { Metadata } from "next";
import { notFound } from "next/navigation";
import PageShell from "@/components/PageShell";
import PageMotion from "@/components/PageMotion";
import { FAMILLES } from "@/lib/content";
import { FICHES } from "@/lib/fiches";
import GabaritHome from "@/components/offres/gabarits/GabaritHome";
import GabaritIntegration from "@/components/offres/gabarits/GabaritIntegration";
import GabaritPublish from "@/components/offres/gabarits/GabaritPublish";
import {
  ACCENT_FAMILLE,
  ACCENT_FAMILLE_SOMBRE,
  type MoteurAvecFamille,
} from "@/components/offres/gabarits/types";

/* ══════════════════════════════════════════════════════════════════════
   /offres/[system] — la fiche d'un moteur

   25/07/2026 — Teo veut UN design par moteur. Cette route ne fait donc plus
   que trois choses : résoudre le moteur, normaliser sa fiche, et aiguiller
   vers le gabarit qui lui est affecté. Tout le rendu vit dans
   components/offres/gabarits/, tous les gabarits partagent le même contrat
   (voir types.ts) : en ajouter un se résume à écrire le composant et à
   poser une ligne dans GABARITS ci-dessous.

   Gabarits en place :
     home        d'après ocoya.com                       → PAYD
     integration d'après ocoya.com/integrations/[marque]  → ANSWR, REVIVE
     publish     d'après ocoya.com/features/publish       → OFFLOAD

   Les huit moteurs restants tombent sur `home` par défaut, en attendant que
   Teo fournisse leur page de référence.
   ══════════════════════════════════════════════════════════════════════ */

const GABARITS: Record<string, "home" | "integration" | "publish"> = {
  PAYD: "home",
  ANSWR: "integration",
  OFFLOAD: "publish",
  REVIVE: "integration",
};

const ALL: MoteurAvecFamille[] = FAMILLES.flatMap((f) =>
  f.moteurs.map((m) => ({ ...m, famille: f }))
);

export function generateStaticParams() {
  return ALL.map((m) => ({ system: m.system.toLowerCase() }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ system: string }>;
}): Promise<Metadata> {
  const { system } = await params;
  const m = ALL.find((x) => x.system.toLowerCase() === system);
  if (!m) return { title: "Moteur — Omega" };
  const fiche = FICHES[m.system];
  return { title: `${m.title} — Omega`, description: fiche?.pitch };
}

export default async function FicheMoteurPage({
  params,
}: {
  params: Promise<{ system: string }>;
}) {
  const { system } = await params;
  const idx = ALL.findIndex((x) => x.system.toLowerCase() === system);
  if (idx === -1) notFound();
  const m = ALL[idx];
  const fiche = FICHES[m.system];
  if (!fiche) notFound();

  /* `fonctionnement` est soit un paragraphe, soit plusieurs — on normalise */
  const paragraphes = Array.isArray(fiche.fonctionnement)
    ? fiche.fonctionnement
    : [fiche.fonctionnement];

  /* le rôle du moteur = son titre amputé de son nom (« PAYD — relance… ») */
  const sansNom = (titre: string, nom: string) =>
    titre.startsWith(nom) ? titre.slice(nom.length).replace(/^\s*[—–-]\s*/, "") : titre;

  const props = {
    m,
    fiche,
    role: sansNom(m.title, m.system),
    paragraphes,
    accent: ACCENT_FAMILLE[m.famille.id] ?? "#09090b",
    accentSombre: ACCENT_FAMILLE_SOMBRE[m.famille.id] ?? "#fafafa",
    autres: ALL.filter((x) => x.system !== m.system).map((x) => ({
      system: x.system,
      role: sansNom(x.title, x.system),
      pitch: FICHES[x.system]?.pitch ?? x.benefit,
      href: `/offres/${x.system.toLowerCase()}`,
    })),
  };

  const gabarit = GABARITS[m.system] ?? "home";

  return (
    <PageShell>
      <PageMotion />
      {gabarit === "publish" ? (
        <GabaritPublish {...props} />
      ) : gabarit === "integration" ? (
        <GabaritIntegration {...props} />
      ) : (
        <GabaritHome {...props} />
      )}
    </PageShell>
  );
}
