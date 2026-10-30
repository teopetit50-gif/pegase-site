import type { Metadata } from "next";
import { Suspense } from "react";
import Utilisation from "@/components/espace3/Utilisation";

/* /espace3/utilisation — la page de suivi, sur la page d'un cycle de Linear
   (28/10/2026 ; 06/10 : modèle « Usage »). Les menus lisent l'adresse
   (?periode=, ?mesure=, ?repartition=, ?groupe=), d'où le Suspense. */

export const metadata: Metadata = {
  title: "Utilisation",
  description: "Ce que l'espace a traité pour vous sur la période : documents, montants facturés et payés, demandes et décisions.",
};

export default function PageUtilisation() {
  return (
    <Suspense>
      <Utilisation />
    </Suspense>
  );
}
