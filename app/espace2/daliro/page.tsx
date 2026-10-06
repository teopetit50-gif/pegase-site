import type { Metadata } from "next";
import EcranDaliro from "@/components/espace/daliro/EcranDaliro";
import Habille from "@/components/espace2/Habille";

/* /espace2/daliro — l'écran de /espace/daliro, repris tel quel dans le nouvel espace. */

export const metadata: Metadata = {
  title: "Chantiers",
  description: "Les chantiers DALIRO : marché vérifié ligne à ligne, travaux supplémentaires chiffrés sur vos prix et signés avant exécution, passages confirmés à J-2, factures rattachées à leurs lots.",
};

export default function PageDaliro() {
  return (
    <Habille>
      <EcranDaliro />
    </Habille>
  );
}
