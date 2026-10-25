import type { Metadata } from "next";
import { Risque } from "@/components/espace2/cashd/Fonctions";

/* /espace2/cashd/risque — CASHD, les plafonds d'encours (page de fonction, 21/10/2026). */

export const metadata: Metadata = {
  title: "Risque client",
  description: "CASHD : le plafond d'encours de chaque compte, ce qu'il en consomme et les retards qui s'allongent.",
};

export default function Page() {
  return <Risque />;
}
