import type { Metadata } from "next";
import { Suspense } from "react";
import PlansDevis from "@/components/espace2/tiroma/PlansDevis";

/* /espace2/tiroma/plans — Plans et devis (02/11/2026, refonte des pages
   métiers) : la vue Board de Linear. Une colonne par état (devis à relancer,
   mutuelle à obtenir, prêts à poser, un créneau trouvé), une carte par plan
   signé sans rendez-vous ou par devis ; la carte ouverte est dans l'adresse
   (?plan=, depuis le point du matin). */

export const metadata: Metadata = {
  title: "Plans et devis",
  description: "Les plans signés sans rendez-vous, du plus ancien au plus récent, la mutuelle de chacun, les devis à relancer et les créneaux qui leur conviennent.",
};

export default function PagePlans() {
  return (
    <Suspense>
      <PlansDevis />
    </Suspense>
  );
}
