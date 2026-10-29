import type { Metadata } from "next";
import { Suspense } from "react";
import Equipe from "@/components/espace2/lin/Equipe";

/* /espace2/equipe — Settings › Members de Linear, au 1:1 (28/10/2026).
   Mêmes données et mêmes portes que /espace/equipe (equipe/portes.ts) ;
   l'écran est réécrit dans components/espace2/lin/Equipe.tsx. */

export const metadata: Metadata = {
  title: "Équipe",
  description: "Qui a accès à votre organisation, avec quel rôle, sur quelles sociétés.",
};

export default function PageEquipe() {
  return (
    <Suspense fallback={null}>
      <Equipe />
    </Suspense>
  );
}
