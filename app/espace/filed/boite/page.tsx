import type { Metadata } from "next";
import EcranBoite from "@/components/espace/filed/EcranBoite";

/* ══════════════════════════════════════════════════════════════════════
   /espace/filed/boite — les courriels reçus sur la boîte de FILED
   (public.receptions, canal email) — 06/10/2026, session A3. Sous
   /espace/filed : l'onglet FILED de la barre reste allumé.
   ══════════════════════════════════════════════════════════════════════ */

export const metadata: Metadata = {
  title: "Boîte de réception",
  description: "Les courriels reçus sur la boîte de FILED : expéditeur, objet, pièces jointes, et le document FILED né de chaque facture.",
};

export default function PageBoite() {
  return <EcranBoite />;
}
