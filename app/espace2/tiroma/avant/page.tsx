import type { Metadata } from "next";
import { Suspense } from "react";
import AvantRendezVous from "@/components/espace2/tiroma/AvantRendezVous";

/* /espace2/tiroma/avant — Avant les rendez-vous (02/11/2026, pages manquantes,
   docs/refonte-metiers/PAGES-MANQUANTES.md) : le Triage de Linear. À gauche
   les vérifications de la semaine (ou à J-2), à droite celle qui est ouverte
   (?verif=, depuis le point du matin et l'aiguillage des travaux de
   laboratoire et des ententes ODF). */

export const metadata: Metadata = {
  title: "Avant les rendez-vous",
  description: "Avant chaque rendez-vous : le retour du laboratoire, les implants des chirurgies rapprochés du stock, l'orthodontie, les devis à échéance, la mutuelle et les traitements interrompus.",
};

export default function PageAvant() {
  return (
    <Suspense>
      <AvantRendezVous />
    </Suspense>
  );
}
