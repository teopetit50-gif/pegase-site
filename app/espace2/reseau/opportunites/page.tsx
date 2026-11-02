import type { Metadata } from "next";
import Opportunites from "@/components/espace2/reseau/opportunites-vue";

/* /espace2/reseau/opportunites — Réseau Omega › Opportunités (02/11/2026) :
   ce que le réseau fait gagner à l'organisation connectée, en kanban à la
   façon d'Attio (mises en relation, groupements de marchés publics, achats
   groupés) et le suivi de ce qu'il a déjà apporté.
   components/espace2/reseau/opportunites-vue.tsx */

export const metadata: Metadata = {
  title: "Opportunités",
  description: "Les mises en relation, groupements de marchés publics et achats groupés que le Réseau Omega vous propose, et ce qu'il vous a déjà apporté.",
};

export default function Page() {
  return <Opportunites />;
}
