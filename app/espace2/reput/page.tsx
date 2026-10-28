import type { Metadata } from "next";
import { Suspense } from "react";
import TableauReput from "@/components/espace2/reput/TableauReput";

/* /espace2/reput — la première page de REPUT, sur le gabarit Linear comme
   CASHD (28/10/2026, demande de Teo : la page « Projects » de Linear au 1:1).
   Elle remplace l'écran repris de /espace (EcranReput, vue « demandes ») :
   le tableau de bord sans paramètre, la liste des demandes en ?vue=demandes,
   une demande et sa réponse préparée en ?demande=. Mêmes données, mêmes
   portes ; la base, les sujets, les réglages et les urgences restent leurs
   propres pages du volet. */

export const metadata: Metadata = {
  title: "Demandes clients",
  description: "Les demandes reçues par courriel, WhatsApp et le formulaire du site, leur réponse préparée à partir de votre base de connaissances, à valider, corriger ou refuser ; les sujets qui partent seuls.",
};

export default function PageReput() {
  return (
    <Suspense>
      <TableauReput />
    </Suspense>
  );
}
