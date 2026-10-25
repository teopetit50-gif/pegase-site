import type { Metadata } from "next";
import EcranReput from "@/components/espace/reput/EcranReput";
import Habille from "@/components/espace2/Habille";

/* /espace2/reput/base — l'onglet « Base de connaissances » de l'écran REPUT, en page du volet (21/10/2026). */

export const metadata: Metadata = {
  title: "Base de connaissances",
  description: "REPUT : les fiches validées avec vos équipes, d'où chaque réponse est tirée.",
};

export default function Page() {
  return (
    <Habille>
      <EcranReput vue="base" />
    </Habille>
  );
}
