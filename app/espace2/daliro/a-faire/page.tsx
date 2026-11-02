import type { Metadata } from "next";
import { Suspense } from "react";
import AFaire from "@/components/espace2/daliro/AFaire";

/* /espace2/daliro/a-faire — les tâches sur tous les chantiers, sur My issues
   de Linear (02/11/2026, copie 1:1) : passages à confirmer à J-2 ou à noter
   faits, avenants à signer, situations à soumettre, groupés par semaine. La
   tâche ouverte est dans l'adresse (?tache=, ou ?passage= depuis le point du
   matin) et s'affiche dans le volet de détails ; son geste mène à la fiche
   du chantier, au bon onglet. */

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
