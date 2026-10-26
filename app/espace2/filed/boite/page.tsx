import type { Metadata } from "next";
import EcranBoite from "@/components/espace/filed/EcranBoite";
import { HabilleSb } from "@/components/espace2/Habille";

/* /espace2/filed/boite — l'écran de /espace/filed/boite, au dessin de la page Logs de Supabase (22/10). */

export const metadata: Metadata = {
  title: "Boîte de réception",
  description: "Les courriels reçus sur la boîte de FILED : expéditeur, objet, pièces jointes, et le document FILED né de chaque facture.",
};

export default function PageFiledBoite() {
  return (
    <HabilleSb>
      <EcranBoite gabarit="sb" />
    </HabilleSb>
  );
}
