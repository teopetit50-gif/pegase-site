import type { Metadata } from "next";
import { Suspense } from "react";
import ListeTaches from "@/components/espace3/taches/ListeTaches";

/* /espace3/taches — « Tâches », sur la liste des tickets de Linear
   (28/10/2026, nuit) : les groupes par état, les lignes (priorité, ID,
   état, titre, étiquettes, échéance, pour qui, date), les onglets, le
   filtre et l'affichage. Les tâches restent celles de l'ancienne page
   (la même clé du navigateur) ; une ligne ouvre la carte au milieu. */

export const metadata: Metadata = {
  title: "Tâches",
  description: "Ce qu'il reste à faire dans l'équipe, avec une échéance, par état et par priorité.",
};

export default function Page() {
  return (
    <Suspense>
      <ListeTaches />
    </Suspense>
  );
}
