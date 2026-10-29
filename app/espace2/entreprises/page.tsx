import type { Metadata } from "next";
import { Suspense } from "react";
import { Entreprises } from "@/components/espace2/lin/LinearClients";

/* /espace2/entreprises — l'annuaire des entreprises, sur la liste « Projects »
   de Linear et la page d'un projet (28/10/2026 ; le modèle « Customers » est
   désactivé sur l'espace de Teo, c'est le repli du brief). Une ligne s'ouvre
   en ?id=, les filtres vivent dans l'adresse (?type=, ?tri=). Mêmes fiches
   qu'avant, gardées sur cet appareil (components/espace2/lin/LinearClients.tsx). */

export const metadata: Metadata = {
  title: "Entreprises",
};

export default function Page() {
  return (
    <Suspense>
      <Entreprises />
    </Suspense>
  );
}
