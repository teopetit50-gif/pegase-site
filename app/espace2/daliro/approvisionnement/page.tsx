import type { Metadata } from "next";
import { Suspense } from "react";
import Approvisionnement from "@/components/espace2/daliro/Approvisionnement";

/* /espace2/daliro/approvisionnement — les commandes de tous les chantiers, sur les Tasks de
   Plain (02/11/2026, copie 1:1) : à commander, à livrer, reçu. La commande ouverte est dans
   l'adresse (?commande=) et s'affiche dans le volet ; ?chantier= filtre sur un chantier (les
   lignes d'approvisionnement du point du matin y mènent, components/espace2/aiguillage.ts). */

export const metadata: Metadata = {
  title: "Approvisionnement",
  description: "Ce qu'il faut commander, les livraisons attendues ou à décaler, les bons de livraison rapprochés et le matériel à rendre, sur tous vos chantiers.",
};

export default function PageApprovisionnement() {
  return (
    <Suspense>
      <Approvisionnement />
    </Suspense>
  );
}
