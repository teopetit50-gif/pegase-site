import type { Metadata } from "next";
import { Suspense } from "react";
import FilsBoite from "@/components/espace3/filed/FilsBoite";

/* /espace3/filed/boite — la boîte de réception de FILED sur la liste des fils
   de Plain (28/10/2026) : onglets Nouveaux · Lus · Tous, filtres et tri dans
   l'adresse, le courriel ouvert dans la carte au milieu. Mêmes données et
   mêmes gestes que l'écran d'avant (components/espace/filed/EcranBoite.tsx). */

export const metadata: Metadata = {
  title: "Boîte de réception",
  description: "Les courriels reçus sur la boîte de FILED : expéditeur, objet, pièces jointes, et le document FILED né de chaque facture.",
};

export default function PageFiledBoite() {
  return (
    <Suspense>
      <FilsBoite />
    </Suspense>
  );
}
