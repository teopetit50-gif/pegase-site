/* L'état vide d'un écran pas encore redessiné : il dit ce qui viendra et
   ouvre l'écran actuel, qui marche. */

import Link from "next/link";
import { ArrowUpRight, Hammer } from "lucide-react";
import { Vide } from "./ui";

/* le titre de la page est le h1 de la barre du haut (Coquille) */
export default function AVenir({ description, ancien }: { titre?: string; description: string; ancien: string }) {
  return (
    <div className="v2-page v2-arrivee">
      <div className="v2-tete">
        <div>
          <p>{description}</p>
        </div>
      </div>
      <Vide
        icone={<Hammer width={20} height={20} />}
        titre="Cet écran passe au nouveau design au prochain palier"
        action={
          <Link href={ancien} className="v2-btn v2-btn--petit">
            Ouvrir l&apos;écran actuel <ArrowUpRight width={14} height={14} aria-hidden="true" />
          </Link>
        }
      >
        En attendant, l&apos;écran actuel reste complet et à jour, avec les mêmes données.
      </Vide>
    </div>
  );
}
