import type { Metadata } from "next";
import Utilisation from "@/components/espace2/Utilisation";

/* /espace2/utilisation — la première page de suivi, sur le modèle « Usage » (06/10/2026). */

export const metadata: Metadata = {
  title: "Utilisation",
  description: "Ce que l'espace a traité pour vous sur la période : documents, montants facturés et payés, demandes et décisions.",
};

export default function PageUtilisation() {
  return <Utilisation />;
}
