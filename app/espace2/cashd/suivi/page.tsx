import type { Metadata } from "next";
import EcranCashd from "@/components/espace/cashd/EcranCashd";
import Habille from "@/components/espace2/Habille";

/* /espace2/cashd/suivi — l'écran de travail CASHD (C2) : ses vues
   (débiteurs, relances, envois, trésorerie), « Vos textes » et la fiche
   d'un compte, repris tels quels sous le tableau de bord /espace2/cashd
   (11/10/2026, C1 avec C2). */

export const metadata: Metadata = {
  title: "Débiteurs et relances",
  description: "CASHD : chaque débiteur, sa fiche, ses relances écrites, les envois et la trésorerie ; vos textes de relance.",
};

export default function PageCashdSuivi() {
  return (
    <Habille>
      <EcranCashd />
    </Habille>
  );
}
