import type { Metadata } from "next";
import EcranDaliro from "@/components/espace/daliro/EcranDaliro";

/* ══════════════════════════════════════════════════════════════════════
   /espace/daliro — les chantiers (05/10/2026, session B6)

   La coquille et la session viennent du layout (app/espace/layout.tsx) ;
   la page ne rend que l'écran, qui lit l'exemple ou la base réelle selon
   l'interrupteur : la liste par public.btp_liste_chantiers(), le chantier
   ouvert par public.btp_tableau_chantier(p_chantier), les écritures par les
   portes btp_* (components/espace/daliro/portes.ts).
   ══════════════════════════════════════════════════════════════════════ */

export const metadata: Metadata = {
  title: "Chantiers",
  description: "Les chantiers DALIRO : marché vérifié ligne à ligne, travaux supplémentaires chiffrés sur vos prix et signés avant exécution, passages confirmés à J-2, factures rattachées à leurs lots.",
};

export default function PageDaliro() {
  return <EcranDaliro />;
}
