import type { Metadata } from "next";
import EcranCashd from "@/components/espace/cashd/EcranCashd";
import Habille from "@/components/espace2/Habille";

/* /espace2/cashd — l'écran de /espace/cashd, repris tel quel dans le nouvel espace. */

export const metadata: Metadata = {
  title: "Relances",
  description: "CASHD : qui vous doit de l'argent, depuis quand, où en est chaque relance, et l'encours échu au total. Les relances sont écrites chaque matin ; aucune ne part sans votre validation.",
};

export default function PageCashd() {
  return (
    <Habille>
      <EcranCashd />
    </Habille>
  );
}
