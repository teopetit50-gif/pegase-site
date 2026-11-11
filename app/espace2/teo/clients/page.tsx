import type { Metadata } from "next";
import { Suspense } from "react";
import Clients, { type ReelClients } from "@/components/espace2/teo/Clients";
import { estAdmin } from "@/lib/omega/donnees";
import { lireClients } from "@/lib/teo/clients";

/* /espace2/teo/clients — les clients et prospects de Teo, copie 1:1 de la liste
   People d'Attio et de la fiche d'un contact (l'Annuaire de DALIRO) : vues par
   type (?type=), tri (?tri=), filtre (?q=, ?relancer=1), la fiche (?client=<id>,
   ?onglet=). Lecture et gestes dans les prospects du TABLEAU DES ASSOCIÉS
   (lib/teo/clients.ts), avec la session de Teo sur le tableau. */

export const metadata: Metadata = {
  title: "Clients",
  description: "Vos clients et prospects, ceux du tableau des associés : l'étape du pipeline, la prochaine action, le journal des appels et des rendez-vous.",
};

export default async function PageClients() {
  const reel: ReelClients | null = (await estAdmin()) ? await lireClients() : null;
  return (
    <Suspense>
      <Clients reel={reel} />
    </Suspense>
  );
}
