import type { Metadata } from "next";
import EcranTamila from "@/components/espace/tamila/EcranTamila";
import Habille from "@/components/espace2/Habille";

/* /espace2/tamila — l'écran de /espace/tamila, repris tel quel dans le nouvel espace. */

export const metadata: Metadata = {
  title: "Dossiers du cabinet",
  description: "Les dossiers Tamila du cabinet : parties, délais de procédure calculés et confirmés, audiences, murailles, exports et clôture.",
};

export default function PageTamila() {
  return (
    <Habille>
      <EcranTamila />
    </Habille>
  );
}
