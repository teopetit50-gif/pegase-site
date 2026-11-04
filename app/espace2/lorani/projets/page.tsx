import type { Metadata } from "next";
import ListeProjets from "@/components/espace2/lorani/ListeProjets";

/* /espace2/lorani/projets — tous les projets de l'agence (04/11/2026) : la
   porte d'entrée des pages d'un projet, qu'on ne trouvait que par une question */

export const metadata: Metadata = {
  title: "Projets",
  description: "Tous les projets de l'agence : phase, permis, chef de projet et prochaine date ; chacun ouvre sa page.",
};

export default function PageProjetsLorani() {
  return <ListeProjets />;
}
