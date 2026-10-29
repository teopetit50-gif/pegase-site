import type { Metadata } from "next";
import { Suspense } from "react";
import Reglages from "@/components/espace2/daliro/Reglages";

/* /espace2/daliro/reglages — les réglages de DALIRO (29/10/2026, refonte
   des pages métiers) : la bibliothèque de prix sur Settings › Issue labels
   de Linear, l'accord J-2 et les contrôles de l'organisation sur Settings ›
   Issue templates. Ce qui vaut pour toute l'entreprise, sorti du dossier
   d'un chantier. */

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
