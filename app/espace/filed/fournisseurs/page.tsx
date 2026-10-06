import type { Metadata } from "next";
import EcranFournisseurs from "@/components/espace/filed/EcranFournisseurs";

/* ══════════════════════════════════════════════════════════════════════
   /espace/filed/fournisseurs — les fournisseurs de FILED (06/10/2026,
   session A3). Sous /espace/filed : l'onglet FILED de la barre reste
   allumé (la barre n'est pas touchée).
   ══════════════════════════════════════════════════════════════════════ */

export const metadata: Metadata = {
  title: "Fournisseurs",
  description: "Les fournisseurs de FILED : à confirmer, identité vérifiée auprès des registres publics, IBAN et factures.",
};

export default function PageFournisseurs() {
  return <EcranFournisseurs />;
}
