import type { Metadata } from "next";
import EcranReput from "@/components/espace/reput/EcranReput";
import Habille from "@/components/espace2/Habille";

/* /espace2/reput/reglages — l'onglet « Réglages et avis » de l'écran REPUT, en page du volet (21/10/2026). */

export const metadata: Metadata = {
  title: "Réglages et avis",
  description: "REPUT : signature, ton, mention de réponse automatisée, accusé de réception et demande d'avis.",
};

export default function Page() {
  return (
    <Habille>
      <EcranReput vue="reglages" />
    </Habille>
  );
}
