import type { Metadata } from "next";
import { Suspense } from "react";
import Arrivees from "@/components/espace2/tamila/Arrivees";

/* /espace2/tamila/arrivees — les avis RPVA reçus par courriel, à rattacher à leur dossier, sur le Triage de Linear (30/10/2026, refonte des pages métiers) */

export const metadata: Metadata = {
  title: "Arrivées",
  description: "Les avis RPVA reçus par courriel, avec le dossier qui porte le même n° RG : rattachez-les, ou écartez-les.",
};

export default function PageArrivees() {
  return (
    <Suspense>
      <Arrivees />
    </Suspense>
  );
}
