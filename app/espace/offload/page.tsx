import type { Metadata } from "next";
import EcranOffload from "@/components/espace/offload/EcranOffload";

/* ══════════════════════════════════════════════════════════════════════
   /espace/offload — les clients qui décrochent (06/10/2026, session C4)

   La coquille et la session viennent du layout (app/espace/layout.tsx) ;
   la page ne rend que l'écran, qui lit l'exemple ou la base réelle selon
   l'interrupteur : la liste par public.offload_tableau(), la fiche ouverte
   par public.offload_fiche(p_compte), les gestes par les portes offload_*
   (components/espace/offload/portes.ts).
   ══════════════════════════════════════════════════════════════════════ */

export const metadata: Metadata = {
  title: "Clients qui décrochent",
  description: "OFFLOAD : le rythme d'achat de chaque client, celui qui s'éteint repéré avant la clôture avec ses raisons en clair, et la reprise de contact préparée pour votre validation.",
};

export default function PageOffload() {
  return <EcranOffload />;
}
