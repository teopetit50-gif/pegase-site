import type { Metadata } from "next";
import { Suspense } from "react";
import VueSources from "@/components/espace2/varelo/VueSources";

/* /espace2/varelo/sources — sociétés, pôles, branchements, dépôts et règles du groupe
   (02/11/2026) : Linear, Settings › Integrations, au 1:1. « ?societe=<id> » ouvre la page d'une
   société, « ?regles=1 » celle des règles. */

export const metadata: Metadata = {
  title: "Sources et structure",
  description: "Les sociétés du groupe et leurs pôles, les logiciels branchés en lecture seule, le dépôt d'un export et les règles du groupe.",
};

export default function PageSources() {
  return (
    <Suspense>
      <VueSources />
    </Suspense>
  );
}
