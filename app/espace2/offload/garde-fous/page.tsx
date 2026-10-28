import type { Metadata } from "next";
import { Suspense } from "react";
import ReglesGardeFous from "@/components/espace2/offload/ReglesGardeFous";

/* /espace2/offload/garde-fous — OFFLOAD, les garde-fous sur la liste des
   workflows de Plain (28/10/2026) : une règle par ligne, l'arrêt automatique en
   tête, les statuts en onglets, la carte au milieu pour écrire, retirer,
   suspendre ou relancer. Mêmes portes que l'écran d'avant
   (components/espace/offload/GardeFous.tsx). */

export const metadata: Metadata = {
  title: "Garde-fous",
  description: "OFFLOAD : l'arrêt au premier doute, les règles écrites en français et les messages retenus.",
};

export default function Page() {
  return (
    <Suspense>
      <ReglesGardeFous />
    </Suspense>
  );
}
