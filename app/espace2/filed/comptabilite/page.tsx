import type { Metadata } from "next";
import { Suspense } from "react";
import Comptabilite from "@/components/espace2/filed/Comptabilite";

/* /espace2/filed/comptabilite — FILED, la comptabilité sur la page « Reporting »
   de Plain (28/10/2026) : les écritures d'achat en cartes-graphiques, l'export du
   FEC et les comptes de FILED. Mêmes portes que l'écran d'avant. */

export const metadata: Metadata = {
  title: "Comptabilité",
  description: "Le fichier des écritures comptables (FEC) des achats tenus par FILED, et les comptes utilisés pour les écrire.",
};

export default function PageComptabilite() {
  return (
    <Suspense>
      <Comptabilite />
    </Suspense>
  );
}
