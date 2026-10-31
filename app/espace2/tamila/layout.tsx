import { Suspense } from "react";
import DonneesTamila from "@/components/espace2/tamila/donnees";

/* /espace2/tamila/* — les sous-pages de TAMILA partagent le trousseau du
   cabinet (clés déballées, références et intitulés déchiffrés, dossiers
   déjà ouverts) : changer de page ne redéballe rien et ne rouvre pas le
   coffre (journalisé). components/espace2/tamila/donnees */
export default function LayoutTamila({ children }: { children: React.ReactNode }) {
  return (
    <Suspense>
      <DonneesTamila>{children}</DonneesTamila>
    </Suspense>
  );
}
