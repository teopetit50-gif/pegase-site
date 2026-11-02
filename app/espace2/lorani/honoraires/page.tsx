import type { Metadata } from "next";
import { Suspense } from "react";
import HonorairesTemps from "@/components/espace2/lorani/Honoraires";

/* /espace2/lorani/honoraires — les honoraires d'un projet (?projet=), phase
   par phase, et le temps passé dessus, sur Settings › Billing de Linear
   (29/10/2026). Mêmes calculs et mêmes fenêtres que la carte de l'écran
   d'avant (components/espace/lorani/Honoraires.tsx). */

export const metadata: Metadata = {
  title: "Honoraires et temps",
  description: "Les honoraires de chaque élément de mission, ce qui est achevé et facturé, et le temps passé contre le temps prévu.",
};

export default function PageHonoraires() {
  return (
    <Suspense>
      <HonorairesTemps />
    </Suspense>
  );
}
