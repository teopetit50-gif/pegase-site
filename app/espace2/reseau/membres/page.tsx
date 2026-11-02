import type { Metadata } from "next";
import { Suspense } from "react";
import { MembresListe } from "@/components/espace2/reseau/membres-liste";

/* /espace2/reseau/membres — l'annuaire vérifié du Réseau Omega (02/11/2026) :
   recherche, filtres (île, secteur, propose, cherche, badges) tenus dans
   l'adresse, et le panneau « Ce que je montre au réseau » de l'organisation
   connectée. Données d'exemple seulement : en base réelle, état vide
   (components/espace2/reseau/membres-liste.tsx). */

export const metadata: Metadata = {
  title: "Membres du réseau",
};

export default function Page() {
  return (
    <Suspense>
      <MembresListe />
    </Suspense>
  );
}
