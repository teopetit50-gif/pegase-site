import type { Metadata } from "next";
import { Suspense } from "react";
import EcranTamila from "@/components/espace/tamila/EcranTamila";
import Habille from "@/components/espace2/Habille";
import Reglages from "@/components/espace2/tamila/Reglages";

/* /espace2/tamila/reglages — les réglages du cabinet (02/11/2026, refonte des pages métiers) : copie 1:1
   de Settings › Team de Linear. « ?ancien=1 » rend l'écran d'avant. */

export const metadata: Metadata = {
  title: "Réglages du cabinet",
  description: "Installation, phrase du cabinet, coffre à clés, clé d'index, en-tête des factures et durées de conservation.",
};

type Params = Record<string, string | string[] | undefined>;

export default async function PageReglages({ searchParams }: { searchParams: Promise<Params> }) {
  if ((await searchParams).ancien === "1") {
    return (
      <Habille>
        <EcranTamila />
      </Habille>
    );
  }
  return (
    <Suspense>
      <Reglages />
    </Suspense>
  );
}
