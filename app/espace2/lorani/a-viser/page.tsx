import type { Metadata } from "next";
import { Suspense } from "react";
import AViser from "@/components/espace2/lorani/AViser";

/* /espace2/lorani/a-viser — ce que l'architecte doit viser ou lever avant
   une date, tous projets confondus : situations, documents à viser,
   réserves, décennales qui expirent ; sur My issues de Linear (02/11/2026).
   « ?onglet=situations|visas|reserves ». */

export const metadata: Metadata = {
  title: "À viser",
  description: "Les situations et les documents à viser, les réserves à lever et les décennales qui expirent, groupés par échéance.",
};

export default function PageAViser() {
  return (
    <Suspense>
      <AViser />
    </Suspense>
  );
}
