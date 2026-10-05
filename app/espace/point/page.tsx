import type { Metadata } from "next";
import CoquilleEspace from "@/components/espace/CoquilleEspace";
import PointDuMatin from "@/components/espace/point/PointDuMatin";
import { utilisateurCourant } from "@/lib/supabase/server";

/* ══════════════════════════════════════════════════════════════════════
   /espace/point — le point du matin du jour (05/10/2026, session A3)

   Même construction que les deux autres écrans. Le point est lu par la
   porte lire_point (points_du_jour + points_du_jour_lignes), en lecture
   seule ; l'exemple reproduit un point remis à 7 h.
   ══════════════════════════════════════════════════════════════════════ */

export const metadata: Metadata = {
  title: "Point du matin | Espace client Omega",
  description: "Le point du matin du jour : ce qui a bougé pendant la nuit, ce qui attend, ce qui va bien.",
  robots: { index: false, follow: false },
};

export default async function PagePoint() {
  const utilisateur = await utilisateurCourant();
  return (
    <CoquilleEspace ecran="point" utilisateur={utilisateur}>
      <PointDuMatin />
    </CoquilleEspace>
  );
}
