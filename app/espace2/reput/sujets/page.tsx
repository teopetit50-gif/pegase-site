import type { Metadata } from "next";
import EcranReput from "@/components/espace/reput/EcranReput";
import Habille from "@/components/espace2/Habille";

/* /espace2/reput/sujets — l'onglet « Sujets autorisés » de l'écran REPUT, en page du volet (21/10/2026). */

export const metadata: Metadata = {
  title: "Sujets autorisés",
  description: "REPUT : l'accord permanent, sujet par sujet, pour les réponses qui partent seules.",
};

export default function Page() {
  return (
    <Habille>
      <EcranReput vue="sujets" />
    </Habille>
  );
}
