import type { Metadata } from "next";
import { Suspense } from "react";
import Chantiers from "@/components/espace2/daliro/Chantiers";

/* /espace2/daliro/chantiers — les chantiers sur la frise (page Projects de
   Linear en affichage Timeline) : familles en pastilles (?famille=),
   recherche, zoom (?zoom=) ; un clic ouvre la fiche /chantiers/<id>. */

export const metadata: Metadata = {
  title: "Chantiers",
  description: "Les chantiers DALIRO sur une frise : dates, santé, avancement, lot en cours et prochain passage.",
};

export default function PageChantiers() {
  return (
    <Suspense>
      <Chantiers />
    </Suspense>
  );
}
