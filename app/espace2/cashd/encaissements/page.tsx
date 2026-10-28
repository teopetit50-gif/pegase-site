import type { Metadata } from "next";
import { Suspense } from "react";
import Encaissements from "@/components/espace2/cashd/Encaissements";

/* /espace2/cashd/encaissements — CASHD, les règlements à imputer sur la page
   « Reporting » de Plain (28/10/2026) : cartes-graphiques sur la période et la
   granularité de l'adresse, puis la liste à rapprocher. Mêmes données que la page d'avant. */

export const metadata: Metadata = {
  title: "Encaissements",
  description: "CASHD : les règlements reçus qui ne soldent pas encore une facture, à rapprocher.",
};

export default function Page() {
  return (
    <Suspense>
      <Encaissements />
    </Suspense>
  );
}
