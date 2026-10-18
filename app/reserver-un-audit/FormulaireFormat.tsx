"use client";

import { useRouter } from "next/navigation";
import { useState, type SyntheticEvent } from "react";
import { ArrowRight } from "lucide-react";
import {
  useEstimationUrl,
  useModeleUrl,
  useSiteUrl,
} from "@/components/reservation/ModeleUrl";
import { lienReservation, type Formule } from "@/lib/reservation";

/* ══════════════════════════════════════════════════════════════════════
   <FormulaireFormat> — le choix du format, dans la tête de la page
   (18/10/2026, refonte calquée sur scale.com/demo)

   Le formulaire de la référence demande nom, société, e-mail… Ici ce
   serait une seconde saisie : le créneau et les coordonnées se prennent
   déjà sur /reserver. Le formulaire ne porte donc que le format, en
   lignes de champ (46 px, bordure et rayon de la référence), et son
   bouton mène à /reserver.

   AUCUNE DONNÉE PERSONNELLE NE PASSE PAR L'URL. Le format, le modèle de
   site et l'estimation suivent comme avant (lienReservation), parce qu'ils
   ne disent rien de la personne.

   SANS JAVASCRIPT, le formulaire part en GET sur /reserver avec le seul
   format choisi : le lien fonctionne. AVEC JAVASCRIPT, on y ajoute le
   modèle, l'estimation et la formule de site, comme le font les boutons
   de la page.
   ══════════════════════════════════════════════════════════════════════ */

export default function FormulaireFormat({ formules }: { formules: Formule[] }) {
  const router = useRouter();
  const phare = formules.find((f) => f.phare) ?? formules[0];
  const [choisi, setChoisi] = useState(phare.id);
  const slug = useModeleUrl();
  const { postes, pieces } = useEstimationUrl();
  const site = useSiteUrl();

  function envoyer(e: SyntheticEvent<HTMLFormElement>) {
    e.preventDefault();
    router.push(
      lienReservation(
        choisi,
        slug || undefined,
        {
          postes: postes.length ? postes.join(",") : undefined,
          pieces: pieces ? String(pieces) : undefined,
        },
        site?.id,
      ),
    );
  }

  return (
    <form action="/reserver" method="get" onSubmit={envoyer} className="rdv-formulaire">
      <fieldset className="rdv-choix">
        <legend className="rdv-mono">Votre format</legend>
        {formules.map((f) => (
          <label key={f.id} className="rdv-option">
            <input
              type="radio"
              name="formule"
              value={f.id}
              checked={choisi === f.id}
              onChange={() => setChoisi(f.id)}
            />
            <span className="rdv-option-nom">{f.nom}</span>
            <span className="rdv-option-duree">{f.duree}</span>
          </label>
        ))}
      </fieldset>

      <button type="submit" className="rdv-bouton">
        Continuer avec ce format
        <span aria-hidden className="rdv-bouton-icone">
          <ArrowRight strokeWidth={1.8} size={18} />
        </span>
      </button>

      <p className="rdv-petit">
        Rien n&apos;est envoyé ici. Vous choisissez le format, puis le créneau et vos
        coordonnées sur la page suivante.
      </p>
    </form>
  );
}
