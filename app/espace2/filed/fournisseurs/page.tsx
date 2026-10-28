import type { Metadata } from "next";
import { Suspense } from "react";
import TableauFournisseurs from "@/components/espace2/filed/TableauFournisseurs";

/* /espace2/filed/fournisseurs — « Fournisseurs » sur la vue Board de Linear
   (28/10/2026, demande de Teo : la troisième page de chaque SaaS en tableau
   en colonnes). Une colonne par statut, la fiche du fournisseur ouvert
   (?id=) à droite ; mêmes données, mêmes portes et mêmes fenêtres que
   l'écran d'avant (components/espace/filed/EcranFournisseurs.tsx). */

export const metadata: Metadata = {
  title: "Fournisseurs",
  description: "Les fournisseurs de FILED : à confirmer, identité vérifiée auprès des registres publics, IBAN et factures.",
};

export default function PageFiledFournisseurs() {
  return (
    <Suspense>
      <TableauFournisseurs />
    </Suspense>
  );
}
