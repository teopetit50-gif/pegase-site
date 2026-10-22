import type { Metadata } from "next";
import { BalanceAgee } from "@/components/espace2/cashd/Fonctions";

/* /espace2/cashd/balance — CASHD, la balance âgée (page de fonction, 21/10/2026). */

export const metadata: Metadata = {
  title: "Balance âgée",
  description: "CASHD : l'encours de chaque compte, rangé par ancienneté de retard, exportable vers un tableur.",
};

export default function Page() {
  return <BalanceAgee />;
}
