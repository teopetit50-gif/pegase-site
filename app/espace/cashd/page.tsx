import type { Metadata } from "next";
import EcranCashd from "@/components/espace/cashd/EcranCashd";

/* ══════════════════════════════════════════════════════════════════════
   /espace/cashd — les relances d'impayés (06/10/2026, session C2)

   La coquille et la session viennent du layout (app/espace/layout.tsx) ;
   la page ne rend que l'écran, qui lit l'exemple ou la base réelle selon
   l'interrupteur : le tableau par public.cashd_tableau(p_client), les
   relances par public.cashd_relances_du_jour(p_client), la fiche d'un
   compte par public.cashd_fiche_compte(p_compte), les gestes par les
   portes cashd_* (components/espace/cashd/portes.ts).
   ══════════════════════════════════════════════════════════════════════ */

export const metadata: Metadata = {
  title: "Relances",
  description: "CASHD : qui vous doit de l'argent, depuis quand, où en est chaque relance, et l'encours échu au total. Les relances sont écrites chaque matin ; aucune ne part sans votre validation.",
};

export default function PageCashd() {
  return <EcranCashd />;
}
