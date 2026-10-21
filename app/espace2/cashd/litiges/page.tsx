import type { Metadata } from "next";
import { Litiges } from "@/components/espace2/cashd/Fonctions";

/* /espace2/cashd/litiges — CASHD, les comptes sortis du cycle de relance (page de fonction, 21/10/2026). */

export const metadata: Metadata = {
  title: "Litiges et pauses",
  description: "CASHD : les comptes en litige, en pause, en recouvrement ou sans contact, sortis du cycle de relance.",
};

export default function Page() {
  return <Litiges />;
}
