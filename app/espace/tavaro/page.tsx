import type { Metadata } from "next";
import EcranTavaro from "@/components/espace/tavaro/EcranTavaro";

/* ══════════════════════════════════════════════════════════════════════
   /espace/tavaro — les retours, factures et avoirs d'un loueur
   (06/10/2026, session B2)

   La coquille et la session viennent du layout (app/espace/layout.tsx) ;
   la page ne rend que l'écran, qui lit l'exemple ou la base réelle selon
   l'interrupteur. Toutes les écritures passent par les portes loc_* du
   socle (components/espace/tavaro/portes.ts).
   ══════════════════════════════════════════════════════════════════════ */

export const metadata: Metadata = {
  title: "Location : retours et factures",
  description: "Les contrats de location, le retour chiffré sur le barème, la facture validée par l'agence, les avoirs, les litiges et les relances.",
};

export default function PageTavaro() {
  return <EcranTavaro />;
}
