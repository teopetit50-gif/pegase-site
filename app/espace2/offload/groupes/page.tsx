import type { Metadata } from "next";
import { Suspense } from "react";
import { PageGroupes } from "@/components/espace2/offload/Groupes";

/* /espace2/offload/groupes — OFFLOAD, les groupes clients sur les pages
   « Tenants » de Plain (28/10/2026) : la liste des groupes et des
   rattachements proposés, et la fiche d'un groupe en pleine page (?id=). */

export const metadata: Metadata = {
  title: "Groupes clients",
  description: "OFFLOAD : les entités d'un même client sous leur raison sociale mère, avec le chiffre consolidé.",
};

export default function Page() {
  return (
    <Suspense>
      <PageGroupes />
    </Suspense>
  );
}
