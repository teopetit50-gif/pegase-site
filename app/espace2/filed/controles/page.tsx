import type { Metadata } from "next";
import { Suspense } from "react";
import ReglesControles from "@/components/espace2/filed/ReglesControles";

/* /espace2/filed/controles — FILED, les contrôles avant classement sur la liste
   des workflows de Plain (28/10/2026) : un contrôle par ligne, les gravités en
   onglets, le détail et ses points dans la carte au milieu. Mêmes données et
   mêmes gestes que la page d'avant (components/espace2/filed/Fonctions.tsx). */

export const metadata: Metadata = {
  title: "Contrôles et fraude",
  description: "FILED : les pièces en anomalie, les changements de coordonnées bancaires et les fournisseurs à confirmer.",
};

export default function Page() {
  return (
    <Suspense>
      <ReglesControles />
    </Suspense>
  );
}
