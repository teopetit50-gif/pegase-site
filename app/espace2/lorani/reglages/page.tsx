import type { Metadata } from "next";
import { Suspense } from "react";
import Reglages from "@/components/espace2/lorani/Reglages";

/* /espace2/lorani/reglages — les réglages de LORANI (29/10/2026, refonte
   des pages métiers) : Settings › Team de Linear. Ce qui se règle une fois
   par projet (régime des permis, contrôles, honoraires, marchés, délais,
   assurances) : « ?projet=<id> » choisit le projet, sans lui la page liste
   les projets. */

export const metadata: Metadata = {
  title: "Réglages des projets",
  description: "Par projet : l'équipe, les lots, le régime de chaque permis, le réglage des contrôles et qui décide, les éléments de mission, les marchés et leurs délais, l'ouverture du chantier et les activités des lots.",
};

export default function PageReglagesLorani() {
  return (
    <Suspense>
      <Reglages />
    </Suspense>
  );
}
