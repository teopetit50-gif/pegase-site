import type { Metadata } from "next";
import EcranFiled from "@/components/espace/filed/EcranFiled";
import Habille from "@/components/espace2/Habille";

/* /espace2/filed — l'écran de /espace/filed, repris tel quel dans le nouvel espace. */

export const metadata: Metadata = {
  title: "Documents reçus",
  description: "Les documents reçus par FILED : numéro, contrôles, motif officiel, pièce en regard et corrections.",
};

export default function PageFiled() {
  return (
    <Habille>
      <EcranFiled />
    </Habille>
  );
}
