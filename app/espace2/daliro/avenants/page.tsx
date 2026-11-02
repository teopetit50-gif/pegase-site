import type { Metadata } from "next";
import { Suspense } from "react";
import AvenantsSituations from "@/components/espace2/daliro/AvenantsSituations";

/* /espace2/daliro/avenants — les avenants et les situations de travaux de
   tous les chantiers DALIRO, sur le Board de Linear au 1:1 (02/11/2026,
   linear-board.md) : deux onglets (?vue=situations), une colonne par état,
   l'élément ouvert dans le volet par ?avenant=<id> ou ?situation=<id>
   (l'aiguillage y mène). */

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
