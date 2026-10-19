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
  return (
    <div className="v2-page v2-arrivee v2-cd-page">
      <h1 className="v2-sr">Relances</h1>
      <TableauCashd />
    </div>
  );
}
