import type { Metadata } from "next";
import EcranTiroma from "@/components/espace/tiroma/EcranTiroma";
import Habille from "@/components/espace2/Habille";

/* /espace2/tiroma — l'écran de /espace/tiroma, repris tel quel dans le nouvel espace. */

export const metadata: Metadata = {
  title: "Cabinet dentaire",
  description: "Le cabinet lu en une page : créneaux à sauver, plans sans rendez-vous, vérifications avant les rendez-vous, charge des fauteuils.",
};

export default function PageTiroma() {
  return (
    <Habille>
      <EcranTiroma />
    </Habille>
  );
}
