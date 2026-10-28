import type { Metadata } from "next";
import { Suspense } from "react";
import { BalanceAgee } from "@/components/espace2/cashd/Clients";

/* /espace2/cashd/balance — CASHD, la balance âgée sur les pages « Tenants » de
   Plain (28/10/2026) : la liste des comptes, et la fiche d'un débiteur en
   pleine page (?id=). Mêmes données et mêmes portes que la page d'avant. */

export const metadata: Metadata = {
  title: "Balance âgée",
  description: "CASHD : l'encours de chaque compte, rangé par ancienneté de retard, exportable vers un tableur.",
};

export default function Page() {
  return (
    <Suspense>
      <BalanceAgee />
    </Suspense>
  );
}
