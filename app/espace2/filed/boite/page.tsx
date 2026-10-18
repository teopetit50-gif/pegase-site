import type { Metadata } from "next";
import EcranBoite from "@/components/espace/filed/EcranBoite";
import Habille from "@/components/espace2/Habille";

/* /espace2/filed/boite — l'écran de /espace/filed/boite, repris tel quel dans le nouvel espace. */

export const metadata: Metadata = {
  title: "Boîte de réception",
  description: "Les courriels reçus sur la boîte de FILED : expéditeur, objet, pièces jointes, et le document FILED né de chaque facture.",
};

export default function PageFiledBoite() {
  return (
    <Habille>
      <EcranBoite />
    </Habille>
  );
}
