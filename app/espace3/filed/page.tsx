import type { Metadata } from "next";
import { Suspense } from "react";
import TableauFiled from "@/components/espace3/filed/TableauFiled";

/* /espace3/filed — la première page de FILED, sur le gabarit Linear comme
   CASHD (28/10/2026, demande de Teo : la page « Projects » de Linear au
   1:1). Elle remplace l'écran repris de /espace/filed (EcranFiled, page
   Storage de Supabase) : le tableau de bord, la liste des documents en
   ?vue=documents, un document en ?objet= (les liens des autres écrans y
   mènent toujours), son dossier et ses corrections dans l'onglet Dossier. */

export const metadata: Metadata = {
  title: "Documents reçus",
  description: "Les documents reçus par FILED : numéro, contrôles, motif officiel, pièce en regard et corrections.",
};

export default function PageFiled() {
  return (
    <Suspense>
      <TableauFiled />
    </Suspense>
  );
}
