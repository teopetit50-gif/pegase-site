import type { Metadata } from "next";
import { Suspense } from "react";
import TableauSujets from "@/components/espace2/reput/TableauSujets";

/* /espace2/reput/sujets — les sujets autorisés de REPUT, sur la vue « Board »
   de Linear (28/10/2026) : une colonne par état de l'accord (toujours relu,
   accord à activer, part seul, relu par principe), une carte par sujet, le
   sujet ouvert (?sujet=<code>) à droite avec ses gestes (autoriser, activer,
   révoquer, service, délai). Elle remplace l'écran repris de /espace
   (EcranReput, vue « sujets ») : mêmes données, mêmes portes. */

export const metadata: Metadata = {
  title: "Sujets autorisés",
  description: "REPUT : l'accord permanent, sujet par sujet, pour les réponses qui partent seules.",
};

export default function Page() {
  return (
    <Suspense>
      <TableauSujets />
    </Suspense>
  );
}
