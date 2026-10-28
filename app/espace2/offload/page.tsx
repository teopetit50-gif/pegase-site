import type { Metadata } from "next";
import { Suspense } from "react";
import ComptesRisque from "@/components/espace2/offload/ComptesRisque";

/* /espace2/offload — la première page d'OFFLOAD, sur le gabarit Linear comme
   CASHD (28/10/2026, demande de Teo : la page « Projects » de Linear au 1:1).
   Elle remplace l'écran repris de /espace/offload (EcranOffload, gabarit
   « Users » de Supabase du 22/10) : le tableau de bord des comptes à risque,
   la liste des comptes en ?vue=comptes, un compte en ?compte=. Les pages de
   fonction (échéances, affaires, groupes, garde-fous, pilotage) restent
   celles du 21/10 et ouvrent un compte ici. */

export const metadata: Metadata = {
  title: "Comptes à risque",
  description: "OFFLOAD : le rythme d'achat de chaque client, celui qui s'éteint repéré avant la clôture avec ses raisons en clair, et la reprise de contact préparée pour votre validation.",
};

export default function PageOffload() {
  return (
    <Suspense>
      <ComptesRisque />
    </Suspense>
  );
}
