import type { Metadata } from "next";
import { Suspense } from "react";
import AFaire from "@/components/espace2/daliro/AFaire";

/* /espace2/daliro/a-faire — les tâches du jour sur tous les chantiers, sur
   les Tasks de Plain (29/10/2026) : passages à confirmer à J-2 ou à noter
   faits, avenants à signer, situations à soumettre. La tâche ouverte est
   dans l'adresse (?tache=, ou ?passage= depuis le point du matin) ; son
   geste mène à la fiche du chantier, au bon onglet. */

export const metadata: Metadata = {
  title: "À faire",
  description: "Ce qui est à faire aujourd'hui sur vos chantiers : passages à confirmer ou à noter faits, avenants à signer, situations à soumettre.",
};

export default function PageAFaire() {
  return (
    <Suspense>
      <AFaire />
    </Suspense>
  );
}
