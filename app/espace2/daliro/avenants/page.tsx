import type { Metadata } from "next";
import { Suspense } from "react";
import AvenantsSituations from "@/components/espace2/daliro/AvenantsSituations";

/* /espace2/daliro/avenants — les avenants et les situations de travaux de
   tous les chantiers DALIRO, sur la page « Broadcasts » de Plain (29/10/2026) :
   deux familles (?vue=situations), les états en onglets (?onglet=), un
   élément ouvert par ?avenant=<id> ou ?situation=<id> (l'aiguillage y mène). */

export const metadata: Metadata = {
  title: "Avenants et situations",
  description: "Les avenants à chiffrer, à signer et signés, et les situations de travaux à soumettre, à valider et à encaisser, sur tous vos chantiers.",
};

export default function PageAvenants() {
  return (
    <Suspense>
      <AvenantsSituations />
    </Suspense>
  );
}
