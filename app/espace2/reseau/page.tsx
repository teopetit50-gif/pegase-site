import type { Metadata } from "next";
import { Suspense } from "react";
import FilReseau from "@/components/espace2/reseau/fil-reseau";

/* /espace2/reseau — le Fil du Réseau Omega : demandes et alertes terrain
   des entreprises clientes d'Omega. Contenu relevé sur les pages publiques
   de Circle, habillage des moteurs (kit components/espace2/lin/, fil
   d'activité de Linear) : components/espace2/reseau/fil-reseau. Les filtres
   et la publication ouverte vivent dans l'adresse (?type=, ?ile=,
   ?secteur=, ?pub=). */

export const metadata: Metadata = {
  title: "Fil du réseau",
};

export default function Page() {
  return (
    <Suspense>
      <FilReseau />
    </Suspense>
  );
}
