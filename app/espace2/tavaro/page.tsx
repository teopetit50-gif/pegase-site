import type { Metadata } from "next";
import EcranTavaro from "@/components/espace/tavaro/EcranTavaro";
import Habille from "@/components/espace2/Habille";

/* /espace2/tavaro — l'écran de /espace/tavaro, repris tel quel dans le nouvel espace. */

export const metadata: Metadata = {
  title: "Location : retours et factures",
  description: "Les contrats de location, le retour chiffré sur le barème, la facture validée par l'agence, les avoirs, les litiges et les relances.",
};

export default function PageTavaro() {
  return (
    <Habille>
      <EcranTavaro />
    </Habille>
  );
}
