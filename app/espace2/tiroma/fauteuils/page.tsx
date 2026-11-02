import type { Metadata } from "next";
import { Suspense } from "react";
import Fauteuils from "@/components/espace2/tiroma/Fauteuils";

/* /espace2/tiroma/fauteuils — Fauteuils (02/11/2026, refonte des pages
   métiers) : la page Bookings de Cal.com. La charge du jour par fauteuil et
   les demi-journées vides des praticiens, séparées ; l'équipe absente et
   les soins à basculer ; les soins à regrouper ; les séances longues mal
   placées. ?fauteuil=<id> (point du matin) ouvre la charge d'un fauteuil. */

export const metadata: Metadata = {
  title: "Fauteuils",
  description: "La charge du jour par fauteuil, les demi-journées vides, l'équipe absente et les soins à basculer, les soins à regrouper et les séances longues.",
};

export default function PageFauteuils() {
  return (
    <Suspense>
      <Fauteuils />
    </Suspense>
  );
}
