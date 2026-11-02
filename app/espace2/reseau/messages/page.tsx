import type { Metadata } from "next";
import { Suspense } from "react";
import Messagerie from "@/components/espace2/reseau/messages-messagerie";

/* /espace2/reseau/messages — « Messages » du Réseau Omega : les salons par
   île et par secteur, les alertes terrain et les messages privés entre
   « vous » (l'organisation connectée) et les autres membres, sur la
   composition de Slack habillée par Espace 2. ?a=<slug> ouvre le message
   privé avec ce membre, ?salon=<id> un salon. */

export const metadata: Metadata = {
  title: "Messages du réseau",
  description: "Les salons et les messages privés entre les entreprises du Réseau Omega.",
};

export default function Page() {
  return (
    <Suspense>
      <Messagerie />
    </Suspense>
  );
}
