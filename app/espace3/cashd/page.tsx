import type { Metadata } from "next";
import { Suspense } from "react";
import Debiteurs from "@/components/espace3/cashd/Debiteurs";

/* /espace3/cashd — la première page de CASHD, sur le gabarit Linear
   (28/10/2026, demande de Teo : la page « Issues » de Linear au 1:1, modèle
   des premières pages de FILED, REPUT et OFFLOAD). Elle remplace le tableau
   de bord du 22/10 (TableauCashd) : les débiteurs groupés par situation,
   le détail d'un débiteur en ?compte=, les chiffres dans le panneau Détails. */

export const metadata: Metadata = {
  title: "Relances",
  description: "CASHD : qui vous doit de l'argent, depuis quand, où en est chaque relance, et l'encours échu au total.",
};

export default function PageCashd() {
  return (
    <Suspense>
      <Debiteurs />
    </Suspense>
  );
}
