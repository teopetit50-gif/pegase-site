import type { Metadata } from "next";
import { Suspense } from "react";
import FilReseau from "@/components/espace2/reseau/fil-reseau";

/* /espace2/reseau — le Fil du Réseau Omega (02/11/2026) : demandes et
   alertes terrain des entreprises clientes d'Omega, sur la composition du
   fil de Circle, habillé d'Espace 2 (components/espace2/reseau/fil-reseau).
   Les filtres vivent dans l'adresse (?type=, ?ile=, ?secteur=). */

export const metadata: Metadata = {
  title: "Fil du réseau",
};

export default function Page() {
  return (
    <Suspense>
      <FilReseau />
    </Suspense>
  );
}
