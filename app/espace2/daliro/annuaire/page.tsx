import type { Metadata } from "next";
import { Suspense } from "react";
import Annuaire from "@/components/espace2/daliro/Annuaire";

/* /espace2/daliro/annuaire — l'annuaire des tiers de DALIRO, copie 1:1 de
   la liste People d'Attio et de la fiche d'un contact (02/11/2026) : vues
   par rôle (?role=), tri (?tri=), filtre nom ou commune (?q=) et « À
   surveiller » (?veille=1), la fiche d'une entreprise (?entreprise=<id>,
   onglets ?onglet=). Lecture seule. */

export const metadata: Metadata = {
  title: "Annuaire",
  description: "Les entreprises de vos chantiers : rôles, coordonnées, vigilance des sous-traitants, chantiers, lots et prochains passages.",
};

export default function PageAnnuaireDaliro() {
  return (
    <Suspense>
      <Annuaire />
    </Suspense>
  );
}
