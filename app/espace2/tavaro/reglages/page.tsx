import type { Metadata } from "next";
import { Suspense } from "react";
import Reglages from "@/components/espace2/tavaro/Reglages";

/* /espace2/tavaro/reglages — le barème, les responsables des remises, la grille d'assistance et les
   règles du loueur, sur les réglages de Linear (Labels et Templates, 02/11/2026). */

export const metadata: Metadata = {
  title: "Réglages de la location",
  description: "Le barème de remise en état, les responsables des remises, la grille d'assistance et les règles du loueur.",
};

export default function Page() {
  return (
    <Suspense>
      <Reglages />
    </Suspense>
  );
}
