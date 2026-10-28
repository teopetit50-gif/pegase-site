import type { Metadata } from "next";
import { Suspense } from "react";
import { ReglagesReput } from "@/components/espace2/reput/ReglagesReput";

/* /espace2/reput/reglages — REPUT, les réglages des réponses et les demandes
   d'avis, sur la page Settings de Plain (28/10/2026) : la vue d'ensemble en
   sections de cartes, chaque carte ouvre sa sous-page sur la même route
   (?section=). Mêmes données et mêmes portes que la page d'avant. */

export const metadata: Metadata = {
  title: "Réglages et avis",
  description: "REPUT : signature, ton, mention de réponse automatisée, accusé de réception et demande d'avis.",
};

export default function Page() {
  return (
    <Suspense>
      <ReglagesReput />
    </Suspense>
  );
}
