import type { Metadata } from "next";
import { Suspense } from "react";
import { Contacts } from "@/components/espace3/lin/LinearClients";

/* /espace3/contacts — les personnes et leur entreprise, sur le même gabarit
   que /espace3/entreprises (liste « Projects » de Linear, page d'un projet ;
   28/10/2026). Une ligne s'ouvre en ?id=, ?entreprise= filtre sur une
   entreprise, ?nouveau&entreprise= ouvre la création pré-remplie. Mêmes fiches
   qu'avant, gardées sur cet appareil (components/espace3/lin/LinearClients.tsx). */

export const metadata: Metadata = {
  title: "Contacts",
};

export default function Page() {
  return (
    <Suspense>
      <Contacts />
    </Suspense>
  );
}
