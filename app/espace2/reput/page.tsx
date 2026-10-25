import type { Metadata } from "next";
import EcranReput from "@/components/espace/reput/EcranReput";
import Habille from "@/components/espace2/Habille";

/* /espace2/reput — l'écran de /espace/reput, repris dans le nouvel espace.
   21/10/2026 : ses onglets sont devenus des pages du volet (base, sujets,
   réglages) ; celle-ci garde les demandes. */

export const metadata: Metadata = {
  title: "Demandes clients",
  description: "Les demandes reçues par courriel, WhatsApp et le formulaire du site, leur réponse préparée à partir de votre base de connaissances, à valider, corriger ou refuser ; les sujets qui partent seuls.",
};

export default function PageReput() {
  return (
    <Habille>
      <EcranReput vue="demandes" />
    </Habille>
  );
}
