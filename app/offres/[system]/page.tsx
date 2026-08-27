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
   /offres/[system] — la page d'un paquet

   25/07/2026 — Teo veut UN design par page. Cette route ne fait donc que
   trois choses : résoudre le paquet, normaliser sa fiche, et aiguiller vers
   le gabarit qui lui est affecté. Tout le rendu vit dans
   components/offres/gabarits/, tous les gabarits partagent le même contrat
   (voir types.ts) : en ajouter un se résume à écrire le composant et à
   poser une ligne dans GABARITS ci-dessous.

   05/08/2026 — les douze fiches moteur deviennent six pages de paquet, et
   le segment d'URL passe du nom de code au slug descriptif (`payd` →
   `relances-impayes`). Chaque paquet hérite du gabarit de son moteur
   principal, donc aucun design ne bouge. Le nom du dossier reste [system]
   pour ne pas remuer la route ; c'est bien le slug qui circule dedans.

   Gabarits en place :
     home        d'après ocoya.com                       → CASHD, PULSE, VAULT
     integration d'après ocoya.com/integrations/[marque]  → FRONTD, RELOAD
     publish     d'après ocoya.com/features/publish       → FILED
   ══════════════════════════════════════════════════════════════════════ */

const GABARITS: Record<string, "home" | "integration" | "publish"> = {
  CASHD: "home",
  FRONTD: "integration",
  FILED: "publish",
  RELOAD: "integration",
};

const ALL: MoteurAvecFamille[] = FAMILLES.flatMap((f) =>
  f.moteurs.map((m) => ({ ...m, famille: f }))
);

export function generateStaticParams() {
  return ALL.map((m) => ({ system: m.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ system: string }>;
}): Promise<Metadata> {
  const { system } = await params;
  const m = ALL.find((x) => x.slug === system);
  if (!m) return { title: "Offre | Omega.AI" };
  const fiche = FICHES[m.system];
  /* 13/08 — la description reprenait le pitch, qui est une accroche : elle
     travaille au-dessus du pli, le contexte déjà posé. Une meta description
     travaille sans contexte, dans une liste de résultats. `fiche.meta` porte
     la version écrite pour cet usage ; sans elle, on retombe sur le pitch. */
  return { title: `${m.title} | Omega.AI`, description: fiche?.meta ?? fiche?.pitch };
}

export default async function FicheMoteurPage({
  params,
}: {
  params: Promise<{ system: string }>;
}) {
  const { system } = await params;
  const idx = ALL.findIndex((x) => x.slug === system);
  if (idx === -1) notFound();
  const m = ALL[idx];
  const fiche = FICHES[m.system];
  if (!fiche) notFound();

  /* `fonctionnement` est soit un paragraphe, soit plusieurs — on normalise */
  const paragraphes = Array.isArray(fiche.fonctionnement)
    ? fiche.fonctionnement
    : [fiche.fonctionnement];

  /* le rôle du paquet = son titre amputé de son nom (« CASHD — relance… ») */
  const sansNom = (titre: string, nom: string) =>
    titre.startsWith(nom) ? titre.slice(nom.length).replace(/^\s*[ : –-]\s*/, "") : titre;

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
      href: `/offres/${x.slug}`,
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
