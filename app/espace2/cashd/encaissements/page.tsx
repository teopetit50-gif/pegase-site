import type { Metadata } from "next";
import { Encaissements } from "@/components/espace2/cashd/Fonctions";

/* /espace2/cashd/encaissements — CASHD, les règlements à imputer (page de fonction, 21/10/2026). */

export const metadata: Metadata = {
  title: "Encaissements",
  description: "CASHD : les règlements reçus qui ne soldent pas encore une facture, à rapprocher.",
};

export default function Page() {
  return <Encaissements />;
}
