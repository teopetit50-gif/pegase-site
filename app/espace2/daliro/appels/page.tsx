import type { Metadata } from "next";
import { Suspense } from "react";
import Appels from "@/components/espace2/daliro/Appels";

/* /espace2/daliro/appels — les appels de l'entreprise sur l'Inbox de Linear (05/11/2026) :
   la liste à gauche, l'appel ouvert (?appel=) à droite, avec sa transcription et ses suites. */

export const metadata: Metadata = {
  title: "Appels",
  description: "Tous les appels de l'entreprise : ceux que l'agent a pris quand personne ne pouvait décrocher, leur transcription, leur résumé et ce qui en sort.",
};

export default function PageAppels() {
  return (
    <Suspense>
      <Appels />
    </Suspense>
  );
}
