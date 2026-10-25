import type { Metadata } from "next";
import EcranOffload from "@/components/espace/offload/EcranOffload";
import { HabilleSb } from "@/components/espace2/Habille";

/* /espace2/offload — l'écran de /espace/offload, repris dans le nouvel espace.
   21/10/2026 : les cinq cartes empilées sous la liste (garde-fous,
   échéances, affaires, groupes, pilotage) ont chacune leur page. */

export const metadata: Metadata = {
  title: "Comptes à risque",
  description: "OFFLOAD : le rythme d'achat de chaque client, celui qui s'éteint repéré avant la clôture avec ses raisons en clair, et la reprise de contact préparée pour votre validation.",
};

export default function PageOffload() {
  return (
    <HabilleSb>
      <EcranOffload sections={false} gabarit="sb" />
    </HabilleSb>
  );
}
