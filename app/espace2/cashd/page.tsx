import type { Metadata } from "next";
import TableauCashd from "@/components/espace2/TableauCashd";

/* /espace2/cashd — le tableau de bord CASHD (maquette de Teo, 07/10/2026).
   Décision de Teo le même jour : il REMPLACE l'écran de travail repris de
   /espace/cashd (débiteurs, fiche, relances écrites) ; les relances se
   valident dans « À valider ». */

export const metadata: Metadata = {
  title: "Relances",
  description: "CASHD : qui vous doit de l'argent, depuis quand, où en est chaque relance, et l'encours échu au total.",
};

export default function PageCashd() {
  /* 22/10 — le tableau de bord porte lui-même son titre et sa marge (gabarit Observability de Supabase) */
  return <TableauCashd />;
}
