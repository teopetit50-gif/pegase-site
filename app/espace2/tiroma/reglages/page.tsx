import type { Metadata } from "next";
import { Suspense } from "react";
import Reglages from "@/components/espace2/tiroma/Reglages";

/* /espace2/tiroma/reglages — Réglages (02/11/2026, refonte des pages
   métiers) : la page Settings › Team de Linear. Le cabinet (fiche, mode et
   état, praticiens, fauteuils, horaires, fermetures, vocabulaire, relevés,
   règles), les règles communes, les rappels aux patients et leurs moyens de
   contact, l'export des données ; l'installation en base réelle sans
   cabinet. Chaque section est une sous-page (?section=). */

export const metadata: Metadata = {
  title: "Réglages du cabinet",
  description: "Le cabinet, ses fauteuils, ses horaires, ses règles, les rappels aux patients et l'export des données.",
};

export default function PageReglages() {
  return (
    <Suspense>
      <Reglages />
    </Suspense>
  );
}
