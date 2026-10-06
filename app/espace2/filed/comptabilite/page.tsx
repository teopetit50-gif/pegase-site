import type { Metadata } from "next";
import EcranComptabilite from "@/components/espace/filed/EcranComptabilite";
import Habille from "@/components/espace2/Habille";

/* /espace2/filed/comptabilite — l'écran de /espace/filed/comptabilite, repris tel quel dans le nouvel espace. */

export const metadata: Metadata = {
  title: "Comptabilité",
  description: "Le fichier des écritures comptables (FEC) des achats tenus par FILED, et les comptes utilisés pour les écrire.",
};

export default function PageComptabilite() {
  return (
    <Habille>
      <EcranComptabilite />
    </Habille>
  );
}
