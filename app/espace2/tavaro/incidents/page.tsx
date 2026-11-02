import type { Metadata } from "next";
import { Suspense } from "react";
import Incidents from "@/components/espace2/tavaro/Incidents";

/* /espace2/tavaro/incidents — sinistres et recours, assistance, cautions, sur la page Tasks de Plain (02/11/2026). */

export const metadata: Metadata = {
  title: "Incidents",
  description: "Les sinistres et leur recours, les appels d'assistance, les cautions préautorisées.",
};

export default function Page() {
  return (
    <Suspense>
      <Incidents />
    </Suspense>
  );
}
