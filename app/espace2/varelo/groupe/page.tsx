import type { Metadata } from "next";
import { Suspense } from "react";
import VueGroupe from "@/components/espace2/varelo/VueGroupe";

/* /espace2/varelo/groupe — le groupe sur une page (02/11/2026) : Linear, liste des Initiatives,
   au 1:1. « ?societe=<entite_id> » et « ?depot=<id> » désignent la ligne de la société. */

export const metadata: Metadata = {
  title: "Le groupe sur une page",
  description: "Ventes, résultat, trésorerie et écarts de chaque société du groupe, d'après sa dernière balance générale.",
};

export default function PageGroupe() {
  return (
    <Suspense>
      <VueGroupe />
    </Suspense>
  );
}
