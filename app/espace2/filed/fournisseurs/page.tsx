import type { Metadata } from "next";
import EcranFournisseurs from "@/components/espace/filed/EcranFournisseurs";
import Habille from "@/components/espace2/Habille";

/* /espace2/filed/fournisseurs — l'écran de /espace/filed/fournisseurs, repris tel quel dans le nouvel espace. */

export const metadata: Metadata = {
  title: "Fournisseurs",
  description: "Les fournisseurs de FILED : à confirmer, identité vérifiée auprès des registres publics, IBAN et factures.",
};

export default function PageFiledFournisseurs() {
  return (
    <Habille>
      <EcranFournisseurs />
    </Habille>
  );
}
