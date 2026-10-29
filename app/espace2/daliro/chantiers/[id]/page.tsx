import type { Metadata } from "next";
import { Suspense } from "react";
import FicheChantier from "@/components/espace2/daliro/FicheChantier";

/* /espace2/daliro/chantiers/<id> — la fiche d'un chantier DALIRO, sur la
   page d'une Initiative de Linear (29/10/2026) : onglets Aperçu, Terrain,
   Argent, Fil, Réception gardés dans ?onglet= (les autres pages y mènent
   avec une ancre : ?onglet=terrain#planning, ?onglet=argent#avenants ou
   #situations) ; le volet des détails porte l'en-tête et ses gestes. */

export const metadata: Metadata = {
  title: "Chantier",
  description: "La fiche d'un chantier : ses propriétés, ses lots et leur déboursé, le planning, l'argent, le fil du terrain et la réception.",
};

export default async function PageChantier({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return (
    <Suspense>
      <FicheChantier id={id} />
    </Suspense>
  );
}
