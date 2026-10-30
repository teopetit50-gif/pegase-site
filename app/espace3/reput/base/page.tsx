import type { Metadata } from "next";
import { Suspense } from "react";
import BoiteBase from "@/components/espace3/reput/BoiteBase";

/* /espace3/reput/base — la base de connaissances de REPUT, sur la boîte de
   réception de Linear (28/10/2026) : la liste des fiches à gauche, la fiche
   choisie (?fiche=<id>) à droite, avec ses gestes (écrire, corriger, valider,
   retirer). Elle remplace l'écran repris de /espace (EcranReput, vue
   « base ») : mêmes données, mêmes portes. */

export const metadata: Metadata = {
  title: "Base de connaissances",
  description: "REPUT : les fiches validées avec vos équipes, d'où chaque réponse est tirée.",
};

export default function Page() {
  return (
    <Suspense>
      <BoiteBase />
    </Suspense>
  );
}
