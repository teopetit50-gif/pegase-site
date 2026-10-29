import type { Metadata } from "next";
import { Suspense } from "react";
import PagePermis from "@/components/espace2/lorani/PagePermis";

/* /espace2/lorani/permis/<id> — un permis LORANI, sur la page « Get started »
   de Plain (29/10/2026) : sept étapes en accordéon, du dépôt à la purge,
   l'étape en cours ouverte ; ce qui attend un membre (dates lues, décision
   implicite) en tête. Les liens des alertes y arrivent (aiguillage.ts). */

export const metadata: Metadata = {
  title: "Permis",
  description: "Un permis suivi du dépôt à la purge : pièces demandées, délai d'instruction, décision, affichage, recours des tiers.",
};

export default async function PagePermisLorani({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return (
    <Suspense>
      <PagePermis id={id} />
    </Suspense>
  );
}
