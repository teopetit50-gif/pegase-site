import type { Metadata } from "next";
import EcranLorani from "@/components/espace/lorani/EcranLorani";
import Habille from "@/components/espace2/Habille";

/* /espace2/lorani — l'écran de /espace/lorani, repris tel quel dans le nouvel espace. */

export const metadata: Metadata = {
  title: "Calendrier des permis",
  description: "Chaque permis suivi jusqu'à la purge des recours : délai d'instruction, pièces réclamées, décision tacite, affichage, recours des tiers.",
};

export default function PageLorani() {
  return (
    <Habille>
      <EcranLorani />
    </Habille>
  );
}
