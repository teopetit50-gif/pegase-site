import type { Metadata } from "next";
import { Suspense } from "react";
import { FilsDevis } from "@/components/espace2/cashd/FilsCashd";

/* /espace2/cashd/devis — CASHD, les devis sans réponse, sur la liste des fils
   de Plain (28/10/2026) : onglets À rappeler · Avant le premier rappel · Tous,
   filtres et tri dans l'adresse, la carte du devis au milieu. */

export const metadata: Metadata = {
  title: "Devis sans réponse",
  description: "CASHD : les devis envoyés qui attendent une réponse, et l'étape de leurs rappels.",
};

export default function Page() {
  return (
    <Suspense>
      <FilsDevis />
    </Suspense>
  );
}
