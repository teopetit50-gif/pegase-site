import type { Metadata } from "next";
import { Suspense } from "react";
import Activite from "@/components/espace2/Activite";

/* /espace2/activite — le fil d'activité d'un projet Linear au 1:1 (28/10/2026) :
   les filtres sont dans l'adresse (useSearchParams), d'où le Suspense. */

export const metadata: Metadata = {
  title: "Activité",
};

export default function PageActivite() {
  return (
    <Suspense>
      <Activite />
    </Suspense>
  );
}
