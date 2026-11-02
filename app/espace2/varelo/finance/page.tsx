import type { Metadata } from "next";
import { Suspense } from "react";
import VueFinance from "@/components/espace2/varelo/VueFinance";

/* /espace2/varelo/finance — encours du groupe, réciproques intragroupe et ventes des caisses
   (02/11/2026) : Plain, Insights, au 1:1. « ?objet=<id> » et « ?depot=<id> » désignent leur ligne. */

export const metadata: Metadata = {
  title: "Finance du groupe",
  description: "L'encours du groupe par client et par fournisseur, les comptes réciproques intragroupe et les ventes des caisses.",
};

export default function PageFinance() {
  return (
    <Suspense>
      <VueFinance />
    </Suspense>
  );
}
