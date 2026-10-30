import type { Metadata } from "next";
import { Suspense } from "react";
import Carte from "@/components/espace2/carte/Carte";

/* /espace2/carte — Suivi › Carte (29/10/2026) : l'entreprise du client en
   circuit vivant, sur l'éditeur du « Circuit de validation » : d'où vient
   le travail, ce qu'en font les agents, ce qui attend une personne, où il
   aboutit. Le journal détaillé reste /espace2/activite. */

export const metadata: Metadata = {
  title: "Carte",
  description: "Vos agents en circuit : ce qui arrive, ce qu'ils en font, ce qui vous attend et où le travail aboutit.",
};

export default function Page() {
  return (
    <Suspense>
      <Carte />
    </Suspense>
  );
}
