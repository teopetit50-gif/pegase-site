import type { Metadata } from "next";
import { Suspense } from "react";
import HonorairesCabinet from "@/components/espace2/tamila/Honoraires";

/* /espace2/tamila/honoraires — les honoraires de tous les dossiers, sur la liste Tenants de Plain (30/10/2026, refonte des pages métiers) */

export const metadata: Metadata = {
  title: "Honoraires du cabinet",
  description: "Ce qui est à facturer, le reste dû et les provisions de chaque dossier, les conventions manquantes et les factures impayées.",
};

export default function PageHonorairesCabinet() {
  return (
    <Suspense>
      <HonorairesCabinet />
    </Suspense>
  );
}
