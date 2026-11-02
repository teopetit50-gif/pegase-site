import type { Metadata } from "next";
import { Suspense } from "react";
import VueReferentiel from "@/components/espace2/varelo/VueReferentiel";

/* /espace2/varelo/referentiel — les objets du groupe, leurs codes locaux et les lots à valider
   (02/11/2026) : Attio, liste People et fiche d'un contact, au 1:1. « ?objet=<id>&nature=… » ouvre
   la fiche d'un objet ; « ?vue=lots » et « ?vue=decisions » les lots et les dernières décisions. */

export const metadata: Metadata = {
  title: "Référentiel du groupe",
  description: "Chaque client, fournisseur ou article reçoit un seul nom pour tout le groupe, rattaché aux codes de chaque société.",
};

export default function PageReferentiel() {
  return (
    <Suspense>
      <VueReferentiel />
    </Suspense>
  );
}
