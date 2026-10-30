import type { Metadata } from "next";
import { Suspense } from "react";
import { Risque } from "@/components/espace3/cashd/Clients";

/* /espace3/cashd/risque — CASHD, le risque client sur les pages « Tenants » de
   Plain (28/10/2026) : la liste des comptes (plafond, encours, utilisation,
   état), et la fiche d'un débiteur en pleine page (?id=). */

export const metadata: Metadata = {
  title: "Risque client",
  description: "CASHD : le plafond d'encours de chaque compte, ce qu'il en consomme et les retards qui s'allongent.",
};

export default function Page() {
  return (
    <Suspense>
      <Risque />
    </Suspense>
  );
}
