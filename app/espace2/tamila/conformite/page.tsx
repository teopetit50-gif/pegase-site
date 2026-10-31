import type { Metadata } from "next";
import { Suspense } from "react";
import ConformiteCabinet from "@/components/espace2/tamila/Conformite";

/* /espace2/tamila/conformite — conflits sans décision, temps proposé et journaux des accès, sur les Tasks de Plain (30/10/2026, refonte des pages métiers) */

export const metadata: Metadata = {
  title: "Conformité du cabinet",
  description: "Les conflits d'intérêts sans décision, la vigilance à faire, le temps proposé à la saisie et le journal des accès de chaque dossier.",
};

export default function PageConformiteCabinet() {
  return (
    <Suspense>
      <ConformiteCabinet />
    </Suspense>
  );
}
