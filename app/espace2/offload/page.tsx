import type { Metadata } from "next";
import EcranOffload from "@/components/espace/offload/EcranOffload";
import Habille from "@/components/espace2/Habille";

/* /espace2/offload — l'écran de /espace/offload, repris tel quel dans le nouvel espace. */

export const metadata: Metadata = {
  title: "Clients qui décrochent",
  description: "OFFLOAD : le rythme d'achat de chaque client, celui qui s'éteint repéré avant la clôture avec ses raisons en clair, et la reprise de contact préparée pour votre validation.",
};

export default function PageOffload() {
  return (
    <Habille>
      <EcranOffload />
    </Habille>
  );
}
