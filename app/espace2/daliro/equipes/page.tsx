import type { Metadata } from "next";
import { Suspense } from "react";
import Equipes from "@/components/espace2/daliro/Equipes";

/* /espace2/daliro/equipes — les intervenants sur la frise (page Projects de
   Linear en affichage Timeline) : passages des 30 prochains jours, tous
   chantiers, et absences des sous-traitants (notées, annulées ici). */

export const metadata: Metadata = {
  title: "Équipes",
  description: "Les disponibilités de vos équipes et sous-traitants sur 30 jours : passages prévus, confirmations, absences.",
};

export default function PageEquipes() {
  return (
    <Suspense>
      <Equipes />
    </Suspense>
  );
}
