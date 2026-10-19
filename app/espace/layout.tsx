import type { Metadata } from "next";
import CoquilleEspace from "@/components/espace/CoquilleEspace";
import { utilisateurCourant } from "@/lib/supabase/server";

/* ══════════════════════════════════════════════════════════════════════
   /espace — le layout commun des écrans client (05/10/2026, session A3)

   Posé à la demande du coordinateur (lot 19) : la coquille
   (components/espace/CoquilleEspace.tsx — PageShell, monde .resa, barre
   avec navigation, identité et interrupteur de source) vit ici, une fois,
   et les trois pages ne rendent plus que leur écran. La session est lue
   dans les cookies (jeton vérifié) et rafraîchie en amont par proxy.ts,
   dont le matcher porte /espace/:path* depuis le même jour.

   Les trois écrans sont des pages de travail : hors index, et le titre
   de chacune complète « Espace client Omega ».
   ══════════════════════════════════════════════════════════════════════ */

export const metadata: Metadata = {
  title: { default: "Espace client Omega", template: "%s | Espace client Omega" },
  robots: { index: false, follow: false },
};

export default async function LayoutEspace({ children }: { children: React.ReactNode }) {
  const utilisateur = await utilisateurCourant();
  return <CoquilleEspace utilisateur={utilisateur}>{children}</CoquilleEspace>;
}
