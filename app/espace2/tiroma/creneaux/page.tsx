import type { Metadata } from "next";
import { Suspense } from "react";
import CreneauxAppels from "@/components/espace2/tiroma/CreneauxAppels";

/* /espace2/tiroma/creneaux — Créneaux et appels (02/11/2026, refonte des
   pages métiers) : la page « Threads » de Plain. Un fil par patient à
   appeler ou à suivre : créneaux libérés et leurs candidats, appels à
   reprendre, absences probables, réponses aux rappels, liste d'attente,
   contrôles dus. Le fil ouvert est dans l'adresse (?fil=, ou ?creneau=
   depuis le point du matin). */

export const metadata: Metadata = {
  title: "Créneaux et appels",
  description: "Chaque créneau libéré avec les patients qui peuvent le reprendre, les appels à reprendre, la liste d'attente et les contrôles dus.",
};

export default function PageCreneaux() {
  return (
    <Suspense>
      <CreneauxAppels />
    </Suspense>
  );
}
