import type { Metadata } from "next";
import CoquilleEspace from "@/components/espace/CoquilleEspace";
import EcranFiled from "@/components/espace/filed/EcranFiled";
import { utilisateurCourant } from "@/lib/supabase/server";

/* ══════════════════════════════════════════════════════════════════════
   /espace/filed — les documents reçus (05/10/2026, session A3)

   Même construction que /espace/validations : page dynamique (session lue
   dans les cookies), coquille commune, écran client qui lit l'exemple ou
   la base réelle selon l'interrupteur. L'URL signée des pièces est
   fabriquée par l'action serveur de ./actions.ts.
   ══════════════════════════════════════════════════════════════════════ */

export const metadata: Metadata = {
  title: "Documents reçus | Espace client Omega",
  description: "Les documents reçus par FILED : numéro, contrôles, motif officiel, pièce en regard et corrections.",
  robots: { index: false, follow: false },
};

export default async function PageFiled() {
  const utilisateur = await utilisateurCourant();
  return (
    <CoquilleEspace ecran="filed" utilisateur={utilisateur}>
      <EcranFiled />
    </CoquilleEspace>
  );
}
