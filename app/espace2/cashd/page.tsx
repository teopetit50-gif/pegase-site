import type { Metadata } from "next";
import EcranCashd from "@/components/espace/cashd/EcranCashd";
import Habille from "@/components/espace2/Habille";
import TableauCashd from "@/components/espace2/TableauCashd";

/* /espace2/cashd — en haut, le tableau de bord CASHD (maquette de Teo,
   07/10/2026) ; dessous, l'écran de travail de /espace/cashd, inchangé. */

export const metadata: Metadata = {
  title: "Relances",
  description: "CASHD : qui vous doit de l'argent, depuis quand, où en est chaque relance, et l'encours échu au total. Les relances sont écrites chaque matin ; aucune ne part sans votre validation.",
};

export default function PageCashd() {
  return (
    <Habille avant={<TableauCashd />}>
      <EcranCashd />
    </Habille>
  );
}
