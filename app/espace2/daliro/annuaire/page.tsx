import type { Metadata } from "next";
import { Suspense } from "react";
import Annuaire from "@/components/espace2/daliro/Annuaire";

/* /espace2/daliro/annuaire — l'annuaire des tiers de DALIRO (29/10/2026,
   refonte des pages métiers) sur Settings › Integrations de Linear :
   recherche (?q=), onglets par rôle (?role=), « À surveiller » pour la
   vigilance, et la page d'une entreprise (?entreprise=<id>). Lecture seule. */

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
