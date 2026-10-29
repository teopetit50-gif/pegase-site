import type { Metadata } from "next";
import { Suspense } from "react";
import ARanger from "@/components/espace2/daliro/ARanger";

/* /espace2/daliro/a-ranger — les messages du terrain que la base n'a pas su
   rattacher à un chantier, sur le Triage de Linear (29/10/2026). La liste à
   gauche, le message ouvert (?id=) à droite ; mêmes portes que l'ancienne
   carte « Messages du terrain à ranger » (ARangerCarte, 06/10/2026). */

export const metadata: Metadata = {
  title: "À ranger",
  description: "Les photos, vocaux et messages du terrain sans chantier : rangez-les dans leur chantier, ouvrez un avenant, ou écartez-les.",
};

export default function PageARanger() {
  return (
    <Suspense>
      <ARanger />
    </Suspense>
  );
}
