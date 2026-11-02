import type { Metadata } from "next";
import { Suspense } from "react";
import VueContrats from "@/components/espace2/varelo/VueContrats";

/* /espace2/varelo/contrats — les contrats du groupe à dénoncer (02/11/2026) : Plain, Accounts
   (liste et fiche), au 1:1. « ?contrat=<id> » ouvre la fiche (repère grp_contrats). */

export const metadata: Metadata = {
  title: "Contrats du groupe",
  description: "Les contrats de chaque société, rangés par date limite de dénonciation, avec leur calcul et leur validation.",
};

export default function PageContrats() {
  return (
    <Suspense>
      <VueContrats />
    </Suspense>
  );
}
