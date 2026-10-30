import type { Metadata } from "next";
import { Suspense } from "react";
import { FilsLitiges } from "@/components/espace3/cashd/FilsCashd";

/* /espace3/cashd/litiges — CASHD, les comptes sortis du cycle de relance, sur la
   liste des fils de Plain (28/10/2026) : onglets En litige · En pause · Toutes
   les situations, filtres et tri dans l'adresse, la carte du compte au milieu. */

export const metadata: Metadata = {
  title: "Litiges et pauses",
  description: "CASHD : les comptes en litige, en pause, en recouvrement ou sans contact, sortis du cycle de relance.",
};

export default function Page() {
  return (
    <Suspense>
      <FilsLitiges />
    </Suspense>
  );
}
