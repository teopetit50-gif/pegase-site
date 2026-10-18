import type { Metadata } from "next";
import EcranReput from "@/components/espace/reput/EcranReput";
import Habille from "@/components/espace2/Habille";

/* /espace2/reput — l'écran de /espace/reput, repris tel quel dans le nouvel espace. */

export const metadata: Metadata = {
  title: "Demandes clients",
  description: "Les demandes reçues par courriel, WhatsApp et le formulaire du site, leur réponse préparée à partir de votre base de connaissances, à valider, corriger ou refuser ; les sujets qui partent seuls.",
};

export default function PageReput() {
  return (
    <Habille>
      <EcranReput />
    </Habille>
  );
}
