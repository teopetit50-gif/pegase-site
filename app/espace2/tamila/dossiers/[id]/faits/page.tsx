import type { Metadata } from "next";
import { Suspense } from "react";
import EcranTamila from "@/components/espace/tamila/EcranTamila";
import Habille from "@/components/espace2/Habille";
import DossierFaits from "@/components/espace2/tamila/DossierFaits";

/* /espace2/tamila/dossiers/[id]/faits — le dossier de faits d'un dossier (02/11/2026, pages manquantes) : copie 1:1
   de la page d'un ticket de Linear. Les lectures longues (b4_15) déchiffrées dans le navigateur comme la fenêtre
   « Lire » de la fiche. « ?ancien=1 » rend l'écran d'avant. */

export const metadata: Metadata = {
  title: "Dossier de faits",
  description: "La chronologie sourcée, les contradictions et les pièces citées d'un dossier, chaque fait renvoyé à sa pièce.",
};

type Params = Record<string, string | string[] | undefined>;

export default async function PageFaits({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<Params> }) {
  const [{ id }, q] = await Promise.all([params, searchParams]);
  if (q.ancien === "1") {
    return (
      <Habille>
        <EcranTamila />
      </Habille>
    );
  }
  return (
    <Suspense>
      <DossierFaits id={id} />
    </Suspense>
  );
}
