import type { Metadata } from "next";
import EcranAPayer from "@/components/espace/filed/EcranAPayer";

/* ══════════════════════════════════════════════════════════════════════
   /espace/filed/a-payer — les factures validées, par échéance (06/10/2026,
   session A3). Sous /espace/filed : l'onglet FILED de la barre reste
   allumé (la barre n'est pas touchée).
   ══════════════════════════════════════════════════════════════════════ */

export const metadata: Metadata = {
  title: "À payer",
  description: "Les factures validées par FILED, par échéance : montant à payer, IBAN validé ou manquant, fournisseur bloqué.",
};

export default function PageAPayer() {
  return <EcranAPayer />;
}
