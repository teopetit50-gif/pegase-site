import type { Metadata } from "next";
import { Suspense } from "react";
import Reglages from "@/components/espace2/daliro/Reglages";

/* /espace2/daliro/reglages — les réglages de DALIRO, copie 1:1 de Linear
   (02/11/2026, linear-labels-templates.md) : la bibliothèque de prix sur
   Settings › Issue labels, puis l'organisation (accord J-2 par canal,
   contrôles de l'annuaire) sur Settings › Issue templates. Ce qui vaut pour
   toute l'entreprise, sorti du dossier d'un chantier. */

export const metadata: Metadata = {
  title: "Réglages des chantiers",
  description: "La bibliothèque de prix (poser, valider), l'accord permanent des confirmations à J-2 et les contrôles de l'organisation.",
};

export default function PageReglagesDaliro() {
  return (
    <Suspense>
      <Reglages />
    </Suspense>
  );
}
