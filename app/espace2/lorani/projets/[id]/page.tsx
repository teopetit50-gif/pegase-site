import type { Metadata } from "next";
import { Suspense } from "react";
import PageProjet from "@/components/espace2/lorani/PageProjet";

/* /espace2/lorani/projets/<id> — la page d'un projet LORANI, sur la page
   « Customer Agent » de Plain (29/10/2026) : un sous-menu des parties du
   projet (Projet, Permis, Urbanisme et pièces, Contrôle, Consultation,
   Chantier, Réception, GPA, DOE, Assurances), gardées dans ?partie= ;
   sans partie, « Projet » (les liens d'aiguillage arrivent ainsi). */

export const metadata: Metadata = {
  title: "Projet",
  description: "La page d'un projet : son équipe, ses lots et intervenants, ses permis, l'urbanisme, le contrôle du dossier, la consultation, le chantier, la réception et les assurances.",
};

export default async function PageProjetLorani({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return (
    <Suspense>
      <PageProjet id={id} />
    </Suspense>
  );
}
