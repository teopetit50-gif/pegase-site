import type { Metadata } from "next";
import EcranVarelo from "@/components/espace3/base/varelo/EcranVarelo";
import Habille from "@/components/espace3/Habille";

/* /espace3/varelo — l'écran de /espace/varelo, repris tel quel dans le nouvel espace. */

export const metadata: Metadata = {
  title: "Référentiel du groupe",
  description: "Les sociétés du groupe, leurs codes locaux rangés sous un seul nom, les rapprochements à valider et les corrections proposées.",
};

export default function PageVarelo() {
  return (
    <Habille>
      <EcranVarelo />
    </Habille>
  );
}
